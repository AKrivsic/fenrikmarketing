import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import {
  assetCoverageTier,
  type AssetCoverageDecision,
  type AssetCoverageTier,
} from "@/lib/assets/assetCoveragePolicy";
import {
  authenticityRank,
  computeProductPresentationAssetMetadata,
  isEligibleForAuthenticProductClaim,
  type AuthenticityForProductClaim,
  type ProvenanceClass,
} from "@/lib/assets/productPresentationMetadata";
import type {
  ProductRevealPlan,
  ProductRevealStrategy,
} from "@/lib/product-reveal/types";
import type { VisualNarrativePlan } from "@/lib/visual-narrative/types";
import { defaultProductPresentationCapabilities } from "./capabilities";
import {
  FORBIDDEN_PRESENTATION_FORMS,
  PRODUCT_PRESENTATION_VERSION,
  type AppearanceClaim,
  type FidelityTier,
  type PresentationClass,
  type ProductPresentationPlan,
  type ValueProofMode,
} from "./types";

function assetsAtTiers(
  assets: AssetRef[],
  allowed: ReadonlySet<AssetCoverageTier>,
): AssetRef[] {
  return assets.filter((a) => {
    const tier = assetCoverageTier(a);
    return tier !== null && allowed.has(tier);
  });
}

function resolveAssetAuthenticity(asset: AssetRef): AuthenticityForProductClaim {
  if (asset.authenticity_for_product_claim) {
    return asset.authenticity_for_product_claim;
  }
  // Fallback for AssetRefs built without Wave 2 fields (tests / legacy callers).
  return computeProductPresentationAssetMetadata({
    metadata: {
      source:
        asset.provenance_class === "scraped"
          ? "website_ingestion"
          : asset.provenance_class === "component_capture"
            ? "component_capture"
            : asset.provenance_class === "client_upload"
              ? "upload"
              : undefined,
      product_role: asset.product_role,
      asset_quality: asset.asset_quality,
      video_suitability: asset.video_suitability,
      provenance_class: asset.provenance_class,
    },
    productRole: asset.product_role ?? null,
    assetQuality: asset.asset_quality ?? null,
    videoSuitability: (asset.video_suitability as
      | "primary_scene"
      | "screen_insert"
      | "end_card"
      | "branding_prop"
      | "background_only"
      | "avoid_fullscreen"
      | "unknown"
      | null) ?? null,
  }).authenticity_for_product_claim;
}

function resolveAssetProvenance(asset: AssetRef): ProvenanceClass {
  if (asset.provenance_class) return asset.provenance_class;
  return computeProductPresentationAssetMetadata({
    metadata: {
      product_role: asset.product_role,
      asset_quality: asset.asset_quality,
    },
    productRole: asset.product_role ?? null,
    assetQuality: asset.asset_quality ?? null,
  }).provenance_class;
}

/**
 * Prefer eligible client-upload authentic surfaces over weak / scraped.
 * Never returns a non-eligible asset for AUTHENTIC binding.
 */
function pickBestAuthenticAsset(assets: AssetRef[]): AssetRef | null {
  const pool = assetsAtTiers(assets, new Set([1, 2])).filter((a) =>
    isEligibleForAuthenticProductClaim(resolveAssetAuthenticity(a)),
  );
  if (pool.length === 0) return null;

  const ranked = [...pool].sort((a, b) => {
    const authCmp =
      authenticityRank(resolveAssetAuthenticity(a)) -
      authenticityRank(resolveAssetAuthenticity(b));
    if (authCmp !== 0) return authCmp;

    const provRank = (p: ProvenanceClass): number => {
      if (p === "client_upload") return 0;
      if (p === "scraped") return 1;
      if (p === "component_capture") return 2;
      return 3;
    };
    const provCmp =
      provRank(resolveAssetProvenance(a)) - provRank(resolveAssetProvenance(b));
    if (provCmp !== 0) return provCmp;

    const qRank = (q: AssetRef["asset_quality"]): number => {
      if (q === "high") return 0;
      if (q === "medium") return 1;
      if (q === "low") return 2;
      return 3;
    };
    return qRank(a.asset_quality) - qRank(b.asset_quality);
  });

  return ranked[0] ?? null;
}

function logoAssetIds(assets: AssetRef[]): string[] {
  return assetsAtTiers(assets, new Set([3])).map((a) => a.id);
}

function classForRevealWithAsset(
  ceiling: ProductRevealStrategy,
): PresentationClass {
  if (ceiling === "FRAMED_ASSET" || ceiling === "PRODUCT_INTERACTION") {
    return "AUTHENTIC_PRODUCT_IN_CONTEXT";
  }
  return "AUTHENTIC_PRODUCT_SURFACE";
}

