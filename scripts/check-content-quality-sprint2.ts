// Dependency-free check for Content Quality Sprint 2. Runs via Node's built-in
// type stripping + the "@/" alias loader:
//   npm run check:content-quality-sprint2
//
// Content Quality Sprint 2 verifies the five quality rules introduced in this
// sprint:
//   1. HARD video length target 15–25s (SHORT_PROFILE).
//   2. Voiceover budget: target 40–70 words, HARD cap 80 (guardrail rejects > 80
//      only; the min is prompt guidance, never a reject).
//   3. Tail buffer +1.5s appended to the final beat's on-screen hold.
//   4. Preferred story arc Hook -> Twist -> Payoff -> CTA (picker bias + prompt).
//   5. Forbidden: long explanations / background story / corporate copy
//      (prompt FORBIDDEN block + corporate-copy guardrail).

import assert from "node:assert/strict";
import {
  SHORT_PROFILE,
  TAIL_BUFFER_SECONDS,
  buildStoryboard,
  type StoryboardBeat,
} from "@/lib/video-engine/storyboard";
import {
  checkContentPackageGuardrails,
  CORPORATE_COPY_PHRASES,
  VOICEOVER_HARD_CAP_WORDS,
  VOICEOVER_TARGET_MAX_WORDS,
  VOICEOVER_TARGET_MIN_WORDS,
  type PackageGuardrailContext,
} from "@/lib/ai/guardrails";
import {
  CREATIVE_MODES,
  PREFERRED_CREATIVE_MODES,
  PREFERRED_STORY_ARC,
  buildCreativeSeed,
  pickCreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
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

function timelineTotalSeconds(
  beats: StoryboardBeat[],
  transitionSeconds: number,
): number {
  if (beats.length === 0) return 0;
  let cumulative = beats[0].durationSeconds;
  for (let i = 1; i < beats.length; i++) {
    const td = Math.min(transitionSeconds, beats[i].durationSeconds / 2);
    cumulative = cumulative - td + beats[i].durationSeconds;
  }
  return cumulative;
}

const NARRATION =
  "Your kitchen still smells after you clean it. The problem is the sponge. " +
  "It traps grease and spreads it around. Swap it weekly and rinse hot. " +
  "The smell was gone in a day. Try it tonight and tell us how it went.";

// --- 1. hard 15–25s video length target ------------------------------------

section("1. hard video length target is 15–25s");

check("SHORT_PROFILE duration window is 15–25s", () => {
  assert.equal(SHORT_PROFILE.minDurationSeconds, 15);
  assert.equal(SHORT_PROFILE.maxDurationSeconds, 25);
});

check("beat range matches the shorter format (adaptive 3–5 beats)", () => {
  assert.equal(SHORT_PROFILE.minBeats, 3);
  assert.equal(SHORT_PROFILE.maxBeats, 5);
});

check("legacy estimate clamps the timeline into the 15–25s window", () => {
  const beats = buildStoryboard({
    voiceoverText: NARRATION,
    sceneIds: ["s1", "s2"],
  });
  const total = timelineTotalSeconds(beats, SHORT_PROFILE.transitionSeconds);
  assert.ok(
    total >= SHORT_PROFILE.minDurationSeconds - 1 &&
      total <= SHORT_PROFILE.maxDurationSeconds + 1,
    `expected within [15, 25], got ${total.toFixed(3)}s`,
  );
});

// --- 2. voiceover budget (target 40–70, hard cap 80) -----------------------

section("2. voiceover length budget (40–70 words, hard cap 80)");

check("budget constants are 40 / 70 / 80", () => {
  assert.equal(VOICEOVER_TARGET_MIN_WORDS, 40);
  assert.equal(VOICEOVER_TARGET_MAX_WORDS, 70);
  assert.equal(VOICEOVER_HARD_CAP_WORDS, 80);
});

function words(n: number): string {
  return Array.from({ length: n }, (_v, i) => `word${i}`).join(" ");
}

function basePackage(): ContentPackageOutput {
  const po = { caption: "Engaging caption", cta: "Learn more" };
  return {
    title: "Spring launch",
    funnel_stage: "problem_aware",
    hook: "Struggling with X?",
    voiceover_text: "Here is how we help, quickly and simply.",
    subtitles: "Here is how we help.",
    cta: { type: "learn_more", text: "Learn more" },
    video: { concept: "Explainer", script: "Scene 1..." },
    platform_outputs: {
      tiktok: po,
      instagram: po,
      youtube: po,
      facebook: po,
      linkedin: po,
      x: po,
      google_business: po,
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

function paths(issues: ValidationIssue[]): string[] {
  return issues.map((i) => i.path);
}

function hasMessage(issues: ValidationIssue[], substring: string): boolean {
  return issues.some((i) => i.message.includes(substring));
}

check("voiceover over the hard cap (81 words) is rejected", () => {
  const pkg = basePackage();
  pkg.voiceover_text = words(81);
  assert.ok(
    paths(checkContentPackageGuardrails(pkg, baseCtx())).includes(
      "$.voiceover_text",
    ),
  );
});

check("voiceover exactly at the cap (80 words) passes", () => {
  const pkg = basePackage();
  pkg.voiceover_text = words(80);
  assert.ok(
    !paths(checkContentPackageGuardrails(pkg, baseCtx())).includes(
      "$.voiceover_text",
    ),
  );
});

check("a short voiceover (< 40 words) is NOT rejected (target, not a floor)", () => {
  const pkg = basePackage();
  pkg.voiceover_text = words(10);
  assert.ok(
    !paths(checkContentPackageGuardrails(pkg, baseCtx())).includes(
      "$.voiceover_text",
    ),
  );
});

// --- 3. tail buffer (+1.5s) ------------------------------------------------

section("3. tail buffer adds a +1.5s final hold");

check("TAIL_BUFFER_SECONDS is 1.5", () => {
  assert.equal(TAIL_BUFFER_SECONDS, 1.5);
});

check("tail buffer extends the total timeline by ~1.5s", () => {
  const without = buildStoryboard({
    voiceoverText: NARRATION,
    sceneIds: ["s1", "s2", "s3"],
    audioDurationSeconds: 20,
  });
  const withTail = buildStoryboard({
    voiceoverText: NARRATION,
    sceneIds: ["s1", "s2", "s3"],
    audioDurationSeconds: 20,
    tailBufferSeconds: TAIL_BUFFER_SECONDS,
  });
  const a = timelineTotalSeconds(without, SHORT_PROFILE.transitionSeconds);
  const b = timelineTotalSeconds(withTail, SHORT_PROFILE.transitionSeconds);
  assert.ok(
    Math.abs(b - a - TAIL_BUFFER_SECONDS) < 0.05,
    `expected +${TAIL_BUFFER_SECONDS}s, got +${(b - a).toFixed(3)}s`,
  );
});

check("the tail lands on the LAST beat only", () => {
  const without = buildStoryboard({
    voiceoverText: NARRATION,
    sceneIds: ["s1"],
    audioDurationSeconds: 20,
  });
  const withTail = buildStoryboard({
    voiceoverText: NARRATION,
    sceneIds: ["s1"],
    audioDurationSeconds: 20,
    tailBufferSeconds: TAIL_BUFFER_SECONDS,
  });
  assert.equal(without.length, withTail.length);
  for (let i = 0; i < without.length - 1; i++) {
    assert.ok(
      Math.abs(without[i].durationSeconds - withTail[i].durationSeconds) < 0.01,
      `beat ${i} changed unexpectedly`,
    );
  }
  const last = withTail.length - 1;
  assert.ok(
    Math.abs(
      withTail[last].durationSeconds -
        without[last].durationSeconds -
        TAIL_BUFFER_SECONDS,
    ) < 0.01,
  );
});

check("no tail param keeps the timeline unchanged (backward compatible)", () => {
  const beats = buildStoryboard({
    voiceoverText: NARRATION,
    sceneIds: ["s1", "s2"],
    audioDurationSeconds: 20,
  });
  const total = timelineTotalSeconds(beats, SHORT_PROFILE.transitionSeconds);
  assert.ok(Math.abs(total - 20) < 0.1, `expected ~20s, got ${total.toFixed(3)}s`);
});

// --- 4. preferred story arc (Hook -> Twist -> Payoff -> CTA) ----------------

section("4. preferred story arc is Hook -> Twist -> Payoff -> CTA");

check("PREFERRED_STORY_ARC is the expected 4-beat arc", () => {
  assert.deepEqual([...PREFERRED_STORY_ARC], ["hook", "twist", "payoff", "cta"]);
});

check("preferred mode pool is non-empty and every member is flagged", () => {
  assert.ok(PREFERRED_CREATIVE_MODES.length > 0);
  assert.ok(PREFERRED_CREATIVE_MODES.every((m) => m.preferred === true));
  // Not every mode is preferred — variety is retained.
  assert.ok(PREFERRED_CREATIVE_MODES.length < CREATIVE_MODES.length);
});

check("the picker only resolves preferred modes (and stays deterministic)", () => {
  const preferredIds = new Set(PREFERRED_CREATIVE_MODES.map((m) => m.id));
  for (const topic of ["kitchen smell", "tax tips", "gym habits", "saas churn"]) {
    const seed = buildCreativeSeed("Awareness", topic, null);
    const first = pickCreativeDirectives(seed).mode.id;
    const second = pickCreativeDirectives(seed).mode.id;
    assert.equal(first, second, "picker is not deterministic");
    assert.ok(
      preferredIds.has(first),
      `seed "${topic}" resolved a non-preferred mode "${first}"`,
    );
  }
});

// --- 5. forbidden copy (long explanation / background story / corporate) ----

section("5. forbidden corporate / background-story copy");

check("corporate copy in the narration is flagged", () => {
  const pkg = basePackage();
  pkg.voiceover_text = "We are committed to industry-leading, world-class service.";
  assert.ok(
    hasMessage(
      checkContentPackageGuardrails(pkg, baseCtx()),
      "corporate/background-story copy present",
    ),
  );
});

check("a company-history opener is flagged", () => {
  const pkg = basePackage();
  pkg.platform_outputs.linkedin.caption =
    "Founded in 1998, our company has grown every year.";
  assert.ok(
    hasMessage(
      checkContentPackageGuardrails(pkg, baseCtx()),
      "corporate/background-story copy present",
    ),
  );
});

check("clean, native copy is NOT flagged as corporate", () => {
  assert.ok(
    !hasMessage(
      checkContentPackageGuardrails(basePackage(), baseCtx()),
      "corporate/background-story copy present",
    ),
  );
});

check("the corporate phrase list is non-empty", () => {
  assert.ok(CORPORATE_COPY_PHRASES.length > 0);
});

// --- 6. the generation prompt carries the sprint-2 rules --------------------

section("6. generation prompt carries the Content Quality Sprint 2 rules");

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

const prompt = buildGenerateContentPackagePrompt({
  project,
  funnelStage: "awareness" as const,
  topic: "kitchen smell",
  angle: "the sponge is the problem",
  availableAssets: [],
  targetPlatforms: ["tiktok", "instagram"] as const,
  requireVideo: true,
  videoPlatforms: ["tiktok", "instagram"] as const,
});

check("prompt states the hard 15–25s video length target", () => {
  assert.ok(/HARD video length target: 15.?25s/.test(prompt));
});

check("prompt states the 40–70 word target and the 80 hard cap", () => {
  assert.ok(/40.?70 words/.test(prompt));
  assert.ok(new RegExp(`exceed ${VOICEOVER_HARD_CAP_WORDS} words`).test(prompt));
});

check("prompt names MODE BEATS as the only story structure (C1 resolved)", () => {
  assert.ok(/ONLY story structure/i.test(prompt));
  assert.ok(/MODE BEATS/i.test(prompt));
  assert.ok(!/PREFERRED STORY ARC:/i.test(prompt));
  assert.ok(/PACING \(non-authoritative/i.test(prompt));
});

check("prompt forbids long explanations / background story / corporate copy", () => {
  assert.ok(/FORBIDDEN/.test(prompt));
  assert.ok(/Zakázat/.test(prompt));
  assert.ok(/long explanations/i.test(prompt));
  assert.ok(/company-history|background/i.test(prompt));
  assert.ok(/corporate copy|jargon/i.test(prompt));
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
