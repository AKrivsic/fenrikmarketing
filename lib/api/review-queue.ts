import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { effectiveLanguage } from "@/lib/projects/language";
import {
  allItemsApproved,
  resolveTargetLanguages,
} from "@/lib/ai/workflows/languageVariantsHelpers";
import type {
  ApprovalStatus,
  ContentFormat,
  ContentItem,
  Json,
  LanguageCode,
  PlatformType,
  VideoJob,
} from "@/lib/supabase/types";

// Statuses that make a content item show up in the review queue.
const REVIEW_STATUSES: ApprovalStatus[] = ["draft", "in_review"];

// Read-only shape consumed by the Review Queue UI. snake_case DB columns are
// mapped to camelCase here so the components never touch raw rows.
export interface ReviewQueueItem {
  id: string;
  projectId: string;
  packageId: string | null;
  platform: PlatformType;
  format: ContentFormat;
  status: ApprovalStatus;
  title: string | null;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  // Raw column (NULL = primary language). effectiveLanguage resolves NULL to the
  // project's primary language.
  language: LanguageCode | null;
  effectiveLanguage: LanguageCode;
  // True for language-variant items (language != null OR
  // generation_metadata.kind === "language_variant").
  isLanguageVariant: boolean;
  // Read from generation_metadata for variants; null for primary items.
  sourceLanguage: LanguageCode | null;
  targetLanguage: LanguageCode | null;
  // True only on a PRIMARY card whose package is ready for variant generation:
  // all primary items approved, project has additional enabled_languages, and
  // no variants exist yet. Drives the "Generate language variants" button.
  canGenerateVariants: boolean;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

// Extracts variant metadata from a content_items.generation_metadata blob.
function readVariantMeta(metadata: Json | null): {
  kind: string | null;
  sourceLanguage: LanguageCode | null;
  targetLanguage: LanguageCode | null;
} {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { kind: null, sourceLanguage: null, targetLanguage: null };
  }
  const record = metadata as Record<string, unknown>;
  const kind = typeof record.kind === "string" ? record.kind : null;
  const sourceLanguage =
    typeof record.source_language === "string"
      ? (record.source_language as LanguageCode)
      : null;
  const targetLanguage =
    typeof record.target_language === "string"
      ? (record.target_language as LanguageCode)
      : null;
  return { kind, sourceLanguage, targetLanguage };
}

function isVariantItem(item: ContentItem): boolean {
  if (item.language !== null) return true;
  return readVariantMeta(item.generation_metadata).kind === "language_variant";
}

// Pulls mp4_url / thumbnail_url out of a video_jobs.output jsonb blob.
function readVideoOutput(output: Json | null): {
  mp4Url: string | null;
  thumbnailUrl: string | null;
} {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return { mp4Url: null, thumbnailUrl: null };
  }
  const record = output as Record<string, unknown>;
  const mp4Url = typeof record.mp4_url === "string" ? record.mp4_url : null;
  const thumbnailUrl =
    typeof record.thumbnail_url === "string" ? record.thumbnail_url : null;
  return { mp4Url, thumbnailUrl };
}

type VideoLite = Pick<
  VideoJob,
  "id" | "content_item_id" | "output" | "created_at"
>;

// Reduces a list of jobs to the newest job per content_item_id. Input is
// expected to be ordered created_at desc, so the first seen wins.
function newestByContentItem(jobs: VideoLite[]): Map<string, VideoLite> {
  const byItem = new Map<string, VideoLite>();
  for (const job of jobs) {
    const itemId = job.content_item_id;
    if (!itemId) continue;
    if (!byItem.has(itemId)) byItem.set(itemId, job);
  }
  return byItem;
}

