// Dependency-free smoke test for Visual Style Guardrail V1 (Project Brain
// Improvements V1 — Part 3). Runs via Node's built-in type stripping + the "@/"
// alias loader:
//   npm run check:visual-style
//
// Covers:
//   - the guardrail block content (prefers bright/clean/daylight, avoids
//     dark/cinematic/horror, keeps the explicit-concept exception)
//   - injection into image-prompt GENERATION: present for video packages,
//     absent for text-only packages (no image_prompts), and never affecting CTA

import assert from "node:assert/strict";
import type { Project } from "@/lib/supabase/types";
import {
  VISUAL_STYLE_AVOID,
  VISUAL_STYLE_HEADER,
  VISUAL_STYLE_PREFER,
  videoSceneCompositionBlock,
  visualStyleGuardrailBlock,
} from "@/lib/ai/prompts/visualStyle";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";

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

// --- visualStyleGuardrailBlock ----------------------------------------------

section("visualStyleGuardrailBlock");

check("includes the VISUAL STYLE header", () => {
  assert.ok(visualStyleGuardrailBlock().includes(VISUAL_STYLE_HEADER));
});

check("prefers every bright/clean/daylight keyword", () => {
  const block = visualStyleGuardrailBlock();
  for (const word of VISUAL_STYLE_PREFER) {
    assert.ok(block.includes(word), `missing prefer keyword: ${word}`);
  }
});

check("avoids every dark/cinematic/horror keyword", () => {
  const block = visualStyleGuardrailBlock();
  for (const word of VISUAL_STYLE_AVOID) {
    assert.ok(block.includes(word), `missing avoid keyword: ${word}`);
  }
});

check("keeps the explicit-concept exception", () => {
  assert.ok(/EXCEPTION/i.test(visualStyleGuardrailBlock()));
});

check("declares it never changes CTA / copy", () => {
  assert.ok(/never changes the CTA/i.test(visualStyleGuardrailBlock()));
});

section("videoSceneCompositionBlock");

check("includes portrait / vertical framing guidance", () => {
  const block = videoSceneCompositionBlock();
  assert.ok(/portrait composition/i.test(block));
  assert.ok(/9:16/i.test(block));
  assert.ok(/headroom/i.test(block));
});

// --- injection into image-prompt generation ---------------------------------

section("generateContentPackage prompt injection");

check("video packages inject the visual guardrail", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project: buildProject(),
    funnelStage: "awareness",
    topic: "guest turnover",
    angle: "fast reset",
    availableAssets: [],
    requireVideo: true,
  });
  assert.ok(prompt.includes(VISUAL_STYLE_HEADER));
  assert.ok(prompt.includes("image_prompts"));
  assert.ok(prompt.includes("VERTICAL SCENE COMPOSITION"));
});

check("text-only packages do NOT inject the visual guardrail", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project: buildProject(),
    funnelStage: "awareness",
    topic: "guest turnover",
    angle: "fast reset",
    availableAssets: [],
    requireVideo: false,
    targetPlatforms: ["linkedin"],
  });
  // No image_prompts for text-only → no visual style guardrail either.
  assert.ok(!prompt.includes(VISUAL_STYLE_HEADER));
});

check("guardrail is attached to the visual beats, not the CTA shape", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project: buildProject(),
    funnelStage: "awareness",
    topic: "guest turnover",
    angle: "fast reset",
    availableAssets: [],
    requireVideo: true,
  });
  const styleIdx = prompt.indexOf(VISUAL_STYLE_HEADER);
  const visualBeatsIdx = prompt.indexOf("VISUAL BEATS");
  assert.ok(visualBeatsIdx >= 0);
  assert.ok(styleIdx > visualBeatsIdx, "style block should follow VISUAL BEATS");
});

// --- summary ----------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
