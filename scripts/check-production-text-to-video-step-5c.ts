/**
 * Step 5C — pre-paid gate: strict Runway concurrency, full fake E2E, retry, budget.
 * Run: npx tsx scripts/check-production-text-to-video-step-5c.ts
 */
import assert from "node:assert/strict";
import { spawn, execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildTextToVideoCreativePlan,
  approveTextToVideoCreativePlan,
  serializeTextToVideoCreativePlan,
  readTextToVideoCreativePlan,
  TEXT_TO_VIDEO_PLAN_SCHEMA_VERSION,
} from "../lib/content-package/textToVideoCreativePlan";
import { creativePlanContentFingerprint } from "../lib/content-package/videoCreativeRevision";
import { buildPackageBrief } from "../lib/ai/workflows/packageShared";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import {
  serializeVideoCreativeIntegrity,
  syncVideoCreativeIntegrityFromSources,
} from "../lib/content-package/videoCreativeIntegrity";
import { VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY } from "../lib/content-package/textToVideoSoundPlan";
import { buildTextToVideoRunwayExecutionPlan } from "../lib/text-to-video/runwayExecutionPlan";
import { executeTextToVideoRunwayPlan } from "../lib/text-to-video/textToVideoRunwayExecutor";
import { evaluateTextToVideoFullBudget } from "../lib/text-to-video/textToVideoAudioBudget";
import { readDurableTextToVideoAssemblyCheckpoint } from "../lib/text-to-video/textToVideoAssemblyCheckpoint";
import { writeFile } from "node:fs/promises";
import { DurableDownloadError } from "../video-worker/services/reel/durableDownload";
import { runTextToVideoJobPhase } from "../video-worker/textToVideoJobPhase";
import { finalizeAiVideoClipJob } from "../video-worker/finalizeAiVideoClipJob";
import type { ElevenLabsWithTimestampsResponse } from "../lib/elevenlabs/adapter";
import {
  makeAtomicSceneAttemptSupabase,
  RunwayCreateTracker,
  makeTextToVideoE2ESupabase,
} from "./lib/t2vPrePaidTestHarness";

const PROJECT = "11111111-1111-4111-8111-111111111111";
const PACKAGE = "22222222-2222-4222-8222-222222222222";
const JOB = "33333333-3333-4333-8333-333333333333";

function vo(): string {
  return (
    "Firma potrebuj rychlejsi cashflow kazdy mesic. " +
    "Nezapomente na faktury a terminy splatnosti. " +
    "Automaticke upominky setri nervy i penize. " +
    "S Fenrikem usetrite hodiny administrativy tydne. " +
    "Tym se muze soustredit na rust, ne na papirani. " +
    "Zacnete jeste dnes a vyzkousejte demo."
  );
}

function pkg(): ContentPackageOutput {
  const text = vo();
  return {
    title: "T",
    funnel_stage: "awareness",
    hook: "Cashflow ted",
    voiceover_text: text,
    subtitles: text,
    cta: { text: "Demo", url: null },
    video: { concept: "c", script: text },
    platform_outputs: { tiktok: { caption: "c", hashtags: [], cta: "Demo" } },
    hashtags: [],
    image_prompts: [],
    visual_scenes: [],
    asset_usage: [],
  } as ContentPackageOutput;
}

function approvedBrief(): Record<string, unknown> {
  const text = vo();
  let plan = buildTextToVideoCreativePlan({
    packageId: PACKAGE,
    voiceoverText: text,
  });
  plan = approveTextToVideoCreativePlan(plan, "2026-01-01T00:00:00.000Z");
  plan = {
    ...plan,
    repetition: {
      status: "passed",
      blocked_reasons: [],
      checked_at: "2026-01-01T00:00:00.000Z",
    },
    scenes: plan.scenes.map((s, i) => ({
      ...s,
      sound_intent: i === 1 ? "jemný whoosh přechod" : s.sound_intent,
    })),
  };
  const brief = buildPackageBrief(
    { ...pkg(), voiceover_text: text, hook: plan.approved_hook },
    { packageVideoMode: "text_to_video" },
  ) as Record<string, unknown>;
  const integrity = syncVideoCreativeIntegrityFromSources({
    voiceoverText: text,
    hookText: plan.approved_hook,
    voiceDirection: { style: "auto", revision: 0 },
    plan,
    packageVideoMode: "text_to_video",
  });
  return {
    ...brief,
    video_text_to_video_creative_plan: serializeTextToVideoCreativePlan(plan),
    video_creative_integrity: serializeVideoCreativeIntegrity(integrity),
    video_paid_preflight: {
      similarity_check_status: "passed",
      confirm_paid_run: true,
      max_budget_usd: 80,
    },
    [VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY]: {
      schema_version: 1,
      revision: 0,
      music: { mode: "none" },
      scene_sound: {
        [plan.scenes[1]!.scene_id]: {
          mode: "custom",
          custom_effect_description: "Soft whoosh transition",
          anchor: "scene_middle",
        },
      },
    },
  };
}

