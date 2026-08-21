/**
 * Phase 5/6 — Continue Generation orchestration.
 *
 * Leaves waiting_for_creative_review and reconnects Manual Review packages to
 * the EXISTING video pipeline:
 *   Creative Rebuild (Phase 6) → buildVideoJobInput → video_jobs → claim/dispatch.
 *
 * Does NOT teach the worker about Manual Review.
 * Does NOT modify TTS / storyboard / image providers.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { Json, ProductionRunStatus } from "@/lib/supabase/types";
import {
  clearContinuedAfterCreativeReview,
  hasContinuedAfterCreativeReview,
  markContinuedAfterCreativeReview,
  parseGenerationMode,
  shouldDeferVideoUntilCreativeReview,
  type GenerationMode,
} from "@/lib/ai/generationMode";
import { buildVideoJobInput } from "@/lib/ai/workflows/packageShared";
import { claimAndDispatchVariantVideoJob } from "@/lib/ai/workflows/dispatchVariantVideoJob";
import { planRequiresVideo } from "@/lib/api/packageReconcileStatus";
import { runtimeLog } from "@/lib/production-runtime/runtimeLog";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import {
  appendCreativeReviewHistory,
  validateCreativeReviewApproval,
} from "@/lib/creative-review/lifecycle";
import { rebuildCreativePackageForVideo } from "@/lib/creative-review/rebuildCreativePackage";
import {
  PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO,
  packageVideoModeFromRunConfig,
  parsePackageVideoProductionMode,
  parsePackageVideoProductionModeFromJobInput,
  readPackageVideoModeFromBrief,
  type PackageVideoProductionMode,
} from "@/lib/content-package/packageVideoProductionMode";
import { serializeVideoCreativeIntegrity, syncVideoCreativeIntegrityFromSources } from "@/lib/content-package/videoCreativeIntegrity";
import {
  canContinueCreativeReviewRun,
  clearCreativeReviewReasonOnContinue,
} from "@/lib/content-package/creativeReviewDeferral";
import {
  deriveHookFromVoiceover,
  readTextToVideoCreativePlan,
  voiceDirectionFromBriefOrDefault,
} from "@/lib/content-package/textToVideoCreativePlan";
import { evaluateVideoPaidPreflight } from "@/lib/content-package/videoPaidPreflight";
import { readCreativeReviewFromBrief } from "@/lib/creative-review/read";
import { assertCreativeReview } from "@/lib/creative-review/validate";
import type {
  CreativeReview,
  CreativeReviewActor,
} from "@/lib/creative-review/types";
import {
  assertTextToVideoPlanLockedForContinue,
  snapshotTextToVideoPlanForContinueGuard,
  textToVideoPlanSnapshotEquals,
  T2V_PLAN_NOT_LOCKED_FOR_CONTINUE,
} from "@/lib/content-package/textToVideoManualReview";
import type { VideoWorkerJobPayload } from "@/lib/video-worker/client";
import { assertT2vVoiceSelectionReadyForApprove } from "@/lib/text-to-video/textToVideoAuthoritativeVoice";
import {
  assertTextToVideoCreativeSnapshotReady,
  assertTextToVideoRunwayRequestsReady,
} from "@/lib/text-to-video/assertTextToVideoPackageReadyForPaidProviders";

const VIDEO_PLATFORMS = new Set([
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
]);

export type ContinueGenerationCode =
  | "ok"
  | "already_running"
  | "already_continued"
  | "not_found"
  | "forbidden_mode"
  | "invalid_status"
  | "cancelled"
  | "validation_failed"
  | "invalid_input"
  | "job_creation_failed"
  | "dispatch_failed";

export interface ContinueGenerationPackageResult {
  packageId: string;
  packageIndex: number;
  videoJobId: string | null;
  jobCreated: boolean;
  dispatched: boolean;
  warning?: string;
}

export type ContinueGenerationResult =
  | {
      ok: true;
      code: "ok" | "already_continued";
      runId: string;
      status: ProductionRunStatus;
      packages: ContinueGenerationPackageResult[];
      warnings: string[];
    }
  | {
      ok: false;
      code: Exclude<
        ContinueGenerationCode,
        "ok" | "already_continued"
      >;
      error: string;
      issues?: ValidationIssue[];
      packages?: ContinueGenerationPackageResult[];
      warnings?: string[];
    };

export interface ContinueCreativeReviewGenerationDeps {
  supabase?: SupabaseClient;
  videoCallbackUrl?: string;
  startVideoJob?: (payload: VideoWorkerJobPayload) => Promise<void>;
  /** Injectable clock for tests. */
  now?: () => Date;
}

