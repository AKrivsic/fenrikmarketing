import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { PackagePlatform } from "@/lib/ai/types";
import {
  buildPersistableItems,
  type StrategyItemContext,
} from "@/lib/ai/workflows/packageShared";
import { outputsForPackageIndex } from "@/lib/projects/productionRun";

export interface PackageFanOutExpectation {
  multipliers: Record<string, number>;
  packageIndex: number;
}

export function countExpectedPrimaryContentItems(args: {
  pkg: ContentPackageOutput;
  context: Pick<StrategyItemContext, "funnelStage" | "format">;
  targetPlatforms?: readonly string[];
  videoPlatforms?: readonly PackagePlatform[];
  fanOut?: PackageFanOutExpectation | null;
}): number {
  const videoPlatformSet = new Set<string>(args.videoPlatforms ?? []);
  const itemRows = buildPersistableItems(
    args.pkg,
    args.context as StrategyItemContext,
    args.targetPlatforms,
    null,
  );
  let total = 0;
  for (const item of itemRows) {
    const kind = videoPlatformSet.has(item.platform) ? "video" : "text";
    const count = args.fanOut
      ? outputsForPackageIndex(
          kind,
          args.fanOut.multipliers[item.platform] ?? 1,
          args.fanOut.packageIndex,
        )
      : 1;
    total += count;
  }
  return total;
}

export function rehydrateContentPackageFromBrief(
  brief: Record<string, unknown>,
): ContentPackageOutput | null {
  const voiceover =
    typeof brief.voiceover_text === "string" ? brief.voiceover_text.trim() : "";
  const platformOutputs = brief.platform_outputs;
  if (!voiceover || !platformOutputs || typeof platformOutputs !== "object") {
    return null;
  }
  return {
    title: typeof brief.title === "string" ? brief.title : "Package",
    funnel_stage:
      typeof brief.funnel_stage === "string" ? brief.funnel_stage : "awareness",
    hook: typeof brief.hook === "string" ? brief.hook : "",
    voiceover_text: voiceover,
    subtitles:
      typeof brief.subtitles === "string" ? brief.subtitles : voiceover,
    cta:
      brief.cta && typeof brief.cta === "object" && !Array.isArray(brief.cta)
        ? (brief.cta as ContentPackageOutput["cta"])
        : { text: "", url: null },
    video:
      brief.video && typeof brief.video === "object"
        ? (brief.video as ContentPackageOutput["video"])
        : { concept: "", script: voiceover },
    platform_outputs:
      platformOutputs as ContentPackageOutput["platform_outputs"],
    hashtags: Array.isArray(brief.hashtags) ? brief.hashtags : [],
    image_prompts: Array.isArray(brief.image_prompts) ? brief.image_prompts : [],
    visual_scenes: Array.isArray(brief.visual_scenes) ? brief.visual_scenes : [],
    asset_usage: Array.isArray(brief.asset_usage) ? brief.asset_usage : [],
    presentation_generation: brief.presentation_generation ?? undefined,
    social_image: brief.social_image ?? undefined,
  } as ContentPackageOutput;
}

export function briefHasPersistableContentPayload(
  brief: Record<string, unknown>,
): boolean {
  return rehydrateContentPackageFromBrief(brief) !== null;
}
