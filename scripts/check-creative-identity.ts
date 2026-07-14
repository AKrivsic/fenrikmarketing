// Creative Identity v1 — deterministic staging axes + series de-duplication.
//   npm run check:creative-identity

import assert from "node:assert/strict";
import type { Project } from "@/lib/supabase/types";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { CREATIVE_IDENTITY_PROMPT_HEADER } from "@/lib/creative-identity/promptBlocks";
import {
  buildCreativeIdentitySeed,
  resolveCreativeIdentity,
} from "@/lib/creative-identity/resolveCreativeIdentity";
import { planCreativeIdentityForPackage } from "@/lib/creative-identity/planForPackage";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import { creativeIdentityImagePromptSuffix } from "@/lib/creative-identity/promptBlocks";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

const project = {
  id: "proj-ci",
  name: "CI Co",
  type: "product",
  language: "en",
  market_scope: "global",
  goal_type: "awareness",
  target_audience: {},
  product_is: ["AI product blueprint tool"],
  product_is_not: ["luxury concierge"],
  product_strengths: ["fast specs"],
  pain_points: ["blank page"],
  forbidden_claims: [],
  tone_of_voice: {},
  platforms: [],
  publishing_rules: {},
  default_cta: null,
} as unknown as Project;

const emptySeries: SeriesCreativeContext = {
  fingerprints: [],
  typedCtaInCurrentRun: 0,
  typedCtaInWeeklyStrategy: 0,
  recentCtaCompositionIds: [],
  recentHooks: [],
  recentCreativeModes: [],
  recentCreativeIdentityKeys: [],
};

const directives: CreativeDirectives = {
  mode: CREATIVE_MODES[0],
  hook: HOOK_ARCHETYPES[0],
  persona: VOICE_PERSONAS[0],
};

console.log("\nresolveCreativeIdentity");

check("same seed yields same identity", () => {
  const seed = buildCreativeIdentitySeed({
    projectId: project.id,
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "docs pain",
    angle: "three days",
  });
  const a = resolveCreativeIdentity({
    project,
    visualProfile: "MINIMAL",
    seed,
    recentIdentityKeys: [],
  });
  const b = resolveCreativeIdentity({
    project,
    visualProfile: "MINIMAL",
    seed,
    recentIdentityKeys: [],
  });
  assert.equal(a.key, b.key);
  assert.equal(a.environment, b.environment);
});

check("different package index changes identity", () => {
  const a = resolveCreativeIdentity({
    project,
    visualProfile: "MINIMAL",
    seed: buildCreativeIdentitySeed({
      projectId: project.id,
      strategyItemId: "s1",
      packageIndex: 0,
      topic: "docs pain",
      angle: "a",
    }),
    recentIdentityKeys: [],
  });
  const b = resolveCreativeIdentity({
    project,
    visualProfile: "MINIMAL",
    seed: buildCreativeIdentitySeed({
      projectId: project.id,
      strategyItemId: "s1",
      packageIndex: 1,
      topic: "docs pain",
      angle: "a",
    }),
    recentIdentityKeys: [],
  });
  assert.notEqual(a.key, b.key);
});

check("avoids recent identity key when possible", () => {
  const seed = buildCreativeIdentitySeed({
    projectId: project.id,
    strategyItemId: "s1",
    packageIndex: 2,
    topic: "topic",
    angle: "angle",
  });
  const first = resolveCreativeIdentity({
    project,
    visualProfile: "MINIMAL",
    seed: buildCreativeIdentitySeed({
      projectId: project.id,
      strategyItemId: "s1",
      packageIndex: 0,
      topic: "topic",
      angle: "angle",
    }),
    recentIdentityKeys: [],
  });
  const second = resolveCreativeIdentity({
    project,
    visualProfile: "MINIMAL",
    seed,
    recentIdentityKeys: [first.key],
  });
  assert.notEqual(second.key, first.key);
});

console.log("\nprompt + worker suffix");

check("video package prompt includes CREATIVE IDENTITY block", () => {
  const plan = planCreativeIdentityForPackage({
    project,
    visualProfile: "MINIMAL",
    projectId: project.id,
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "habit",
    angle: "consistency",
    series: emptySeries,
    requireVideo: true,
  });
  assert.ok(plan.identity);
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "habit",
    angle: "consistency",
    availableAssets: [],
    requireVideo: true,
    directives,
    creativeIdentityPromptBlock: plan.promptBlock,
  });
  assert.ok(prompt.includes(CREATIVE_IDENTITY_PROMPT_HEADER));
  assert.ok(prompt.includes(plan.identity!.environment));
});

check("text-only package skips identity plan", () => {
  const plan = planCreativeIdentityForPackage({
    project,
    visualProfile: "MINIMAL",
    projectId: project.id,
    topic: "habit",
    series: emptySeries,
    requireVideo: false,
  });
  assert.equal(plan.identity, null);
  assert.equal(plan.promptBlock, "");
});

check("image suffix is stable and non-empty", () => {
  const id = resolveCreativeIdentity({
    project,
    visualProfile: "EDITORIAL",
    seed: "test-seed",
    recentIdentityKeys: [],
  });
  const suffix = creativeIdentityImagePromptSuffix(id);
  assert.ok(suffix.includes("Creative identity:"));
  assert.ok(suffix.includes(id.mood));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
