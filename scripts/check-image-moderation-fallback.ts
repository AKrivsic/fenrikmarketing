// Per-scene image moderation fallback (safe retry + local branded raster).
//   npm run check:image-moderation-fallback

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import type { ImageProvider } from "@/lib/ai/types";
import {
  ImageProviderHttpError,
  isImageModerationBlocked,
  isNonRetryableImageProviderError,
} from "@/lib/ai/imageProviderHttpError";
import {
  VIDEO_RASTER_HEIGHT,
  VIDEO_RASTER_WIDTH,
} from "@/lib/video-engine/videoRasterDimensions";
import { resolveRenderBrandTokens } from "@/lib/visual-profile/renderBrandTokens";
import { parseVisualProfile } from "@/lib/visual-profile/visualProfile";
import { buildModerationSafeRetryPrompt } from "@/video-worker/services/imageModerationFallbackPrompt";
import { generateSceneImageWithModerationFallback } from "@/video-worker/services/generateSceneImageWithModerationFallback";
import { writeLocalBrandedSceneFallbackPng } from "@/video-worker/services/localBrandedSceneFallback";
import {
  DEFAULT_SCENE_TYPE,
  effectiveSceneType,
} from "@/lib/scene-types/sceneType";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
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

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function moderationError(): ImageProviderHttpError {
  return new ImageProviderHttpError("OpenAI image request failed (400)", {
    httpStatus: 400,
    errorCode: "moderation_blocked",
    errorType: "image_generation_user_error",
    moderationStage: "output",
    moderationCategories: ["other"],
  });
}

function authError(): ImageProviderHttpError {
  return new ImageProviderHttpError("OpenAI image request failed (401)", {
    httpStatus: 401,
    errorCode: "invalid_api_key",
  });
}

const testCtx = {
  projectId: "proj-check",
  videoJobId: "job-check",
  visualProfile: "EDITORIAL",
};

const brandTokens = resolveRenderBrandTokens({
  knowledge: null,
  visualProfile: parseVisualProfile("EDITORIAL"),
});

const productionScene1Prompt =
  "Vertical 9:16 portrait composition. Two young founders sitting across from each other at a shared desk on a Friday afternoon, warm natural light from a nearby window. Both have laptops open showing recognizable dashboard-style interfaces with charts and task lists — no readable text. One founder points at a sticky note on the monitor. The mood is optimistic but slightly tired. Clean, modern home-office or co-working environment. Editorial photography style, refined framing, natural color tones.";

await check("isImageModerationBlocked detects moderation_blocked", () => {
  assert.ok(isImageModerationBlocked(moderationError()));
  assert.ok(!isNonRetryableImageProviderError(moderationError()));
});

await check("auth errors are non-retryable and not moderation", () => {
  const err = authError();
  assert.ok(isNonRetryableImageProviderError(err));
  assert.ok(!isImageModerationBlocked(err));
});

await check("safe retry prompt strips people, phones, sticky note", () => {
  const retry = buildModerationSafeRetryPrompt({
    originalPrompt: productionScene1Prompt,
    profileSuffix: "Editorial refined tones.",
  });
  assert.ok(!/\bfounder/i.test(retry));
  assert.ok(!/sticky note/i.test(retry));
  assert.ok(retry.includes("No people"));
});

await check("normal image success writes file with empty meta flags", async () => {
  const dir = await mkdtemp(join(tmpdir(), "img-mod-"));
  const out = join(dir, "ok.png");
  let calls = 0;
  const provider: ImageProvider = {
    name: "mock",
    async generateImage() {
      calls++;
      return {
        provider: "mock",
        model: "mock",
        imageBase64: TINY_PNG_BASE64,
      };
    },
    async editImage() {
      throw new Error("not used");
    },
  };
  const { meta } = await generateSceneImageWithModerationFallback({
    provider,
    ctx: testCtx,
    sceneId: "scene-a",
    primaryPrompt: "A calm lake at dawn.",
    profileSuffix: "",
    outputPath: out,
  });
  assert.equal(calls, 1);
  assert.ok((await readFile(out)).length > 0);
  assert.equal(meta.original_generation_blocked, undefined);
  await rm(dir, { recursive: true, force: true });
});