function approvedBriefThreeScenes(): Record<string, unknown> {
  const brief = approvedBrief();
  const plan = readTextToVideoCreativePlan(brief);
  if (!plan) throw new Error("plan_missing");
  const scenes = plan.scenes.slice(0, 3);
  const midScene = scenes[1]!;
  const trimmedPlan = {
    ...plan,
    scenes,
    plan_fingerprint: creativePlanContentFingerprint({
      schema_version: TEXT_TO_VIDEO_PLAN_SCHEMA_VERSION,
      voiceover_revision_id: plan.voiceover_revision_id,
      hook_fingerprint: plan.hook_fingerprint,
      voice_direction_revision: plan.voice_direction_revision,
      target_duration_seconds: plan.target_duration_seconds,
      scenes: scenes.map((s) => ({
        scene_id: s.scene_id,
        order: s.order,
        human_meaning: s.human_meaning,
        provider_prompt: s.provider_prompt,
      })),
    }),
  };
  const integrity = syncVideoCreativeIntegrityFromSources({
    voiceoverText: vo(),
    hookText: trimmedPlan.approved_hook,
    voiceDirection: { style: "auto", revision: 0 },
    plan: trimmedPlan,
    packageVideoMode: "text_to_video",
  });
  return {
    ...brief,
    video_text_to_video_creative_plan: serializeTextToVideoCreativePlan(trimmedPlan),
    video_creative_integrity: serializeVideoCreativeIntegrity(integrity),
    [VIDEO_TEXT_TO_VIDEO_SOUND_PLAN_KEY]: {
      schema_version: 1,
      revision: 0,
      music: { mode: "none" },
      scene_sound: {
        [midScene.scene_id]: {
          mode: "custom",
          custom_effect_description: "Soft whoosh transition",
          anchor: "scene_middle",
        },
      },
    },
  };
}

function planWithThreeScenes() {
  const brief = approvedBriefThreeScenes();
  const plan = readTextToVideoCreativePlan(brief);
  if (!plan) throw new Error("plan_missing");
  const trimmed = { ...plan, scenes: plan.scenes.slice(0, 3) };
  return buildTextToVideoRunwayExecutionPlan({
    plan: trimmed,
    voiceCheckpoint: {
      phase: "voice_complete",
      synthesis_attempt_id: "00000000-0000-4000-8000-000000000099",
      synthesis_fingerprint: "fp-voice",
      voiceover_revision_id: trimmed.voiceover_revision_id,
      voice_id: "v",
      model_id: "eleven_v3",
      audio_bucket: "video-renders",
      audio_path: "voice.mp3",
      audio_duration_seconds: 22,
    },
  });
}

function voiceCheckpointPlan() {
  return planWithThreeScenes();
}

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

function ffprobeJson(filePath: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    const child = spawn(
      process.env.FFPROBE_PATH ?? "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type,width,height",
        "-of",
        "json",
        filePath,
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
    );
    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error("ffprobe_failed"));
      else resolve(JSON.parse(stdout) as Record<string, unknown>);
    });
  });
}

async function makePortraitClip(seconds: number): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "t2v-clip-"));
  const out = join(dir, "c.mp4");
  execSync(
    `${ffmpegBin()} -y -f lavfi -i color=c=green:s=720x1280:d=${seconds} -c:v libx264 -pix_fmt yuv420p "${out}"`,
    { stdio: "ignore" },
  );
  const buf = await readFile(out);
  await rm(dir, { recursive: true, force: true });
  return buf;
}

async function makeVoiceMp3(seconds: number): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "t2v-vo-"));
  const out = join(dir, "v.mp3");
  execSync(
    `${ffmpegBin()} -y -f lavfi -i sine=frequency=440:duration=${seconds} -c:a libmp3lame "${out}"`,
    { stdio: "ignore" },
  );
  const buf = await readFile(out);
  await rm(dir, { recursive: true, force: true });
  return buf;
}

function alignmentFor(text: string) {
  const chars = text.split("");
  const step = 22 / Math.max(chars.length, 1);
  return {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => i * step),
    character_end_times_seconds: chars.map((_, i) => (i + 1) * step),
  };
}

async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`ok — ${name}`);
}

