/**
 * Phase 1 — Manual Review infrastructure checks (no Creative Review UI).
 *
 * Run: npx tsx scripts/check-manual-review-phase1.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_GENERATION_MODE,
  defersVideoUntilCreativeReview,
  hasContinuedAfterCreativeReview,
  markContinuedAfterCreativeReview,
  optionalGenerationModeFromBody,
  parseGenerationMode,
  resolveGenerationMode,
  shouldDeferVideoUntilCreativeReview,
} from "../lib/ai/generationMode";
import { normalizeProductionConfig } from "../lib/projects/productionRun";
import { resolvePackageReconcileStatus } from "../lib/api/packageReconcileStatus";

const root = join(import.meta.dirname, "..");

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

console.log("A — GenerationMode parsers");

check("parseGenerationMode accepts production / sample / manual_review", () => {
  assert.equal(parseGenerationMode("production"), "production");
  assert.equal(parseGenerationMode("sample"), "sample");
  assert.equal(parseGenerationMode("manual_review"), "manual_review");
});

check("parseGenerationMode falls back to production for unknown", () => {
  assert.equal(parseGenerationMode("nope"), DEFAULT_GENERATION_MODE);
  assert.equal(parseGenerationMode(null), DEFAULT_GENERATION_MODE);
  assert.equal(parseGenerationMode(undefined), DEFAULT_GENERATION_MODE);
  assert.equal(parseGenerationMode(1), DEFAULT_GENERATION_MODE);
});

check("optionalGenerationModeFromBody respects absence vs presence", () => {
  assert.equal(optionalGenerationModeFromBody({}), undefined);
  assert.equal(
    optionalGenerationModeFromBody({ generation_mode: "manual_review" }),
    "manual_review",
  );
  assert.equal(
    optionalGenerationModeFromBody({ generation_mode: "bogus" }),
    "production",
  );
});

check("resolveGenerationMode prefers explicit then run then default", () => {
  assert.equal(resolveGenerationMode("manual_review", "sample"), "manual_review");
  assert.equal(resolveGenerationMode(undefined, "manual_review"), "manual_review");
  assert.equal(resolveGenerationMode(undefined, undefined), "production");
});

check("defersVideoUntilCreativeReview only for manual_review", () => {
  assert.equal(defersVideoUntilCreativeReview("manual_review"), true);
  assert.equal(defersVideoUntilCreativeReview("production"), false);
  assert.equal(defersVideoUntilCreativeReview("sample"), false);
});

check("shouldDeferVideoUntilCreativeReview clears after Continue flag", () => {
  assert.equal(
    shouldDeferVideoUntilCreativeReview("manual_review"),
    true,
  );
  const stamped = markContinuedAfterCreativeReview(
    { plan: {}, config: { generationMode: "manual_review" } },
    { at: "2026-08-11T12:00:00.000Z" },
  );
  assert.equal(hasContinuedAfterCreativeReview(stamped), true);
  assert.equal(
    shouldDeferVideoUntilCreativeReview("manual_review", stamped),
    false,
  );
  assert.equal(
    shouldDeferVideoUntilCreativeReview("production", stamped),
    false,
  );
});

console.log("\nB — Production config storage");

check("normalizeProductionConfig stores generationMode for manual_review", () => {
  const cfg = normalizeProductionConfig({
    packageCount: 2,
    platforms: ["tiktok"],
    multipliers: { tiktok: 1 },
    generationMode: "manual_review",
  });
  assert.equal(cfg.generationMode, "manual_review");
});

check("normalizeProductionConfig accepts generation_mode snake_case", () => {
  const cfg = normalizeProductionConfig({
    packageCount: 1,
    platforms: ["tiktok"],
    generation_mode: "manual_review",
  });
  assert.equal(cfg.generationMode, "manual_review");
});

check("normalizeProductionConfig omits default production mode", () => {
  const cfg = normalizeProductionConfig({
    packageCount: 1,
    platforms: ["tiktok"],
    generationMode: "production",
  });
  assert.equal(cfg.generationMode, undefined);
});

console.log("\nC — Package reconcile (manual review = no video required)");

check("manual-review-style reconcile completes without video jobs", () => {
  // Caller sets requireVideo=false for manual_review (see production-run-admin).
  assert.equal(
    resolvePackageReconcileStatus({ requireVideo: false, jobs: [] }),
    "completed",
  );
});

check("production still fails closed when video required and jobs missing", () => {
  assert.equal(
    resolvePackageReconcileStatus({ requireVideo: true, jobs: [] }),
    "failed",
  );
});

console.log("\nD — Source wiring");

check("ContentProductionPanel exposes Manual Review button", () => {
  const src = readFileSync(
    join(root, "components/projects/ContentProductionPanel/ContentProductionPanel.tsx"),
    "utf8",
  );
  assert.match(src, /Generate with Manual Review/);
  assert.match(src, /generationMode:\s*"manual_review"/);
  assert.match(src, /GENERATE CONTENT/);
  assert.match(src, /GENERATE SAMPLE/);
  assert.match(src, /waiting_for_creative_review/);
});

check("persistNewPackage skips video for manual_review", () => {
  const src = readFileSync(
    join(root, "lib/ai/workflows/generateContentPackage.ts"),
    "utf8",
  );
  assert.match(src, /defersVideoUntilCreativeReview\(generationMode\)/);
  assert.match(src, /!defersVideoUntilCreativeReview\(generationMode\)/);
});

check("reconcile settles manual_review to waiting_for_creative_review", () => {
  const src = readFileSync(
    join(root, "lib/api/production-run-admin.ts"),
    "utf8",
  );
  assert.match(src, /waiting_for_creative_review/);
  assert.match(src, /shouldDeferVideoUntilCreativeReview/);
});

check("start-video-job treats manual_review as no video required", () => {
  const src = readFileSync(
    join(root, "app/api/n8n/start-video-job/route.ts"),
    "utf8",
  );
  assert.match(src, /shouldDeferVideoUntilCreativeReview/);
});

check("migration adds waiting_for_creative_review status", () => {
  const src = readFileSync(
    join(root, "supabase/migrations/031_waiting_for_creative_review.sql"),
    "utf8",
  );
  assert.match(src, /waiting_for_creative_review/);
});

console.log("\nAll Phase 1 Manual Review checks passed.");
