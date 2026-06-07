// Dependency-free check for the Weekly Strategy guardrails (Content Strategy
// Layer). Runs via Node's built-in type stripping + the "@/" alias loader:
//   npm run check:weekly-strategy-guardrails
//
// Mirrors the other check scripts (no test framework, node:assert/strict).
// Test data is kept inline in this single file on purpose.

import assert from "node:assert/strict";
import {
  checkWeeklyStrategyGuardrails,
  checkWeeklyStrategySources,
  type WeeklyStrategySourceContext,
} from "@/lib/ai/guardrails";
import { MIN_TREND_RELEVANCE } from "@/lib/ai/schemas/trendRelevanceScore";
import type {
  ContentPlanItem,
  WeeklyStrategyOutput,
} from "@/lib/ai/schemas/weeklyStrategy";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";

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

// --- fixtures (inline) -----------------------------------------------------

function planItem(over: Partial<ContentPlanItem>): ContentPlanItem {
  return {
    platform: "instagram",
    format: "post",
    funnel_stage: "awareness",
    topic: "topic",
    angle: undefined,
    day: undefined,
    priority: undefined,
    trend_id: undefined,
    evergreen_topic_id: undefined,
    ...over,
  } as ContentPlanItem;
}

// Valid balanced weekly strategy: an evergreen-sourced awareness item plus a
// trend-sourced problem_aware item (trend "tr-1" scored 75).
function buildStrategy(): WeeklyStrategyOutput {
  return {
    week_start: "2026-06-01",
    week_end: "2026-06-07",
    theme: "Spring launch",
    funnel_distribution: {
      awareness: 2,
      problem_aware: 2,
      solution_aware: 1,
      conversion: 1,
    },
    content_plan: [
      planItem({
        platform: "instagram",
        funnel_stage: "Awareness",
        evergreen_topic_id: "ev-1",
      }),
      planItem({
        platform: "linkedin",
        funnel_stage: "problem_aware",
        trend_id: "tr-1",
      }),
    ],
  } as WeeklyStrategyOutput;
}

function baseCtx(): WeeklyStrategySourceContext {
  return { trendScores: { "tr-1": 75 } };
}

function issuesFor(
  strategy: WeeklyStrategyOutput,
  ctx: WeeklyStrategySourceContext = baseCtx(),
): ValidationIssue[] {
  return [
    ...checkWeeklyStrategyGuardrails(strategy),
    ...checkWeeklyStrategySources(strategy, ctx),
  ];
}

function paths(issues: ValidationIssue[]): string[] {
  return issues.map((i) => i.path);
}

// --- 1. positive cases -----------------------------------------------------

section("weekly strategy guardrails — positive");

check("valid weekly strategy passes with no issues", () => {
  assert.deepEqual(issuesFor(buildStrategy()), []);
});

check("funnel_stage as human labels passes", () => {
  const s = buildStrategy();
  s.content_plan[0].funnel_stage = "Awareness";
  s.content_plan[1].funnel_stage = "Solution Aware";
  assert.deepEqual(issuesFor(s), []);
});

check("funnel_stage as DB values passes", () => {
  const s = buildStrategy();
  s.content_plan[0].funnel_stage = "awareness";
  s.content_plan[1].funnel_stage = "solution_aware";
  assert.deepEqual(issuesFor(s), []);
});

check("balanced funnel_distribution passes", () => {
  const s = buildStrategy();
  s.funnel_distribution = { awareness: 3, problem_aware: 1, conversion: 1 };
  assert.equal(paths(issuesFor(s)).includes("$.funnel_distribution"), false);
});

check("trend item with score >= 60 passes", () => {
  const s = buildStrategy();
  const ctx: WeeklyStrategySourceContext = { trendScores: { "tr-1": 60 } };
  assert.equal(
    paths(issuesFor(s, ctx)).includes("$.content_plan[1].trend_id"),
    false,
  );
});

check("evergreen item without a trend score passes", () => {
  const s = buildStrategy();
  s.content_plan = [
    planItem({ funnel_stage: "awareness", evergreen_topic_id: "ev-1" }),
  ];
  // Empty trendScores: no trend referenced, so no score needed.
  assert.deepEqual(issuesFor(s, { trendScores: {} }), []);
});

// --- 2. negative cases -----------------------------------------------------

section("weekly strategy guardrails — negative (header / plan)");

