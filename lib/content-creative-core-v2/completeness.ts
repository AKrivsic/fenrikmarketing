/**
 * Completeness gates for Creative Core v2 packages (text-only vs video).
 */

import { readApprovedCreativeCoreSnapshot } from "@/lib/content-creative-core-v2/approvedSnapshot";
import { packageHasPublishableDerivedContent } from "@/lib/content-creative-core-v2/derivedOutputsState";
import { platformOutputsContainPlaceholders } from "@/lib/content-creative-core-v2/placeholderGuard";
import { CREATIVE_CORE_V2_AWAITING_PAID_VIDEO_KEY } from "@/lib/content-creative-core-v2/projectApprovedCoreForVideo";
import { parsePackageVideoProductionMode } from "@/lib/content-package/packageVideoProductionMode";

export function isCreativeCoreV2TextOnlyPackage(
  brief: Record<string, unknown>,
): boolean {
  const snap = readApprovedCreativeCoreSnapshot(brief);
  if (!snap) return false;
  return snap.core.scenes.length === 0;
}

export function isCreativeCoreV2VideoPackageComplete(args: {
  brief: Record<string, unknown>;
  contentItemCount: number;
  videoJobStatus: string | null;
  hasFinalMp4: boolean;
  hasThumbnail: boolean;
}): { complete: boolean; reason?: string } {
  const snap = readApprovedCreativeCoreSnapshot(args.brief);
  if (!snap) return { complete: false, reason: "missing_approved_core" };
  if (platformOutputsContainPlaceholders(args.brief.platform_outputs)) {
    return { complete: false, reason: "placeholder" };
  }
  if (!packageHasPublishableDerivedContent(args.brief)) {
    return { complete: false, reason: "derived_not_ready" };
  }
  if (args.contentItemCount < 1) {
    return { complete: false, reason: "missing_content_items" };
  }
  if (
    args.brief[CREATIVE_CORE_V2_AWAITING_PAID_VIDEO_KEY] === true ||
    args.brief.content_creative_core_v2_media_blocked === true
  ) {
    return { complete: false, reason: "awaiting_paid_confirmation" };
  }
  if (args.videoJobStatus !== "completed") {
    return { complete: false, reason: "video_job_incomplete" };
  }
  if (!args.hasFinalMp4) {
    return { complete: false, reason: "missing_mp4" };
  }
  if (!args.hasThumbnail) {
    return { complete: false, reason: "missing_thumbnail" };
  }
  return { complete: true };
}

export function isCreativeCoreV2TextOnlyPackageComplete(args: {
  brief: Record<string, unknown>;
  contentItemCount: number;
}): { complete: boolean; reason?: string } {
  const snap = readApprovedCreativeCoreSnapshot(args.brief);
  if (!snap) return { complete: false, reason: "missing_approved_core" };
  if (snap.core.scenes.length > 0) {
    const mode = parsePackageVideoProductionMode(args.brief.package_video_mode);
    if (mode === "still" || mode === "text_to_video") {
      // Not text-only — use video completeness.
      return { complete: false, reason: "expects_video" };
    }
  }
  if (platformOutputsContainPlaceholders(args.brief.platform_outputs)) {
    return { complete: false, reason: "placeholder" };
  }
  if (!packageHasPublishableDerivedContent(args.brief)) {
    return { complete: false, reason: "derived_not_ready" };
  }
  if (args.contentItemCount < 1) {
    return { complete: false, reason: "missing_content_items" };
  }
  return { complete: true };
}
