// Dependency-free check for the image-prompt sanitizer (Subtitle Reliability V1,
// Part C — remove AI-generated readable text from images). Runs via Node's
// built-in type stripping + the "@/" alias loader:
//   npm run check:image-prompt-sanitizer

import assert from "node:assert/strict";
import {
  sanitizeImagePrompt,
  NO_TEXT_DIRECTIVE,
} from "@/video-worker/services/imagePrompt";

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

check("appends the no-text directive to every prompt", () => {
  const out = sanitizeImagePrompt("A calm mountain lake at sunrise");
  assert.ok(out.includes(NO_TEXT_DIRECTIVE));
  assert.ok(out.toLowerCase().includes("mountain lake"));
});

check("drops clauses that request a phone notification", () => {
  const out = sanitizeImagePrompt(
    "A hand holding a phone, a phone notification reading 'New message', soft light",
  );
  assert.ok(!/notification/i.test(out.replace(NO_TEXT_DIRECTIVE, "")));
  assert.ok(out.toLowerCase().includes("hand holding a phone"));
});

check("drops checklist / caption / sign clauses", () => {
  for (const bad of [
    "a checklist of three items",
    "a big caption across the top",
    "a street sign with the brand name",
    "bold typography of the word SALE",
  ]) {
    const out = sanitizeImagePrompt(`A scene, ${bad}, cinematic`);
    const body = out.replace(NO_TEXT_DIRECTIVE, "");
    assert.ok(
      !/checklist|caption|sign|typograph/i.test(body),
      `clause survived: ${out}`,
    );
  }
});

check("never returns an empty prompt when all clauses are stripped", () => {
  const out = sanitizeImagePrompt("giant text, bold headline, UI screen");
  assert.ok(out.length > NO_TEXT_DIRECTIVE.length);
  assert.ok(out.includes(NO_TEXT_DIRECTIVE));
});

check("handles empty input", () => {
  assert.equal(sanitizeImagePrompt(""), NO_TEXT_DIRECTIVE);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
