import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ContentItem,
  Json,
  LanguageCode,
  Project,
} from "@/lib/supabase/types";
import { loadProjectOrThrow, WorkflowError } from "@/lib/ai/workflows/shared";
import { runGenerateLanguageVariantsForItem } from "@/lib/ai/workflows/generateLanguageVariants";
import {
  isVideoPlatform,
  pendingVariantLanguages,
  resolveTargetLanguages,
} from "@/lib/ai/workflows/languageVariantsHelpers";
import { N8N_SECRET_HEADER } from "@/lib/n8n/callback";

// Asynchronous "Generate translations" — queue + processor.
//
// The package-level action used to run EVERY Claude localization call inline
// (platforms x languages) and timed out on Vercel after 300s. This module
// splits that into small, resumable units stored in translation_jobs: the
// action only ENQUEUES `pending` rows (fast DB writes, no AI) and returns; a
// background endpoint claims and PROCESSES one unit at a time, reusing the
// proven item-level workflow scoped to a single language. The real dedupe (no
// duplicate variant content_items / video_jobs) still lives in that workflow;
// this module never creates content rows itself.

// A processing/claimed translation_jobs row, with only the fields the processor
// needs.
interface ClaimedTranslationJob {
  id: string;
  projectId: string;
  packageId: string;
  sourceContentItemId: string;
  platform: string;
  language: LanguageCode;
}

// Video platforms are processed TikTok-first so the single package-wide-deduped
// variant video job per language attaches to the TikTok variant, matching the
// proven item-level production order. Used only to order enqueue insertion (the
// processor then claims oldest-first).
const VIDEO_PLATFORM_ORDER = ["tiktok", "instagram", "youtube", "facebook"];

function videoPlatformRank(platform: string): number {
  const index = VIDEO_PLATFORM_ORDER.indexOf(platform);
  return index === -1 ? VIDEO_PLATFORM_ORDER.length : index;
}

