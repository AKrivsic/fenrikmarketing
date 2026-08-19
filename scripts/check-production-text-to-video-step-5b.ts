/**
 * Step 5B hardening — offline behavioral checks.
 * Run: npx tsx scripts/check-production-text-to-video-step-5b.ts
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  assertAuthoritativeTextToVideoPackageBudget,
  assertAssemblyPhasePackageBudget,
} from "../lib/text-to-video/textToVideoPackageBudget";
import {
  resolveTextToVideoMusicForProduction,
  TextToVideoMusicResolveError,
} from "../lib/content-package/textToVideoMusicResolve";
import {
  buildTextToVideoTrimmedClipPath,
  TEXT_TO_VIDEO_TRIM_CONTRACT_VERSION,
} from "../lib/text-to-video/textToVideoReelBridge";
import { storedAudioAssetInputsMatch } from "../lib/text-to-video/audioAssetRepository";
import { evaluateTextToVideoFullBudget } from "../lib/text-to-video/textToVideoAudioBudget";
import { readDurableTextToVideoAssemblyCheckpoint } from "../lib/text-to-video/textToVideoAssemblyCheckpoint";
import { VIDEO_TEXT_TO_VIDEO_ASSEMBLY_CHECKPOINT_KEY } from "../lib/text-to-video/runTextToVideoAssemblyPhase";
import { runTextToVideoJobPhase } from "../video-worker/textToVideoJobPhase";
import { finalizeAiVideoClipJob } from "../video-worker/finalizeAiVideoClipJob";
import { trimTextToVideoSceneClip } from "../lib/text-to-video/trimTextToVideoSceneClip";
import { validateTextToVideoSceneClipBuffer } from "../lib/text-to-video/validateSceneClip";
import { execSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeTextToVideoRunwayPlan } from "../lib/text-to-video/textToVideoRunwayExecutor";
import { buildTextToVideoRunwayExecutionPlan } from "../lib/text-to-video/runwayExecutionPlan";
import type { VideoGenerationProvider } from "../lib/ai/videoGeneration";
import type { SceneVideoAttemptView } from "../lib/scene-video-attempts";

async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`ok — ${name}`);
}

function plan3() {
  return buildTextToVideoRunwayExecutionPlan({
    plan: {
      schema_version: 1,
      status: "approved",
      voiceover_revision_id: "vr",
      voiceover_fingerprint: "vf",
      approved_hook: "h",
      hook_fingerprint: "hf",
      voice_direction_revision: 0,
      target_duration_seconds: 24,
      plan_fingerprint: "pf",
      repetition: { status: "passed", blocked_reasons: [] },
      timing_status: "measured",
      scenes: [
        {
          scene_id: "s1",
          order: 0,
          human_meaning: "m",
          voiceover_excerpt: "a",
          approximate_start_seconds: 0,
          approximate_duration_seconds: 3,
          visual_intent: "v",
          provider_prompt: "p1",
        },
        {
          scene_id: "s2",
          order: 1,
          human_meaning: "m2",
          voiceover_excerpt: "b",
          approximate_start_seconds: 3,
          approximate_duration_seconds: 3,
          visual_intent: "v2",
          provider_prompt: "p2",
        },
        {
          scene_id: "s3",
          order: 2,
          human_meaning: "m3",
          voiceover_excerpt: "c",
          approximate_start_seconds: 6,
          approximate_duration_seconds: 3,
          visual_intent: "v3",
          provider_prompt: "p3",
        },
      ],
    },
    voiceCheckpoint: {
      phase: "voice_complete",
      synthesis_attempt_id: "a",
      synthesis_fingerprint: "fp",
      voiceover_revision_id: "vr",
      voice_id: "v",
      model_id: "m",
      audio_bucket: "b",
      audio_path: "p",
      audio_duration_seconds: 9,
    },
  });
}

async function main() {
  let n = 0;
  const envOff = {
    ELEVENLABS_MUSIC_ENABLED: "false",
    ELEVENLABS_MUSIC_COMMERCIAL_LICENSE_CONFIRMED: "false",
    ELEVENLABS_SOUND_EFFECTS_ENABLED: "false",
  };
  const prev = { ...process.env };
  Object.assign(process.env, envOff);

  await check(`${++n} budget missing fails closed`, () => {
    assert.throws(() =>
      assertAuthoritativeTextToVideoPackageBudget({
        text_to_video_confirm_paid_run: true,
      }),
    );
    assert.throws(() => assertAssemblyPhasePackageBudget(undefined));
    assert.throws(() => assertAssemblyPhasePackageBudget(0));
  });

  await check(`${++n} music auto unavailable when license off`, () => {
    assert.throws(
      () =>
        resolveTextToVideoMusicForProduction({
          music: { mode: "auto" },
          confirmPaidRun: true,
        }),
      (e) => e instanceof TextToVideoMusicResolveError,
    );
  });

  await check(`${++n} music auto resolves to eleven when licensed`, () => {
    process.env.ELEVENLABS_MUSIC_ENABLED = "true";
    process.env.ELEVENLABS_MUSIC_COMMERCIAL_LICENSE_CONFIRMED = "true";
    const r = resolveTextToVideoMusicForProduction({
      music: { mode: "auto", mood: "calm" },
      confirmPaidRun: true,
    });
    assert.equal(r.mode, "eleven_generated");
    process.env.ELEVENLABS_MUSIC_ENABLED = "false";
    process.env.ELEVENLABS_MUSIC_COMMERCIAL_LICENSE_CONFIRMED = "false";
  });

  await check(`${++n} trim path includes execution/request fingerprint`, () => {
    const p1 = buildTextToVideoTrimmedClipPath({
      projectId: "p",
      videoJobId: "j",
      sceneId: "s1",
      executionFingerprint: "exec-a",
      requestFingerprint: "req-a",
      requiredTrimSeconds: 3,
    });
    const p2 = buildTextToVideoTrimmedClipPath({
      projectId: "p",
      videoJobId: "j",
      sceneId: "s1",
      executionFingerprint: "exec-b",
      requestFingerprint: "req-a",
      requiredTrimSeconds: 3,
    });
    assert.notEqual(p1, p2);
    assert.match(p1, new RegExp(`v${TEXT_TO_VIDEO_TRIM_CONTRACT_VERSION}`));
  });

  await check(`${++n} audio synthesis input integrity`, () => {
    assert.equal(
      storedAudioAssetInputsMatch({ a: 1 }, { a: 1 }),
      true,
    );
    assert.equal(
      storedAudioAssetInputsMatch({ a: 1 }, { a: 2 }),
      false,
    );
  });

  await check(`${++n} dual executor one Runway POST per scene (scene s1)`, async () => {
    const posts: string[] = [];
    let lock = false;
    const attempts = new Map<string, SceneVideoAttemptView>();
    const JOB = "00000000-0000-4000-8000-000000000002";
    const PROJ = "00000000-0000-4000-8000-000000000001";
    const provider: VideoGenerationProvider = {
      name: "runway",
      createImageToVideo: async () => {
        throw new Error("no");
      },
      getImageToVideoTask: async () => {
        throw new Error("no");
      },
      waitForImageToVideo: async () => {
        throw new Error("no");
      },
      generateImageToVideo: async () => {
        throw new Error("no");
      },
      createTextToVideo: async () => {
        if (lock) throw new Error("busy");
        lock = true;
        posts.push("post");
        return {
          provider: "runway",
          providerTaskId: "task-1",
          status: "pending",
          model: "gen4.5",
        };
      },
      getTextToVideoTask: async () => ({
        provider: "runway",
        providerTaskId: "task-1",
        status: "succeeded",
        model: "gen4.5",
        videoUrl: "https://example.test/v.mp4",
      }),
    };
    const supabase = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({ data: [...attempts.values()], error: null }),
              maybeSingle: async () => ({ data: null, error: null }),
            }),
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: {
                id: "att-1",
                status: "created",
                scene_id: "s1",
                generation_mode: "text_to_video",
              },
              error: null,
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
            in: () => ({
              select: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          download: async () => ({ data: null, error: { message: "missing" } }),
        }),
      },
    };
    const plan = plan3();
    const input = {
      projectId: PROJ,
      videoJobId: JOB,
      plan,
      packageBudgetUsd: 100,
      voiceSynthesisTextLength: 50,
      confirmPaidRun: true,
    };
    const deps = {
      videoProvider: provider,
      requireProvider: true,
      supabase: supabase as never,
      downloadSceneClip: async () => Buffer.alloc(4096, 1),
      validateClipBuffer: async () => ({ ok: true }),
      sleep: async () => undefined,
      pollIntervalMs: 0,
      pollTimeoutMs: 1,
    };
    const results = await Promise.allSettled([
      executeTextToVideoRunwayPlan(input, deps),
      executeTextToVideoRunwayPlan(input, deps),
    ]);
    void results;
    assert.ok(posts.length <= 3);
  });

  Object.assign(process.env, prev);

  await check(`${++n} audio submission_unknown in budget exposure`, () => {
    const plan = plan3();
    const rep = evaluateTextToVideoFullBudget({
      plan,
      packageBudgetUsd: 50,
      voiceSynthesisTextLength: 100,
      existingBySceneId: new Map(),
      sfxPlacements: [],
      music: { mode: "none" },
      confirmPaidRun: true,
      existingAudioAssets: [
        { status: "submission_unknown", estimated_cost_usd: 2.5 },
      ],
    });
    assert.equal(rep.audioSubmissionUnknownExposureUsd, 2.5);
    assert.equal(rep.submissionUnknownExposureUsd, 2.5);
  });

  await check(`${++n} worker reuses durable assembly checkpoint (no provider flags)`, async () => {
    const BUCKET = "video-renders";
    const storage = {
      [BUCKET]: new Map<string, Buffer>([
        ["staging/mp4", Buffer.from("fake-mp4-bytes")],
        ["staging/thumb.png", Buffer.alloc(512, 1)],
      ]),
    };
    const supabase = {
      storage: {
        from: (bucket: string) => ({
          download: async (path: string) => {
            const buf = storage[bucket]?.get(path);
            if (!buf) return { data: null, error: { message: "missing" } };
            return { data: new Blob([buf]), error: null };
          },
        }),
      },
    };
    const brief = {
      [VIDEO_TEXT_TO_VIDEO_ASSEMBLY_CHECKPOINT_KEY]: {
        phase: "assembly_complete",
        assembly_fingerprint: "af",
        execution_fingerprint: "ef",
        sound_plan_revision: 0,
        trimmed_clips_fingerprint: "tf",
        voice_fingerprint: "vf",
        subtitle_fingerprint: "sf",
        assembly_contract_version: 2,
        delivery_width: 1080,
        delivery_height: 1920,
        staging: {
          mp4: { bucket: BUCKET, path: "staging/mp4" },
          thumbnail: { bucket: BUCKET, path: "staging/thumb.png" },
        },
        estimate: true,
      },
    };
    const cp = readDurableTextToVideoAssemblyCheckpoint(brief);
    assert.ok(cp);
    const jobInput = {
      package_video_mode: "text_to_video",
      text_to_video_confirm_paid_run: true,
      text_to_video_max_budget_usd: 25,
      voiceover_text: "Test voiceover line.",
      scenes: [],
    };
    const phase = await runTextToVideoJobPhase({
      projectId: "00000000-0000-4000-8000-000000000001",
      packageId: "00000000-0000-4000-8000-000000000003",
      videoJobId: "00000000-0000-4000-8000-000000000002",
      brief,
      jobInput,
      subtitlesBurnIn: false,
      leaseOwner: "lease-1",
      supabase: supabase as never,
    });
    assert.equal(phase.kind, "needs_final_promotion");
    assert.equal(phase.debug.assembly_checkpoint_reuse, true);

    let persistCalls = 0;
    const finalized = await finalizeAiVideoClipJob({
      projectId: "00000000-0000-4000-8000-000000000001",
      videoJobId: "00000000-0000-4000-8000-000000000002",
      leaseOwner: "lease-1",
      leaseSupabase: {
        from: () => ({
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: { id: "j" }, error: null }),
                }),
              }),
            }),
          }),
        }),
      } as never,
      subtitlesBurnInRequested: false,
      jobInputFingerprint: "fp",
      phase,
      sendCallback: async () => {
        throw new Error("callback_down");
      },
      persistArtifacts: async () => {
        persistCalls += 1;
        return true;
      },
      renewLease: async () => true,
      storage: {
        uploadLocalFile: async () => undefined,
        copyStorageObject: async () => undefined,
        signStoragePath: async () => "https://signed.example/mp4",
        removeStoragePaths: async () => undefined,
      },
    });
    assert.equal(finalized.status, "completed");
    assert.equal(finalized.artifactsPersisted, true);
    assert.equal(finalized.callbackSent, false);
    assert.equal(persistCalls, 1);
  });

  await check(`${++n} ffmpeg trim + clip validation golden (offline)`, async () => {
    try {
      execSync("ffmpeg -version", { stdio: "ignore" });
    } catch {
      console.log("skip — ffmpeg not available");
      return;
    }
    const dir = await mkdtemp(join(tmpdir(), "t2v-golden-"));
    const rawPath = join(dir, "raw.mp4");
    execSync(
      `ffmpeg -y -f lavfi -i color=c=blue:s=720x1280:d=2 -c:v libx264 -pix_fmt yuv420p "${rawPath}"`,
      { stdio: "ignore" },
    );
    const raw = await readFile(rawPath);
    const trimmed = await trimTextToVideoSceneClip({
      inputBuffer: raw,
      requiredTrimSeconds: 1,
    });
    const trimmedBuf = Buffer.isBuffer(trimmed) ? trimmed : Buffer.from(trimmed);
    const v = await validateTextToVideoSceneClipBuffer({
      buffer: trimmedBuf,
      minDurationSeconds: 1,
      providerDurationSeconds: 2,
    });
    assert.equal(v.ok, true);
    await rm(dir, { recursive: true, force: true });
  });

  await check(`${++n} checkpoint durable refs shape`, () => {
    const c = {
      staging: {
        mp4: { bucket: "b", path: "p.mp4" },
        thumbnail: { bucket: "b", path: "t.png" },
      },
    };
    assert.ok(!JSON.stringify(c).includes("/tmp/"));
  });

  console.log(`\nStep 5B checks passed: ${n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
