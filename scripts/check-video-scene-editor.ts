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
import { buildSceneEditorDraft } from "@/lib/video-scene-editor/draftEnvelope";
import {
  appendSceneImageVersion,
  findSceneImageVersion,
  originalSceneImageVersion,
  sceneVersionFromDraftScene,
  seedOriginalScenes,
  seedSceneImageHistory,
} from "@/lib/video-scene-editor/imageHistory";
import { groupProjectVideoJobs } from "@/lib/video-scene-editor/videoJobGrouping";
import type { ProjectVideoEntry } from "@/lib/api/project-content-admin";
import {
  runSceneEditorRerender,
  SceneEditorRerenderError,
} from "@/lib/video-scene-editor/sceneEditorRerender";
import {
  createMockSupabaseClient,
  type MockStore,
} from "@/lib/video-scene-editor/sceneEditorRerender.mock";
import { saveEditorVoiceoverText } from "@/lib/video-scene-editor/saveEditorVoiceover";
import { applySceneImageWorkerResult } from "@/lib/video-scene-editor/applySceneImageWorkerResult";
import {
  editImageWithProvider,
  ImageEditMultiImageNotSupportedError,
  ImageEditNotSupportedError,
  providerSupportsMultiImageEdit,
} from "@/lib/ai/imageEdit";
import type { ImageProvider } from "@/lib/ai/types";
import { validateBrandAssetUpload } from "@/lib/video-scene-editor/validateBrandAssetUpload";
import {
  mergeBrandAssetInsertInstruction,
  resolveBrandAssetInsertInstructionOrDefault,
} from "@/lib/video-scene-editor/brandAssetInstruction";
import { DEFAULT_BRAND_ASSET_INSERT_INSTRUCTION } from "@/lib/video-scene-editor/constants";
import {
  sceneVersionFromBrandAssetEdit,
} from "@/lib/video-scene-editor/imageHistory";
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
  const baseline = {
    id: "scene-1",
    image_prompt: "A desk",
    image_bucket: "video-renders",
    image_path: "p1/video/job-1/scene-1.png",
    duration_seconds: 3,
  };
  const merged = mergeSceneEditorDraft(null, {
    source_video_job_id: "job-1",
    updated_at: "2026-01-01T00:00:00.000Z",
    scenes: [baseline],
    original_scenes: seedOriginalScenes([baseline]),
    image_versions: seedSceneImageHistory([baseline]),
  });
  const draft = readSceneEditorDraft(merged);
  assert.ok(draft);
  assert.equal(draft.scenes.length, 1);
  assert.equal(draft.source_video_job_id, "job-1");
});

