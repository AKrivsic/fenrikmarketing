import type { Project } from "@/lib/supabase/types";
import type { GenerationMode } from "@/lib/ai/generationMode";
import type { VisualNarrativePlan } from "@/lib/visual-narrative/types";
import type { VisualMedium } from "@/lib/visual-medium/visualMedium";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import { classifyAsset } from "@/lib/ai/guardrails";
import { isAssetSceneRenderableByCurrentPipeline } from "@/lib/assets/assetRendererEligibility";
import { assetCoverageTier } from "@/lib/assets/assetCoveragePolicy";
import type { AssetCoverageTier } from "@/lib/assets/assetCoveragePolicy";
import {
  PRODUCT_REVEAL_VERSION,
  type ProductRevealPlan,
  type ProductRevealStrategy,
} from "@/lib/product-reveal/types";

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

export function resolveProductRevealPlan(args: {
  project: Project;
  generationMode: GenerationMode;
  assets: readonly AssetRef[];
  narrative: VisualNarrativePlan | null;
  visualMedium: VisualMedium;
}): ProductRevealPlan {
  const reasons: string[] = [];
  const samplePayoff = args.generationMode === "sample";

  const asset = bestAssetForReveal(args.assets);
  if (!asset) {
    reasons.push("no_tier13_asset");
    const strategy = pickNonAssetStrategy(args.narrative, args.visualMedium, reasons);
    return {
      version: PRODUCT_REVEAL_VERSION,
      solution_beat_strategy: strategy,
      reasons,
      sample_payoff_visual_required: samplePayoff,
    };
  }

  const assetClass = classifyAsset(asset.asset_class, null);
  const usedAsFramed =
    "Show this product UI inside a phone mockup held naturally in one hand, screen facing the viewer.";
  const fit = isAssetSceneRenderableByCurrentPipeline({
    assetClass,
    usedAs: usedAsFramed,
    videoUsage: asset.preferred_video_usage ?? "framed_phone",
    modify: "false",
  });

  if (fit.renderable && fit.reason === "framed_insert") {
    reasons.push(`asset_framed:${asset.id}`);
    return {
      version: PRODUCT_REVEAL_VERSION,
      solution_beat_strategy: "FRAMED_ASSET",
      reasons,
      sample_payoff_visual_required: samplePayoff,
    };
  }

  if (assetClass === "static" && fit.reason === "not_framed_placement") {
    const heroUsedAs = "Product UI screenshot centered in frame, clean background.";
    const heroFit = isAssetSceneRenderableByCurrentPipeline({
      assetClass,
      usedAs: heroUsedAs,
      videoUsage: "floating_card",
      modify: "false",
    });
    if (heroFit.renderable) {
      reasons.push(`asset_real:${asset.id}`);
      return {
        version: PRODUCT_REVEAL_VERSION,
        solution_beat_strategy: "REAL_ASSET",
        reasons,
        sample_payoff_visual_required: samplePayoff,
      };
    }
  }

  if (assetClass !== "static") {
    const modifyFit = isAssetSceneRenderableByCurrentPipeline({
      assetClass,
      usedAs: usedAsFramed,
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
  } else {
    reasons.push(`asset_not_renderable:${fit.reason}`);
  }

  const fallback = pickNonAssetStrategy(args.narrative, args.visualMedium, reasons);
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
