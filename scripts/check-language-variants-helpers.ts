// Dependency-free smoke test for the generate-language-variants pure helpers.
// Runs via Node's built-in type stripping + the "@/" alias loader:
//   npm run check:language-variants-helpers
//
// Mirrors scripts/check-funnel-stage.ts (no test framework, node:assert/strict).
// The workflow orchestrator imports lib/ai/workflows/shared.ts (a TypeScript
// parameter property that the strip-only loader cannot parse), so it is covered
// by `tsc --noEmit`; only the pure helpers are exercised at runtime here.

import assert from "node:assert/strict";
import {
  allItemsApproved,
  canGenerateItemVariants,
  extractRenderSpecScenes,
  isVideoPlatform,
  pendingVariantLanguages,
  pickVideoJobItem,
  resolveTargetLanguages,
} from "@/lib/ai/workflows/languageVariantsHelpers";

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

// --- resolveTargetLanguages ------------------------------------------------

section("resolveTargetLanguages");

check("excludes the primary language", () => {
  assert.deepEqual(resolveTargetLanguages("cs", ["cs", "de", "fr"]), ["de", "fr"]);
});

check("dedupes and preserves order", () => {
  assert.deepEqual(resolveTargetLanguages("en", ["de", "de", "fr", "de"]), [
    "de",
    "fr",
  ]);
});

check("empty when only the primary is enabled", () => {
  assert.deepEqual(resolveTargetLanguages("cs", ["cs"]), []);
});

check("empty when nothing is enabled", () => {
  assert.deepEqual(resolveTargetLanguages("cs", []), []);
});

// --- allItemsApproved ------------------------------------------------------

section("allItemsApproved");

check("true when all approved", () => {
  assert.equal(allItemsApproved(["approved", "approved"]), true);
});

check("false when any not approved", () => {
  assert.equal(allItemsApproved(["approved", "draft"]), false);
});

check("false for empty list", () => {
  assert.equal(allItemsApproved([]), false);
});

// --- extractRenderSpecScenes -----------------------------------------------

section("extractRenderSpecScenes");

check("returns scenes when render_spec.scenes have image_path", () => {
  const output = {
    mp4_url: "https://x/y.mp4",
    render_spec: {
      version: 1,
      scenes: [
        {
          id: "scene-1",
          image_prompt: "p",
          image_bucket: "video-renders",
          image_path: "proj/video/job/scene-1.png",
          duration_seconds: 10,
        },
      ],
    },
  };
  const scenes = extractRenderSpecScenes(output);
  assert.ok(scenes);
  assert.equal(scenes?.length, 1);
});

check("null when render_spec missing", () => {
  assert.equal(extractRenderSpecScenes({ mp4_url: "x" }), null);
});

check("null when scenes empty", () => {
  assert.equal(
    extractRenderSpecScenes({ render_spec: { version: 1, scenes: [] } }),
    null,
  );
});

check("null when a scene lacks image_path", () => {
  const output = {
    render_spec: {
      scenes: [{ id: "s1", image_prompt: "p", duration_seconds: 10 }],
    },
  };
  assert.equal(extractRenderSpecScenes(output), null);
});

check("null for non-object output", () => {
  assert.equal(extractRenderSpecScenes(null), null);
  assert.equal(extractRenderSpecScenes("x"), null);
  assert.equal(extractRenderSpecScenes([1, 2]), null);
});

// --- pickVideoJobItem ------------------------------------------------------

section("pickVideoJobItem");

check("prefers tiktok", () => {
  const item = pickVideoJobItem([
    { platform: "instagram", id: "a" },
    { platform: "tiktok", id: "b" },
  ]);
  assert.equal(item?.id, "b");
});

check("falls back to first when no tiktok", () => {
  const item = pickVideoJobItem([
    { platform: "instagram", id: "a" },
    { platform: "facebook", id: "b" },
  ]);
  assert.equal(item?.id, "a");
});

check("null for empty list", () => {
  assert.equal(pickVideoJobItem([]), null);
});

// --- isVideoPlatform -------------------------------------------------------

section("isVideoPlatform");

check("tiktok / instagram / youtube / facebook are video", () => {
  assert.equal(isVideoPlatform("tiktok"), true);
  assert.equal(isVideoPlatform("instagram"), true);
  assert.equal(isVideoPlatform("youtube"), true);
  assert.equal(isVideoPlatform("facebook"), true);
});

check("linkedin / x / google_business are NOT video", () => {
  assert.equal(isVideoPlatform("linkedin"), false);
  assert.equal(isVideoPlatform("x"), false);
  assert.equal(isVideoPlatform("google_business"), false);
});

// --- pendingVariantLanguages -----------------------------------------------

section("pendingVariantLanguages");

check("returns languages not yet covered, order-preserving", () => {
  assert.deepEqual(
    pendingVariantLanguages(["de", "fr", "es", "it"], ["fr"]),
    ["de", "es", "it"],
  );
});

check("empty when all covered", () => {
  assert.deepEqual(
    pendingVariantLanguages(["de", "fr"], ["de", "fr"]),
    [],
  );
});

check("all pending when nothing covered", () => {
  assert.deepEqual(
    pendingVariantLanguages(["de", "fr"], []),
    ["de", "fr"],
  );
});

// --- canGenerateItemVariants -----------------------------------------------

section("canGenerateItemVariants");

check("true for approved primary item with pending target languages", () => {
  assert.equal(
    canGenerateItemVariants({
      itemLanguage: null,
      itemStatus: "approved",
      targetLanguages: ["de", "fr", "es", "it"],
      coveredLanguages: [],
    }),
    true,
  );
});

check("false when item is a variant (language not null)", () => {
  assert.equal(
    canGenerateItemVariants({
      itemLanguage: "de",
      itemStatus: "approved",
      targetLanguages: ["de", "fr"],
      coveredLanguages: [],
    }),
    false,
  );
});

check("false when item is not approved (draft X never qualifies)", () => {
  assert.equal(
    canGenerateItemVariants({
      itemLanguage: null,
      itemStatus: "draft",
      targetLanguages: ["de", "fr"],
      coveredLanguages: [],
    }),
    false,
  );
});

check("false when project has no target languages", () => {
  assert.equal(
    canGenerateItemVariants({
      itemLanguage: null,
      itemStatus: "approved",
      targetLanguages: [],
      coveredLanguages: [],
    }),
    false,
  );
});

check("false when every target language already covered for this item", () => {
  assert.equal(
    canGenerateItemVariants({
      itemLanguage: null,
      itemStatus: "approved",
      targetLanguages: ["de", "fr"],
      coveredLanguages: ["de", "fr"],
    }),
    false,
  );
});

check("true when only some target languages are covered", () => {
  assert.equal(
    canGenerateItemVariants({
      itemLanguage: null,
      itemStatus: "approved",
      targetLanguages: ["de", "fr", "es", "it"],
      coveredLanguages: ["de", "fr"],
    }),
    true,
  );
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
