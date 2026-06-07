// Dependency-free check for the Content Package guardrails (Creative Engine).
// Runs via Node's built-in type stripping + the "@/" alias loader:
//   npm run check:content-package-guardrails
//
// Mirrors scripts/check-funnel-stage.ts (no test framework, node:assert/strict).
// Test data is kept inline in this single file on purpose.

import assert from "node:assert/strict";
import { REQUIRED_PACKAGE_PLATFORMS } from "@/lib/ai/types";
import {
  checkAssetModification,
  checkContentPackageGuardrails,
  classifyAsset,
  type AssetClass,
  type PackageGuardrailContext,
} from "@/lib/ai/guardrails";
import { getImageProvider } from "@/lib/ai/index";
import type { ContentPackageOutput, PackageAssetUsage } from "@/lib/ai/schemas/contentPackage";
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

function platformOutput(): { caption: string; cta: string } {
  return { caption: "Engaging caption", cta: "Learn more" };
}

// A fully valid content package output (passes every guardrail with baseCtx).
function buildPackage(): ContentPackageOutput {
  return {
    title: "Spring launch",
    funnel_stage: "problem_aware",
    hook: "Struggling with X?",
    voiceover_text: "Here is how we help.",
    subtitles: "Here is how we help.",
    cta: { type: "learn_more", text: "Learn more" },
    video: { concept: "Explainer", script: "Scene 1..." },
    platform_outputs: {
      tiktok: platformOutput(),
      instagram: platformOutput(),
      facebook: platformOutput(),
      linkedin: platformOutput(),
      google_business: platformOutput(),
    },
  } as ContentPackageOutput;
}

// Default context: strategic ids present, strategy item is problem_aware,
// project goal awareness, no forbidden/product_is_not phrases.
function baseCtx(): PackageGuardrailContext {
  return {
    project: {
      goal_type: "awareness",
      forbidden_claims: [],
      product_is_not: [],
    },
    weeklyStrategyId: "ws-1",
    strategyItemId: "si-1",
    strategyItemFunnelStage: "problem_aware",
  };
}

function issuesFor(
  pkg: ContentPackageOutput,
  ctx: PackageGuardrailContext = baseCtx(),
): ValidationIssue[] {
  return checkContentPackageGuardrails(pkg, ctx);
}

function paths(issues: ValidationIssue[]): string[] {
  return issues.map((i) => i.path);
}

function hasMessage(issues: ValidationIssue[], substring: string): boolean {
  return issues.some((i) => i.message.includes(substring));
}

function deletePlatform(pkg: ContentPackageOutput, platform: string): void {
  delete (pkg.platform_outputs as Record<string, unknown>)[platform];
}

// Mirrors the asset_usage loop in makePackageGuardrails (packageShared.ts),
// exercising the exported pure functions classifyAsset / checkAssetModification
// without importing the workflow layer.
function assetUsageIssues(
  assetUsage: PackageAssetUsage[],
  classById: Map<string, AssetClass>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const usage of assetUsage) {
    const cls = classById.get(usage.asset_id);
    if (!cls) {
      issues.push({
        path: "$.asset_usage",
        message: `asset ${usage.asset_id} not found in project`,
      });
      continue;
    }
    const wantsModification = usage.modify === "true" || usage.modify === "1";
    const assetIssue = checkAssetModification(cls, wantsModification);
    if (assetIssue) issues.push(assetIssue);
  }
  return issues;
}

// --- 1. positive cases -----------------------------------------------------

section("content package guardrails — positive");

check("valid package passes with no issues", () => {
  assert.deepEqual(issuesFor(buildPackage()), []);
});

check("funnel_stage label (Problem Aware) normalizes & matches", () => {
  const pkg = buildPackage();
  pkg.funnel_stage = "Problem Aware";
  assert.equal(paths(issuesFor(pkg)).includes("$.funnel_stage"), false);
});

check("funnel_stage DB value (problem_aware) matches", () => {
  const pkg = buildPackage();
  pkg.funnel_stage = "problem_aware";
  assert.equal(paths(issuesFor(pkg)).includes("$.funnel_stage"), false);
});

check("goal_type lead_generation accepts CTA type 'lead'", () => {
  const pkg = buildPackage();
  pkg.cta = { type: "lead", text: "Get a quote" };
  const ctx = baseCtx();
  ctx.project.goal_type = "lead_generation";
  assert.equal(paths(issuesFor(pkg, ctx)).includes("$.cta.type"), false);
});

check("google_business is a required platform and a valid output passes", () => {
  assert.ok(
    (REQUIRED_PACKAGE_PLATFORMS as readonly string[]).includes("google_business"),
  );
  assert.equal(
    paths(issuesFor(buildPackage())).includes("$.platform_outputs.google_business"),
    false,
  );
});

check("EDITABLE asset usage with modification passes", () => {
  const classById = new Map<string, AssetClass>([["a-edit", "editable"]]);
  const usage: PackageAssetUsage[] = [
    { asset_id: "a-edit", used_as: "background", modify: "true" },
  ];
  assert.deepEqual(assetUsageIssues(usage, classById), []);
});

