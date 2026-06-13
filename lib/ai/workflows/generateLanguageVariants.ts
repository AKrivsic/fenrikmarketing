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
  extractRenderSpecScenes,
  isVideoPlatform,
  pendingVariantLanguages,
  resolveTargetLanguages,
} from "@/lib/ai/workflows/languageVariantsHelpers";

export interface GenerateLanguageVariantsInput {
  projectId: string;
  packageId: string;
}

export interface GenerateLanguageVariantsSummary {
  packageId: string;
  // Variant target languages resolved for the owning project.
  targetLanguages: LanguageCode[];
  // Video platforms that produced at least one new variant in this run.
  processedPlatforms: string[];
  // Video platforms skipped: already fully translated (no-op), not approved, or
  // failed (see errors). Text-only platforms are never considered.
  skippedPlatforms: string[];
  createdLanguages: LanguageCode[];
  createdItemIds: string[];
  createdVideoJobIds: string[];
  warnings: string[];
  // Per-platform failures. A failing platform never aborts the others.
  errors: string[];
}

// Video platforms are processed in this order. TikTok leads so the single,
// package-wide-deduped variant video job per language attaches to the TikTok
// variant — matching the proven item-level production order.
const VIDEO_PLATFORM_ORDER = ["tiktok", "instagram", "youtube", "facebook"];

function videoPlatformRank(platform: string): number {
  const index = VIDEO_PLATFORM_ORDER.indexOf(platform);
  return index === -1 ? VIDEO_PLATFORM_ORDER.length : index;
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

// Generates language variants for an APPROVED primary content package. This is
// the package-level entry point behind the single "Generate translations"
// button, but it does NOT localize every platform inside one heavy multi-
// platform AI call (that path serialized all platforms x all languages into a
// single request and timed out on Vercel after 300s). Instead it resolves the
// approved video-platform primary items and delegates EACH to the proven item-
// level workflow (runGenerateLanguageVariantsForItem) — many small, fast,
// single-platform localizations. Dedupe of variant content_items and of video
// jobs (one per package+language) is inherited verbatim from the item-level
// workflow, so a platform that is already translated is skipped and the others
// continue. Never mutates the primary package or its primary content_items.
// Text-only platforms (LinkedIn / X / Google Business) are never localized.
export async function runGenerateLanguageVariants(
  input: GenerateLanguageVariantsInput,
  deps: GenerateLanguageVariantsDeps = {},
): Promise<GenerateLanguageVariantsSummary> {
  const { projectId, packageId } = input;
  if (!projectId) throw new WorkflowError("invalid_input", "project_id is required");
  if (!packageId) throw new WorkflowError("invalid_input", "package_id is required");

  const supabase: SupabaseClient = deps.client ?? createSupabaseAdminClient();
  const project: Project = await loadProjectOrThrow(supabase, projectId);

  // Gate 1: package belongs to the project.
  const { data: pkg, error: pkgErr } = await supabase
    .from("content_packages")
    .select("id")
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

  const summary: GenerateLanguageVariantsSummary = {
    packageId,
    targetLanguages: [],
    processedPlatforms: [],
    skippedPlatforms: [],
    createdLanguages: [],
    createdItemIds: [],
    createdVideoJobIds: [],
    warnings: [],
    errors: [],
  };

  // Gate 2: enabled_languages must yield at least one target -> otherwise no-op.
  const targetLanguages = resolveTargetLanguages(
    project.language,
    project.enabled_languages ?? [],
  );
  summary.targetLanguages = targetLanguages;
  if (targetLanguages.length === 0) {
    summary.warnings.push("no additional enabled_languages configured (no-op)");
    return summary;
  }

  // Gate 3: primary content items = package_id + language IS NULL.
  const { data: primaryRows, error: primaryErr } = await supabase
    .from("content_items")
    .select("id, platform, status, language")
    .eq("project_id", projectId)
    .eq("package_id", packageId)
    .is("language", null);
  if (primaryErr) throw primaryErr;
  const primaryItems = (primaryRows ?? []) as Pick<
    ContentItem,
    "id" | "platform" | "status" | "language"
  >[];

  // Review UX V2 — translations target ONLY video platforms (TikTok /
  // Instagram / YouTube / Facebook). Text-only platforms (LinkedIn / X /
  // Google Business) are excluded here and never produce variant items.
  const videoPrimaryItems = primaryItems.filter((item) =>
    isVideoPlatform(item.platform),
  );
  if (videoPrimaryItems.length === 0) {
    throw new WorkflowError(
      "invalid_input",
      "this package has no video-platform primary items to translate (translations are video-only)",
    );
  }

  // Only APPROVED video-platform primaries are localized. A non-approved video
  // primary is skipped (it never blocks its approved siblings, matching the
  // item-level rule); the throw below only fires when NONE are approved.
  const approvedVideoItems: typeof videoPrimaryItems = [];
  for (const item of videoPrimaryItems) {
    if (item.status === "approved") {
      approvedVideoItems.push(item);
    } else {
      summary.skippedPlatforms.push(item.platform);
    }
  }
  if (approvedVideoItems.length === 0) {
    throw new WorkflowError(
      "invalid_input",
      "no approved video-platform primary items; approve at least one before generating translations",
    );
  }

  // Delegate each approved video platform to the item-level workflow, TikTok
  // first so the single package-wide-deduped video job per language attaches to
  // the TikTok variant. Sequential awaits guarantee the first platform's video
  // jobs are persisted before the next platform dedupes against them. The
  // injected client is shared so all calls reuse one connection.
  const ordered = [...approvedVideoItems].sort(
    (a, b) => videoPlatformRank(a.platform) - videoPlatformRank(b.platform),
  );
  const itemDeps: GenerateLanguageVariantsDeps = { ...deps, client: supabase };
  const createdLanguages = new Set<LanguageCode>();

  for (const item of ordered) {
    try {
      const itemSummary = await runGenerateLanguageVariantsForItem(
        { projectId, sourceContentItemId: item.id },
        itemDeps,
      );
      if (itemSummary.createdItemIds.length > 0) {
        summary.processedPlatforms.push(item.platform);
      } else {
        // Nothing new (already fully translated for this item).
        summary.skippedPlatforms.push(item.platform);
      }
      summary.createdItemIds.push(...itemSummary.createdItemIds);
      summary.createdVideoJobIds.push(...itemSummary.createdVideoJobIds);
      for (const language of itemSummary.createdLanguages) {
        createdLanguages.add(language);
      }
      for (const warning of itemSummary.warnings) {
        summary.warnings.push(`${item.platform}: ${warning}`);
      }
    } catch (err) {
      // A single platform failing never aborts the others.
      const detail = err instanceof Error ? err.message : "unknown error";
      summary.errors.push(`${item.platform}: ${detail}`);
      summary.skippedPlatforms.push(item.platform);
    }
  }

  // Order-preserving over the resolved targets.
  summary.createdLanguages = targetLanguages.filter((language) =>
    createdLanguages.has(language),
  );
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
