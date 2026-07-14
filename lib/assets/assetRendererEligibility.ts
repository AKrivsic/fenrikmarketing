import type { AssetClass } from "@/lib/ai/guardrails";
import type { PackageVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import { isTypedNonImageVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import {
  isVideoUsageRenderMode,
  type VideoUsageRenderMode,
} from "@/lib/assets/preferredVideoUsage";
import { usedAsIndicatesFramedPresentation } from "@/lib/assets/smartUsageMetadata";

export type AssetRendererFitReason =
  | "ai_modify_path"
  | "framed_insert"
  | "needs_full_scene"
  | "static_cannot_modify"
  | "unknown_video_usage"
  | "not_framed_placement";

function wantsModification(modify: string | undefined): boolean {
  return modify === "true" || modify === "1";
}

/** Scenes the current worker cannot compose from a static asset alone. */
export function usedAsRequiresFullSceneGeneration(usedAs: string): boolean {
  const u = usedAs.trim().toLowerCase();
  if (!u) return false;
  const peopleAndSetting = [
    " person ",
    " people ",
    " founder",
    " developer",
    " team ",
    " teams ",
    " sit ",
    " sitting ",
    " seated ",
    " side by side",
    " arms crossed",
    " conference room",
    " café",
    " coffee shop",
    " hand holds",
    " holding the phone",
    " watching ",
    " crowd ",
    " business owner",
    " arguing ",
    " gathered around",
  ];
  const padded = ` ${u} `;
  return peopleAndSetting.some((hint) => padded.includes(hint));
}

export function isAssetSceneRenderableByCurrentPipeline(args: {
  assetClass: AssetClass;
  usedAs: string;
  videoUsage?: string | null;
  modify?: string;
}): { renderable: boolean; reason: AssetRendererFitReason } {
  const usedAs = args.usedAs.trim();
  if (!usedAs) {
    return { renderable: false, reason: "not_framed_placement" };
  }

  if (wantsModification(args.modify)) {
    if (args.assetClass === "static") {
      return { renderable: false, reason: "static_cannot_modify" };
    }
    return { renderable: true, reason: "ai_modify_path" };
  }

  if (usedAsRequiresFullSceneGeneration(usedAs)) {
    return { renderable: false, reason: "needs_full_scene" };
  }

  const rawUsage = args.videoUsage?.trim() ?? "";
  if (rawUsage && !isVideoUsageRenderMode(rawUsage)) {
    return { renderable: false, reason: "unknown_video_usage" };
  }

  if (
    rawUsage &&
    isVideoUsageRenderMode(rawUsage) &&
    rawUsage !== "fullscreen"
  ) {
    return { renderable: true, reason: "framed_insert" };
  }

  if (usedAsIndicatesFramedPresentation(usedAs)) {
    return { renderable: true, reason: "framed_insert" };
  }

  return { renderable: false, reason: "not_framed_placement" };
}

export function aiImagePromptFromAssetIntent(usedAs: string): string {
  const base = usedAs.trim();
  return (
    "Portrait 9:16 vertical composition. " +
    `${base}. ` +
    "Natural lighting, believable setting, generous vertical headroom. " +
    "No readable text, labels, or logos unless shown as abstract UI blocks only."
  );
}

export interface DowngradeAssetScenesResult {
  scenes: PackageVisualSceneEntry[];
  downgradedCount: number;
  reasons: AssetRendererFitReason[];
}

export function downgradeUnrenderableAssetScenes(args: {
  scenes: PackageVisualSceneEntry[];
  classById: ReadonlyMap<string, AssetClass>;
  preferredVideoUsageById?: ReadonlyMap<string, VideoUsageRenderMode | string>;
}): DowngradeAssetScenesResult {
  const reasons: AssetRendererFitReason[] = [];
  let downgradedCount = 0;

  const scenes = args.scenes.map((entry) => {
    if (isTypedNonImageVisualSceneEntry(entry)) return entry;
    const rec = entry as Record<string, unknown>;
    if (rec.source !== "asset") return entry;

    const assetId = typeof rec.asset_id === "string" ? rec.asset_id.trim() : "";
    const usedAs = typeof rec.used_as === "string" ? rec.used_as.trim() : "";
    if (!assetId || !usedAs) return entry;

    const assetClass = args.classById.get(assetId) ?? "static";
    const fit = isAssetSceneRenderableByCurrentPipeline({
      assetClass,
      usedAs,
      videoUsage:
        typeof rec.video_usage === "string" ? rec.video_usage : undefined,
      modify: typeof rec.modify === "string" ? rec.modify : undefined,
    });

    if (fit.renderable) return entry;

    downgradedCount++;
    reasons.push(fit.reason);
    return {
      source: "ai" as const,
      image_prompt: aiImagePromptFromAssetIntent(usedAs),
    };
  });

  return { scenes, downgradedCount, reasons };
}
