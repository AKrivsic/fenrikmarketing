import type { SupabaseClient } from "@supabase/supabase-js";
import {
  defersVideoUntilCreativeReview,
  hasContinuedAfterCreativeReview,
  shouldDeferVideoUntilCreativeReview,
  AWAITING_TEXT_TO_VIDEO_CREATIVE_REVIEW_KEY,
  type GenerationMode,
} from "@/lib/ai/generationMode";
import { readTextToVideoCreativePlan } from "@/lib/content-package/textToVideoCreativePlan";

export const CREATIVE_REVIEW_REASON_KEY = "creative_review_reason" as const;

export const CREATIVE_REVIEW_REASON_MANUAL_MODE = "manual_mode" as const;

export const CREATIVE_REVIEW_REASON_TEXT_TO_VIDEO_REPETITION =
  "text_to_video_repetition_blocked" as const;

export type CreativeReviewReason =
  | typeof CREATIVE_REVIEW_REASON_MANUAL_MODE
  | typeof CREATIVE_REVIEW_REASON_TEXT_TO_VIDEO_REPETITION;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readCreativeReviewReason(
  brief: Record<string, unknown> | null | undefined,
): CreativeReviewReason | null {
  const raw = brief?.[CREATIVE_REVIEW_REASON_KEY];
  if (raw === CREATIVE_REVIEW_REASON_MANUAL_MODE) return raw;
  if (raw === CREATIVE_REVIEW_REASON_TEXT_TO_VIDEO_REPETITION) return raw;
  return null;
}

/** Package-level: video job must wait (repetition block or unresolved T2V review). */
export function packageBriefDefersVideoJob(
  brief: unknown,
  runConfig?: unknown,
): boolean {
  if (hasContinuedAfterCreativeReview(runConfig)) return false;
  const record = asRecord(brief);
  if (!record) return false;
  const reason = readCreativeReviewReason(record);
  const plan = readTextToVideoCreativePlan(record);
  if (plan?.status === "repetition_blocked") return true;
  if (reason === CREATIVE_REVIEW_REASON_TEXT_TO_VIDEO_REPETITION) {
    if (!plan) return true;
    if (plan.status !== "approved") return true;
    if (plan.repetition.status !== "passed") return true;
  }
  return false;
}

export function productionRunDefersVideoUntilCreativeReview(args: {
  generationMode: GenerationMode;
  requestedConfig: unknown;
  packageBriefs?: ReadonlyArray<unknown>;
}): boolean {
  if (hasContinuedAfterCreativeReview(args.requestedConfig)) return false;
  const root =
    args.requestedConfig &&
    typeof args.requestedConfig === "object" &&
    !Array.isArray(args.requestedConfig)
      ? (args.requestedConfig as Record<string, unknown>)
      : null;
  const config =
    root?.config && typeof root.config === "object" && !Array.isArray(root.config)
      ? (root.config as Record<string, unknown>)
      : root;
  if (config?.[AWAITING_TEXT_TO_VIDEO_CREATIVE_REVIEW_KEY] === true) {
    return true;
  }
  if (
    shouldDeferVideoUntilCreativeReview(
      args.generationMode,
      args.requestedConfig,
    )
  ) {
    return true;
  }
  if (args.packageBriefs?.some((brief) => packageBriefDefersVideoJob(brief))) {
    return true;
  }
  return false;
}

export async function loadProductionRunPackageBriefs(
  supabase: SupabaseClient,
  projectId: string,
  runId: string,
): Promise<unknown[]> {
  const { data: items, error: itemErr } = await supabase
    .from("production_run_items")
    .select("content_package_id")
    .eq("production_run_id", runId)
    .eq("project_id", projectId);
  if (itemErr) throw itemErr;
  const packageIds = (items ?? [])
    .map((row) => row.content_package_id as string | null)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  if (packageIds.length === 0) return [];
  const { data: packages, error: pkgErr } = await supabase
    .from("content_packages")
    .select("package_brief")
    .eq("project_id", projectId)
    .in("id", packageIds);
  if (pkgErr) throw pkgErr;
  return (packages ?? []).map((row) => row.package_brief);
}

export function canAccessCreativeReviewRun(args: {
  generationMode: GenerationMode;
  runStatus: string;
}): boolean {
  if (args.runStatus === "waiting_for_creative_review") return true;
  return defersVideoUntilCreativeReview(args.generationMode);
}

export function canContinueCreativeReviewRun(args: {
  generationMode: GenerationMode;
  runStatus: string;
  packageBriefs: ReadonlyArray<unknown>;
}): boolean {
  if (args.generationMode === "manual_review") return true;
  if (args.runStatus !== "waiting_for_creative_review") return false;
  return args.packageBriefs.some(
    (brief) =>
      readCreativeReviewReason(asRecord(brief)) ===
      CREATIVE_REVIEW_REASON_TEXT_TO_VIDEO_REPETITION,
  );
}

export function clearCreativeReviewReasonOnContinue(
  brief: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...brief };
  delete next[CREATIVE_REVIEW_REASON_KEY];
  return next;
}

export function markProductionRunAwaitingT2VCreativeReview(
  requestedConfig: unknown,
): Record<string, unknown> {
  const root =
    requestedConfig &&
    typeof requestedConfig === "object" &&
    !Array.isArray(requestedConfig)
      ? (requestedConfig as Record<string, unknown>)
      : {};
  const prevConfig =
    root.config && typeof root.config === "object" && !Array.isArray(root.config)
      ? (root.config as Record<string, unknown>)
      : {};
  return {
    ...root,
    config: {
      ...prevConfig,
      [AWAITING_TEXT_TO_VIDEO_CREATIVE_REVIEW_KEY]: true,
    },
  };
}

/** Whether persist/continue should insert a package video_jobs row. */
export function shouldCreatePackageVideoJob(args: {
  hasVideoPlatforms: boolean;
  generationMode: GenerationMode;
  brief: Record<string, unknown>;
  runConfig?: unknown;
}): boolean {
  if (!args.hasVideoPlatforms) return false;
  if (defersVideoUntilCreativeReview(args.generationMode)) return false;
  if (packageBriefDefersVideoJob(args.brief, args.runConfig)) return false;
  return true;
}