await check("moderation then safe retry succeeds only for affected scene", async () => {
  const dir = await mkdtemp(join(tmpdir(), "img-mod-"));
  const out = join(dir, "retry.png");
  const prompts: string[] = [];
  const provider: ImageProvider = {
    name: "mock",
    async generateImage(req) {
      prompts.push(req.prompt);
      if (prompts.length === 1) throw moderationError();
      return {
        provider: "mock",
        model: "mock",
        imageBase64: TINY_PNG_BASE64,
      };
    },
    async editImage() {
      throw new Error("not used");
    },
  };
  const { meta } = await generateSceneImageWithModerationFallback({
    provider,
    ctx: testCtx,
    sceneId: "scene-1",
    primaryPrompt: productionScene1Prompt,
    profileSuffix: "Editorial.",
    outputPath: out,
  });
  assert.equal(prompts.length, 2);
  assert.equal(meta.original_generation_blocked, true);
  assert.equal(meta.safe_retry_attempted, true);
  assert.equal(meta.safe_retry_succeeded, true);
  assert.equal(meta.local_fallback_used, undefined);
  await rm(dir, { recursive: true, force: true });
});

await check("double moderation uses local 1080x1920 branded fallback", async () => {
  const dir = await mkdtemp(join(tmpdir(), "img-mod-"));
  const out = join(dir, "local.png");
  const provider: ImageProvider = {
    name: "mock",
    async generateImage() {
      throw moderationError();
    },
    async editImage() {
      throw new Error("not used");
    },
  };
  const { meta } = await generateSceneImageWithModerationFallback({
    provider,
    ctx: testCtx,
    sceneId: "scene-1",
    primaryPrompt: productionScene1Prompt,
    profileSuffix: "",
    outputPath: out,
    brandTokensForLocalFallback: brandTokens,
  });
  assert.equal(meta.local_fallback_used, true);
  const info = await sharp(out).metadata();
  assert.equal(info.width, VIDEO_RASTER_WIDTH);
  assert.equal(info.height, VIDEO_RASTER_HEIGHT);
  await rm(dir, { recursive: true, force: true });
});

await check("auth error on first attempt fails the job path", async () => {
  const dir = await mkdtemp(join(tmpdir(), "img-mod-"));
  const out = join(dir, "auth.png");
  const provider: ImageProvider = {
    name: "mock",
    async generateImage() {
      throw authError();
    },
    async editImage() {
      throw new Error("not used");
    },
  };
  await assert.rejects(
    () =>
      generateSceneImageWithModerationFallback({
        provider,
        ctx: testCtx,
        sceneId: "scene-x",
        primaryPrompt: "test",
        profileSuffix: "",
        outputPath: out,
      }),
    (err: unknown) => err instanceof ImageProviderHttpError && err.httpStatus === 401,
  );
  await rm(dir, { recursive: true, force: true });
});

await check("Scene Type effective mapping unchanged (IMAGE default)", () => {
  assert.equal(effectiveSceneType(undefined, DEFAULT_SCENE_TYPE), "IMAGE");
  assert.equal(effectiveSceneType("IMAGE", DEFAULT_SCENE_TYPE), "IMAGE");
});

await check("writeLocalBrandedSceneFallbackPng dimensions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "img-mod-"));
  const out = join(dir, "brand.png");
  await writeLocalBrandedSceneFallbackPng({ outputPath: out, tokens: brandTokens });
  const info = await sharp(out).metadata();
  assert.equal(info.width, VIDEO_RASTER_WIDTH);
  assert.equal(info.height, VIDEO_RASTER_HEIGHT);
  await rm(dir, { recursive: true, force: true });
});

await check("only scenes with fallback carry image_generation_warnings", () => {
  const images = [
    {
      sceneId: "scene-1",
      imagePath: "/tmp/a.png",
      imageGenerationWarning: {
        scene_id: "scene-1",
        original_generation_blocked: true,
        safe_retry_succeeded: true,
      },
    },
    { sceneId: "scene-2", imagePath: "/tmp/b.png" },
    { sceneId: "scene-3", imagePath: "/tmp/c.png" },
    { sceneId: "scene-4", imagePath: "/tmp/d.png" },
  ];
  const warnings = images
    .map((img) => img.imageGenerationWarning)
    .filter((w): w is NonNullable<typeof w> => w != null);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.scene_id, "scene-1");
  assert.equal(images.length, 4);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
