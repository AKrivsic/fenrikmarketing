// Asset scene layout compositor for vertical 9:16 video stills.
//   npm run check:asset-scene-layout

import assert from "node:assert/strict";
import sharp from "sharp";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import {
  composeAssetSceneStill,
  normalizeAssetLayoutMode,
  shouldComposeAssetLayout,
} from "@/video-worker/services/assetSceneLayout";
import { buildRenderSpec } from "@/video-worker/jobRunner";
import { mergeGeneratedAndAssetScenes } from "@/lib/video-engine/scenePool";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => Promise<void>): Promise<void> {
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

async function main(): Promise<void> {
  const landscape = await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: { r: 40, g: 120, b: 200 },
    },
  })
    .png()
    .toBuffer();

  const portrait = await sharp({
    create: {
      width: 390,
      height: 844,
      channels: 3,
      background: { r: 200, g: 80, b: 120 },
    },
  })
    .png()
    .toBuffer();

  await check("framed_screen composes to 9:16 canvas", async () => {
    const out = await composeAssetSceneStill({
      assetBytes: landscape,
      videoUsage: "framed_screen",
    });
    const meta = await sharp(out).metadata();
    assert.equal(meta.width, SHORT_PROFILE.width);
    assert.equal(meta.height, SHORT_PROFILE.height);
    assert.notEqual(out.length, landscape.length);
  });

  await check(
    "landscape desktop asset stays fully visible (contain, not cover crop)",
    async () => {
      const out = await composeAssetSceneStill({
        assetBytes: landscape,
        videoUsage: "framed_laptop",
      });
      const { data, info } = await sharp(out)
        .raw()
        .toBuffer({ resolveWithObject: true });
      const w = info.width;
      const h = info.height;
      const corners = [
        [0, 0],
        [w - 1, 0],
        [0, h - 1],
        [w - 1, h - 1],
      ] as const;
      let cornerB = 0;
      let centerB = 0;
      const cx = Math.floor(w / 2);
      const cy = Math.floor(h / 2);
      for (const [x, y] of corners) {
        const i = (y * w + x) * info.channels;
        cornerB += data[i + 2];
      }
      for (let dy = -8; dy <= 8; dy++) {
        for (let dx = -8; dx <= 8; dx++) {
          const i = ((cy + dy) * w + (cx + dx)) * info.channels;
          centerB += data[i + 2];
        }
      }
      cornerB /= corners.length;
      centerB /= 17 * 17;
      assert.ok(centerB > cornerB + 15, "center should be more asset-heavy than corners");
    },
  );

  await check("framed_phone keeps portrait asset readable", async () => {
    const out = await composeAssetSceneStill({
      assetBytes: portrait,
      videoUsage: "framed_phone",
    });
    const meta = await sharp(out).metadata();
    assert.equal(meta.width, SHORT_PROFILE.width);
    assert.equal(meta.height, SHORT_PROFILE.height);
    const stats = await sharp(out).stats();
    const r = stats.channels[0].stdev ?? 0;
    assert.ok(r > 5, "composed frame should have visible content variance");
  });

  await check("floating_card preserves full asset area", async () => {
    const out = await composeAssetSceneStill({
      assetBytes: landscape,
      videoUsage: "floating_card",
    });
    const meta = await sharp(out).metadata();
    assert.equal(meta.width, SHORT_PROFILE.width);
    assert.ok(shouldComposeAssetLayout("floating_card"));
  });

  await check("unknown video_usage falls back to floating_card layout", async () => {
    assert.equal(normalizeAssetLayoutMode("something_new"), "floating_card");
    const out = await composeAssetSceneStill({
      assetBytes: landscape,
      videoUsage: "something_new",
    });
    const meta = await sharp(out).metadata();
    assert.equal(meta.height, SHORT_PROFILE.height);
  });

  await check("fullscreen returns raw asset bytes", async () => {
    const out = await composeAssetSceneStill({
      assetBytes: landscape,
      videoUsage: "fullscreen",
    });
    assert.equal(out.length, landscape.length);
    assert.equal(shouldComposeAssetLayout("fullscreen"), false);
  });

  await check("missing video_usage skips layout on reuse path", async () => {
    assert.equal(shouldComposeAssetLayout(undefined), false);
    assert.equal(shouldComposeAssetLayout(""), false);
    assert.equal(shouldComposeAssetLayout("   "), false);
  });

  await check("render_spec keeps video_usage on asset scene", async () => {
    const spec = buildRenderSpec({
      voiceover_text: "Narration long enough for the render path to run.",
      image_prompts: ["a", "b", "c"],
      asset_images: [
        {
          bucket: "b",
          path: "p.png",
          title: "UI",
          video_usage: "framed_screen",
        },
      ],
    });
    const asset = spec.scenes.find((s) => s.id === "asset-1");
    assert.ok(asset);
    assert.equal(asset?.video_usage, "framed_screen");
    const idx = spec.scenes.findIndex((s) => s.id === "asset-1");
    assert.ok(idx >= 0 && idx <= 3);
  });

  await check("asset scene survives scene pool trim", async () => {
    const generated = Array.from({ length: 6 }, (_v, i) => ({
      id: `scene-${i + 1}`,
      image_prompt: `g${i}`,
      duration_seconds: 4,
    }));
    const assets = [
      {
        id: "asset-1",
        image_prompt: "product",
        duration_seconds: 4,
        image_bucket: "b",
        image_path: "p",
        video_usage: "framed_screen",
      },
    ];
    const merged = mergeGeneratedAndAssetScenes(generated, assets, 8);
    assert.ok(merged.some((s) => s.id === "asset-1"));
    assert.equal(
      merged.find((s) => s.id === "asset-1")?.video_usage,
      "framed_screen",
    );
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
