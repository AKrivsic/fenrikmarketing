import type { GenerationMode } from "@/lib/ai/generationMode";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import type { FunnelStage } from "@/lib/ai/types";
import type { AssetQualityTier } from "@/lib/assets/assetIngestMetadata";
import type { ProductRole } from "@/lib/assets/productRole";

// Phase 2A ownership:
//   Decision: Asset Policy
//   Owner: PACKAGE ASSET COVERAGE (this module) when quality assets exist
//   Fallback: Funnel Asset Policy (lib/ai/prompts/funnelAssetPolicy.ts)
//   Illegal writers: Funnel echo when Coverage present; invented asset ids

export type AssetCoverageStance =
  | "required"
  | "should_use"
  | "may_use"
  | "avoid_unless_natural"
  | "optional";

export type AssetCoverageTier = 1 | 2 | 3;

export interface AssetCoverageDecision {
  stance: AssetCoverageStance;
  qualityAssetCount: number;
  /** 0-based indices in the run that should use assets (whole series plan). */
  seriesSlotIndices: number[];
  preferredRoles: ProductRole[];
  packageIndex: number | null;
  packageCount: number | null;
}

const TIER1_ROLES: readonly ProductRole[] = [
  "product_ui",
  "dashboard",
  "homepage_screenshot",
  "pricing_screenshot",
];

const TIER2_ROLES: readonly ProductRole[] = ["hero_image"];

/** Target share of packages in a run that should use product assets (~30%). */
export const SERIES_ASSET_COVERAGE_TARGET = 0.3;

function titleHaystack(ref: AssetRef): string {
  return `${ref.title} ${ref.detected_content_type ?? ""}`.toLowerCase();
}

export function isLowQualityForCoverage(ref: AssetRef): boolean {
  if (ref.asset_quality === "low") return true;
  if (ref.product_role === "decorative") return true;
  const hay = titleHaystack(ref);
  if (hay.includes("favicon")) return true;
  return false;
}

export function assetCoverageTier(ref: AssetRef): AssetCoverageTier | null {
  if (isLowQualityForCoverage(ref)) return null;
  const role = ref.product_role;
  if (role && (TIER1_ROLES as readonly string[]).includes(role)) return 1;
  if (role && (TIER2_ROLES as readonly string[]).includes(role)) return 2;
  if (role === "logo") {
    if (titleHaystack(ref).includes("favicon")) return null;
    return 3;
  }
  return null;
}

export function isTier1ProductAsset(ref: AssetRef): boolean {
  return assetCoverageTier(ref) === 1;
}

export function isTier1ProductRole(role: ProductRole | null): boolean {
  return role !== null && (TIER1_ROLES as readonly string[]).includes(role);
}

export function isTier2HeroAsset(ref: AssetRef): boolean {
  return assetCoverageTier(ref) === 2;
}

export function isTier3LogoAsset(ref: AssetRef): boolean {
  return assetCoverageTier(ref) === 3;
}

/** Tier 1–2: primary series anchors (logo alone does not enable series coverage). */
export function filterSeriesAnchorAssets(assets: AssetRef[]): AssetRef[] {
  return assets.filter((a) => {
    const tier = assetCoverageTier(a);
    return tier === 1 || tier === 2;
  });
}

/** Tier 1–3: sample mode may require asset_usage (logo counts, not favicon). */
export function filterSampleQualityAssets(assets: AssetRef[]): AssetRef[] {
  return assets.filter((a) => assetCoverageTier(a) !== null);
}

/** @deprecated Use filterSampleQualityAssets / filterSeriesAnchorAssets. */
export function isQualityProductAsset(ref: AssetRef): boolean {
  return assetCoverageTier(ref) !== null;
}

/** @deprecated Use filterSeriesAnchorAssets or filterSampleQualityAssets. */
export function filterQualityProductAssets(assets: AssetRef[]): AssetRef[] {
  return filterSampleQualityAssets(assets);
}

/** How many packages in a run should use product assets (percentage-based). */
export function seriesAssetSlotCount(packageCount: number): number {
  if (packageCount <= 1) return 0;
  if (packageCount === 2) return 0;
  let count = Math.round(packageCount * SERIES_ASSET_COVERAGE_TARGET);
  count = Math.max(1, count);
  return Math.min(count, packageCount);
}

/** @deprecated Use seriesAssetSlotCount. */
export function seriesAssetSlotMinimum(packageCount: number): number {
  return seriesAssetSlotCount(packageCount);
}

/** Evenly spread slot indices; never place two asset slots on adjacent packages. */
export function pickAssetSlotIndices(
  packageCount: number,
  slotCount: number,
): number[] {
  if (packageCount <= 0 || slotCount <= 0) return [];
  const slots = Math.min(slotCount, packageCount);
  if (slots === 1) {
    return [Math.floor((packageCount - 1) / 2)];
  }

  const indices: number[] = [];
  for (let i = 0; i < slots; i++) {
    let idx = Math.floor(((i + 0.5) * packageCount) / slots);
    idx = Math.min(packageCount - 1, Math.max(0, idx));
    if (indices.length > 0) {
      const prev = indices[indices.length - 1];
      if (idx <= prev + 1) {
        idx = prev + 2;
      }
    }
    if (idx >= packageCount) break;
    indices.push(idx);
  }
  return indices;
}

