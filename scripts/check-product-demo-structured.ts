// Sprint 4C.1 — structured PRODUCT_DEMO beat + deterministic chat raster.
//   npm run check:product-demo-structured

import assert from "node:assert/strict";
import {
  buildDefaultProductDemoBeat,
  extractProductDemoBeat,
  parseProductDemoBeat,
} from "@/lib/scene-types/product-demo/productDemoBeat";
import {
  assertProductDemoRenderable,
  ensureStructuredProductDemo,
} from "@/lib/scene-types/product-demo/ensureStructuredProductDemo";
import { composeProductDemoRaster } from "@/lib/scene-types/product-demo/composeProductDemoRaster";
import {
  validateProductDemonstrationIntegrity,
} from "@/lib/creative-candidates";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import { compileVisualScenesToWorkerScenes } from "@/lib/scene-types/compileScenePlan";
import { ensureSceneRendererRegistry } from "@/video-worker/services/sceneRendererRegistry";
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
    console.error(` FAIL ${name}`, err);
  }
}

function winner(): CreativeCandidate {
  return {
    candidateId: "c-demo",
    family: "direct_product_world",
    coreIdea: "Hands send a booking question on phone chat",
    emotionalReaction: "relief",
    hookLine: "Questions die unanswered.",
    openingSituation:
      "Close on a customer's hands sending an urgent question to a salon website chat",
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

console.log("\nStructured beat");
await check("schema accepts complete product_demo", () => {
  const beat = buildDefaultProductDemoBeat({ actorId: "primary_actor" });
  assert.equal(parseProductDemoBeat(beat).ok, true);
  assert.equal(beat.question_visible, true);
  assert.equal(beat.ai_answer_visible, true);
  assert.equal(beat.outcome_visible, true);
});

await check("schema rejects missing outcome_type", () => {
  const beat = buildDefaultProductDemoBeat({ actorId: "primary_actor" });
  const bad = { ...beat, outcome_type: "smile" };
  assert.equal(parseProductDemoBeat(bad).ok, false);
});

await check("ensure does not fabricate chat demo without existing beat", () => {
  const ensured = ensureStructuredProductDemo({
    visualScenes: [
      { source: "ai", image_prompt: "hands typing a question on a phone" },
      { source: "ai", image_prompt: "landing page create an ai assistant" },
    ],
    winner: winner(),
  });
  assert.equal(ensured.injected, false);
  assert.equal(ensured.renderable, false);
  assert.equal(ensured.beat, null);
  assert.equal(ensured.reason, "product_demonstration_not_fabricated");
  const types = ensured.scenes.map(
    (s) => (s as { type?: string }).type?.toUpperCase(),
  );
  assert.equal(types.includes("PRODUCT_DEMO"), false);
});

await check("ensure completes existing PRODUCT_DEMO beat without inventing", () => {
  const beat = buildDefaultProductDemoBeat({ actorId: "primary_actor" });
  const ensured = ensureStructuredProductDemo({
    visualScenes: [
      { source: "ai", image_prompt: "hands typing a question on a phone" },
      { type: "PRODUCT_DEMO", payload: beat },
    ],
    winner: winner(),
  });
  assert.equal(ensured.renderable, true);
  assert.ok(ensured.beat);
  assert.equal(ensured.beat!.visitor_question, beat.visitor_question);
  const types = ensured.scenes.map(
    (s) => (s as { type?: string }).type?.toUpperCase(),
  );
  assert.ok(types.includes("PRODUCT_DEMO"));
});

await check("force repair places existing beat into resolution slot", () => {
  const beat = buildDefaultProductDemoBeat({ actorId: "primary_actor" });
  const ensured = ensureStructuredProductDemo({
    visualScenes: [
      { source: "ai", image_prompt: "hands typing" },
      { source: "ai", image_prompt: "quietly pleased smile success pose" },
    ],
    winner: winner(),
    productDemo: beat,
    force: true,
  });
  assert.equal(ensured.replacedResolution, true);
  assert.equal(
    (ensured.scenes[ensured.scenes.length - 1] as { type: string }).type,
    "PRODUCT_DEMO",
  );
});

await check("force without beat does not fabricate Fenrik chat", () => {
  const ensured = ensureStructuredProductDemo({
    visualScenes: [
      { source: "ai", image_prompt: "hands typing" },
      { source: "ai", image_prompt: "quietly pleased smile success pose" },
    ],
    winner: winner(),
    force: true,
  });
  assert.equal(ensured.injected, false);
  assert.equal(ensured.beat, null);
  assert.equal(ensured.reason, "product_demonstration_not_fabricated");
});

console.log("\nIntegrity structured-first");
await check("integrity passes with structured PRODUCT_DEMO", () => {
  const beat = buildDefaultProductDemoBeat({ actorId: "primary_actor" });
  const ensured = ensureStructuredProductDemo({
    visualScenes: [
      {
        source: "ai",
        image_prompt:
          "Close on a customer's hands sending an urgent question on the same phone",
      },
      { type: "PRODUCT_DEMO", payload: beat },
    ],
    winner: winner(),
  });
  const result = validateProductDemonstrationIntegrity({
    winner: winner(),
    voiceoverText: "Fenrik answers so visitors book.",
    visualScenes: ensured.scenes,
  });
  assert.equal(result.passed, true, result.summary);
  assert.equal(result.productDemonstration.structuredBeatPresent, true);
});

await check("integrity fails without structured beat (prose alone)", () => {
  const result = validateProductDemonstrationIntegrity({
    winner: winner(),
    voiceoverText: "We capture leads.",
    visualScenes: [
      { source: "ai", image_prompt: "person smiling quietly pleased" },
    ],
  });
  assert.equal(result.passed, false);
  assert.ok(
    result.violations.some((v) => v.code === "structured_beat_missing"),
  );
});

await check("extract finds beat from scene", () => {
  const beat = buildDefaultProductDemoBeat({ actorId: "primary_actor" });
  const found = extractProductDemoBeat({
    visualScenes: [{ type: "PRODUCT_DEMO", payload: beat }],
  });
  assert.ok(found);
  assert.equal(found!.conversation_id, beat.conversation_id);
});

console.log("\nDeterministic raster + compile");
await check("composeProductDemoRaster produces png", async () => {
  const beat = buildDefaultProductDemoBeat({ actorId: "primary_actor" });
  const renderable = assertProductDemoRenderable(beat);
  assert.equal(renderable.ok, true);
  const { png, metadata } = await composeProductDemoRaster(beat);
  assert.ok(png.length > 1000);
  assert.equal(metadata.questionVisible, true);
  assert.equal(metadata.aiAnswerVisible, true);
  assert.equal(metadata.outcomeVisible, true);
});

await check("PRODUCT_DEMO compiles to worker scene", async () => {
  ensureSceneRendererRegistry();
  const beat = buildDefaultProductDemoBeat({ actorId: "primary_actor" });
  const compiled = await compileVisualScenesToWorkerScenes(
    {} as SupabaseClient,
    "project",
    [
      {
        id: "scene-product-demo",
        type: "PRODUCT_DEMO",
        payload: beat,
      },
    ],
  );
  assert.equal(compiled.length, 1);
  assert.equal(compiled[0]!.type, "PRODUCT_DEMO");
  assert.match(compiled[0]!.image_prompt, /product_demo/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
