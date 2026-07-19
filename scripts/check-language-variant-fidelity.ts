// Sprint 5.3.2 — language-variant visual reuse / zero image generation.
//   npm run check:language-variant-fidelity

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertLanguageVariantVisualFidelity,
  isLanguageVariantVideoJobInput,
  LanguageVariantVisualAssetMissingError,
  LanguageVariantVisualFidelityError,
  prepareRenderScenesForLanguageVariant,
  preserveProductDemoForLanguageVariant,
} from "@/lib/scene-types/languageVariantScenes";
import {
  RenderProductDemoFailedError,
  validateRenderFidelity,
} from "@/lib/scene-types/presentation/renderFidelity";
import { buildDefaultProductDemoBeat } from "@/lib/scene-types/product-demo/productDemoBeat";

const root = process.cwd();

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

const beat = buildDefaultProductDemoBeat({ actorId: "primary_actor" });

const primaryScenes: Record<string, unknown>[] = [
  {
    id: "scene-1",
    type: "IMAGE",
    image_prompt: "opening still",
    duration_seconds: 4,
    image_bucket: "renders",
    image_path: "primary/scene-1.png",
    asset_id: "asset-image-1",
  },
  {
    id: "scene-check",
    type: "CHECKLIST",
    image_prompt: "presentation:checklist",
    duration_seconds: 4,
    image_bucket: "renders",
    image_path: "primary/check.png",
    payload_snapshot: { items: ["One", "Two"] },
    renderer_version: "checklist@1",
  },
  {
    id: "scene-phone",
    type: "PHONE",
    image_prompt: "presentation:phone",
    duration_seconds: 4,
    image_bucket: "renders",
    image_path: "primary/phone.png",
    payload_snapshot: {
      asset_id: "11111111-1111-4111-8111-111111111111",
      caption: "English UI",
    },
    renderer_version: "phone@1",
  },
  {
    id: "scene-quote",
    type: "QUOTE",
    image_prompt: "presentation:quote",
    duration_seconds: 4,
    image_bucket: "renders",
    image_path: "primary/quote.png",
    payload_snapshot: {
      quote: "Great product",
      attribution: "Customer",
      proof_id: "proof-1",
    },
    renderer_version: "quote@1",
  },
  {
    id: "scene-stat",
    type: "STATISTIC",
    image_prompt: "presentation:statistic",
    duration_seconds: 4,
    image_bucket: "renders",
    image_path: "primary/stat.png",
    payload_snapshot: {
      value: "90%",
      label: "growth",
      proof_id: "proof-2",
    },
    renderer_version: "statistic@1",
  },
  {
    id: "scene-cta",
    type: "CTA",
    image_prompt: "presentation:cta",
    duration_seconds: 4,
    image_bucket: "renders",
    image_path: "primary/cta.png",
    payload_snapshot: { headline: "Book a demo" },
    renderer_version: "cta@1",
  },
  {
    id: "scene-demo",
    type: "PRODUCT_DEMO",
    image_prompt: "presentation:product_demo",
    duration_seconds: 5,
    image_bucket: "renders",
    image_path: "primary/demo.png",
    payload_snapshot: beat,
    renderer_version: "product_demo@1",
  },
];

console.log("\nSprint 5.3.2 — typed scene preservation");

check("1 CHECKLIST remains CHECKLIST", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: primaryScenes,
    voiceoverText: "Localized voiceover.",
  });
  assert.equal(scenes[1]?.type, "CHECKLIST");
});

check("2 PHONE remains PHONE", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: primaryScenes,
    voiceoverText: "Localized.",
  });
  assert.equal(scenes[2]?.type, "PHONE");
});

check("3 QUOTE remains QUOTE", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: primaryScenes,
    voiceoverText: "Localized.",
  });
  assert.equal(scenes[3]?.type, "QUOTE");
});

check("4 STATISTIC remains STATISTIC", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: primaryScenes,
    voiceoverText: "Localized.",
  });
  assert.equal(scenes[4]?.type, "STATISTIC");
});