async function main() {
  let n = 0;
  const envPrev = { ...process.env };
  Object.assign(process.env, {
    ELEVENLABS_TTS_ENABLED: "true",
    ELEVENLABS_API_KEY: "test-key-offline",
    ELEVENLABS_VOICE_ID_DEFAULT: "test-voice-id",
    ELEVENLABS_VOICE_ID_FEMALE: "test-voice-female",
    ELEVENLABS_VOICE_ID_CS_FEMALE: "test-voice-cs-female",
    ELEVENLABS_VOICE_ID_CS_DEFAULT: "test-voice-cs-default",
    ELEVENLABS_VOICE_ID_EN_FEMALE: "test-voice-en-female",
    ELEVENLABS_VOICE_ID_EN_DEFAULT: "test-voice-en-default",
    TEXT_TO_VIDEO_RUNWAY_ENABLED: "true",
    ELEVENLABS_SOUND_EFFECTS_ENABLED: "true",
    ELEVENLABS_MUSIC_ENABLED: "false",
    ELEVENLABS_MUSIC_COMMERCIAL_LICENSE_CONFIRMED: "false",
  });

  await check(`${++n} single executor completes 3 scenes (baseline)`, async () => {
    const clip = await makePortraitClip(3);
    const tracker = new RunwayCreateTracker();
    const store = makeAtomicSceneAttemptSupabase();
    const plan = voiceCheckpointPlan();
    const res = await executeTextToVideoRunwayPlan(
      {
        projectId: PROJECT,
        videoJobId: JOB,
        plan,
        packageBudgetUsd: 100,
        voiceSynthesisTextLength: vo().length,
        confirmPaidRun: true,
      },
      {
        videoProvider: tracker.buildProvider("https://fake.test/clip.mp4"),
        requireProvider: true,
        supabase: store.supabase,
        fetchImpl: async () =>
          new Response(clip, {
            status: 200,
            headers: { "content-type": "video/mp4" },
          }),
        downloadSceneClip: async () => clip,
        validateClipBuffer: async () => ({ ok: true }),
        sleep: async () => undefined,
        pollIntervalMs: 1,
        pollTimeoutMs: 15000,
        submissionClaimOwner: "worker-single",
      },
    );
    assert.equal(res.status, "completed", res.blockedReason);
    assert.equal(tracker.createCalls.length, 3);
  });

  await check(`${++n} strict dual-executor Runway concurrency (3 scenes)`, async () => {
    process.env.T2V_TEST_PEER_WAIT_MS = "3000";
    const clip = await makePortraitClip(3);
    const tracker = new RunwayCreateTracker();
    const store = makeAtomicSceneAttemptSupabase();
    const plan = voiceCheckpointPlan();
    const fetchImpl: typeof fetch = async () =>
      new Response(clip, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    const input = {
      projectId: PROJECT,
      videoJobId: JOB,
      plan,
      packageBudgetUsd: 100,
      voiceSynthesisTextLength: vo().length,
      confirmPaidRun: true,
    };
    const deps = {
      videoProvider: tracker.buildProvider("https://fake.test/clip.mp4"),
      requireProvider: true,
      supabase: store.supabase,
      fetchImpl,
      downloadSceneClip: async () => clip,
      validateClipBuffer: async () => ({ ok: true }),
      sleep: async () => undefined,
      pollIntervalMs: 1,
      pollTimeoutMs: 15000,
      submissionClaimOwner: "worker-a",
    };
    const depsB = { ...deps, submissionClaimOwner: "worker-b" };
    const [ra, rb] = await Promise.all([
      executeTextToVideoRunwayPlan(input, deps),
      executeTextToVideoRunwayPlan(input, depsB),
    ]);
    assert.equal(ra.status, "completed", `executor A: ${ra.blockedReason}`);
    assert.equal(tracker.createCalls.length, 3);
    assert.equal(
      tracker.createCalls.length,
      new Set(tracker.createCalls.map((c) => c.taskId)).size,
    );
    assert.ok(
      rb.status === "completed" || rb.status === "stopped",
      `executor B outcome: ${rb.status}/${rb.blockedReason}`,
    );
    const tasksByScene = new Map<string, Set<string>>();
    for (const row of store.attempts.values()) {
      if (row.generation_mode !== "text_to_video") continue;
      if (!row.provider_task_id) continue;
      const set = tasksByScene.get(row.scene_id) ?? new Set<string>();
      set.add(row.provider_task_id);
      tasksByScene.set(row.scene_id, set);
    }
    for (const item of plan.items) {
      const set = tasksByScene.get(item.sceneId);
      assert.ok(set && set.size === 1, `one task per scene ${item.sceneId}`);
    }
    assert.equal(tasksByScene.size, 3);
    delete process.env.T2V_TEST_PEER_WAIT_MS;
  });

  await check(`${++n} budget blocks new Runway POST when insufficient`, async () => {
    const tracker = new RunwayCreateTracker();
    const store = makeAtomicSceneAttemptSupabase();
    const plan = voiceCheckpointPlan();
    const res = await executeTextToVideoRunwayPlan(
      {
        projectId: PROJECT,
        videoJobId: JOB,
        plan,
        packageBudgetUsd: 0.001,
        voiceSynthesisTextLength: 5000,
        confirmPaidRun: true,
      },
      {
        videoProvider: tracker.buildProvider("https://fake.test/x.mp4"),
        requireProvider: true,
        supabase: store.supabase,
      },
    );
    assert.equal(res.status, "blocked");
    assert.equal(tracker.createCalls.length, 0);
  });

  await check(`${++n} budget counts submission_unknown once`, () => {
    const plan = voiceCheckpointPlan();
    const rep = evaluateTextToVideoFullBudget({
      plan,
      packageBudgetUsd: 50,
      voiceSynthesisTextLength: 200,
      existingBySceneId: new Map([
        [
          plan.items[0]!.sceneId,
          {
            sceneId: plan.items[0]!.sceneId,
            status: "submission_unknown",
            estimatedCostUsd: plan.items[0]!.estimatedCostUsd,
          } as never,
        ],
      ]),
      sfxPlacements: [],
      music: { mode: "none" },
      confirmPaidRun: true,
      existingAudioAssets: [
        { status: "submission_unknown", estimated_cost_usd: 1.2 },
      ],
    });
    assert.ok(rep.submissionUnknownExposureUsd > 0);
    assert.equal(rep.audioSubmissionUnknownExposureUsd, 1.2);
  });

  let e2eHarness: ReturnType<typeof makeTextToVideoE2ESupabase> | null = null;
  let voicePostCount = 0;
  let sfxPostCount = 0;
  let stagingMp4Path = "";

  await check(`${++n} full fake E2E runTextToVideoJobPhase → finalize`, async () => {
    execSync(`${ffmpegBin()} -version`, { stdio: "ignore" });
    const voiceText = vo();
    const voiceMp3 = await makeVoiceMp3(22);
    const sceneClip = await makePortraitClip(4);
    const sfxMp3 = await makeVoiceMp3(3);
    const tracker = new RunwayCreateTracker();
    e2eHarness = makeTextToVideoE2ESupabase({
      projectId: PROJECT,
      packageId: PACKAGE,
      initialBrief: approvedBrief(),
    });

    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("api.elevenlabs.io") && method === "POST") {
        if (url.includes("sound-generation")) {
          sfxPostCount += 1;
          return new Response(sfxMp3, {
            status: 200,
            headers: { "content-type": "audio/mpeg" },
          });
        }
        voicePostCount += 1;
        return new Response(voiceMp3, {
          status: 200,
          headers: { "content-type": "audio/mpeg" },
        });
      }
      return new Response(sceneClip, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    };

    const align = alignmentFor(voiceText);
    const elevenLabsCall = async (): Promise<ElevenLabsWithTimestampsResponse> => {
      voicePostCount += 1;
      return {
        audio_base64: voiceMp3.toString("base64"),
        alignment: align,
        normalized_alignment: align,
      };
    };

    const artifactStorage = {
      uploadLocalFile: async (args: {
        bucket: string;
        storagePath: string;
        localPath: string;
      }) => {
        const body = await readFile(args.localPath);
        e2eHarness!.storage.set(`${args.bucket}:${args.storagePath}`, body);
        if (args.storagePath.endsWith(".mp4")) stagingMp4Path = args.localPath;
      },
      copyStorageObject: async () => undefined,
      signStoragePath: async () => "https://signed.example/final.mp4",
      removeStoragePaths: async () => undefined,
    };

    const storageDownloader = {
      downloadAsset: async (args: {
        bucket: string;
        path: string;
        destinationPath: string;
      }) => {
        const buf = e2eHarness!.storage.get(`${args.bucket}:${args.path}`);
        if (!buf) {
          throw new DurableDownloadError(
            "not_found",
            `asset not found: ${args.bucket}/${args.path}`,
          );
        }
        await writeFile(args.destinationPath, buf);
      },
    };

    const jobInput = {
      package_video_mode: "text_to_video",
      voiceover_text: voiceText,
      tts_voice: "alloy",
      language: "cs",
      text_to_video_confirm_paid_run: true,
      text_to_video_max_budget_usd: 80,
      scenes: [],
    };

    const phase = await runTextToVideoJobPhase({
      projectId: PROJECT,
      packageId: PACKAGE,
      videoJobId: JOB,
      brief: approvedBrief(),
      jobInput,
      subtitlesBurnIn: false,
      leaseOwner: "lease-e2e",
      supabase: e2eHarness.supabase,
      artifactStorage,
      executorDeps: {
        supabase: e2eHarness.supabase,
        videoProvider: tracker.buildProvider("https://fake.test/clip.mp4"),
        requireProvider: true,
        fetchImpl,
        elevenLabsCall,
        probeDuration: async () => 22,
        downloadSceneClip: async () => sceneClip,
        validateClipBuffer: async () => ({ ok: true }),
        sleep: async () => undefined,
        pollIntervalMs: 1,
        pollTimeoutMs: 15000,
        downloader: storageDownloader,
      },
    });

    assert.equal(phase.kind, "needs_final_promotion");
    const cp = readDurableTextToVideoAssemblyCheckpoint(e2eHarness.getBrief());
    assert.ok(cp);
    assert.ok(!JSON.stringify(cp).includes("/tmp/"));
    const sceneCount =
      readTextToVideoCreativePlan(e2eHarness.getBrief())?.scenes.length ?? 0;
    assert.ok(sceneCount >= 3);
    assert.equal(tracker.createCalls.length, sceneCount);
    assert.ok(voicePostCount >= 1);
    assert.ok(sfxPostCount >= 1);
    assert.ok(stagingMp4Path.length > 0);
    const probed = await ffprobeJson(stagingMp4Path);
    const streams =
      (probed.streams as { codec_type?: string; width?: number; height?: number }[]) ??
      [];
    assert.ok(streams.some((s) => s.codec_type === "video"));
    assert.ok(streams.some((s) => s.codec_type === "audio"));
    const video = streams.find((s) => s.codec_type === "video");
    assert.equal(video?.width, 1080);
    assert.equal(video?.height, 1920);

    const finalized = await finalizeAiVideoClipJob({
      projectId: PROJECT,
      videoJobId: JOB,
      leaseOwner: "lease-e2e",
      leaseSupabase: e2eHarness.supabase,
      subtitlesBurnInRequested: true,
      jobInputFingerprint: "fp-e2e",
      phase,
      sendCallback: async () => undefined,
      persistArtifacts: async () => true,
      renewLease: async () => true,
      storage: artifactStorage,
    });
    assert.equal(finalized.status, "completed");
  });

  const voiceBefore = voicePostCount;
  const sfxBefore = sfxPostCount;

  await check(`${++n} retry — zero new provider POSTs`, async () => {
    if (!e2eHarness) return;
    const tracker = new RunwayCreateTracker();
    voicePostCount = 0;
    sfxPostCount = 0;
    const jobInput = {
      package_video_mode: "text_to_video",
      voiceover_text: vo(),
      tts_voice: "alloy",
      language: "cs",
      text_to_video_confirm_paid_run: true,
      text_to_video_max_budget_usd: 80,
      scenes: [],
    };
    const phase = await runTextToVideoJobPhase({
      projectId: PROJECT,
      packageId: PACKAGE,
      videoJobId: JOB,
      brief: e2eHarness.getBrief(),
      jobInput,
      subtitlesBurnIn: false,
      leaseOwner: "lease-retry",
      supabase: e2eHarness.supabase,
      executorDeps: {
        supabase: e2eHarness.supabase,
        videoProvider: tracker.buildProvider("https://fake.test/clip.mp4"),
        requireProvider: true,
        fetchImpl: async () => {
          throw new Error("network_forbidden_on_retry");
        },
      },
    });
    assert.equal(phase.kind, "needs_final_promotion");
    assert.equal(phase.debug.assembly_checkpoint_reuse, true);
    assert.equal(tracker.createCalls.length, 0);
    assert.equal(voicePostCount, 0);
    assert.equal(sfxPostCount, 0);
    assert.equal(voiceBefore >= 1, true);
    assert.equal(sfxBefore >= 1, true);
  });

  await check(`${++n} authoritative Runway secret name`, () => {
    const src = readFileSync(
      join(import.meta.dirname, "../lib/ai/runway.ts"),
      "utf8",
    );
    assert.match(src, /RUNWAYML_API_SECRET/);
    assert.doesNotMatch(src, /process\.env\.RUNWAY_API_KEY/);
  });

  Object.assign(process.env, envPrev);
  console.log(`\nStep 5C checks passed: ${n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