interface RunRow {
  id: string;
  project_id: string;
  status: ProductionRunStatus;
  requested_config: unknown;
  package_count: number | null;
  generated_total: number | null;
  failed_total: number | null;
}

interface PackageRow {
  packageId: string;
  packageIndex: number;
  title: string;
  packageBrief: unknown;
  contentItemIds: string[];
  videoItemId: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function packageVideoModeFromRequestedConfig(raw: unknown): PackageVideoProductionMode {
  const stored = asRecord(raw);
  const config = asRecord(stored?.config);
  return packageVideoModeFromRunConfig(config ?? undefined);
}

function generationModeFromRequestedConfig(raw: unknown): GenerationMode {
  const stored = asRecord(raw);
  const config = asRecord(stored?.config);
  return parseGenerationMode(
    config?.generation_mode ?? config?.generationMode,
  );
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "23505";
}

function fail(
  code: Exclude<ContinueGenerationCode, "ok" | "already_continued">,
  error: string,
  extra?: {
    issues?: ValidationIssue[];
    packages?: ContinueGenerationPackageResult[];
    warnings?: string[];
  },
): ContinueGenerationResult {
  return {
    ok: false,
    code,
    error,
    issues: extra?.issues,
    packages: extra?.packages,
    warnings: extra?.warnings,
  };
}

/**
 * Validate every package is approved + translation-confirmed + schema-valid.
 * Pure — no side effects.
 */
export function validatePackagesReadyForContinue(
  packages: ReadonlyArray<{
    packageId: string;
    packageIndex: number;
    brief: unknown;
  }>,
):
  | { ok: true; reviews: Map<string, CreativeReview> }
  | { ok: false; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const reviews = new Map<string, CreativeReview>();

  if (packages.length === 0) {
    issues.push({
      path: "$.packages",
      message: "run has no packages to continue",
    });
    return { ok: false, issues };
  }

  for (const pkg of packages) {
    const prefix = `$.packages[${pkg.packageIndex}]`;
    const read = readCreativeReviewFromBrief(pkg.brief);
    if (read.ok && read.value === null) {
      issues.push({
        path: `${prefix}.creative_review`,
        message: "creative_review is missing",
      });
      continue;
    }
    if (!read.ok) {
      for (const issue of read.issues) {
        issues.push({
          path: `${prefix}.creative_review${issue.path === "$" ? "" : issue.path.slice(1)}`,
          message: issue.message,
        });
      }
      continue;
    }
    const review = read.value as CreativeReview;
    if (!review.approved || review.status !== "approved") {
      issues.push({
        path: `${prefix}.creative_review.approved`,
        message: "package must be approved before Continue Generation",
      });
    }
    if (!review.voiceover.english_confirmed) {
      issues.push({
        path: `${prefix}.creative_review.voiceover.english_confirmed`,
        message: "english translation must be confirmed before Continue Generation",
      });
    }
    const briefRecord =
      pkg.brief && typeof pkg.brief === "object" && !Array.isArray(pkg.brief)
        ? (pkg.brief as Record<string, unknown>)
        : null;
    const videoMode = briefRecord
      ? parsePackageVideoProductionMode(briefRecord.package_video_mode)
      : "still";
    const gate = validateCreativeReviewApproval(review, {
      requireSceneIntent: videoMode !== PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO,
    });
    if (!gate.ok) {
      for (const issue of gate.issues) {
        issues.push({
          path: `${prefix}.creative_review${issue.path === "$" ? "" : issue.path.slice(1)}`,
          message: issue.message,
        });
      }
    }
    if (videoMode === PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO && briefRecord) {
      try {
        assertTextToVideoPlanLockedForContinue({
          brief: briefRecord,
          review,
        });
        assertT2vVoiceSelectionReadyForApprove({ brief: briefRecord });
        assertTextToVideoCreativeSnapshotReady({
          brief: briefRecord,
          review,
        });
        assertTextToVideoRunwayRequestsReady({ brief: briefRecord });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        issues.push({
          path: `${prefix}.video_text_to_video_creative_plan`,
          message,
        });
      }
    }
    reviews.set(pkg.packageId, review);
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, reviews };
}

async function loadRunPackages(
  supabase: SupabaseClient,
  projectId: string,
  runId: string,
): Promise<PackageRow[]> {
  const { data: items, error: itemErr } = await supabase
    .from("production_run_items")
    .select("package_index, content_package_id, status")
    .eq("production_run_id", runId)
    .eq("project_id", projectId)
    .order("package_index", { ascending: true });
  if (itemErr) throw itemErr;

  const packageIds = (items ?? [])
    .map((row) => row.content_package_id as string | null)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (packageIds.length === 0) return [];

  const { data: packages, error: pkgErr } = await supabase
    .from("content_packages")
    .select("id, title, package_brief")
    .eq("project_id", projectId)
    .in("id", packageIds);
  if (pkgErr) throw pkgErr;

  const packageById = new Map(
    (packages ?? []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        title: row.title as string,
        package_brief: row.package_brief,
      },
    ]),
  );

  const { data: contentItems, error: ciErr } = await supabase
    .from("content_items")
    .select("id, package_id, platform")
    .eq("project_id", projectId)
    .in("package_id", packageIds)
    .is("language", null);
  if (ciErr) throw ciErr;

  const itemsByPackage = new Map<
    string,
    Array<{ id: string; platform: string }>
  >();
  for (const row of contentItems ?? []) {
    const packageId = row.package_id as string | null;
    if (!packageId) continue;
    const list = itemsByPackage.get(packageId) ?? [];
    list.push({ id: row.id as string, platform: row.platform as string });
    itemsByPackage.set(packageId, list);
  }

  const rows: PackageRow[] = [];
  for (const item of items ?? []) {
    const packageId = item.content_package_id as string | null;
    if (!packageId) continue;
    const pkg = packageById.get(packageId);
    if (!pkg) continue;
    const cis = itemsByPackage.get(packageId) ?? [];
    const videoItemId =
      cis.find((ci) => VIDEO_PLATFORMS.has(ci.platform))?.id ??
      cis[0]?.id ??
      null;
    rows.push({
      packageId,
      packageIndex: item.package_index as number,
      title: pkg.title,
      packageBrief: pkg.package_brief,
      contentItemIds: cis.map((ci) => ci.id),
      videoItemId,
    });
  }
  return rows;
}

