// Dependency-free check for the production-run planner (lib/projects/productionRun.ts).
// Runs via Node's built-in type stripping + the "@/" alias loader:
//   npm run check:production-run
//
// Pure math: verifies the Package Based Model (V3) — packageCount drives videos,
// per-platform outputs = round(packageCount × multiplier), totals, the spec
// example (140 outputs), normalization, and run-item slot expansion (one per
// package).

import assert from "node:assert/strict";
import {
  computeProductionPlan,
  expandPlanToItemSlots,
  normalizeProductionConfig,
  outputsForPackageIndex,
  planHasOutputs,
  platformOutputTotal,
  primaryPlatformForPlan,
  resolveRunGenerationPlan,
} from "@/lib/projects/productionRun";

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

// --- 1. spec example: 20 packages, X×3 -> 140 outputs ----------------------

section(
  "spec example (20 packages; TikTok/Instagram/YouTube/LinkedIn ×1, X ×3)",
);

const specPlan = computeProductionPlan(
  normalizeProductionConfig({
    packageCount: 20,
    platforms: ["tiktok", "instagram", "youtube", "linkedin", "x"],
    multipliers: { tiktok: 1, instagram: 1, youtube: 1, linkedin: 1, x: 3 },
  }),
);

check("packageCount = 20", () => {
  assert.equal(specPlan.packageCount, 20);
});
check("videoCount = packageCount = 20", () => {
  assert.equal(specPlan.videoCount, 20);
});
check("video outputs (TikTok+IG+YT) = 60", () => {
  assert.equal(specPlan.videoOutputsTotal, 60);
});
check("text outputs (LinkedIn 20 + X 60) = 80", () => {
  assert.equal(specPlan.textOutputsTotal, 80);
});
check("total outputs = 140", () => {
  assert.equal(specPlan.totalOutputs, 140);
});
check("X resolves to 60 outputs", () => {
  const x = specPlan.platformOutputs.find((p) => p.platform === "x");
  assert.equal(x?.outputs, 60);
});
check("expands to 20 package run-item slots (1 per package)", () => {
  assert.equal(expandPlanToItemSlots(specPlan).length, 20);
});
check("primary platform is first active video platform (tiktok)", () => {
  assert.equal(primaryPlatformForPlan(specPlan), "tiktok");
});

// --- 2. fractional multiplier: Google Business 0.25 ------------------------

section("fractional multiplier (20 packages, Google Business ×0.25 -> 5)");

const fracPlan = computeProductionPlan(
  normalizeProductionConfig({
    packageCount: 20,
    platforms: ["tiktok", "google_business"],
    multipliers: { tiktok: 1, google_business: 0.25 },
  }),
);

check("Google Business = round(20 × 0.25) = 5", () => {
  const gb = fracPlan.platformOutputs.find(
    (p) => p.platform === "google_business",
  );
  assert.equal(gb?.outputs, 5);
});
check("total outputs = 20 + 5 = 25", () => {
  assert.equal(fracPlan.totalOutputs, 25);
});

// --- 3. normalization + guards ---------------------------------------------

section("normalization and empty plans");

check("clamps package count and drops unknown/inactive platforms", () => {
  const config = normalizeProductionConfig({
    packageCount: 999,
    platforms: ["tiktok", "bogus"],
    multipliers: { tiktok: 99, bogus: 5 },
  });
  assert.equal(config.packageCount, 100); // clamped to max
  assert.deepEqual(config.platforms, ["tiktok"]); // bogus dropped
  assert.equal(config.multipliers.tiktok, 10); // clamped to MULTIPLIER_MAX
});

check("missing multiplier falls back to product default", () => {
  const config = normalizeProductionConfig({
    packageCount: 10,
    platforms: ["x"],
    multipliers: {},
  });
  assert.equal(config.multipliers.x, 3); // DEFAULT_MULTIPLIERS.x
});

check("empty config has no outputs", () => {
  const plan = computeProductionPlan(
    normalizeProductionConfig({ packageCount: 0, platforms: [] }),
  );
  assert.equal(plan.totalOutputs, 0);
  assert.equal(planHasOutputs(plan), false);
  assert.equal(expandPlanToItemSlots(plan).length, 0);
});

check("packages but no platforms -> no outputs", () => {
  const plan = computeProductionPlan(
    normalizeProductionConfig({ packageCount: 20, platforms: [] }),
  );
  assert.equal(planHasOutputs(plan), false);
});

