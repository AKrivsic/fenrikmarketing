/**
 * Pre-video gates for Creative Core v2 packages.
 * Paid video is gated by existing production paid preflight — not env flags.
 */

import { readApprovedCreativeCoreSnapshot } from "@/lib/content-creative-core-v2/approvedSnapshot";
import { packageHasPublishableDerivedContent } from "@/lib/content-creative-core-v2/derivedOutputsState";
import { platformOutputsContainPlaceholders } from "@/lib/content-creative-core-v2/placeholderGuard";
import { parsePackageVideoProductionMode } from "@/lib/content-package/packageVideoProductionMode";

export type CreativeCoreV2VideoGateCode =
  | "ok"
  | "missing_approved_core"
  | "derived_not_ready"
  | "placeholder_present"
  | "missing_social_image"
  | "missing_content_items"
  | "package_stopped"
  | "text_only_no_video"
  | "invalid_video_mode";

/**
 * Content readiness for creating a video job from an approved Creative Core.
 * Does not check paid confirmation — caller applies evaluateVideoPaidPreflight.
 */
export function assertCreativeCoreV2ReadyForVideoJob(args: {
  brief: Record<string, unknown>;
  platforms: readonly string[];
  contentItemCount: number;
  requireVideo: boolean;
  packageStatus?: string | null;
  runStatus?: string | null;
}): { ok: true } | { ok: false; code: CreativeCoreV2VideoGateCode; detail: string } {
  if (
    args.packageStatus === "cancelled" ||
    args.runStatus === "cancelled" ||
    args.brief.t2v_creative_rejected === true
  ) {
    return {
      ok: false,
      code: "package_stopped",
      detail: "package cancelled or rejected",
    };
  }

  const snapshot = readApprovedCreativeCoreSnapshot(args.brief);
  if (!snapshot) {
    return {
      ok: false,
      code: "missing_approved_core",
      detail: "approved snapshot missing",
    };
  }

  if (!args.requireVideo || snapshot.core.scenes.length === 0) {
    return {
      ok: false,
      code: "text_only_no_video",
      detail: "text-only package must not create video job",
    };
  }

  const mode = parsePackageVideoProductionMode(args.brief.package_video_mode);
  if (mode !== "still" && mode !== "text_to_video") {
    return {
      ok: false,
      code: "invalid_video_mode",
      detail: `invalid mode ${String(args.brief.package_video_mode)}`,
    };
  }

  if (platformOutputsContainPlaceholders(args.brief.platform_outputs)) {
    return {
      ok: false,
      code: "placeholder_present",
      detail: "placeholder captions present",
    };
  }

  if (!packageHasPublishableDerivedContent(args.brief)) {
    return {
      ok: false,
      code: "derived_not_ready",
      detail: "derived outputs / required social image not ready",
    };
  }

  if (args.contentItemCount < 1) {
    return {
      ok: false,
      code: "missing_content_items",
      detail: "no content_items",
    };
  }

  return { ok: true };
}
