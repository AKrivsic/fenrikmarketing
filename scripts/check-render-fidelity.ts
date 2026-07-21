// Render fidelity + legacy PRODUCT_DEMO downgrade (PPD-only runtime)
//   npm run check:render-fidelity

import assert from "node:assert/strict";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import { normalizeVisualScenePlan } from "@/lib/content-package/visualScenePlan";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import {
  RENDER_FIDELITY_FAILED,
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

function pkgWithScenes(
  visual_scenes: NonNullable<ContentPackageOutput["visual_scenes"]>,
): ContentPackageOutput {
  return {
    title: "t",
    funnel_stage: "problem_aware",
    hook: "hook",
    voiceover_text: "Eleven visitors came. Typed questions.",
    subtitles: "subs",
    cta: { type: "sign_up", text: "Create your AI assistant" },
    video: { concept: "c", script: "s", duration_seconds: "25" },
    platform_outputs: {} as ContentPackageOutput["platform_outputs"],
    visual_scenes,
  };
}

check("Planner CHECKLIST → Renderer CHECKLIST PASS", () => {
  const result = validateRenderFidelity({
    planned: [
      { type: "IMAGE", id: "scene-1" },
      { type: "CHECKLIST", id: "scene-2" },
    ],
    rendered: [
      { type: "IMAGE", id: "scene-1" },
      { type: "CHECKLIST", id: "scene-2" },
    ],
  });
  assert.equal(result.passed, true);
});

check("type mismatch fails fidelity", () => {
  const result = validateRenderFidelity({
    planned: [{ type: "CHECKLIST", id: "scene-2" }],
    rendered: [{ type: "IMAGE", id: "scene-2" }],
  });
  assert.equal(result.passed, false);
  if (!result.passed) {
    assert.equal(result.code, RENDER_FIDELITY_FAILED);
  }
  assert.throws(
    () =>
      assertRenderFidelity({
        planned: [{ type: "CHECKLIST", id: "d1" }],
        rendered: [{ type: "IMAGE", id: "d1" }],
      }),
    (err: unknown) => err instanceof RenderProductDemoFailedError,
  );
});

check("legacy PRODUCT_DEMO downgrades to AI on normalize", () => {
  const pkg = pkgWithScenes([
    { source: "ai", image_prompt: "hands typing a question on a phone" },
    {
      type: "PRODUCT_DEMO",
      id: "scene-product-demo",
      payload: {
        visitor_question: "Weekend slots?",
        ai_answer: "Yes — Saturday openings.",
        outcome_type: "lead_captured",
      },
    },
  ]);
  normalizeVisualScenePlan(pkg, { test: "ppd-final" });
  const scenes = pkg.visual_scenes ?? [];
  assert.equal(scenes.length, 2);
  assert.ok(
    !scenes.some(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        "type" in s &&
        (s as { type: string }).type === "PRODUCT_DEMO",
    ),
  );
  assert.ok(
    scenes.every(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        ("source" in s ? s.source === "ai" || s.source === "asset" : false),
    ),
  );
});

check("normalize caps scenes at MAX_VIDEO_SCENE_STILLS", () => {
  const oversized = Array.from({ length: MAX_VIDEO_SCENE_STILLS + 2 }, (_, i) => ({
    source: "ai" as const,
    image_prompt: `scene ${i + 1}`,
  }));
  const pkg = pkgWithScenes(oversized);
  normalizeVisualScenePlan(pkg);
  assert.ok((pkg.visual_scenes ?? []).length <= MAX_VIDEO_SCENE_STILLS);
});

check("capScenesPreservingProductDemo is slice cap (compat alias)", () => {
  const capped = capScenesPreservingProductDemo(
    [{ type: "IMAGE" }, { type: "IMAGE" }, { type: "CHECKLIST" }],
    2,
  );
  assert.equal(capped.length, 2);
});

check("analyzer downgrades legacy PRODUCT_DEMO to IMAGE", () => {
  const scenes: VisualScene[] = [
    {
      id: "scene-product-demo",
      type: "PRODUCT_DEMO" as SceneType,
      payload: { visitor_question: "Hi?" },
    },
  ];
  const result = analyzePresentation({
    scenes,
    allowedSceneTypes: ["IMAGE"] as SceneType[],
    voiceoverText: "Create your AI assistant.",
    proof: { quotes: [], statistics: [], facts: [] },
    projectSignals: {
      hasMobileProductUi: false,
      hasPhoneCapableAsset: false,
      phoneAssetIds: [],
    },
    packageCtaText: null,
    projectDefaultCta: null,
    projectName: "Fenrik",
    projectId: "proj-test",
  });
  assert.equal(result.scenes[0]?.type, "IMAGE");
  assert.equal(result.decisions[0]?.final_type, "IMAGE");
  assert.equal(result.decisions[0]?.rule, "downgraded_to_image");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
