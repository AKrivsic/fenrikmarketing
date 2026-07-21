// On-screen CTA source-of-truth alignment
//   npm run check:package-alignment-fixes

import assert from "node:assert/strict";
import { alignOnScreenCtaContract } from "@/lib/content-package/alignOnScreenCtaContract";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

check("alignOnScreenCtaContract strips invented on-screen CTA", () => {
  const cta = alignOnScreenCtaContract({
    videoScript:
      "HOOK: tension. CLOSE: habit. CTA text on screen.",
    visualScenes: [{ source: "ai", image_prompt: "Phone close-up" }],
  });
  assert.equal(cta.changed, true);
  assert.ok(!/CTA text on screen/i.test(cta.script ?? ""));
});

check("alignOnScreenCtaContract unchanged when typed CTA scene present", () => {
  const script = "End beat. CTA text on screen.";
  const cta = alignOnScreenCtaContract({
    videoScript: script,
    visualScenes: [
      {
        type: "CTA",
        payload: { headline: "Book now", action: "visit_website" },
      },
    ],
  });
  assert.equal(cta.changed, false);
  assert.equal(cta.script, script);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
