import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ContentItem,
  Json,
  LanguageCode,
  Project,
} from "@/lib/supabase/types";
import { loadProjectOrThrow, WorkflowError } from "@/lib/ai/workflows/shared";
import {
  localizeContentPackageForLanguage,
  type LocalizeContentPackageInput,
} from "@/lib/ai/workflows/localizeContentPackage";
import type { LocalizeSourcePlatformItem } from "@/lib/ai/prompts/localizeContentPackage";
import {
  startVideoWorkerJob,
  type VideoWorkerJobPayload,
} from "@/lib/video-worker/client";
import { claimAndDispatchVariantVideoJob } from "@/lib/ai/workflows/dispatchVariantVideoJob";
import {
  allItemsApproved,
  extractRenderSpecScenes,
  isVideoPlatform,
  pendingVariantLanguages,
  pickVideoJobItem,
  resolveTargetLanguages,
} from "@/lib/ai/workflows/languageVariantsHelpers";

export interface GenerateLanguageVariantsInput {
  projectId: string;
  packageId: string;
}

export interface GenerateLanguageVariantsSummary {
  packageId: string;
  createdLanguages: LanguageCode[];
  skippedLanguages: LanguageCode[];
  createdItemIds: string[];
  createdVideoJobIds: string[];
  warnings: string[];
}

// Injectable dependencies. videoCallbackUrl is supplied by the route (derived
// from the request origin, mirroring /api/n8n/start-video-job); without it the
// inline worker start is skipped and the job is left queued with a warning.
export interface GenerateLanguageVariantsDeps {
  client?: SupabaseClient;
  videoCallbackUrl?: string;
  localize?: typeof localizeContentPackageForLanguage;
  startVideoJob?: (payload: VideoWorkerJobPayload) => Promise<void>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | null, key: string): string {
  if (!record) return "";
  const value = record[key];
  return typeof value === "string" ? value : "";
}

// Reads a package-level CTA ({ type, text }) from package_brief, or null.
function readPackageCta(
  brief: Record<string, unknown> | null,
): { type: string; text: string } | null {
  const cta = asRecord(brief?.cta);
  if (!cta) return null;
  const type = readString(cta, "type");
  const text = readString(cta, "text");
  return type && text ? { type, text } : null;
}