check("round-trips voiceover_text in generation_metadata", () => {
  const baseline = {
    id: "scene-1",
    image_prompt: "A desk",
    image_bucket: "video-renders",
    image_path: "p1/video/job-1/scene-1.png",
    duration_seconds: 3,
  };
  const merged = mergeSceneEditorDraft(null, {
    source_video_job_id: "job-1",
    updated_at: "2026-01-01T00:00:00.000Z",
    scenes: [baseline],
    original_scenes: seedOriginalScenes([baseline]),
    image_versions: seedSceneImageHistory([baseline]),
    voiceover_text: "Updated narration",
    original_voiceover_text: "Original narration",
  });
  const draft = readSceneEditorDraft(merged);
  assert.ok(draft);
  assert.equal(draft.voiceover_text, "Updated narration");
  assert.equal(draft.original_voiceover_text, "Original narration");
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

section("imageHistory");

check("keeps permanent original version", () => {
  const scene = {
    id: "scene-1",
    image_prompt: "Desk",
    image_bucket: "b",
    image_path: "p",
    duration_seconds: 3,
  };
  const history = seedSceneImageHistory([scene]);
  const original = originalSceneImageVersion(history, "scene-1");
  assert.ok(original?.is_original);
  const next = appendSceneImageVersion(
    history,
    "scene-1",
    sceneVersionFromDraftScene(
      { ...scene, image_path: "p2" },
      "upload",
    ),
  );
  assert.ok(originalSceneImageVersion(next, "scene-1")?.is_original);
  assert.equal(next["scene-1"]?.length, 2);
});

check("upload + regenerate + restore appends versions without dropping history", () => {
  const baseline = {
    id: "scene-1",
    image_prompt: "Original desk",
    image_bucket: "b",
    image_path: "original.png",
    duration_seconds: 3,
  };
  const originals = seedOriginalScenes([baseline]);
  let history = seedSceneImageHistory([baseline]);
  const originalVersionId = originalSceneImageVersion(history, "scene-1")!.version_id;

  history = appendSceneImageVersion(
    history,
    "scene-1",
    sceneVersionFromDraftScene(
      { ...baseline, image_path: "upload.png" },
      "upload",
    ),
  );
  history = appendSceneImageVersion(
    history,
    "scene-1",
    sceneVersionFromDraftScene(
      { ...baseline, image_path: "regen.png", image_prompt: "Red desk" },
      "regenerate",
    ),
  );

  const originalEntry = findSceneImageVersion(history, "scene-1", originalVersionId);
  assert.ok(originalEntry?.is_original);
  assert.equal(history["scene-1"]?.length, 3);

  const restoredScene = {
    ...baseline,
    image_bucket: originalEntry!.image_bucket,
    image_path: originalEntry!.image_path,
    image_prompt: originalEntry!.image_prompt,
  };
  history = appendSceneImageVersion(
    history,
    "scene-1",
    sceneVersionFromDraftScene(restoredScene, "restore"),
  );
  assert.equal(history["scene-1"]?.length, 4);
  assert.equal(originalSceneImageVersion(history, "scene-1")?.image_path, "original.png");

  const envelope = buildSceneEditorDraft({
    sourceVideoJobId: "job-1",
    scenes: [restoredScene],
    existing: {
      source_video_job_id: "job-1",
      updated_at: "2026-01-01T00:00:00.000Z",
      scenes: [restoredScene],
      original_scenes: originals,
      image_versions: history,
    },
    baselineScenes: [baseline],
  });
  assert.deepEqual(envelope.original_scenes["scene-1"], originals["scene-1"]);
  assert.equal(envelope.scenes[0]?.image_path, "original.png");
});

function makeVideoEntry(
  overrides: Partial<ProjectVideoEntry> & Pick<ProjectVideoEntry, "id" | "contentItemId" | "createdAt">,
): ProjectVideoEntry {
  return {
    status: "completed",
    provider: "video_engine",
    model: null,
    errorMessage: null,
    errorDetail: null,
    updatedAt: overrides.createdAt,
    completedAt: overrides.createdAt,
    itemTitle: "T",
    platform: "tiktok",
    format: "reel",
    videoUrl: null,
    thumbnailUrl: null,
    subtitleUrl: null,
    hasMp4: false,
    hasSubtitle: false,
    hasThumbnail: false,
    canEditScenes: false,
    isEditorRerender: false,
    ...overrides,
  };
}

check("three jobs for one content item -> one group with three sorted versions", () => {
  const itemId = "item-shared";
  const jobs = [
    makeVideoEntry({
      id: "job-v3",
      contentItemId: itemId,
      createdAt: "2026-06-03T00:00:00.000Z",
      isEditorRerender: true,
    }),
    makeVideoEntry({
      id: "job-v2",
      contentItemId: itemId,
      createdAt: "2026-06-02T00:00:00.000Z",
      hasMp4: true,
      videoUrl: "https://example/v2.mp4",
    }),
    makeVideoEntry({
      id: "job-v1",
      contentItemId: itemId,
      createdAt: "2026-06-01T00:00:00.000Z",
      canEditScenes: true,
      hasMp4: true,
      videoUrl: "https://example/v1.mp4",
    }),
  ];
  const groups = groupProjectVideoJobs(jobs);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.versions.length, 3);
  assert.equal(groups[0]?.versions[0]?.versionLabel, "v3 · editor");
  assert.equal(groups[0]?.versions[2]?.versionLabel, "v1 · render");
  assert.equal(groups[0]?.editorSourceJobId, "job-v1");
});

check("two content items -> two groups", () => {
  const groups = groupProjectVideoJobs([
    makeVideoEntry({
      id: "job-a",
      contentItemId: "item-a",
      createdAt: "2026-06-01T00:00:00.000Z",
    }),
    makeVideoEntry({
      id: "job-b",
      contentItemId: "item-b",
      createdAt: "2026-06-01T00:00:00.000Z",
    }),
  ]);
  assert.equal(groups.length, 2);
});

section("groupProjectVideoJobs");

check("groups jobs by content_item_id into one card", () => {
  const itemId = "item-a";
  const jobs = [
    {
      id: "job-new",
      status: "completed",
      provider: "video_engine",
      model: null,
      errorMessage: null,
      errorDetail: null,
      createdAt: "2026-06-02T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z",
      completedAt: "2026-06-02T00:00:00.000Z",
      contentItemId: itemId,
      itemTitle: "T",
      platform: "tiktok",
      format: "reel",
      videoUrl: null,
      thumbnailUrl: null,
      subtitleUrl: null,
      hasMp4: false,
      hasSubtitle: false,
      hasThumbnail: false,
      canEditScenes: false,
      isEditorRerender: true,
    },
    {
      id: "job-old",
      status: "completed",
      provider: "video_engine",
      model: null,
      errorMessage: null,
      errorDetail: null,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
      completedAt: "2026-06-01T00:00:00.000Z",
      contentItemId: itemId,
      itemTitle: "T",
      platform: "tiktok",
      format: "reel",
      videoUrl: "https://example/v.mp4",
      thumbnailUrl: null,
      subtitleUrl: null,
      hasMp4: true,
      hasSubtitle: false,
      hasThumbnail: false,
      canEditScenes: true,
      isEditorRerender: false,
    },
  ] satisfies ProjectVideoEntry[];
  const groups = groupProjectVideoJobs(jobs);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.versions.length, 2);
  assert.equal(groups[0]?.displayJobId, "job-new");
});

