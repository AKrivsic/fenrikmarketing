import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractRenderSpecScenes } from "@/lib/ai/workflows/languageVariantsHelpers";
import {
  groupProjectVideoJobs,
  type ProjectVideoGroup,
} from "@/lib/video-scene-editor/videoJobGrouping";
import { readSceneEditorDraft } from "@/lib/video-scene-editor/metadata";
import { effectiveLanguage } from "@/lib/projects/language";
import {
  isVariantItem,
  newestByContentItem,
  readDebug,
  readProductionRunId,
  readSourceContentItemId,
  readVideoOutput,
  readVideoJobErrorMessage,
  describeVideoJobFailure,
  type RenderDebug,
} from "@/lib/api/content-shared";
import { loadVariantEligibility } from "@/lib/api/variant-eligibility";
import {
  buildPublishReadyText,
  buildPublishTitle,
} from "@/lib/publishing/publishReadyText";
import type {
  ApprovalStatus,
  ContentFormat,
  ContentItem,
  Json,
  JobStatus,
  LanguageCode,
  PlatformType,
} from "@/lib/supabase/types";

// Project-scoped, read-only views for the project owner. Uses the service-role
// admin client (RLS bypassed) because the MVP has no user session yet; keep
// this module server-only. Every query is manually scoped by project_id so a
// project can never read another project's rows. No mutations here — this layer
// is pure visibility (no generation controls).

// Downloadable artifact kinds produced by the video worker / n8n callback.
// Maps 1:1 to the keys written into video_jobs.output.
export type VideoArtifactType = "mp4" | "srt" | "thumbnail";

const ARTIFACT_OUTPUT_KEY: Record<VideoArtifactType, string> = {
  mp4: "mp4_url",
  srt: "subtitle_url",
  thumbnail: "thumbnail_url",
};