check("5 CTA remains CTA", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: primaryScenes,
    voiceoverText: "Localized.",
  });
  assert.equal(scenes[5]?.type, "CTA");
});

check("6 PRODUCT_DEMO remains PRODUCT_DEMO", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: primaryScenes,
    voiceoverText: "Localized.",
  });
  assert.equal(scenes[6]?.type, "PRODUCT_DEMO");
});

check("7 image_bucket and image_path preserved", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: primaryScenes,
    voiceoverText: "Localized.",
  });
  for (let i = 0; i < primaryScenes.length; i++) {
    assert.equal(scenes[i]?.image_bucket, primaryScenes[i]?.image_bucket);
    assert.equal(scenes[i]?.image_path, primaryScenes[i]?.image_path);
  }
});

check("8 asset IDs preserved", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: primaryScenes,
    voiceoverText: "Localized.",
  });
  assert.equal(scenes[0]?.asset_id, "asset-image-1");
});

check("9 scene count and order preserved", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: primaryScenes,
    voiceoverText: "Localized.",
  });
  assert.equal(scenes.length, primaryScenes.length);
  assert.deepEqual(
    scenes.map((s) => s.id),
    primaryScenes.map((s) => s.id),
  );
});

check("10 prepare does not invent narration image_prompt", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: primaryScenes,
    voiceoverText: "Totally different localized narration for still invention.",
  });
  assert.equal(scenes[0]?.image_prompt, "opening still");
  assert.doesNotMatch(
    String(scenes[1]?.image_prompt ?? ""),
    /Localized video still|Realistic vertical/,
  );
});

check("11 no soft-downgrade warnings", () => {
  const { warnings } = prepareRenderScenesForLanguageVariant({
    scenes: primaryScenes,
    voiceoverText: "Localized.",
  });
  assert.equal(warnings.length, 0);
  assert.doesNotMatch(warnings.join(" "), /downgraded to IMAGE/);
});

check("12 missing storage fails clearly (no IMAGE fallback)", () => {
  assert.throws(
    () =>
      prepareRenderScenesForLanguageVariant({
        voiceoverText: "x",
        scenes: [
          {
            id: "bare",
            type: "CHECKLIST",
            payload_snapshot: { items: ["A", "B"] },
          },
        ],
      }),
    (err: unknown) =>
      err instanceof LanguageVariantVisualAssetMissingError &&
      err.code === "language_variant_visual_asset_missing",
  );
});

check("13 IMAGE scenes keep primary prompt + storage", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: [primaryScenes[0]!],
    voiceoverText: "Localized VO only.",
  });
  assert.equal(scenes[0]?.type, "IMAGE");
  assert.equal(scenes[0]?.image_bucket, "renders");
  assert.equal(scenes[0]?.image_path, "primary/scene-1.png");
  assert.equal(scenes[0]?.image_prompt, "opening still");
});

check("14 typed payloads preserved (visual reuse, primary language OK)", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    scenes: primaryScenes,
    voiceoverText: "Localized.",
  });
  assert.deepEqual(scenes[1]?.payload_snapshot, {
    items: ["One", "Two"],
  });
  assert.equal(
    (scenes[5]?.payload_snapshot as { headline?: string })?.headline,
    "Book a demo",
  );
});

check("15 visual fidelity rejects type change", () => {
  assert.throws(
    () =>
      assertLanguageVariantVisualFidelity({
        primary: [{ id: "a", type: "CTA", image_bucket: "b", image_path: "p" }],
        prepared: [
          { id: "a", type: "IMAGE", image_bucket: "b", image_path: "p" },
        ],
      }),
    (err: unknown) => err instanceof LanguageVariantVisualFidelityError,
  );
});

check("16 PRODUCT_DEMO invalid payload still fail-closes", () => {
  assert.throws(
    () =>
      prepareRenderScenesForLanguageVariant({
        voiceoverText: "x",
        scenes: [
          {
            id: "bad",
            type: "PRODUCT_DEMO",
            image_bucket: "b",
            image_path: "p.png",
            payload_snapshot: { type: "product_demo" },
          },
        ],
      }),
    (err: unknown) =>
      err instanceof RenderProductDemoFailedError &&
      err.code === "render_product_demo_failed",
  );
});

