// Dependency-free check for Platform Styles. Runs via Node's built-in type
// stripping + the "@/" alias loader:
//   npm run check:platform-styles
//
// Content Quality Sprint — verifies the generation prompt now carries a
// per-platform style spec (tone / structure / CTA / length) for each TARGET
// platform, so outputs are platform-native instead of one reused text.

import assert from "node:assert/strict";
import {
  buildGenerateContentPackagePrompt,
  PLATFORM_STYLE_SPECS,
} from "@/lib/ai/prompts/generateContentPackage";
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

const ALL_PLATFORMS = [
  "tiktok",
  "instagram",
  "youtube",
  "x",
  "google_business",
  "linkedin",
  "facebook",
] as const;

// --- 1. catalogue completeness ---------------------------------------------

section("style catalogue covers every platform");

check("every production platform has a style spec", () => {
  for (const p of ALL_PLATFORMS) {
    const spec = PLATFORM_STYLE_SPECS[p];
    assert.ok(spec, `missing style spec for ${p}`);
    assert.ok(spec.tone.length > 0, `${p}.tone empty`);
    assert.ok(spec.structure.length > 0, `${p}.structure empty`);
    assert.ok(spec.cta.length > 0, `${p}.cta empty`);
    assert.ok(spec.length.length > 0, `${p}.length empty`);
  }
});

// --- 2. prompt carries the style block for target platforms ----------------

section("prompt includes per-platform style guidance");

const prompt = buildGenerateContentPackagePrompt({
  project,
  funnelStage: "awareness" as const,
  topic: "kitchen smell",
  angle: "the sponge is the problem",
  availableAssets: [],
  targetPlatforms: ALL_PLATFORMS,
  requireVideo: true,
  videoPlatforms: ["tiktok", "instagram", "youtube"] as const,
});

check("prompt has a PLATFORM STYLES section", () => {
  assert.ok(prompt.includes("PLATFORM STYLES"));
});

check("each target platform appears in the style block with its tone", () => {
  for (const p of ALL_PLATFORMS) {
    const spec = PLATFORM_STYLE_SPECS[p];
    assert.ok(prompt.includes(`- ${p}: tone=${spec.tone}`), `missing ${p} style line`);
  }
});

check("style block carries structure, cta and length per platform", () => {
  // Spot-check X (most distinct: terse, <=280 chars).
  assert.ok(prompt.includes("<= 280 characters"));
  // LinkedIn explicitly forbids decorative emoji.
  assert.ok(prompt.includes("no decorative emoji"));
  // Google Business forbids hashtags.
  assert.ok(prompt.includes("NO hashtags"));
});

// --- 3. only selected platforms are listed ---------------------------------

section("style block scales to the selected platforms");

check("a 2-platform run lists only those platforms", () => {
  const small = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness" as const,
    topic: "kitchen smell",
    availableAssets: [],
    targetPlatforms: ["tiktok", "x"] as const,
    requireVideo: true,
    videoPlatforms: ["tiktok"] as const,
  });
  assert.ok(small.includes("- tiktok: tone="));
  assert.ok(small.includes("- x: tone="));
  assert.ok(!small.includes("- linkedin: tone="));
  assert.ok(!small.includes("- youtube: tone="));
});

// --- 4. facebook style is present ------------------------------------------

section("facebook platform style exists");

check("facebook has a complete style spec", () => {
  const spec = PLATFORM_STYLE_SPECS.facebook;
  assert.ok(spec, "missing facebook style spec");
  assert.ok(spec.tone.length > 0);
  assert.ok(spec.structure.length > 0);
  assert.ok(spec.cta.length > 0);
  assert.ok(spec.length.length > 0);
});

check("facebook style line appears in a facebook run", () => {
  const fb = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "conversion" as const,
    topic: "kitchen smell",
    availableAssets: [],
    targetPlatforms: ["facebook", "linkedin"] as const,
    requireVideo: false,
    videoPlatforms: [] as const,
  });
  assert.ok(fb.includes("- facebook: tone="));
});

// --- 5. WEBSITE / LINK RULES block -----------------------------------------

section("website / link rules block");

const projectWithUrl = {
  ...project,
  knowledge: { source_url: "https://uklidy-praha.cz" },
} as unknown as Project;

check("prompt omits the WEBSITE / LINK RULES block when no URL exists", () => {
  // `project` has no knowledge.source_url.
  assert.ok(!prompt.includes("WEBSITE / LINK RULES"));
});

check("prompt includes the WEBSITE / LINK RULES block when a URL exists", () => {
  const withUrl = buildGenerateContentPackagePrompt({
    project: projectWithUrl,
    funnelStage: "conversion" as const,
    topic: "kitchen smell",
    availableAssets: [],
    targetPlatforms: ALL_PLATFORMS,
    requireVideo: true,
    videoPlatforms: ["tiktok", "instagram", "youtube"] as const,
  });
  assert.ok(withUrl.includes("WEBSITE / LINK RULES"));
  assert.ok(withUrl.includes("https://uklidy-praha.cz"));
  // URL must never be routed into spoken voiceover or generated imagery.
  assert.ok(/voiceover_text/.test(withUrl));
  assert.ok(/image_prompts/.test(withUrl));
  // Per-platform link rules are present.
  assert.ok(withUrl.includes("- tiktok: NO raw URL"));
  assert.ok(withUrl.includes("- google_business: NO raw URL"));
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
