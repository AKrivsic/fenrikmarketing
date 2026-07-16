import type { Project } from "@/lib/supabase/types";
import type { GenerationMode } from "@/lib/ai/generationMode";
import type { VisualNarrativePlan } from "@/lib/visual-narrative/types";
import type { VisualMedium } from "@/lib/visual-medium/visualMedium";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import { classifyAsset } from "@/lib/ai/guardrails";
import {
  isAssetSceneRenderableByCurrentPipeline,
  usedAsRequiresFullSceneGeneration,
} from "@/lib/assets/assetRendererEligibility";
import { assetCoverageTier } from "@/lib/assets/assetCoveragePolicy";
import type { AssetCoverageTier } from "@/lib/assets/assetCoveragePolicy";
import {
  isVideoUsageRenderMode,
  resolvePreferredVideoUsageFromRef,
  type VideoUsageRenderMode,
} from "@/lib/assets/preferredVideoUsage";
import {
  PRODUCT_REVEAL_VERSION,
  type ProductRevealPlan,
  type ProductRevealStrategy,
} from "@/lib/product-reveal/types";

/** Framed insert modes the current pipeline can composite without a full AI scene. */
const FRAMED_INSERT_USAGES = new Set<VideoUsageRenderMode>([
  "framed_phone",
  "framed_laptop",
  "framed_monitor",
  "framed_screen",
]);

const REAL_INSERT_USAGES = new Set<VideoUsageRenderMode>([
  "floating_card",
  "ui_hero",
]);

/**
 * Safe placement copy for eligibility probes.
 * Must stay free of people/hands/rooms — those compositions fail Asset Safety.
 */
export function safeUsedAsForVideoUsage(
  usage: VideoUsageRenderMode,
): string | null {
  switch (usage) {
    case "framed_phone":
      return "Show this product UI inside a phone mockup, screen facing the viewer.";
    case "framed_laptop":
      return "Show this UI inside a laptop screen insert, not fullscreen.";
    case "framed_monitor":
    case "framed_screen":
      return "Show this UI inside a monitor screen insert, not fullscreen.";
    case "floating_card":
      return "Product UI screenshot as a floating card insert on a clean background.";
    case "ui_hero":
      return "Large product UI hero insert, clean background, no people.";
    default:
      return null;
  }
}

/**
 * Example composition that looks like a "natural" framed product shot but the
 * current pipeline cannot deliver safely (people/hands → Asset Safety → AI).
 */
export const UNSAFE_FRAMED_COMPOSITION_EXAMPLE =
  "A person holds a phone showing the product UI, seated in a café.";

function bestAssetForReveal(assets: readonly AssetRef[]): AssetRef | null {
  const ranked = assets
    .map((ref) => ({
      ref,
      tier: assetCoverageTier(ref),
    }))
    .filter(
      (r): r is { ref: AssetRef; tier: AssetCoverageTier } =>
        r.tier !== null && r.tier <= 3,
    )
    .sort((a, b) => a.tier - b.tier);
  return ranked[0]?.ref ?? null;
}

function resolveAssetVideoUsage(asset: AssetRef): VideoUsageRenderMode | null {
  const raw = asset.preferred_video_usage;
  if (typeof raw === "string" && raw.trim() && isVideoUsageRenderMode(raw.trim())) {
    return raw.trim() as VideoUsageRenderMode;
  }
  try {
    return resolvePreferredVideoUsageFromRef(asset);
  } catch {
    return null;
  }
}

function suitabilityBlocksAssetReveal(asset: AssetRef): boolean {
  const suit = (asset.video_suitability ?? "").trim().toLowerCase();
  return suit === "background_only" || suit === "branding_prop";
}

/**
 * True when a FRAMED_ASSET plan for this asset is expected to survive Asset Safety
 * with the safe insert composition (not a people/hand scene).
 */
export function framedAssetExpectedToSurviveSafety(args: {
  asset: AssetRef;
  usedAs: string;
  videoUsage: VideoUsageRenderMode;
}): boolean {
  if (!FRAMED_INSERT_USAGES.has(args.videoUsage)) return false;
  if (usedAsRequiresFullSceneGeneration(args.usedAs)) return false;
  const assetClass = classifyAsset(args.asset.asset_class, null);
  const fit = isAssetSceneRenderableByCurrentPipeline({
    assetClass,
    usedAs: args.usedAs,
    videoUsage: args.videoUsage,
    modify: "false",
  });
  return fit.renderable && fit.reason === "framed_insert";
}

