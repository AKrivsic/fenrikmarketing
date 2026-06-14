// Dependency-free smoke test for the asynchronous translation-jobs pure logic.
// Runs via Node's built-in type stripping + the "@/" alias loader:
//   npm run check:translation-jobs
//
// Mirrors scripts/check-language-variants-helpers.ts (no test framework,
// node:assert/strict). The queue workflow (enqueue / claim / process) and the
// review progress rollup touch Supabase, so they are covered by `tsc --noEmit`;
// only the pure helpers are exercised at runtime here:
//   - rollupTranslationTextJob: the per-language "running / failed" rollup that
//     drives the review progress (and its 7s poll) BEFORE any variant exists.
//   - pendingVariantLanguages: the dedupe/intersection that decides which units
//     are enqueued and which single language the processor runs per call.

import assert from "node:assert/strict";
import {
  pendingVariantLanguages,
  rollupTranslationTextJob,
} from "@/lib/ai/workflows/languageVariantsHelpers";
import type { TranslationJobStatus } from "@/lib/supabase/types";

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

// --- rollupTranslationTextJob ----------------------------------------------

section("rollupTranslationTextJob");

const statuses = (...s: TranslationJobStatus[]): TranslationJobStatus[] => s;

check("null when there are no units", () => {
  assert.equal(rollupTranslationTextJob([]), null);
});

check("active when any unit is pending", () => {
  assert.equal(rollupTranslationTextJob(statuses("completed", "pending")), "active");
});

check("active when any unit is processing", () => {
  assert.equal(
    rollupTranslationTextJob(statuses("processing", "failed")),
    "active",
  );
});

check("active wins over failed (still running -> not failed)", () => {
  assert.equal(
    rollupTranslationTextJob(statuses("failed", "processing")),
    "active",
  );
});

check("failed when no unit active and at least one failed", () => {
  assert.equal(
    rollupTranslationTextJob(statuses("completed", "failed")),
    "failed",
  );
});

check("null when every unit completed (idle/done)", () => {
  assert.equal(
    rollupTranslationTextJob(statuses("completed", "completed")),
    null,
  );
});

// --- pendingVariantLanguages (enqueue + single-language scoping) ------------

section("pendingVariantLanguages — enqueue dedupe");

check("only languages without a variant for the source are enqueued", () => {
  // de already localized for this source -> only fr/es/it become units.
  assert.deepEqual(
    pendingVariantLanguages(["de", "fr", "es", "it"], ["de"]),
    ["fr", "es", "it"],
  );
});

check("no units when every target is already covered (idempotent re-click)", () => {
  assert.deepEqual(
    pendingVariantLanguages(["de", "fr"], ["de", "fr"]),
    [],
  );
});

section("single-language scoping — processor intersection");

// The processor passes languages: [unit.language]; the workflow intersects it
// with the still-pending languages. Model that intersection here.
function scopeToLanguage(
  pending: string[],
  requested: string[],
): string[] {
  const set = new Set(requested);
  return pending.filter((l) => set.has(l));
}

check("scopes processing to exactly the requested language", () => {
  assert.deepEqual(scopeToLanguage(["de", "fr", "es"], ["fr"]), ["fr"]);
});

check("empty intersection is a benign no-op (already covered)", () => {
  assert.deepEqual(scopeToLanguage(["fr", "es"], ["de"]), []);
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
