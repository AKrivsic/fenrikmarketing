// Smoke tests for the Video Scene Editor MVP helpers + guardrails.
//   npm run check:video-scene-editor

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  mergeSceneEditorDraft,
  readSceneEditorDraft,
} from "@/lib/video-scene-editor/metadata";
import { validateSceneImageUpload } from "@/lib/video-scene-editor/validateUpload";
import { resolveVideoWorkerEndpoint } from "@/lib/video-scene-editor/workerUrl";
import {
  runSceneEditorRerender,
  SceneEditorRerenderError,
} from "@/lib/video-scene-editor/sceneEditorRerender";
import {
  createMockSupabaseClient,
  type MockStore,
} from "@/lib/video-scene-editor/sceneEditorRerender.mock";
import type { VideoWorkerJobPayload } from "@/lib/video-worker/client";

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

function section(title: string): void {
  console.log(`\n${title}`);
}

section("readSceneEditorDraft");

check("round-trips scenes under generation_metadata", () => {
  const merged = mergeSceneEditorDraft(null, {
    source_video_job_id: "job-1",
    updated_at: "2026-01-01T00:00:00.000Z",
    scenes: [
      {
        id: "scene-1",
        image_prompt: "A desk",
        image_bucket: "video-renders",
        image_path: "p1/video/job-1/scene-1.png",
        duration_seconds: 3,
      },
    ],
  });
  const draft = readSceneEditorDraft(merged);
  assert.ok(draft);
  assert.equal(draft.scenes.length, 1);
  assert.equal(draft.source_video_job_id, "job-1");
});

section("validateSceneImageUpload");

check("rejects unsupported mime", () => {
  assert.equal(
    validateSceneImageUpload({ type: "image/webp", size: 100 }),
    "Povolené formáty: PNG nebo JPEG.",
  );
});

check("accepts png within size limit", () => {
  assert.equal(validateSceneImageUpload({ type: "image/png", size: 1024 }), null);
});

section("resolveVideoWorkerEndpoint");

check("appends path when VIDEO_WORKER_URL ends with /render", () => {
  const prev = process.env.VIDEO_WORKER_URL;
  process.env.VIDEO_WORKER_URL = "https://worker.example/render";
  try {
    assert.equal(
      resolveVideoWorkerEndpoint("/regenerate-scene-image"),
      "https://worker.example/regenerate-scene-image",
    );
  } finally {
    if (prev === undefined) delete process.env.VIDEO_WORKER_URL;
    else process.env.VIDEO_WORKER_URL = prev;
  }
});

section("Vercel must not run image gen / FFmpeg for scene editor");

