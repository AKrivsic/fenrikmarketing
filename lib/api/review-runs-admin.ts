import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  jobHasWarning,
  newestByContentItem,
  readDebug,
  type RenderDebug,
} from "@/lib/api/content-shared";
import type {
  ContentItem,
  ContentPackage,
  Json,
  ProductionRun,
  ProductionRunStatus,
  Project,
  VideoJob,
} from "@/lib/supabase/types";
import { canonicalWebsiteUrl } from "@/lib/knowledge/websiteUrl";
import { parseProjectKnowledge } from "@/lib/knowledge/types";
import { normalizeFunnelStage } from "@/lib/ai/types";
import {
  diagnoseUrlAppend,
  type UrlAppendReason,
} from "@/lib/ai/websiteLinks";

// Subtitle Reliability V1 (Part D + E + F) — Run Review UX.
//
// The review experience is reorganised around PRODUCTION RUNS (one row per
// "Generate Content" click, migration 015). This module is a read-only data
// layer over EXISTING tables (production_runs + content_items tagged with
// generation_metadata.production_run_id + their video_jobs). It introduces no
// new tables, AI, workers or workflows. Service-role admin client, same
// single-tenant pattern as the rest of the review/admin reads.

// How many of the most-recent runs to surface in the review page.
const MAX_REVIEW_RUNS = 25;

// The render-diagnostics helpers now live in content-shared (single source of
// truth across the review surfaces). Re-exported here so existing importers
// (e.g. review-exceptions-admin) keep working unchanged.
export { jobHasWarning, readDebug, type RenderDebug };

// Traffic-light health used for the run + job status badges.
export type ReviewHealth = "green" | "yellow" | "red";

export interface ReviewRunCard {
  id: string;
  projectId: string;
  status: ProductionRunStatus;
  health: ReviewHealth;
  createdAt: string;
  // Terminal timestamp (updated_at once completed/failed), else null.
  completedAt: string | null;
  // Wall-clock seconds from created to completed (null while still running).
  durationSeconds: number | null;
  packageCount: number;
  generated: number;
  failed: number;
  warningsCount: number;
}

function runHealth(
  status: ProductionRunStatus,
  failed: number,
  warningsCount: number,
): ReviewHealth {
  if (status === "failed" || failed > 0) return "red";
  if (warningsCount > 0) return "yellow";
  return "green";
}

// Loads the video_jobs for a run's primary content_items (variants excluded),
// returning the newest job per content_item.
async function loadRunVideoJobs(
  supabase: SupabaseClient,
  run: Pick<ProductionRun, "id" | "project_id">,
): Promise<VideoJob[]> {
  const { data: itemRows, error: itemErr } = await supabase
    .from("content_items")
    .select("id")
    .eq("project_id", run.project_id)
    .eq("generation_metadata->>production_run_id", run.id)
    .is("language", null);
  if (itemErr) throw itemErr;
  const itemIds = (itemRows ?? []).map((r) => r.id as string);
  if (itemIds.length === 0) return [];

  const { data: jobRows, error: jobErr } = await supabase
    .from("video_jobs")
    .select("*")
    .eq("project_id", run.project_id)
    .in("content_item_id", itemIds)
    .order("created_at", { ascending: false });
  if (jobErr) throw jobErr;

  return Array.from(
    newestByContentItem((jobRows ?? []) as VideoJob[]).values(),
  );
}

// Shared builder: turns a production_run row into the review card view, counting
// render/subtitle warnings from its primary content_items' video jobs. Single
// source of truth for both the global and the project-scoped run lists.
async function buildRunCard(
  supabase: SupabaseClient,
  run: ProductionRun,
): Promise<ReviewRunCard> {
  const jobs = await loadRunVideoJobs(supabase, run);
  const warningsCount = jobs.reduce(
    (acc, job) => acc + (jobHasWarning(readDebug(job.output)) ? 1 : 0),
    0,
  );
  const terminal = run.status === "completed" || run.status === "failed";
  const completedAt = terminal ? run.updated_at : null;
  const durationSeconds =
    completedAt !== null
      ? Math.max(
          0,
          Math.round(
            (new Date(completedAt).getTime() -
              new Date(run.created_at).getTime()) /
              1000,
          ),
        )
      : null;

  return {
    id: run.id,
    projectId: run.project_id,
    status: run.status,
    health: runHealth(run.status, run.failed_total, warningsCount),
    createdAt: run.created_at,
    completedAt,
    durationSeconds,
    packageCount: run.package_count,
    generated: run.generated_total,
    failed: run.failed_total,
    warningsCount,
  };
}