section("image edit / inpainting");

function readRepo(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

await checkAsync("editImageWithProvider throws when provider lacks editImage", async () => {
  const provider: ImageProvider = {
    name: "openai",
    generateImage: async () => ({
      provider: "openai",
      model: "mock",
      imageBase64: "aGk=",
    }),
  };
  await assert.rejects(
    () =>
      editImageWithProvider(provider, {
        sourceImageBytes: Buffer.from("x"),
        instruction: "make red",
      }),
    (err: unknown) => {
      assert.ok(err instanceof ImageEditNotSupportedError);
      return true;
    },
  );
});

await checkAsync("editImageWithProvider delegates to provider.editImage", async () => {
  let called = false;
  const provider: ImageProvider = {
    name: "openai",
    generateImage: async () => ({
      provider: "openai",
      model: "mock",
      imageBase64: "aGk=",
    }),
    editImage: async (req) => {
      called = true;
      assert.equal(req.instruction, "add logo");
      return { provider: "openai", model: "mock", imageBase64: "aGk=" };
    },
  };
  await editImageWithProvider(provider, {
    sourceImageBytes: Buffer.from("png"),
    instruction: "add logo",
  });
  assert.equal(called, true);
});

check("image_edit appends version and updates current scene pointer", () => {
  const baseline = {
    id: "scene-1",
    image_prompt: "Desk",
    image_bucket: "b",
    image_path: "original.png",
    duration_seconds: 3,
  };
  const history = seedSceneImageHistory([baseline]);
  const originalPath = originalSceneImageVersion(history, "scene-1")!.image_path;

  const applied = applySceneImageWorkerResult({
    scenes: [baseline],
    sceneId: "scene-1",
    image_bucket: "b",
    image_path: "edited.png",
    source: "image_edit",
    imageVersions: history,
  });

  assert.equal(applied.scenes[0]?.image_path, "edited.png");
  assert.equal(applied.imageVersions["scene-1"]?.length, 2);
  assert.equal(
    originalSceneImageVersion(applied.imageVersions, "scene-1")?.image_path,
    originalPath,
  );
  assert.equal(applied.imageVersions["scene-1"]?.[1]?.source, "image_edit");
});

check("restore after image_edit keeps history and can revert pointer", () => {
  const baseline = {
    id: "scene-1",
    image_prompt: "Desk",
    image_bucket: "b",
    image_path: "original.png",
    duration_seconds: 3,
  };
  let history = seedSceneImageHistory([baseline]);
  const originalVersion = originalSceneImageVersion(history, "scene-1")!;

  const edited = applySceneImageWorkerResult({
    scenes: [baseline],
    sceneId: "scene-1",
    image_bucket: "b",
    image_path: "edited.png",
    source: "image_edit",
    imageVersions: history,
  });

  const restoredScene = {
    ...baseline,
    image_bucket: originalVersion.image_bucket,
    image_path: originalVersion.image_path,
    image_prompt: originalVersion.image_prompt,
  };
  history = appendSceneImageVersion(
    edited.imageVersions,
    "scene-1",
    sceneVersionFromDraftScene(restoredScene, "restore"),
  );

  assert.equal(history["scene-1"]?.length, 3);
  assert.equal(originalSceneImageVersion(history, "scene-1")?.image_path, "original.png");
});

check("OpenAI image provider implements editImage", () => {
  const src = readRepo("lib/ai/openai.ts");
  assert.match(src, /async editImage\(/);
  assert.match(src, /IMAGE_EDIT_URL/);
  assert.match(src, /image\[\]/);
  assert.equal(
    (src.match(/form\.append\(\s*["']image["']/g) ?? []).length,
    0,
    "must not append duplicate bare image fields for multi-image edit",
  );
});

check("worker exposes POST /edit-scene-image", () => {
  const src = readRepo("video-worker/server.ts");
  assert.match(src, /\/edit-scene-image/);
  assert.match(src, /editSceneImage\(/);
});

check("regenerate path still uses generateImage only", () => {
  const src = readRepo("video-worker/services/regenerateSceneImage.ts");
  assert.match(src, /generateImage\(/);
  assert.equal(src.includes("editImage"), false);
});

check("edit path uses editImageWithProvider and storage download", () => {
  const src = readRepo("video-worker/services/editSceneImage.ts");
  assert.match(src, /editImageWithProvider/);
  assert.match(src, /downloadStorageObjectToFile/);
  assert.equal(src.includes("generateImage"), false);
});

check("Vercel scene editor calls edit worker client, not OpenAI directly", () => {
  const workflow = readRepo("lib/ai/workflows/videoSceneEditor.ts");
  assert.match(workflow, /editSceneImageViaWorker/);
  assert.equal(workflow.includes("getImageProvider"), false);
  assert.equal(workflow.includes("editImageWithProvider"), false);
});

check("validateBrandAssetUpload accepts png within 5MB", () => {
  assert.equal(validateBrandAssetUpload({ type: "image/png", size: 1024 }), null);
});

check("validateBrandAssetUpload rejects svg", () => {
  assert.match(
    validateBrandAssetUpload({ type: "image/svg+xml", size: 100 }) ?? "",
    /SVG/,
  );
});

check("validateBrandAssetUpload rejects over 5MB", () => {
  assert.match(
    validateBrandAssetUpload({ type: "image/png", size: 6 * 1024 * 1024 }) ?? "",
    /5 MB/,
  );
});

await checkAsync("multi-image edit throws when provider lacks supportsMultiImageEdit", async () => {
  const provider: ImageProvider = {
    name: "openai",
    generateImage: async () => ({
      provider: "openai",
      model: "mock",
      imageBase64: "aGk=",
    }),
    editImage: async () => ({
      provider: "openai",
      model: "mock",
      imageBase64: "aGk=",
    }),
  };
  await assert.rejects(
    () =>
      editImageWithProvider(provider, {
        sourceImageBytes: Buffer.from("scene"),
        instruction: "place logo",
        additionalImages: [
          { imageBytes: Buffer.from("logo"), mimeType: "image/png", role: "logo" },
        ],
      }),
    (err: unknown) => {
      assert.ok(err instanceof ImageEditMultiImageNotSupportedError);
      return true;
    },
  );
});

await checkAsync("multi-image edit passes scene + reference bytes to editImage", async () => {
  let captured: { sceneLen: number; refs: number } | null = null;
  const provider: ImageProvider = {
    name: "openai",
    supportsMultiImageEdit: true,
    generateImage: async () => ({
      provider: "openai",
      model: "mock",
      imageBase64: "aGk=",
    }),
    editImage: async (req) => {
      captured = {
        sceneLen: req.sourceImageBytes.length,
        refs: req.additionalImages?.length ?? 0,
      };
      return { provider: "openai", model: "mock", imageBase64: "aGk=" };
    },
  };
  assert.equal(providerSupportsMultiImageEdit(provider), true);
  await editImageWithProvider(provider, {
    sourceImageBytes: Buffer.from("scene-bytes"),
    instruction: "Place logo on screen",
    additionalImages: [
      { imageBytes: Buffer.from("logo-bytes"), mimeType: "image/png", role: "logo" },
    ],
  });
  assert.deepEqual(captured, { sceneLen: 11, refs: 1 });
});

check("brand_asset_edit version stores reference asset metadata", () => {
  const scene = {
    id: "scene-1",
    image_prompt: "Desk",
    image_bucket: "video-renders",
    image_path: "out.png",
    duration_seconds: 3,
  };
  const version = sceneVersionFromBrandAssetEdit({
    scene,
    instruction: "Place logo",
    reference_asset_bucket: "project-assets",
    reference_asset_path: "p/logo.png",
    edit_provider: "openai",
    edit_model: "gpt-image-1",
  });
  assert.equal(version.source, "brand_asset_edit");
  assert.equal(version.reference_asset_path, "p/logo.png");
  assert.equal(version.instruction, "Place logo");
});

check("brand_asset_edit append keeps original intact", () => {
  const baseline = {
    id: "scene-1",
    image_prompt: "Desk",
    image_bucket: "b",
    image_path: "original.png",
    duration_seconds: 3,
  };
  const history = seedSceneImageHistory([baseline]);
  const applied = applySceneImageWorkerResult({
    scenes: [baseline],
    sceneId: "scene-1",
    image_bucket: "b",
    image_path: "branded.png",
    source: "brand_asset_edit",
    imageVersions: history,
    version: sceneVersionFromBrandAssetEdit({
      scene: { ...baseline, image_path: "branded.png" },
      instruction: "Place logo",
      reference_asset_bucket: "project-assets",
      reference_asset_path: "p/logo.png",
    }),
  });
  assert.equal(applied.scenes[0]?.image_path, "branded.png");
  assert.equal(originalSceneImageVersion(applied.imageVersions, "scene-1")?.image_path, "original.png");
});

check("restore after brand_asset_edit preserves history length", () => {
  const baseline = {
    id: "scene-1",
    image_prompt: "Desk",
    image_bucket: "b",
    image_path: "original.png",
    duration_seconds: 3,
  };
  let history = seedSceneImageHistory([baseline]);
  const original = originalSceneImageVersion(history, "scene-1")!;
  const applied = applySceneImageWorkerResult({
    scenes: [baseline],
    sceneId: "scene-1",
    image_bucket: "b",
    image_path: "branded.png",
    source: "brand_asset_edit",
    imageVersions: history,
    version: sceneVersionFromBrandAssetEdit({
      scene: { ...baseline, image_path: "branded.png" },
      instruction: "x",
      reference_asset_bucket: "project-assets",
      reference_asset_path: "p/logo.png",
    }),
  });
  history = appendSceneImageVersion(
    applied.imageVersions,
    "scene-1",
    sceneVersionFromDraftScene(
      { ...baseline, image_path: original.image_path },
      "restore",
    ),
  );
  assert.equal(history["scene-1"]?.length, 3);
});

check("worker exposes POST /insert-scene-asset", () => {
  const src = readRepo("video-worker/server.ts");
  assert.match(src, /\/insert-scene-asset/);
  assert.match(src, /insertSceneBrandAsset\(/);
});

check("brand asset worker uses multi-image editImageWithProvider", () => {
  const src = readRepo("video-worker/services/insertSceneBrandAsset.ts");
  assert.match(src, /additionalImages/);
  assert.match(src, /downloadStorageObjectToFile/);
  assert.equal(src.includes("generateImage"), false);
  assert.equal(src.includes("sanitizeImagePrompt"), false);
  assert.match(src, /normalizeBrandAssetInsertInstruction/);
});

check("brand asset insert instruction resolves from draft metadata", () => {
  const merged = mergeBrandAssetInsertInstruction(
    undefined,
    "scene-1",
    "Place logo on the coffee mug",
  );
  assert.equal(merged["scene-1"], "Place logo on the coffee mug");
  const draft = {
    source_video_job_id: "job-1",
    scenes: [],
    updated_at: "2026-01-01T00:00:00.000Z",
    original_scenes: {},
    image_versions: {},
    brand_asset_insert_instructions: merged,
  };
  assert.equal(
    resolveBrandAssetInsertInstructionOrDefault(draft, "scene-1"),
    "Place logo on the coffee mug",
  );
  assert.equal(
    resolveBrandAssetInsertInstructionOrDefault(null, "scene-1"),
    DEFAULT_BRAND_ASSET_INSERT_INSTRUCTION,
  );
});

check("scene card restores brand asset instruction from server state", () => {
  const src = readRepo("components/projects/VideoSceneEditor/VideoSceneCard.tsx");
  assert.match(src, /scene\.brandAssetInsertInstruction/);
  assert.match(src, /setBrandAssetInstruction/);
});

check("single-image edit worker path unchanged", () => {
  const src = readRepo("video-worker/services/editSceneImage.ts");
  assert.match(src, /editImageWithProvider/);
  assert.equal(src.includes("additionalImages"), false);
});

check("Vercel workflow uses insertSceneBrandAssetViaWorker", () => {
  const workflow = readRepo("lib/ai/workflows/videoSceneEditor.ts");
  assert.match(workflow, /insertSceneBrandAssetViaWorker/);
  assert.match(workflow, /insertBrandAssetInEditor/);
  assert.equal(workflow.includes("getImageProvider"), false);
});

check("OpenAI provider declares supportsMultiImageEdit and extra image form parts", () => {
  const src = readRepo("lib/ai/openai.ts");
  assert.match(src, /supportsMultiImageEdit/);
  assert.match(src, /additionalImages/);
});

section("Vercel must not run image gen / FFmpeg for scene editor");

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

check("ProjectVideoList polls only while queued/processing render in flight", () => {
  const src = readRepo("components/projects/ProjectVideoList/ProjectVideoList.tsx");
  assert.match(src, /activeRenderInFlight \|\| editorRenderActive/);
  assert.match(src, /if \(!rendering\) return/);
  assert.doesNotMatch(
    src,
    /setInterval\([^)]*refresh[^)]*\)[\s\S]*completed/,
  );
});

check("VideoSceneEditor polls only while activeRenderInFlight", () => {
  const src = readRepo("components/projects/VideoSceneEditor/VideoSceneEditor.tsx");
  assert.match(src, /if \(!state\?\.activeRenderInFlight\) return/);
  assert.match(src, /onRenderActivityChange\?\.\(result\.data\.activeRenderInFlight\)/);
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
    original_scenes: seedOriginalScenes([baseline]),
    image_versions: seedSceneImageHistory([baseline]),
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
    assert.deepEqual(sourceAfter.input, sourceBefore.input);
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

await checkAsync(
  "voiceover-only draft change sets new job input.voiceover_text",
  async () => {
    const store = buildStoreWithDraft();
    const baseline = baselineScene();
    store.contentItems[0].generation_metadata = mergeSceneEditorDraft(null, {
      source_video_job_id: SOURCE_JOB_ID,
      updated_at: "2026-06-01T00:00:00.000Z",
      scenes: [baseline],
      original_scenes: seedOriginalScenes([baseline]),
      image_versions: seedSceneImageHistory([baseline]),
      voiceover_text: "Revised voiceover for TTS",
      original_voiceover_text: "Hello world",
    });

    const sourceBefore = structuredClone(store.videoJobs[0]);
    const summary = await runSceneEditorRerender(
      { projectId: PROJECT_ID, videoJobId: SOURCE_JOB_ID },
      {
        client: createMockSupabaseClient(store),
        videoCallbackUrl: CALLBACK_URL,
        startVideoJob: async () => {},
      },
    );

    const newJob = store.videoJobs.find((j) => j.id === summary.videoJobId);
    assert.ok(newJob);
    const input = newJob.input as Record<string, unknown>;
    assert.equal(input.voiceover_text, "Revised voiceover for TTS");

    const sourceAfter = store.videoJobs.find((j) => j.id === SOURCE_JOB_ID);
    assert.deepEqual(sourceAfter?.input, sourceBefore.input);
    assert.deepEqual(sourceAfter?.output, sourceBefore.output);
  },
);

await checkAsync("saveEditorVoiceoverText persists draft voiceover_text", async () => {
  const store = buildStoreWithDraft();
  const baseline = baselineScene();
  store.contentItems[0].generation_metadata = mergeSceneEditorDraft(null, {
    source_video_job_id: SOURCE_JOB_ID,
    updated_at: "2026-06-01T00:00:00.000Z",
    scenes: [baseline],
    original_scenes: seedOriginalScenes([baseline]),
    image_versions: seedSceneImageHistory([baseline]),
  });
  const job = store.videoJobs[0]!;

  const merged = await saveEditorVoiceoverText({
    supabase: createMockSupabaseClient(store),
    projectId: PROJECT_ID,
    contentItemId: ITEM_ID,
    sourceVideoJobId: SOURCE_JOB_ID,
    generationMetadata: store.contentItems[0].generation_metadata,
    jobInput: job.input,
    jobOutput: job.output,
    voiceoverText: "Saved narration",
  });
  store.contentItems[0].generation_metadata = merged;

  const draft = readSceneEditorDraft(store.contentItems[0].generation_metadata);
  assert.equal(draft?.voiceover_text, "Saved narration");
  assert.equal(draft?.original_voiceover_text, "Hello world");
});

await checkAsync(
  "prompt-only draft change updates job input scenes but keeps voiceover_text",
  async () => {
    const store = buildStoreWithDraft();
    const baseline = baselineScene();
    store.contentItems[0].generation_metadata = mergeSceneEditorDraft(null, {
      source_video_job_id: SOURCE_JOB_ID,
      updated_at: "2026-06-01T00:00:00.000Z",
      scenes: [{ ...baseline, image_prompt: "Only prompt changed" }],
      original_scenes: seedOriginalScenes([baseline]),
      image_versions: seedSceneImageHistory([baseline]),
    });

    const summary = await runSceneEditorRerender(
      { projectId: PROJECT_ID, videoJobId: SOURCE_JOB_ID },
      {
        client: createMockSupabaseClient(store),
        videoCallbackUrl: CALLBACK_URL,
        startVideoJob: async () => {},
      },
    );

    const newJob = store.videoJobs.find((j) => j.id === summary.videoJobId);
    assert.ok(newJob);
    const input = newJob.input as Record<string, unknown>;
    assert.equal(input.voiceover_text, "Hello world");
    const scenes = input.scenes as Record<string, unknown>[];
    assert.equal(scenes[0]?.image_prompt, "Only prompt changed");
    assert.equal(scenes[0]?.image_path, baseline.image_path);
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
    original_scenes: seedOriginalScenes([baseline]),
    image_versions: seedSceneImageHistory([baseline]),
  });
  await assert.rejects(
    () =>
      runSceneEditorRerender(
        { projectId: PROJECT_ID, videoJobId: SOURCE_JOB_ID },
        { client: createMockSupabaseClient(store) },
      ),
    (err: unknown) => {
      assert.ok(err instanceof SceneEditorRerenderError);
      assert.match(err.message, /no changes/);
      return true;
    },
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
