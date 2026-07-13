// Series-aware content & video diversity — focused checks.
//   npm run check:series-diversity

import assert from "node:assert/strict";
import { evaluateTypedCtaPolicy, applyTypedCtaSeriesPolicyToVisualScenes } from "@/lib/series/typedCtaPolicy";
import {
  expandSparseVisualPlan,
  targetVisualBeatCount,
} from "@/lib/series/visualDensity";
import {
  pickCtaComposition,
  defaultShowButtonForComposition,
} from "@/lib/scene-types/cta/ctaComposition";
import { buildCtaSvg } from "@/lib/scene-types/cta/composeCtaRaster";
import { resolveChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import { deriveProjectPresentationSignals } from "@/lib/scene-types/presentation/projectSignals";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import { buildSeriesCreativeContextBlock } from "@/lib/series/seriesDiversityPrompt";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import type { SceneTypeProjectHistory } from "@/lib/scene-types/presentation/sceneTypeProjectHistory";
import type { PackageVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import { deviceScreenInteractionBlock } from "@/lib/ai/prompts/visualStyle";
import { resetChecklistProductionRolloutCacheForTests } from "@/lib/scene-types/checklistProductionRollout";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

const emptyHistory: SceneTypeProjectHistory = {
  recentPackages: [],
  lastPackageSpecialTypes: [],
  weeklyStrategySpecialTypes: [],
  ctaUsedInRecentWindow: false,
};

const emptySeries: SeriesCreativeContext = {
  fingerprints: [],
  typedCtaInCurrentRun: 0,
  typedCtaInWeeklyStrategy: 0,
  recentCtaCompositionIds: [],
  recentHooks: [],
  recentCreativeModes: [],
};

const ctaEntry: PackageVisualSceneEntry = {
  type: "CTA",
  payload: {
    headline: "Book a demo",
    subline: "See how it works",
    button_label: "Book now",
    show_logo: true,
  },
};

console.log("\nCTA series policy");
await check("1 awareness package may end without typed CTA", () => {
  const d = evaluateTypedCtaPolicy({
    funnelStage: "awareness",
    history: emptyHistory,
    series: emptySeries,
    requestedTypedCta: true,
  });
  assert.equal(d.allow_typed_cta, false);
});

await check("2 conversion package may use typed CTA", () => {
  const d = evaluateTypedCtaPolicy({
    funnelStage: "conversion",
    history: emptyHistory,
    series: emptySeries,
    requestedTypedCta: true,
  });
  assert.equal(d.allow_typed_cta, true);
});

await check("3 recent CTA suppresses another unnecessary CTA", () => {
  const d = evaluateTypedCtaPolicy({
    funnelStage: "solution_aware",
    history: { ...emptyHistory, ctaUsedInRecentWindow: true },
    series: emptySeries,
    requestedTypedCta: true,
  });
  assert.equal(d.allow_typed_cta, false);
});

await check("4 CTA composition can differ between packages", () => {
  const a = pickCtaComposition({
    packageId: "pkg-a",
    payload: { headline: "Start free", show_button: false },
    funnelStage: "conversion",
    recentCompositionIds: [],
    hasLogoAsset: true,
    hasHeroAsset: false,
    precedingSceneIsAsset: false,
  });
  const b = pickCtaComposition({
    packageId: "pkg-b",
    payload: { headline: "Start free", show_button: false },
    funnelStage: "conversion",
    recentCompositionIds: [],
    hasLogoAsset: true,
    hasHeroAsset: false,
    precedingSceneIsAsset: false,
  });
  assert.notEqual(a, b);
});

await check("5 no fixed button is required", () => {
  assert.equal(
    defaultShowButtonForComposition("text_only", {
      headline: "Thanks for watching",
      show_button: false,
    }),
    false,
  );
  const { svg } = buildCtaSvg({
    payload: { headline: "Thanks for watching", show_button: false },
    tokens: resolveChecklistBrandTokens({ profile: "MINIMAL" }),
    composition: "text_only",
  });
  assert.ok(!svg.includes('font-weight="600" text-anchor="middle"'));
});

console.log("\nScene types & density");
await check("6 scene types remain optional (no CTA requested)", () => {
  const d = evaluateTypedCtaPolicy({
    funnelStage: "conversion",
    history: emptyHistory,
    series: emptySeries,
    requestedTypedCta: false,
  });
  assert.match(d.reason, /no typed CTA requested/i);
});

await check("7 checklist can still be selected by analyzer", () => {
  const prevScene = process.env.SCENE_TYPES_ENABLED;
  const prevList = process.env.CHECKLIST_ENABLED_PROJECT_IDS;
  process.env.SCENE_TYPES_ENABLED = "true";
  process.env.CHECKLIST_ENABLED_PROJECT_IDS =
    "11111111-1111-4111-8111-111111111111";
  resetChecklistProductionRolloutCacheForTests();
  try {
    const proof = buildProofIndex(null);
    const signals = deriveProjectPresentationSignals({
      project: { product_is: ["SaaS"], product_strengths: [] },
      assets: [],
    });
    const result = analyzePresentation({
      scenes: [
        {
          id: "scene-1",
          type: "CHECKLIST",
          payload: {
            items: ["late booking", "wrong size", "missing deposit"],
          },
        },
      ],
      allowedSceneTypes: ["IMAGE", "CHECKLIST"],
      voiceoverText:
        "Three mistakes: late booking, wrong size, missing deposit.",
      proof,
      projectSignals: signals,
      packageCtaText: null,
      projectDefaultCta: null,
      projectId: "11111111-1111-4111-8111-111111111111",
    });
    assert.equal(result.scenes[0]?.type, "CHECKLIST");
  } finally {
    if (prevScene === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prevScene;
    if (prevList === undefined) delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    else process.env.CHECKLIST_ENABLED_PROJECT_IDS = prevList;
  }
});

await check("8 25s video with 2 narrative visuals is expanded", () => {
  const { scenes, density } = expandSparseVisualPlan({
    visualScenes: [
      { source: "ai", image_prompt: "Opening still." },
      { source: "ai", image_prompt: "Second still." },
      ctaEntry,
    ],
    voiceoverText:
      "Line one. Line two. Line three. Line four. Line five. Final thought.",
    durationSeconds: "25",
  });
  const ai = scenes.filter(
    (s) => (s as { source?: string }).source === "ai",
  ).length;
  assert.ok(ai >= 3, `expected >=3 ai scenes, got ${ai}`);
  assert.equal(density.sparse_plan_adjustment, true);
});

await check("9 12s video is not unnecessarily expanded", () => {
  const { density } = expandSparseVisualPlan({
    visualScenes: [
      { source: "ai", image_prompt: "A" },
      { source: "ai", image_prompt: "B" },
      { source: "ai", image_prompt: "C" },
    ],
    voiceoverText: "Short clip.",
    durationSeconds: "12",
  });
  assert.equal(density.sparse_plan_adjustment, false);
  assert.equal(targetVisualBeatCount(12), 3);
});

await check("10 asset + CTA do not block narrative density target", () => {
  const { scenes, density } = expandSparseVisualPlan({
    visualScenes: [
      { source: "ai", image_prompt: "Narrative one." },
      { source: "ai", image_prompt: "Narrative two." },
      {
        source: "asset",
        asset_id: "11111111-1111-4111-8111-111111111111",
        used_as: "Product UI in phone frame at desk",
      },
      ctaEntry,
    ],
    voiceoverText: "One. Two. Three. Four. Five. Six. Seven.",
    durationSeconds: "28",
  });
  assert.ok(density.target_visual_beat_count >= 4);
  const ai = scenes.filter(
    (s) => (s as { source?: string }).source === "ai",
  ).length;
  assert.ok(ai >= 3);
});

console.log("\nSeries prompt & assets");
await check("11 hero asset composition option exists", () => {
  const comp = pickCtaComposition({
    packageId: "pkg",
    payload: {
      headline: "Try it",
      asset_id: "11111111-1111-4111-8111-111111111111",
    },
    funnelStage: "conversion",
    recentCompositionIds: [],
    hasLogoAsset: false,
    hasHeroAsset: true,
    precedingSceneIsAsset: true,
  });
  assert.ok(
    comp === "product_screenshot_overlay" ||
      comp === "asset_overlay" ||
      comp === "split_asset_text",
  );
});

await check("12 series context block mentions distinct package", () => {
  const block = buildSeriesCreativeContextBlock({ series: emptySeries });
  assert.match(block, /larger content series/i);
  assert.match(block, /distinct/i);
});

await check("13 no hard quotas in typed CTA downgrade path", () => {
  const { guardrailDecisions } = applyTypedCtaSeriesPolicyToVisualScenes({
    visualScenes: [{ source: "ai", image_prompt: "x" }, ctaEntry],
    voiceoverText: "Closing line.",
    funnelStage: "awareness",
    history: emptyHistory,
    series: emptySeries,
  });
  assert.equal(guardrailDecisions.length, 1);
  assert.match(guardrailDecisions[0]!.reason, /funnel/i);
});

await check("14 legacy jobs without composition still parse", () => {
  const { metadata } = buildCtaSvg({
    payload: { headline: "Book a demo", button_label: "Book" },
    tokens: resolveChecklistBrandTokens({ profile: "NATURAL" }),
  });
  assert.equal(metadata.composition, "classic_card");
});

await check("15 device interaction rules mention compositing", () => {
  const block = deviceScreenInteractionBlock();
  assert.match(block, /compositing a product screenshot/i);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
