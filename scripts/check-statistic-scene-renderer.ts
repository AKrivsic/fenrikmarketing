// Phase 10 — STATISTIC scene renderer.
//   npm run check:statistic-scene-renderer

import assert from "node:assert/strict";
import sharp from "sharp";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import {
  parseStatisticScenePayload,
  statisticScenePayloadSchema,
} from "@/lib/scene-types/statistic/statisticScenePayload";
import { composeStatisticRasterPng } from "@/lib/scene-types/statistic/composeStatisticRaster";
import { resolveChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import { deriveProjectPresentationSignals } from "@/lib/scene-types/presentation/projectSignals";
import { prepareRenderScenesForLanguageVariant } from "@/lib/scene-types/languageVariantScenes";
import { STATISTIC_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/statisticSceneRenderer";
import {
  assertSceneRenderable,
  getRegisteredSceneRendererTypes,
} from "@/lib/scene-types/renderers/types";
import { compileVisualScenesToWorkerScenes } from "@/lib/scene-types/compileScenePlan";
import { ensureSceneRendererRegistry } from "@/video-worker/services/sceneRendererRegistry";
import { emptyKnowledge } from "@/lib/knowledge/types";
import type { Json } from "@/lib/supabase/types";
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
await check("schema accepts canonical statistic payload", () => {
  assert.equal(
    statisticScenePayloadSchema.safeParse({
      value: "42",
      unit: "%",
      label: "of inquiries arrive outside business hours",
      proof_id: "proof-statement-0",
    }).success,
    true,
  );
});

await check("schema rejects missing proof_id", () => {
  assert.equal(
    statisticScenePayloadSchema.safeParse({
      value: "42",
      label: "x",
    }).success,
    false,
  );
});

console.log("\nRaster");
await check("1080x1920 raster with subtitle-safe layout", async () => {
  const tokens = resolveChecklistBrandTokens({ knowledge: null });
  const { png, metadata } = await composeStatisticRasterPng({
    payload: {
      value: "1,200",
      unit: "",
      label: "active customers using the platform every week",
      proof_id: "proof-statement-0",
      source_line: "Internal data",
    },
    tokens,
  });
  const meta = await sharp(png).metadata();
  assert.equal(meta.width, SHORT_PROFILE.width);
  assert.equal(meta.height, SHORT_PROFILE.height);
  assert.ok(metadata.labelLines >= 1);
});

await check("long label wraps without error", async () => {
  const tokens = resolveChecklistBrandTokens({ knowledge: null });
  const { png, metadata } = await composeStatisticRasterPng({
    payload: {
      value: "15",
      unit: "min",
      label:
        "average response time for priority support tickets during business hours across regions",
      proof_id: "p1",
    },
    tokens,
  });
  assert.ok(png.length > 1000);
  assert.ok(metadata.labelLines >= 2);
});

console.log("\nRegistry");
await check("STATISTIC registered with statistic@1", () => {
  ensureSceneRendererRegistry();
  assert.ok(getRegisteredSceneRendererTypes().includes("STATISTIC"));
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
    assert.equal(
      assertSceneRenderable(
        {
          id: "scene-1",
          type: "STATISTIC",
          image_prompt: "presentation:statistic:scene-1",
          duration_seconds: 4,
        },
        { projectId: "p", videoJobId: "j" },
      ),
      "STATISTIC",
    );
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

console.log("\nCompile");
await check("compiler emits STATISTIC worker scene metadata", async () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
    const compiled = await compileVisualScenesToWorkerScenes(mockSupabase, "proj", [
      {
        id: "scene-1",
        type: "STATISTIC",
        payload: {
          value: "42",
          unit: "%",
          label: "faster onboarding",
          proof_id: "proof-statement-0",
        },
      },
    ]);
    assert.equal(compiled[0]?.type, "STATISTIC");
    assert.equal(compiled[0]?.renderer_version, STATISTIC_SCENE_RENDERER_VERSION);
    assert.ok(compiled[0]?.payload_snapshot);
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

console.log("\nLanguage variants");
await check("language variant downgrades STATISTIC and drops raster reuse", () => {
  const { scenes, warnings } = prepareRenderScenesForLanguageVariant({
    voiceoverText: "Localized narration.",
    scenes: [
      {
        id: "scene-1",
        type: "STATISTIC",
        payload_snapshot: {
          value: "42",
          unit: "%",
          label: "metric",
          proof_id: "p",
        },
        image_bucket: "b",
        image_path: "path.png",
        renderer_version: STATISTIC_SCENE_RENDERER_VERSION,
      },
    ],
  });
  assert.equal(scenes[0]?.type, "IMAGE");
  assert.ok(!("image_bucket" in scenes[0]!));
  assert.match(warnings.join(" "), /STATISTIC downgraded to IMAGE/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
