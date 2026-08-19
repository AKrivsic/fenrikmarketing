import type { ProductionConfig } from "@/lib/projects/productionRun";
import {
  PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO,
  parsePackageVideoProductionMode,
} from "@/lib/content-package/packageVideoProductionMode";
import { readVideoPaidPreflightState } from "@/lib/content-package/videoPaidPreflight";

/** Stamp operator paid confirm + budget from production run onto package brief (T2V only). */
export function mergeTextToVideoRunPaidPreflight(
  brief: Record<string, unknown>,
  config: Pick<
    ProductionConfig,
    "packageVideoMode" | "textToVideoConfirmPaidRun" | "textToVideoMaxBudgetUsd"
  >,
): Record<string, unknown> {
  const mode =
    config.packageVideoMode ??
    parsePackageVideoProductionMode(brief.package_video_mode);
  if (mode !== PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO) return brief;
  const existing = readVideoPaidPreflightState(brief);
  const maxBudgetUsd =
    config.textToVideoMaxBudgetUsd !== undefined &&
    Number.isFinite(config.textToVideoMaxBudgetUsd) &&
    config.textToVideoMaxBudgetUsd > 0
      ? config.textToVideoMaxBudgetUsd
      : existing.max_budget_usd;
  return {
    ...brief,
    video_paid_preflight: {
      ...existing,
      confirm_paid_run: config.textToVideoConfirmPaidRun === true,
      ...(maxBudgetUsd !== undefined ? { max_budget_usd: maxBudgetUsd } : {}),
    },
  };
}