// Generates language variants for an APPROVED primary content package. Creates
// variant content_items (language = target) and a queued video_job per language
// whose input reuses the source render_spec scenes (no new image generation).
// Never mutates the primary package or its primary-language content_items.
export async function runGenerateLanguageVariants(
  input: GenerateLanguageVariantsInput,
  deps: GenerateLanguageVariantsDeps = {},
): Promise<GenerateLanguageVariantsSummary> {
  const { projectId, packageId } = input;
  if (!projectId) throw new WorkflowError("invalid_input", "project_id is required");
  if (!packageId) throw new WorkflowError("invalid_input", "package_id is required");

  const supabase: SupabaseClient = deps.client ?? createSupabaseAdminClient();
  const localize = deps.localize ?? localizeContentPackageForLanguage;
  const startVideoJob = deps.startVideoJob ?? startVideoWorkerJob;

  const project: Project = await loadProjectOrThrow(supabase, projectId);

  // Gate 1: package belongs to the project (and load its brief).
  const { data: pkg, error: pkgErr } = await supabase
    .from("content_packages")
    .select("id, package_brief")
    .eq("id", packageId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (pkgErr) throw pkgErr;
  if (!pkg) {
    throw new WorkflowError(
      "not_found",
      `content package ${packageId} not found for project ${projectId}`,
    );
  }
  const brief = asRecord(pkg.package_brief);

  const summary: GenerateLanguageVariantsSummary = {
    packageId,
    createdLanguages: [],
    skippedLanguages: [],
    createdItemIds: [],
    createdVideoJobIds: [],
    warnings: [],
  };

  // Gate 2: enabled_languages must yield at least one target -> otherwise no-op.
  const targetLanguages = resolveTargetLanguages(
    project.language,
    project.enabled_languages ?? [],
  );
  if (targetLanguages.length === 0) {
    summary.warnings.push("no additional enabled_languages configured (no-op)");
    return summary;
  }

  // Gate 3: primary content items = package_id + language IS NULL.
  const { data: primaryRows, error: primaryErr } = await supabase
    .from("content_items")
    .select("*")
    .eq("project_id", projectId)
    .eq("package_id", packageId)
    .is("language", null);
  if (primaryErr) throw primaryErr;
  const primaryItems = (primaryRows ?? []) as ContentItem[];
  if (primaryItems.length === 0) {
    throw new WorkflowError(
      "invalid_input",
      "no primary-language content items found for this package",
    );
  }

  // Review UX V2 — translations target ONLY video platforms (TikTok /
  // Instagram / YouTube / Facebook). Text-only platforms (LinkedIn / X /
  // Google Business) are never localized and never gate translation, so a
  // draft LinkedIn / X item can no longer block an approved video package.
  const videoPrimaryItems = primaryItems.filter((item) =>
    isVideoPlatform(item.platform),
  );
  if (videoPrimaryItems.length === 0) {
    throw new WorkflowError(
      "invalid_input",
      "this package has no video-platform primary items to translate (translations are video-only)",
    );
  }

  // Gate 4: all VIDEO-PLATFORM primary items must be approved.
  if (!allItemsApproved(videoPrimaryItems.map((item) => item.status))) {
    throw new WorkflowError(
      "invalid_input",
      "video-platform primary items are not all approved; approve them before generating translations",
    );
  }

  // Gate 5: source render_spec from the newest completed video job for the
  // video-platform primary items. Must contain reusable scenes with durable
  // storage paths.
  const primaryItemIds = videoPrimaryItems.map((item) => item.id);
  const { data: jobRows, error: jobErr } = await supabase
    .from("video_jobs")
    .select("id, output, created_at")
    .eq("project_id", projectId)
    .in("content_item_id", primaryItemIds)
    .eq("status", "completed")
    .order("created_at", { ascending: false });
  if (jobErr) throw jobErr;

  let sourceVideoJobId: string | null = null;
  let scenes: Record<string, unknown>[] | null = null;
  for (const job of jobRows ?? []) {
    const candidate = extractRenderSpecScenes((job as { output: unknown }).output);
    if (candidate) {
      sourceVideoJobId = (job as { id: string }).id;
      scenes = candidate;
      break;
    }
  }
  if (!scenes || !sourceVideoJobId) {
    throw new WorkflowError(
      "invalid_input",
      "render_spec missing: this package has no completed render with reusable scenes (legacy package needs re-render)",
    );
  }

  // Idempotence: languages that already have variant items for this package.
  const { data: existingVariantRows, error: existingErr } = await supabase
    .from("content_items")
    .select("language")
    .eq("project_id", projectId)
    .eq("package_id", packageId)
    .not("language", "is", null);
  if (existingErr) throw existingErr;
  const existingLanguages = new Set<string>(
    (existingVariantRows ?? [])
      .map((row) => (row as { language: string | null }).language)
      .filter((l): l is string => typeof l === "string"),
  );

  // Source text (authoritative) lives in package_brief; platform items mirror
  // the primary content_items editable fields.
  const sourceVoiceover = readString(brief, "voiceover_text");
  const sourceSubtitles = readString(brief, "subtitles");
  const sourceCta = readPackageCta(brief);
  // Only video-platform items are localized, so LinkedIn / X / Google Business
  // never produce variant content_items.
  const sourcePlatformItems: LocalizeSourcePlatformItem[] = videoPrimaryItems.map(
    (item) => ({
      platform: item.platform,
      title: item.title,
      body: item.body,
      caption: item.caption,
      hashtags: item.hashtags ?? [],
      cta: item.cta,
    }),
  );
  const briefVideo = asRecord(brief?.video);
  const videoConcept = readString(briefVideo, "concept");
  const videoScript = readString(briefVideo, "script");

  // Per-platform lookup so each localized output maps back to its primary item
  // (format + source_content_item_id). Video platforms only.
  const primaryByPlatform = new Map<string, ContentItem>();
  for (const item of videoPrimaryItems) primaryByPlatform.set(item.platform, item);

  for (const language of targetLanguages) {
    if (existingLanguages.has(language)) {
      summary.skippedLanguages.push(language);
      continue;
    }

    const localizeInput: LocalizeContentPackageInput = {
      project,
      targetLanguage: language,
      source: {
        voiceoverText: sourceVoiceover,
        subtitles: sourceSubtitles,
        cta: sourceCta,
        platformItems: sourcePlatformItems,
      },
    };

    const localized = await localize(localizeInput);
    if (!localized.ok) {
      summary.warnings.push(
        `language ${language}: localization failed (${localized.error}); skipped`,
      );
      continue;
    }

    // Persist one variant content_item per localized platform output.
    const variantRows = localized.data.localized.platform_outputs
      .map((out) => {
        const primary = primaryByPlatform.get(out.platform);
        if (!primary) return null;
        return {
          project_id: projectId,
          package_id: packageId,
          platform: primary.platform,
          format: primary.format,
          status: "draft" as const,
          language,
          title: out.title ?? primary.title,
          body: out.body ?? localized.data.localized.voiceover_text,
          caption: out.caption,
          hashtags: out.hashtags ?? [],
          cta: out.cta,
          generation_metadata: {
            source: "language_variant",
            kind: "language_variant",
            source_language: localized.data.sourceLanguage,
            target_language: language,
            source_content_item_id: primary.id,
            source_video_job_id: sourceVideoJobId,
            generated_from_render_spec: true,
          } as unknown as Json,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (variantRows.length === 0) {
      summary.warnings.push(
        `language ${language}: no platform outputs mapped to primary items; skipped`,
      );
      continue;
    }

    const { data: insertedItems, error: insertErr } = await supabase
      .from("content_items")
      .insert(variantRows)
      .select("id, platform");
    if (insertErr) throw insertErr;

    const created = (insertedItems ?? []) as { id: string; platform: string }[];
    summary.createdLanguages.push(language);
    for (const row of created) summary.createdItemIds.push(row.id);

    // One queued video job per language, attached to a single variant item
    // (TikTok preferred). input.scenes reuses the source render_spec scenes.
    const videoItem = pickVideoJobItem(created);
    if (!videoItem) continue;

    const jobInput = {
      concept: videoConcept,
      script: videoScript,
      voiceover_text: localized.data.localized.voiceover_text,
      subtitles: localized.data.localized.subtitles,
      scenes,
      language,
      generated_from_language_variant: true,
    } as unknown as Json;

    const { data: jobRow, error: jobInsertErr } = await supabase
      .from("video_jobs")
      .insert({
        project_id: projectId,
        content_item_id: videoItem.id,
        provider: "video_engine",
        status: "queued",
        input: jobInput,
      })
      .select("id")
      .single();
    if (jobInsertErr) throw jobInsertErr;
    const videoJobId = jobRow.id as string;
    summary.createdVideoJobIds.push(videoJobId);

    // Best-effort inline worker start. Requires a callback URL; on any failure
    // the job stays queued and a warning is recorded (no throw). The job is
    // claimed (queued -> processing) BEFORE dispatch so the worker's terminal
    // callback can never be overwritten back to processing (Task 5).
    if (!deps.videoCallbackUrl) {
      summary.warnings.push(
        `language ${language}: video job ${videoJobId} left queued (no callback url for inline start)`,
      );
      continue;
    }
    const dispatch = await claimAndDispatchVariantVideoJob(supabase, {
      videoJobId,
      projectId,
      contentPackageId: packageId,
      contentItemId: videoItem.id,
      callbackUrl: deps.videoCallbackUrl,
      input: jobInput as Record<string, unknown>,
      startVideoJob,
    });
    if (dispatch.warning) {
      summary.warnings.push(`language ${language}: ${dispatch.warning}`);
    }
  }

  return summary;
}

export interface GenerateLanguageVariantsForItemInput {
  projectId: string;
  sourceContentItemId: string;
}

export interface GenerateLanguageVariantsForItemSummary {
  packageId: string | null;
  sourceContentItemId: string;
  platform: string;
  createdLanguages: LanguageCode[];
  skippedLanguages: LanguageCode[];
  createdItemIds: string[];
  createdVideoJobIds: string[];
  warnings: string[];
}

// Item-level language-variant generation. Localizes ONE approved primary item
// (its platform) into every target language and — for video platforms with a
// reusable package render_spec — queues one variant video job per language.
// Independent of sibling items' statuses: an approved TikTok item localizes even
// while sibling X items are still draft. Dedupes by source_content_item_id +
// target_language (items) and by package + target_language (video jobs), so a
// second click (or a sibling video platform) never creates duplicates. The
// primary item, the primary package and the render_spec are never mutated; no
// image generation runs (scenes are reused verbatim).
export async function runGenerateLanguageVariantsForItem(
  input: GenerateLanguageVariantsForItemInput,
  deps: GenerateLanguageVariantsDeps = {},
): Promise<GenerateLanguageVariantsForItemSummary> {
  const { projectId, sourceContentItemId } = input;
  if (!projectId) throw new WorkflowError("invalid_input", "project_id is required");
  if (!sourceContentItemId) {
    throw new WorkflowError("invalid_input", "source_content_item_id is required");
  }

  const supabase: SupabaseClient = deps.client ?? createSupabaseAdminClient();
  const localize = deps.localize ?? localizeContentPackageForLanguage;
  const startVideoJob = deps.startVideoJob ?? startVideoWorkerJob;

  const project: Project = await loadProjectOrThrow(supabase, projectId);

  // Gate 1: the source item must exist, belong to the project, be PRIMARY
  // (language NULL) and APPROVED.
  const { data: sourceRow, error: sourceErr } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", sourceContentItemId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (sourceErr) throw sourceErr;
  if (!sourceRow) {
    throw new WorkflowError(
      "not_found",
      `content item ${sourceContentItemId} not found for project ${projectId}`,
    );
  }
  const source = sourceRow as ContentItem;
  if (source.language !== null) {
    throw new WorkflowError(
      "invalid_input",
      "source item is a language variant; only primary items can be localized",
    );
  }
  if (source.status !== "approved") {
    throw new WorkflowError(
      "invalid_input",
      "source item is not approved; approve it before generating variants",
    );
  }
  // Review UX V2 — translations are video-only. Text-only platforms (LinkedIn /
  // X / Google Business) stay English-only and are never localized.
  if (!isVideoPlatform(source.platform)) {
    throw new WorkflowError(
      "invalid_input",
      "translations are only generated for video platforms (TikTok / Instagram / YouTube / Facebook)",
    );
  }
  const packageId = source.package_id;
  if (!packageId) {
    throw new WorkflowError(
      "invalid_input",
      "source item has no package_id; cannot generate variants",
    );
  }

  const summary: GenerateLanguageVariantsForItemSummary = {
    packageId,
    sourceContentItemId,
    platform: source.platform,
    createdLanguages: [],
    skippedLanguages: [],
    createdItemIds: [],
    createdVideoJobIds: [],
    warnings: [],
  };

  // Gate 2: at least one target language.
  const targetLanguages = resolveTargetLanguages(
    project.language,
    project.enabled_languages ?? [],
  );
  if (targetLanguages.length === 0) {
    summary.warnings.push("no additional enabled_languages configured (no-op)");
    return summary;
  }

  // Load the package brief (authoritative voiceover/subtitles/cta source).
  const { data: pkg, error: pkgErr } = await supabase
    .from("content_packages")
    .select("id, package_brief")
    .eq("id", packageId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (pkgErr) throw pkgErr;
  if (!pkg) {
    throw new WorkflowError(
      "not_found",
      `content package ${packageId} not found for project ${projectId}`,
    );
  }
  const brief = asRecord(pkg.package_brief);

  // Existing variants for THIS source item (dedupe items) and existing variant
  // video jobs per language for the WHOLE package (dedupe video jobs).
  const { data: variantRows, error: variantErr } = await supabase
    .from("content_items")
    .select("id, language, generation_metadata")
    .eq("project_id", projectId)
    .eq("package_id", packageId)
    .not("language", "is", null);
  if (variantErr) throw variantErr;

  const coveredForSource = new Set<LanguageCode>();
  const variantItemIdToLanguage = new Map<string, LanguageCode>();
  for (const row of (variantRows ?? []) as {
    id: string;
    language: LanguageCode | null;
    generation_metadata: Json | null;
  }[]) {
    if (!row.language) continue;
    variantItemIdToLanguage.set(row.id, row.language);
    const meta = asRecord(row.generation_metadata);
    if (readString(meta, "source_content_item_id") === sourceContentItemId) {
      coveredForSource.add(row.language);
    }
  }

  const pending = pendingVariantLanguages(targetLanguages, coveredForSource);
  if (pending.length === 0) {
    summary.warnings.push(
      "all target languages already have a variant for this item (no-op)",
    );
    return summary;
  }

  // Languages that already have a variant video job anywhere in the package.
  const languagesWithVideo = new Set<LanguageCode>();
  const variantItemIds = Array.from(variantItemIdToLanguage.keys());
  if (variantItemIds.length > 0) {
    const { data: jobRows, error: jobErr } = await supabase
      .from("video_jobs")
      .select("content_item_id")
      .eq("project_id", projectId)
      .in("content_item_id", variantItemIds);
    if (jobErr) throw jobErr;
    for (const job of (jobRows ?? []) as { content_item_id: string | null }[]) {
      const lang = job.content_item_id
        ? variantItemIdToLanguage.get(job.content_item_id)
        : undefined;
      if (lang) languagesWithVideo.add(lang);
    }
  }

  // Video platforms reuse the package primary render_spec scenes (no image gen).
  // Text-only platforms never produce a video job.
  const wantsVideo = isVideoPlatform(source.platform);
  let sourceVideoJobId: string | null = null;
  let scenes: Record<string, unknown>[] | null = null;
  if (wantsVideo) {
    const { data: primaryRows, error: primaryErr } = await supabase
      .from("content_items")
      .select("id")
      .eq("project_id", projectId)
      .eq("package_id", packageId)
      .is("language", null);
    if (primaryErr) throw primaryErr;
    const primaryItemIds = (primaryRows ?? []).map((r) => (r as { id: string }).id);
    if (primaryItemIds.length > 0) {
      const { data: completedJobs, error: completedErr } = await supabase
        .from("video_jobs")
        .select("id, output, created_at")
        .eq("project_id", projectId)
        .in("content_item_id", primaryItemIds)
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      if (completedErr) throw completedErr;
      for (const job of completedJobs ?? []) {
        const candidate = extractRenderSpecScenes(
          (job as { output: unknown }).output,
        );
        if (candidate) {
          sourceVideoJobId = (job as { id: string }).id;
          scenes = candidate;
          break;
        }
      }
    }
    if (!scenes) {
      summary.warnings.push(
        "video platform but no completed render with reusable scenes; variant items created without a video job",
      );
    }
  }

  // Localization source = the package brief + ONLY this item's platform output.
  const sourceVoiceover = readString(brief, "voiceover_text");
  const sourceSubtitles = readString(brief, "subtitles");
  const sourceCta = readPackageCta(brief);
  const sourcePlatformItems: LocalizeSourcePlatformItem[] = [
    {
      platform: source.platform,
      title: source.title,
      body: source.body,
      caption: source.caption,
      hashtags: source.hashtags ?? [],
      cta: source.cta,
    },
  ];
  const briefVideo = asRecord(brief?.video);
  const videoConcept = readString(briefVideo, "concept");
  const videoScript = readString(briefVideo, "script");

  for (const language of pending) {
    const localizeInput: LocalizeContentPackageInput = {
      project,
      targetLanguage: language,
      source: {
        voiceoverText: sourceVoiceover,
        subtitles: sourceSubtitles,
        cta: sourceCta,
        platformItems: sourcePlatformItems,
      },
    };

    const localized = await localize(localizeInput);
    if (!localized.ok) {
      summary.warnings.push(
        `language ${language}: localization failed (${localized.error}); skipped`,
      );
      continue;
    }

    const out = localized.data.localized.platform_outputs.find(
      (o) => o.platform === source.platform,
    );
    if (!out) {
      summary.warnings.push(
        `language ${language}: no localized output for platform ${source.platform}; skipped`,
      );
      continue;
    }

    const { data: insertedItem, error: insertErr } = await supabase
      .from("content_items")
      .insert({
        project_id: projectId,
        package_id: packageId,
        platform: source.platform,
        format: source.format,
        status: "draft" as const,
        language,
        title: out.title ?? source.title,
        body: out.body ?? localized.data.localized.voiceover_text,
        caption: out.caption,
        hashtags: out.hashtags ?? [],
        cta: out.cta,
        generation_metadata: {
          source: "language_variant",
          kind: "language_variant",
          source_language: localized.data.sourceLanguage,
          target_language: language,
          source_content_item_id: source.id,
          source_video_job_id: sourceVideoJobId,
          generated_from_render_spec: Boolean(scenes),
          item_level: true,
        } as unknown as Json,
      })
      .select("id")
      .single();
    if (insertErr) throw insertErr;
    const variantItemId = insertedItem.id as string;
    summary.createdLanguages.push(language);
    summary.createdItemIds.push(variantItemId);

    // Video job: only for video platforms with reusable scenes, and only when
    // this package+language does not already have a variant video.
    if (!wantsVideo || !scenes) continue;
    if (languagesWithVideo.has(language)) {
      summary.skippedLanguages.push(language);
      continue;
    }

    const jobInput = {
      concept: videoConcept,
      script: videoScript,
      voiceover_text: localized.data.localized.voiceover_text,
      subtitles: localized.data.localized.subtitles,
      scenes,
      language,
      generated_from_language_variant: true,
    } as unknown as Json;

    const { data: jobRow, error: jobInsertErr } = await supabase
      .from("video_jobs")
      .insert({
        project_id: projectId,
        content_item_id: variantItemId,
        provider: "video_engine",
        status: "queued",
        input: jobInput,
      })
      .select("id")
      .single();
    if (jobInsertErr) throw jobInsertErr;
    const videoJobId = jobRow.id as string;
    summary.createdVideoJobIds.push(videoJobId);
    languagesWithVideo.add(language);

    if (!deps.videoCallbackUrl) {
      summary.warnings.push(
        `language ${language}: video job ${videoJobId} left queued (no callback url for inline start)`,
      );
      continue;
    }
    const dispatch = await claimAndDispatchVariantVideoJob(supabase, {
      videoJobId,
      projectId,
      contentPackageId: packageId,
      contentItemId: variantItemId,
      callbackUrl: deps.videoCallbackUrl,
      input: jobInput as Record<string, unknown>,
      startVideoJob,
    });
    if (dispatch.warning) {
      summary.warnings.push(`language ${language}: ${dispatch.warning}`);
    }
  }

  return summary;
}