function fidelityForClass(cls: PresentationClass): FidelityTier {
  switch (cls) {
    case "AUTHENTIC_PRODUCT_SURFACE":
    case "AUTHENTIC_PRODUCT_IN_CONTEXT":
      return "authentic_asset";
    case "BRAND_SIGNAL_ONLY":
      return "brand_only";
    case "PRODUCT_OUTCOME_WORLD":
    case "ABSTRACT_MECHANISM":
      return "non_product_visual";
    case "NO_PRODUCT_APPEARANCE":
      return "none";
  }
}

function claimForClass(cls: PresentationClass): AppearanceClaim {
  switch (cls) {
    case "AUTHENTIC_PRODUCT_SURFACE":
    case "AUTHENTIC_PRODUCT_IN_CONTEXT":
      return "AUTHENTIC";
    case "NO_PRODUCT_APPEARANCE":
      return "NONE";
    default:
      return "NON_PRODUCT";
  }
}

function valueProofForClass(cls: PresentationClass): ValueProofMode {
  switch (cls) {
    case "AUTHENTIC_PRODUCT_SURFACE":
    case "AUTHENTIC_PRODUCT_IN_CONTEXT":
      return "via_authentic_appearance";
    case "PRODUCT_OUTCOME_WORLD":
      return "via_world_outcome";
    case "ABSTRACT_MECHANISM":
      return "via_abstract_mechanism";
    case "BRAND_SIGNAL_ONLY":
    case "NO_PRODUCT_APPEARANCE":
      return "via_story_without_product_pixels";
  }
}

/**
 * AUTHENTIC appearance is only allowed when Reveal ceiling permits real/framed
 * product pixels. Outcome / abstract / no-visual ceilings forbid AUTHENTIC.
 */
function authenticAllowedByReveal(ceiling: ProductRevealStrategy | null): boolean {
  if (!ceiling) return false;
  return (
    ceiling === "REAL_ASSET" ||
    ceiling === "FRAMED_ASSET" ||
    ceiling === "PRODUCT_INTERACTION"
  );
}

function planFromNonAuthenticCeiling(
  ceiling: ProductRevealStrategy,
  reasons: string[],
): Omit<
  ProductPresentationPlan,
  "compatible_with_reveal" | "reveal_ceiling" | "version" | "forbidden_forms"
> {
  if (ceiling === "NO_PRODUCT_VISUAL") {
    return {
      should_show_product_appearance: false,
      presentation_class: "NO_PRODUCT_APPEARANCE",
      fidelity_tier: "none",
      asset_binding: [],
      appearance_claim: "NONE",
      value_proof_mode: "via_story_without_product_pixels",
      rationale: [
        ...reasons,
        "Reveal ceiling NO_PRODUCT_VISUAL → no product appearance",
      ],
    };
  }
  if (ceiling === "PRODUCT_OUTCOME") {
    return {
      should_show_product_appearance: false,
      presentation_class: "PRODUCT_OUTCOME_WORLD",
      fidelity_tier: "non_product_visual",
      asset_binding: [],
      appearance_claim: "NON_PRODUCT",
      value_proof_mode: "via_world_outcome",
      rationale: [
        ...reasons,
        "Reveal ceiling PRODUCT_OUTCOME → world/outcome visual, not product UI",
      ],
    };
  }
  // ABSTRACT_PRODUCT_SYSTEM
  return {
    should_show_product_appearance: false,
    presentation_class: "ABSTRACT_MECHANISM",
    fidelity_tier: "non_product_visual",
    asset_binding: [],
    appearance_claim: "NON_PRODUCT",
    value_proof_mode: "via_abstract_mechanism",
    rationale: [
      ...reasons,
      "Reveal ceiling ABSTRACT_PRODUCT_SYSTEM → abstract mechanism, not fake UI",
    ],
  };
}

function scarcityFallback(
  narrative: VisualNarrativePlan | null,
  logos: string[],
  reasons: string[],
): Omit<
  ProductPresentationPlan,
  "compatible_with_reveal" | "reveal_ceiling" | "version" | "forbidden_forms"
