// Dependency-free check for Pain Point First V1. Runs via Node's built-in type
// stripping + the "@/" alias loader:
//   npm run check:pain-point-first
//
// Pain Point First V1 — verifies that pain_points are the PRIMARY content
// source. The audit found pain_points were just one bullet in PROJECT BRAIN, so
// topic selection (weekly strategy) and package generation could anchor the
// central topic to a minor detail (a dirty switch, a trash-can smell) instead of
// a real pain point. This check proves:
//   1. pain points are injected into the strategy + package prompts,
//   2. both prompts carry the PAIN POINT FIRST block (incl. the 80/20 rule),
//   3. trend topics must connect to a pain point,
//   4. legacy projects with no pain points keep the prompt unchanged,
//   5. the deterministic per-package pain-point focus (80/20) is correct.

import assert from "node:assert/strict";
import {
  PAIN_POINT_FIRST_HEADER,
  normalizePainPoints,
  painPointFirstBlock,
} from "@/lib/ai/prompts/context";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import { buildWeeklyStrategyPrompt } from "@/lib/ai/prompts/weeklyStrategy";
import {
  SUPPORTING_EVERY,
  painPointFocusForIndex,
} from "@/lib/projects/productionRun";
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

const PAIN_POINTS = [
  "guests arrive in 1 hour and the apartment is not ready",
  "bad Airbnb review",
  "late checkout breaks the cleaning schedule",
];

// Minimal project stub — only the fields the prompt builders read.
function makeProject(painPoints: string[]): Project {
  return {
    id: "p1",
    name: "Test Co",
    type: "service",
    language: "cs",
    market_scope: "local",
    goal_type: "leads",
    target_audience: {},
    product_is: ["fast turnover cleaning"],
    product_is_not: [],
    product_strengths: ["reliable"],
    pain_points: painPoints,
    forbidden_claims: [],
    tone_of_voice: {},
    platforms: [],
    publishing_rules: {},
    default_cta: null,
    knowledge: null,
  } as unknown as Project;
}

const project = makeProject(PAIN_POINTS);
const legacyProject = makeProject([]);

const packagePrompt = buildGenerateContentPackagePrompt({
  project,
  funnelStage: "problem_aware" as const,
  topic: "stress before guest arrival",
  angle: "the clock is ticking",
  availableAssets: [],
  targetPlatforms: ["tiktok", "instagram"] as const,
  requireVideo: true,
  videoPlatforms: ["tiktok", "instagram"] as const,
});

const strategyPrompt = buildWeeklyStrategyPrompt({
  project,
  weekStart: "2026-06-08",
  weekEnd: "2026-06-14",
  eligibleTrends: [
    { id: "11111111-1111-1111-1111-111111111111", title: "summer tourism boom", relevance_score: 80 },
  ],
  evergreenTopics: [
    { id: "22222222-2222-2222-2222-222222222222", title: "turnover cleaning checklist", pillar: "ops" },
  ],
});

// --- 1. pain points are injected -------------------------------------------

section("1. pain points are injected into both prompts");

check("package prompt lists every project pain point", () => {
  for (const pp of PAIN_POINTS) {
    assert.ok(packagePrompt.includes(pp), `package prompt missing pain point: ${pp}`);
  }
});

check("strategy prompt lists every project pain point", () => {
  for (const pp of PAIN_POINTS) {
    assert.ok(strategyPrompt.includes(pp), `strategy prompt missing pain point: ${pp}`);
  }
});

check("the standalone block lists the pain points under a clear heading", () => {
  const block = painPointFirstBlock(project);
  assert.ok(block.includes("PROJECT PAIN POINTS"));
  for (const pp of PAIN_POINTS) assert.ok(block.includes(pp));
});

// --- 2. both prompts carry the PAIN POINT FIRST block -----------------------

section("2. prompts contain the PAIN POINT FIRST block");

check("package prompt contains the PAIN POINT FIRST header", () => {
  assert.ok(packagePrompt.includes(PAIN_POINT_FIRST_HEADER));
});

check("strategy prompt contains the PAIN POINT FIRST header", () => {
  assert.ok(strategyPrompt.includes(PAIN_POINT_FIRST_HEADER));
});

