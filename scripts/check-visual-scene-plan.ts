// Package Scene Planning v2 — ordered visual_scenes through job input to worker.
//   npm run check:visual-scene-plan

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import {
  collectAssetUsageFromPackage,
  hasExplicitVisualScenePlan,
  resolveImageOrLegacySceneSource,
  syncLegacyFieldsFromVisualScenes,
  validateVisualScenePlanGuardrails,
} from "@/lib/content-package/visualScenePlan";
import { buildRenderSpec } from "@/video-worker/jobRunner";
import { sceneIdForStoryboardBeat } from "@/lib/video-engine/storyboard";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

function pkgWithPlan(
  plan: NonNullable<ContentPackageOutput["visual_scenes"]>,
): ContentPackageOutput {
  return {
    title: "t",
    funnel_stage: "Awareness",
    hook: "hook",
    voiceover_text: "Voice over text here for render.",
    subtitles: "subs",
    cta: { type: "sign_up", text: "Go" },
    video: { concept: "c", script: "s", duration_seconds: "25" },
    platform_outputs: {} as ContentPackageOutput["platform_outputs"],
    visual_scenes: plan,
  };
}

check("AI-only ordered plan is explicit", () => {
  const pkg = pkgWithPlan([
    { source: "ai", image_prompt: "one" },
    { source: "ai", image_prompt: "two" },
  ]);
  assert.equal(hasExplicitVisualScenePlan(pkg), true);
  syncLegacyFieldsFromVisualScenes(pkg);
  assert.deepEqual(pkg.image_prompts, ["one", "two"]);
  assert.deepEqual(pkg.asset_usage, []);
});

check("AI → asset → AI syncs legacy fields", () => {
  const pkg = pkgWithPlan([
    { source: "ai", image_prompt: "open" },
    {
      source: "asset",
      asset_id: "a1",
      used_as: "Show dashboard in laptop frame",
    },
    { source: "ai", image_prompt: "close" },
  ]);
  syncLegacyFieldsFromVisualScenes(pkg);
  assert.deepEqual(pkg.image_prompts, ["open", "close"]);
  assert.equal(pkg.asset_usage?.length, 1);
  assert.equal(pkg.asset_usage?.[0]?.asset_id, "a1");
});

check("collectAssetUsageFromPackage prefers visual_scenes", () => {
  const pkg = pkgWithPlan([
    {
      source: "asset",
      asset_id: "x",
      used_as: "proof",
    },
  ]);
  pkg.asset_usage = [];
  const usage = collectAssetUsageFromPackage(pkg);
  assert.equal(usage.length, 1);
  assert.equal(usage[0]?.asset_id, "x");
});

check("forbidden fullscreen on desktop asset fails guardrail", () => {
  const pkg = pkgWithPlan([
    {
      source: "asset",
      asset_id: "desk",
      used_as: "Fullscreen uncropped desktop dashboard hero",
      video_usage: "fullscreen",
    },
  ]);
  const issues = validateVisualScenePlanGuardrails({
    pkg,
    classById: new Map([["desk", "static"]]),
    requireVideo: true,
    preferredVideoUsageById: new Map([["desk", "framed_screen"]]),
  });
  assert.ok(
    issues.some((i) => i.message.includes("fullscreen") || i.message.includes("framed")),
  );
});

check("static asset with modify fails guardrail", () => {
  const pkg = pkgWithPlan([
    {
      source: "asset",
      asset_id: "s1",
      used_as: "Show product",
      modify: "true",
    },
  ]);
  const issues = validateVisualScenePlanGuardrails({
    pkg,
    classById: new Map([["s1", "static"]]),
    requireVideo: true,
  });
  assert.ok(issues.some((i) => i.path?.includes("visual_scenes")));
});

check("empty AI image prompt fails structural validation", () => {
  const pkg = pkgWithPlan([{ source: "ai", image_prompt: "   " }]);
  const issues = validateVisualScenePlanGuardrails({
    pkg,
    classById: new Map(),
    requireVideo: true,
  });
  assert.ok(issues.length > 0);
});

check("unknown asset id fails guardrail", () => {
  const pkg = pkgWithPlan([
    { source: "asset", asset_id: "missing", used_as: "use" },
  ]);
  const issues = validateVisualScenePlanGuardrails({
    pkg,
    classById: new Map(),
    requireVideo: true,
  });
  assert.ok(issues.some((i) => i.message.includes("not found")));
  assert.equal(
    issues.some((i) => i.message.includes("asset undefined")),
    false,
  );
});

check("typed IMAGE + nested AI payload passes (no asset undefined)", () => {
  const pkg = pkgWithPlan([
    {
      type: "IMAGE",
      payload: { source: "ai", image_prompt: "hands on phone street" },
    } as never,
  ]);
  const issues = validateVisualScenePlanGuardrails({
    pkg,
    classById: new Map(),
    requireVideo: true,
  });
  assert.deepEqual(issues, []);
  assert.equal(
    issues.some((i) => /asset undefined/i.test(i.message)),
    false,
  );
});

check("legacy flat AI scene passes with empty classById", () => {
  const pkg = pkgWithPlan([{ source: "ai", image_prompt: "quiet office desk" }]);
  const issues = validateVisualScenePlanGuardrails({
    pkg,
    classById: new Map(),
    requireVideo: true,
  });
  assert.deepEqual(issues, []);
});