async function buildRunCards(
  supabase: SupabaseClient,
  runs: ProductionRun[],
): Promise<ReviewRunCard[]> {
  return Promise.all(runs.map((run) => buildRunCard(supabase, run)));
}

// Global, read-only list of recent production runs (cross-project). Kept for the
// /review-queue overview; project QA uses listReviewRunsForProject instead.
export async function listReviewRuns(): Promise<ReviewRunCard[]> {
  const supabase = createSupabaseAdminClient();
  const { data: runRows, error } = await supabase
    .from("production_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_REVIEW_RUNS);
  if (error) throw error;
  return buildRunCards(supabase, (runRows ?? []) as ProductionRun[]);
}

export interface ListReviewRunsForProjectOptions {
  // Caps how many runs are fetched and enriched. Default MAX_REVIEW_RUNS.
  limit?: number;
}

// Project-scoped list of recent production runs. QA and approval happen in
// project context, so this powers the project review page. Scoped by project_id.
export async function listReviewRunsForProject(
  projectId: string,
  options: ListReviewRunsForProjectOptions = {},
): Promise<ReviewRunCard[]> {
  const limit = Math.min(
    Math.max(1, options.limit ?? MAX_REVIEW_RUNS),
    MAX_REVIEW_RUNS,
  );
  const supabase = createSupabaseAdminClient();
  const { data: runRows, error } = await supabase
    .from("production_runs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return buildRunCards(supabase, (runRows ?? []) as ProductionRun[]);
}

// ---------------------------------------------------------------------------
// Part F — full run export. One JSON file with everything QA needs.
// ---------------------------------------------------------------------------

export interface ReviewRunExport {
  exported_at: string;
  run: ProductionRun;
  packages: ContentPackage[];
  content_items: ContentItem[];
  video_jobs: VideoJob[];
  voiceovers: {
    content_item_id: string | null;
    video_job_id: string;
    text: string | null;
  }[];
  platform_outputs: Record<string, Json>;
  warnings: {
    video_job_id: string;
    content_item_id: string | null;
    debug: RenderDebug;
  }[];
  // Project Brain Improvements V1 (Part 4) — top-level website URL observability
  // for QA tooling. website_url_present is a boolean flag and website_url is the
  // canonical URL (or null). Mirrors project_url.canonical_website_url; surfaced
  // at the top level so consumers don't have to dig into project_url.
  website_url_present: boolean;
  website_url: string | null;
  // URL observability (Final Review UX Polish). project_url surfaces the
  // canonical website URL the post-process uses plus the raw knowledge value;
  // url_diagnostics explains, per package, whether a URL would be appended and
  // (when not) the first guard that blocked it. Read-only — no rule changes.
  project_url: {
    canonical_website_url: string | null;
    source_url: string | null;
  };
  url_diagnostics: {
    package_id: string;
    funnel_stage: string | null;
    cta_type: string | null;
    url_available: boolean;
    url_append_eligible_platforms: string[];
    reason: UrlAppendReason | null;
  }[];
}

// Reads the package CTA payload (text + type) persisted in package_brief.cta.
function readPackageCta(brief: Json | null): {
  text: string | null;
  type: string | null;
} {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) {
    return { text: null, type: null };
  }
  const cta = (brief as Record<string, unknown>).cta;
  if (!cta || typeof cta !== "object" || Array.isArray(cta)) {
    return { text: null, type: null };
  }
  const record = cta as Record<string, unknown>;
  return {
    text: typeof record.text === "string" ? record.text : null,
    type: typeof record.type === "string" ? record.type : null,
  };
}

// Platform-output keys for a package (the platforms it produced outputs for).
function readPlatformKeys(brief: Json | null): string[] {
  const outputs = readPlatformOutputs(brief);
  if (!outputs || typeof outputs !== "object" || Array.isArray(outputs)) {
    return [];
  }
  return Object.keys(outputs);
}

function readVoiceoverText(input: Json | null): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = (input as Record<string, unknown>).voiceover_text;
  return typeof value === "string" ? value : null;
}

function readPlatformOutputs(brief: Json | null): Json | null {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) return null;
  const value = (brief as Record<string, unknown>).platform_outputs;
  return (value as Json) ?? null;
}