export function resolveProductRevealPlan(args: {
  project: Project;
  generationMode: GenerationMode;
  assets: readonly AssetRef[];
  narrative: VisualNarrativePlan | null;
  visualMedium: VisualMedium;
}): ProductRevealPlan {
  const reasons: string[] = [];
  const samplePayoff = args.generationMode === "sample";
  const carrier = args.narrative?.primary_meaning_carrier ?? null;

  // Story wants people/places → prefer outcome visuals over forced framed UI.
  // A great AI outcome beat can still receive a manual screenshot later.
  const storyPrefersOutcome = carrier === "human" || carrier === "place";

  const asset = bestAssetForReveal(args.assets);
  if (!asset) {
    reasons.push("no_tier13_asset");
    const strategy = pickNonAssetStrategy(
      args.narrative,
      args.visualMedium,
      reasons,
    );
    return {
      version: PRODUCT_REVEAL_VERSION,
      solution_beat_strategy: strategy,
      reasons,
      sample_payoff_visual_required: samplePayoff,
    };
  }

  if (suitabilityBlocksAssetReveal(asset)) {
    reasons.push(`asset_suitability_blocks:${asset.video_suitability}`);
    const strategy = pickNonAssetStrategy(
      args.narrative,
      args.visualMedium,
      reasons,
    );
    return {
      version: PRODUCT_REVEAL_VERSION,
      solution_beat_strategy: strategy,
      reasons,
      sample_payoff_visual_required: samplePayoff,
    };
  }

  const assetClass = classifyAsset(asset.asset_class, null);
  const videoUsage = resolveAssetVideoUsage(asset);

  if (!videoUsage) {
    reasons.push("asset_usage_unresolved");
  } else if (FRAMED_INSERT_USAGES.has(videoUsage) && !storyPrefersOutcome) {
    const safeUsedAs = safeUsedAsForVideoUsage(videoUsage);
    if (
      safeUsedAs &&
      framedAssetExpectedToSurviveSafety({
        asset,
        usedAs: safeUsedAs,
        videoUsage,
      })
    ) {
      reasons.push(`asset_framed_safe:${asset.id}:${videoUsage}`);
      return {
        version: PRODUCT_REVEAL_VERSION,
        solution_beat_strategy: "FRAMED_ASSET",
        reasons,
        sample_payoff_visual_required: samplePayoff,
      };
    }
    reasons.push(`framed_not_renderable:${videoUsage}:${asset.id}`);
  } else if (FRAMED_INSERT_USAGES.has(videoUsage) && storyPrefersOutcome) {
    reasons.push(`story_prefers_outcome_over_framed:${carrier}`);
  }

  if (
    videoUsage &&
    REAL_INSERT_USAGES.has(videoUsage) &&
    assetClass === "static" &&
    !storyPrefersOutcome
  ) {
    const safeUsedAs = safeUsedAsForVideoUsage(videoUsage);
    if (safeUsedAs) {
      const heroFit = isAssetSceneRenderableByCurrentPipeline({
        assetClass,
        usedAs: safeUsedAs,
        videoUsage,
        modify: "false",
      });
      if (heroFit.renderable && heroFit.reason === "framed_insert") {
        reasons.push(`asset_real:${asset.id}:${videoUsage}`);
        return {
          version: PRODUCT_REVEAL_VERSION,
          solution_beat_strategy: "REAL_ASSET",
          reasons,
          sample_payoff_visual_required: samplePayoff,
        };
      }
      reasons.push(`real_not_renderable:${heroFit.reason}`);
    }
  }

  if (assetClass !== "static" && !storyPrefersOutcome) {
    const interactionUsedAs =
      safeUsedAsForVideoUsage(videoUsage ?? "framed_phone") ??
      "Show this product UI inside a phone mockup, screen facing the viewer.";
    const modifyFit = isAssetSceneRenderableByCurrentPipeline({
      assetClass,
      usedAs: interactionUsedAs,
      modify: "true",
    });
    if (modifyFit.renderable && modifyFit.reason === "ai_modify_path") {
      reasons.push(`asset_interaction:${asset.id}`);
      return {
        version: PRODUCT_REVEAL_VERSION,
        solution_beat_strategy: "PRODUCT_INTERACTION",
        reasons,
        sample_payoff_visual_required: samplePayoff,
      };
    }
    reasons.push("editable_asset_but_pipeline_unreliable");
  } else if (!videoUsage || !FRAMED_INSERT_USAGES.has(videoUsage)) {
    reasons.push(`asset_not_safe_insert:${videoUsage ?? "none"}`);
  }

  const fallback = pickNonAssetStrategy(
    args.narrative,
    args.visualMedium,
    reasons,
  );
  return {
    version: PRODUCT_REVEAL_VERSION,
    solution_beat_strategy: fallback,
    reasons,
    sample_payoff_visual_required: samplePayoff,
  };
}

function pickNonAssetStrategy(
  narrative: VisualNarrativePlan | null,
  medium: VisualMedium,
  reasons: string[],
): ProductRevealStrategy {
  const carrier = narrative?.primary_meaning_carrier;
  if (
    medium === "TECHNICAL_BLUEPRINT" ||
    medium === "CLEAN_ILLUSTRATION" ||
    medium === "SOFT_3D" ||
    carrier === "object" ||
    carrier === "process" ||
    carrier === "transformation" ||
    carrier === "product"
  ) {
    reasons.push("fallback:abstract_system");
    return "ABSTRACT_PRODUCT_SYSTEM";
  }
  if (carrier === "human" || carrier === "place") {
    reasons.push("fallback:product_outcome");
    return "PRODUCT_OUTCOME";
  }
  reasons.push("fallback:no_product_visual");
  return "NO_PRODUCT_VISUAL";
}