type VideoJobLite = {
  id: string;
  content_item_id: string | null;
  status: JobStatus;
  output: Json | null;
  error_message: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Content tabs (Review / Approved / Scheduled) — read-only.
// ---------------------------------------------------------------------------

export interface ProjectContentEntry {
  id: string;
  packageId: string | null;
  platform: PlatformType;
  format: ContentFormat;
  // Approval workflow status (draft → in_review → approved → scheduled →
  // published, or rejected). Surfaced as the item's "workflow status".
  status: ApprovalStatus;
  title: string | null;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  // Publishing UX V1 — the exact text to paste into the platform's primary
  // publish field (caption / post / tweet / description / body). Composed at
  // read time from caption + cta + hashtags per platform rules, so it always
  // reflects the latest edits without a DB column. Never empty for a populated
  // item; never contains "Hashtags:" / "CTA:" scaffolding.
  publishReadyText: string;
  // Standalone title to copy for title+body platforms (youtube, google_business);
  // null for single-field platforms where the title is not separately published.
  publishTitle: string | null;
  language: LanguageCode;
  isLanguageVariant: boolean;
  // Raw content_items.language (NULL for primary items). Distinct from the
  // resolved `language` above; the review actions need the raw value to target a
  // single variant for regeneration.
  variantLanguage: LanguageCode | null;
  // True only on a PRIMARY card whose package is ready for variant generation
  // (all primary items approved, project has target languages, no variants yet).
  // Drives the package-level "Generate language variants" action on the project
  // review tab.
  canGenerateVariants: boolean;
  // True on a PRIMARY card that is APPROVED and still has at least one target
  // language without a variant — independent of sibling items' statuses. Drives
  // the per-item "Generate language variants" action on the Approved tab so an
  // approved TikTok item can localize even while sibling X items are draft.
  canGenerateItemVariants: boolean;
  // Owning production run (generation_metadata.production_run_id), or null for
  // items that predate production runs. Used to group the review tab by run.
  productionRunId: string | null;
  // Language-variant source primary item id (generation_metadata), when present.
  sourceContentItemId: string | null;
  createdAt: string;
  // Newest video job linked directly to this content item (content_item_id),
  // or null when no video has been generated for it yet.
  videoJobId: string | null;
  videoStatus: JobStatus | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  subtitleUrl: string | null;
  // Render diagnostics from the linked video job's output.debug — drives the
  // package video panel's Warning / subtitle-fallback indicators. Null when the
  // item has no video job or the job predates debug metadata.
  videoDebug: RenderDebug | null;
  // Populated when the linked video job failed (headline is Czech; detail is raw).
  videoFailureHeadline: string | null;
  videoFailureDetail: string | null;
}

export interface ListProjectContentOptions {
  // When set, only items belonging to these packages are loaded. Used by the
  // project review tab to bound payload size (Review UX V2 hotfix).
  packageIds?: string[];
}

// Lists a project's content items filtered by approval status, enriched with
// the newest directly-linked video job. Two queries total (items, then their
// video jobs) — no N+1. Optional packageIds scopes the read to specific packages.
export async function listProjectContentByStatus(
  projectId: string,
  statuses: ApprovalStatus[],
  options: ListProjectContentOptions = {},
): Promise<ProjectContentEntry[]> {
  const packageIds = options.packageIds;
  if (packageIds !== undefined && packageIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();

  let itemsQuery = supabase
    .from("content_items")
    .select("*")
    .eq("project_id", projectId)
    .in("status", statuses)
    .order("created_at", { ascending: false });

  if (packageIds !== undefined) {
    itemsQuery = itemsQuery.in("package_id", packageIds);
  }

  const { data: itemRows, error: itemsError } = await itemsQuery;

  if (itemsError) throw itemsError;

  const items = (itemRows ?? []) as ContentItem[];
  if (items.length === 0) return [];

  const { data: jobRows, error: jobsError } = await supabase
    .from("video_jobs")
    .select("id, content_item_id, status, output, error_message, created_at")
    .eq("project_id", projectId)
    .in(
      "content_item_id",
      items.map((item) => item.id),
    )
    .order("created_at", { ascending: false });

  if (jobsError) throw jobsError;

  const jobByItem = newestByContentItem((jobRows ?? []) as VideoJobLite[]);

  // Shared eligibility computes per-package variant qualification and exposes the
  // project's primary language (resolves NULL item languages for badges) — so no
  // separate projects query is needed here.
  const eligibilityPackageIds = Array.from(
    new Set(
      items
        .map((item) => item.package_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );
  const eligibility = await loadVariantEligibility(
    supabase,
    eligibilityPackageIds,
    [projectId],
  );
  const projectLanguage =
    eligibility.projectLanguageById.get(projectId) ?? "cs";

  return items.map((item) => {
    const job = jobByItem.get(item.id);
    const output = job ? readVideoOutput(job.output) : null;
    const failureRaw = job
      ? readVideoJobErrorMessage({
          error_message: job.error_message,
          output: job.output,
        })
      : null;
    const failure =
      job?.status === "failed" ? describeVideoJobFailure(failureRaw) : null;
    const isVariant = isVariantItem(item);

    const publishInput = {
      platform: item.platform,
      title: item.title,
      caption: item.caption,
      cta: item.cta,
      hashtags: item.hashtags ?? [],
    };

    return {
      id: item.id,
      packageId: item.package_id,
      platform: item.platform,
      format: item.format,
      status: item.status,
      title: item.title,
      caption: item.caption,
      hashtags: item.hashtags ?? [],
      cta: item.cta,
      publishReadyText: buildPublishReadyText(publishInput),
      publishTitle: buildPublishTitle(publishInput),
      language: effectiveLanguage(item.language, projectLanguage),
      isLanguageVariant: isVariant,
      variantLanguage: item.language,
      canGenerateVariants:
        !isVariant && eligibility.qualifies(projectId, item.package_id),
      canGenerateItemVariants:
        !isVariant &&
        eligibility.qualifiesItem(projectId, {
          id: item.id,
          language: item.language,
          status: item.status,
          platform: item.platform,
        }),
      productionRunId: readProductionRunId(item.generation_metadata),
      sourceContentItemId: readSourceContentItemId(item.generation_metadata),
      createdAt: item.created_at,
      videoJobId: job?.id ?? null,
      videoStatus: job?.status ?? null,
      videoUrl: output?.mp4Url ?? null,
      thumbnailUrl: output?.thumbnailUrl ?? null,
      subtitleUrl: output?.subtitleUrl ?? null,
      videoDebug: job ? readDebug(job.output) : null,
      videoFailureHeadline: failure?.headline ?? null,
      videoFailureDetail: failure?.detail ?? null,
    } satisfies ProjectContentEntry;
  });
}

// ---------------------------------------------------------------------------
// Videos tab — read-only.
// ---------------------------------------------------------------------------

export interface ProjectVideoEntry {
  id: string;
  status: JobStatus;
  provider: string;
  model: string | null;
  errorMessage: string | null;
  /** Raw worker/callback message when status is failed. */
  errorDetail: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  contentItemId: string | null;
  itemTitle: string | null;
  platform: PlatformType | null;
  format: ContentFormat | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  subtitleUrl: string | null;
  hasMp4: boolean;
  hasSubtitle: boolean;
  hasThumbnail: boolean;
  /** True when this completed job has a persisted render_spec.scenes[] to edit. */
  canEditScenes: boolean;
  isEditorRerender: boolean;
}

export type { ProjectVideoGroup };

interface VideoJobRow {
  id: string;
  content_item_id: string | null;
  provider: string;
  model: string | null;
  status: JobStatus;
  input: Json | null;
  output: Json | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function readEditorRerenderFlag(input: Json | null): boolean {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  return (input as Record<string, unknown>).scene_editor_rerender === true;
}

// Lists every video job for a project (created_at desc), enriched with the
// linked content item's title / platform / format. Two queries total — no N+1.
export async function listProjectVideoJobs(
  projectId: string,
): Promise<ProjectVideoEntry[]> {
  const supabase = createSupabaseAdminClient();

  const { data: jobRows, error: jobsError } = await supabase
    .from("video_jobs")
    .select(
      "id, content_item_id, provider, model, status, input, output, error_message, created_at, updated_at, completed_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (jobsError) throw jobsError;

  const jobs = (jobRows ?? []) as VideoJobRow[];
  if (jobs.length === 0) return [];

  const contentItemIds = Array.from(
    new Set(
      jobs
        .map((job) => job.content_item_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  const itemById = new Map<
    string,
    { title: string | null; platform: PlatformType; format: ContentFormat }
  >();
  if (contentItemIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabase
      .from("content_items")
      .select("id, title, platform, format")
      .eq("project_id", projectId)
      .in("id", contentItemIds);

    if (itemsError) throw itemsError;

    for (const row of (itemRows ?? []) as {
      id: string;
      title: string | null;
      platform: PlatformType;
      format: ContentFormat;
    }[]) {
      itemById.set(row.id, {
        title: row.title,
        platform: row.platform,
        format: row.format,
      });
    }
  }

  return jobs.map((job) => {
    const output = readVideoOutput(job.output);
    const failureRaw = readVideoJobErrorMessage(job);
    const failure =
      job.status === "failed" ? describeVideoJobFailure(failureRaw) : null;
    const item = job.content_item_id
      ? itemById.get(job.content_item_id)
      : undefined;

    return {
      id: job.id,
      status: job.status,
      provider: job.provider,
      model: job.model,
      errorMessage: failure?.headline ?? null,
      errorDetail: failure?.detail ?? null,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt: job.completed_at,
      contentItemId: job.content_item_id,
      itemTitle: item?.title ?? null,
      platform: item?.platform ?? null,
      format: item?.format ?? null,
      videoUrl: output.mp4Url,
      thumbnailUrl: output.thumbnailUrl,
      subtitleUrl: output.subtitleUrl,
      hasMp4: output.mp4Url !== null,
      hasSubtitle: output.subtitleUrl !== null,
      hasThumbnail: output.thumbnailUrl !== null,
      canEditScenes:
        job.status === "completed" &&
        job.content_item_id !== null &&
        extractRenderSpecScenes(job.output) !== null,
      isEditorRerender: readEditorRerenderFlag(job.input),
    } satisfies ProjectVideoEntry;
  });
}

export async function listProjectVideoGroups(
  projectId: string,
): Promise<ProjectVideoGroup[]> {
  const entries = await listProjectVideoJobs(projectId);
  if (entries.length === 0) return [];

  const contentItemIds = Array.from(
    new Set(
      entries
        .map((e) => e.contentItemId)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  const editorSourceByItem = new Map<string, string>();
  if (contentItemIds.length > 0) {
    const supabase = createSupabaseAdminClient();
    const { data: itemRows, error } = await supabase
      .from("content_items")
      .select("id, generation_metadata")
      .eq("project_id", projectId)
      .in("id", contentItemIds);
    if (error) throw error;
    for (const row of (itemRows ?? []) as {
      id: string;
      generation_metadata: Json | null;
    }[]) {
      const draft = readSceneEditorDraft(row.generation_metadata);
      if (draft?.source_video_job_id) {
        editorSourceByItem.set(row.id, draft.source_video_job_id);
      }
    }
  }

  return groupProjectVideoJobs(entries, { editorSourceByItem });
}

// Resolves a single downloadable artifact URL for one video job, scoped by
// BOTH project_id and job id so the download route can never leak another
// project's render. Returns null when the job or the requested artifact does
// not exist.
export async function getProjectVideoArtifactUrl(
  projectId: string,
  jobId: string,
  type: VideoArtifactType,
): Promise<string | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("video_jobs")
    .select("output")
    .eq("project_id", projectId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const output = (data as { output: Json | null }).output;
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return null;
  }

  const value = (output as Record<string, unknown>)[ARTIFACT_OUTPUT_KEY[type]];
  return typeof value === "string" && value.length > 0 ? value : null;
}