check("17 preserveProductDemo validates payload", () => {
  const preserved = preserveProductDemoForLanguageVariant(
    {
      id: "d1",
      type: "PRODUCT_DEMO",
      payload_snapshot: beat,
      image_bucket: "b",
      image_path: "d.png",
    },
    "d1",
  );
  assert.equal(preserved.type, "PRODUCT_DEMO");
  assert.equal(preserved.image_bucket, "b");
});

check("18 Render Fidelity PRODUCT_DEMO still passes", () => {
  const { scenes } = prepareRenderScenesForLanguageVariant({
    voiceoverText: "Localized.",
    scenes: [
      primaryScenes[0]!,
      {
        id: "demo",
        type: "PRODUCT_DEMO",
        image_bucket: "renders",
        image_path: "demo.png",
        payload_snapshot: beat,
      },
    ],
  });
  const fidelity = validateRenderFidelity({
    planned: [{ type: "PRODUCT_DEMO", id: "demo" }],
    rendered: scenes
      .filter((s) => String(s.type).toUpperCase() === "PRODUCT_DEMO")
      .map((s) => ({ type: "PRODUCT_DEMO" as const, id: String(s.id) })),
  });
  assert.equal(fidelity.passed, true);
});

check("19 language variant job input flags detected", () => {
  assert.equal(
    isLanguageVariantVideoJobInput({ generated_from_language_variant: true }),
    true,
  );
  assert.equal(
    isLanguageVariantVideoJobInput({ regenerated_language_variant: true }),
    true,
  );
  assert.equal(isLanguageVariantVideoJobInput({}), false);
});

check("20 no SOFT_DOWNGRADE_TYPES / downgradeSceneToImage in prepare module", () => {
  const src = readFileSync(
    join(root, "lib/scene-types/languageVariantScenes.ts"),
    "utf8",
  );
  assert.doesNotMatch(src, /SOFT_DOWNGRADE_TYPES/);
  assert.doesNotMatch(src, /downgradeSceneToImage/);
  assert.doesNotMatch(src, /downgraded to IMAGE for language variant/);
});

check("21 generate prepares before insert (orphan prevention)", () => {
  const src = readFileSync(
    join(root, "lib/ai/workflows/generateLanguageVariants.ts"),
    "utf8",
  );
  const marker =
    "Sprint 5.3.2 — prepare visual-clone scenes BEFORE insert";
  const prepBlock = src.indexOf(marker);
  assert.ok(prepBlock > 0, "missing prepare-before-insert marker");
  const insertAfter = src.indexOf(".insert({", prepBlock);
  assert.ok(insertAfter > prepBlock);
  assert.match(src, /visual fidelity/);
});

check("22 regenerate prepares before mutating variants", () => {
  const src = readFileSync(
    join(root, "lib/ai/workflows/regenerateLanguageVariant.ts"),
    "utf8",
  );
  const prepIdx = src.indexOf("prepareRenderScenesForLanguageVariant");
  const snapIdx = src.indexOf("snapshotVariant");
  assert.ok(prepIdx > 0 && snapIdx > prepIdx);
});

check("23 worker forbids image gen for language variants", () => {
  const job = readFileSync(join(root, "video-worker/jobRunner.ts"), "utf8");
  const images = readFileSync(
    join(root, "video-worker/services/images.ts"),
    "utf8",
  );
  const imagePrep = readFileSync(
    join(root, "video-worker/services/prepareImageSceneRaster.ts"),
    "utf8",
  );
  assert.match(job, /forbidImageGeneration:\s*isLanguageVariant/);
  assert.match(images, /generated_image_count/);
  assert.match(images, /must be 0/);
  assert.match(
    imagePrep,
    /image generation forbidden for language variants/,
  );
});

check("24 primary generation downgradeToImage still exists (unchanged)", () => {
  const src = readFileSync(
    join(root, "lib/scene-types/presentation/downgradeToImage.ts"),
    "utf8",
  );
  assert.match(src, /export function downgradeSceneToImage/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