check("the block states the central topic must solve/expose/amplify/dramatize", () => {
  const block = painPointFirstBlock(project);
  assert.ok(/solve, expose, amplify, or dramatize/i.test(block));
});

check("the block states the 80/20 rule", () => {
  const block = painPointFirstBlock(project);
  assert.ok(/80\/20 RULE/.test(block));
  assert.ok(/80%/.test(block) && /20%/.test(block));
});

check("the block forbids a minor detail as the PRIMARY topic", () => {
  const block = painPointFirstBlock(project);
  assert.ok(/dirty switch|dusty handle|trash-can smell|forgotten object/i.test(block));
  assert.ok(/must NOT become the story/i.test(block));
});

check("the block lists GOOD and BAD primary-topic examples", () => {
  const block = painPointFirstBlock(project);
  assert.ok(/GOOD primary topics/i.test(block));
  assert.ok(/BAD primary topics/i.test(block));
  assert.ok(/bad review|late checkout|guest complaint/i.test(block));
});

// --- 3. trend topics must connect to a pain point ---------------------------

section("3. trend topics must connect to a pain point");

check("the block requires a trend to connect to a pain point", () => {
  const block = painPointFirstBlock(project);
  assert.ok(/TREND \+ PAIN POINT/i.test(block));
  assert.ok(/trend MUST connect to/i.test(block));
});

check("the block carries the GOOD/BAD trend example (tourism -> turnover)", () => {
  const block = painPointFirstBlock(project);
  assert.ok(block.includes("summer tourism boom"));
  assert.ok(/more guest turnover/i.test(block));
  assert.ok(/clean trash can lid/i.test(block));
});

check("the strategy prompt's rules line reinforces trend->pain-point anchoring", () => {
  assert.ok(/trend topic must connect to a pain point/i.test(strategyPrompt));
});

// --- 4. legacy generation still works (no pain points) ----------------------

section("4. legacy projects with no pain points keep the prompt unchanged");

check("the block is empty when the project has no pain points", () => {
  assert.equal(painPointFirstBlock(legacyProject), "");
});

check("the package prompt omits the block (and still builds) with no pain points", () => {
  const legacyPrompt = buildGenerateContentPackagePrompt({
    project: legacyProject,
    funnelStage: "awareness" as const,
    topic: "kitchen smell",
    angle: "the sponge is the problem",
    availableAssets: [],
    targetPlatforms: ["tiktok"] as const,
    requireVideo: true,
    videoPlatforms: ["tiktok"] as const,
  });
  assert.ok(!legacyPrompt.includes(PAIN_POINT_FIRST_HEADER));
  assert.ok(legacyPrompt.includes("TASK: Produce ONE content package"));
});

check("the strategy prompt omits the block (and still builds) with no pain points", () => {
  const legacyStrategy = buildWeeklyStrategyPrompt({
    project: legacyProject,
    weekStart: "2026-06-08",
    weekEnd: "2026-06-14",
    eligibleTrends: [],
    evergreenTopics: [
      { id: "22222222-2222-2222-2222-222222222222", title: "x", pillar: null },
    ],
  });
  assert.ok(!legacyStrategy.includes(PAIN_POINT_FIRST_HEADER));
  assert.ok(legacyStrategy.includes("TASK: Produce a weekly strategy"));
});

check("normalizePainPoints de-dupes, trims and drops blanks", () => {
  const dirty = makeProject(["  Bad review  ", "bad review", "", "Late checkout"]);
  assert.deepEqual(normalizePainPoints(dirty), ["Bad review", "Late checkout"]);
  assert.deepEqual(normalizePainPoints(legacyProject), []);
});

// --- 5. per-package pain-point focus (80/20) --------------------------------

section("5. deterministic per-package pain-point focus (80/20 split)");

check("no focus is assigned when the project has no pain points", () => {
  assert.equal(painPointFocusForIndex([], 0), null);
});

