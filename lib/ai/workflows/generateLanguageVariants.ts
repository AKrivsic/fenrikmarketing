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
import { insertVariantVideoJobIfSlotAvailable } from "@/lib/ai/workflows/variantVideoSlot";
import {
  isVideoContentPlatform,
  parseContentControls,
} from "@/lib/projects/contentControls";
import {
  extractRenderSpecScenes,
  pendingVariantLanguages,
  resolveTargetLanguages,
} from "@/lib/ai/workflows/languageVariantsHelpers";
import { prepareRenderScenesForLanguageVariant } from "@/lib/scene-types/languageVariantScenes";
import { attachTtsToVideoJobInput } from "@/lib/voice/videoJobTtsInput";
import { applySemanticMotionPreservationFromSourceJob } from "@/lib/video-engine/semanticMotion/storedSemanticMotionJobInput";
import {
  buildGenerationTelemetryDocument,
  runWithTelemetrySession,
} from "@/lib/ai/telemetry";
import { mergeProductionRunIdIntoVariantMetadata } from "@/lib/production-runtime";

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

// NOTE: the package-level orchestrator that used to live here
// (runGenerateLanguageVariants) ran every platform × language localization
// inline and timed out on Vercel after 300s. It has been replaced by the
// asynchronous translation-jobs queue (lib/ai/workflows/translationJobs.ts):
// the action enqueues pending units and a background endpoint processes each
// (item, language) one at a time using the item-level workflow below.
export interface GenerateLanguageVariantsForItemInput {
  projectId: string;
  sourceContentItemId: string;
  // Optional allow-list of target languages to process in THIS call. When set,
  // only the intersection of (still-pending languages) and this list is
  // localized — used by the async translation-jobs processor to handle exactly
  // one language per background invocation. Unset = process every pending
  // language (the original synchronous behaviour).
  languages?: LanguageCode[];
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
  const platformContentTypes = parseContentControls(
    project.publishing_rules,
  ).platformContentTypes;

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
  // Review UX V2 — translations are video-only. Text-only platforms (per
  // Content Controls) stay primary-language only and are never localized.
  if (!isVideoContentPlatform(source.platform, platformContentTypes)) {
    throw new WorkflowError(
      "invalid_input",
      "translations are only generated for platforms configured as video in Content Controls",
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

  let pending = pendingVariantLanguages(targetLanguages, coveredForSource);
  // Optional single/subset language scoping for the async processor: only keep
  // the requested languages (intersection preserves the target order). An empty
  // intersection is a benign no-op (the requested language is already covered).
  if (input.languages && input.languages.length > 0) {
    const requested = new Set<LanguageCode>(input.languages);
    pending = pending.filter((language) => requested.has(language));
  }
  if (pending.length === 0) {
    summary.warnings.push(
      "all target languages already have a variant for this item (no-op)",
    );
    return summary;
  }

  // Languages that already have a variant video job anywhere in the package
  // (fast path hint only — insert uses the race-safe DB slot RPC).
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
  const wantsVideo = isVideoContentPlatform(
    source.platform,
    platformContentTypes,
  );
  let sourceVideoJobId: string | null = null;
  let sourceVideoJobInput: Record<string, unknown> | null = null;
  let sourceVideoJobOutput: unknown = null;
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
        .select("id, input, output, created_at")
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
          sourceVideoJobInput = asRecord((job as { input: unknown }).input);
          sourceVideoJobOutput = (job as { output: unknown }).output;
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

    const { result: localized, steps: localizeSteps } =
      await runWithTelemetrySession(async () => localize(localizeInput));
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

  // Sprint 5.3.2 — prepare visual-clone scenes BEFORE insert so a fidelity /
  // missing-asset failure never leaves an orphan text item without a valid video.
    let preparedScenes: {
      scenes: Record<string, unknown>[];
      warnings: string[];
    } | null = null;
    if (wantsVideo && scenes && !languagesWithVideo.has(language)) {
      try {
        preparedScenes = prepareRenderScenesForLanguageVariant({
          scenes,
          voiceoverText: localized.data.localized.voiceover_text,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        summary.warnings.push(
          `language ${language}: ${message}; skipped (visual fidelity)`,
        );
        continue;
      }
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
        generation_metadata: mergeProductionRunIdIntoVariantMetadata(
          source.generation_metadata,
          {
            source: "language_variant",
            kind: "language_variant",
            source_language: localized.data.sourceLanguage,
            target_language: language,
            source_content_item_id: source.id,
            source_video_job_id: sourceVideoJobId,
            generated_from_render_spec: Boolean(scenes),
            item_level: true,
            generation_telemetry: buildGenerationTelemetryDocument({
              legacy: {
                production_run_id:
                  asRecord(source.generation_metadata)?.production_run_id ??
                  null,
                target_language: language,
              },
              steps: localizeSteps,
            }),
          },
        ) as unknown as Json,
      })
      .select("id")
      .single();
    if (insertErr) throw insertErr;
    const variantItemId = insertedItem.id as string;
    summary.createdLanguages.push(language);
    summary.createdItemIds.push(variantItemId);

    // Video job: only for video platforms with reusable scenes. One slot per
    // package+language (RPC); parallel platform translation units must not each
    // insert a render.
    if (!wantsVideo || !scenes || !preparedScenes) continue;
    if (languagesWithVideo.has(language)) {
      summary.skippedLanguages.push(language);
      continue;
    }

    const localizedVoiceover = localized.data.localized.voiceover_text;
    for (const warning of preparedScenes.warnings) {
      summary.warnings.push(`language ${language}: ${warning}`);
    }

    let jobInput = await attachTtsToVideoJobInput(
      supabase,
      projectId,
      {
        concept: videoConcept,
        script: videoScript,
        voiceover_text: localizedVoiceover,
        subtitles: localized.data.localized.subtitles,
        scenes: preparedScenes.scenes,
        language,
        generated_from_language_variant: true,
        ...(sourceVideoJobId ? { source_video_job_id: sourceVideoJobId } : {}),
      },
      sourceVideoJobInput,
    );
    jobInput = applySemanticMotionPreservationFromSourceJob({
      jobInput: jobInput as Record<string, unknown>,
      sourceJobOutput: sourceVideoJobOutput,
    }) as typeof jobInput;

    const videoJobId = await insertVariantVideoJobIfSlotAvailable(supabase, {
      projectId,
      packageId,
      language,
      contentItemId: variantItemId,
      input: jobInput as unknown as Json,
    });
    if (!videoJobId) {
      summary.warnings.push(
        `language ${language}: variant video slot already taken for package; text item kept without new video job`,
      );
      languagesWithVideo.add(language);
      continue;
    }
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