check("missing week_start fails", () => {
  const s = buildStrategy();
  s.week_start = "";
  assert.ok(paths(issuesFor(s)).includes("$.week_start"));
});

check("missing week_end fails", () => {
  const s = buildStrategy();
  s.week_end = "";
  assert.ok(paths(issuesFor(s)).includes("$.week_end"));
});

check("empty content_plan fails", () => {
  const s = buildStrategy();
  s.content_plan = [];
  assert.ok(paths(issuesFor(s)).includes("$.content_plan"));
});

section("weekly strategy guardrails — negative (funnel)");

check("item without funnel_stage fails", () => {
  const s = buildStrategy();
  s.content_plan[0].funnel_stage = "";
  assert.ok(paths(issuesFor(s)).includes("$.content_plan[0].funnel_stage"));
});

check("consideration as funnel_stage fails", () => {
  const s = buildStrategy();
  s.content_plan[0].funnel_stage = "consideration";
  assert.ok(paths(issuesFor(s)).includes("$.content_plan[0].funnel_stage"));
});

check("retention as funnel_stage fails", () => {
  const s = buildStrategy();
  s.content_plan[0].funnel_stage = "retention";
  assert.ok(paths(issuesFor(s)).includes("$.content_plan[0].funnel_stage"));
});

check("funnel_distribution Conversion-only fails", () => {
  const s = buildStrategy();
  s.funnel_distribution = { conversion: 4 };
  s.content_plan = [
    planItem({ funnel_stage: "conversion", evergreen_topic_id: "ev-1" }),
  ];
  assert.ok(paths(issuesFor(s)).includes("$.funnel_distribution"));
});

section("weekly strategy guardrails — negative (sources)");

check("trend item with score < 60 fails", () => {
  const s = buildStrategy();
  const ctx: WeeklyStrategySourceContext = { trendScores: { "tr-1": 40 } };
  assert.ok(paths(issuesFor(s, ctx)).includes("$.content_plan[1].trend_id"));
});

check("trend item with no score fails", () => {
  const s = buildStrategy();
  assert.ok(
    paths(issuesFor(s, { trendScores: {} })).includes(
      "$.content_plan[1].trend_id",
    ),
  );
});

check("item without topic_source fails", () => {
  const s = buildStrategy();
  s.content_plan = [planItem({ funnel_stage: "awareness" })];
  assert.ok(paths(issuesFor(s)).includes("$.content_plan[0].topic_source"));
});

check("item without platform fails", () => {
  const s = buildStrategy();
  s.content_plan = [
    planItem({
      platform: "" as ContentPlanItem["platform"],
      funnel_stage: "awareness",
      evergreen_topic_id: "ev-1",
    }),
  ];
  assert.ok(paths(issuesFor(s)).includes("$.content_plan[0].platform"));
});

// --- workflow parity -------------------------------------------------------
// Mirrors the combined guardrails closure used by runWeeklyStrategy: a source
// failure must produce validation issues (-> generation_failed, no persist).

section("weekly strategy guardrails — workflow closure parity");

function workflowGuardrails(
  strategy: WeeklyStrategyOutput,
  ctx: WeeklyStrategySourceContext,
): ValidationIssue[] {
  return [
    ...checkWeeklyStrategyGuardrails(strategy),
    ...checkWeeklyStrategySources(strategy, ctx),
  ];
}

check("closure: valid strategy yields no issues", () => {
  assert.deepEqual(workflowGuardrails(buildStrategy(), baseCtx()), []);
});

check("closure: trend score < 60 yields validation issues", () => {
  const issues = workflowGuardrails(buildStrategy(), {
    trendScores: { "tr-1": 40 },
  });
  assert.ok(issues.length > 0);
  assert.ok(issues.some((i) => i.path === "$.content_plan[1].trend_id"));
});

check("closure: missing platform yields validation issues", () => {
  const s = buildStrategy();
  s.content_plan = [
    planItem({
      platform: "" as ContentPlanItem["platform"],
      funnel_stage: "awareness",
      evergreen_topic_id: "ev-1",
    }),
  ];
  const issues = workflowGuardrails(s, { trendScores: {} });
  assert.ok(issues.some((i) => i.path === "$.content_plan[0].platform"));
});

// --- boundary sanity -------------------------------------------------------

section("weekly strategy guardrails — boundary");

check(`MIN_TREND_RELEVANCE is ${MIN_TREND_RELEVANCE}`, () => {
  assert.equal(MIN_TREND_RELEVANCE, 60);
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
