// Integration check: projects with no assets and no recent asset_usage history
// remain backward compatible (prompt + schema + workflow guardrails).
//   npm run check:asset-prompt-backward-compat

import assert from "node:assert/strict";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { buildFunnelAssetPolicyBlock } from "@/lib/ai/prompts/funnelAssetPolicy";
import {
  buildContentPackageSchema,
  contentPackageSchema,
  type ContentPackageOutput,
} from "@/lib/ai/schemas/contentPackage";
import { REQUIRED_PACKAGE_PLATFORMS } from "@/lib/ai/types";
import { validate } from "@/lib/ai/validateAiOutput";
import { buildRecentAssetUsageBlock } from "@/lib/assets/loadRecentAssetUsage";
import {
  checkAssetModification,
  checkContentPackageGuardrails,
  type AssetClass,
  type PackageGuardrailContext,
} from "@/lib/ai/guardrails";
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

const project = {
  id: "p-no-assets",
  name: "Legacy Co",
  type: "service",
  language: "cs",
  market_scope: "local",
  goal_type: "awareness",
  target_audience: {},
  product_is: ["helpful service"],
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

function promptForNoAssetProject(recentAssetUsageBlock?: string): string {
  return buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "topic",
    angle: "angle",
    availableAssets: [],
    targetPlatforms: ["tiktok", "instagram"],
    requireVideo: true,
    videoPlatforms: ["tiktok", "instagram"],
    directives,
    recentAssetUsageBlock,
  });
}

function platformOutput() {
  return { caption: "Caption text here", cta: "Learn more" };
}

function legacyPackageWithoutAssetUsage(): ContentPackageOutput {
  return {
    title: "Monthly piece",
    funnel_stage: "awareness",
    hook: "Did you know?",
    voiceover_text: "Short narration.",
    subtitles: "Short narration.",
    cta: { type: "learn_more", text: "Learn more" },
    video: { concept: "Explainer", script: "Scene one." },
    image_prompts: ["scene a", "scene b", "scene c"],
    platform_outputs: Object.fromEntries(
      REQUIRED_PACKAGE_PLATFORMS.map((p) => [p, platformOutput()]),
    ) as ContentPackageOutput["platform_outputs"],
  } as ContentPackageOutput;
}

function guardrailCtx(): PackageGuardrailContext {
  return {
    project: {
      goal_type: project.goal_type,
      forbidden_claims: project.forbidden_claims ?? [],
      product_is_not: project.product_is_not ?? [],
    },
    weeklyStrategyId: "ws-legacy",
    strategyItemId: "si-legacy",
    strategyItemFunnelStage: "awareness",
    requiredPlatforms: REQUIRED_PACKAGE_PLATFORMS,
    requireVideo: true,
  };
}

// Mirrors makePackageGuardrails asset_usage loop (packageShared.ts) with an
// empty asset library — the path used when a project has no assets.
function packageGuardrailIssues(
  pkg: ContentPackageOutput,
  classById: Map<string, AssetClass>,
): ValidationIssue[] {
  const issues = checkContentPackageGuardrails(pkg, guardrailCtx());
  for (const usage of pkg.asset_usage ?? []) {
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

// --- 1. empty available assets ------------------------------------------------

section("availableAssets = []");

const emptyAssetsPrompt = promptForNoAssetProject();

check("AVAILABLE ASSETS section lists (none)", () => {
  const marker = "AVAILABLE ASSETS (optional product library";
  const idx = emptyAssetsPrompt.indexOf(marker);
  assert.ok(idx >= 0, "missing AVAILABLE ASSETS header");
  const slice = emptyAssetsPrompt.slice(idx, idx + 600);
  assert.ok(slice.includes("(none)"), "expected (none) under AVAILABLE ASSETS");
});

check("prompt still requests a JSON content package", () => {
  assert.ok(emptyAssetsPrompt.includes("Produce ONE content package as JSON"));
  assert.ok(emptyAssetsPrompt.includes('"title":'));
  assert.ok(emptyAssetsPrompt.includes('"platform_outputs":'));
});

check("asset_usage is documented but optional in prompt copy", () => {
  assert.ok(emptyAssetsPrompt.includes('"asset_usage":'));
  assert.ok(/empty asset_usage is valid/i.test(emptyAssetsPrompt));
  assert.ok(/NEVER mandatory/i.test(emptyAssetsPrompt));
});

// --- 2. no recent asset usage history -----------------------------------------

section("no recent asset usage");

check("buildRecentAssetUsageBlock([]) is empty", () => {
  assert.equal(buildRecentAssetUsageBlock([]), "");
});

check("prompt omits RECENT ASSET USAGE when block omitted", () => {
  assert.equal(emptyAssetsPrompt.includes("RECENT ASSET USAGE"), false);
});

check("prompt omits RECENT ASSET USAGE when block is empty string", () => {
  const p = promptForNoAssetProject("");
  assert.equal(p.includes("RECENT ASSET USAGE"), false);
});

check("prompt omits RECENT ASSET USAGE when block is whitespace", () => {
  const p = promptForNoAssetProject("   \n  ");
  assert.equal(p.includes("RECENT ASSET USAGE"), false);
});

// --- 3. funnel asset policy (guidance only) -----------------------------------

section("funnel asset policy");

check("prompt includes FUNNEL ASSET POLICY for the stage", () => {
  assert.ok(emptyAssetsPrompt.includes("FUNNEL ASSET POLICY"));
  assert.ok(emptyAssetsPrompt.includes("funnel_stage=Awareness"));
});

check("funnel policy block does not mandate asset_usage globally", () => {
  const block = buildFunnelAssetPolicyBlock("awareness");
  assert.equal(/must include asset_usage/i.test(block), false);
  assert.equal(/required asset_usage/i.test(block), false);
});

// --- 4. output schema + guardrails unchanged for legacy packages --------------

section("output schema and guardrails");

check("contentPackageSchema accepts package with no asset_usage key", () => {
  const pkg = legacyPackageWithoutAssetUsage();
  const res = validate(contentPackageSchema, pkg);
  assert.ok(res.ok, res.ok ? "" : JSON.stringify(res.issues));
});

check("buildContentPackageSchema accepts omitted asset_usage", () => {
  const schema = buildContentPackageSchema(REQUIRED_PACKAGE_PLATFORMS, {
    requireVideo: true,
  });
  const res = validate(schema, legacyPackageWithoutAssetUsage());
  assert.ok(res.ok, res.ok ? "" : JSON.stringify(res.issues));
});

check("schema still allows optional asset_usage when present", () => {
  const schema = buildContentPackageSchema(["tiktok"], { requireVideo: true });
  const pkg = {
    ...legacyPackageWithoutAssetUsage(),
    platform_outputs: { tiktok: platformOutput() },
    asset_usage: [
      { asset_id: "uuid-1", used_as: "logo in CTA", modify: "false" },
    ],
  };
  const res = validate(schema, pkg);
  assert.ok(res.ok, res.ok ? "" : JSON.stringify(res.issues));
});

check("package guardrails pass with empty asset library and no asset_usage", () => {
  const issues = packageGuardrailIssues(
    legacyPackageWithoutAssetUsage(),
    new Map(),
  );
  assert.deepEqual(issues, []);
});

check("persist brief shape treats missing asset_usage as []", () => {
  const pkg = legacyPackageWithoutAssetUsage();
  const asset_usage = pkg.asset_usage ?? [];
  assert.deepEqual(asset_usage, []);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