// A `processing` translation_jobs row whose updated_at has not advanced for
// longer than this is considered stuck (the function died / timed out) and may
// be re-claimed. Kept short — a single localization call is ~1-2 min.
const STALE_PROCESSING_MINUTES = (() => {
  const raw = Number(process.env.TRANSLATION_JOB_STALE_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 15;
})();

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | null, key: string): string {
  if (!record) return "";
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export interface EnqueuePackageTranslationsInput {
  projectId: string;
  packageId: string;
}

export interface EnqueuePackageTranslationsResult {
  packageId: string;
  targetLanguages: LanguageCode[];
  // (source item, language) units that should be pending after this enqueue.
  units: {
    sourceContentItemId: string;
    platform: string;
    language: LanguageCode;
  }[];
  warnings: string[];
}

// Resolves the APPROVED video-platform primary items for a package and marks one
// `pending` translation_jobs row per (item, still-missing target language).
// Pure validation + small DB writes only — NO Claude, so it returns in
// milliseconds. Idempotent: a unit that already has a variant content_item is
// skipped (real dedupe), a row that already exists is left untouched, and a
// previously `failed` row for this package is reset to `pending` so a re-click
// retries it.
export async function enqueuePackageTranslations(
  input: EnqueuePackageTranslationsInput,
  deps: { client?: SupabaseClient } = {},
): Promise<EnqueuePackageTranslationsResult> {
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

  const result: EnqueuePackageTranslationsResult = {
    packageId,
    targetLanguages: [],
    units: [],
    warnings: [],
  };

  // Gate 2: at least one target language.
  const targetLanguages = resolveTargetLanguages(
    project.language,
    project.enabled_languages ?? [],
  );
  result.targetLanguages = targetLanguages;
  if (targetLanguages.length === 0) {
    result.warnings.push("no additional enabled_languages configured (no-op)");
    return result;
  }

  // Gate 3: approved video-platform primary items (translations are video-only;
  // LinkedIn / X / Google Business are never localized).
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
  const videoPrimaryItems = primaryItems.filter((item) =>
    isVideoPlatform(item.platform),
  );
  if (videoPrimaryItems.length === 0) {
    throw new WorkflowError(
      "invalid_input",
      "this package has no video-platform primary items to translate (translations are video-only)",
    );
  }
  const approvedVideoItems = videoPrimaryItems.filter(
    (item) => item.status === "approved",
  );
  if (approvedVideoItems.length === 0) {
    throw new WorkflowError(
      "invalid_input",
      "no approved video-platform primary items; approve at least one before generating translations",
    );
  }

  // Existing variant content_items for the package — used to skip (source item,
  // language) pairs that are already localized (dedupe parity with the
  // item-level workflow).
  const { data: variantRows, error: variantErr } = await supabase
    .from("content_items")
    .select("language, generation_metadata")
    .eq("project_id", projectId)
    .eq("package_id", packageId)
    .not("language", "is", null);
  if (variantErr) throw variantErr;
  const coveredBySource = new Map<string, Set<LanguageCode>>();
  for (const row of (variantRows ?? []) as {
    language: LanguageCode | null;
    generation_metadata: Json | null;
  }[]) {
    if (!row.language) continue;
    const sourceId = readString(asRecord(row.generation_metadata), "source_content_item_id");
    if (!sourceId) continue;
    const set = coveredBySource.get(sourceId) ?? new Set<LanguageCode>();
    set.add(row.language);
    coveredBySource.set(sourceId, set);
  }

  // Build the pending units, TikTok-first so the per-language video job attaches
  // to the TikTok variant (the processor claims in insertion/created_at order).
  const ordered = [...approvedVideoItems].sort(
    (a, b) => videoPlatformRank(a.platform) - videoPlatformRank(b.platform),
  );
  for (const item of ordered) {
    const covered = coveredBySource.get(item.id) ?? new Set<LanguageCode>();
    const pending = pendingVariantLanguages(targetLanguages, covered);
    for (const language of pending) {
      result.units.push({
        sourceContentItemId: item.id,
        platform: item.platform,
        language,
      });
    }
  }

  // Retry: reset this package's previously failed units back to pending so a new
  // "Generate translations" click re-runs them (completed units keep their
  // variant content_items and are never touched).
  const { error: resetErr } = await supabase
    .from("translation_jobs")
    .update({ status: "pending", error_message: null })
    .eq("project_id", projectId)
    .eq("package_id", packageId)
    .eq("status", "failed");
  if (resetErr) throw resetErr;

  if (result.units.length === 0) {
    result.warnings.push(
      "all target languages already have a variant for this package (no new units)",
    );
    return result;
  }

  // Insert the new pending units. The unique (source_content_item_id, language)
  // index makes this idempotent: a unit that already has a row (pending /
  // processing / completed) is ignored, never duplicated.
  const rows = result.units.map((unit) => ({
    project_id: projectId,
    package_id: packageId,
    source_content_item_id: unit.sourceContentItemId,
    platform: unit.platform,
    language: unit.language,
    status: "pending" as const,
  }));
  const { error: upsertErr } = await supabase
    .from("translation_jobs")
    .upsert(rows, {
      onConflict: "source_content_item_id,language",
      ignoreDuplicates: true,
    });
  if (upsertErr) throw upsertErr;

  return result;
}

// Atomically claims the next translation unit to process: the oldest `pending`
// row, or — when none are pending — the oldest STALE `processing` row (recovery
// for a crashed/timed-out earlier attempt). Returns null when there is nothing
// to do. The atomic guarded UPDATE guarantees only one caller wins a row.
export async function claimNextTranslationJob(
  supabase: SupabaseClient,
): Promise<ClaimedTranslationJob | null> {
  const selectFields =
    "id, project_id, package_id, source_content_item_id, platform, language, attempts";

  // 1. Oldest pending row.
  const { data: pendingRow, error: pendingErr } = await supabase
    .from("translation_jobs")
    .select(selectFields)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (pendingErr) throw pendingErr;

  if (pendingRow) {
    const row = pendingRow as {
      id: string;
      project_id: string;
      package_id: string;
      source_content_item_id: string;
      platform: string;
      language: LanguageCode;
      attempts: number;
    };
    const { data: claimed, error: claimErr } = await supabase
      .from("translation_jobs")
      .update({ status: "processing", attempts: row.attempts + 1 })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id");
    if (claimErr) throw claimErr;
    if (claimed && claimed.length > 0) {
      return {
        id: row.id,
        projectId: row.project_id,
        packageId: row.package_id,
        sourceContentItemId: row.source_content_item_id,
        platform: row.platform,
        language: row.language,
      };
    }
    // Lost the race for this pending row; fall through to a stale sweep.
  }

  // 2. Oldest stale processing row (recovery).
  const staleBefore = new Date(
    Date.now() - STALE_PROCESSING_MINUTES * 60_000,
  ).toISOString();
  const { data: staleRow, error: staleErr } = await supabase
    .from("translation_jobs")
    .select(selectFields)
    .eq("status", "processing")
    .lt("updated_at", staleBefore)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (staleErr) throw staleErr;
  if (!staleRow) return null;

  const row = staleRow as {
    id: string;
    project_id: string;
    package_id: string;
    source_content_item_id: string;
    platform: string;
    language: LanguageCode;
    attempts: number;
  };
  // Re-claim only while still stale; the set_updated_at trigger bumps updated_at
  // on this UPDATE so a concurrent recovery no longer matches < staleBefore.
  const { data: reclaimed, error: reclaimErr } = await supabase
    .from("translation_jobs")
    .update({ status: "processing", attempts: row.attempts + 1 })
    .eq("id", row.id)
    .eq("status", "processing")
    .lt("updated_at", staleBefore)
    .select("id");
  if (reclaimErr) throw reclaimErr;
  if (!reclaimed || reclaimed.length === 0) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    packageId: row.package_id,
    sourceContentItemId: row.source_content_item_id,
    platform: row.platform,
    language: row.language,
  };
}