// Global, read-only review queue across all projects (no project_id filter —
// project scoping is intentionally out of scope for this view). Uses the
// service-role admin client because the internal MVP has no user session yet;
// RLS is therefore bypassed and this helper must stay server-only.
export async function listReviewQueueItems(): Promise<ReviewQueueItem[]> {
  const supabase = createSupabaseAdminClient();

  // Queue items: draft / in_review (always shown — unchanged behaviour).
  const { data: queueRows, error: queueError } = await supabase
    .from("content_items")
    .select("*")
    .in("status", REVIEW_STATUSES)
    .order("created_at", { ascending: false });
  if (queueError) throw queueError;

  // Approved PRIMARY items (language IS NULL) are surfaced ONLY so an approved
  // package can offer "Generate language variants". They are filtered below to
  // packages that actually qualify, so the queue is not flooded with approved
  // content forever (once variants exist, the primary card drops out).
  const { data: approvedPrimaryRows, error: approvedError } = await supabase
    .from("content_items")
    .select("*")
    .eq("status", "approved")
    .is("language", null)
    .order("created_at", { ascending: false });
  if (approvedError) throw approvedError;

  const queueItems = (queueRows ?? []) as ContentItem[];
  const approvedPrimary = (approvedPrimaryRows ?? []) as ContentItem[];
  if (queueItems.length === 0 && approvedPrimary.length === 0) return [];

  // Package scan over every package referenced by the candidate items, to
  // compute per-package: are all primary items approved, and do variants exist.
  const candidatePackageIds = Array.from(
    new Set(
      [...queueItems, ...approvedPrimary]
        .map((item) => item.package_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  const primaryStatusesByPackage = new Map<string, ApprovalStatus[]>();
  const hasVariantsByPackage = new Map<string, boolean>();
  if (candidatePackageIds.length > 0) {
    const { data: pkgItemRows, error: pkgItemsError } = await supabase
      .from("content_items")
      .select("package_id, language, status")
      .in("package_id", candidatePackageIds);
    if (pkgItemsError) throw pkgItemsError;

    for (const row of (pkgItemRows ?? []) as {
      package_id: string | null;
      language: LanguageCode | null;
      status: ApprovalStatus;
    }[]) {
      if (!row.package_id) continue;
      if (row.language === null) {
        const list = primaryStatusesByPackage.get(row.package_id) ?? [];
        list.push(row.status);
        primaryStatusesByPackage.set(row.package_id, list);
      } else {
        hasVariantsByPackage.set(row.package_id, true);
      }
    }
  }

  // Project info: primary language + enabled_languages (for badge + gating).
  const candidateProjectIds = Array.from(
    new Set([...queueItems, ...approvedPrimary].map((item) => item.project_id)),
  );
  const { data: projectRows, error: projectsError } = await supabase
    .from("projects")
    .select("id, language, enabled_languages")
    .in("id", candidateProjectIds);
  if (projectsError) throw projectsError;
  const projectLanguageById = new Map<string, LanguageCode>();
  const projectTargetsById = new Map<string, LanguageCode[]>();
  for (const row of (projectRows ?? []) as {
    id: string;
    language: LanguageCode;
    enabled_languages: LanguageCode[] | null;
  }[]) {
    projectLanguageById.set(row.id, row.language);
    projectTargetsById.set(
      row.id,
      resolveTargetLanguages(row.language, row.enabled_languages ?? []),
    );
  }

  // A package qualifies for variant generation when all its primary items are
  // approved, it has no variants yet, and the project has target languages.
  function packageQualifiesForVariants(
    projectId: string,
    packageId: string | null,
  ): boolean {
    if (!packageId) return false;
    if (!allItemsApproved(primaryStatusesByPackage.get(packageId) ?? [])) {
      return false;
    }
    if (hasVariantsByPackage.get(packageId)) return false;
    return (projectTargetsById.get(projectId) ?? []).length > 0;
  }

  // Final listing: all queue items + approved primary items whose package
  // qualifies (so the Generate trigger is reachable, without flooding).
  const items: ContentItem[] = [
    ...queueItems,
    ...approvedPrimary.filter((item) =>
      packageQualifiesForVariants(item.project_id, item.package_id),
    ),
  ];
  if (items.length === 0) return [];

  // --- Video lookup step 1: newest job directly on each content_item_id. ---
  const itemIds = items.map((item) => item.id);
  const { data: directJobRows, error: directJobError } = await supabase
    .from("video_jobs")
    .select("id, content_item_id, output, created_at")
    .in("content_item_id", itemIds)
    .order("created_at", { ascending: false });

  if (directJobError) throw directJobError;
  const directByItem = newestByContentItem((directJobRows ?? []) as VideoLite[]);

  // --- Video lookup step 2: for items still without a video, resolve through
  // sibling content_items sharing the same package_id, then their newest job.
  // video_jobs has no package column, so the path is always
  // package_id -> sibling content_items -> video_jobs.
  const packageIdsNeedingVideo = Array.from(
    new Set(
      items
        .filter((item) => !directByItem.has(item.id) && item.package_id)
        .map((item) => item.package_id as string),
    ),
  );

  // Map: package_id -> newest video output found via siblings.
  const packageVideo = new Map<
    string,
    { mp4Url: string | null; thumbnailUrl: string | null }
  >();

  if (packageIdsNeedingVideo.length > 0) {
    // Primary-only siblings (language IS NULL). A primary card must never borrow
    // a language variant's video as a fallback, so variant rows are excluded
    // from the sibling resolution entirely.
    const { data: siblingRows, error: siblingError } = await supabase
      .from("content_items")
      .select("id, package_id")
      .in("package_id", packageIdsNeedingVideo)
      .is("language", null);

    if (siblingError) throw siblingError;

    const siblings = (siblingRows ?? []) as {
      id: string;
      package_id: string | null;
    }[];

    const siblingIdToPackage = new Map<string, string>();
    const siblingIds: string[] = [];
    for (const sibling of siblings) {
      if (!sibling.package_id) continue;
      siblingIdToPackage.set(sibling.id, sibling.package_id);
      siblingIds.push(sibling.id);
    }

    if (siblingIds.length > 0) {
      const { data: siblingJobRows, error: siblingJobError } = await supabase
        .from("video_jobs")
        .select("id, content_item_id, output, created_at")
        .in("content_item_id", siblingIds)
        .order("created_at", { ascending: false });

      if (siblingJobError) throw siblingJobError;

      // Ordered desc, so the first job seen per package wins.
      for (const job of (siblingJobRows ?? []) as VideoLite[]) {
        const itemId = job.content_item_id;
        if (!itemId) continue;
        const packageId = siblingIdToPackage.get(itemId);
        if (!packageId || packageVideo.has(packageId)) continue;
        packageVideo.set(packageId, readVideoOutput(job.output));
      }
    }
  }

  return items.map((item) => {
    const isVariant = isVariantItem(item);
    let mp4Url: string | null = null;
    let thumbnailUrl: string | null = null;

    const directJob = directByItem.get(item.id);
    if (directJob) {
      const parsed = readVideoOutput(directJob.output);
      mp4Url = parsed.mp4Url;
      thumbnailUrl = parsed.thumbnailUrl;
    } else if (item.package_id && !isVariant) {
      // Sibling/package fallback is for PRIMARY items only. A variant must never
      // borrow the primary video: until its own job completes it shows no video.
      const viaPackage = packageVideo.get(item.package_id);
      if (viaPackage) {
        mp4Url = viaPackage.mp4Url;
        thumbnailUrl = viaPackage.thumbnailUrl;
      }
    }

    // project_id always resolves (ids derive from these items); fall back to the
    // raw language, then "cs", purely defensively.
    const projectLanguage =
      projectLanguageById.get(item.project_id) ?? item.language ?? "cs";
    const variantMeta = readVariantMeta(item.generation_metadata);

    return {
      id: item.id,
      projectId: item.project_id,
      packageId: item.package_id,
      platform: item.platform,
      format: item.format,
      status: item.status,
      title: item.title,
      caption: item.caption,
      hashtags: item.hashtags ?? [],
      cta: item.cta,
      language: item.language,
      effectiveLanguage: effectiveLanguage(item.language, projectLanguage),
      isLanguageVariant: isVariant,
      sourceLanguage: variantMeta.sourceLanguage,
      targetLanguage: variantMeta.targetLanguage,
      canGenerateVariants:
        !isVariant &&
        packageQualifiesForVariants(item.project_id, item.package_id),
      videoUrl: mp4Url,
      thumbnailUrl,
      createdAt: item.created_at,
    } satisfies ReviewQueueItem;
  });
}

// ---------------------------------------------------------------------------
// Mutations (admin client, server-only).
//
// RLS is bypassed, so every write is manually scoped by both id AND project_id
// to prevent touching a content item outside its project.
// ---------------------------------------------------------------------------

// Fields the review queue is allowed to edit. Nothing else on the row changes.
export interface EditableContentItemFields {
  caption: string | null;
  hashtags: string[];
  cta: string | null;
}

export async function setContentItemStatus(
  itemId: string,
  projectId: string,
  status: ApprovalStatus,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("content_items")
    .update({ status })
    .eq("id", itemId)
    .eq("project_id", projectId);

  if (error) throw error;
}

export async function updateContentItemFields(
  itemId: string,
  projectId: string,
  fields: EditableContentItemFields,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("content_items")
    .update({
      caption: fields.caption,
      hashtags: fields.hashtags,
      cta: fields.cta,
    })
    .eq("id", itemId)
    .eq("project_id", projectId);

  if (error) throw error;
}
