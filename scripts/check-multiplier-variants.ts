// Dependency-free check for Multiplier Variants MVP-1. Runs via Node's built-in
// type stripping + the "@/" alias loader:
//   npm run check:multiplier-variants
//
// Content Quality Sprint — verifies that when a platform must produce multiple
// outputs (production-run multiplier > 1), the generation prompt asks for that
// many DISTINCT captions (caption_variants) and the package schema accepts them,
// while single-output platforms keep the historical single-caption shape.

import assert from "node:assert/strict";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import { buildContentPackageSchema } from "@/lib/ai/schemas/contentPackage";
import { validate } from "@/lib/ai/validateAiOutput";
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

// Minimal project stub — only the fields the prompt builder reads.
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

const basePromptInput = {
  project,
  funnelStage: "awareness" as const,
  topic: "kitchen smell",
  angle: "the sponge is the problem",
  availableAssets: [],
  targetPlatforms: ["tiktok", "x"] as const,
  requireVideo: true,
  videoPlatforms: ["tiktok"] as const,
};

// --- 1. multiplier > 1 -> caption_variants requested -----------------------

section("prompt requests caption_variants for fanned-out platforms");

const withVariants = buildGenerateContentPackagePrompt({
  ...basePromptInput,
  variantCounts: { tiktok: 1, x: 3 },
});

check("X output shape includes caption_variants array", () => {
  assert.ok(
    withVariants.includes('"caption_variants"'),
    "expected caption_variants in the JSON shape",
  );
});

check("X requests exactly 3 caption variants", () => {
  // The X line lists 3 "string" placeholders inside caption_variants.
  const xLine = withVariants
    .split("\n")
    .find((l) => l.includes('"x":') && l.includes("caption_variants"));
  assert.ok(xLine, "expected an X platform line with caption_variants");
  const arrayPart = xLine!.slice(xLine!.indexOf("caption_variants"));
  const count = (arrayPart.match(/"string"/g) ?? []).length;
  assert.equal(count, 3, `expected 3 variant placeholders, got ${count}`);
});

check("instruction block tells the model variants must be distinct", () => {
  assert.ok(withVariants.includes("MULTIPLE OUTPUTS PER PLATFORM"));
  assert.ok(withVariants.includes('"x": provide EXACTLY 3 captions'));
  assert.ok(/different ANGLE/i.test(withVariants));
});

check("video platform (tiktok ×1) does NOT get caption_variants", () => {
  const ttLine = withVariants
    .split("\n")
    .find((l) => l.includes('"tiktok":'));
  assert.ok(ttLine, "expected a tiktok platform line");
  assert.ok(
    !ttLine!.includes("caption_variants"),
    "tiktok (single output) must keep the single-caption shape",
  );
});

// --- 2. no variant counts -> historical shape (backward compatible) --------

section("backward compatibility (no variant counts)");

const noVariants = buildGenerateContentPackagePrompt({ ...basePromptInput });

check("no caption_variants anywhere when counts are absent", () => {
  assert.ok(!noVariants.includes("caption_variants"));
  assert.ok(!noVariants.includes("MULTIPLE OUTPUTS PER PLATFORM"));
});

check("multiplier exactly 1 is treated as single output", () => {
  const ones = buildGenerateContentPackagePrompt({
    ...basePromptInput,
    variantCounts: { tiktok: 1, x: 1 },
  });
  assert.ok(!ones.includes("caption_variants"));
});

// --- 3. schema accepts caption_variants (and tolerates its absence) --------

section("schema accepts caption_variants");

const schema = buildContentPackageSchema(["tiktok", "x"], { requireVideo: true });

function pkgWith(xOutput: Record<string, unknown>) {
  return {
    title: "T",
    funnel_stage: "awareness",
    hook: "h",
    voiceover_text: "v",
    subtitles: "s",
    cta: { type: "lead_capture", text: "call us" },
    video: { concept: "c", script: "sc" },
    platform_outputs: {
      tiktok: { caption: "tt", cta: "go" },
      x: xOutput,
    },
  };
}

check("output WITH caption_variants validates", () => {
  const res = validate(
    schema,
    pkgWith({ caption: "a", cta: "go", caption_variants: ["a", "b", "c"] }),
  );
  assert.ok(res.ok, JSON.stringify(res.ok ? "" : res.issues));
});

check("output WITHOUT caption_variants still validates", () => {
  const res = validate(schema, pkgWith({ caption: "a", cta: "go" }));
  assert.ok(res.ok, JSON.stringify(res.ok ? "" : res.issues));
});

// --- 4. caption selection fallback (mirrors persist mapping) ---------------

section("caption selection per variant index (persist mapping)");

// Pure replica of the persist-time captionFor() logic so the fallback contract
// is locked by a test (the real call path needs Supabase).
function captionFor(
  variants: unknown,
  baseCaption: string,
  variantIndex: number,
): string {
  const candidate = Array.isArray(variants) ? variants[variantIndex] : undefined;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : baseCaption;
}

check("three variants map to three distinct captions", () => {
  const variants = ["A take", "B take", "C take"];
  const out = [0, 1, 2].map((i) => captionFor(variants, "base", i));
  assert.deepEqual(out, ["A take", "B take", "C take"]);
  assert.equal(new Set(out).size, 3);
});

check("missing / short variants fall back to base caption", () => {
  assert.equal(captionFor(["only one"], "base", 1), "base");
  assert.equal(captionFor(undefined, "base", 0), "base");
  assert.equal(captionFor(["", "  "], "base", 0), "base");
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
