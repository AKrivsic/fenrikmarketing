/**
 * After derived outputs are ready: optionally create/dispatch video job from
 * approved Creative Core. Paid T2V requires existing confirm_paid_run + budget.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/types";
import { buildVideoJobInput } from "@/lib/ai/workflows/packageShared";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import {
  applyApprovedCoreToPackageBriefForVideo,
  briefUsesApprovedCreativeCoreV2,
  CREATIVE_CORE_V2_AWAITING_PAID_VIDEO_KEY,
} from "@/lib/content-creative-core-v2/projectApprovedCoreForVideo";
import { assertCreativeCoreV2ReadyForVideoJob } from "@/lib/content-creative-core-v2/videoGates";
import { packageDeriveIsComplete } from "@/lib/content-creative-core-v2/recoverDerive";
import {
  PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO,
  parsePackageVideoProductionMode,
} from "@/lib/content-package/packageVideoProductionMode";
import { resolvePackagePlatforms } from "@/lib/projects/contentControls";
import { loadProjectOrThrow } from "@/lib/ai/workflows/shared";
import {
  evaluateVideoPaidPreflight,
  readVideoPaidPreflightState,
} from "@/lib/content-package/videoPaidPreflight";
import { mergeTextToVideoRunPaidPreflight } from "@/lib/content-package/mergeTextToVideoRunPaidPreflight";
import { readCreativeReviewFromBrief } from "@/lib/creative-review/read";
import { parseGenerationMode } from "@/lib/ai/generationMode";
import { normalizeProductionConfig } from "@/lib/projects/productionRun";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const PAID_WAIT_BLOCKERS = new Set([
  "paid_run_not_confirmed",
  "budget_limit_required",
  "similarity_check_pending",
]);

export type StartVideoFromApprovedCoreResult =
  | {
      ok: true;
      started: boolean;
      awaitingPaidConfirmation: boolean;
      videoJobId: string | null;
      reason?: string;
    }
  | { ok: false; error: string; code: string };

async function loadRunPaidConfig(
  supabase: SupabaseClient,
  projectId: string,
  productionRunId: string | null | undefined,
): Promise<{
  textToVideoConfirmPaidRun?: boolean;
  textToVideoMaxBudgetUsd?: number;
  packageVideoMode?: string;
} | null> {
  if (!productionRunId) return null;
  const { data, error } = await supabase
    .from("production_runs")
    .select("requested_config")
    .eq("id", productionRunId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const stored = asRecord(data.requested_config);
  const rawConfig = stored?.config;
  if (!rawConfig) return null;
  const config = normalizeProductionConfig(rawConfig);
  return {
    textToVideoConfirmPaidRun: config.textToVideoConfirmPaidRun,
    textToVideoMaxBudgetUsd: config.textToVideoMaxBudgetUsd,
    packageVideoMode: config.packageVideoMode,
  };
}

function stampAwaitingPaid(
  brief: Record<string, unknown>,
  reason: string,
): Record<string, unknown> {
  return {
    ...brief,
    [CREATIVE_CORE_V2_AWAITING_PAID_VIDEO_KEY]: true,
    content_creative_core_v2_awaiting_paid_reason: reason,
  };
}

function clearAwaitingPaid(brief: Record<string, unknown>): Record<string, unknown> {
  const next = { ...brief };
  delete next[CREATIVE_CORE_V2_AWAITING_PAID_VIDEO_KEY];
  delete next.content_creative_core_v2_awaiting_paid_reason;
  delete next.content_creative_core_v2_media_blocked;
  delete next.content_creative_core_v2_media_block_reason;
  return next;
}

/**
 * Create a queued video_jobs row from approved Core when content + paid gates pass.
 * Does not invent story. Does not call ElevenLabs/Runway here — workers do.
 */
