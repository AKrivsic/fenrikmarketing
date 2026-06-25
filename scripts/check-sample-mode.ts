// Sample generation mode — prompt-only branch; production prompt unchanged.
//   npm run check:sample-mode

import assert from "node:assert/strict";
import {
  buildGenerateContentPackagePrompt,
  buildSamplePackageRulesBlock,
} from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import {
  DEFAULT_GENERATION_MODE,
  optionalGenerationModeFromBody,
  parseGenerationMode,
  resolveGenerationMode,
} from "@/lib/ai/generationMode";
import { normalizeProductionConfig } from "@/lib/projects/productionRun";
import type { Project } from "@/lib/supabase/types";

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

const project = {
  id: "p-sample",
  name: "Sample Co",
  type: "service",
  language: "cs",
  market_scope: "local",
  goal_type: "awareness",
  target_audience: {},
  product_is: ["helpful app"],
  product_is_not: [],
  product_strengths: [],
  pain_points: [],
  forbidden_claims: [],
  tone_of_voice: {},
  platforms: [],
  publishing_rules: {},
  default_cta: null,
} as unknown as Project;

const directives: CreativeDirectives = {
  mode: CREATIVE_MODES[0],
  hook: HOOK_ARCHETYPES[0],
  persona: VOICE_PERSONAS[0],
};

const basePromptInput = {
  project,
  funnelStage: "awareness" as const,
  topic: "habit tracking",
  angle: "consistency over streaks",
  availableAssets: [],
  targetPlatforms: ["tiktok", "instagram"] as const,
  requireVideo: true,
  videoPlatforms: ["tiktok", "instagram"] as const,
  directives,
};

const legacyProductionPrompt = buildGenerateContentPackagePrompt({
  ...basePromptInput,
});

section("production prompt unchanged");

check("default generation mode is production", () => {
  assert.equal(DEFAULT_GENERATION_MODE, "production");
  assert.equal(parseGenerationMode(undefined), "production");
  assert.equal(parseGenerationMode("production"), "production");
  assert.equal(parseGenerationMode("unknown"), "production");
});

check("omitted generationMode matches explicit production prompt", () => {
  const explicit = buildGenerateContentPackagePrompt({
    ...basePromptInput,
    generationMode: "production",
  });
  assert.equal(explicit, legacyProductionPrompt);
});

check("production prompt does not include SAMPLE PACKAGE RULES", () => {
  assert.ok(!legacyProductionPrompt.includes("SAMPLE PACKAGE RULES"));
});

section("sample prompt");

check("sample mode includes SAMPLE PACKAGE RULES block", () => {
  const sample = buildGenerateContentPackagePrompt({
    ...basePromptInput,
    generationMode: "sample",
  });
  assert.ok(sample.includes("SAMPLE PACKAGE RULES"));
  assert.ok(sample.includes(buildSamplePackageRulesBlock()));
  assert.ok(sample.includes("recognize themselves within seconds"));
  assert.ok(sample.includes("prefer product UI"));
});

check("sample prompt differs from production only by the sample block", () => {
  const sample = buildGenerateContentPackagePrompt({
    ...basePromptInput,
    generationMode: "sample",
  });
  const block = buildSamplePackageRulesBlock();
  assert.ok(sample.includes(block));
  assert.equal(
    sample.replace(`\n\n${block}`, ""),
    legacyProductionPrompt,
  );
});

section("generation_mode API + run config");

check("optionalGenerationModeFromBody absent -> undefined", () => {
  assert.equal(optionalGenerationModeFromBody({}), undefined);
});

check("optionalGenerationModeFromBody sample", () => {
  assert.equal(
    optionalGenerationModeFromBody({ generation_mode: "sample" }),
    "sample",
  );
});

check("resolveGenerationMode prefers explicit body over run", () => {
  assert.equal(
    resolveGenerationMode("production", "sample"),
    "production",
  );
  assert.equal(resolveGenerationMode("sample", "production"), "sample");
});

check("resolveGenerationMode uses run when body omitted", () => {
  assert.equal(resolveGenerationMode(undefined, "sample"), "sample");
  assert.equal(resolveGenerationMode(undefined, undefined), "production");
});

check("normalizeProductionConfig stores sample on run config", () => {
  const cfg = normalizeProductionConfig({
    packageCount: 1,
    platforms: ["tiktok"],
    generationMode: "sample",
  });
  assert.equal(cfg.generationMode, "sample");
});

check("normalizeProductionConfig omits production mode (default)", () => {
  const cfg = normalizeProductionConfig({
    packageCount: 1,
    platforms: ["tiktok"],
    generation_mode: "production",
  });
  assert.equal(cfg.generationMode, undefined);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
