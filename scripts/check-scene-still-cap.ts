// Dependency-free check for the MVP scene/image cost cap. Runs via Node's
// built-in type stripping + the "@/" alias loader:
//   npm run check:scene-still-cap
//
// Goal under test: 1 video = at most MAX_VIDEO_SCENE_STILLS generated stills =
// at most that many AI image generations. Covers the four enforcement layers:
//   a) the content prompt asks for 4–5 image_prompts (NOT 5–8 / NOT 3–5)
//   b) guardrails reject missing / >5 image_prompts when a video is required
//   c) the worker render path produces at most MAX generated scenes for a NEW
//      job, preserves reused asset stills, and never re-truncates the reuse
//      (language variant) path that passes explicit render_spec scenes
//
// Workflow normalization (drop empties + cap before persistence) lives in
// lib/ai/workflows/packageShared.ts and is covered by `npx tsc --noEmit`; it is
// not imported here because that module's transitive deps use TS parameter
// properties that Node's strip-only loader (used by these checks) rejects.

import assert from "node:assert/strict";
import type { Project } from "@/lib/supabase/types";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import {
  checkContentPackageGuardrails,
  type PackageGuardrailContext,
} from "@/lib/ai/guardrails";
import { MAX_VIDEO_SCENE_STILLS } from "@/lib/video-engine/storyboard";
import { buildRenderSpec } from "@/video-worker/jobRunner";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";

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

