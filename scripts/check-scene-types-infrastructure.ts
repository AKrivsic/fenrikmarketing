// Phase 2 — Scene Types infrastructure checks.
//   npm run check:scene-types-infrastructure

import assert from "node:assert/strict";
import { sceneSchema } from "@/lib/video-engine/schemas/sceneSchema";
import {
  persistedSceneSchema,
  renderSchema,
  renderSpecOutputSchema,
} from "@/lib/video-engine/schemas/renderSchema";
import {
  normalizeVisualSceneEntries,
  normalizeVisualSceneEntry,
} from "@/lib/scene-types/normalizeVisualScene";
import { DEFAULT_SCENE_TYPE } from "@/lib/scene-types/sceneType";
import { isSceneTypesEnabled } from "@/lib/scene-types/config";
import {
  assertSceneRenderable,
  getRegisteredSceneRendererTypes,
  registerSceneRenderer,
} from "@/lib/scene-types/renderers/types";
import { createImageSceneRenderer } from "@/lib/scene-types/renderers/imageSceneRenderer";
import { assertWorkerScenesRenderable } from "@/lib/scene-types/assertWorkerScenes";

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

check("legacy AI scene normalizes to canonical IMAGE", () => {
  const scene = normalizeVisualSceneEntry(
    { source: "ai", image_prompt: "  Kitchen at dusk  " },
    0,
  );
  assert.ok(scene);
  assert.equal(scene.type, DEFAULT_SCENE_TYPE);
  assert.equal(scene.id, "scene-1");
  assert.equal(scene.payload.media.source, "ai");
  if (scene.payload.media.source === "ai") {
    assert.equal(scene.payload.media.image_prompt, "Kitchen at dusk");
  }
});

check("legacy asset scene normalizes to canonical IMAGE", () => {
  const scene = normalizeVisualSceneEntry(
    {
      source: "asset",
      asset_id: "aid-99",
      used_as: "product on counter",
      video_usage: "framed_phone",
    },
    2,
  );
  assert.ok(scene);
  assert.equal(scene.id, "scene-3");
  assert.equal(scene.payload.media.source, "asset");
  if (scene.payload.media.source === "asset") {
    assert.equal(scene.payload.media.asset_id, "aid-99");
    assert.equal(scene.payload.media.video_usage, "framed_phone");
  }
});

check("missing type becomes IMAGE", () => {
  const scenes = normalizeVisualSceneEntries([
    { source: "ai", image_prompt: "x" },
  ]);
  assert.equal(scenes.length, 1);
  assert.equal(scenes[0]?.type, DEFAULT_SCENE_TYPE);
});

check("stable scene ordering preserved", () => {
  const scenes = normalizeVisualSceneEntries([
    { source: "ai", image_prompt: "first" },
    { source: "ai", image_prompt: "second" },
  ]);
  assert.equal(scenes[0]?.payload.media.source, "ai");
  assert.equal(scenes[1]?.id, "scene-2");
});

check("non-IMAGE type parses for analyzer (not compile-only reject)", () => {
  const scene = normalizeVisualSceneEntry(
    {
      type: "CHECKLIST",
      payload: { items: ["a", "b"] },
    },
    0,
  );
  assert.ok(scene);
  assert.equal(scene?.type, "CHECKLIST");
});

check("renderSchema accepts legacy scene without type", () => {
  const parsed = renderSchema.safeParse({
    voiceover_text: "Hello",
    scenes: [
      {
        id: "scene-1",
        image_prompt: "test",
        duration_seconds: 4,
      },
    ],
  });
  assert.equal(parsed.success, true);
});

check("renderSchema accepts typed IMAGE scene", () => {
  const parsed = renderSchema.safeParse({
    voiceover_text: "Hello",
    scenes: [
      {
        id: "scene-1",
        type: "IMAGE",
        image_prompt: "test",
        duration_seconds: 4,
        payload_snapshot: { media: { source: "ai", image_prompt: "test" } },
        renderer_version: "image@1",
      },
    ],
  });
  assert.equal(parsed.success, true);
});

check("legacy render spec output still parses", () => {
  const parsed = renderSpecOutputSchema.safeParse({
    version: 1,
    scenes: [
      {
        id: "scene-1",
        image_prompt: "x",
        image_bucket: "b",
        image_path: "p.png",
        duration_seconds: 4,
      },
    ],
  });
  assert.equal(parsed.success, true);
});

check("typed IMAGE persisted scene parses", () => {
  const parsed = persistedSceneSchema.safeParse({
    id: "scene-1",
    type: "IMAGE",
    image_prompt: "x",
    image_bucket: "b",
    image_path: "p.png",
    duration_seconds: 4,
    renderer_version: "image@1",
    payload_snapshot: { media: { source: "ai", image_prompt: "x" } },
  });
  assert.equal(parsed.success, true);
});

check("registry resolves IMAGE renderer", () => {
  registerSceneRenderer(
    createImageSceneRenderer({
      prepareRaster: async (scene) => ({
        sceneId: scene.id,
        imagePath: "/tmp/x.png",
      }),
    }),
  );
  assert.ok(getRegisteredSceneRendererTypes().includes("IMAGE"));
  assert.equal(
    assertSceneRenderable({
      id: "scene-1",
      image_prompt: "x",
      duration_seconds: 4,
    }),
    "IMAGE",
  );
});

check("non-rendered typed scene cannot enter renderer", () => {
  const prev = process.env.SCENE_TYPES_ENABLED;
  process.env.SCENE_TYPES_ENABLED = "false";
  try {
    assert.equal(
      assertSceneRenderable(
        {
          id: "scene-1",
          type: "CTA",
          image_prompt: "x",
          duration_seconds: 4,
        },
        { projectId: "p", videoJobId: "j" },
      ),
      "IMAGE",
    );
  } finally {
    if (prev === undefined) delete process.env.SCENE_TYPES_ENABLED;
    else process.env.SCENE_TYPES_ENABLED = prev;
  }
});

check("CHECKLIST without rollout downgrades to IMAGE at worker", () => {
  assert.equal(
    assertSceneRenderable(
      {
        id: "scene-1",
        type: "CHECKLIST",
        image_prompt: "x",
        duration_seconds: 4,
      },
      { projectId: "11111111-1111-4111-8111-111111111111", videoJobId: "j" },
    ),
    "IMAGE",
  );
});

check("worker assert passes legacy IMAGE scenes", () => {
  assertWorkerScenesRenderable([
    { id: "scene-1", image_prompt: "a", duration_seconds: 3 },
  ]);
});

check("SCENE_TYPES_ENABLED defaults off", () => {
  assert.equal(isSceneTypesEnabled(), false);
});

check("sceneSchema strips unknown type at parse", () => {
  const parsed = sceneSchema.safeParse({
    id: "s1",
    type: "NOT_A_TYPE",
    image_prompt: "x",
    duration_seconds: 4,
  });
  assert.equal(parsed.success, false);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
