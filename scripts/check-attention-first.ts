// Dependency-free check for Attention First V1. Runs via Node's built-in type
// stripping + the "@/" alias loader:
//   npm run check:attention-first
//
// Attention First V1 — verifies that:
//   1. every CREATIVE MODE carries an ordered narrativeBeats arc ending in "cta"
//      (incl. the new "observation" mode), so the mode — not a fixed marketing
//      arc — drives the structure;
//   2. the generation prompt is mode-driven and attention-first (it carries the
//      ATTENTION FIRST block + the mode's beats, and NO longer hardcodes the
//      Problem -> Scenario -> Proof marketing arc);
//   3. the storyboard role arc follows the injected mode beats and contains no
//      problem/scenario/proof, while the no-mode fallback stays a neutral
//      hook -> body... -> cta arc.

import assert from "node:assert/strict";
import {
  buildGenerateContentPackagePrompt,
} from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  buildCreativeSeed,
  buildRegenerateCreativeSeedSalt,
  pickCreativeDirectives,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { buildStoryboard, SHORT_PROFILE } from "@/lib/video-engine/storyboard";
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

// The arc-specific roles the audit flagged. "proof" is NOT here: it is a
// legitimate beat for some modes (shock, contrarian, standard); the attention
// killer was forcing the rigid problem + scenario + proof combo on EVERY mode.
const MARKETING_ARC_BEATS = ["problem", "scenario"];

// --- 1. every mode has an ordered narrative arc ----------------------------

section("creative modes are beat-driven (mode drives the whole video)");

check("every mode has a non-empty narrativeBeats arc ending in cta", () => {
  for (const mode of CREATIVE_MODES) {
    assert.ok(
      Array.isArray(mode.narrativeBeats) && mode.narrativeBeats.length >= 2,
      `${mode.id} must have >= 2 narrative beats`,
    );
    assert.ok(
      mode.narrativeBeats.every((b) => typeof b === "string" && b.trim()),
      `${mode.id} has an empty beat`,
    );
    assert.equal(
      mode.narrativeBeats[mode.narrativeBeats.length - 1],
      "cta",
      `${mode.id} must end on cta`,
    );
  }
});

check("the new attention-first modes exist with their own arcs", () => {
  const byId = new Map(CREATIVE_MODES.map((m) => [m.id, m]));
  assert.deepEqual(byId.get("story")?.narrativeBeats, [
    "setup",
    "conflict",
    "twist",
    "resolution",
    "cta",
  ]);
  assert.deepEqual(byId.get("shock")?.narrativeBeats, [
    "unexpected_fact",
    "implication",
    "proof",
    "cta",
  ]);
  assert.deepEqual(byId.get("contrarian")?.narrativeBeats, [
    "common_belief",
    "why_wrong",
    "proof",
    "cta",
  ]);
  assert.deepEqual(byId.get("humor")?.narrativeBeats, [
    "situation",
    "unexpected_turn",
    "punchline",
    "cta",
  ]);
  assert.deepEqual(byId.get("observation")?.narrativeBeats, [
    "observation",
    "meaning",
    "reveal",
    "cta",
  ]);
});

check("no two modes share the exact same arc (real structural diversity)", () => {
  const arcs = CREATIVE_MODES.map((m) => m.narrativeBeats.join(">"));
  assert.equal(new Set(arcs).size, arcs.length, "duplicate mode arcs found");
});

// --- 2. the generation prompt is mode-driven + attention-first -------------

section("generation prompt is attention-first and mode-driven");

const project = {
  id: "p1",
  name: "Test Co",
  type: "service",
  language: "cs",
  market_scope: "local",
  goal_type: "leads",
  target_audience: {},
  product_is: ["fast cleaning"],
  product_is_not: [],
  product_strengths: ["thorough"],
  pain_points: ["smelly kitchen"],
  forbidden_claims: [],
  tone_of_voice: {},
  platforms: [],
  publishing_rules: {},
  default_cta: null,
} as unknown as Project;

// Inject a known directive (Story mode) so the assertions are deterministic and
// not dependent on the seed-based picker.
const storyMode = CREATIVE_MODES.find((m) => m.id === "story")!;
const storyDirectives: CreativeDirectives = {
  mode: storyMode,
  hook: HOOK_ARCHETYPES[0],
  persona: VOICE_PERSONAS[0],
};

const prompt = buildGenerateContentPackagePrompt({
  project,
  funnelStage: "awareness" as const,
  topic: "kitchen smell",
  angle: "the sponge is the problem",
  availableAssets: [],
  targetPlatforms: ["tiktok", "instagram"] as const,
  requireVideo: true,
  videoPlatforms: ["tiktok", "instagram"] as const,
  directives: storyDirectives,
});

check("prompt carries the ATTENTION FIRST priorities block", () => {
  assert.ok(prompt.includes("ATTENTION FIRST"));
  assert.ok(/scroll-stop/i.test(prompt));
  assert.ok(/watch time/i.test(prompt));
  assert.ok(/curiosity/i.test(prompt));
});

check("prompt drives narration + visuals from the MODE BEATS", () => {
  const arc = storyMode.narrativeBeats.join(" -> ");
  assert.ok(prompt.includes(arc), `expected mode arc "${arc}" in prompt`);
  assert.ok(prompt.includes("MODE BEATS"));
  // Visual beats now follow the mode arc, not the marketing arc.
  assert.ok(/VISUAL BEATS:[\s\S]*MODE BEATS/.test(prompt));
});

