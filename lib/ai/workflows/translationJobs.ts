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
  pendingVariantLanguages,
  resolveTargetLanguages,
} from "@/lib/ai/workflows/languageVariantsHelpers";
import {
  isVideoContentPlatform,
  parseContentControls,
} from "@/lib/projects/contentControls";
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

// A single processor invocation drains units back-to-back (in claim order) until
// either the queue is empty or this wall-clock budget is reached, then hands any
// remainder to a fresh invocation. The budget stays well under the route's
// maxDuration (300s) so the final unit + the self-retrigger always finish before
// the platform kills the function. One localization unit is ~10-15s, so a typical
// package (≤16 units) drains in a single invocation with zero retriggers.
// 200s leaves ~100s of the 300s maxDuration as headroom for an occasionally slow
// final unit (the budget is only checked between units) plus the retried
// self-retrigger, so the chain never hands off too late to survive.
const DRAIN_BUDGET_MS = (() => {
  const raw = Number(process.env.TRANSLATION_DRAIN_BUDGET_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 200_000;
})();

// Hard safety cap on units per invocation (defence against a pathological loop);
// the time budget is the normal stopping condition.
const DRAIN_MAX_UNITS = (() => {
  const raw = Number(process.env.TRANSLATION_DRAIN_MAX_UNITS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 100;
})();

// The self-retrigger fetch is the ONE link that, if dropped, used to strand every
// remaining pending unit (errors are swallowed and nothing else re-kicks the
// processor). Retry it a few times so a transient blip / cold start does not
// silently halt the queue.
const TRIGGER_MAX_ATTEMPTS = 3;
const TRIGGER_TIMEOUT_MS = 10_000;
const TRIGGER_RETRY_DELAY_MS = 500;

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
  const platformContentTypes = parseContentControls(
    project.publishing_rules,
  ).platformContentTypes;

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
    isVideoContentPlatform(item.platform, platformContentTypes),
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
    console.log(
      `[translation-jobs] ${JSON.stringify({
        event: "enqueue",
        package_id: packageId,
        jobs_created: 0,
        target_languages: targetLanguages,
      })}`,
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

  // Diagnostic: how many units this click was responsible for. `jobs_created` is
  // the requested unit count; rows already present (pending/processing/completed)
  // are silently ignored by the idempotent upsert, so the queue may actually grow
  // by fewer than this.
  console.log(
    `[translation-jobs] ${JSON.stringify({
      event: "enqueue",
      package_id: packageId,
      jobs_created: rows.length,
      target_languages: targetLanguages,
    })}`,
  );

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

// Number of `pending` units left in the WHOLE queue (across packages). Used to
// decide whether the chain must continue and reported as the `jobs_remaining`
// diagnostic.
async function countPendingTranslationJobs(
  supabase: SupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("translation_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
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

  const pending = await countPendingTranslationJobs(supabase);

  return {
    processed: true,
    hasMore: pending > 0,
    jobId: job.id,
    language: job.language,
    status,
  };
}

export interface DrainTranslationJobsResult {
  // Units claimed and processed (completed or failed) by THIS invocation.
  claimed: number;
  completed: number;
  failed: number;
  // `pending` units still queued after this invocation stopped (0 == queue empty).
  remaining: number;
}

// Drains the translation queue within a SINGLE invocation: claims and processes
// units one at a time, in claim order (TikTok-first per language, so the single
// per-language variant video job is created before that language's other
// platforms run — preserving the no-duplicate-video-job invariant), until the
// queue is empty or the wall-clock budget / unit cap is hit. Whatever remains is
// reported so the caller can hand it to a fresh invocation.
//
// This replaces the previous "exactly one unit per HTTP hop" design, where every
// unit depended on its own best-effort self-trigger fetch: a single dropped hop
// silently stranded all remaining pending units (the stale sweep only recovers
// `processing` rows, never untouched `pending` ones). Draining in-process removes
// almost all of those fragile hops — a typical package now finishes in one.
export async function drainTranslationJobs(deps: {
  videoCallbackUrl?: string;
  client?: SupabaseClient;
  budgetMs?: number;
  maxUnits?: number;
}): Promise<DrainTranslationJobsResult> {
  const supabase: SupabaseClient = deps.client ?? createSupabaseAdminClient();
  const budgetMs = deps.budgetMs ?? DRAIN_BUDGET_MS;
  const maxUnits = deps.maxUnits ?? DRAIN_MAX_UNITS;
  const start = Date.now();

  let claimed = 0;
  let completed = 0;
  let failed = 0;

  while (claimed < maxUnits && Date.now() - start < budgetMs) {
    const result = await processNextTranslationJob({
      videoCallbackUrl: deps.videoCallbackUrl,
      client: supabase,
    });
    if (!result.processed) {
      // Nothing claimable right now: queue empty, or only fresh `processing`
      // rows owned by a concurrent worker. Either way this invocation is done.
      break;
    }
    claimed++;
    if (result.status === "failed") failed++;
    else completed++;
    if (!result.hasMore) break;
  }

  const remaining = await countPendingTranslationJobs(supabase);
  return { claimed, completed, failed, remaining };
}

// Kicks the background processor endpoint. The endpoint responds 202 immediately
// and does the work in `after()`, so this resolves fast and never blocks the
// caller. Retried up to TRIGGER_MAX_ATTEMPTS times because this fetch is the only
// link that advances the queue across invocations: a single swallowed failure
// used to halt the entire remaining queue until a manual re-click. Returns true
// once the endpoint has accepted the kick.
export async function triggerTranslationProcessor(
  origin: string,
): Promise<boolean> {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret) {
    console.error(
      "[translation-jobs] cannot trigger processor: missing N8N_CALLBACK_SECRET",
    );
    return false;
  }
  const url = `${origin}/api/ai/process-translation-jobs`;

  for (let attempt = 1; attempt <= TRIGGER_MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TRIGGER_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [N8N_SECRET_HEADER]: secret,
        },
        body: "{}",
        signal: controller.signal,
      });
      if (res.ok || res.status === 202) return true;
      console.error(
        `[translation-jobs] processor trigger attempt ${attempt}/${TRIGGER_MAX_ATTEMPTS} -> HTTP ${res.status}`,
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      console.error(
        `[translation-jobs] processor trigger attempt ${attempt}/${TRIGGER_MAX_ATTEMPTS} failed: ${detail}`,
      );
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < TRIGGER_MAX_ATTEMPTS) {
      await new Promise((resolve) =>
        setTimeout(resolve, TRIGGER_RETRY_DELAY_MS * attempt),
      );
    }
  }
  return false;
}