function readRepo(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

check("scene editor workflow does not import getImageProvider", () => {
  const src = readRepo("lib/ai/workflows/videoSceneEditor.ts");
  assert.equal(src.includes("getImageProvider"), false);
  assert.equal(src.includes("ffmpeg"), false);
});

check("videos actions do not import image/ffmpeg modules", () => {
  const src = readRepo("app/projects/[id]/videos/actions.ts");
  assert.equal(src.includes("getImageProvider"), false);
  assert.equal(src.includes("ffmpeg"), false);
});

check("n8n handlers unchanged (no scene editor hooks)", () => {
  const src = readRepo("lib/n8n/handlers.ts");
  assert.equal(src.includes("scene_editor"), false);
  assert.equal(src.includes("video_scene_editor"), false);
});

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SOURCE_JOB_ID = "22222222-2222-2222-2222-222222222222";
const ITEM_ID = "33333333-3333-3333-3333-333333333333";
const PACKAGE_ID = "44444444-4444-4444-4444-444444444444";
const CALLBACK_URL = "https://app.example/api/n8n/video-callback";

function baselineScene() {
  return {
    id: "scene-1",
    image_prompt: "Original desk scene",
    image_bucket: "video-renders",
    image_path: `${PROJECT_ID}/video/${SOURCE_JOB_ID}/scene-1.png`,
    duration_seconds: 3,
  };
}

function buildStoreWithDraft(args?: {
  activeStatus?: "queued" | "processing";
}): MockStore {
  const baseline = baselineScene();
  const edited = {
    ...baseline,
    image_prompt: "Red desk scene",
    image_path: `${PROJECT_ID}/video/${SOURCE_JOB_ID}/scene-editor-scene-1.png`,
  };
  const draftMeta = mergeSceneEditorDraft(null, {
    source_video_job_id: SOURCE_JOB_ID,
    updated_at: "2026-06-01T00:00:00.000Z",
    scenes: [edited],
  });

  const store: MockStore = {
    videoJobs: [
      {
        id: SOURCE_JOB_ID,
        project_id: PROJECT_ID,
        content_item_id: ITEM_ID,
        provider: "video_engine",
        status: "completed",
        input: {
          voiceover_text: "Hello world",
          scenes: [baseline],
        },
        output: {
          mp4_url: "https://example/original.mp4",
          render_spec: { version: 1, scenes: [baseline] },
        },
      },
    ],
    contentItems: [
      {
        id: ITEM_ID,
        project_id: PROJECT_ID,
        package_id: PACKAGE_ID,
        generation_metadata: draftMeta,
      },
    ],
  };

  if (args?.activeStatus) {
    store.videoJobs.push({
      id: "55555555-5555-5555-5555-555555555555",
      project_id: PROJECT_ID,
      content_item_id: ITEM_ID,
      provider: "video_engine",
      status: args.activeStatus,
      input: {},
      output: null,
    });
  }

  return store;
}

section("runSceneEditorRerender (mocked, no real worker)");

await checkAsync(
  "uses draft scenes, inserts new job, dispatches with callback + edited scenes",
  async () => {
    const store = buildStoreWithDraft();
    const sourceBefore = structuredClone(store.videoJobs[0]);
    const workerCalls: VideoWorkerJobPayload[] = [];

    const summary = await runSceneEditorRerender(
      { projectId: PROJECT_ID, videoJobId: SOURCE_JOB_ID },
      {
        client: createMockSupabaseClient(store),
        videoCallbackUrl: CALLBACK_URL,
        startVideoJob: async (payload) => {
          workerCalls.push(payload);
        },
      },
    );

    assert.equal(summary.dispatched, true);
    assert.equal(store.videoJobs.length, 2);
    const sourceAfter = store.videoJobs.find((j) => j.id === SOURCE_JOB_ID);
    assert.ok(sourceAfter);
    assert.deepEqual(sourceAfter.output, sourceBefore.output);
    assert.equal(sourceAfter.status, "completed");

    const newJob = store.videoJobs.find((j) => j.id === summary.videoJobId);
    assert.ok(newJob);
    assert.equal(newJob.status, "processing");
    assert.equal(newJob.content_item_id, ITEM_ID);

    const input = newJob.input as Record<string, unknown>;
    assert.equal(input.scene_editor_rerender, true);
    assert.equal(input.scene_editor_source_video_job_id, SOURCE_JOB_ID);
    assert.equal(input.voiceover_text, "Hello world");

    const scenes = input.scenes as Record<string, unknown>[];
    assert.equal(scenes.length, 1);
    assert.equal(scenes[0].image_prompt, "Red desk scene");
    assert.equal(
      scenes[0].image_path,
      `${PROJECT_ID}/video/${SOURCE_JOB_ID}/scene-editor-scene-1.png`,
    );
    assert.equal(scenes[0].image_bucket, "video-renders");

    assert.equal(workerCalls.length, 1);
    assert.equal(workerCalls[0].callback_url, CALLBACK_URL);
    assert.equal(workerCalls[0].video_job_id, summary.videoJobId);
    assert.equal(workerCalls[0].content_package_id, PACKAGE_ID);
    assert.equal(workerCalls[0].content_item_id, ITEM_ID);
    const workerScenes = workerCalls[0].input.scenes as Record<string, unknown>[];
    assert.equal(workerScenes[0].image_prompt, "Red desk scene");
  },
);

await checkAsync("active guard blocks when queued/processing job exists", async () => {
  const store = buildStoreWithDraft({ activeStatus: "processing" });
  await assert.rejects(
    () =>
      runSceneEditorRerender(
        { projectId: PROJECT_ID, videoJobId: SOURCE_JOB_ID },
        {
          client: createMockSupabaseClient(store),
          videoCallbackUrl: CALLBACK_URL,
          startVideoJob: async () => {},
        },
      ),
    (err: unknown) => {
      assert.ok(err instanceof SceneEditorRerenderError);
      assert.match(err.message, /already queued or processing/);
      return true;
    },
  );
  assert.equal(store.videoJobs.length, 2);
});

await checkAsync("fails when source job is not completed", async () => {
  const store = buildStoreWithDraft();
  store.videoJobs[0].status = "failed";
  await assert.rejects(
    () =>
      runSceneEditorRerender(
        { projectId: PROJECT_ID, videoJobId: SOURCE_JOB_ID },
        { client: createMockSupabaseClient(store) },
      ),
    (err: unknown) => {
      assert.ok(err instanceof SceneEditorRerenderError);
      assert.match(err.message, /completed source video/);
      return true;
    },
  );
});

await checkAsync("fails when render_spec scenes are missing", async () => {
  const store = buildStoreWithDraft();
  store.videoJobs[0].output = { mp4_url: "https://example/original.mp4" };
  store.contentItems[0].generation_metadata = {};
  await assert.rejects(
    () =>
      runSceneEditorRerender(
        { projectId: PROJECT_ID, videoJobId: SOURCE_JOB_ID },
        { client: createMockSupabaseClient(store) },
      ),
    (err: unknown) => {
      assert.ok(err instanceof SceneEditorRerenderError);
      assert.match(err.message, /no reusable render_spec scenes/);
      return true;
    },
  );
});

await checkAsync("fails when draft matches baseline (no changes)", async () => {
  const store = buildStoreWithDraft();
  const baseline = baselineScene();
  store.contentItems[0].generation_metadata = mergeSceneEditorDraft(null, {
    source_video_job_id: SOURCE_JOB_ID,
    updated_at: "2026-06-01T00:00:00.000Z",
    scenes: [baseline],
  });
  await assert.rejects(
    () =>
      runSceneEditorRerender(
        { projectId: PROJECT_ID, videoJobId: SOURCE_JOB_ID },
        { client: createMockSupabaseClient(store) },
      ),
    (err: unknown) => {
      assert.ok(err instanceof SceneEditorRerenderError);
      assert.match(err.message, /no scene changes/);
      return true;
    },
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
