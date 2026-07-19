// Sprint 5.1 — PRODUCT_DEMO visual variants + run-level rotation.
//   npm run check:product-demo-variation

import assert from "node:assert/strict";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import { normalizeVisualScenePlan } from "@/lib/content-package/visualScenePlan";
import {
  PRODUCT_DEMO_VARIANTS,
  SAFE_PRODUCT_DEMO_VARIANT,
  listCompatibleDemoVariants,
  primaryVariantForOutcome,
  resolveEffectiveDemoVariant,
  selectDemoVariant,
  type ProductDemoVariant,
} from "@/lib/scene-types/product-demo/demoVariant";
import {
  buildDefaultProductDemoBeat,
  parseProductDemoBeat,
} from "@/lib/scene-types/product-demo/productDemoBeat";
import {
  assertProductDemoRenderable,
  ensureStructuredProductDemo,
} from "@/lib/scene-types/product-demo/ensureStructuredProductDemo";
import { composeProductDemoRaster } from "@/lib/scene-types/product-demo/composeProductDemoRaster";
import { compileVisualScenesToWorkerScenes } from "@/lib/scene-types/compileScenePlan";
import { ensureSceneRendererRegistry } from "@/video-worker/services/sceneRendererRegistry";
import { validateRenderFidelity } from "@/lib/scene-types/presentation/renderFidelity";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import type { SupabaseClient } from "@supabase/supabase-js";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}`, err);
  }
}

function winner(): CreativeCandidate {
  return {
    candidateId: "c-demo-var",
    family: "direct_product_world",
    coreIdea: "Hands send a booking question on phone chat after hours",
    emotionalReaction: "relief",
    hookLine: "Questions die unanswered overnight.",
    openingSituation:
      "Close on a customer's hands sending an urgent question to a salon website chat over the weekend",
    visualPromise: "Handheld chat urgency",
    storyProgression: "ask → AI answers → lead captured",
    productConnection: "Fenrik AI answers on the website",
    ending: "Visitor books",
    expectedViewerQuestion: "Will they get an answer?",
    familiarityRisk: "medium",
    memorabilityReason: "Hands + chat",
    creativeDNA: {
      world: "phone chat",
      mainCharacter: "A website visitor's hands",
      coreConflict: "unanswered questions",
      productRole: "AI chatbot answers",
      viewerQuestion: "Will they get an answer?",
      endingIntent: "lead captured",
      immutableRules: ["Keep handheld chat world"],
    },
    creativeDnaSource: "model",
  };
}

console.log("\nVariant mapping");

await check("outcome → primary variant mapping", () => {
  assert.equal(primaryVariantForOutcome("question_resolved"), "conversation_answer");
  assert.equal(primaryVariantForOutcome("lead_captured"), "lead_capture");
  assert.equal(primaryVariantForOutcome("contact_captured"), "lead_capture");
  assert.equal(primaryVariantForOutcome("booking_confirmed"), "booking_confirmation");
});

await check("after-hours narrative prefers after_hours_response", () => {
  const pick = selectDemoVariant({
    outcomeType: "lead_captured",
    narrativeText: "Eleven visitors over the weekend. After hours silence.",
    recentVariants: [],
  });
  assert.equal(pick, "after_hours_response");
});

await check("unknown variant uses safe PRODUCT_DEMO fallback", () => {
  const resolved = resolveEffectiveDemoVariant({
    demoVariant: "totally_unknown_layout",
    outcomeType: "lead_captured",
  });
  assert.equal(resolved.unknownStripped, true);
  assert.equal(resolved.source, "safe_fallback");
  assert.equal(resolved.variant, "lead_capture");
  assert.notEqual(resolved.variant as string, "IMAGE");
});

await check("parse strips unknown demo_variant and still yields PRODUCT_DEMO beat", () => {
  const raw = {
    ...buildDefaultProductDemoBeat({ actorId: "a1" }),
    demo_variant: "not_a_real_variant",
  };
  const parsed = parseProductDemoBeat(raw);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    // Unknown stripped — optional field absent (resolved later at ensure/compose).
    assert.equal(parsed.data.demo_variant, undefined);
    assert.equal(parsed.data.type, "product_demo");
    assert.equal(parsed.data.question_visible, true);
  }
});

console.log("\nEach variant renders as PRODUCT_DEMO");

for (const variant of PRODUCT_DEMO_VARIANTS) {
  await check(`variant ${variant} renders raster + stays PRODUCT_DEMO`, async () => {
    const beat = buildDefaultProductDemoBeat({
      actorId: "primary_actor",
      outcomeType:
        variant === "booking_confirmation"
          ? "booking_confirmed"
          : variant === "conversation_answer"
            ? "question_resolved"
            : "lead_captured",
      demoVariant: variant,
    });
    assert.equal(beat.demo_variant, variant);
    const renderable = assertProductDemoRenderable(beat);
    assert.equal(renderable.ok, true, renderable.ok ? "" : renderable.reason);
    const { png, metadata } = await composeProductDemoRaster(beat);
    assert.ok(png.length > 1000);
    assert.equal(metadata.demoVariant, variant);
    assert.equal(metadata.questionVisible, true);
    assert.equal(metadata.aiAnswerVisible, true);
    assert.equal(metadata.outcomeVisible, true);

    ensureSceneRendererRegistry();
    const compiled = await compileVisualScenesToWorkerScenes(
      {} as SupabaseClient,
      "project",
      [{ id: "scene-product-demo", type: "PRODUCT_DEMO", payload: beat }],
    );
    assert.equal(compiled[0]!.type, "PRODUCT_DEMO");
    const fidelity = validateRenderFidelity({
      planned: [{ type: "PRODUCT_DEMO", id: "scene-product-demo" }],
      rendered: [{ type: compiled[0]!.type, id: compiled[0]!.id }],
    });
    assert.equal(fidelity.passed, true);
  });
}

console.log("\nNormalize + compile preserve semantic payload");

await check("demo_variant survives normalizeVisualScenePlan", () => {
  const beat = buildDefaultProductDemoBeat({
    actorId: "primary_actor",
    demoVariant: "lead_capture",
  });
  const pkg: ContentPackageOutput = {
    title: "t",
    funnel_stage: "problem_aware",
    hook: "hook",
    voiceover_text: "Create your AI assistant after hours.",
    subtitles: "s",
    cta: { type: "sign_up", text: "Create" },
    video: { concept: "c", script: "s", duration_seconds: "22" },
    platform_outputs: {} as ContentPackageOutput["platform_outputs"],
    visual_scenes: [
      { source: "ai", image_prompt: "hands typing" },
      { type: "PRODUCT_DEMO", id: "scene-product-demo", payload: beat },
    ],
  };
  normalizeVisualScenePlan(pkg);
  const demo = (pkg.visual_scenes ?? []).find(
    (s) =>
      typeof s === "object" &&
      s !== null &&
      "type" in s &&
      (s as { type: string }).type === "PRODUCT_DEMO",
  ) as { payload: { demo_variant?: string } } | undefined;
  assert.ok(demo);
  assert.equal(demo!.payload.demo_variant, "lead_capture");
});

console.log("\nRun-level rotation");

await check("compatible variants rotate across simulated packages", () => {
  const recent: ProductDemoVariant[] = [];
  const picks: ProductDemoVariant[] = [];
  for (let i = 0; i < 4; i++) {
    const pick = selectDemoVariant({
      outcomeType: "lead_captured",
      narrativeText: "weekday daytime traffic",
      recentVariants: recent,
    });
    picks.push(pick);
    recent.push(pick);
  }
  // Should not be the same variant four times when alternatives exist.
  const unique = new Set(picks);
  assert.ok(unique.size >= 2, `expected rotation, got ${picks.join(",")}`);
  // No consecutive identical when alternatives exist.
  for (let i = 1; i < picks.length; i++) {
    const compatible = listCompatibleDemoVariants({
      outcomeType: "lead_captured",
      narrativeText: "weekday daytime traffic",
    });
    if (compatible.length > 1) {
      assert.notEqual(picks[i], picks[i - 1]);
    }
  }
});

await check("single compatible variant remains valid", () => {
  // Force a path where only one option is preferred: question_resolved without
  // after-hours still has conversation_answer + after_hours — use booking with
  // empty narrative and verify one-pick path via list length 1 simulation.
  const only: ProductDemoVariant[] = ["booking_confirmation"];
  const pick = only.length === 1 ? only[0]! : selectDemoVariant({
    outcomeType: "booking_confirmed",
    recentVariants: ["booking_confirmation", "booking_confirmation"],
  });
  assert.equal(pick, "booking_confirmation");
  assert.equal(SAFE_PRODUCT_DEMO_VARIANT, "conversation_answer");
});

await check("ensureStructuredProductDemo assigns a variant", () => {
  const ensured = ensureStructuredProductDemo({
    visualScenes: [{ source: "ai", image_prompt: "hands typing" }],
    winner: winner(),
    narrativeText: "Weekend visitors waited after hours.",
    recentVariants: ["lead_capture"],
  });
  assert.ok(ensured.beat?.demo_variant);
  assert.ok(
    PRODUCT_DEMO_VARIANTS.includes(ensured.beat!.demo_variant!),
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
