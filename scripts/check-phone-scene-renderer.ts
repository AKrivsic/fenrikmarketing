// PHONE scene renderer — payload, raster, pipeline (Phase 7).
//   npm run check:phone-scene-renderer

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import {
  parsePhoneScenePayload,
  phoneScenePayloadSchema,
} from "@/lib/scene-types/phone/phoneScenePayload";
import { composePhoneRasterPng } from "@/lib/scene-types/phone/composePhoneRaster";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import { deriveAllowedSceneTypes } from "@/lib/scene-types/presentation/deriveAllowedSceneTypes";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import { deriveProjectPresentationSignals } from "@/lib/scene-types/presentation/projectSignals";
import { prepareRenderScenesForLanguageVariant } from "@/lib/scene-types/languageVariantScenes";
import { PHONE_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/phoneSceneRenderer";
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

async function solidScreenPng(w: number, h: number, color: string): Promise<Buffer> {
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer();
}

console.log("\nPayload validation");
await check("schema accepts asset + caption", () => {
  const issues = phoneScenePayloadSchema.safeParse({
    asset_id: "11111111-1111-4111-8111-111111111111",
    caption: "AI replies instantly.",
  });
  assert.equal(issues.success, true);
});

await check("schema accepts image_prompt only", () => {
  const parsed = parsePhoneScenePayload({
    image_prompt: "Mobile chat inbox UI",
    caption: "See every reply",
  });
  assert.equal(parsed.ok, true);
});

await check("schema rejects asset and prompt together", () => {
  const parsed = parsePhoneScenePayload({
    asset_id: "11111111-1111-4111-8111-111111111111",
    image_prompt: "UI",
  });
  assert.equal(parsed.ok, false);
});

await check("legacy screen payload normalizes", () => {
  const parsed = parsePhoneScenePayload({
    screen: { asset_id: "11111111-1111-4111-8111-111111111111" },
    caption: "Inbox",
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.data.asset_id, "11111111-1111-4111-8111-111111111111");
  }
});

console.log("\nRaster fixtures");
await check("compose phone frame with caption", async () => {
  const screen = await solidScreenPng(390, 844, "#6366f1");
  const { png, metadata } = await composePhoneRasterPng({
    payload: {
      asset_id: "11111111-1111-4111-8111-111111111111",
      caption: "AI replies instantly.",
    },
    screenPng: screen,
  });
  const meta = await sharp(png).metadata();
  assert.equal(meta.width, SHORT_PROFILE.width);
  assert.equal(meta.height, SHORT_PROFILE.height);
  assert.ok(metadata.captionLines >= 1);
});

await check("compose without caption", async () => {
  const screen = await solidScreenPng(400, 800, "#0ea5e9");
  const { png } = await composePhoneRasterPng({
    payload: {
      image_prompt: "Mobile dashboard UI screenshot",
    },
    screenPng: screen,
  });
  assert.ok(png.length > 1000);
});

const fixtureDir = join(process.cwd(), "scripts/output/phone-scene-fixtures");
await mkdir(fixtureDir, { recursive: true }).catch(() => {});
await check("write fixture png", async () => {
  const screen = await solidScreenPng(360, 780, "#22c55e");
  const { png } = await composePhoneRasterPng({
    payload: {
      image_prompt: "x",
      caption: "Book in two taps",
    },
    screenPng: screen,
  });
  await writeFile(join(fixtureDir, "phone-with-caption.png"), png);
});

console.log("\nAnalyzer + compile");
await check("eligible PHONE stays PHONE when enabled", () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
    const signals = deriveProjectPresentationSignals({
      project: { product_is: ["Mobile SaaS app"], product_strengths: [] },
      assets: [
        {
          id: "mobile-asset-1",
          title: "App UI",
          mobileUi: true,
          phonePresentation: true,
        },
      ],
    });
    const r = analyzePresentation({
      scenes: [
        {
          id: "scene-1",
          type: "PHONE",
          payload: {
            asset_id: "mobile-asset-1",
            caption: "Chat inbox",
          },
        },
      ],
      allowedSceneTypes: deriveAllowedSceneTypes(
        { knowledge: {}, proof: buildProofIndex(null), projectSignals: signals },
        { sceneTypesEnabled: true },
      ),
      voiceoverText: "Open the app to see your chat inbox.",
      proof: buildProofIndex(null),
      projectSignals: signals,
    });
    assert.equal(r.scenes[0]?.type, "PHONE");
    assert.equal(r.decisions[0]?.rule, "allowed");
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

await check("restaurant narration downgrades PHONE", () => {
  const r = analyzePresentation({
    scenes: [
      {
        id: "scene-1",
        type: "PHONE",
        payload: { image_prompt: "phone app" },
      },
    ],
    allowedSceneTypes: ["IMAGE", "PHONE"],
    voiceoverText: "Enjoy our cozy dining room tonight.",
    proof: buildProofIndex(null),
    projectSignals: deriveProjectPresentationSignals({
      project: { product_is: ["Restaurant dining"], product_strengths: [] },
      assets: [],
    }),
  });
  assert.equal(r.decisions[0]?.rule, "phone_mobile_capability_missing");
});

await check("compiler emits PHONE worker scene", async () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
    const compiled = await compileVisualScenesToWorkerScenes(mockSupabase, "p", [
      {
        id: "scene-1",
        type: "PHONE",
        payload: {
          asset_id: "11111111-1111-4111-8111-111111111111",
          caption: "Hello",
        },
      },
    ]);
    assert.equal(compiled[0]?.type, "PHONE");
    assert.equal(compiled[0]?.renderer_version, PHONE_SCENE_RENDERER_VERSION);
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

console.log("\nRegistry");
await check("PHONE registered in worker registry", () => {
  ensureSceneRendererRegistry();
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "true";
  try {
    assert.ok(getRegisteredSceneRendererTypes().includes("PHONE"));
    assert.equal(
      assertSceneRenderable(
        {
          id: "scene-1",
          type: "PHONE",
          image_prompt: "presentation:phone",
          duration_seconds: 4,
          payload_snapshot: {
            asset_id: "11111111-1111-4111-8111-111111111111",
          },
          renderer_version: PHONE_SCENE_RENDERER_VERSION,
        },
        { projectId: "p", videoJobId: "job-1" },
      ),
      "PHONE",
    );
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

console.log("\nLanguage variants");
await check("language variant preserves PHONE and raster refs", () => {
  const { scenes, warnings } = prepareRenderScenesForLanguageVariant({
    voiceoverText: "Localized voiceover.",
    scenes: [
      {
        id: "scene-1",
        type: "PHONE",
        image_prompt: "presentation:phone",
        duration_seconds: 4,
        image_bucket: "bucket",
        image_path: "phone.png",
        payload_snapshot: {
          asset_id: "11111111-1111-4111-8111-111111111111",
          caption: "English UI",
        },
        renderer_version: PHONE_SCENE_RENDERER_VERSION,
      },
    ],
  });
  assert.equal(scenes[0]?.type, "PHONE");
  assert.equal(scenes[0]?.image_bucket, "bucket");
  assert.equal(scenes[0]?.image_path, "phone.png");
  assert.equal(warnings.length, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