check("REFERENCE asset usage as inspiration passes", () => {
  const classById = new Map<string, AssetClass>([["a-ref", "reference"]]);
  const usage: PackageAssetUsage[] = [
    { asset_id: "a-ref", used_as: "reference", modify: "false" },
  ];
  assert.deepEqual(assetUsageIssues(usage, classById), []);
});

check("image_provider adapter is used (MVP default openai)", () => {
  const provider = getImageProvider();
  assert.equal(provider.name, "openai");
  assert.equal(typeof provider.generateImage, "function");
});

// asset classification (pure) sanity
check("classifyAsset: source -> static, generated -> editable", () => {
  assert.equal(classifyAsset("source", null), "static");
  assert.equal(classifyAsset("generated", null), "editable");
  assert.equal(classifyAsset("source", { asset_class: "reference" }), "reference");
});

// --- 2. negative cases -----------------------------------------------------

section("content package guardrails — negative (strategic context)");

check("missing weekly_strategy_id fails", () => {
  const ctx = baseCtx();
  ctx.weeklyStrategyId = null;
  assert.ok(paths(issuesFor(buildPackage(), ctx)).includes("$.weekly_strategy_id"));
});

check("missing strategy_item_id fails", () => {
  const ctx = baseCtx();
  ctx.strategyItemId = null;
  assert.ok(paths(issuesFor(buildPackage(), ctx)).includes("$.strategy_item_id"));
});

section("content package guardrails — negative (media/narration)");

check("missing video fails", () => {
  const pkg = buildPackage();
  pkg.video = { concept: "", script: "" } as ContentPackageOutput["video"];
  assert.ok(paths(issuesFor(pkg)).includes("$.video"));
});

check("missing voiceover_text fails", () => {
  const pkg = buildPackage();
  pkg.voiceover_text = "";
  assert.ok(paths(issuesFor(pkg)).includes("$.voiceover_text"));
});

check("missing subtitles fails", () => {
  const pkg = buildPackage();
  pkg.subtitles = "";
  assert.ok(paths(issuesFor(pkg)).includes("$.subtitles"));
});

section("content package guardrails — negative (platform outputs)");

for (const platform of ["tiktok", "instagram", "facebook", "linkedin", "google_business"]) {
  check(`missing ${platform} output fails`, () => {
    const pkg = buildPackage();
    deletePlatform(pkg, platform);
    assert.ok(paths(issuesFor(pkg)).includes(`$.platform_outputs.${platform}`));
  });
}

section("content package guardrails — negative (cta / funnel / claims)");

check("CTA type not matching goal_type fails", () => {
  const pkg = buildPackage();
  pkg.cta = { type: "learn_more", text: "x" };
  const ctx = baseCtx();
  ctx.project.goal_type = "lead_generation";
  assert.ok(paths(issuesFor(pkg, ctx)).includes("$.cta.type"));
});

check("funnel_stage mismatch vs strategy item fails", () => {
  const pkg = buildPackage();
  pkg.funnel_stage = "Awareness"; // strategy item is problem_aware
  assert.ok(paths(issuesFor(pkg)).includes("$.funnel_stage"));
});

check("forbidden_claim present in output fails", () => {
  const pkg = buildPackage();
  pkg.voiceover_text = "We promise guaranteed results overnight.";
  const ctx = baseCtx();
  ctx.project.forbidden_claims = ["guaranteed results"];
  assert.ok(hasMessage(issuesFor(pkg, ctx), "forbidden_claim present"));
});

check("product_is_not claim present in output fails", () => {
  const pkg = buildPackage();
  pkg.platform_outputs.facebook.caption = "We are a bank for everyone.";
  const ctx = baseCtx();
  ctx.project.product_is_not = ["a bank"];
  assert.ok(hasMessage(issuesFor(pkg, ctx), "product_is_not claim present"));
});

check("consideration as funnel_stage fails", () => {
  const pkg = buildPackage();
  pkg.funnel_stage = "consideration";
  assert.ok(paths(issuesFor(pkg)).includes("$.funnel_stage"));
});

check("retention as funnel_stage fails", () => {
  const pkg = buildPackage();
  pkg.funnel_stage = "retention";
  assert.ok(paths(issuesFor(pkg)).includes("$.funnel_stage"));
});

section("content package guardrails — negative (asset rules)");

check("STATIC asset requested as modified/variant fails", () => {
  const classById = new Map<string, AssetClass>([["a-static", "static"]]);
  const usage: PackageAssetUsage[] = [
    { asset_id: "a-static", used_as: "hero", modify: "true" },
  ];
  assert.equal(assetUsageIssues(usage, classById).length, 1);
});

check("checkAssetModification: static+modify fails, editable+modify passes", () => {
  assert.notEqual(checkAssetModification("static", true), null);
  assert.equal(checkAssetModification("editable", true), null);
  assert.equal(checkAssetModification("reference", false), null);
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
