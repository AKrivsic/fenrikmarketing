// Asset coverage policy for production series + sample mode.
//   npm run check:asset-coverage-policy

import assert from "node:assert/strict";
import {
  buildAssetCoveragePromptBlock,
  filterSampleQualityAssets,
  filterSeriesAnchorAssets,
  isQualityProductAsset,
  isTier3LogoAsset,
  pickAssetSlotIndices,
  resolvePackageAssetCoverage,
  seriesAssetSlotCount,
  SERIES_ASSET_COVERAGE_TARGET,
  slotsHaveMinimumGap,
} from "@/lib/assets/assetCoveragePolicy";
import {
  buildGenerateContentPackagePrompt,
  type AssetRef,
} from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { Project } from "@/lib/supabase/types";
import {
  assetCoverageGuardrailRequired,
  assetCoverageGuardrailShouldUse,
  type AssetCoverageDecision,
} from "@/lib/assets/assetCoveragePolicy";
import {
  isAssetSceneRenderableByCurrentPipeline,
  downgradeUnrenderableAssetScenes,
} from "@/lib/assets/assetRendererEligibility";

function assetUsageGuardrailIssues(
  pkg: ContentPackageOutput,
  decision: AssetCoverageDecision,
): { path: string; message: string }[] {
  if (decision.qualityAssetCount <= 0) return [];
  const usage = pkg.asset_usage ?? [];
  if (assetCoverageGuardrailRequired(decision) && usage.length === 0) {
    return [
      {
        path: "$.asset_usage",
        message:
          "Sample mode requires at least one asset_usage when quality product assets exist.",
      },
    ];
  }
  if (assetCoverageGuardrailShouldUse(decision) && usage.length === 0) {
    return [
      {
        path: "$.asset_usage",
        message:
          "This package should include asset_usage (series coverage slot); add at least one quality product asset.",
      },
    ];
  }
  return [];
}

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

const uiAsset: AssetRef = {
  id: "a-ui",
  title: "App dashboard",
  asset_class: "static",
  media_type: "image",
  product_role: "product_ui",
  asset_quality: "high",
  capture_viewport: "mobile",
  safe_vertical_usage: true,
  orientation: "portrait",
  video_suitability: "primary_scene",
};

const desktopUiAsset: AssetRef = {
  id: "a-desktop",
  title: "Desktop app",
  asset_class: "static",
  media_type: "image",
  product_role: "product_ui",
  capture_viewport: "desktop",
  safe_vertical_usage: false,
  orientation: "landscape",
  video_suitability: "screen_insert",
};

const heroAsset: AssetRef = {
  id: "a-hero",
  title: "Social preview",
  asset_class: "static",
  media_type: "image",
  product_role: "hero_image",
  asset_quality: "medium",
};

const logoAsset: AssetRef = {
  id: "a-logo",
  title: "Brand logo",
  asset_class: "static",
  media_type: "image",
  product_role: "logo",
  asset_quality: "high",
};

const faviconAsset: AssetRef = {
  id: "a-fav",
  title: "Website favicon",
  asset_class: "static",
  media_type: "image",
  product_role: "logo",
  asset_quality: "low",
};

const directives: CreativeDirectives = {
  mode: CREATIVE_MODES[0],
  hook: HOOK_ARCHETYPES[0],
  persona: VOICE_PERSONAS[0],
};

function emptyPackage(): ContentPackageOutput {
  return {
    title: "T",
    funnel_stage: "awareness",
    hook: "H",
    voiceover_text: "Body text for the short.",
    subtitles: "Body",
    cta: { type: "learn_more", text: "Go" },
    video: { concept: "c", script: "s" },
    image_prompts: ["a", "b", "c"],
    platform_outputs: {
      tiktok: { caption: "cap", cta: "cta" },
    },
  } as ContentPackageOutput;
}