export interface ProcessTranslationJobResult {
  // True when a unit was claimed and processed (completed or failed) in this call.
  processed: boolean;
  // True when at least one `pending` unit still remains (so the chain continues).
  hasMore: boolean;
  jobId?: string;
  language?: LanguageCode;
  status?: "completed" | "failed";
}

// Claims and processes ONE translation unit, reusing the item-level workflow
// scoped to the unit's single language. The variant video job (if any) is still
// dispatched to the DO worker exactly as before; this only moves the Claude
// localization off the request's critical path. Marks the unit completed or —
// on failure — failed (a failed unit never blocks completed languages).
export async function processNextTranslationJob(deps: {
  videoCallbackUrl?: string;
  client?: SupabaseClient;
}): Promise<ProcessTranslationJobResult> {
  const supabase: SupabaseClient = deps.client ?? createSupabaseAdminClient();

  const job = await claimNextTranslationJob(supabase);
  if (!job) return { processed: false, hasMore: false };

  let status: "completed" | "failed" = "completed";
  try {
    await runGenerateLanguageVariantsForItem(
      {
        projectId: job.projectId,
        sourceContentItemId: job.sourceContentItemId,
        languages: [job.language],
      },
      { client: supabase, videoCallbackUrl: deps.videoCallbackUrl },
    );
    await supabase
      .from("translation_jobs")
      .update({ status: "completed", error_message: null })
      .eq("id", job.id);
  } catch (err) {
    status = "failed";
    const detail = err instanceof Error ? err.message : "unknown error";
    await supabase
      .from("translation_jobs")
      .update({ status: "failed", error_message: detail.slice(0, 500) })
      .eq("id", job.id);
    console.error(
      `[translation-jobs] unit ${job.id} (${job.platform} -> ${job.language}) failed: ${detail}`,
    );
  }

  const { count, error: countErr } = await supabase
    .from("translation_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (countErr) throw countErr;

  return {
    processed: true,
    hasMore: (count ?? 0) > 0,
    jobId: job.id,
    language: job.language,
    status,
  };
}

// Best-effort fire-and-forget kick to the background processor endpoint. The
// endpoint responds 202 immediately and does the work in `after()`, so this
// resolves fast and never blocks the caller. Errors are swallowed: a missed
// kick is recovered on the next "Generate translations" click (stale sweep).
export async function triggerTranslationProcessor(origin: string): Promise<void> {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret) {
    console.error(
      "[translation-jobs] cannot trigger processor: missing N8N_CALLBACK_SECRET",
    );
    return;
  }
  const url = `${origin}/api/ai/process-translation-jobs`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [N8N_SECRET_HEADER]: secret,
      },
      body: "{}",
      signal: controller.signal,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    console.error(`[translation-jobs] processor trigger failed: ${detail}`);
  } finally {
    clearTimeout(timeout);
  }
}
