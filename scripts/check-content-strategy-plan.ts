// Production content strategy plan checks (guardrails + prompt contract).
//   npm run check:content-strategy-plan

import assert from "node:assert/strict";
import { buildProductionStrategyPrompt } from "@/lib/ai/prompts/contentStrategyPlan";
import {
  checkContentPlanFunnelDiversity,
  checkContentPlanLength,
  checkContentStrategyPlanGuardrails,
} from "@/lib/ai/guardrails";
import type { ContentStrategyPlanOutput } from "@/lib/ai/schemas/contentStrategyPlan";
import type { Project } from "@/lib/supabase/types";
import {
  readProductionPlannerMax,
  readProductionStrategyPlannerMode,
} from "@/lib/production/strategyPlannerConfig";

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

const minimalProject = {
  name: "Test Co",
  type: "saas",
  language: "cs",
  market_scope: "local",
  goal_type: "lead_generation",
  target_audience: {},
  tone_of_voice: {},
  product_is: ["widget"],
  product_is_not: [],
  product_strengths: [],
  pain_points: ["slow ops"],
  forbidden_claims: [],
  platforms: ["tiktok"],
  default_cta: null,
  publishing_rules: {},
} as unknown as Project;

function samplePlan(itemCount: number): ContentStrategyPlanOutput {
  const content_plan = Array.from({ length: itemCount }, (_u, i) => ({
    platform: "tiktok" as const,
    format: "reel" as const,
    funnel_stage: i % 2 === 0 ? "Awareness" : "Problem Aware",
    topic: `Topic ${i + 1}`,
    angle: `Angle ${i + 1}`,
  }));
  return {
    theme: "Run theme",
    funnel_distribution: {
      Awareness: 50,
      "Problem Aware": 50,
      "Solution Aware": 0,
      Conversion: 0,
    },
    content_plan,
  } as unknown as ContentStrategyPlanOutput;
}

function homogeneousPlan(
  itemCount: number,
  funnelStage: string,
): ContentStrategyPlanOutput {
  const content_plan = Array.from({ length: itemCount }, (_u, i) => ({
    platform: "tiktok" as const,
    format: "reel" as const,
    funnel_stage: funnelStage,
    topic: `Topic ${i + 1}`,
    angle: `Angle ${i + 1}`,
  }));
  return {
    theme: "Run theme",
    funnel_distribution: { Awareness: 100 },
    content_plan,
  } as unknown as ContentStrategyPlanOutput;
}

function mixedStagesPlan(
  itemCount: number,
  stages: string[],
): ContentStrategyPlanOutput {
  const content_plan = Array.from({ length: itemCount }, (_u, i) => ({
    platform: "tiktok" as const,
    format: "reel" as const,
    funnel_stage: stages[i % stages.length]!,
    topic: `Topic ${i + 1}`,
    angle: `Angle ${i + 1}`,
  }));
  return {
    theme: "Run theme",
    funnel_distribution: {
      Awareness: 34,
      "Problem Aware": 33,
      "Solution Aware": 33,
      Conversion: 0,
    },
    content_plan,
  } as unknown as ContentStrategyPlanOutput;
}

console.log("\ncontent plan length guardrail");
check("accepts exact count 21", () => {
  assert.deepEqual(checkContentPlanLength(samplePlan(21), 21), []);
});
check("rejects 20 when 21 expected", () => {
  const issues = checkContentPlanLength(samplePlan(20), 21);
  assert.ok(issues.some((i) => i.path === "$.content_plan"));
});

console.log("\nproduction strategy guardrails");
check("21-item alternating plan passes base funnel guardrails", () => {
  const issues = checkContentStrategyPlanGuardrails(samplePlan(21));
  assert.equal(issues.length, 0);
});

console.log("\nfunnel diversity guardrail (production planner)");
check("21× Awareness fails", () => {
  const issues = checkContentPlanFunnelDiversity(
    homogeneousPlan(21, "Awareness"),
    21,
  );
  assert.ok(
    issues.some((i) =>
      i.message.includes(
        "content_plan must include at least 3 distinct funnel stages for packageCount=21",
      ),
    ),
  );
});
check("21× Problem Aware fails", () => {
  const issues = checkContentPlanFunnelDiversity(
    homogeneousPlan(21, "Problem Aware"),
    21,
  );
  assert.equal(issues.length, 1);
});
check("21 mixed across 3 stages passes", () => {
  const issues = checkContentPlanFunnelDiversity(
    mixedStagesPlan(21, ["Awareness", "Problem Aware", "Solution Aware"]),
    21,
  );
  assert.deepEqual(issues, []);
});
check("3 items with 2 stages passes", () => {
  const issues = checkContentPlanFunnelDiversity(
    mixedStagesPlan(3, ["Awareness", "Problem Aware"]),
    3,
  );
  assert.deepEqual(issues, []);
});
check("3 items with 1 stage fails", () => {
  const issues = checkContentPlanFunnelDiversity(
    homogeneousPlan(3, "Awareness"),
    3,
  );
  assert.ok(
    issues.some((i) =>
      i.message.includes(
        "content_plan must include at least 2 distinct funnel stages for packageCount=3",
      ),
    ),
  );
});
check("1 item with 1 stage passes", () => {
  const issues = checkContentPlanFunnelDiversity(
    homogeneousPlan(1, "Awareness"),
    1,
  );
  assert.deepEqual(issues, []);
});

console.log("\nprompt contract");
check("prompt mentions exactly 21 items", () => {
  const prompt = buildProductionStrategyPrompt({
    project: minimalProject,
    packageCount: 21,
    eligibleTrends: [],
    evergreenTopics: [],
    primaryPlatform: "tiktok",
  });
  assert.ok(prompt.includes("exactly 21"));
  assert.ok(!prompt.includes("week_start"));
  assert.ok(!prompt.includes("WEEK:"));
});

console.log("\nfeature flag defaults");
check("planner mode defaults to legacy", () => {
  const prev = process.env.PRODUCTION_STRATEGY_PLANNER;
  delete process.env.PRODUCTION_STRATEGY_PLANNER;
  assert.equal(readProductionStrategyPlannerMode(), "legacy");
  if (prev !== undefined) process.env.PRODUCTION_STRATEGY_PLANNER = prev;
});
check("planner max defaults to 21", () => {
  const prev = process.env.PRODUCTION_PLANNER_MAX;
  delete process.env.PRODUCTION_PLANNER_MAX;
  assert.equal(readProductionPlannerMax(), 21);
  if (prev !== undefined) process.env.PRODUCTION_PLANNER_MAX = prev;
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