function assertSeriesPlan(packageCount: number, assets: AssetRef[] = [uiAsset]) {
  const slots = seriesAssetSlotCount(packageCount);
  const indices = pickAssetSlotIndices(packageCount, slots);
  assert.ok(slotsHaveMinimumGap(indices), `adjacent slots at N=${packageCount}`);
  const decision = resolvePackageAssetCoverage({
    generationMode: "production",
    funnelStage: "solution_aware",
    packageIndex: indices[0] ?? 0,
    packageCount,
    availableAssets: assets,
  });
  assert.equal(decision.seriesSlotIndices.length, indices.length);
  assert.ok(decision.qualityAssetCount > 0);
  return { slots, indices, decision };
}

section("asset tiers");

check("product_ui is quality (tier 1)", () => {
  assert.ok(isQualityProductAsset(uiAsset));
});

check("logo alone is tier 3 but not a series anchor", () => {
  assert.ok(isTier3LogoAsset(logoAsset));
  assert.deepEqual(filterSeriesAnchorAssets([logoAsset]), []);
  assert.ok(filterSampleQualityAssets([logoAsset]).length === 1);
});

check("low favicon does not count", () => {
  assert.equal(isQualityProductAsset(faviconAsset), false);
});

section("sample mode");

check("sample with tier-1 asset prefers usage (not required guardrail)", () => {
  const decision = resolvePackageAssetCoverage({
    generationMode: "sample",
    funnelStage: "awareness",
    packageIndex: 0,
    packageCount: 1,
    availableAssets: [uiAsset],
  });
  assert.equal(decision.stance, "may_use");
  assert.deepEqual(assetUsageGuardrailIssues(emptyPackage(), decision), []);
  const block = buildAssetCoveragePromptBlock(decision, "sample");
  assert.ok(/STRONGLY PREFER/i.test(block));
});

check("sample without quality asset passes with empty asset_usage", () => {
  const decision = resolvePackageAssetCoverage({
    generationMode: "sample",
    funnelStage: "awareness",
    packageIndex: 0,
    packageCount: 1,
    availableAssets: [faviconAsset],
  });
  assert.equal(decision.stance, "optional");
  assert.deepEqual(assetUsageGuardrailIssues(emptyPackage(), decision), []);
});

section("production packageCount 1");

check("single package does not require asset_usage", () => {
  const decision = resolvePackageAssetCoverage({
    generationMode: "production",
    funnelStage: "awareness",
    packageIndex: 0,
    packageCount: 1,
    availableAssets: [uiAsset],
  });
  assert.equal(decision.stance, "optional");
  assert.deepEqual(assetUsageGuardrailIssues(emptyPackage(), decision), []);
});

check("single package solution_aware recommends asset (may_use)", () => {
  const decision = resolvePackageAssetCoverage({
    generationMode: "production",
    funnelStage: "solution_aware",
    packageIndex: 0,
    packageCount: 1,
    availableAssets: [uiAsset],
  });
  assert.equal(decision.stance, "may_use");
});

section("percentage series coverage");

check("target is ~30%", () => {
  assert.equal(SERIES_ASSET_COVERAGE_TARGET, 0.3);
});

check("packageCount 2 has zero slots", () => {
  assert.equal(seriesAssetSlotCount(2), 0);
});

for (const n of [3, 9, 17, 21] as const) {
  check(`packageCount ${n} — slot count from ~30% rule`, () => {
    const slots = seriesAssetSlotCount(n);
    assert.ok(n >= 3 ? slots >= 1 : true);
    assert.ok(slots <= n);
    const expected = Math.min(n, Math.max(n >= 3 ? 1 : 0, Math.round(n * 0.3)));
    assert.equal(slots, expected);
  });

  check(`packageCount ${n} — spread slots without adjacency`, () => {
    const { slots, indices } = assertSeriesPlan(n);
    assert.equal(indices.length, slots);
  });
}

section("funnel strength");

check("awareness slotted package is may_use", () => {
  const indices = pickAssetSlotIndices(9, seriesAssetSlotCount(9));
  const decision = resolvePackageAssetCoverage({
    generationMode: "production",
    funnelStage: "awareness",
    packageIndex: indices[0],
    packageCount: 9,
    availableAssets: [uiAsset],
  });
  assert.equal(decision.stance, "may_use");
});