// Assembles the export bundle for one run, or null when the run does not exist.
export async function getReviewRunExport(
  runId: string,
): Promise<ReviewRunExport | null> {
  const supabase = createSupabaseAdminClient();

  const { data: runRow, error: runErr } = await supabase
    .from("production_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (runErr) throw runErr;
  if (!runRow) return null;
  const run = runRow as ProductionRun;

  // Every content_item tagged with this run (primary + variants), in order.
  const { data: itemRows, error: itemErr } = await supabase
    .from("content_items")
    .select("*")
    .eq("project_id", run.project_id)
    .eq("generation_metadata->>production_run_id", run.id)
    .order("created_at", { ascending: true });
  if (itemErr) throw itemErr;
  const contentItems = (itemRows ?? []) as ContentItem[];

  const packageIds = Array.from(
    new Set(
      contentItems
        .map((item) => item.package_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  let packages: ContentPackage[] = [];
  if (packageIds.length > 0) {
    const { data: pkgRows, error: pkgErr } = await supabase
      .from("content_packages")
      .select("*")
      .eq("project_id", run.project_id)
      .in("id", packageIds);
    if (pkgErr) throw pkgErr;
    packages = (pkgRows ?? []) as ContentPackage[];
  }

  const itemIds = contentItems.map((item) => item.id);
  let videoJobs: VideoJob[] = [];
  if (itemIds.length > 0) {
    const { data: jobRows, error: jobErr } = await supabase
      .from("video_jobs")
      .select("*")
      .eq("project_id", run.project_id)
      .in("content_item_id", itemIds)
      .order("created_at", { ascending: true });
    if (jobErr) throw jobErr;
    videoJobs = (jobRows ?? []) as VideoJob[];
  }

  const voiceovers = videoJobs.map((job) => ({
    content_item_id: job.content_item_id,
    video_job_id: job.id,
    text: readVoiceoverText(job.input),
  }));

  const platformOutputs: Record<string, Json> = {};
  for (const pkg of packages) {
    const outputs = readPlatformOutputs(pkg.package_brief);
    if (outputs !== null) platformOutputs[pkg.id] = outputs;
  }

  const warnings = videoJobs
    .map((job) => ({ job, debug: readDebug(job.output) }))
    .filter((entry) => jobHasWarning(entry.debug))
    .map((entry) => ({
      video_job_id: entry.job.id,
      content_item_id: entry.job.content_item_id,
      debug: entry.debug as RenderDebug,
    }));

  // URL observability — load the project once for the canonical/raw URL and the
  // per-package append diagnostics. Best-effort: a missing project just yields
  // null URLs and "no_source_url" diagnostics (it never blocks the export).
  const { data: projectRow, error: projectErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", run.project_id)
    .maybeSingle();
  if (projectErr) throw projectErr;
  const project = (projectRow ?? null) as Project | null;

  const websiteUrl = project ? canonicalWebsiteUrl(project) : null;
  const rawSourceUrl = project
    ? (parseProjectKnowledge(project.knowledge)?.source_url ?? null)
    : null;

  const urlDiagnostics = packages.map((pkg) => {
    const { text: ctaText, type: ctaType } = readPackageCta(pkg.package_brief);
    const platforms = readPlatformKeys(pkg.package_brief);
    const funnelStage = normalizeFunnelStage(pkg.funnel_stage);
    const diagnostic = funnelStage
      ? diagnoseUrlAppend({
          platforms,
          funnelStage,
          ctaType,
          websiteUrl,
          ctaText,
        })
      : {
          url_available: Boolean(websiteUrl),
          url_append_eligible_platforms: [],
          reason: (websiteUrl
            ? "funnel_stage_not_eligible"
            : "no_source_url") as UrlAppendReason,
        };
    return {
      package_id: pkg.id,
      funnel_stage: funnelStage,
      cta_type: ctaType,
      ...diagnostic,
    };
  });

  return {
    exported_at: new Date().toISOString(),
    run,
    packages,
    content_items: contentItems,
    video_jobs: videoJobs,
    voiceovers,
    platform_outputs: platformOutputs,
    warnings,
    website_url_present: websiteUrl !== null,
    website_url: websiteUrl,
    project_url: {
      canonical_website_url: websiteUrl,
      source_url: rawSourceUrl,
    },
    url_diagnostics: urlDiagnostics,
  };
}
