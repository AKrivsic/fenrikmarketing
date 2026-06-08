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
  pickVideoJobItem,
} from "@/lib/ai/workflows/languageVariantsHelpers";

export interface RegenerateLanguageVariantInput {
  projectId: string;
  packageId: string;
  targetLanguage: LanguageCode;
}

export interface RegenerateLanguageVariantSummary {
  packageId: string;
  language: LanguageCode;
  updatedItemIds: string[];
  videoJobId: string | null;
  versionsCreated: number;
  warnings: string[];
}

// Injectable dependencies. Mirrors generate-language-variants so the route /
// server action can supply the request-derived video callback URL.
export interface RegenerateLanguageVariantDeps {
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

function readPackageCta(
  brief: Record<string, unknown> | null,
): { type: string; text: string } | null {
  const cta = asRecord(brief?.cta);
  if (!cta) return null;
  const type = readString(cta, "type");
  const text = readString(cta, "text");
  return type && text ? { type, text } : null;
}

// Regenerates a SINGLE language variant of a content package. Re-localizes the
// approved primary content, snapshots the existing variant items into
// content_versions, updates ONLY the variant items for the target language back
// to draft, and queues a fresh video job that reuses the source render_spec
// scenes. Never touches the primary package, primary items, or other languages.
export async function runRegenerateLanguageVariant(
  input: RegenerateLanguageVariantInput,
  deps: RegenerateLanguageVariantDeps = {},
): Promise<RegenerateLanguageVariantSummary> {
  const { projectId, packageId, targetLanguage } = input;
  if (!projectId) throw new WorkflowError("invalid_input", "project_id is required");
  if (!packageId) throw new WorkflowError("invalid_input", "package_id is required");
  if (!targetLanguage) {
    throw new WorkflowError("invalid_input", "target_language is required");
  }

  const supabase: SupabaseClient = deps.client ?? createSupabaseAdminClient();
  const localize = deps.localize ?? localizeContentPackageForLanguage;
  const startVideoJob = deps.startVideoJob ?? startVideoWorkerJob;

  const project: Project = await loadProjectOrThrow(supabase, projectId);

  // Gate 1: target language must be a real variant, never the primary language.
  if (targetLanguage === project.language) {
    throw new WorkflowError(
      "invalid_input",
      "target_language equals the project's primary language; nothing to regenerate",
    );
  }

  // Gate 2: package belongs to the project (and load its brief).
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

  const summary: RegenerateLanguageVariantSummary = {
    packageId,
    language: targetLanguage,
    updatedItemIds: [],
    videoJobId: null,
    versionsCreated: 0,
    warnings: [],
  };

  // Gate 3: variant items must already exist for this package + language.
  const { data: variantRows, error: variantErr } = await supabase
    .from("content_items")
    .select("*")
    .eq("project_id", projectId)
    .eq("package_id", packageId)
    .eq("language", targetLanguage);
  if (variantErr) throw variantErr;
  const variantItems = (variantRows ?? []) as ContentItem[];
  if (variantItems.length === 0) {
    throw new WorkflowError(
      "invalid_input",
      `no variant content items exist for language ${targetLanguage}; generate variants first`,
    );
  }

  // Gate 4: primary content items (language IS NULL) are the localization source.
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

  // Gate 5: source render_spec from the newest completed primary video job.
  const primaryItemIds = primaryItems.map((item) => item.id);
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

  // Build the localization source from the primary items + package brief.
  const sourceVoiceover = readString(brief, "voiceover_text");
  const sourceSubtitles = readString(brief, "subtitles");
  const sourceCta = readPackageCta(brief);
  const sourcePlatformItems: LocalizeSourcePlatformItem[] = primaryItems.map(
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

  const localizeInput: LocalizeContentPackageInput = {
    project,
    targetLanguage,
    source: {
      voiceoverText: sourceVoiceover,
      subtitles: sourceSubtitles,
      cta: sourceCta,
      platformItems: sourcePlatformItems,
    },
  };

  const localized = await localize(localizeInput);
  if (!localized.ok) {
    throw new WorkflowError(
      "invalid_input",
      `localization failed for language ${targetLanguage}: ${localized.error}`,
    );
  }

  // Snapshot the CURRENT variant items into content_versions BEFORE overwriting.
  // Scoped to the variant only (one variant item id + snapshot of all variant
  // items for this language); the primary package is never snapshotted here.
  summary.versionsCreated = await snapshotVariant(
    supabase,
    projectId,
    packageId,
    targetLanguage,
    variantItems,
  );

  // Update ONLY the existing variant items, matched by platform. Primary items
  // and other-language variants are never in this set, so they cannot change.
  const variantByPlatform = new Map<string, ContentItem>();
  for (const item of variantItems) variantByPlatform.set(item.platform, item);

  const regeneratedAt = new Date().toISOString();
  for (const out of localized.data.localized.platform_outputs) {
    const variant = variantByPlatform.get(out.platform);
    if (!variant) {
      summary.warnings.push(
        `platform ${out.platform}: no existing variant item to update; skipped`,
      );
      continue;
    }

    const existingMeta = asRecord(variant.generation_metadata) ?? {};
    const { error: updErr } = await supabase
      .from("content_items")
      .update({
        status: "draft" as const,
        title: out.title ?? variant.title,
        body: out.body ?? localized.data.localized.voiceover_text,
        caption: out.caption,
        hashtags: out.hashtags ?? [],
        cta: out.cta,
        generation_metadata: {
          ...existingMeta,
          regenerated: true,
          regenerated_at: regeneratedAt,
        } as unknown as Json,
      })
      .eq("id", variant.id)
      .eq("project_id", projectId)
      .eq("package_id", packageId)
      .eq("language", targetLanguage);
    if (updErr) throw updErr;
    summary.updatedItemIds.push(variant.id);
  }

  // Fresh video job for the variant (TikTok preferred). input.scenes reuses the
  // source render_spec scenes so the worker reuses visuals (no image gen).
  const videoItem = pickVideoJobItem(variantItems);
  if (!videoItem) return summary;

  const jobInput = {
    concept: videoConcept,
    script: videoScript,
    voiceover_text: localized.data.localized.voiceover_text,
    subtitles: localized.data.localized.subtitles,
    scenes,
    language: targetLanguage,
    regenerated_language_variant: true,
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
  summary.videoJobId = videoJobId;

  // Best-effort inline worker start (same contract as generate-variants). The
  // job is claimed (queued -> processing) BEFORE dispatch so the worker's
  // terminal callback can never be overwritten back to processing (Task 5).
  if (!deps.videoCallbackUrl) {
    summary.warnings.push(
      `video job ${videoJobId} left queued (no callback url for inline start)`,
    );
    return summary;
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
  if (dispatch.warning) summary.warnings.push(dispatch.warning);

  return summary;
}

// Stores ONE variant-scoped snapshot in content_versions: content_item_id is a
// single variant item (so version_no is sequenced per that item, away from the
// package's own sequence) while content_package_id keeps it discoverable in
// history. The snapshot jsonb captures every variant item for this language.
async function snapshotVariant(
  supabase: SupabaseClient,
  projectId: string,
  packageId: string,
  language: LanguageCode,
  variantItems: ContentItem[],
): Promise<number> {
  const anchorItemId = pickVideoJobItem(variantItems)?.id ?? variantItems[0].id;

  const { data: versions, error } = await supabase
    .from("content_versions")
    .select("version_no")
    .eq("content_item_id", anchorItemId);
  if (error) throw error;

  const nextVersion =
    (versions ?? []).reduce(
      (max, v) => Math.max(max, (v.version_no as number) ?? 0),
      0,
    ) + 1;

  const { error: insErr } = await supabase.from("content_versions").insert({
    project_id: projectId,
    content_item_id: anchorItemId,
    content_package_id: packageId,
    version_no: nextVersion,
    snapshot: { language, items: variantItems } as unknown as Json,
    change_note: `regenerate: language variant ${language}`,
  });
  if (insErr) throw insErr;
  return 1;
}