> {
  if (logos.length > 0) {
    return {
      should_show_product_appearance: false,
      presentation_class: "BRAND_SIGNAL_ONLY",
      fidelity_tier: "brand_only",
      asset_binding: logos.slice(0, 1),
      appearance_claim: "NON_PRODUCT",
      value_proof_mode: "via_story_without_product_pixels",
      rationale: [
        ...reasons,
        "No authentic product surface asset; brand signal only (logo ≠ product demo)",
      ],
    };
  }

  const carrier = narrative?.primary_meaning_carrier;
  if (
    carrier === "human" ||
    carrier === "place" ||
    carrier === "transformation" ||
    carrier === "comparison"
  ) {
    return {
      should_show_product_appearance: false,
      presentation_class: "PRODUCT_OUTCOME_WORLD",
      fidelity_tier: "non_product_visual",
      asset_binding: [],
      appearance_claim: "NON_PRODUCT",
      value_proof_mode: "via_world_outcome",
      rationale: [
        ...reasons,
        `No authentic asset; narrative carrier "${carrier ?? "unknown"}" → outcome world`,
      ],
    };
  }

  return {
    should_show_product_appearance: false,
    presentation_class: "ABSTRACT_MECHANISM",
    fidelity_tier: "non_product_visual",
    asset_binding: [],
    appearance_claim: "NON_PRODUCT",
    value_proof_mode: "via_abstract_mechanism",
    rationale: [
      ...reasons,
      "No authentic asset; abstract mechanism (never synthetic product UI)",
    ],
  };
}

/**
 * Resolve Product Presentation Decision from Reveal ceiling + assets + narrative.
 * Decision-only: does not emit scenes or mutate creative spine.
 */
export function resolveProductPresentationPlan(args: {
  productReveal: ProductRevealPlan | null;
  assets: AssetRef[];
  visualNarrative: VisualNarrativePlan | null;
  assetCoverage?: AssetCoverageDecision | null;
  funnelStage?: string | null;
}): ProductPresentationPlan | null {
  const { productReveal, assets, visualNarrative, assetCoverage, funnelStage } =
    args;

  if (!productReveal) return null;

  const capabilities = defaultProductPresentationCapabilities();
  const ceiling = productReveal.solution_beat_strategy;
  const baseReasons = [
    ...productReveal.reasons.slice(0, 4),
    ...(funnelStage ? [`funnel_stage=${funnelStage}`] : []),
    ...(assetCoverage
      ? [
          `asset_coverage stance=${assetCoverage.stance} quality_count=${assetCoverage.qualityAssetCount}`,
        ]
      : []),
  ];

  let core: Omit<
    ProductPresentationPlan,
    "compatible_with_reveal" | "reveal_ceiling" | "version" | "forbidden_forms"
  >;

  if (!authenticAllowedByReveal(ceiling)) {
    core = planFromNonAuthenticCeiling(ceiling, baseReasons);
  } else {
    const best = pickBestAuthenticAsset(assets);
    const logos = logoAssetIds(assets);

    if (
      best &&
      capabilities.can_composite_authentic_asset &&
      capabilities.cannot_synthesize_product_ui
    ) {
      // Soft funnel: early funnel may still show authentic product when Reveal
      // already chose REAL/FRAMED — Reveal owns that ceiling; PPD respects it.
      const cls = classForRevealWithAsset(ceiling);
      core = {
        should_show_product_appearance: true,
        presentation_class: cls,
        fidelity_tier: fidelityForClass(cls),
        asset_binding: [best.id],
        appearance_claim: claimForClass(cls),
        value_proof_mode: valueProofForClass(cls),
        rationale: [
          ...baseReasons,
          `Bound eligible authentic asset ${best.id} (provenance=${resolveAssetProvenance(best)}, authenticity=${resolveAssetAuthenticity(best)}, role=${best.product_role ?? "unknown_role"}, quality=${best.asset_quality ?? "n/a"})`,
          `presentation_class=${cls} under Reveal ceiling ${ceiling}`,
        ],
      };
    } else {
      core = scarcityFallback(visualNarrative, logos, [
        ...baseReasons,
        `Reveal ceiling ${ceiling} allows authentic appearance but no eligible (authenticity=eligible) Tier-1/2 asset`,
      ]);
    }
  }

  const appearanceIsAuthentic = core.appearance_claim === "AUTHENTIC";
  const compatible =
    !appearanceIsAuthentic || authenticAllowedByReveal(ceiling);

  return {
    version: PRODUCT_PRESENTATION_VERSION,
    ...core,
    fidelity_tier: fidelityForClass(core.presentation_class),
    appearance_claim: claimForClass(core.presentation_class),
    value_proof_mode: valueProofForClass(core.presentation_class),
    forbidden_forms: [...FORBIDDEN_PRESENTATION_FORMS],
    reveal_ceiling: ceiling,
    compatible_with_reveal: compatible,
    rationale: compatible
      ? core.rationale
      : [...core.rationale, "WARNING: appearance claim exceeds Reveal ceiling"],
  };
}