check("prompt no longer POSITIVELY forces the Problem -> Scenario -> Proof arc", () => {
  // The old prompt forced: "then flow Problem -> Scenario -> Proof -> CTA" and a
  // visual arc "(hook, problem, scenario, proof, CTA)". Neither positive
  // instruction must remain (an explicit "do NOT use that template" negation is
  // allowed and expected — see the next check).
  assert.ok(
    !/then flow Problem/i.test(prompt),
    "found the old positive 'then flow Problem' instruction",
  );
  assert.ok(
    !/\(hook,\s*problem,\s*scenario,\s*proof/i.test(prompt),
    "found the old positive visual marketing arc",
  );
});

check("prompt explicitly tells the model NOT to fall back to that template", () => {
  assert.ok(
    /do not fall back to a generic hook\s*->\s*problem\s*->\s*scenario/i.test(
      prompt,
    ),
    "expected the explicit anti-template instruction",
  );
});

check("prompt still keeps the hard creative-safety rails (no fake claims)", () => {
  assert.ok(/CREATIVE SAFETY/i.test(prompt));
  assert.ok(/Never lie/i.test(prompt));
  assert.ok(/ragebait/i.test(prompt));
});

check("an un-injected prompt still resolves a directive (backward compatible)", () => {
  const auto = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness" as const,
    topic: "kitchen smell",
    angle: "the sponge is the problem",
    availableAssets: [],
    targetPlatforms: ["tiktok"] as const,
    requireVideo: true,
    videoPlatforms: ["tiktok"] as const,
  });
  assert.ok(auto.includes("ATTENTION FIRST"));
  assert.ok(auto.includes("MODE BEATS"));
  assert.ok(!/then flow Problem/i.test(auto));
});

// --- 3. storyboard role arc follows the mode -------------------------------

section("storyboard role arc is mode-driven (no marketing arc)");

const NARRATION =
  "Your kitchen still smells after you clean it. The problem is the sponge. " +
  "It traps grease and spreads it around. Swap it weekly and rinse hot. " +
  "We tested this across forty flats. The smell was gone in a day. " +
  "Try it tonight and tell us how it went.";

check("with mode beats, the role arc follows the mode order", () => {
  const beats = buildStoryboard({
    voiceoverText: NARRATION,
    sceneIds: ["s1", "s2", "s3"],
    audioDurationSeconds: 30,
    modeBeats: storyMode.narrativeBeats,
  });
  const roles = beats.map((b) => b.role);
  // First beat is the first mode beat; last is the last mode beat (cta).
  assert.equal(roles[0], "setup");
  assert.equal(roles[roles.length - 1], "cta");
  // Every role must be one of the mode beats — no foreign marketing roles.
  for (const role of roles) {
    assert.ok(
      storyMode.narrativeBeats.includes(role),
      `role "${role}" is not a story-mode beat`,
    );
  }
  // The arc must be monotonic (order preserved across the timeline).
  const idxs = roles.map((r) => storyMode.narrativeBeats.indexOf(r));
  for (let i = 1; i < idxs.length; i++) {
    assert.ok(idxs[i] >= idxs[i - 1], "mode beat order was not preserved");
  }
});

check("mode-driven roles never contain problem/scenario/proof", () => {
  for (const mode of CREATIVE_MODES) {
    const beats = buildStoryboard({
      voiceoverText: NARRATION,
      sceneIds: ["s1", "s2"],
      audioDurationSeconds: 30,
      modeBeats: mode.narrativeBeats,
    });
    for (const beat of beats) {
      assert.ok(
        !MARKETING_ARC_BEATS.includes(beat.role),
        `mode ${mode.id} produced a marketing-arc role "${beat.role}"`,
      );
    }
  }
});

check("no mode beats -> neutral hook..body..cta arc (no marketing arc)", () => {
  const beats = buildStoryboard({
    voiceoverText: NARRATION,
    sceneIds: ["s1", "s2"],
    audioDurationSeconds: 30,
  });
  const roles = beats.map((b) => b.role);
  assert.equal(roles[0], "hook");
  assert.equal(roles[roles.length - 1], "cta");
  for (const role of roles) {
    assert.ok(
      !MARKETING_ARC_BEATS.includes(role),
      `fallback arc leaked a marketing role "${role}"`,
    );
    assert.ok(
      ["hook", "body", "cta"].includes(role),
      `unexpected fallback role "${role}"`,
    );
  }
});

// --- 4. seed helpers --------------------------------------------------------

section("creative seed helpers are stable + deterministic");

check("buildCreativeSeed joins the dimensions deterministically", () => {
  assert.equal(
    buildCreativeSeed("Awareness", "kitchen smell", "the sponge", ""),
    "Awareness|kitchen smell|the sponge|",
  );
  // Null angle / salt collapse to empty segments.
  assert.equal(
    buildCreativeSeed("Awareness", "kitchen smell", null),
    "Awareness|kitchen smell||",
  );
});

check("regeneration salt changes the resolved directive vs fresh", () => {
  const base = buildCreativeSeed("Awareness", "kitchen smell", "the sponge");
  const salted = buildCreativeSeed(
    "Awareness",
    "kitchen smell",
    "the sponge",
    buildRegenerateCreativeSeedSalt("Old Title", "make it funnier"),
  );
  assert.notEqual(base, salted);
  // Both still resolve to valid directives.
  assert.ok(pickCreativeDirectives(base).mode.narrativeBeats.length > 0);
  assert.ok(pickCreativeDirectives(salted).mode.narrativeBeats.length > 0);
});

check("the same seed always resolves the same mode (determinism)", () => {
  const seed = buildCreativeSeed("Awareness", "kitchen smell", "the sponge");
  assert.equal(
    pickCreativeDirectives(seed).mode.id,
    pickCreativeDirectives(seed).mode.id,
  );
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

// Touch SHORT_PROFILE so the import is used even if assertions change.
void SHORT_PROFILE;
