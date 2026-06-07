// Dependency-free check script for funnel-stage normalization and validation.
// The project has no test framework / tsx, so this runs via Node's built-in
// type stripping with a small "@/" alias loader:
//   npm run check:funnel-stage
//
// Goal: guarantee that the forbidden funnel stages "consideration" and
// "retention" can never re-enter the funnel domain, while the unrelated
// goal_type "retention" stays intact.

import assert from "node:assert/strict";
import {
  CTA_TYPES_BY_GOAL,
  isFunnelStageInput,
  normalizeFunnelStage,
} from "@/lib/ai/types";
import { validate, vFunnelStage } from "@/lib/ai/validateAiOutput";
import {
  checkContentPackageGuardrails,
  type PackageGuardrailContext,
} from "@/lib/ai/guardrails";
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

// --- helpers ---------------------------------------------------------------

function isFunnelValid(value: unknown): boolean {
  return validate(vFunnelStage(), value).ok;
}

// Builds a fully-valid content package output so the guardrail's only failing
// dimension under test is funnel_stage.
function buildPackage(funnelStage: string): ContentPackageOutput {
  const platformOutput = { caption: "caption", cta: "Learn more" };
  return {
    title: "Title",
    funnel_stage: funnelStage,
    hook: "Hook",
    voiceover_text: "Voiceover",
    subtitles: "Subtitles",
    cta: { type: "learn_more", text: "Learn more" },
    video: { concept: "Concept", script: "Script" },
    platform_outputs: {
      tiktok: platformOutput,
      instagram: platformOutput,
      facebook: platformOutput,
      linkedin: platformOutput,
      google_business: platformOutput,
    },
  } as ContentPackageOutput;
}

const guardrailContext: PackageGuardrailContext = {
  project: {
    goal_type: "awareness",
    forbidden_claims: [],
    product_is_not: [],
  },
  weeklyStrategyId: "ws-1",
  strategyItemId: "si-1",
  strategyItemFunnelStage: "problem_aware",
};

function funnelStageIssues(pkg: ContentPackageOutput): string[] {
  return checkContentPackageGuardrails(pkg, guardrailContext)
    .filter((i) => i.path === "$.funnel_stage")
    .map((i) => i.message);
}

// --- 1. normalizeFunnelStage: accepted -------------------------------------

section("normalizeFunnelStage — accepted");

const accepted: [string, string][] = [
  ["Awareness", "awareness"],
  ["Problem Aware", "problem_aware"],
  ["Solution Aware", "solution_aware"],
  ["Conversion", "conversion"],
  ["awareness", "awareness"],
  ["problem_aware", "problem_aware"],
  ["solution_aware", "solution_aware"],
  ["conversion", "conversion"],
  // case + spacing + underscore variants
  ["PROBLEM AWARE", "problem_aware"],
  ["  Solution   Aware  ", "solution_aware"],
  ["problem aware", "problem_aware"],
  ["Solution_Aware", "solution_aware"],
  ["cOnVeRsIoN", "conversion"],
];

for (const [input, expected] of accepted) {
  check(`"${input}" -> ${expected}`, () => {
    assert.equal(normalizeFunnelStage(input), expected);
  });
}

// --- 2. normalizeFunnelStage: rejected -------------------------------------

section("normalizeFunnelStage — rejected");

const rejected: [string, unknown][] = [
  ["consideration", "consideration"],
  ["retention", "retention"],
  ["Consideration", "Consideration"],
  ["Retention", "Retention"],
  ["empty string", ""],
  ["whitespace only", "   "],
  ["null", null],
  ["undefined", undefined],
  ["unknown", "unknown"],
  ["number", 123],
];

for (const [name, value] of rejected) {
  check(`${name} -> null`, () => {
    assert.equal(normalizeFunnelStage(value), null);
    assert.equal(isFunnelStageInput(value), false);
  });
}

// --- 3. vFunnelStage validator ---------------------------------------------

section("vFunnelStage validator");

for (const label of ["Awareness", "Problem Aware", "Solution Aware", "Conversion"]) {
  check(`accepts label "${label}"`, () => assert.equal(isFunnelValid(label), true));
}
for (const dbValue of ["awareness", "problem_aware", "solution_aware", "conversion"]) {
  check(`accepts db value "${dbValue}"`, () =>
    assert.equal(isFunnelValid(dbValue), true),
  );
}
for (const bad of ["consideration", "retention", "unknown", ""]) {
  check(`rejects "${bad}"`, () => assert.equal(isFunnelValid(bad), false));
}

// --- 4. guardrail: package funnel_stage vs strategy item -------------------

section("content package guardrail — funnel_stage");

check("matching label (Problem Aware) passes funnel check", () => {
  assert.deepEqual(funnelStageIssues(buildPackage("Problem Aware")), []);
});
check("matching db value (problem_aware) passes funnel check", () => {
  assert.deepEqual(funnelStageIssues(buildPackage("problem_aware")), []);
});
check("mismatching stage (Awareness vs problem_aware) fails funnel check", () => {
  assert.equal(funnelStageIssues(buildPackage("Awareness")).length, 1);
});
check("consideration fails funnel check", () => {
  assert.equal(funnelStageIssues(buildPackage("consideration")).length, 1);
});
check("retention fails funnel check", () => {
  assert.equal(funnelStageIssues(buildPackage("retention")).length, 1);
});

// --- 5. goal_type retention is a different domain --------------------------

section("goal_type retention is unaffected");

check("CTA_TYPES_BY_GOAL.retention still exists (goal domain)", () => {
  assert.ok(Array.isArray(CTA_TYPES_BY_GOAL.retention));
  assert.ok(CTA_TYPES_BY_GOAL.retention.length > 0);
});
check("retention is not a valid funnel stage", () => {
  assert.equal(normalizeFunnelStage("retention"), null);
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
