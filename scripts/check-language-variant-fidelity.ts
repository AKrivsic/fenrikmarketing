// Language-variant visual fidelity (legacy PRODUCT_DEMO clones as IMAGE at worker)
//   npm run check:language-variant-fidelity

import assert from "node:assert/strict";
import {
  assertLanguageVariantVisualFidelity,
  prepareRenderScenesForLanguageVariant,
  sceneTypeFromWorkerScene,
} from "@/lib/scene-types/languageVariantScenes";

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

const primary = [
  {
    id: "scene-1",
    type: "IMAGE",
    image_bucket: "b",
    image_path: "p1.png",
    payload_snapshot: { media: { source: "ai" } },
  },
  {
    id: "scene-2",
    type: "CTA",
    image_bucket: "b",
    image_path: "p2.png",
    payload_snapshot: { headline: "Book" },
  },
];

check("prepareRenderScenesForLanguageVariant clones primary", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({ scenes: primary });
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0]?.image_path, "p1.png");
  assert.equal(scenes[1]?.type, "CTA");
});

check("legacy PRODUCT_DEMO worker type maps to IMAGE", () => {
  assert.equal(
    sceneTypeFromWorkerScene({ type: "PRODUCT_DEMO", id: "x" }),
    "IMAGE",
  );
});

check("assertLanguageVariantVisualFidelity rejects type drift", () => {
  assert.throws(() =>
    assertLanguageVariantVisualFidelity({
      primary,
      prepared: [{ ...primary[0], type: "IMAGE" }, { ...primary[1]!, type: "IMAGE" }],
    }),
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
