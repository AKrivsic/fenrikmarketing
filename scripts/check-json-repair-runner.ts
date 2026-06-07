// Dependency-free check for the JSON parse + repair runner:
//   safeJsonParse  (lib/ai/validateAiOutput.ts)
//   generateValidatedJson  (lib/ai/runWithRepair.ts)
//
// Runs via Node's built-in type stripping + the "@/" alias loader:
//   npm run check:json-repair-runner
//
// No network: a fake TextProvider serves canned responses, and the repair
// provider is injected (the runner accepts an optional repairProvider).

import assert from "node:assert/strict";
import {
  safeJsonParse,
  vEnum,
  vNonEmptyString,
  vNumber,
  vObject,
  type Infer,
  type ValidationIssue,
} from "@/lib/ai/validateAiOutput";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import type { TextProvider } from "@/lib/ai/types";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ok  ${name}`);
    })
    .catch((err: unknown) => {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  FAIL ${name}`);
      console.error(`       ${message.replace(/\n/g, "\n       ")}`);
    });
}

function section(title: string): void {
  console.log(`\n${title}`);
}

// --- test schema + guardrail (inline) --------------------------------------

const docSchema = vObject({
  title: vNonEmptyString(),
  count: vNumber(),
  status: vEnum(["ok", "draft"] as const),
});
type Doc = Infer<typeof docSchema>;

function docGuardrails(doc: Doc): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (doc.count < 1) issues.push({ path: "$.count", message: "count must be >= 1" });
  if (doc.title.toLowerCase().includes("forbidden")) {
    issues.push({ path: "$.title", message: "title contains forbidden term" });
  }
  return issues;
}

// --- fake providers (no network) -------------------------------------------

// Serves canned responses in order; repeats the last one when exhausted.
function fakeProvider(responses: string[], name = "fake-text"): TextProvider {
  let i = 0;
  return {
    name,
    async complete() {
      const text = responses[Math.min(i, responses.length - 1)] ?? "";
      i++;
      return { text, model: "fake", provider: name };
    },
  };
}

function throwingProvider(name = "fake-repair"): TextProvider {
  return {
    name,
    async complete() {
      throw new Error("repair provider unavailable");
    },
  };
}

// Canned payloads.
const VALID = `{"title":"Hello","count":2,"status":"ok"}`;
const SCHEMA_FAIL = `{"title":"Hello","status":"ok"}`; // valid JSON, missing count
const GUARDRAIL_FAIL = `{"title":"Hello","count":0,"status":"ok"}`; // count < 1
const GARBAGE = `this is definitely not json`;

// --- 1. safeJsonParse ------------------------------------------------------

section("safeJsonParse — positive");

await check("clean JSON object", () => {
  const r = safeJsonParse(VALID);
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { title: "Hello", count: 2, status: "ok" });
});

await check("JSON in ```json fenced block", () => {
  const r = safeJsonParse('```json\n{"title":"Hi","count":1,"status":"draft"}\n```');
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { title: "Hi", count: 1, status: "draft" });
});

await check("JSON wrapped in short prose", () => {
  const r = safeJsonParse('Sure! Here it is: {"title":"Hi","count":1,"status":"ok"} Done.');
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { title: "Hi", count: 1, status: "ok" });
});

await check("JSON array", () => {
  const r = safeJsonParse("[1, 2, 3]");
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, [1, 2, 3]);
});

section("safeJsonParse — negative");

await check("completely invalid text fails", () => {
  assert.equal(safeJsonParse(GARBAGE).ok, false);
});

await check("empty string fails", () => {
  assert.equal(safeJsonParse("").ok, false);
});

await check("unclosed JSON object fails", () => {
  assert.equal(safeJsonParse('{"title":"Hi","count":1').ok, false);
});

// --- 2. generateValidatedJson (via fake providers) -------------------------

section("generateValidatedJson — happy + repair paths");

await check("valid JSON on first attempt -> ok", async () => {
  const result = await generateValidatedJson<Doc>({
    textProvider: fakeProvider([VALID]),
    repairProvider: throwingProvider(),
    system: "s",
    prompt: "p",
    validator: docSchema,
    guardrails: docGuardrails,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.attempts, 1);
    assert.deepEqual(result.value, { title: "Hello", count: 2, status: "ok" });
  }
});

await check("parse fail -> repair returns valid JSON -> ok", async () => {
  const result = await generateValidatedJson<Doc>({
    textProvider: fakeProvider([GARBAGE]),
    repairProvider: fakeProvider([VALID], "fake-repair"),
    system: "s",
    prompt: "p",
    validator: docSchema,
    guardrails: docGuardrails,
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.attempts, 1);
});

await check("schema fail -> repair returns valid JSON -> ok", async () => {
  const result = await generateValidatedJson<Doc>({
    textProvider: fakeProvider([SCHEMA_FAIL]),
    repairProvider: fakeProvider([VALID], "fake-repair"),
    system: "s",
    prompt: "p",
    validator: docSchema,
    guardrails: docGuardrails,
  });
  assert.equal(result.ok, true);
});

await check("guardrail fail -> next attempt valid -> ok (attempts=2)", async () => {
  const result = await generateValidatedJson<Doc>({
    // attempt 1 parses + validates but fails guardrail (count 0); attempt 2 ok.
    textProvider: fakeProvider([GUARDRAIL_FAIL, VALID]),
    repairProvider: throwingProvider(),
    system: "s",
    prompt: "p",
    validator: docSchema,
    guardrails: docGuardrails,
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.attempts, 2);
});

section("generateValidatedJson — failure paths");

await check("all attempts fail -> generation_failed (attempts=3)", async () => {
  const result = await generateValidatedJson<Doc>({
    textProvider: fakeProvider([GUARDRAIL_FAIL]), // always guardrail fail
    repairProvider: throwingProvider(),
    system: "s",
    prompt: "p",
    validator: docSchema,
    guardrails: docGuardrails,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "generation_failed");
    assert.equal(result.attempts, 3);
    assert.ok(result.validationErrors.length > 0);
  }
});

await check("repair provider unavailable -> fails naturally with validation_errors", async () => {
  const result = await generateValidatedJson<Doc>({
    textProvider: fakeProvider([GARBAGE]), // parse fails every attempt
    repairProvider: throwingProvider(), // repair throws -> repairJson returns null
    system: "s",
    prompt: "p",
    validator: docSchema,
    guardrails: docGuardrails,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "generation_failed");
    assert.ok(result.validationErrors.length > 0);
  }
});

await check("default max attempts is 3", async () => {
  let calls = 0;
  const counting: TextProvider = {
    name: "counting",
    async complete() {
      calls++;
      return { text: GUARDRAIL_FAIL, model: "fake", provider: "counting" };
    },
  };
  const result = await generateValidatedJson<Doc>({
    textProvider: counting,
    repairProvider: throwingProvider(),
    system: "s",
    prompt: "p",
    validator: docSchema,
    guardrails: docGuardrails,
  });
  assert.equal(result.ok, false);
  assert.equal(calls, 3);
  if (!result.ok) assert.equal(result.attempts, 3);
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