export function slotsHaveMinimumGap(indices: number[], minGap: number = 2): boolean {
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] - indices[i - 1] < minGap) return false;
  }
  return true;
}

function preferredRolesForPackage(
  packageIndex: number,
  funnelStage: FunnelStage,
  slotUsesLogo: boolean,
): ProductRole[] {
  const tier1Cycle: ProductRole[][] = [
    ["product_ui", "dashboard"],
    ["homepage_screenshot", "pricing_screenshot"],
    ["product_ui", "homepage_screenshot"],
  ];
  const base = tier1Cycle[packageIndex % tier1Cycle.length];
  const withHero: ProductRole[] = [...base, "hero_image"];

  if (funnelStage === "conversion") {
    return slotUsesLogo
      ? [...withHero, "logo"]
      : ["product_ui", "dashboard", "homepage_screenshot", "hero_image"];
  }
  if (funnelStage === "solution_aware") {
    return withHero;
  }
  return withHero;
}

function stanceForSlottedPackage(funnelStage: FunnelStage): AssetCoverageStance {
  if (funnelStage === "awareness" || funnelStage === "problem_aware") {
    return "may_use";
  }
  return "should_use";
}

function singlePackageProductionStance(
  funnelStage: FunnelStage,
  seriesAnchors: AssetRef[],
): AssetCoverageStance {
  const anchors = seriesAnchors;
  if (anchors.length === 0) return "optional";
  const hasUi = anchors.some(
    (a) => a.product_role === "product_ui" || a.product_role === "dashboard",
  );
  if (
    (funnelStage === "solution_aware" || funnelStage === "conversion") &&
    hasUi
  ) {
    return "may_use";
  }
  return "optional";
}

export function resolvePackageAssetCoverage(input: {
  generationMode: GenerationMode;
  funnelStage: FunnelStage;
  packageIndex: number | null;
  packageCount: number | null;
  availableAssets: AssetRef[];
}): AssetCoverageDecision {
  const seriesAnchors = filterSeriesAnchorAssets(input.availableAssets);
  const sampleQuality = filterSampleQualityAssets(input.availableAssets);

  const packageCount =
    typeof input.packageCount === "number" && input.packageCount > 0
      ? Math.trunc(input.packageCount)
      : null;
  const packageIndex =
    typeof input.packageIndex === "number" && Number.isFinite(input.packageIndex)
      ? Math.trunc(input.packageIndex)
      : null;

  const slotTarget =
    packageCount !== null && seriesAnchors.length > 0
      ? seriesAssetSlotCount(packageCount)
      : 0;
  const seriesSlotIndices =
    packageCount !== null && slotTarget > 0
      ? pickAssetSlotIndices(packageCount, slotTarget)
      : [];

  const slotUsesLogo =
    packageIndex !== null &&
    seriesSlotIndices.includes(packageIndex) &&
    input.funnelStage === "conversion" &&
    packageIndex === seriesSlotIndices[seriesSlotIndices.length - 1];

  const preferredRoles =
    packageIndex !== null
      ? preferredRolesForPackage(
          packageIndex,
          input.funnelStage,
          slotUsesLogo,
        )
      : [];

  if (input.generationMode === "sample") {
    if (sampleQuality.length === 0) {
      return {
        stance: "optional",
        qualityAssetCount: 0,
        seriesSlotIndices,
        preferredRoles,
        packageIndex,
        packageCount,
      };
    }
    return {
      stance: "may_use",
      qualityAssetCount: sampleQuality.length,
      seriesSlotIndices,
      preferredRoles: [
        "product_ui",
        "dashboard",
        "homepage_screenshot",
        "pricing_screenshot",
        "hero_image",
        "logo",
      ],
      packageIndex,
      packageCount,
    };
  }

  if (seriesAnchors.length === 0) {
    return {
      stance: "optional",
      qualityAssetCount: 0,
      seriesSlotIndices,
      preferredRoles,
      packageIndex,
      packageCount,
    };
  }

  if (packageCount === 1 || packageCount === null) {
    return {
      stance: singlePackageProductionStance(
        input.funnelStage,
        seriesAnchors,
      ),
      qualityAssetCount: seriesAnchors.length,
      seriesSlotIndices,
      preferredRoles:
        packageIndex !== null
          ? preferredRolesForPackage(
              packageIndex,
              input.funnelStage,
              false,
            )
          : preferredRolesForPackage(0, input.funnelStage, false),
      packageIndex: packageIndex ?? 0,
      packageCount,
    };
  }

  if (packageIndex === null) {
    return {
      stance: "optional",
      qualityAssetCount: seriesAnchors.length,
      seriesSlotIndices,
      preferredRoles,
      packageIndex,
      packageCount,
    };
  }

  if (seriesSlotIndices.includes(packageIndex)) {
    return {
      stance: stanceForSlottedPackage(input.funnelStage),
      qualityAssetCount: seriesAnchors.length,
      seriesSlotIndices,
      preferredRoles: preferredRolesForPackage(
        packageIndex,
        input.funnelStage,
        slotUsesLogo,
      ),
      packageIndex,
      packageCount,
    };
  }

  return {
    stance: "avoid_unless_natural",
    qualityAssetCount: seriesAnchors.length,
    seriesSlotIndices,
    preferredRoles,
    packageIndex,
    packageCount,
  };
}