check("conversion slotted package is should_use", () => {
  const indices = pickAssetSlotIndices(9, seriesAssetSlotCount(9));
  const decision = resolvePackageAssetCoverage({
    generationMode: "production",
    funnelStage: "conversion",
    packageIndex: indices[0],
    packageCount: 9,
    availableAssets: [uiAsset],
  });
  assert.equal(decision.stance, "should_use");
});

check("logo-only library does not assign production series slots", () => {
  const decision = resolvePackageAssetCoverage({
    generationMode: "production",
    funnelStage: "solution_aware",
    packageIndex: 0,
    packageCount: 9,
    availableAssets: [logoAsset],
  });
  assert.equal(decision.seriesSlotIndices.length, 0);
  assert.equal(decision.stance, "optional");
});

check("desktop tier-1 library still enables production series slots", () => {
  const decision = resolvePackageAssetCoverage({
    generationMode: "production",
    funnelStage: "solution_aware",
    packageIndex: 4,
    packageCount: 9,
    availableAssets: [desktopUiAsset],
  });
  assert.ok(decision.qualityAssetCount > 0);
  assert.ok(decision.seriesSlotIndices.length > 0);
});

section("asset renderer eligibility");

check("static asset + people in used_as is not renderable", () => {
  const fit = isAssetSceneRenderableByCurrentPipeline({
    assetClass: "static",
    usedAs:
      "A founder and developer sit side by side looking at a laptop showing the UI",
    videoUsage: "framed_laptop",
  });
  assert.equal(fit.renderable, false);
  assert.equal(fit.reason, "needs_full_scene");
});

check("static asset + framed laptop insert is renderable", () => {
  const fit = isAssetSceneRenderableByCurrentPipeline({
    assetClass: "static",
    usedAs: "Show this UI inside a laptop screen insert, not fullscreen",
    videoUsage: "framed_laptop",
  });
  assert.equal(fit.renderable, true);
});

check("unknown video_usage downgrades via pipeline helper", () => {
  const result = downgradeUnrenderableAssetScenes({
    scenes: [
      {
        source: "asset",
        asset_id: "a-ui",
        used_as: "Product UI on screen",
        video_usage: "correct_approach_beat",
      },
    ],
    classById: new Map([["a-ui", "static"]]),
  });
  assert.equal(result.downgradedCount, 1);
  assert.equal((result.scenes[0] as { source: string }).source, "ai");
});

section("prompt + no assets backward compat");

check("production without quality assets — optional stance", () => {
  const decision = resolvePackageAssetCoverage({
    generationMode: "production",
    funnelStage: "awareness",
    packageIndex: 0,
    packageCount: 9,
    availableAssets: [],
  });
  assert.equal(decision.stance, "optional");
  const block = buildAssetCoveragePromptBlock(decision, "production");
  assert.ok(/optional/i.test(block));
});

check("prompt includes PACKAGE ASSET COVERAGE when decision computed", () => {
  const decision = resolvePackageAssetCoverage({
    generationMode: "production",
    funnelStage: "solution_aware",
    packageIndex: 3,
    packageCount: 17,
    availableAssets: [uiAsset, heroAsset],
  });
  const prompt = buildGenerateContentPackagePrompt({
    project: {
      id: "p",
      name: "Co",
      type: "service",
      language: "en",
      market_scope: "global",
      goal_type: "awareness",
      target_audience: {},
      product_is: [],
      product_is_not: [],
      product_strengths: [],
      pain_points: [],
      forbidden_claims: [],
      tone_of_voice: {},
      platforms: [],
      publishing_rules: {},
      default_cta: null,
    } as unknown as Project,
    funnelStage: "solution_aware",
    topic: "t",
    availableAssets: [uiAsset],
    targetPlatforms: ["tiktok"],
    requireVideo: true,
    videoPlatforms: ["tiktok"],
    directives,
    assetCoverage: decision,
  });
  assert.ok(prompt.includes("PACKAGE ASSET COVERAGE"));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
