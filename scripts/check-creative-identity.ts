// Creative Identity — deterministic staging axes + series de-duplication.
//   npm run check:creative-identity

import assert from "node:assert/strict";
import type { Project } from "@/lib/supabase/types";
import {
  buildCreativeIdentitySeed,
  resolveCreativeIdentity,
  readCreativeIdentityFromPackageBrief,
} from "@/lib/creative-identity/resolveCreativeIdentity";
import {
  creativeIdentityImagePromptSuffix,
  CREATIVE_IDENTITY_PROMPT_HEADER,
  buildCreativeIdentityPromptBlock,
} from "@/lib/creative-identity/promptBlocks";
import type { VisualProfile } from "@/lib/visual-profile/visualProfile";

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
} as unknown as Project;

const visualProfile: VisualProfile = "MINIMAL";

check("seed is stable for same inputs", () => {
  const a = buildCreativeIdentitySeed({
    projectId: "p1",
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "topic",
    angle: "angle",
    salt: null,
  });
  const b = buildCreativeIdentitySeed({
    projectId: "p1",
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "topic",
    angle: "angle",
    salt: null,
  });
  assert.equal(a, b);
});

check("resolveCreativeIdentity returns axes", () => {
  const seed = buildCreativeIdentitySeed({
    projectId: project.id,
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "blank page",
    angle: null,
    salt: null,
  });
  const identity = resolveCreativeIdentity({
    project,
    visualProfile,
    seed,
    recentIdentityKeys: [],
  });
  assert.ok(identity.environment);
  assert.ok(identity.lighting);
  assert.ok(identity.camera);
  assert.ok(identity.key);
  const block = buildCreativeIdentityPromptBlock(identity, []);
  assert.match(block, new RegExp(CREATIVE_IDENTITY_PROMPT_HEADER));
  assert.ok(creativeIdentityImagePromptSuffix(identity).length > 0);
});

check("series memory rotates identity key", () => {
  const seed = buildCreativeIdentitySeed({
    projectId: project.id,
    strategyItemId: "s1",
    packageIndex: 1,
    topic: "blank page",
    angle: "x",
    salt: "salt",
  });
  const first = resolveCreativeIdentity({
    project,
    visualProfile,
    seed,
    recentIdentityKeys: [],
  });
  const second = resolveCreativeIdentity({
    project,
    visualProfile,
    seed,
    recentIdentityKeys: [first.key],
  });
  assert.notEqual(first.key, second.key);
});

check("readCreativeIdentityFromPackageBrief reads stamped identity", () => {
  const seed = buildCreativeIdentitySeed({
    projectId: project.id,
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "t",
    angle: null,
    salt: null,
  });
  const identity = resolveCreativeIdentity({
    project,
    visualProfile,
    seed,
    recentIdentityKeys: [],
  });
  const brief = {
    presentation_generation: {
      creative_identity: identity,
    },
  };
  const read = readCreativeIdentityFromPackageBrief(brief);
  assert.equal(read?.key, identity.key);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
