// Final layout preview uses production compositor (no FFmpeg).
//   npm run check:final-layout-preview

import assert from "node:assert/strict";
import sharp from "sharp";
import { buildFinalLayoutPreviewPng } from "@/lib/video-scene-editor/previewFinalLayout";
import {
  preventDoubleFraming,
  resolvePresentationTemplate,
} from "@/lib/assets/presentationTemplate";
import { readDeviceFrameMetadata } from "@/lib/assets/deviceFrameMetadata";
import {
  presentationOverrideToTemplate,
  resolveScenePresentation,
} from "@/lib/video-scene-editor/scenePresentationOverride";
import { composeAssetSceneStill } from "@/video-worker/services/assetSceneLayout";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

async function checkAsync(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

async function portraitBuffer(): Promise<Buffer> {
  return sharp({
    create: {
      width: 298,
      height: 626,
      channels: 3,
      background: { r: 40, g: 40, b: 48 },
    },
  })
    .png()
    .toBuffer();
}

check("override maps UI_HERO template", () => {
  assert.equal(presentationOverrideToTemplate("UI_HERO"), "UI_HERO");
  assert.equal(presentationOverrideToTemplate("automatic"), null);
});

check("DEVICE_MOCKUP override blocked when phone frame present", () => {
  const meta = {
    contains_phone_frame: true,
    contains_device_frame: true,
    product_role: "product_ui",
    width: 298,
    height: 626,
  };
  const resolved = resolveScenePresentation({
    assetMetadata: meta,
    scene: { image_prompt: "x", presentation_override: "DEVICE_MOCKUP" },
  });
  assert.equal(resolved.template, "UI_HERO");
  assert.equal(resolved.doubleFramingPrevented, true);
  assert.ok(resolved.guardNote);
});

await checkAsync("preview PNG matches composeAssetSceneStill for UI_HERO", async () => {
  const assetBytes = await portraitBuffer();
  const meta = {
    product_role: "product_ui",
    width: 298,
    height: 626,
  };
  const preview = await buildFinalLayoutPreviewPng({
    assetBytes,
    assetMetadata: meta,
    scene: { image_prompt: "beat", presentation_override: "automatic" },
  });
  const direct = await composeAssetSceneStill({
    assetBytes,
    videoUsage: preview.presentation.videoUsage,
    assetMetadata: meta,
  });
  assert.equal(preview.png.length, direct.length);
  assert.equal(preview.png.compare(direct), 0);
  const m = await sharp(preview.png).metadata();
  assert.equal(m.width, SHORT_PROFILE.width);
  assert.equal(m.height, SHORT_PROFILE.height);
});

await checkAsync("preview path does not invoke video job (source check)", async () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const src = readFileSync(
    join(root, "lib/video-scene-editor/previewFinalLayout.ts"),
    "utf8",
  );
  assert.ok(src.includes("composeAssetSceneStill"));
  assert.ok(!src.includes("runSceneEditorRerender"));
  assert.ok(!src.includes("ffmpeg"));
});

check("guardrail preventDoubleFraming is deterministic", () => {
  const frame = readDeviceFrameMetadata({
    contains_phone_frame: true,
    contains_device_frame: true,
  });
  const g = preventDoubleFraming(frame, "DEVICE_MOCKUP");
  assert.equal(g.template, "UI_HERO");
});

await checkAsync("preview Fullscreen override matches compositor", async () => {
  const assetBytes = await portraitBuffer();
  const meta = {
    product_role: "product_ui",
    width: 298,
    height: 626,
  };
  const preview = await buildFinalLayoutPreviewPng({
    assetBytes,
    assetMetadata: meta,
    scene: { image_prompt: "beat", presentation_override: "FULLSCREEN_PHOTO" },
  });
  assert.equal(preview.presentation.template, "FULLSCREEN_PHOTO");
  assert.equal(preview.presentation.videoUsage, "fullscreen_contain");
  const direct = await composeAssetSceneStill({
    assetBytes,
    videoUsage: "fullscreen_contain",
    assetMetadata: meta,
  });
  assert.equal(preview.png.compare(direct), 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