async function findExistingPackageVideoJob(
  supabase: SupabaseClient,
  projectId: string,
  packageId: string,
  contentItemIds: string[],
): Promise<{ id: string; input: unknown; status: string } | null> {
  // Prefer package_id primary render (active or any latest).
  const { data: byPackage, error: pkgErr } = await supabase
    .from("video_jobs")
    .select("id, input, status, created_at")
    .eq("project_id", projectId)
    .eq("package_id", packageId)
    .eq("render_kind", "package")
    .is("render_language", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (pkgErr) throw pkgErr;
  if (byPackage && byPackage.length > 0) {
    const row = byPackage[0]!;
    return {
      id: row.id as string,
      input: row.input,
      status: row.status as string,
    };
  }

  if (contentItemIds.length === 0) return null;
  const { data: byItems, error: itemErr } = await supabase
    .from("video_jobs")
    .select("id, input, status, created_at")
    .eq("project_id", projectId)
    .in("content_item_id", contentItemIds)
    .order("created_at", { ascending: false })
    .limit(1);
  if (itemErr) throw itemErr;
  if (!byItems || byItems.length === 0) return null;
  const row = byItems[0]!;
  return {
    id: row.id as string,
    input: row.input,
    status: row.status as string,
  };
}

async function rebuildAndPersistPackage(args: {
  supabase: SupabaseClient;
  projectId: string;
  runId: string;
  runPackageVideoMode: PackageVideoProductionMode;
  pkg: PackageRow;
  review: CreativeReview;
  actor: CreativeReviewActor;
  timestamp: string;
}): Promise<CreativeReview> {
  const sourceBrief = asRecord(args.pkg.packageBrief);
  if (!sourceBrief) {
    throw new Error(`package ${args.pkg.packageId} missing package_brief`);
  }

  if (args.runPackageVideoMode === PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO) {
    const locked = assertTextToVideoPlanLockedForContinue({
      brief: sourceBrief,
      review: args.review,
    });
    assertT2vVoiceSelectionReadyForApprove({ brief: sourceBrief });
    const before = snapshotTextToVideoPlanForContinueGuard(locked.plan);
    const nextBrief = clearCreativeReviewReasonOnContinue({
      ...sourceBrief,
      creative_review: args.review,
      package_video_mode: readPackageVideoModeFromBrief(sourceBrief),
    });
    const afterPlan = readTextToVideoCreativePlan(nextBrief);
    if (
      !afterPlan ||
      !textToVideoPlanSnapshotEquals(
        before,
        snapshotTextToVideoPlanForContinueGuard(afterPlan),
      )
    ) {
      throw new Error(T2V_PLAN_NOT_LOCKED_FOR_CONTINUE);
    }

    const { error } = await args.supabase
      .from("content_packages")
      .update({ package_brief: nextBrief as unknown as Json })
      .eq("id", args.pkg.packageId)
      .eq("project_id", args.projectId);
    if (error) throw error;

    const spoken = locked.productionVoiceover;
    if (spoken) {
      const { error: itemErr } = await args.supabase
        .from("content_items")
        .update({ body: spoken })
        .eq("package_id", args.pkg.packageId)
        .eq("project_id", args.projectId)
        .is("language", null);
      if (itemErr) throw itemErr;
    }

    args.pkg.packageBrief = nextBrief;
    return args.review;
  }

  const brief = args.pkg.packageBrief as ContentPackageOutput;
  const rebuilt = rebuildCreativePackageForVideo({
    package: brief,
    creativeReview: args.review,
    actor: args.actor,
    timestamp: args.timestamp,
    packageId: args.pkg.packageId,
    projectId: args.projectId,
    productionRunId: args.runId,
  });
  if (!rebuilt.ok) {
    const detail = rebuilt.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ");
    throw new Error(`creative rebuild failed: ${detail}`);
  }

  let nextBrief: Record<string, unknown> = clearCreativeReviewReasonOnContinue({
    ...(asRecord(rebuilt.value.package) ?? {}),
    creative_review: rebuilt.value.creativeReview,
    package_video_mode: readPackageVideoModeFromBrief(sourceBrief),
  });

  const vo = rebuilt.value.package.voiceover_text ?? "";
  const hook = rebuilt.value.package.hook?.trim() || deriveHookFromVoiceover(vo);
  nextBrief = {
    ...nextBrief,
    video_creative_integrity: serializeVideoCreativeIntegrity(
      syncVideoCreativeIntegrityFromSources({
        voiceoverText: vo,
        hookText: hook,
        voiceDirection: voiceDirectionFromBriefOrDefault(nextBrief),
        plan: null,
        packageVideoMode: "still",
      }),
    ),
  };

  const { error } = await args.supabase
    .from("content_packages")
    .update({ package_brief: nextBrief as unknown as Json })
    .eq("id", args.pkg.packageId)
    .eq("project_id", args.projectId);
  if (error) throw error;

  const spoken = rebuilt.value.package.voiceover_text?.trim() ?? "";
  if (spoken) {
    const { error: itemErr } = await args.supabase
      .from("content_items")
      .update({ body: spoken })
      .eq("package_id", args.pkg.packageId)
      .eq("project_id", args.projectId)
      .is("language", null);
    if (itemErr) throw itemErr;
  }

  args.pkg.packageBrief = nextBrief;
  return rebuilt.value.creativeReview;
}

async function ensureVideoJobForPackage(args: {
  supabase: SupabaseClient;
  projectId: string;
  runId: string;
  runPackageVideoMode: PackageVideoProductionMode;
  generationMode: GenerationMode;
  pkg: PackageRow;
}): Promise<{
  jobId: string;
  created: boolean;
  input: Record<string, unknown>;
}> {
  const existing = await findExistingPackageVideoJob(
    args.supabase,
    args.projectId,
    args.pkg.packageId,
    args.pkg.contentItemIds,
  );
  if (existing) {
    const parsed = parsePackageVideoProductionModeFromJobInput(
      (asRecord(existing.input) ?? {}) as Record<string, unknown>,
    );
    if (
      parsed.ok &&
      parsed.mode !== args.runPackageVideoMode
    ) {
      throw new Error("run_video_mode_mismatch");
    }
    return {
      jobId: existing.id,
      created: false,
      input: (asRecord(existing.input) ?? {}) as Record<string, unknown>,
    };
  }

  if (!args.pkg.videoItemId) {
    throw new Error(
      `package ${args.pkg.packageId} has no content item to attach a video job`,
    );
  }

  const preflightBrief = asRecord(args.pkg.packageBrief) ?? {};
  const reviewRead = readCreativeReviewFromBrief(preflightBrief);
  const creativeReview =
    reviewRead.ok && reviewRead.value ? reviewRead.value : null;

  const preflight = evaluateVideoPaidPreflight({
    packageVideoMode: args.runPackageVideoMode,
    runPackageVideoMode: args.runPackageVideoMode,
    generationMode: args.generationMode,
    creativeReview,
    brief: preflightBrief,
    enforceFuturePaidGates: false,
  });
  if (!preflight.ok) {
    throw new Error(
      `video_paid_preflight_blocked:${preflight.blockers.join(",")}`,
    );
  }

  const brief = args.pkg.packageBrief as ContentPackageOutput;
  if (!brief || typeof brief !== "object") {
    throw new Error(`package ${args.pkg.packageId} missing package_brief`);
  }

  // Clone brief so TTS stamps from buildVideoJobInput do not mutate shared refs.
  const pkgForInput = {
    ...brief,
    presentation_generation:
      brief.presentation_generation &&
      typeof brief.presentation_generation === "object"
        ? { ...(brief.presentation_generation as Record<string, unknown>) }
        : brief.presentation_generation,
  } as ContentPackageOutput;

  const videoInput = await buildVideoJobInput(
    args.supabase,
    args.projectId,
    pkgForInput,
    {
      package_id: args.pkg.packageId,
      production_run_id: args.runId,
      package_video_mode: args.runPackageVideoMode,
    },
  );

  const { data: inserted, error: insertErr } = await args.supabase
    .from("video_jobs")
    .insert({
      project_id: args.projectId,
      content_item_id: args.pkg.videoItemId,
      package_id: args.pkg.packageId,
      render_kind: "package",
      provider: "video_engine",
      status: "queued",
      input: videoInput,
    })
    .select("id, input")
    .single();

  if (insertErr) {
    if (isUniqueViolation(insertErr)) {
      const again = await findExistingPackageVideoJob(
        args.supabase,
        args.projectId,
        args.pkg.packageId,
        args.pkg.contentItemIds,
      );
      if (again) {
        return {
          jobId: again.id,
          created: false,
          input: (asRecord(again.input) ?? {}) as Record<string, unknown>,
        };
      }
    }
    throw insertErr;
  }

  // Persist TTS stamps onto brief without dropping creative_review.
  const briefRecord = asRecord(args.pkg.packageBrief) ?? {};
  const nextBrief = {
    ...briefRecord,
    presentation_generation: pkgForInput.presentation_generation ?? null,
  };
  const { error: briefErr } = await args.supabase
    .from("content_packages")
    .update({ package_brief: nextBrief as unknown as Json })
    .eq("id", args.pkg.packageId)
    .eq("project_id", args.projectId);
  if (briefErr) throw briefErr;

  // Refresh local brief for subsequent history write.
  args.pkg.packageBrief = nextBrief;

  return {
    jobId: inserted.id as string,
    created: true,
    input: (asRecord(inserted.input) ??
      (asRecord(videoInput) ?? {})) as Record<string, unknown>,
  };
}

async function appendContinueHistory(args: {
  supabase: SupabaseClient;
  projectId: string;
  pkg: PackageRow;
  review: CreativeReview;
  actor: CreativeReviewActor;
  timestamp: string;
}): Promise<void> {
  // Skip duplicate continue events on idempotent re-entry.
  const last = args.review.history[args.review.history.length - 1];
  if (last?.event === "continue_generation_started") {
    return;
  }

  const next = appendCreativeReviewHistory({
    review: args.review,
    event: "continue_generation_started",
    actor: args.actor,
    timestamp: args.timestamp,
  });
  assertCreativeReview(next);

  const briefRecord = asRecord(args.pkg.packageBrief) ?? {};
  const nextBrief = {
    ...briefRecord,
    creative_review: next,
  };
  const { error } = await args.supabase
    .from("content_packages")
    .update({ package_brief: nextBrief as unknown as Json })
    .eq("id", args.pkg.packageId)
    .eq("project_id", args.projectId);
  if (error) throw error;
  args.pkg.packageBrief = nextBrief;
}

async function deleteVideoJobs(
  supabase: SupabaseClient,
  projectId: string,
  jobIds: string[],
): Promise<void> {
  if (jobIds.length === 0) return;
  const { error } = await supabase
    .from("video_jobs")
    .delete()
    .eq("project_id", projectId)
    .in("id", jobIds);
  if (error) throw error;
}

/**
 * Continue Generation — validate → claim run → create jobs → dispatch.
 */
export async function continueCreativeReviewGeneration(args: {
  projectId: string;
  runId: string;
  actor: CreativeReviewActor;
  deps?: ContinueCreativeReviewGenerationDeps;
}): Promise<ContinueGenerationResult> {
  const { projectId, runId, actor } = args;
  const deps = args.deps ?? {};
  const supabase = deps.supabase ?? createSupabaseAdminClient();
  const now = deps.now ?? (() => new Date());
  const timestamp = now().toISOString();
  const warnings: string[] = [];

  if (!projectId || !runId) {
    return fail("invalid_input", "Missing project or run id.");
  }

  runtimeLog("info", {
    event: "continue_generation_requested",
    project_id: projectId,
    production_run_id: runId,
    detail: actor.id,
  });

  const { data: run, error: runErr } = await supabase
    .from("production_runs")
    .select(
      "id, project_id, status, requested_config, package_count, generated_total, failed_total",
    )
    .eq("id", runId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (runErr) throw runErr;
  if (!run) {
    return fail("not_found", "Production run not found.");
  }

  const runRow = run as RunRow;
  const generationMode = generationModeFromRequestedConfig(
    runRow.requested_config,
  );
  const runPackageVideoMode = packageVideoModeFromRequestedConfig(
    runRow.requested_config,
  );

  if (runRow.status === "cancelled") {
    return fail("cancelled", "Production run was cancelled.");
  }

  if (runRow.status === "completed" || runRow.status === "failed") {
    return fail(
      "invalid_status",
      `Production run is ${runRow.status} — Continue Generation is not available.`,
    );
  }

  const packages = await loadRunPackages(supabase, projectId, runId);

  if (
    !canContinueCreativeReviewRun({
      generationMode,
      runStatus: runRow.status as ProductionRunStatus,
      packageBriefs: packages.map((p) => p.packageBrief),
    })
  ) {
    return fail(
      "forbidden_mode",
      "Continue Generation is available for Manual Review or text-to-video repetition review runs.",
    );
  }

  const validation = validatePackagesReadyForContinue(
    packages.map((pkg) => ({
      packageId: pkg.packageId,
      packageIndex: pkg.packageIndex,
      brief: pkg.packageBrief,
    })),
  );

  runtimeLog("info", {
    event: "continue_generation_validation_completed",
    project_id: projectId,
    production_run_id: runId,
    outcome: validation.ok ? "ok" : "failed",
    detail: validation.ok
      ? `${packages.length} packages`
      : `${validation.issues.length} issues`,
  });

  if (!validation.ok) {
    runtimeLog("error", {
      event: "continue_generation_failed",
      project_id: projectId,
      production_run_id: runId,
      outcome: "validation_failed",
    });
    return fail(
      "validation_failed",
      "Not all packages are ready for Continue Generation.",
      { issues: validation.issues },
    );
  }

  const alreadyContinued = hasContinuedAfterCreativeReview(
    runRow.requested_config,
  );
  let claimedFresh = false;

  if (runRow.status === "waiting_for_creative_review") {
    const nextConfig = markContinuedAfterCreativeReview(
      runRow.requested_config,
      { at: timestamp, by: actor.id },
    );
    const { data: claimed, error: claimErr } = await supabase
      .from("production_runs")
      .update({
        status: "running",
        requested_config: nextConfig as Json,
        error_message: null,
      })
      .eq("id", runId)
      .eq("project_id", projectId)
      .eq("status", "waiting_for_creative_review")
      .select("id, status, requested_config")
      .maybeSingle();
    if (claimErr) throw claimErr;

    if (!claimed) {
      // Concurrent Continue won the race.
      const { data: latest } = await supabase
        .from("production_runs")
        .select("status, requested_config")
        .eq("id", runId)
        .eq("project_id", projectId)
        .maybeSingle();
      if (latest?.status === "running") {
        return fail(
          "already_running",
          "Continue Generation is already running for this run.",
        );
      }
      return fail(
        "already_running",
        "Continue Generation was already started by another request.",
      );
    }
    claimedFresh = true;
    runRow.status = "running";
    runRow.requested_config = claimed.requested_config;
  } else if (runRow.status === "running" && alreadyContinued) {
    // Idempotent re-entry after prior Continue — do not create duplicates;
    // ensure jobs + re-dispatch queued work.
    claimedFresh = false;
  } else if (runRow.status === "running") {
    return fail(
      "already_running",
      "Production run is already running (without Continue Generation).",
    );
  } else {
    return fail(
      "invalid_status",
      `Continue Generation requires status waiting_for_creative_review (currently: ${runRow.status}).`,
    );
  }

  // Text-only plans: no video jobs — mark continued and settle via reconcile.
  const stored = asRecord(runRow.requested_config);
  const plan = stored?.plan;
  const needsVideo = planRequiresVideo(
    plan && typeof plan === "object"
      ? (plan as {
          videoCount?: number;
          platformOutputs?: Array<{ kind?: string }>;
          activeVideoPlatforms?: string[];
        })
      : null,
  );

  const packageResults: ContinueGenerationPackageResult[] = [];
  const newlyCreatedJobIds: string[] = [];

  try {
    // Phase 6 — rebuild video fields from Creative Review before any job work.
    // Runs for every package (even text-only) so final_approved voiceover is applied.
    for (const pkg of packages) {
      const review = validation.reviews.get(pkg.packageId);
      if (!review) {
        throw new Error(`missing creative_review for package ${pkg.packageId}`);
      }
      // Skip rebuild when this package already completed creative rebuild
      // (idempotent Continue re-entry / recovery).
      const alreadyRebuilt = review.history.some(
        (entry) => entry.event === "creative_rebuild_completed",
      );
      if (alreadyRebuilt) {
        continue;
      }

      const nextReview = await rebuildAndPersistPackage({
        supabase,
        projectId,
        runId,
        runPackageVideoMode,
        pkg,
        review,
        actor,
        timestamp,
      });
      validation.reviews.set(pkg.packageId, nextReview);
    }

    if (needsVideo) {
      runtimeLog("info", {
        event: "continue_generation_job_creation_started",
        project_id: projectId,
        production_run_id: runId,
        detail: `${packages.length} packages`,
      });

      for (const pkg of packages) {
        const ensured = await ensureVideoJobForPackage({
          supabase,
          projectId,
          runId,
          runPackageVideoMode,
          generationMode,
          pkg,
        });
        if (ensured.created) newlyCreatedJobIds.push(ensured.jobId);
        packageResults.push({
          packageId: pkg.packageId,
          packageIndex: pkg.packageIndex,
          videoJobId: ensured.jobId,
          jobCreated: ensured.created,
          dispatched: false,
        });
      }

      runtimeLog("info", {
        event: "continue_generation_job_creation_completed",
        project_id: projectId,
        production_run_id: runId,
        detail: `created=${newlyCreatedJobIds.length} total=${packageResults.length}`,
      });
    } else {
      for (const pkg of packages) {
        packageResults.push({
          packageId: pkg.packageId,
          packageIndex: pkg.packageIndex,
          videoJobId: null,
          jobCreated: false,
          dispatched: false,
          warning: "text-only plan — no video job required",
        });
      }
    }

    // History only on fresh continue (or first successful history write).
    if (claimedFresh || !alreadyContinued) {
      for (const pkg of packages) {
        const review =
          validation.reviews.get(pkg.packageId) ??
          (() => {
            const read = readCreativeReviewFromBrief(pkg.packageBrief);
            return read.ok && read.value ? read.value : null;
          })();
        if (!review) continue;
        await appendContinueHistory({
          supabase,
          projectId,
          pkg,
          review,
          actor,
          timestamp,
        });
      }
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : "job creation failed";
    runtimeLog("error", {
      event: "continue_generation_failed",
      project_id: projectId,
      production_run_id: runId,
      outcome: "job_creation_failed",
      detail,
    });

    // Atomic rollback: delete newly created jobs + restore waiting state.
    try {
      await deleteVideoJobs(supabase, projectId, newlyCreatedJobIds);
      if (claimedFresh) {
        const reverted = clearContinuedAfterCreativeReview(
          runRow.requested_config,
        );
        await supabase
          .from("production_runs")
          .update({
            status: "waiting_for_creative_review",
            requested_config: reverted as Json,
          })
          .eq("id", runId)
          .eq("project_id", projectId)
          .eq("status", "running");
      }
    } catch (rollbackErr) {
      console.error(
        "[continue-generation] rollback failed",
        runId,
        rollbackErr,
      );
    }

    return fail("job_creation_failed", detail, {
      packages: packageResults,
      warnings,
    });
  }

  // Dispatch — failures leave jobs queued (recoverable). Do not roll back jobs.
  if (needsVideo && deps.videoCallbackUrl) {
    runtimeLog("info", {
      event: "continue_generation_dispatch_started",
      project_id: projectId,
      production_run_id: runId,
    });

    for (let i = 0; i < packageResults.length; i += 1) {
      const result = packageResults[i]!;
      const pkg = packages[i]!;
      if (!result.videoJobId) continue;

      const existing = await findExistingPackageVideoJob(
        supabase,
        projectId,
        pkg.packageId,
        pkg.contentItemIds,
      );
      const input = (asRecord(existing?.input) ?? {}) as Record<string, unknown>;

      const dispatch = await claimAndDispatchVariantVideoJob(supabase, {
        videoJobId: result.videoJobId,
        projectId,
        contentPackageId: pkg.packageId,
        contentItemId: pkg.videoItemId,
        callbackUrl: deps.videoCallbackUrl,
        input,
        startVideoJob: deps.startVideoJob,
      });
      result.dispatched = dispatch.dispatched;
      if (dispatch.warning) {
        result.warning = dispatch.warning;
        warnings.push(dispatch.warning);
      }
    }

    runtimeLog("info", {
      event: "continue_generation_dispatch_completed",
      project_id: projectId,
      production_run_id: runId,
      detail: `dispatched=${packageResults.filter((p) => p.dispatched).length}`,
    });
  } else if (needsVideo && !deps.videoCallbackUrl) {
    warnings.push(
      "video jobs created but left queued (missing video callback URL)",
    );
  }

  // Still deferring would be a logic bug — assert continue flag is set.
  if (
    shouldDeferVideoUntilCreativeReview(generationMode, runRow.requested_config)
  ) {
    warnings.push("continue flag missing after claim — reconcile may mis-settle");
  }

  runtimeLog("info", {
    event: "continue_generation_completed",
    project_id: projectId,
    production_run_id: runId,
    outcome: claimedFresh ? "ok" : "already_continued",
  });

  return {
    ok: true,
    code: claimedFresh ? "ok" : "already_continued",
    runId,
    status: "running",
    packages: packageResults,
    warnings,
  };
}
