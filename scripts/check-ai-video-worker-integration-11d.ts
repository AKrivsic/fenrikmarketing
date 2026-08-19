/**
 * Step 11D — staging bucket, exact manifest match, early fingerprint, strict final.
 * npm run check:ai-video-worker-integration-11d
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  computeAiVideoJobInputFingerprint,
  planDefaultsFromPlan,
} from "@/lib/video-worker/aiVideoCheckpointFingerprint";
import {
  buildAiVideoCheckpointOutput,
  buildAiVideoFinalDurableOutput,
  resolveAlreadyCompletedAiVideoJob,
} from "@/lib/video-worker/aiVideoJobOutput";
import {
  expectedFinalArtifactRefs,
  buildAiVideoStagingStoragePath,
} from "@/lib/video-worker/aiVideoStaging";
import {
  AiVideoCheckpointValidationError,
  assertJobInputFingerprintForResume,
  validateAssemblyCompleteCheckpoint,
} from "@/lib/video-worker/aiVideoCheckpointValidation";
import { VIDEO_RENDER_MODE_AI_VIDEO_CLIPS } from "@/lib/video-engine/schemas/videoJobRenderMode";
import {
  AiVideoClipJobError,
  runAiVideoClipJobPhase,
} from "@/video-worker/aiVideoClipJobPhase";
import { finalizeAiVideoClipJob } from "@/video-worker/finalizeAiVideoClipJob";
import {
  promoteStorageRefIdempotent,
  type AiVideoArtifactStorageDeps,
} from "@/video-worker/aiVideoArtifactStorage";
import { buildVideoRenderPath } from "@/lib/api/storage";
import type { RenderSpecOutput } from "@/lib/video-engine/schemas/renderSchema";
import type { WorkerPayload } from "@/lib/video-engine/schemas/workerPayloadSchema";
import {
  applyExecutorClipResults,
  sha256HexFile,
  type ClipReadyRenderManifest,
} from "@/lib/video-reel-assembly";
import { buildSceneVideoGenerationPlanFromRenderScenes } from "@/lib/scene-video-plan";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}`);
    console.error(
      `       ${err instanceof Error ? err.message : String(err)}`.replace(
        /\n/g,
        "\n       ",
      ),
    );
  }
}

const PROJECT = "11111111-1111-4111-8111-111111111111";
const JOB = "33333333-3333-4333-8333-333333333333";
const OTHER_JOB = "99999999-9999-4999-8999-999999999999";
const ATTEMPT_A = "aaaaaaaa-aaaa-4aaa-8aaa-111111111111";
const ATTEMPT_B = "bbbbbbbb-bbbb-4bbb-8bbb-222222222222";
const noopActive = async () => undefined;

function baseSpec() {
  return {
    voiceover_text: "Step 11D voiceover.",
    scenes: [
      {
        id: "scene-a",
        image_prompt: "A",
        duration_seconds: 3,
        motion_prompt: "M A",
        transition_in: "fade" as const,
      },
      {
        id: "scene-b",
        image_prompt: "B",
        duration_seconds: 4,
        motion_prompt: "M B",
        transition_in: "slide" as const,
      },
    ],
  };
}

function persistedSpec(): RenderSpecOutput {
  return {
    version: 1,
    scenes: [
      {
        id: "scene-a",
        image_prompt: "A",
        image_bucket: "video-renders",
        image_path: `${PROJECT}/video/${JOB}/scene-a.png`,
        duration_seconds: 3,
        motion_prompt: "M A",
        transition_in: "fade",
      },
      {
        id: "scene-b",
        image_prompt: "B",
        image_bucket: "video-renders",
        image_path: `${PROJECT}/video/${JOB}/scene-b.png`,
        duration_seconds: 4,
        motion_prompt: "M B",
        transition_in: "slide",
      },
    ],
  };
}

function fp(spec = baseSpec()) {
  const plan = buildSceneVideoGenerationPlanFromRenderScenes(persistedSpec().scenes);
  return computeAiVideoJobInputFingerprint({
    videoJobId: JOB,
    renderMode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
    voiceoverText: spec.voiceover_text,
    subtitlesBurnInRequested: false,
    spec,
    planDefaults: planDefaultsFromPlan(plan),
  });
}

function basePayload(): WorkerPayload {
  return {
    video_job_id: JOB,
    project_id: PROJECT,
    content_package_id: "22222222-2222-4222-8222-222222222222",
    content_item_id: "44444444-4444-4444-8444-444444444444",
    callback_url: "http://localhost/callback",
    input: {
      ...baseSpec(),
      video_render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
      ai_scene_video_max_budget_usd: 2,
      ai_scene_video_confirm_paid_run: true,
    },
  };
}

function specFromManifest(manifest: ClipReadyRenderManifest): RenderSpecOutput {
  return {
    version: manifest.version,
    scenes: manifest.scenes,
    duration_seconds: manifest.duration_seconds,
    subtitle_timing: manifest.subtitle_timing,
    metadata: manifest.metadata,
  };
}

function stagingPaths() {
  return {
    mp4: buildAiVideoStagingStoragePath(PROJECT, JOB, "output.mp4"),
    thumbnail: buildAiVideoStagingStoragePath(PROJECT, JOB, "thumbnail.png"),
    subtitles: buildAiVideoStagingStoragePath(PROJECT, JOB, "subtitles.srt"),
  };
}

function assemblyCheckpoint(args: {
  manifest: ClipReadyRenderManifest;
  renderSpec?: RenderSpecOutput;
  staging?: {
    mp4: { bucket: string; path: string };
    thumbnail: { bucket: string; path: string };
    subtitles?: { bucket: string; path: string };
  };
}) {
  const paths = stagingPaths();
  return buildAiVideoCheckpointOutput({
    renderSpec: args.renderSpec ?? specFromManifest(args.manifest),
    phase: "assembly_complete",
    meta: {
      input_fingerprint: fp(),
      input_fingerprint_version: 1,
      clip_ready_manifest: args.manifest,
      staging: args.staging ?? {
        mp4: { bucket: "video-renders", path: paths.mp4 },
        thumbnail: { bucket: "video-renders", path: paths.thumbnail },
      },
    },
  });
}

async function buildManifest(voPath: string): Promise<ClipReadyRenderManifest> {
  const voiceoverSha256 = await sha256HexFile(voPath);
  const applied = applyExecutorClipResults({
    renderSpec: persistedSpec(),
    executorResult: {
      status: "completed",
      sceneCount: 2,
      reusedCount: 2,
      newlyCompletedCount: 0,
      failedCount: 0,
      unresolvedCount: 0,
      skippedCount: 0,
      theoreticalTotalCostUsd: 0.4,
      existingCompletedCostUsd: 0.4,
      alreadyCommittedCostUsd: 0,
      maxNewCostUsd: 0.4,
      newlyInitiatedProviderCostUsd: 0,
      scenes: [
        {
          sceneId: "scene-a",
          sceneIndex: 0,
          clientRequestId: "00000000-0000-4000-8000-000000000001",
          outcome: "completed",
          attemptId: ATTEMPT_A,
          clip: {
            bucket: "fixtures",
            path: "a.mp4",
            duration_seconds: 3,
            generation_attempt_id: ATTEMPT_A,
          },
        },
        {
          sceneId: "scene-b",
          sceneIndex: 1,
          clientRequestId: "00000000-0000-4000-8000-000000000002",
          outcome: "completed",
          attemptId: ATTEMPT_B,
          clip: {
            bucket: "fixtures",
            path: "b.mp4",
            duration_seconds: 4,
            generation_attempt_id: ATTEMPT_B,
          },
        },
      ],
    },
    voiceoverText: baseSpec().voiceover_text,
    voiceoverSha256,
    subtitlesBurnInRequested: false,
    music: null,
    ambient: null,
  });
  assert.equal(applied.ok, true);
  if (!applied.ok) throw new Error("manifest");
  return applied.manifest;
}

console.log("check:ai-video-worker-integration-11d");

await check("8-10) jobRunner early fingerprint uses same resume validator before TTS", () => {
  const src = readFileSync(join(process.cwd(), "video-worker/jobRunner.ts"), "utf8");
  const fpIdx = src.indexOf("assertJobInputFingerprintForResume({");
  const ttsIdx = src.indexOf("await generateValidatedVoiceover(");
  const imagesIdx = src.indexOf("await generateSceneImagesWithTelemetry(");
  const phaseIdx = src.indexOf("await runAiVideoClipJobPhase(");
  assert.ok(fpIdx > 0 && ttsIdx > fpIdx);
  assert.ok(imagesIdx > fpIdx && phaseIdx > fpIdx);
});

await check("8) fingerprint mismatch rejected by shared resume function", () => {
  assert.throws(
    () =>
      assertJobInputFingerprintForResume({
        meta: {
          render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
          phase: "assembly_complete",
          input_fingerprint: "aaaa",
          input_fingerprint_version: 1,
        },
        computedJobInputFingerprint: "bbbb",
      }),
    (e: unknown) =>
      e instanceof AiVideoCheckpointValidationError &&
      e.code === "checkpoint_input_mismatch",
  );
});

await check("9) missing fingerprint rejected by shared resume function", () => {
  assert.throws(
    () =>
      assertJobInputFingerprintForResume({
        meta: {
          render_mode: VIDEO_RENDER_MODE_AI_VIDEO_CLIPS,
          phase: "checkpoint_stills",
        },
        computedJobInputFingerprint: fp(),
      }),
    (e: unknown) =>
      e instanceof AiVideoCheckpointValidationError &&
      e.code === "checkpoint_fingerprint_missing",
  );
});

const fixtureDir = await mkdtemp(join(tmpdir(), "fenrik-11d-"));
try {
  const voPath = join(fixtureDir, "vo.mp3");
  const { spawn } = await import("node:child_process");
  const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
  await new Promise<void>((resolve, reject) => {
    spawn(
      ffmpeg,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=2.5",
        "-c:a",
        "libmp3lame",
        voPath,
      ],
      { stdio: "ignore" },
    )
      .on("close", (c) => (c === 0 ? resolve() : reject(new Error(String(c)))))
      .on("error", reject);
  });
  const manifest = await buildManifest(voPath);
  const paths = stagingPaths();

  async function rejectPhase(output: Record<string, unknown>, code: string) {
    let execCalls = 0;
    let assembleCalls = 0;
    await assert.rejects(
      () =>
        runAiVideoClipJobPhase(
          {
            payload: basePayload(),
            spec: baseSpec(),
            images: [],
            renderAudioPath: voPath,
            srtPath: join(fixtureDir, "x.srt"),
            subtitlesBurnInRequested: false,
            maxBudgetUsd: 2,
            confirmPaidRun: true,
            workDir: fixtureDir,
            leaseSupabase: {} as never,
            leaseOwner: JOB,
            subtitleDebug: {},
          },
          {
            buildPersistedRenderSpec: async () => persistedSpec(),
            getJobOutput: async () => output,
            renewLease: async () => true,
            assertStillActive: noopActive,
            executePlan: async () => {
              execCalls += 1;
              throw new Error("no_exec");
            },
            assembleReel: async () => {
              assembleCalls += 1;
              throw new Error("no_assemble");
            },
          },
        ),
      (e: unknown) => e instanceof AiVideoClipJobError && e.code === code,
    );
    assert.equal(execCalls, 0);
    assert.equal(assembleCalls, 0);
  }

  await check("1) staging MP4 in another bucket is rejected", async () => {
    await rejectPhase(
      assemblyCheckpoint({
        manifest,
        staging: {
          mp4: { bucket: "other-bucket", path: paths.mp4 },
          thumbnail: { bucket: "video-renders", path: paths.thumbnail },
        },
      }),
      "checkpoint_invalid",
    );
  });

  await check("2) staging thumbnail in another bucket is rejected", async () => {
    await rejectPhase(
      assemblyCheckpoint({
        manifest,
        staging: {
          mp4: { bucket: "video-renders", path: paths.mp4 },
          thumbnail: { bucket: "other-bucket", path: paths.thumbnail },
        },
      }),
      "checkpoint_invalid",
    );
  });

  await check("3) staging SRT in another bucket is rejected", async () => {
    const withSrt: ClipReadyRenderManifest = {
      ...manifest,
      assembly: { ...manifest.assembly, subtitles_burn_in_requested: true },
    };
    await rejectPhase(
      assemblyCheckpoint({
        manifest: withSrt,
        staging: {
          mp4: { bucket: "video-renders", path: paths.mp4 },
          thumbnail: { bucket: "video-renders", path: paths.thumbnail },
          subtitles: { bucket: "other-bucket", path: paths.subtitles },
        },
      }),
      "checkpoint_invalid",
    );
  });

  await check("4) different clip path is rejected", async () => {
    const spec = specFromManifest(manifest);
    spec.scenes[0] = {
      ...spec.scenes[0]!,
      video_clip: { ...spec.scenes[0]!.video_clip!, path: "other.mp4" },
    };
    await rejectPhase(assemblyCheckpoint({ manifest, renderSpec: spec }), "checkpoint_invalid");
  });

  await check("5) different generation attempt id is rejected", async () => {
    const spec = specFromManifest(manifest);
    spec.scenes[0] = {
      ...spec.scenes[0]!,
      video_clip: {
        ...spec.scenes[0]!.video_clip!,
        generation_attempt_id: "cccccccc-cccc-4ccc-8ccc-333333333333",
      },
    };
    await rejectPhase(assemblyCheckpoint({ manifest, renderSpec: spec }), "checkpoint_invalid");
  });

  await check("6) different duration or transition is rejected", async () => {
    const spec = specFromManifest(manifest);
    spec.scenes[0] = {
      ...spec.scenes[0]!,
      duration_seconds: 9,
      transition_in: "none",
    };
    await rejectPhase(assemblyCheckpoint({ manifest, renderSpec: spec }), "checkpoint_invalid");
  });

  await check("7) mismatch does not call promotion", async () => {
    const spec = specFromManifest(manifest);
    spec.scenes[0] = {
      ...spec.scenes[0]!,
      video_clip: { ...spec.scenes[0]!.video_clip!, path: "changed.mp4" },
    };
    const output = assemblyCheckpoint({ manifest, renderSpec: spec });
    await assert.throws(
      () =>
        validateAssemblyCompleteCheckpoint({
          output,
          projectId: PROJECT,
          videoJobId: JOB,
        }),
      (e: unknown) =>
        e instanceof AiVideoCheckpointValidationError &&
        e.code === "checkpoint_invalid",
    );
    await rejectPhase(output, "checkpoint_invalid");
  });

  await check("11) final without thumbnail is not already-completed", () => {
    const f = fp();
    const out = buildAiVideoFinalDurableOutput({
      mp4_url: "https://cdn/x.mp4",
      thumbnail_url: "https://cdn/t.png",
      render_spec: specFromManifest(manifest),
      debug: {},
      aiMeta: {
        input_fingerprint: f,
        input_fingerprint_version: 1,
        final_artifacts: expectedFinalArtifactRefs(PROJECT, JOB, false),
      },
    });
    delete out.thumbnail_url;
    assert.equal(
      resolveAlreadyCompletedAiVideoJob({
        output: out,
        videoJobId: JOB,
        projectId: PROJECT,
        expectedJobInputFingerprint: f,
      }),
      null,
    );
  });

  await check("12) final without valid final_artifacts is not already-completed", () => {
    const f = fp();
    const out = buildAiVideoFinalDurableOutput({
      mp4_url: "https://cdn/x.mp4",
      thumbnail_url: "https://cdn/t.png",
      render_spec: specFromManifest(manifest),
      debug: {},
      aiMeta: { input_fingerprint: f, input_fingerprint_version: 1 },
    });
    assert.equal(
      resolveAlreadyCompletedAiVideoJob({
        output: out,
        videoJobId: JOB,
        projectId: PROJECT,
        expectedJobInputFingerprint: f,
      }),
      null,
    );
  });

  await check("13) final artifact path for another job is rejected", () => {
    const f = fp();
    const out = buildAiVideoFinalDurableOutput({
      mp4_url: "https://cdn/x.mp4",
      thumbnail_url: "https://cdn/t.png",
      render_spec: specFromManifest(manifest),
      debug: {},
      aiMeta: {
        input_fingerprint: f,
        input_fingerprint_version: 1,
        final_artifacts: expectedFinalArtifactRefs(PROJECT, OTHER_JOB, false),
      },
    });
    assert.equal(
      resolveAlreadyCompletedAiVideoJob({
        output: out,
        videoJobId: JOB,
        projectId: PROJECT,
        expectedJobInputFingerprint: f,
      }),
      null,
    );
  });

  await check("14) subtitles used without subtitle artifact is rejected", () => {
    const f = fp();
    const out = buildAiVideoFinalDurableOutput({
      mp4_url: "https://cdn/x.mp4",
      thumbnail_url: "https://cdn/t.png",
      render_spec: specFromManifest(manifest),
      debug: {},
      aiMeta: {
        input_fingerprint: f,
        input_fingerprint_version: 1,
        assembly: { subtitlesBurnInUsed: true },
        final_artifacts: expectedFinalArtifactRefs(PROJECT, JOB, false),
      },
    });
    assert.equal(
      resolveAlreadyCompletedAiVideoJob({
        output: out,
        videoJobId: JOB,
        projectId: PROJECT,
        expectedJobInputFingerprint: f,
      }),
      null,
    );
  });

  await check("15) valid final allows callback-only retry", async () => {
    const f = fp();
    const out = buildAiVideoFinalDurableOutput({
      mp4_url: "https://cdn/x.mp4",
      thumbnail_url: "https://cdn/t.png",
      render_spec: specFromManifest(manifest),
      debug: {},
      aiMeta: {
        input_fingerprint: f,
        input_fingerprint_version: 1,
        final_artifacts: expectedFinalArtifactRefs(PROJECT, JOB, false),
      },
    });
    let execCalls = 0;
    const phase = await runAiVideoClipJobPhase(
      {
        payload: basePayload(),
        spec: baseSpec(),
        images: [],
        renderAudioPath: voPath,
        srtPath: join(fixtureDir, "x.srt"),
        subtitlesBurnInRequested: false,
        maxBudgetUsd: 2,
        confirmPaidRun: true,
        workDir: fixtureDir,
        leaseSupabase: {} as never,
        leaseOwner: JOB,
        subtitleDebug: {},
      },
      {
        buildPersistedRenderSpec: async () => persistedSpec(),
        getJobOutput: async () => out,
        renewLease: async () => true,
        assertStillActive: noopActive,
        executePlan: async () => {
          execCalls += 1;
          throw new Error("no");
        },
      },
    );
    assert.equal(phase.kind, "already_completed");
    assert.equal(execCalls, 0);
    let callbacks = 0;
    const r = await finalizeAiVideoClipJob({
      projectId: PROJECT,
      videoJobId: JOB,
      leaseOwner: JOB,
      leaseSupabase: {} as never,
      subtitlesBurnInRequested: false,
      jobInputFingerprint: f,
      renewLease: async () => true,
      phase,
      persistArtifacts: async () => {
        throw new Error("must_not_persist");
      },
      sendCallback: async () => {
        callbacks += 1;
      },
    });
    assert.equal(r.status, "already_completed");
    assert.equal(callbacks, 1);
  });

  await check("16) promotion removes only the exact destination file", async () => {
    const blobs = new Map<string, Buffer>();
    const removed: string[] = [];
    const storage: AiVideoArtifactStorageDeps = {
      async uploadLocalFile({ storagePath, localPath }) {
        blobs.set(storagePath, await readFile(localPath));
      },
      async copyStorageObject({ fromPath, toPath }) {
        if (blobs.has(toPath)) throw new Error("copy_destination_exists");
        const b = blobs.get(fromPath);
        if (!b) throw new Error("missing_source");
        blobs.set(toPath, b);
      },
      async signStoragePath({ storagePath }) {
        return `https://cdn.test/${storagePath}`;
      },
      async removeStoragePaths({ paths }) {
        removed.push(...paths);
        for (const p of paths) blobs.delete(p);
      },
    };
    const tmp = join(fixtureDir, "promo.bin");
    await writeFile(tmp, Buffer.from("mp4"));
    const stagingMp4 = paths.mp4;
    const finalMp4 = buildVideoRenderPath(PROJECT, JOB, "output.mp4");
    const otherJob = buildVideoRenderPath(PROJECT, OTHER_JOB, "output.mp4");
    await storage.uploadLocalFile({
      bucket: "video-renders",
      storagePath: stagingMp4,
      localPath: tmp,
      contentType: "video/mp4",
    });
    await storage.uploadLocalFile({
      bucket: "video-renders",
      storagePath: finalMp4,
      localPath: tmp,
      contentType: "video/mp4",
    });
    await storage.uploadLocalFile({
      bucket: "video-renders",
      storagePath: otherJob,
      localPath: tmp,
      contentType: "video/mp4",
    });
    await promoteStorageRefIdempotent(storage, {
      bucket: "video-renders",
      fromPath: stagingMp4,
      toPath: finalMp4,
    });
    assert.deepEqual(removed, [finalMp4]);
    assert.equal(blobs.has(otherJob), true);
    assert.equal(blobs.has(finalMp4), true);
    assert.doesNotMatch(removed.join(","), /ai-staging/);
    assert.doesNotMatch(removed.join(","), new RegExp(OTHER_JOB));
  });

  await check("17) no runway / remote supabase in 11d suite", () => {
    const self = readFileSync(
      join(process.cwd(), "scripts/check-ai-video-worker-integration-11d.ts"),
      "utf8",
    );
    assert.doesNotMatch(self, /runway\.ml/i);
    assert.doesNotMatch(self, /createClient\(/);
  });
} finally {
  await rm(fixtureDir, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