export function assetCoverageGuardrailRequired(
  decision: AssetCoverageDecision,
): boolean {
  return decision.stance === "required";
}

export function assetCoverageGuardrailShouldUse(
  decision: AssetCoverageDecision,
): boolean {
  return decision.stance === "should_use";
}

export function buildAssetCoveragePromptBlock(
  decision: AssetCoverageDecision,
  generationMode: GenerationMode,
): string {
  if (decision.qualityAssetCount === 0) {
    return [
      "PACKAGE ASSET COVERAGE (no quality product assets in library):",
      "- asset_usage remains optional; empty asset_usage is valid.",
    ].join("\n");
  }

  const humanPkg =
    decision.packageIndex !== null ? decision.packageIndex + 1 : "?";
  const humanCount =
    decision.packageCount !== null ? String(decision.packageCount) : "?";
  const slotList =
    decision.seriesSlotIndices.length > 0
      ? decision.seriesSlotIndices.map((i) => i + 1).join(", ")
      : "—";
  const targetPct = Math.round(SERIES_ASSET_COVERAGE_TARGET * 100);

  const lines = [
    "PACKAGE ASSET COVERAGE (series planning — rotate assets, do not use the same asset_id in every package):",
    `- Run size: ${humanCount} packages. Target ~${targetPct}% with product assets. Asset-forward slots (1-based indices): ${slotList}.`,
    `- Asset tiers: Tier 1 = product_ui/dashboard/homepage/pricing; Tier 2 = hero_image; Tier 3 = logo (CTA/end only, not a substitute for Tier 1).`,
    `- This package: #${humanPkg}.`,
  ];

  switch (decision.stance) {
    case "required":
      lines.push(
        "- THIS PACKAGE: you MUST include at least one asset_usage referencing a quality product asset listed above.",
        "- Prefer Tier 1 (product_ui / dashboard); Tier 2 hero if no Tier 1 fits.",
        "- Tier 3 logo only near CTA / end framing, not as the opening hook.",
        "- Low-quality favicon / decorative assets do not count.",
      );
      break;
    case "should_use":
      lines.push(
        "- THIS PACKAGE: SHOULD use at least one Tier 1–2 product asset in asset_usage when it fits the story.",
        `- Prefer roles: ${decision.preferredRoles.join(", ")}.`,
        "- Pick a less recently used asset_id when RECENT ASSET USAGE is shown.",
        "- Other packages in the run stay mostly AI-led; do not force assets everywhere.",
      );
      break;
    case "may_use":
      if (generationMode === "sample" && decision.qualityAssetCount > 0) {
        lines.push(
          "- THIS PACKAGE (SAMPLE): STRONGLY PREFER one Tier 1–2 product asset when the current renderer can show it well.",
          "- Use asset ONLY with a concrete framed insert (laptop/monitor/phone mockup, floating card, ui_hero) — see SMART ASSET USAGE RULES.",
          "- Do NOT describe people, rooms, or full scenes around a static screenshot unless modify=true on an editable asset (rare).",
          "- If a quality asset would look like a raw cropped screenshot or break the story, skip asset_usage and use IMAGE instead.",
          "- Empty asset_usage is VALID — never worsen the video to satisfy asset preference.",
          `- Prefer roles: ${decision.preferredRoles.join(", ")}.`,
        );
      } else {
        lines.push(
          "- THIS PACKAGE: MAY use one Tier 1–2 product asset as a light product anchor if it fits naturally.",
          `- Prefer roles: ${decision.preferredRoles.join(", ")}.`,
          "- Empty asset_usage is still valid if the story is stronger without assets.",
        );
      }
      break;
    case "avoid_unless_natural":
      lines.push(
        "- THIS PACKAGE: SHOULD AVOID assets unless essential — keep this output mostly AI-generated.",
        "- Do not repeat the same asset_id already used heavily in RECENT ASSET USAGE.",
      );
      break;
    case "optional":
      if (generationMode === "production") {
        lines.push(
          "- THIS PACKAGE: assets optional (single-package run or no slot assigned).",
        );
      }
      break;
  }

  return lines.join("\n");
}

/** For tests — extend AssetRef with quality in fixtures. */
export function assetRefWithQuality(
  partial: AssetRef & { asset_quality?: AssetQualityTier | null },
): AssetRef {
  return partial;
}
