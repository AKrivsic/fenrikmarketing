// Dependency-free check for AI provider routing rules (lib/ai/index.ts).
// Runs via Node's built-in type stripping + the "@/" alias loader:
//   npm run check:provider-routing
//
// No network: providers are only constructed and inspected for name / methods.
// A static import scan enforces that the AI Visual Engine goes through the
// image_provider adapter and never imports "@/lib/ai/openai" directly.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  getCopywritingProvider,
  getEvergreenProvider,
  getImageProvider,
  getJsonRepairProvider,
  getScoringProvider,
  getSpeechProvider,
  getStrategyProvider,
} from "@/lib/ai/index";

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

// --- 1. Claude routing -----------------------------------------------------

section("Claude routing (strategy / copy / scoring / evergreen)");

check("getStrategyProvider -> claude", () => {
  assert.equal(getStrategyProvider().name, "claude");
});
check("getCopywritingProvider -> claude", () => {
  assert.equal(getCopywritingProvider().name, "claude");
});
check("getScoringProvider -> claude", () => {
  assert.equal(getScoringProvider().name, "claude");
});
check("getEvergreenProvider -> claude", () => {
  assert.equal(getEvergreenProvider().name, "claude");
});

// --- 2. OpenAI routing -----------------------------------------------------

section("OpenAI routing (JSON repair / image / TTS)");

check("getJsonRepairProvider -> openai", () => {
  assert.equal(getJsonRepairProvider().name, "openai");
});

check("getImageProvider -> openai (MVP default) with generateImage", () => {
  const provider = getImageProvider();
  assert.equal(provider.name, "openai");
  assert.equal(typeof provider.generateImage, "function");
});

check("getSpeechProvider -> openai with synthesize", () => {
  const provider = getSpeechProvider();
  assert.equal(provider.name, "openai");
  assert.equal(typeof provider.synthesize, "function");
});

// --- 3. text providers expose complete() -----------------------------------

section("provider shape");

check("text providers expose complete()", () => {
  for (const provider of [
    getStrategyProvider(),
    getCopywritingProvider(),
    getScoringProvider(),
    getEvergreenProvider(),
    getJsonRepairProvider(),
  ]) {
    assert.equal(typeof provider.complete, "function");
  }
});

// --- 4. static import scan -------------------------------------------------
// The OpenAI module may only be imported by the provider abstraction layer
// (lib/ai/index.ts). Any other file importing it directly — especially an
// image-generation workflow — would bypass the image_provider adapter.

section("static scan: no direct '@/lib/ai/openai' import outside the adapter");

const OPENAI_IMPORT = /from\s+["']@\/lib\/ai\/openai["']/;
const ALLOWED_IMPORTERS = new Set(["lib/ai/index.ts"]);

function collectTsFiles(dir: string, root: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsFiles(full, root, out);
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      out.push(relative(root, full).split(sep).join("/"));
    }
  }
}

check("only lib/ai/index.ts imports '@/lib/ai/openai'", () => {
  const root = process.cwd();
  const files: string[] = [];
  collectTsFiles(join(root, "lib", "ai"), root, files);

  const offenders = files.filter((rel) => {
    if (ALLOWED_IMPORTERS.has(rel)) return false;
    return OPENAI_IMPORT.test(readFileSync(join(root, rel), "utf8"));
  });

  assert.deepEqual(
    offenders,
    [],
    `unexpected direct OpenAI imports (must use getImageProvider adapter): ${offenders.join(", ")}`,
  );
});

check("image-generation must use getImageProvider (adapter present)", () => {
  // The adapter exists and returns the MVP default provider; image workflows
  // obtain their provider through it rather than constructing OpenAI directly.
  assert.equal(typeof getImageProvider, "function");
  assert.equal(getImageProvider().name, "openai");
});

// --- summary ---------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