export async function startVideoFromApprovedCreativeCore(args: {
  supabase: SupabaseClient;
  projectId: string;
  packageId: string;
  productionRunId?: string | null;
  generationMode?: string | null;
}): Promise<StartVideoFromApprovedCoreResult> {
  const { data: row, error } = await args.supabase
    .from("content_packages")
    .select("id, status, strategy_item_id, package_brief, title")
    .eq("id", args.packageId)
    .eq("project_id", args.projectId)
    .maybeSingle();
  if (error) throw error;
  if (!row) {
    return { ok: false, error: "Package not found.", code: "not_found" };
  }
  if (row.status === "cancelled") {
    return {
      ok: true,
      started: false,
      awaitingPaidConfirmation: false,
      videoJobId: null,
      reason: "cancelled",
    };
  }

  let brief = asRecord(row.package_brief) ?? {};
  if (!briefUsesApprovedCreativeCoreV2(brief)) {
    return {
      ok: false,
      error: "Approved Creative Core missing.",
      code: "missing_core",
    };
  }
  if (!packageDeriveIsComplete(brief)) {
    return {
      ok: true,
      started: false,
      awaitingPaidConfirmation: false,
      videoJobId: null,
      reason: "derive_incomplete",
    };
  }

  const project = await loadProjectOrThrow(args.supabase, args.projectId);
  const platforms = resolvePackagePlatforms(project.platforms);
  const runPaid = await loadRunPaidConfig(
    args.supabase,
    args.projectId,
    args.productionRunId,
  );
  if (runPaid) {
    brief = mergeTextToVideoRunPaidPreflight(brief, {
      packageVideoMode: parsePackageVideoProductionMode(
        runPaid.packageVideoMode ?? brief.package_video_mode,
      ),
      textToVideoConfirmPaidRun: runPaid.textToVideoConfirmPaidRun,
      textToVideoMaxBudgetUsd: runPaid.textToVideoMaxBudgetUsd,
    });
  }

  const mode = parsePackageVideoProductionMode(brief.package_video_mode);
  const snapshotScenes =
    (
      brief.content_creative_core_v2_approved_snapshot as
        | { core?: { scenes?: unknown[] } }
        | undefined
    )?.core?.scenes ?? [];
  if (snapshotScenes.length === 0) {
    return {
      ok: true,
      started: false,
      awaitingPaidConfirmation: false,
      videoJobId: null,
      reason: "text_only",
    };
  }

  const { data: items } = await args.supabase
    .from("content_items")
    .select("id, platform")
    .eq("project_id", args.projectId)
    .eq("package_id", args.packageId);
  const contentItems = items ?? [];

  const gate = assertCreativeCoreV2ReadyForVideoJob({
    brief,
    platforms,
    contentItemCount: contentItems.length,
    requireVideo: true,
    packageStatus: row.status,
  });
  if (!gate.ok) {
    return { ok: false, error: gate.detail, code: gate.code };
  }

  const { data: existingJob } = await args.supabase
    .from("video_jobs")
    .select("id")
    .eq("project_id", args.projectId)
    .eq("package_id", args.packageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingJob?.id) {
    return {
      ok: true,
      started: false,
      awaitingPaidConfirmation: false,
      videoJobId: existingJob.id as string,
      reason: "job_exists",
    };
  }

  const projected = applyApprovedCoreToPackageBriefForVideo({ brief });
  if (!projected.ok) {
    return { ok: false, error: projected.error, code: "projection_failed" };
  }
  brief = projected.brief;

  const reviewRead = readCreativeReviewFromBrief(brief);
  const generationMode = parseGenerationMode(args.generationMode);
  const paidState = readVideoPaidPreflightState(brief);
  const confirmPaid =
    runPaid?.textToVideoConfirmPaidRun === true ||
    paidState.confirm_paid_run === true;
  const maxBudget =
    runPaid?.textToVideoMaxBudgetUsd ?? paidState.max_budget_usd;

  const preflight = evaluateVideoPaidPreflight({
    packageVideoMode: mode,
    runPackageVideoMode: mode,
    generationMode,
    creativeReview: reviewRead.ok && reviewRead.value ? reviewRead.value : null,
    brief,
    enforceFuturePaidGates: mode === PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO,
    confirmPaidRun: confirmPaid,
    maxBudgetUsd: maxBudget,
  });
  if (!preflight.ok) {
    const waitingPaid = preflight.blockers.some((b) => PAID_WAIT_BLOCKERS.has(b));
    if (waitingPaid) {
      const next = stampAwaitingPaid(
        brief,
        preflight.blockers.join(","),
      );
      await args.supabase
        .from("content_packages")
        .update({ package_brief: next as unknown as Json })
        .eq("id", args.packageId)
        .eq("project_id", args.projectId);
      return {
        ok: true,
        started: false,
        awaitingPaidConfirmation: true,
        videoJobId: null,
        reason: `awaiting_paid:${preflight.blockers.join(",")}`,
      };
    }
    return {
      ok: true,
      started: false,
      awaitingPaidConfirmation: false,
      videoJobId: null,
      reason: `paid_preflight:${preflight.blockers.join(",")}`,
    };
  }

  const videoItemId =
    contentItems.find((i) =>
      ["tiktok", "instagram", "youtube", "facebook"].includes(
        String(i.platform),
      ),
    )?.id ?? contentItems[0]?.id;
  if (!videoItemId) {
    return {
      ok: false,
      error: "No content item for video job.",
      code: "missing_content_items",
    };
  }

  const pkgForInput = brief as unknown as ContentPackageOutput;
  const videoInput = await buildVideoJobInput(
    args.supabase,
    args.projectId,
    pkgForInput,
    {
      package_id: args.packageId,
      ...(args.productionRunId
        ? { production_run_id: args.productionRunId }
        : {}),
      package_video_mode: mode,
      content_creative_core_v2: true,
      ...(mode === PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO
        ? {
            text_to_video_confirm_paid_run: confirmPaid,
            textToVideoConfirmPaidRun: confirmPaid,
            ...(typeof maxBudget === "number"
              ? {
                  text_to_video_max_budget_usd: maxBudget,
                  textToVideoMaxBudgetUsd: maxBudget,
                }
              : {}),
          }
        : {}),
    },
  );

  const { data: inserted, error: insertErr } = await args.supabase
    .from("video_jobs")
    .insert({
      project_id: args.projectId,
      content_item_id: videoItemId,
      package_id: args.packageId,
      render_kind: "package",
      provider: "video_engine",
      status: "queued",
      input: videoInput,
    })
    .select("id")
    .single();
  if (insertErr) throw insertErr;

  await args.supabase
    .from("content_packages")
    .update({
      package_brief: {
        ...clearAwaitingPaid(brief),
        presentation_generation: pkgForInput.presentation_generation ?? null,
      } as unknown as Json,
    })
    .eq("id", args.packageId)
    .eq("project_id", args.projectId);

  return {
    ok: true,
    started: true,
    awaitingPaidConfirmation: false,
    videoJobId: inserted.id as string,
  };
}
