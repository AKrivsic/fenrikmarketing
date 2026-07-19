// Sprint 5 — PRODUCT_DEMO render fidelity.
//   npm run check:render-fidelity

import assert from "node:assert/strict";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import { normalizeVisualScenePlan } from "@/lib/content-package/visualScenePlan";
import { buildDefaultProductDemoBeat } from "@/lib/scene-types/product-demo/productDemoBeat";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import {
  RENDER_PRODUCT_DEMO_FAILED,
  RenderProductDemoFailedError,
  assertRenderFidelity,
  capScenesPreservingProductDemo,
  validateRenderFidelity,
} from "@/lib/scene-types/presentation/renderFidelity";
import { MAX_VIDEO_SCENE_STILLS } from "@/lib/video-engine/storyboard";
import type { SceneType } from "@/lib/scene-types/sceneType";
import type { VisualScene } from "@/lib/scene-types/visualScene";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}`, err);
  }
}

function demoBeat() {
  return buildDefaultProductDemoBeat({
    actorId: "primary_actor",
    visitorQuestion: "Do you offer weekend appointments?",
    aiAnswer:
      "Yes — we have availability on Saturdays and Sundays. What service?",
    outcomeType: "lead_captured",
  });
}

function pkgWithScenes(
  visual_scenes: NonNullable<ContentPackageOutput["visual_scenes"]>,
): ContentPackageOutput {
  return {
    title: "t",
    funnel_stage: "problem_aware",
    hook: "hook",
    voiceover_text:
      "Eleven visitors came. Typed questions. Create your AI assistant.",
    subtitles: "subs",
    cta: { type: "sign_up", text: "Create your AI assistant" },
    video: { concept: "c", script: "s", duration_seconds: "25" },
    platform_outputs: {} as ContentPackageOutput["platform_outputs"],
    visual_scenes,
  };
}

console.log("\nRender Fidelity validation");

check("Planner PRODUCT_DEMO → Renderer PRODUCT_DEMO PASS", () => {
  const result = validateRenderFidelity({
    planned: [
      { type: "IMAGE", id: "scene-1" },
      { type: "PRODUCT_DEMO", id: "scene-product-demo" },
    ],
    rendered: [
      { type: "IMAGE", id: "scene-1" },
      { type: "PRODUCT_DEMO", id: "scene-product-demo" },
    ],
  });
  assert.equal(result.passed, true);
});

check("Planner PRODUCT_DEMO → Renderer IMAGE FAIL", () => {
  const result = validateRenderFidelity({
    planned: [{ type: "PRODUCT_DEMO", id: "scene-product-demo" }],
    rendered: [{ type: "IMAGE", id: "scene-product-demo" }],
  });
  assert.equal(result.passed, false);
  if (!result.passed) {
    assert.equal(result.code, RENDER_PRODUCT_DEMO_FAILED);
    assert.ok(
      result.violations.some(
        (v) => v.reason === "product_demo_silently_downgraded_to_image",
      ),
    );
  }
  assert.throws(
    () =>
      assertRenderFidelity({
        planned: [{ type: "PRODUCT_DEMO", id: "d1" }],
        rendered: [{ type: "IMAGE", id: "d1" }],
      }),
    (err: unknown) =>
      err instanceof RenderProductDemoFailedError &&
      err.code === RENDER_PRODUCT_DEMO_FAILED,
  );
});

check("Planner IMAGE → Renderer IMAGE PASS", () => {
  const result = validateRenderFidelity({
    planned: [
      { type: "IMAGE", id: "a" },
      { type: "IMAGE", id: "b" },
    ],
    rendered: [
      { type: "IMAGE", id: "a" },
      { type: "IMAGE", id: "b" },
    ],
  });
  assert.equal(result.passed, true);
});

check("Planner PRODUCT_DEMO → Missing render FAIL", () => {
  const result = validateRenderFidelity({
    planned: [
      { type: "IMAGE", id: "scene-1" },
      { type: "PRODUCT_DEMO", id: "scene-product-demo" },
    ],
    rendered: [{ type: "IMAGE", id: "scene-1" }],
  });
  assert.equal(result.passed, false);
  if (!result.passed) {
    assert.equal(result.code, RENDER_PRODUCT_DEMO_FAILED);
    assert.ok(
      result.violations.some(
        (v) => v.reason === "planned_product_demo_missing_from_render",
      ),
    );
  }
});

console.log("\nnormalizeVisualScenePlan preserves PRODUCT_DEMO");

check("PRODUCT_DEMO survives normalize (was the silent-drop bug)", () => {
  const pkg = pkgWithScenes([
    { source: "ai", image_prompt: "hands typing a question on a phone" },
    {
      type: "PRODUCT_DEMO",
      id: "scene-product-demo",
      payload: demoBeat(),
    },
  ]);
  normalizeVisualScenePlan(pkg, { test: "sprint5" });
  const scenes = pkg.visual_scenes ?? [];
  assert.equal(scenes.length, 2);
  const demo = scenes.find(
    (s) =>
      typeof s === "object" &&
      s !== null &&
      "type" in s &&
      (s as { type: string }).type === "PRODUCT_DEMO",
  );
  assert.ok(demo, "PRODUCT_DEMO must remain after normalize");
});

check("cap prefers dropping IMAGE over PRODUCT_DEMO", () => {
  const beat = demoBeat();
  const oversized = [
    { source: "ai" as const, image_prompt: "one" },
    { source: "ai" as const, image_prompt: "two" },
    { source: "ai" as const, image_prompt: "three" },
    { source: "ai" as const, image_prompt: "four" },
    { source: "ai" as const, image_prompt: "five" },
    {
      type: "PRODUCT_DEMO" as const,
      id: "scene-product-demo",
      payload: beat,
    },
  ];
  const pkg = pkgWithScenes(oversized);
  normalizeVisualScenePlan(pkg);
  const scenes = pkg.visual_scenes ?? [];
  assert.ok(scenes.length <= MAX_VIDEO_SCENE_STILLS);
  assert.ok(
    scenes.some(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        "type" in s &&
        (s as { type: string }).type === "PRODUCT_DEMO",
    ),
    "PRODUCT_DEMO must survive stills cap",
  );
});

check("capScenesPreservingProductDemo drops IMAGE first", () => {
  const capped = capScenesPreservingProductDemo(
    [
      { type: "IMAGE" },
      { type: "IMAGE" },
      { type: "PRODUCT_DEMO" },
      { type: "IMAGE" },
    ],
    2,
  );
  assert.equal(capped.length, 2);
  assert.ok(capped.some((s) => s.type === "PRODUCT_DEMO"));
});

console.log("\nPresentation analyzer fail-closed for PRODUCT_DEMO");

check("analyzer keeps eligible PRODUCT_DEMO", () => {
  const scenes: VisualScene[] = [
    {
      id: "scene-1",
      type: "IMAGE",
      payload: {
        media: { source: "ai", image_prompt: "hands on phone chat silence" },
      },
    },
    {
      id: "scene-product-demo",
      type: "PRODUCT_DEMO",
      payload: demoBeat(),
    },
  ];
  const result = analyzePresentation({
    scenes,
    allowedSceneTypes: ["IMAGE", "PRODUCT_DEMO"] as SceneType[],
    voiceoverText: "Create your AI assistant — let your website answer.",
    proof: { quotes: [], statistics: [], facts: [] },
    projectSignals: {
      hasMobileProductUi: false,
      hasPhoneCapableAsset: false,
      phoneAssetIds: [],
    },
    packageCtaText: "Create your AI assistant",
    projectDefaultCta: null,
    projectName: "Fenrik",
    projectId: "proj-test",
  });
  assert.equal(result.scenes[1]?.type, "PRODUCT_DEMO");
  assert.equal(result.decisions[1]?.final_type, "PRODUCT_DEMO");
});

check("analyzer fails instead of downgrading invalid PRODUCT_DEMO", () => {
  const scenes: VisualScene[] = [
    {
      id: "scene-product-demo",
      type: "PRODUCT_DEMO",
      payload: { type: "product_demo", broken: true },
    },
  ];
  assert.throws(
    () =>
      analyzePresentation({
        scenes,
        allowedSceneTypes: ["IMAGE", "PRODUCT_DEMO"] as SceneType[],
        voiceoverText: "Create your AI assistant.",
        proof: { quotes: [], statistics: [], facts: [] },
        projectSignals: {
          hasMobileProductUi: false,
          hasPhoneCapableAsset: false,
          phoneAssetIds: [],
        },
        packageCtaText: null,
        projectDefaultCta: null,
        projectId: "proj-test",
      }),
    (err: unknown) =>
      err instanceof RenderProductDemoFailedError &&
      err.code === RENDER_PRODUCT_DEMO_FAILED,
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
