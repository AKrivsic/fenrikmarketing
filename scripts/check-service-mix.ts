// Dependency-free smoke test for Service Mix V1 (Project Brain Improvements V1 —
// Part 2). Runs via Node's built-in type stripping + the "@/" alias loader:
//   npm run check:service-mix
//
// Covers the pure pieces only (mirrors the other check-* scripts, no test
// framework, node:assert/strict):
//   - textarea input parsing ("Service = 50" per line)
//   - stored array parsing from publishing_rules
//   - validation (optional; non-empty must total 100)
//   - withServiceMix merge (preserves other keys; empty removes the key)
//   - the SERVICE MIX prompt block (present iff a mix exists)

import assert from "node:assert/strict";
import type { Json, Project } from "@/lib/supabase/types";
import {
  parseServiceMix,
  parseServiceMixInput,
  projectServiceMix,
  serializeServiceMixInput,
  serviceMixBlock,
  validateServiceMix,
  withServiceMix,
} from "@/lib/projects/serviceMix";

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

function buildProject(publishingRules: Json): Project {
  return {
    id: "p-1",
    owner_id: "u-1",
    name: "Úklidy Praha",
    type: "local_service",
    language: "cs",
    enabled_languages: [],
    market_scope: "local",
    target_audience: {},
    goal_type: "lead_generation",
    product_is: ["cleaning service"],
    product_is_not: [],
    product_strengths: ["fast"],
    pain_points: ["no time"],
    forbidden_claims: [],
    tone_of_voice: {},
    platforms: ["instagram", "facebook"],
    publishing_rules: publishingRules,
    default_cta: null,
    knowledge: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

// --- parseServiceMixInput ---------------------------------------------------

section("parseServiceMixInput");

check("parses 'Service = 50' lines", () => {
  const entries = parseServiceMixInput(
    "Airbnb cleaning = 50\nOffice cleaning = 30\nRecurring cleaning = 20",
  );
  assert.deepEqual(entries, [
    { service: "Airbnb cleaning", weight: 50 },
    { service: "Office cleaning", weight: 30 },
    { service: "Recurring cleaning", weight: 20 },
  ]);
});

check("accepts ':' separator and a trailing %", () => {
  assert.deepEqual(parseServiceMixInput("Office: 30%"), [
    { service: "Office", weight: 30 },
  ]);
});

check("ignores blank lines", () => {
  assert.deepEqual(parseServiceMixInput("\n  \nA = 100\n\n"), [
    { service: "A", weight: 100 },
  ]);
});

check("marks an unparseable line with NaN weight", () => {
  const entries = parseServiceMixInput("Airbnb cleaning");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].service, "Airbnb cleaning");
  assert.ok(Number.isNaN(entries[0].weight));
});

// --- validateServiceMix -----------------------------------------------------

section("validateServiceMix");

check("an empty mix is valid (optional field)", () => {
  assert.equal(validateServiceMix([]).ok, true);
});

check("a mix totalling 100 is valid", () => {
  const r = validateServiceMix([
    { service: "A", weight: 50 },
    { service: "B", weight: 30 },
    { service: "C", weight: 20 },
  ]);
  assert.equal(r.ok, true);
});

check("a mix that does not total 100 is rejected", () => {
  const r = validateServiceMix([
    { service: "A", weight: 50 },
    { service: "B", weight: 30 },
  ]);
  assert.equal(r.ok, false);
  assert.ok(/100/.test(r.error ?? ""));
});

check("a missing service name is rejected", () => {
  const r = validateServiceMix([{ service: "", weight: 100 }]);
  assert.equal(r.ok, false);
});

check("an out-of-range / NaN weight is rejected", () => {
  assert.equal(validateServiceMix([{ service: "A", weight: NaN }]).ok, false);
  assert.equal(validateServiceMix([{ service: "A", weight: -5 }]).ok, false);
  assert.equal(validateServiceMix([{ service: "A", weight: 150 }]).ok, false);
});

// --- parseServiceMix (stored array) -----------------------------------------

section("parseServiceMix");

check("parses a stored service_mix array", () => {
  const entries = parseServiceMix({
    service_mix: [
      { service: "Airbnb", weight: 60 },
      { service: "Office", weight: 40 },
    ],
  });
  assert.deepEqual(entries, [
    { service: "Airbnb", weight: 60 },
    { service: "Office", weight: 40 },
  ]);
});

check("drops malformed stored entries", () => {
  const entries = parseServiceMix({
    service_mix: [
      { service: "Good", weight: 50 },
      { service: "", weight: 10 },
      { service: "NoWeight" },
      { weight: 20 },
      "nope",
      { service: "Negative", weight: -3 },
    ],
  });
  assert.deepEqual(entries, [{ service: "Good", weight: 50 }]);
});

check("returns [] for missing / non-array service_mix", () => {
  assert.deepEqual(parseServiceMix({}), []);
  assert.deepEqual(parseServiceMix(null), []);
  assert.deepEqual(parseServiceMix({ service_mix: "x" }), []);
});

check("round-trips through serializeServiceMixInput", () => {
  const text = "Airbnb = 50\nOffice = 50";
  const entries = parseServiceMixInput(text);
  assert.equal(serializeServiceMixInput(entries), text);
});

// --- withServiceMix (publishing_rules merge) --------------------------------

section("withServiceMix");

check("merges service_mix while preserving other keys", () => {
  const next = withServiceMix({ posts_per_week: 5, foo: "bar" }, [
    { service: "Airbnb", weight: 50 },
    { service: "Office", weight: 50 },
  ]) as Record<string, unknown>;
  assert.equal(next.posts_per_week, 5);
  assert.equal(next.foo, "bar");
  assert.deepEqual(next.service_mix, [
    { service: "Airbnb", weight: 50 },
    { service: "Office", weight: 50 },
  ]);
});

check("an empty mix removes the service_mix key", () => {
  const next = withServiceMix(
    { posts_per_week: 5, service_mix: [{ service: "A", weight: 100 }] },
    [],
  ) as Record<string, unknown>;
  assert.equal("service_mix" in next, false);
  assert.equal(next.posts_per_week, 5);
});

check("does not mutate the input object", () => {
  const input = { posts_per_week: 5 };
  withServiceMix(input, [{ service: "A", weight: 100 }]);
  assert.equal("service_mix" in input, false);
});

// --- serviceMixBlock (prompt injection) -------------------------------------

section("serviceMixBlock");

check("is empty when the project has no service mix", () => {
  assert.equal(serviceMixBlock(buildProject({})), "");
});

check("renders the services and percentages when present", () => {
  const block = serviceMixBlock(
    buildProject({
      service_mix: [
        { service: "Airbnb cleaning", weight: 50 },
        { service: "Office cleaning", weight: 30 },
        { service: "Recurring cleaning", weight: 20 },
      ],
    }),
  );
  assert.ok(block.includes("SERVICE MIX"));
  assert.ok(block.includes("Airbnb cleaning"));
  assert.ok(block.includes("~50%"));
  assert.ok(/TOPIC SELECTION only/i.test(block));
});

check("projectServiceMix reads straight off the project row", () => {
  const project = buildProject({
    service_mix: [{ service: "Airbnb", weight: 100 }],
  });
  assert.deepEqual(projectServiceMix(project), [
    { service: "Airbnb", weight: 100 },
  ]);
});

// --- summary ----------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