function buildProject(): Project {
  return {
    id: "p-1",
    owner_id: "u-1",
    name: "Úklidy Praha",
    type: "local_service",
    language: "cs",
    enabled_languages: [],
    market_scope: "local",
    target_audience: {},
    goal_type: "lead_generation",
    product_is: ["cleaning service"],
    product_is_not: [],
    product_strengths: ["fast"],
    pain_points: ["no time"],
    forbidden_claims: [],
    tone_of_voice: {},
    platforms: ["tiktok", "instagram", "youtube"],
    publishing_rules: {},
    default_cta: null,
    knowledge: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function platformOutput(): { caption: string; cta: string } {
  return { caption: "Engaging caption", cta: "Learn more" };
}

function buildPackage(prompts: string[]): ContentPackageOutput {
  return {
    title: "Spring launch",
    funnel_stage: "problem_aware",
    hook: "Struggling with X?",
    voiceover_text: "Here is how we help.",
    subtitles: "Here is how we help.",
    cta: { type: "learn_more", text: "Learn more" },
    video: { concept: "Explainer", script: "Scene 1..." },
    image_prompts: prompts,
    platform_outputs: {
      tiktok: platformOutput(),
      instagram: platformOutput(),
      youtube: platformOutput(),
      facebook: platformOutput(),
      linkedin: platformOutput(),
      x: platformOutput(),
      google_business: platformOutput(),
    },
  } as ContentPackageOutput;
}

function baseCtx(): PackageGuardrailContext {
  return {
    project: { goal_type: "awareness", forbidden_claims: [], product_is_not: [] },
    weeklyStrategyId: "ws-1",
    strategyItemId: "si-1",
    strategyItemFunnelStage: "problem_aware",
  };
}

function paths(issues: { path: string }[]): string[] {
  return issues.map((i) => i.path);
}

// --- shared constant --------------------------------------------------------

section("shared constant");

check("MAX_VIDEO_SCENE_STILLS is 5", () => {
  assert.equal(MAX_VIDEO_SCENE_STILLS, 5);
});

// --- a/b: content prompt asks for 3–5, not 5–8 ------------------------------

section("content prompt VISUAL BEATS instruction");

function videoPrompt(): string {
  return buildGenerateContentPackagePrompt({
    project: buildProject(),
    funnelStage: "awareness",
    topic: "guest turnover",
    angle: "fast reset",
    availableAssets: [],
    requireVideo: true,
  });
}

check("prompt no longer asks for 5–8 image_prompts", () => {
  assert.ok(!videoPrompt().includes("5–8 image_prompts"));
  assert.ok(!videoPrompt().includes("5-8 image_prompts"));
});

check("prompt asks for 4–5 image_prompts", () => {
  assert.ok(videoPrompt().includes("4–5 image_prompts"));
});

check("prompt does not request more than the max", () => {
  const prompt = videoPrompt();
  assert.ok(/Do NOT provide more than/i.test(prompt));
  assert.ok(prompt.includes(`${MAX_VIDEO_SCENE_STILLS}`));
});

// --- c: guardrails reject missing / >5 when video required ------------------

section("guardrails — image_prompts cap (video required)");

const CAP_MESSAGE = `image_prompts must contain 1–${MAX_VIDEO_SCENE_STILLS} prompts`;

check("1..5 prompts pass (no image_prompts issue)", () => {
  for (let n = 1; n <= MAX_VIDEO_SCENE_STILLS; n++) {
    const prompts = Array.from({ length: n }, (_v, i) => `scene ${i}`);
    const issues = checkContentPackageGuardrails(buildPackage(prompts), baseCtx());
    assert.equal(
      paths(issues).includes("$.image_prompts"),
      false,
      `n=${n} should pass`,
    );
  }
});

check("missing/empty image_prompts fails with clear message", () => {
  const issues = checkContentPackageGuardrails(buildPackage([]), baseCtx());
  assert.ok(paths(issues).includes("$.image_prompts"));
  assert.ok(issues.some((i) => i.message === CAP_MESSAGE));
});

check("6+ prompts fail with clear message", () => {
  const six = Array.from({ length: 6 }, (_v, i) => `scene ${i}`);
  const issues = checkContentPackageGuardrails(buildPackage(six), baseCtx());
  assert.ok(paths(issues).includes("$.image_prompts"));
  assert.ok(issues.some((i) => i.message === CAP_MESSAGE));
});

check("text-only packages are NOT subject to the cap", () => {
  const pkg = buildPackage([]);
  const issues = checkContentPackageGuardrails(pkg, {
    ...baseCtx(),
    requireVideo: false,
  });
  assert.equal(paths(issues).includes("$.image_prompts"), false);
});

// --- c: worker render path cap ----------------------------------------------

section("worker buildRenderSpec — generated scene cap");

function generatedSceneCount(spec: { scenes: { image_path?: string }[] }): number {
  // Generated scenes carry NO durable image_path (those get a provider call);
  // reused asset stills DO carry image_bucket/image_path (no provider call).
  return spec.scenes.filter((s) => !s.image_path).length;
}

check("7 image_prompts -> at most 5 generated scenes for a NEW job", () => {
  const seven = Array.from({ length: 7 }, (_v, i) => `purely visual scene ${i}`);
  const spec = buildRenderSpec({
    voiceover_text: "Here is how we help, quickly and simply, every time.",
    image_prompts: seven,
  });
  assert.equal(generatedSceneCount(spec), MAX_VIDEO_SCENE_STILLS);
});

check("asset reuse is preserved early in the storyboard pool", () => {
  const seven = Array.from({ length: 7 }, (_v, i) => `purely visual scene ${i}`);
  const spec = buildRenderSpec({
    voiceover_text: "Here is how we help, quickly and simply, every time.",
    image_prompts: seven,
    asset_images: [{ bucket: "assets", path: "logo.png", title: "logo" }],
  });
  assert.equal(generatedSceneCount(spec), 4);
  const assetIdx = spec.scenes.findIndex((s) => s.id === "asset-1");
  assert.equal(spec.scenes.filter((s) => s.image_path).length, 1);
  assert.ok(assetIdx >= 0 && assetIdx <= 3);
});

check("reuse path (explicit render_spec scenes) is NOT re-truncated", () => {
  const scenes = Array.from({ length: 7 }, (_v, i) => ({
    id: `scene-${i + 1}`,
    image_prompt: `reused scene ${i}`,
    image_bucket: "renders",
    image_path: `still-${i}.png`,
    duration_seconds: 4,
  }));
  const spec = buildRenderSpec({
    voiceover_text: "Reused narration for a language variant.",
    scenes,
  });
  // All 7 legacy scenes survive (they are reused, never re-generated), so a
  // language variant keeps its exact original visuals.
  assert.equal(spec.scenes.length, 7);
  assert.equal(generatedSceneCount(spec), 0);
});

// --- summary ----------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