check("the assigned pain point cycles through the list by index", () => {
  for (let i = 0; i < PAIN_POINTS.length * 2; i++) {
    const focus = painPointFocusForIndex(PAIN_POINTS, i);
    assert.ok(focus);
    assert.equal(focus.painPoint, PAIN_POINTS[i % PAIN_POINTS.length]);
  }
});

check("the focus is deterministic for a given index", () => {
  for (const idx of [0, 3, 4, 9, 19]) {
    assert.deepEqual(
      painPointFocusForIndex(PAIN_POINTS, idx),
      painPointFocusForIndex(PAIN_POINTS, idx),
    );
  }
});

check("exactly ~20% of packages are 'supporting' (1 in every SUPPORTING_EVERY)", () => {
  const N = 100;
  let supporting = 0;
  for (let i = 0; i < N; i++) {
    if (painPointFocusForIndex(PAIN_POINTS, i)!.mode === "supporting") supporting++;
  }
  // SUPPORTING_EVERY = 5 → exactly 20 of 100 are supporting.
  assert.equal(SUPPORTING_EVERY, 5);
  assert.equal(supporting, N / SUPPORTING_EVERY);
});

check("primary packages dominate (~80%) and index 4 is supporting", () => {
  assert.equal(painPointFocusForIndex(PAIN_POINTS, 0)!.mode, "primary");
  assert.equal(painPointFocusForIndex(PAIN_POINTS, 1)!.mode, "primary");
  assert.equal(painPointFocusForIndex(PAIN_POINTS, 4)!.mode, "supporting");
  assert.equal(painPointFocusForIndex(PAIN_POINTS, 9)!.mode, "supporting");
});

check("non-finite / negative index never throws and falls back to index 0", () => {
  assert.ok(painPointFocusForIndex(PAIN_POINTS, Number.NaN));
  assert.equal(painPointFocusForIndex(PAIN_POINTS, Number.NaN)!.painPoint, PAIN_POINTS[0]);
  assert.ok(painPointFocusForIndex(PAIN_POINTS, -1));
});

// --- 6. the focus reaches the production-run diversity block -----------------

section("6. per-package focus is rendered into the PACKAGE DIVERSITY block");

check("a PRIMARY package's focus pins the pain point as the central topic", () => {
  const focus = painPointFocusForIndex(PAIN_POINTS, 0)!;
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "problem_aware" as const,
    topic: "guest turnover",
    angle: "the clock is ticking",
    availableAssets: [],
    targetPlatforms: ["tiktok"] as const,
    requireVideo: true,
    videoPlatforms: ["tiktok"] as const,
    packageDiversity: {
      packageIndex: 0,
      packageCount: 5,
      painPoint: focus.painPoint,
      painPointMode: focus.mode,
    },
  });
  assert.ok(/PAIN POINT FOCUS \(this package is PRIMARY\)/.test(prompt));
  assert.ok(prompt.includes(focus.painPoint));
});

check("a SUPPORTING package's focus still ties back to the pain point", () => {
  const focus = painPointFocusForIndex(PAIN_POINTS, 4)!;
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness" as const,
    topic: "a small detail guests notice",
    angle: "supporting evidence",
    availableAssets: [],
    targetPlatforms: ["tiktok"] as const,
    requireVideo: true,
    videoPlatforms: ["tiktok"] as const,
    packageDiversity: {
      packageIndex: 4,
      packageCount: 5,
      painPoint: focus.painPoint,
      painPointMode: focus.mode,
    },
  });
  assert.ok(/PAIN POINT FOCUS \(this package is a SUPPORTING one\)/.test(prompt));
  assert.ok(prompt.includes(focus.painPoint));
  assert.ok(/tie back to that pain/i.test(prompt));
});

check("diversity block without a pain point omits the PAIN POINT FOCUS line", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project: legacyProject,
    funnelStage: "awareness" as const,
    topic: "x",
    angle: "y",
    availableAssets: [],
    targetPlatforms: ["tiktok"] as const,
    requireVideo: true,
    videoPlatforms: ["tiktok"] as const,
    packageDiversity: { packageIndex: 0, packageCount: 5 },
  });
  assert.ok(prompt.includes("PACKAGE DIVERSITY"));
  assert.ok(!/PAIN POINT FOCUS/.test(prompt));
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
