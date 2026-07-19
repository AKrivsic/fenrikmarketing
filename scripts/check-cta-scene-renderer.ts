// Phase 11 — CTA scene renderer.
//   npm run check:cta-scene-renderer

import assert from "node:assert/strict";
import sharp from "sharp";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import {
  parseCtaScenePayload,
  ctaScenePayloadSchema,
} from "@/lib/scene-types/cta/ctaScenePayload";
import { composeCtaRasterPng } from "@/lib/scene-types/cta/composeCtaRaster";
import { resolveChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import { deriveProjectPresentationSignals } from "@/lib/scene-types/presentation/projectSignals";
import { prepareRenderScenesForLanguageVariant } from "@/lib/scene-types/languageVariantScenes";
import { CTA_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/ctaSceneRenderer";
import {
  assertSceneRenderable,
  getRegisteredSceneRendererTypes,
} from "@/lib/scene-types/renderers/types";
import { compileVisualScenesToWorkerScenes } from "@/lib/scene-types/compileScenePlan";
import { ensureSceneRendererRegistry } from "@/video-worker/services/sceneRendererRegistry";
import type { SupabaseClient } from "@supabase/supabase-js";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

const mockSupabase = {} as SupabaseClient;

console.log("\nPayload validation");
await check("schema accepts canonical cta payload", () => {
  assert.equal(
    ctaScenePayloadSchema.safeParse({
      headline: "Book a demo",
      subline: "See how it works.",
      button_label: "Book now",
      show_logo: true,
    }).success,
    true,
  );
});

await check("schema rejects missing headline", () => {
  assert.equal(
    ctaScenePayloadSchema.safeParse({ button_label: "Go" }).success,
    false,
  );
});

console.log("\nRaster");
await check("1080x1920 raster subtitle-safe", async () => {
  const tokens = resolveChecklistBrandTokens({ knowledge: null });
  const { png, metadata } = await composeCtaRasterPng({
    payload: {
      headline: "Request a quote",
      subline: "We respond within one business day.",
      button_label: "Get started",
      show_logo: false,
    },
    tokens,
    logoPng: null,
  });
  const meta = await sharp(png).metadata();
  assert.equal(meta.width, SHORT_PROFILE.width);
  assert.equal(meta.height, SHORT_PROFILE.height);
  assert.equal(metadata.logoPresent, false);
});

await check("long headline wraps", async () => {
  const tokens = resolveChecklistBrandTokens({ knowledge: null });
  const { png, metadata } = await composeCtaRasterPng({
    payload: {
      headline:
        "Schedule your personalized product walkthrough with our team today",
      button_label: "Schedule",
    },
    tokens,
  });
  assert.ok(png.length > 1000);
  assert.ok(metadata.headlineLines >= 2);
});

console.log("\nRegistry");
await check("CTA registered cta@1", () => {
  ensureSceneRendererRegistry();
  assert.ok(getRegisteredSceneRendererTypes().includes("CTA"));
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
    assert.equal(
      assertSceneRenderable(
        {
          id: "scene-1",
          type: "CTA",
          image_prompt: "presentation:cta:scene-1",
          duration_seconds: 4,
        },
        { projectId: "p", videoJobId: "j" },
      ),
      "CTA",
    );
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

console.log("\nCompile");
await check("compiler emits CTA worker metadata", async () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
    const compiled = await compileVisualScenesToWorkerScenes(mockSupabase, "proj", [
      {
        id: "scene-2",
        type: "CTA",
        payload: { headline: "Book a demo", button_label: "Book now" },
      },
    ]);
    assert.equal(compiled[0]?.type, "CTA");
    assert.equal(compiled[0]?.renderer_version, CTA_SCENE_RENDERER_VERSION);
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

console.log("\nLanguage variants");
await check("language variant preserves CTA and raster refs", () => {
  const { scenes, warnings } = prepareRenderScenesForLanguageVariant({
    voiceoverText: "Localized.",
    scenes: [
      {
        id: "scene-1",
        type: "CTA",
        payload_snapshot: { headline: "Book a demo" },
        image_bucket: "b",
        image_path: "p.png",
        renderer_version: CTA_SCENE_RENDERER_VERSION,
      },
    ],
  });
  assert.equal(scenes[0]?.type, "CTA");
  assert.equal(scenes[0]?.image_bucket, "b");
  assert.equal(scenes[0]?.image_path, "p.png");
  assert.equal(warnings.length, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