check("typed IMAGE with root source ai passes", () => {
  const pkg = pkgWithPlan([
    {
      type: "IMAGE",
      source: "ai",
      image_prompt: "visitor leaves form",
    } as never,
  ]);
  const issues = validateVisualScenePlanGuardrails({
    pkg,
    classById: new Map(),
    requireVideo: true,
  });
  assert.deepEqual(issues, []);
});

check("explicit asset scene with valid asset passes", () => {
  const pkg = pkgWithPlan([
    {
      source: "asset",
      asset_id: "asset-1",
      used_as: "Show product UI in phone frame",
    },
  ]);
  const issues = validateVisualScenePlanGuardrails({
    pkg,
    classById: new Map([["asset-1", "editable"]]),
    requireVideo: true,
  });
  assert.deepEqual(issues, []);
});

check("explicit asset scene missing asset_id fails before lookup", () => {
  const pkg = pkgWithPlan([
    {
      type: "IMAGE",
      payload: { source: "asset", used_as: "proof" },
    } as never,
  ]);
  // Structural validator rejects missing asset_id on asset scenes first.
  const issues = validateVisualScenePlanGuardrails({
    pkg,
    classById: new Map(),
    requireVideo: true,
  });
  assert.ok(issues.length > 0);
  assert.equal(
    issues.some((i) => i.message.includes("asset undefined")),
    false,
  );
  assert.ok(
    issues.some(
      (i) =>
        i.message.includes("required for asset scene") ||
        i.message.includes("requires a non-empty asset_id"),
    ),
  );
});

check("resolveImageOrLegacySceneSource reads payload.source", () => {
  const nested = resolveImageOrLegacySceneSource({
    type: "IMAGE",
    payload: { source: "ai", image_prompt: "x" },
  });
  assert.equal(nested.effectiveSource, "ai");
  assert.equal(nested.assetId, null);

  const flat = resolveImageOrLegacySceneSource({
    source: "asset",
    asset_id: "uuid-1",
    used_as: "frame",
  });
  assert.equal(flat.effectiveSource, "asset");
  assert.equal(flat.assetId, "uuid-1");
});

check("legacy package uses merge path in buildRenderSpec", () => {
  const spec = buildRenderSpec({
    voiceover_text: "Hello world narration.",
    image_prompts: ["p1", "p2"],
    asset_images: [
      {
        bucket: "b",
        path: "p",
        title: "Asset",
        video_usage: "framed_screen",
      },
    ],
  });
  assert.ok(spec.scenes.some((s) => s.id.startsWith("asset-")));
  assert.ok(spec.scenes.length >= 2);
});

check("explicit scenes skip legacy merge", () => {
  const spec = buildRenderSpec({
    voiceover_text: "Hello world narration.",
    explicit_scene_plan: true,
    image_prompts: ["legacy should not merge"],
    asset_images: [{ bucket: "b", path: "extra", title: "x" }],
    scenes: [
      {
        id: "scene-1",
        image_prompt: "ai one",
        duration_seconds: 4,
      },
      {
        id: "scene-2",
        image_prompt: "asset beat",
        duration_seconds: 4,
        image_bucket: "b",
        image_path: "asset.png",
        asset_id: "aid-1",
        video_usage: "framed_screen",
      },
      {
        id: "scene-3",
        image_prompt: "ai two",
        duration_seconds: 4,
      },
    ],
  });
  assert.equal(spec.scenes.length, 3);
  assert.equal(spec.scenes[1]?.asset_id, "aid-1");
  assert.equal(spec.scenes.some((s) => s.id === "asset-1"), false);
});

check("explicit storyboard order clamps extra beats to final scene", () => {
  const ids = ["scene-1", "scene-2", "scene-3"];
  const beats = 5;
  const mapped = Array.from({ length: beats }, (_, i) =>
    sceneIdForStoryboardBeat(i, beats, ids, true),
  );
  assert.deepEqual(mapped, [
    "scene-1",
    "scene-2",
    "scene-3",
    "scene-3",
    "scene-3",
  ]);
});

check("four scenes five beats uses scene-4 on final beat", () => {
  const ids = ["scene-1", "scene-2", "scene-3", "scene-4"];
  const beats = 5;
  const last = sceneIdForStoryboardBeat(4, beats, ids, true);
  assert.equal(last, "scene-4");
});

check("worker jobRunner sets explicitSceneOrder when flagged", () => {
  const src = readFileSync(join(root, "video-worker/jobRunner.ts"), "utf8");
  assert.ok(src.includes("explicit_scene_plan"));
  assert.ok(src.includes("explicitSceneOrder"));
});

check("buildVideoJobInput compiles visual plan via scene-types compiler", () => {
  const src = readFileSync(join(root, "lib/ai/workflows/packageShared.ts"), "utf8");
  assert.ok(src.includes("compileVisualScenesToWorkerScenes"));
  assert.ok(src.includes("explicit_scene_plan: true"));
  assert.ok(src.includes("asset_images: []"));
});

check("jobRunner uses renderSchema before merge", () => {
  const src = readFileSync(join(root, "video-worker/jobRunner.ts"), "utf8");
  const fn = src.slice(src.indexOf("export function buildRenderSpec"));
  assert.ok(fn.includes("renderSchema.safeParse(input)"));
  assert.ok(fn.includes("mergeGeneratedAndAssetScenes"));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
