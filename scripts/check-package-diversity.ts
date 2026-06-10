// Dependency-free check for Run Package Diversity V1. Runs via Node's built-in
// type stripping + the "@/" alias loader:
//   npm run check:package-diversity
//
// Run Package Diversity V1 — verifies that packages generated within ONE
// production run are steered toward DISTINCT angles. When production_run_id +
// package_index are known the generation prompt gains a PACKAGE DIVERSITY block
// ("package N of M", a deterministic angle lens, a "do not repeat" sibling
// list); legacy single-package generation keeps the prompt unchanged. Also
// locks the pure index -> angle-lens mapping (how package_index reaches the
// prompt).

import assert from "node:assert/strict";
import {
  buildGenerateContentPackagePrompt,
  type PackageDiversitySpec,
} from "@/lib/ai/prompts/generateContentPackage";
import {
  PACKAGE_ANGLE_LENSES,
  angleLensForIndex,
} from "@/lib/projects/productionRun";
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
  topic: "apartment cleaning before guests",
  angle: "details guests notice",
  availableAssets: [],
  targetPlatforms: ["tiktok", "x"] as const,
  requireVideo: true,
  videoPlatforms: ["tiktok"] as const,
};

// --- 1. diversity block injected for production-run items -------------------

section("prompt includes PACKAGE DIVERSITY block for run items");

const diversity: PackageDiversitySpec = {
  packageIndex: 2,
  packageCount: 5,
  angleLens: angleLensForIndex(2),
  previousAngles: [
    {
      title: "The overlooked details",
      hook: "Guests notice what you miss",
      topic: "apartment cleaning before guests",
    },
    {
      title: "Last-minute guests",
      hook: "They are 10 minutes away",
      topic: "apartment cleaning before guests",
    },
  ],
};

const withDiversity = buildGenerateContentPackagePrompt({
  ...basePromptInput,
  packageDiversity: diversity,
});

check("prompt contains the PACKAGE DIVERSITY header", () => {
  assert.ok(
    withDiversity.includes("PACKAGE DIVERSITY"),
    "expected a PACKAGE DIVERSITY block",
  );
});

check('prompt states "package N of M" using the package index', () => {
  // packageIndex 2 is human-facing package 3 of 5.
  assert.ok(
    /package 3 of 5/.test(withDiversity),
    "expected 'package 3 of 5' in the diversity block",
  );
});

check("prompt requires distinct hook / pain point / scenario / CTA", () => {
  assert.ok(/hook angle/i.test(withDiversity));
  assert.ok(/pain point/i.test(withDiversity));
  assert.ok(/scenario/i.test(withDiversity));
  assert.ok(/CTA framing/i.test(withDiversity));
});

check("prompt leads with the deterministic angle lens for the index", () => {
  assert.ok(
    withDiversity.includes(angleLensForIndex(2)),
    `expected angle lens "${angleLensForIndex(2)}" in the prompt`,
  );
});

check("prompt lists sibling angles under 'DO NOT REPEAT'", () => {
  assert.ok(/DO NOT REPEAT/.test(withDiversity));
  assert.ok(withDiversity.includes("The overlooked details"));
  assert.ok(withDiversity.includes("Last-minute guests"));
  assert.ok(withDiversity.includes("Guests notice what you miss"));
});

check("'package N of M' omits 'of M' when packageCount is unknown", () => {
  const prompt = buildGenerateContentPackagePrompt({
    ...basePromptInput,
    packageDiversity: { packageIndex: 0 },
  });
  assert.ok(/package 1 /.test(prompt), "expected 'package 1' for index 0");
  assert.ok(!/package 1 of/.test(prompt), "must not claim a total when unknown");
});

check("diversity block works with no sibling angles yet (first package)", () => {
  const prompt = buildGenerateContentPackagePrompt({
    ...basePromptInput,
    packageDiversity: { packageIndex: 0, packageCount: 5 },
  });
  assert.ok(prompt.includes("PACKAGE DIVERSITY"));
  assert.ok(!/DO NOT REPEAT/.test(prompt), "no sibling list when none exist");
});

// --- 2. legacy generation is unchanged -------------------------------------

section("backward compatibility (no production run)");

const legacy = buildGenerateContentPackagePrompt({ ...basePromptInput });

check("no PACKAGE DIVERSITY block for legacy single-package generation", () => {
  assert.ok(!legacy.includes("PACKAGE DIVERSITY"));
  assert.ok(!/DO NOT REPEAT/.test(legacy));
});

// --- 3. package_index reaches generation via the angle lens ----------------

section("package_index -> angle lens mapping (how the index reaches the prompt)");

check("the angle lens list is non-empty", () => {
  assert.ok(PACKAGE_ANGLE_LENSES.length > 0);
});

check("each of the first M indices selects its own distinct lens", () => {
  const lenses = PACKAGE_ANGLE_LENSES.map((_l, i) => angleLensForIndex(i));
  assert.equal(new Set(lenses).size, PACKAGE_ANGLE_LENSES.length);
});

check("the lens rotates (cycles) for runs larger than the list", () => {
  const n = PACKAGE_ANGLE_LENSES.length;
  assert.equal(angleLensForIndex(n), angleLensForIndex(0));
  assert.equal(angleLensForIndex(n + 1), angleLensForIndex(1));
});

check("neighbouring packages get different lenses (drives diversity)", () => {
  for (let i = 0; i < PACKAGE_ANGLE_LENSES.length - 1; i++) {
    assert.notEqual(
      angleLensForIndex(i),
      angleLensForIndex(i + 1),
      `package ${i} and ${i + 1} share a lens`,
    );
  }
});

check("a representative package_index produces a stable, valid lens", () => {
  // Mirrors how the workflow derives the lens from context.packageIndex.
  for (const idx of [0, 1, 4, 7, 19]) {
    const lens = angleLensForIndex(idx);
    assert.ok(typeof lens === "string" && lens.length > 0);
    assert.equal(lens, angleLensForIndex(idx)); // deterministic
  }
});

check("non-finite / negative index never throws and stays in range", () => {
  assert.ok(PACKAGE_ANGLE_LENSES.includes(angleLensForIndex(-1)));
  assert.ok(PACKAGE_ANGLE_LENSES.includes(angleLensForIndex(Number.NaN)));
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