check("platforms but zero packages -> no outputs", () => {
  const plan = computeProductionPlan(
    normalizeProductionConfig({ packageCount: 0, platforms: ["tiktok"] }),
  );
  assert.equal(planHasOutputs(plan), false);
});

check("text-only run still produces packages (videos)", () => {
  const plan = computeProductionPlan(
    normalizeProductionConfig({
      packageCount: 14,
      platforms: ["linkedin"],
      multipliers: { linkedin: 1 },
    }),
  );
  assert.equal(plan.packageCount, 14);
  assert.equal(plan.videoCount, 14);
  assert.equal(plan.totalOutputs, 14);
  assert.equal(primaryPlatformForPlan(plan), "linkedin");
  assert.equal(expandPlanToItemSlots(plan).length, 14);
});

// --- 4. video multiplier is fixed at 1 (one shared video per package) ------

section("video platform multiplier is forced to 1");

const forcedPlan = computeProductionPlan(
  normalizeProductionConfig({
    packageCount: 20,
    platforms: ["tiktok", "x"],
    // Try to set TikTok ×2 — must be ignored (video = 1 per package).
    multipliers: { tiktok: 2, x: 3 },
  }),
);

check("TikTok (video) outputs = packageCount (multiplier ignored)", () => {
  const tt = forcedPlan.platformOutputs.find((p) => p.platform === "tiktok");
  assert.equal(tt?.multiplier, 1);
  assert.equal(tt?.outputs, 20);
});
check("X (text) still honors multiplier 3 -> 60", () => {
  const x = forcedPlan.platformOutputs.find((p) => p.platform === "x");
  assert.equal(x?.outputs, 60);
});

// --- 5. per-package output distribution (real content_items fan-out) -------

section("outputsForPackageIndex distribution");

check("video platform is always 1 per package", () => {
  for (let i = 0; i < 5; i++) {
    assert.equal(outputsForPackageIndex("video", 1, i), 1);
    assert.equal(outputsForPackageIndex("video", 99, i), 1);
  }
});
check("text multiplier 3 -> 3 every package", () => {
  for (let i = 0; i < 5; i++) {
    assert.equal(outputsForPackageIndex("text", 3, i), 3);
  }
});
check("text multiplier 0.25 spreads one item per ~4 packages", () => {
  // round((i+1)*0.25) - round(i*0.25); the exact cycle depends on half-up
  // rounding, but the cumulative total is what matters (checked below).
  assert.deepEqual(
    [0, 1, 2, 3].map((i) => outputsForPackageIndex("text", 0.25, i)),
    [0, 1, 0, 0],
  );
});
check("distribution sums to platformOutputTotal (m=0.25, 20 packages)", () => {
  let sum = 0;
  for (let i = 0; i < 20; i++) sum += outputsForPackageIndex("text", 0.25, i);
  assert.equal(sum, platformOutputTotal("text", 20, 0.25)); // = 5
  assert.equal(sum, 5);
});
check("distribution sums to platformOutputTotal (m=2, 3 packages)", () => {
  let sum = 0;
  for (let i = 0; i < 3; i++) sum += outputsForPackageIndex("text", 2, i);
  assert.equal(sum, platformOutputTotal("text", 3, 2)); // = 6
  assert.equal(sum, 6);
});

// --- 6. run generation plan (drives the package generator) -----------------

section("resolveRunGenerationPlan");

const runGen = resolveRunGenerationPlan(
  normalizeProductionConfig({
    packageCount: 2,
    platforms: ["tiktok", "instagram", "youtube", "linkedin", "x"],
    multipliers: { tiktok: 1, instagram: 1, youtube: 1, linkedin: 1, x: 3 },
  }),
);

check("targetPlatforms include youtube + x (persistable)", () => {
  assert.deepEqual(runGen.targetPlatforms, [
    "tiktok",
    "instagram",
    "youtube",
    "linkedin",
    "x",
  ]);
});
check("videoPlatforms = tiktok, instagram, youtube", () => {
  assert.deepEqual(runGen.videoPlatforms, ["tiktok", "instagram", "youtube"]);
});
check("multipliers: video=1, linkedin=1, x=3", () => {
  assert.equal(runGen.multipliers.tiktok, 1);
  assert.equal(runGen.multipliers.youtube, 1);
  assert.equal(runGen.multipliers.linkedin, 1);
  assert.equal(runGen.multipliers.x, 3);
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
