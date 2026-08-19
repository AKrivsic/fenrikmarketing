// Offline Benchmark Lab checks — no real provider / paid calls.
//   npm run check:ai-media-benchmark

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { VideoGenerationProvider } from "@/lib/ai/videoGeneration";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";
import { buildDocumentedGeminiOmniFlashImageToVideoBody } from "@/lib/ai/runwayImageToVideoBody";
import {
  ROUND_A_DURATION_SECONDS,
  ROUND_A_PORTRAIT_RATIO,
  RUNWAY_TTS_MODEL,
  RUNWAY_TTS_PRESET_MAYA,
  SOUND_CANDIDATES,
  VIDEO_MODEL_CATALOG,
  VOICE_CANDIDATES,
  getVideoModel,
  quoteRoundA,
  quoteSoundCost,
  quoteVideoCost,
  quoteVoiceCost,
} from "@/lib/ai-media-benchmark/catalog";
import {
  AI_MEDIA_BENCHMARK_SOUND_FLAG,
  AI_MEDIA_BENCHMARK_TEXT_VIDEO_FLAG,
  AI_MEDIA_BENCHMARK_VIDEO_FLAG,
  AI_MEDIA_BENCHMARK_VOICE_FLAG,
  isBenchmarkSoundEnabled,
  isBenchmarkTextVideoEnabled,
  isBenchmarkVideoEnabled,
  isBenchmarkVoiceEnabled,
} from "@/lib/ai-media-benchmark/flags";
import { BENCHMARK_REQUEST_INPUT_MISMATCH } from "@/lib/ai-media-benchmark/requestIntegrity";
import {
  parseBenchmarkNote,
  parseBenchmarkRating,
} from "@/lib/ai-media-benchmark/rating";
import {
  createVideoBenchmarkRun,
  createVoiceBenchmarkRun,
  createSoundBenchmarkRun,
  listBenchmarkRuns,
  rateBenchmarkRun,
  syncBenchmarkRun,
} from "@/lib/ai-media-benchmark/service";
import {
  DEFAULT_TEXT_VIDEO_CASE_ID,
  DEFAULT_VOICE_SCRIPT,
  OPENAI_BENCHMARK_TTS_INSTRUCTIONS,
} from "@/lib/ai-media-benchmark/types";
import {
  createOpenAiBenchmarkVoiceProvider,
  requireVoiceCandidate,
} from "@/lib/ai-media-benchmark/voice";
import type { SpeechProvider, SpeechRequest } from "@/lib/ai/types";
import {
  AI_MEDIA_BENCHMARK_AMBIENT_GAIN,
  AI_MEDIA_BENCHMARK_COMBINED_FILENAME,
  AI_MEDIA_BENCHMARK_DOWNLOAD_TIMEOUT_MS,
  AI_MEDIA_BENCHMARK_MAX_OUTPUT_BYTES,
  AI_MEDIA_BENCHMARK_MAX_VOICEOVER_SECONDS,
  AI_MEDIA_BENCHMARK_SCENE_AUDIO_GAIN,
  AI_MEDIA_BENCHMARK_VERCEL_MAX_DURATION_SECONDS,
  AI_MEDIA_BENCHMARK_VOICEOVER_GAIN,
} from "@/lib/ai-media-benchmark/constants";
import {
  isVoiceoverTooLongForScene,
  planCombinedScene,
} from "@/lib/ai-media-benchmark/combinedPlan";
import {
  createCombinedScene,
  rateCombinedScene,
  syncCombinedScene,
} from "@/lib/ai-media-benchmark/combinedService";
import { assembleBenchmarkCombinedScene } from "@/video-worker/services/assembleBenchmarkCombinedScene";
import { AUDIO_MIX_DEFAULTS } from "@/video-worker/services/audioMix/defaults";
import { runRoundAPlus12cChecks } from "./check-ai-media-benchmark-12c.ts";
import { readResponseBodyBounded } from "@/lib/scene-video-attempts/boundedDownload";
import { parseVideoJobRenderOptions } from "@/lib/video-engine/schemas/videoJobRenderMode";
import { isSceneVideoGenerationEnabled } from "@/lib/scene-video-executor/constants";
import { SCENE_VIDEO_PLAN_DEFAULT_MODEL } from "@/lib/scene-video-plan/buildSceneVideoGenerationPlan";

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

const PROJECT_A = "11111111-1111-4111-8111-111111111111";
const PROJECT_B = "22222222-2222-4222-8222-222222222222";
const JOB_A = "33333333-3333-4333-8333-333333333333";
const REQUEST_1 = "44444444-4444-4444-8444-444444444444";
const REQUEST_2 = "55555555-5555-4555-8555-555555555555";
const REQUEST_3 = "66666666-6666-4666-8666-666666666666";
const REQUEST_4 = "16161616-1616-4161-8161-161616161616";
const VIDEO_RUN_ID = "77777777-7777-4777-8777-777777777777";
const VOICE_RUN_ID = "88888888-8888-4888-8888-888888888888";
const SOUND_RUN_ID = "99999999-9999-4999-8999-999999999999";
const VIDEO_RUN_B = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VIDEO_RUN_C = "15151515-1515-4151-8151-151515151515";
const VOICE_RUN_B = "17171717-1717-4171-8171-171717171717";
const SOUND_RUN_B = "18181818-1818-4181-8181-181818181818";
const ROOT = process.cwd();
const VIDEO_ENV = {
  AI_MEDIA_BENCHMARK_VIDEO_ENABLED: "true",
  RUNWAYML_API_SECRET: "secret",
} as const;

let realFetchCalls = 0;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  realFetchCalls += 1;
  throw new Error(`real_network_forbidden:${String(input)}`);
}) as typeof fetch;

const SCENE_OUTPUT = {
  render_spec: {
    version: 1,
    scenes: [
      {
        id: "scene-1",
        image_prompt: "product",
        image_bucket: "video-renders",
        image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
        duration_seconds: 3,
      },
    ],
  },
};

function makeFakeSupabase(opts?: { failSignedUrl?: boolean; failUpload?: boolean }) {
  const runs = new Map<string, Record<string, unknown>>();
  const combinedRuns = new Map<string, Record<string, unknown>>();
  const videoJobs = [
    {
      id: JOB_A,
      project_id: PROJECT_A,
      status: "completed",
      output: SCENE_OUTPUT,
      created_at: "2026-08-01T00:00:00.000Z",
    },
  ];

  function matches(
    row: Record<string, unknown>,
    filters: Array<{ col: string; op: string; val: unknown }>,
  ): boolean {
    return filters.every((f) => {
      const cur = row[f.col];
      if (f.op === "eq") return cur === f.val;
      if (f.op === "is") return cur === f.val;
      if (f.op === "in") return Array.isArray(f.val) && f.val.includes(cur);
      return true;
    });
  }

  const files = new Map<string, true>();
  const uploads: string[] = [];
  let missCombinedSelect = 0;

  function tableApi(table: string) {
    const store =
      table === "ai_media_benchmark_combined_runs" ? combinedRuns : runs;
    const filters: Array<{ col: string; op: string; val: unknown }> = [];
    let insertRow: Record<string, unknown> | null = null;
    let updatePatch: Record<string, unknown> | null = null;
    let wantSingle = false;
    let wantMaybe = false;
    const api: Record<string, unknown> = {
      select() {
        return api;
      },
      eq(col: string, val: unknown) {
        filters.push({ col, op: "eq", val });
        return api;
      },
      is(col: string, val: unknown) {
        filters.push({ col, op: "is", val });
        return api;
      },
      in(col: string, val: unknown[]) {
        filters.push({ col, op: "in", val });
        return api;
      },
      order() {
        return api;
      },
      limit() {
        return api;
      },
      insert(payload: Record<string, unknown>) {
        insertRow = payload;
        return api;
      },
      update(payload: Record<string, unknown>) {
        updatePatch = payload;
        return api;
      },
      single() {
        wantSingle = true;
        return api;
      },
      maybeSingle() {
        wantMaybe = true;
        return api;
      },
      then(resolve: (v: unknown) => void, reject?: (e: unknown) => void) {
        return Promise.resolve().then(execute).then(resolve, reject);
      },
    };

    async function execute() {
      if (table === "projects") {
        const id = filters.find((f) => f.col === "id")?.val;
        return {
          data:
            id === PROJECT_A
              ? {
                  id: PROJECT_A,
                  name: "Acme HVAC",
                  type: "services",
                  language: "cs",
                  market_scope: "CZ",
                  product_is: ["průmyslové vytápění"],
                  product_is_not: [],
                  product_strengths: ["rychlý servis"],
                  knowledge: {
                    presentation: {
                      brand: {
                        accent_color: "#1d4ed8",
                        background_color: "#0f172a",
                      },
                    },
                  },
                }
              : null,
          error: null,
        };
      }
      if (table === "assets") {
        return {
          data: [{ metadata: { product_role: "logo" } }],
          error: null,
        };
      }
      if (table === "video_jobs") {
        const rows = videoJobs.filter((j) =>
          matches(j as unknown as Record<string, unknown>, filters),
        );
        if (wantSingle || wantMaybe) {
          return { data: rows[0] ?? null, error: null };
        }
        return { data: rows, error: null };
      }
      if (
        table === "ai_media_benchmark_runs" ||
        table === "ai_media_benchmark_combined_runs"
      ) {
        if (
          table === "ai_media_benchmark_combined_runs" &&
          !insertRow &&
          !updatePatch &&
          missCombinedSelect > 0
        ) {
          missCombinedSelect -= 1;
          return { data: wantSingle || wantMaybe ? null : [], error: null };
        }
        if (insertRow) {
          const clientId = String(insertRow.client_request_id);
          for (const existing of store.values()) {
            if (existing.client_request_id === clientId) {
              return { data: null, error: { code: "23505", message: "dup" } };
            }
          }
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const row = {
            id,
            ...insertRow,
            provider_task_id: insertRow.provider_task_id ?? null,
            submission_claim_owner: insertRow.submission_claim_owner ?? null,
            submission_claimed_at: insertRow.submission_claimed_at ?? null,
            assembly_claim_owner: insertRow.assembly_claim_owner ?? null,
            assembly_claimed_at: insertRow.assembly_claimed_at ?? null,
            output_bucket: insertRow.output_bucket ?? null,
            output_path: insertRow.output_path ?? null,
            error_message: null,
            failure_code: null,
            rating: null,
            rating_image: null,
            rating_av_fit: null,
            rating_overall: null,
            note: null,
            latency_ms: null,
            created_at: now,
            updated_at: now,
            completed_at: null,
          };
          store.set(id, row);
          return { data: { ...row }, error: null };
        }
        if (updatePatch) {
          const matchesRows = [...store.values()].filter((r) => matches(r, filters));
          if (matchesRows.length === 0) {
            return { data: wantSingle || wantMaybe ? null : [], error: null };
          }
          const target = matchesRows[0]!;
          const next = { ...target, ...updatePatch, updated_at: new Date().toISOString() };
          store.set(String(target.id), next);
          return {
            data: wantSingle || wantMaybe ? next : [next],
            error: null,
          };
        }
        const rows = [...store.values()].filter((r) => matches(r, filters));
        if (wantSingle || wantMaybe) {
          return { data: rows[0] ?? null, error: null };
        }
        return { data: rows, error: null };
      }
      return { data: null, error: { message: `unknown table ${table}` } };
    }

    return api;
  }

  return {
    from(table: string) {
      return tableApi(table);
    },
    storage: {
      from(bucket = "video-renders") {
        return {
          async createSignedUrl(path: string) {
            if (opts?.failSignedUrl) {
              return { data: null, error: { message: "sign failed" } };
            }
            return { data: { signedUrl: `https://cdn.example.com/${path}` }, error: null };
          },
          async upload(path: string) {
            if (opts?.failUpload) {
              return { error: { message: "upload failed" } };
            }
            uploads.push(path);
            files.set(`${bucket}/${path}`, true);
            return { error: null };
          },
          async list(folder: string) {
            const prefix = `${bucket}/${String(folder).replace(/\/$/, "")}/`;
            const names = new Set<string>();
            for (const key of files.keys()) {
              if (key.startsWith(prefix)) {
                names.add(key.slice(prefix.length).split("/")[0]!);
              }
            }
            return { data: [...names].map((name) => ({ name })), error: null };
          },
        };
      },
    },
    _runs: runs,
    _combined: combinedRuns,
    _files: files,
    _uploads: uploads,
    missNextCombinedSelect() {
      missCombinedSelect += 1;
    },
  };
}

function fakeVideoProvider(
  created: string[] = [],
  extras?: {
    gets?: string[];
    waits?: string[];
    getStatus?: "pending" | "succeeded";
    videoUrl?: string;
  },
): VideoGenerationProvider {
  return {
    name: "runway",
    async createImageToVideo(req) {
      created.push(req.model ?? "missing");
      return {
        provider: "runway",
        providerTaskId: "d2e3d1f4-1b3c-4b5c-8d46-1c1d7ee86892",
        status: "pending",
        model: req.model ?? "gen4_turbo",
        request: {
          provider: "runway",
          model: req.model ?? "gen4_turbo",
          imageUrl: req.imageUrl,
          motionPrompt: req.motionPrompt,
          duration: req.duration,
          ratio: req.ratio,
        },
      };
    },
    async getImageToVideoTask(id) {
      extras?.gets?.push(id);
      return {
        provider: "runway",
        providerTaskId: id,
        status: extras?.getStatus ?? "pending",
        model: "gen4_turbo",
        ...(extras?.getStatus === "succeeded"
          ? { videoUrl: extras.videoUrl ?? "https://cdn.example.com/clip.mp4" }
          : {}),
      };
    },
    async waitForImageToVideo(id) {
      extras?.waits?.push(id);
      return this.getImageToVideoTask(id);
    },
    async generateImageToVideo(req) {
      return this.createImageToVideo(req);
    },
  };
}

function seedSucceededRun(
  supabase: ReturnType<typeof makeFakeSupabase>,
  args: {
    id: string;
    testType: "video" | "voice" | "sound";
    model: string;
    outputContainsAudio?: boolean;
    clientRequestId: string;
    settings?: Record<string, unknown>;
    projectId?: string;
    caseId?: string;
  },
): void {
  const now = new Date().toISOString();
  const projectId = args.projectId ?? PROJECT_A;
  const filename = args.testType === "video" ? "output.mp4" : "audio.mp3";
  const path = `${projectId}/ai-media-benchmark/${args.id}/${filename}`;
  supabase._runs.set(args.id, {
    id: args.id,
    case_id:
      args.caseId ??
      (args.testType === "video"
        ? "portrait-scene-a"
        : args.testType === "voice"
          ? "voice-script-a"
          : "sound-ambient-a"),
    test_type: args.testType,
    audio_role:
      args.testType === "video"
        ? args.outputContainsAudio
          ? "scene_model_audio"
          : "none"
        : args.testType === "voice"
          ? "voiceover"
          : "ambient_sfx",
    project_id: projectId,
    client_request_id: args.clientRequestId,
    provider: "runway",
    model: args.model,
    voice_id: null,
    settings: args.settings ?? {},
    provider_task_id: `task-${args.id}`,
    status: "succeeded",
    output_contains_audio: args.outputContainsAudio ?? args.testType !== "video",
    output_bucket: "video-renders",
    output_path: path,
    error_message: null,
    failure_code: null,
    rating: null,
    note: null,
    created_at: now,
    updated_at: now,
    completed_at: now,
  });
  supabase._files.set(`video-renders/${path}`, true);
}

console.log("check:ai-media-benchmark");

await check("catalog has four testable video candidates with prices", () => {
  const testable = VIDEO_MODEL_CATALOG.filter((m) => m.status === "testable");
  assert.deepEqual(
    testable.map((m) => m.modelId).sort(),
    ["gen4.5", "gen4_turbo", "seedance2_fast", "veo3.1_fast"].sort(),
  );
  for (const model of testable) {
    assert.equal(model.defaultDurationSeconds, ROUND_A_DURATION_SECONDS);
    const quote = quoteVideoCost({
      modelId: model.modelId,
      durationSeconds: ROUND_A_DURATION_SECONDS,
      generateAudio: model.returnsAudio,
      portraitRatio: ROUND_A_PORTRAIT_RATIO,
    });
    assert.ok(quote.usd > 0);
    assert.ok(quote.credits > 0);
  }
});

await check("round A 4s prices and total $2.44", () => {
  const turbo = quoteVideoCost({
    modelId: "gen4_turbo",
    durationSeconds: 4,
  });
  assert.equal(turbo.credits, 20);
  assert.equal(turbo.usd, 0.2);
  assert.equal(turbo.generateAudio, false);

  const quality = quoteVideoCost({ modelId: "gen4.5", durationSeconds: 4 });
  assert.equal(quality.credits, 48);
  assert.equal(quality.usd, 0.48);

  const veo = quoteVideoCost({
    modelId: "veo3.1_fast",
    durationSeconds: 4,
    generateAudio: true,
  });
  assert.equal(veo.credits, 60);
  assert.equal(veo.usd, 0.6);
  assert.equal(veo.generateAudio, true);

  const seedance = quoteVideoCost({
    modelId: "seedance2_fast",
    durationSeconds: 4,
  });
  assert.equal(seedance.credits, 116);
  assert.equal(seedance.usd, 1.16);

  const roundA = quoteRoundA();
  assert.equal(roundA.durationSeconds, 4);
  assert.equal(roundA.ratio, "720:1280");
  assert.equal(roundA.totalCredits, 244);
  assert.equal(roundA.totalUsd, 2.44);
});

await check("unsupported model cannot be quoted or run", async () => {
  assert.equal(getVideoModel("gemini_omni_flash")?.status, "unsupported");
  assert.throws(() =>
    quoteVideoCost({ modelId: "gemini_omni_flash", durationSeconds: 5 }),
  );
  assert.throws(() =>
    quoteVideoCost({ modelId: "not-a-model", durationSeconds: 5 }),
  );
  const created: string[] = [];
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "slow push in",
          modelId: "gemini_omni_flash",
          durationSeconds: ROUND_A_DURATION_SECONDS,
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
          maxCostUsd: 10,
        },
        {
          supabase: makeFakeSupabase() as never,
          videoProvider: fakeVideoProvider(created),
          env: { AI_MEDIA_BENCHMARK_VIDEO_ENABLED: "true", RUNWAYML_API_SECRET: "x" },
        },
      ),
    /video_model_unsupported/,
  );
  assert.equal(created.length, 0);
});

await check("veo duration 5 is rejected", () => {
  assert.throws(() =>
    quoteVideoCost({ modelId: "veo3.1_fast", durationSeconds: 5 }),
  );
});

await check("audio capability flags are correct", () => {
  assert.equal(getVideoModel("gen4_turbo")?.returnsAudio, false);
  assert.equal(getVideoModel("gen4.5")?.returnsAudio, false);
  assert.equal(getVideoModel("veo3.1_fast")?.returnsAudio, true);
  assert.equal(getVideoModel("seedance2_fast")?.returnsAudio, true);
});

await check("voice and sound quotes", () => {
  const eleven = quoteVoiceCost({
    candidateId: "runway-eleven-multilingual-v2-maya",
    text: "Hello world",
  });
  assert.equal(eleven.credits, 1);
  assert.equal(eleven.usd, 0.01);
  const openai = quoteVoiceCost({
    candidateId: "openai-gpt-4o-mini-tts-alloy",
    text: "Hello",
  });
  assert.equal(openai.usd, null);
  assert.equal(openai.completeness, "rates_output_unknown");
  const sfx = quoteSoundCost({
    candidateId: "runway-eleven-sfx-v2",
    durationSeconds: 4,
  });
  assert.equal(sfx.credits, 4);
  assert.equal(sfx.usd, 0.04);
  assert.throws(() =>
    quoteSoundCost({ candidateId: "runway-seed-audio-sfx", durationSeconds: 4 }),
  );
});

await check("feature flags default false", () => {
  assert.equal(isBenchmarkVideoEnabled({}), false);
  assert.equal(isBenchmarkVoiceEnabled({}), false);
  assert.equal(isBenchmarkSoundEnabled({}), false);
  assert.equal(isBenchmarkTextVideoEnabled({}), false);
  assert.equal(isBenchmarkVideoEnabled({ AI_MEDIA_BENCHMARK_VIDEO_ENABLED: "true" }), true);
  const example = readFileSync(join(ROOT, ".env.example"), "utf8");
  assert.match(example, /AI_MEDIA_BENCHMARK_VIDEO_ENABLED=false/);
  assert.match(example, /AI_MEDIA_BENCHMARK_VOICE_ENABLED=false/);
  assert.match(example, /AI_MEDIA_BENCHMARK_SOUND_ENABLED=false/);
  assert.match(example, /AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED=false/);
  assert.equal(AI_MEDIA_BENCHMARK_VIDEO_FLAG, "AI_MEDIA_BENCHMARK_VIDEO_ENABLED");
  assert.equal(AI_MEDIA_BENCHMARK_VOICE_FLAG, "AI_MEDIA_BENCHMARK_VOICE_ENABLED");
  assert.equal(AI_MEDIA_BENCHMARK_SOUND_FLAG, "AI_MEDIA_BENCHMARK_SOUND_ENABLED");
  assert.equal(AI_MEDIA_BENCHMARK_TEXT_VIDEO_FLAG, "AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED");
});

await check("without flag / confirmation / key there is no provider call", async () => {
  const created: string[] = [];
  const deps = {
    supabase: makeFakeSupabase() as never,
    videoProvider: fakeVideoProvider(created),
    env: {} as NodeJS.ProcessEnv,
  };
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "slow push in",
          modelId: "gen4_turbo",
          durationSeconds: ROUND_A_DURATION_SECONDS,
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
          maxCostUsd: 0.2,
        },
        deps,
      ),
    /video_benchmark_disabled/,
  );
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "slow push in",
          modelId: "gen4_turbo",
          durationSeconds: ROUND_A_DURATION_SECONDS,
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: false,
          maxCostUsd: 0.2,
        },
        {
          ...deps,
          env: { AI_MEDIA_BENCHMARK_VIDEO_ENABLED: "true" },
        },
      ),
    /paid_confirmation_required/,
  );
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "slow push in",
          modelId: "gen4_turbo",
          durationSeconds: ROUND_A_DURATION_SECONDS,
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
          maxCostUsd: 0.2,
        },
        {
          supabase: makeFakeSupabase() as never,
          env: { AI_MEDIA_BENCHMARK_VIDEO_ENABLED: "true" },
        },
      ),
    /missing_api_key/,
  );
  assert.equal(created.length, 0);
});

await check("one create call runs exactly one selected model", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const run = await createVideoBenchmarkRun(
    {
      projectId: PROJECT_A,
      videoJobId: JOB_A,
      sceneId: "scene-1",
      motionPrompt: "slow push in",
      modelId: "gen4.5",
      durationSeconds: ROUND_A_DURATION_SECONDS,
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
      maxCostUsd: 0.48,
    },
    {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(created),
      env: {
        AI_MEDIA_BENCHMARK_VIDEO_ENABLED: "true",
        RUNWAYML_API_SECRET: "secret",
      },
    },
  );
  assert.deepEqual(created, ["gen4.5"]);
  assert.equal(run.model, "gen4.5");
  assert.equal(run.estimatedCostUsd, 0.48);
  assert.equal(run.outputContainsAudio, false);
  assert.equal(run.reusedExistingRequest, false);
});

await check("video results of the same case can be listed together", async () => {
  const supabase = makeFakeSupabase();
  const env = {
    AI_MEDIA_BENCHMARK_VIDEO_ENABLED: "true",
    RUNWAYML_API_SECRET: "secret",
  };
  await createVideoBenchmarkRun(
    {
      projectId: PROJECT_A,
      videoJobId: JOB_A,
      sceneId: "scene-1",
      motionPrompt: "slow push in",
      modelId: "gen4_turbo",
      durationSeconds: ROUND_A_DURATION_SECONDS,
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
      maxCostUsd: 0.2,
    },
    { supabase: supabase as never, videoProvider: fakeVideoProvider(), env },
  );
  await createVideoBenchmarkRun(
    {
      projectId: PROJECT_A,
      videoJobId: JOB_A,
      sceneId: "scene-1",
      motionPrompt: "slow push in",
      modelId: "gen4.5",
      durationSeconds: ROUND_A_DURATION_SECONDS,
      clientRequestId: REQUEST_2,
      confirmPaidGeneration: true,
      maxCostUsd: 0.48,
    },
    { supabase: supabase as never, videoProvider: fakeVideoProvider(), env },
  );
  const listed = await listBenchmarkRuns(
    { projectId: PROJECT_A, testType: "video", caseId: "portrait-scene-a" },
    { supabase: supabase as never },
  );
  assert.equal(listed.length, 2);
  assert.deepEqual(listed.map((r) => r.model).sort(), ["gen4.5", "gen4_turbo"]);
});

await check("voice fake provider works offline", async () => {
  const supabase = makeFakeSupabase();
  let calls = 0;
  const run = await createVoiceBenchmarkRun(
    {
      projectId: PROJECT_A,
      candidateId: "openai-gpt-4o-mini-tts-alloy",
      text: "Tento krátký test.",
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
    },
    {
      supabase: supabase as never,
      env: { AI_MEDIA_BENCHMARK_VOICE_ENABLED: "true", OPENAI_API_KEY: "sk" },
      voiceProvider: {
        async synthesize() {
          calls += 1;
          return {
            provider: "openai",
            model: "gpt-4o-mini-tts",
            voiceId: "alloy",
            durationSeconds: 1.2,
            estimatedCostUsd: null,
            estimatedCredits: null,
            latencyMs: 12,
            audioBase64: Buffer.from("mp3").toString("base64"),
            error: null,
          };
        },
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(run.status, "succeeded");
  assert.equal(run.audioRole, "voiceover");
  assert.equal(run.voiceId, "alloy");
});

await check("sound fake provider works offline", async () => {
  const supabase = makeFakeSupabase();
  let calls = 0;
  const run = await createSoundBenchmarkRun(
    {
      projectId: PROJECT_A,
      candidateId: "runway-eleven-sfx-v2",
      promptText: "Quiet room tone, no music",
      durationSeconds: 4,
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
      maxCostUsd: 0.04,
    },
    {
      supabase: supabase as never,
      env: { AI_MEDIA_BENCHMARK_SOUND_ENABLED: "true", RUNWAYML_API_SECRET: "x" },
      audioProvider: {
        async createTextToSpeech() {
          throw new Error("not used");
        },
        async createSoundEffect(args) {
          calls += 1;
          assert.equal(args.model, "eleven_text_to_sound_v2");
          return {
            provider: "runway",
            providerTaskId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            status: "pending",
            model: args.model,
          };
        },
        async getAudioTask(id) {
          return {
            provider: "runway",
            providerTaskId: id,
            status: "pending",
            model: "eleven_text_to_sound_v2",
          };
        },
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(run.audioRole, "ambient_sfx");
  assert.equal(run.model, "eleven_text_to_sound_v2");
});

await check("rating 1-5 accepted, invalid rejected, note limited", async () => {
  assert.equal(parseBenchmarkRating(3), 3);
  assert.throws(() => parseBenchmarkRating(0), /rating_invalid/);
  assert.throws(() => parseBenchmarkRating(6), /rating_invalid/);
  assert.throws(() => parseBenchmarkRating(2.5), /rating_invalid/);
  assert.equal(parseBenchmarkNote("ok"), "ok");
  assert.throws(() => parseBenchmarkNote("x".repeat(501)), /note_too_long/);
  const supabase = makeFakeSupabase();
  const created = await createVideoBenchmarkRun(
    {
      projectId: PROJECT_A,
      videoJobId: JOB_A,
      sceneId: "scene-1",
      motionPrompt: "slow push in",
      modelId: "gen4_turbo",
      durationSeconds: ROUND_A_DURATION_SECONDS,
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
      maxCostUsd: 0.2,
    },
    {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(),
      env: {
        AI_MEDIA_BENCHMARK_VIDEO_ENABLED: "true",
        RUNWAYML_API_SECRET: "x",
      },
    },
  );
  const rated = await rateBenchmarkRun(
    { runId: created.id, projectId: PROJECT_A, rating: 5, note: "clear motion" },
    { supabase: supabase as never },
  );
  assert.equal(rated.rating, 5);
  assert.equal(rated.note, "clear motion");
});

await check("no run-all API exists", () => {
  const dir = join(ROOT, "app/api/admin/ai-media-benchmark");
  const names = readdirSync(dir, { recursive: true }).map(String);
  assert.equal(names.some((n) => /run-all|runAll|run_all/i.test(n)), false);
  const panel = readFileSync(
    join(ROOT, "components/settings/AiMediaBenchmarkPanel/AiMediaBenchmarkPanel.tsx"),
    "utf8",
  );
  assert.doesNotMatch(panel, /spustit všechny|run all models|sestavit všechny/i);
});

await check("production remains still and AI-video flag stays off", () => {
  assert.equal(parseVideoJobRenderOptions({}).ok, true);
  if (parseVideoJobRenderOptions({}).ok) {
    assert.equal(parseVideoJobRenderOptions({}).mode, "still");
  }
  assert.equal(isSceneVideoGenerationEnabled({}), false);
  const example = readFileSync(join(ROOT, ".env.example"), "utf8");
  assert.match(example, /SCENE_VIDEO_GENERATION_ENABLED=false/);
  assert.equal(SCENE_VIDEO_PLAN_DEFAULT_MODEL, "gen4_turbo");
});

await check("native ElevenLabs remains unsupported", () => {
  assert.equal(
    VOICE_CANDIDATES.find((c) => c.candidateId === "elevenlabs-native")?.status,
    "unsupported",
  );
  assert.equal(
    SOUND_CANDIDATES.find((c) => c.candidateId === "runway-seed-audio-sfx")?.status,
    "unsupported",
  );
});

await check("round A create rejects duration other than 4s", async () => {
  const created: string[] = [];
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "slow push in",
          modelId: "gen4_turbo",
          durationSeconds: 5,
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
          maxCostUsd: 0.25,
        },
        {
          supabase: makeFakeSupabase() as never,
          videoProvider: fakeVideoProvider(created),
          env: VIDEO_ENV,
        },
      ),
    /duration_must_be_round_a/,
  );
  assert.equal(created.length, 0);
});

await check("gemini audio metadata does not claim the model cannot emit audio", () => {
  const gemini = getVideoModel("gemini_omni_flash");
  assert.equal(gemini?.status, "unsupported");
  assert.equal(gemini?.i2vAudioRequest, "undocumented");
  assert.match(gemini?.unsupportedReason ?? "", /no `audio` field/i);
  assert.doesNotMatch(
    `${gemini?.unsupportedReason ?? ""} ${gemini?.i2vAudioNote ?? ""}`,
    /cannot produce audio|does not generate audio|no generated scene audio|zvuk neumí/i,
  );
  const body = buildDocumentedGeminiOmniFlashImageToVideoBody({
    imageUrl: "https://cdn.example.com/scene.png",
    promptText: "slow push in",
    duration: 4,
    ratio: "720:1280",
  });
  assert.equal(body.model, "gemini_omni_flash");
  assert.equal(body.audio, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(body, "audio"), false);
  assert.throws(
    () =>
      buildDocumentedGeminiOmniFlashImageToVideoBody({
        imageUrl: "https://cdn.example.com/scene.png",
        promptText: "slow push in",
        duration: 4,
        ratio: "720:1280",
        generateAudio: true,
      }),
    /does not document an `audio` field/,
  );
});

await check("Runway TTS uses eleven_multilingual_v2 and Maya preset", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const supabase = makeFakeSupabase();
  const run = await createVoiceBenchmarkRun(
    {
      projectId: PROJECT_A,
      candidateId: "runway-eleven-multilingual-v2-maya",
      text: DEFAULT_VOICE_SCRIPT,
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
      maxCostUsd: 0.05,
    },
    {
      supabase: supabase as never,
      env: {
        AI_MEDIA_BENCHMARK_VOICE_ENABLED: "true",
        RUNWAYML_API_SECRET: "x",
      },
      audioProvider: {
        async createTextToSpeech(args) {
          calls.push({ ...args });
          return {
            provider: "runway",
            providerTaskId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            status: "pending",
            model: args.model ?? "missing",
          };
        },
        async createSoundEffect() {
          throw new Error("not used");
        },
        async getAudioTask(id) {
          return {
            provider: "runway",
            providerTaskId: id,
            status: "pending",
            model: RUNWAY_TTS_MODEL,
          };
        },
      },
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.model, RUNWAY_TTS_MODEL);
  assert.equal(calls[0]?.voicePresetId, RUNWAY_TTS_PRESET_MAYA);
  assert.equal(calls[0]?.promptText, DEFAULT_VOICE_SCRIPT);
  assert.equal(run.model, RUNWAY_TTS_MODEL);
  assert.equal(run.voiceId, RUNWAY_TTS_PRESET_MAYA);
  const candidate = VOICE_CANDIDATES.find(
    (c) => c.candidateId === "runway-eleven-multilingual-v2-maya",
  );
  assert.equal(candidate?.ttsHost, "runway_hosted_elevenlabs");
  assert.match(candidate?.displayName ?? "", /not native ElevenLabs/i);
  assert.equal(
    VOICE_CANDIDATES.some((c) => c.modelId === "eleven_v3" && c.status === "testable"),
    false,
  );
});

await check("OpenAI benchmark receives energetic delivery instructions", async () => {
  const captured: SpeechRequest[] = [];
  const speech: SpeechProvider = {
    name: "openai",
    async synthesize(req) {
      captured.push(req);
      return {
        provider: "openai",
        model: req.model ?? "gpt-4o-mini-tts",
        audioBase64: Buffer.from("mp3").toString("base64"),
      };
    },
  };
  const voice = createOpenAiBenchmarkVoiceProvider(speech);
  const candidate = requireVoiceCandidate("openai-gpt-4o-mini-tts-alloy");
  await voice.synthesize({ candidate, text: DEFAULT_VOICE_SCRIPT });
  assert.equal(captured.length, 1);
  assert.equal(captured[0]?.text, DEFAULT_VOICE_SCRIPT);
  assert.equal(captured[0]?.instructions, OPENAI_BENCHMARK_TTS_INSTRUCTIONS);
  assert.match(captured[0]?.instructions ?? "", /energicky/);
  assert.doesNotMatch(DEFAULT_VOICE_SCRIPT, /energicky/);

  const supabase = makeFakeSupabase();
  const openaiRun = await createVoiceBenchmarkRun(
    {
      projectId: PROJECT_A,
      candidateId: "openai-gpt-4o-mini-tts-alloy",
      text: DEFAULT_VOICE_SCRIPT,
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
    },
    {
      supabase: supabase as never,
      env: { AI_MEDIA_BENCHMARK_VOICE_ENABLED: "true", OPENAI_API_KEY: "sk" },
      voiceProvider: voice,
    },
  );
  assert.equal(openaiRun.settings.text, DEFAULT_VOICE_SCRIPT);
  assert.equal(
    openaiRun.settings.openaiTtsInstructions,
    OPENAI_BENCHMARK_TTS_INSTRUCTIONS,
  );

  const runwayCalls: Array<Record<string, unknown>> = [];
  const runwayRun = await createVoiceBenchmarkRun(
    {
      projectId: PROJECT_A,
      candidateId: "runway-eleven-multilingual-v2-maya",
      text: DEFAULT_VOICE_SCRIPT,
      clientRequestId: REQUEST_2,
      confirmPaidGeneration: true,
      maxCostUsd: 0.05,
    },
    {
      supabase: supabase as never,
      env: {
        AI_MEDIA_BENCHMARK_VOICE_ENABLED: "true",
        RUNWAYML_API_SECRET: "x",
      },
      audioProvider: {
        async createTextToSpeech(args) {
          runwayCalls.push({ ...args });
          return {
            provider: "runway",
            providerTaskId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            status: "pending",
            model: args.model ?? "missing",
          };
        },
        async createSoundEffect() {
          throw new Error("not used");
        },
        async getAudioTask(id) {
          return {
            provider: "runway",
            providerTaskId: id,
            status: "pending",
            model: RUNWAY_TTS_MODEL,
          };
        },
      },
    },
  );
  assert.equal(runwayCalls[0]?.promptText, DEFAULT_VOICE_SCRIPT);
  assert.equal(runwayRun.settings.text, openaiRun.settings.text);
  assert.equal(runwayRun.settings.openaiTtsInstructions, null);

  const panel = readFileSync(
    join(ROOT, "components/settings/AiMediaBenchmarkPanel/AiMediaBenchmarkPanel.tsx"),
    "utf8",
  );
  assert.match(panel, /reprezentativní energický hlas od každého poskytovatele/);
  assert.match(panel, /ne jednoho univerzálního produkčního hlasu/);

  const productionTts = readFileSync(
    join(ROOT, "lib/voice/buildTtsInstructions.ts"),
    "utf8",
  );
  assert.doesNotMatch(productionTts, /OPENAI_BENCHMARK_TTS_INSTRUCTIONS/);
  assert.doesNotMatch(productionTts, /moderátor krátkého videa pro sociální sítě/);
});

function seedSubmittingRun(
  fake: ReturnType<typeof makeFakeSupabase>,
  args: { owner: string; claimedAt: string; clientRequestId?: string; status?: string },
) {
  const id = crypto.randomUUID();
  const row = {
    id,
    case_id: "portrait-scene-a",
    test_type: "video",
    audio_role: "none",
    project_id: PROJECT_A,
    client_request_id: args.clientRequestId ?? REQUEST_1,
    source_video_job_id: JOB_A,
    source_scene_id: "scene-1",
    source_image_bucket: "video-renders",
    source_image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
    provider: "runway",
    model: "gen4_turbo",
    voice_id: null,
    settings: {
      generationMode: "image_to_video",
      durationSeconds: 4,
      ratio: "720:1280",
      generateAudio: false,
      motionPrompt: "slow push in",
      maxCostUsd: 0.2,
      estimatedCostUsd: 0.2,
      estimatedCredits: 20,
    },
    provider_task_id: null,
    submission_claim_owner: args.owner,
    submission_claimed_at: args.claimedAt,
    status: args.status ?? "submitting",
    estimated_credits: 20,
    estimated_cost_usd: 0.2,
    duration_seconds: 4,
    latency_ms: null,
    output_contains_audio: false,
    output_bucket: null,
    output_path: null,
    error_message: null,
    failure_code: null,
    rating: null,
    note: null,
    created_at: args.claimedAt,
    updated_at: args.claimedAt,
    completed_at: null,
  };
  fake._runs.set(id, row);
  return row;
}

await check("concurrent same client_request_id posts once", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const input = {
    projectId: PROJECT_A,
    videoJobId: JOB_A,
    sceneId: "scene-1",
    motionPrompt: "slow push in",
    modelId: "gen4_turbo" as const,
    durationSeconds: ROUND_A_DURATION_SECONDS,
    clientRequestId: REQUEST_1,
    confirmPaidGeneration: true,
    maxCostUsd: 0.2,
  };
  const [first, second] = await Promise.all([
    createVideoBenchmarkRun(input, {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(created),
      env: VIDEO_ENV,
      submissionClaimOwner: "owner-a",
    }),
    createVideoBenchmarkRun(input, {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(created),
      env: VIDEO_ENV,
      submissionClaimOwner: "owner-b",
    }),
  ]);
  assert.equal(created.length, 1);
  assert.equal(first.id, second.id);
  const statuses = [first.status, second.status].sort();
  assert.ok(statuses.includes("pending") || statuses.every((s) => s === "pending" || s === "submitting"));
});

await check("I2V same client_request_id with other inputs does not POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const base = {
    projectId: PROJECT_A,
    videoJobId: JOB_A,
    sceneId: "scene-1",
    motionPrompt: "slow push in",
    modelId: "gen4_turbo" as const,
    durationSeconds: ROUND_A_DURATION_SECONDS,
    clientRequestId: REQUEST_1,
    confirmPaidGeneration: true,
    maxCostUsd: 0.2,
  };
  await createVideoBenchmarkRun(base, {
    supabase: supabase as never,
    videoProvider: fakeVideoProvider(created),
    env: VIDEO_ENV,
  });
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        { ...base, motionPrompt: "fast pan across the room" },
        {
          supabase: supabase as never,
          videoProvider: fakeVideoProvider(created),
          env: VIDEO_ENV,
        },
      ),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        { ...base, modelId: "gen4.5", maxCostUsd: 0.48 },
        {
          supabase: supabase as never,
          videoProvider: fakeVideoProvider(created),
          env: VIDEO_ENV,
        },
      ),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        { ...base, maxCostUsd: 0.5 },
        {
          supabase: supabase as never,
          videoProvider: fakeVideoProvider(created),
          env: VIDEO_ENV,
        },
      ),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  assert.equal(created.length, 1);

  const raced: string[] = [];
  const raceDb = makeFakeSupabase();
  const racedResults = await Promise.allSettled([
    createVideoBenchmarkRun(base, {
      supabase: raceDb as never,
      videoProvider: fakeVideoProvider(raced),
      env: VIDEO_ENV,
      submissionClaimOwner: "owner-a",
    }),
    createVideoBenchmarkRun(
      { ...base, motionPrompt: "other motion" },
      {
        supabase: raceDb as never,
        videoProvider: fakeVideoProvider(raced),
        env: VIDEO_ENV,
        submissionClaimOwner: "owner-b",
      },
    ),
  ]);
  assert.ok(raced.length <= 1);
  assert.ok(
    racedResults.some(
      (item) =>
        item.status === "rejected" &&
        item.reason instanceof Error &&
        item.reason.message === BENCHMARK_REQUEST_INPUT_MISMATCH,
    ),
  );
});

await check("active claim blocks a second POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  seedSubmittingRun(supabase, {
    owner: "other-owner",
    claimedAt: new Date().toISOString(),
  });
  const run = await createVideoBenchmarkRun(
    {
      projectId: PROJECT_A,
      videoJobId: JOB_A,
      sceneId: "scene-1",
      motionPrompt: "slow push in",
      modelId: "gen4_turbo",
      durationSeconds: ROUND_A_DURATION_SECONDS,
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
      maxCostUsd: 0.2,
    },
    {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(created),
      env: VIDEO_ENV,
      submissionClaimOwner: "this-owner",
    },
  );
  assert.equal(created.length, 0);
  assert.equal(run.status, "submitting");
});

await check("stale claim becomes submission_unknown without POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const now = new Date("2026-08-18T12:00:00.000Z");
  seedSubmittingRun(supabase, {
    owner: "old-owner",
    claimedAt: new Date(now.getTime() - 6 * 60 * 1000).toISOString(),
  });
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "slow push in",
          modelId: "gen4_turbo",
          durationSeconds: ROUND_A_DURATION_SECONDS,
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
          maxCostUsd: 0.2,
        },
        {
          supabase: supabase as never,
          videoProvider: fakeVideoProvider(created),
          env: VIDEO_ENV,
          now: () => now,
          submissionClaimOwner: "new-owner",
        },
      ),
    /submission_unknown/,
  );
  assert.equal(created.length, 0);
  const row = [...supabase._runs.values()][0];
  assert.equal(row?.status, "submission_unknown");
});

await check("timeout during provider create → submission_unknown", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const provider = fakeVideoProvider(created);
  provider.createImageToVideo = async (req) => {
    created.push(req.model ?? "missing");
    throw new VideoGenerationError("provider timeout", { code: "timeout" });
  };
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "slow push in",
          modelId: "gen4_turbo",
          durationSeconds: ROUND_A_DURATION_SECONDS,
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
          maxCostUsd: 0.2,
        },
        { supabase: supabase as never, videoProvider: provider, env: VIDEO_ENV },
      ),
    /submission_unknown/,
  );
  assert.equal(created.length, 1);
  assert.equal([...supabase._runs.values()][0]?.status, "submission_unknown");
});

await check("provider 5xx → submission_unknown", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const provider = fakeVideoProvider(created);
  provider.createImageToVideo = async (req) => {
    created.push(req.model ?? "missing");
    throw new VideoGenerationError("upstream 503", {
      code: "http_error",
      httpStatus: 503,
    });
  };
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "slow push in",
          modelId: "gen4_turbo",
          durationSeconds: ROUND_A_DURATION_SECONDS,
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
          maxCostUsd: 0.2,
        },
        { supabase: supabase as never, videoProvider: provider, env: VIDEO_ENV },
      ),
    /submission_unknown/,
  );
  assert.equal(created.length, 1);
  assert.equal([...supabase._runs.values()][0]?.status, "submission_unknown");
});

await check("error before POST is failed and does not POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase({ failSignedUrl: true });
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "slow push in",
          modelId: "gen4_turbo",
          durationSeconds: ROUND_A_DURATION_SECONDS,
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
          maxCostUsd: 0.2,
        },
        {
          supabase: supabase as never,
          videoProvider: fakeVideoProvider(created),
          env: VIDEO_ENV,
        },
      ),
    /source_signed_url_failed/,
  );
  assert.equal(created.length, 0);
  assert.equal([...supabase._runs.values()][0]?.status, "failed");
});

await check("submission_unknown does not auto-retry paid POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  seedSubmittingRun(supabase, {
    owner: "old-owner",
    claimedAt: "2026-08-18T11:00:00.000Z",
    status: "submission_unknown",
  });
  const row = [...supabase._runs.values()][0]!;
  row.submission_claim_owner = null;
  row.submission_claimed_at = null;
  await assert.rejects(
    () =>
      createVideoBenchmarkRun(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "slow push in",
          modelId: "gen4_turbo",
          durationSeconds: ROUND_A_DURATION_SECONDS,
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
          maxCostUsd: 0.2,
        },
        {
          supabase: supabase as never,
          videoProvider: fakeVideoProvider(created),
          env: VIDEO_ENV,
        },
      ),
    /submission_unknown/,
  );
  assert.equal(created.length, 0);
});

await check("OpenAI TTS same client_request_id does not synthesize twice", async () => {
  let calls = 0;
  const supabase = makeFakeSupabase();
  const deps = {
    supabase: supabase as never,
    env: { AI_MEDIA_BENCHMARK_VOICE_ENABLED: "true", OPENAI_API_KEY: "sk" },
    voiceProvider: {
      async synthesize() {
        calls += 1;
        return {
          provider: "openai",
          model: "gpt-4o-mini-tts",
          voiceId: "alloy",
          durationSeconds: 1.2,
          estimatedCostUsd: null,
          estimatedCredits: null,
          latencyMs: 12,
          audioBase64: Buffer.from("mp3").toString("base64"),
          error: null,
        };
      },
    },
  };
  const first = await createVoiceBenchmarkRun(
    {
      projectId: PROJECT_A,
      candidateId: "openai-gpt-4o-mini-tts-alloy",
      text: "Tento krátký test.",
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
    },
    deps,
  );
  const second = await createVoiceBenchmarkRun(
    {
      projectId: PROJECT_A,
      candidateId: "openai-gpt-4o-mini-tts-alloy",
      text: "Tento krátký test.",
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
    },
    deps,
  );
  assert.equal(calls, 1);
  assert.equal(first.id, second.id);
  assert.equal(first.status, "succeeded");
  assert.equal(second.status, "succeeded");
});

await check("voice and sound same client_request_id reject changed inputs", async () => {
  let voiceCalls = 0;
  const supabaseVoice = makeFakeSupabase();
  const voiceDeps = {
    supabase: supabaseVoice as never,
    env: { AI_MEDIA_BENCHMARK_VOICE_ENABLED: "true", OPENAI_API_KEY: "sk" },
    voiceProvider: {
      async synthesize() {
        voiceCalls += 1;
        return {
          provider: "openai",
          model: "gpt-4o-mini-tts",
          voiceId: "alloy",
          durationSeconds: 1.2,
          estimatedCostUsd: null,
          estimatedCredits: null,
          latencyMs: 12,
          audioBase64: Buffer.from("mp3").toString("base64"),
          error: null,
        };
      },
    },
  };
  await createVoiceBenchmarkRun(
    {
      projectId: PROJECT_A,
      candidateId: "openai-gpt-4o-mini-tts-alloy",
      text: "Tento krátký test.",
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
    },
    voiceDeps,
  );
  await assert.rejects(
    () =>
      createVoiceBenchmarkRun(
        {
          projectId: PROJECT_A,
          candidateId: "openai-gpt-4o-mini-tts-alloy",
          text: "Úplně jiný text hlasu.",
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
        },
        voiceDeps,
      ),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  assert.equal(voiceCalls, 1);

  let soundCalls = 0;
  const supabaseSound = makeFakeSupabase();
  const soundDeps = {
    supabase: supabaseSound as never,
    env: { AI_MEDIA_BENCHMARK_SOUND_ENABLED: "true", RUNWAYML_API_SECRET: "x" },
    audioProvider: {
      async createTextToSpeech() {
        throw new Error("not used");
      },
      async createSoundEffect() {
        soundCalls += 1;
        return {
          provider: "runway",
          providerTaskId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          status: "pending" as const,
          model: "eleven_text_to_sound_v2",
        };
      },
      async getAudioTask(id: string) {
        return {
          provider: "runway" as const,
          providerTaskId: id,
          status: "pending" as const,
          model: "eleven_text_to_sound_v2",
        };
      },
    },
  };
  await createSoundBenchmarkRun(
    {
      projectId: PROJECT_A,
      candidateId: "runway-eleven-sfx-v2",
      promptText: "Quiet room tone, no music",
      durationSeconds: 4,
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
      maxCostUsd: 0.04,
    },
    soundDeps,
  );
  await assert.rejects(
    () =>
      createSoundBenchmarkRun(
        {
          projectId: PROJECT_A,
          candidateId: "runway-eleven-sfx-v2",
          promptText: "Loud factory noise",
          durationSeconds: 4,
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
          maxCostUsd: 0.04,
        },
        soundDeps,
      ),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  await assert.rejects(
    () =>
      createSoundBenchmarkRun(
        {
          projectId: PROJECT_A,
          candidateId: "runway-eleven-sfx-v2",
          promptText: "Quiet room tone, no music",
          durationSeconds: 4,
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
          maxCostUsd: 0.2,
        },
        soundDeps,
      ),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  assert.equal(soundCalls, 1);
});

await check("migration 039 exists and 038 is unchanged", () => {
  const names = readdirSync(join(ROOT, "supabase/migrations"));
  assert.ok(names.includes("039_ai_media_benchmark_submission_claim.sql"));
  const sql039 = readFileSync(
    join(ROOT, "supabase/migrations/039_ai_media_benchmark_submission_claim.sql"),
    "utf8",
  );
  assert.match(sql039, /submitting/);
  assert.match(sql039, /submission_unknown/);
  assert.match(sql039, /ai_media_benchmark_runs_submission_claim_integrity/);
  assert.match(sql039, /ai_media_benchmark_runs_provider_task_uniq/);
  const sql038 = readFileSync(
    join(ROOT, "supabase/migrations/038_ai_media_benchmark_runs.sql"),
    "utf8",
  );
  assert.doesNotMatch(sql038, /submission_unknown/);
  assert.doesNotMatch(sql038, /submission_claim_owner/);
});

await check("all feature flags default false", () => {
  assert.equal(isBenchmarkVideoEnabled({}), false);
  assert.equal(isBenchmarkVoiceEnabled({}), false);
  assert.equal(isBenchmarkSoundEnabled({}), false);
  assert.equal(isBenchmarkTextVideoEnabled({}), false);
  assert.equal(isSceneVideoGenerationEnabled({}), false);
});

function hangingFetch(): typeof fetch {
  return (async (_url, init) => {
    await new Promise((_, reject) => {
      const signal = init?.signal;
      const abort = () => {
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      };
      if (signal?.aborted) {
        abort();
        return;
      }
      signal?.addEventListener("abort", abort, { once: true });
    });
    throw new Error("unreachable");
  }) as typeof fetch;
}

function okDownloadFetch(): typeof fetch {
  return (async () =>
    new Response(Buffer.from("fake-mp4"), {
      status: 200,
      headers: { "content-type": "video/mp4" },
    })) as typeof fetch;
}

function slowBodyFetch(delayMs: number): typeof fetch {
  return (async (_url, init) => {
    const stream = new ReadableStream({
      async start(controller) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (init?.signal?.aborted) {
          const err = new Error("Aborted");
          err.name = "AbortError";
          controller.error(err);
          return;
        }
        controller.enqueue(new Uint8Array([1, 2, 3, 4]));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "content-type": "video/mp4" },
    });
  }) as typeof fetch;
}

async function startVideoRun(args: {
  supabase: ReturnType<typeof makeFakeSupabase>;
  created: string[];
  gets: string[];
  waits: string[];
  clientRequestId?: string;
}) {
  return createVideoBenchmarkRun(
    {
      projectId: PROJECT_A,
      videoJobId: JOB_A,
      sceneId: "scene-1",
      motionPrompt: "slow push in",
      modelId: "gen4_turbo",
      durationSeconds: ROUND_A_DURATION_SECONDS,
      clientRequestId: args.clientRequestId ?? REQUEST_1,
      confirmPaidGeneration: true,
      maxCostUsd: 0.2,
    },
    {
      supabase: args.supabase as never,
      videoProvider: fakeVideoProvider(args.created, {
        gets: args.gets,
        waits: args.waits,
        getStatus: "succeeded",
      }),
      env: VIDEO_ENV,
    },
  );
}

await check("provider create is short and does not wait for generation", async () => {
  const created: string[] = [];
  const waits: string[] = [];
  const supabase = makeFakeSupabase();
  const run = await startVideoRun({
    supabase,
    created,
    gets: [],
    waits,
  });
  assert.equal(created.length, 1);
  assert.equal(waits.length, 0);
  assert.equal(run.status, "pending");
  assert.ok(run.providerTaskId);
  const src = readFileSync(join(ROOT, "lib/ai-media-benchmark/service.ts"), "utf8");
  assert.doesNotMatch(src, /waitForImageToVideo/);
  assert.equal(AI_MEDIA_BENCHMARK_DOWNLOAD_TIMEOUT_MS, 120_000);
  assert.equal(AI_MEDIA_BENCHMARK_VERCEL_MAX_DURATION_SECONDS, 180);
  assert.ok(AI_MEDIA_BENCHMARK_DOWNLOAD_TIMEOUT_MS < AI_MEDIA_BENCHMARK_VERCEL_MAX_DURATION_SECONDS * 1000);
});

await check("slow download timeout keeps task id and does not POST again", async () => {
  const created: string[] = [];
  const gets: string[] = [];
  const waits: string[] = [];
  const supabase = makeFakeSupabase();
  const run = await startVideoRun({ supabase, created, gets, waits });
  const provider = fakeVideoProvider(created, {
    gets,
    waits,
    getStatus: "succeeded",
  });
  const synced = await syncBenchmarkRun(
    { runId: run.id, projectId: PROJECT_A },
    {
      supabase: supabase as never,
      videoProvider: provider,
      fetchImpl: hangingFetch(),
      downloadTimeoutMs: 40,
    },
  );
  assert.equal(created.length, 1);
  assert.equal(waits.length, 0);
  assert.equal(synced.status, "download_failed");
  assert.equal(synced.failureCode, "download_timeout");
  assert.equal(synced.providerTaskId, run.providerTaskId);
  assert.equal(supabase._uploads.length, 0);
});

await check("timeout before upload does not create a second provider task", async () => {
  const created: string[] = [];
  const gets: string[] = [];
  const waits: string[] = [];
  const supabase = makeFakeSupabase();
  const run = await startVideoRun({ supabase, created, gets, waits });
  const synced = await syncBenchmarkRun(
    { runId: run.id, projectId: PROJECT_A },
    {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(created, { gets, waits, getStatus: "succeeded" }),
      fetchImpl: slowBodyFetch(200),
      downloadTimeoutMs: 40,
    },
  );
  assert.equal(created.length, 1);
  assert.equal(synced.status, "download_failed");
  assert.equal(synced.providerTaskId, run.providerTaskId);
  assert.equal(supabase._uploads.length, 0);
});

await check("upload error is retryable download_failed without a new POST", async () => {
  const created: string[] = [];
  const gets: string[] = [];
  const waits: string[] = [];
  const uploadOpts = { failUpload: true };
  const supabase = makeFakeSupabase(uploadOpts);
  const run = await startVideoRun({ supabase, created, gets, waits });
  const first = await syncBenchmarkRun(
    { runId: run.id, projectId: PROJECT_A },
    {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(created, { gets, waits, getStatus: "succeeded" }),
      fetchImpl: okDownloadFetch(),
    },
  );
  assert.equal(first.status, "download_failed");
  assert.equal(first.failureCode, "upload_failed");
  assert.equal(first.providerTaskId, run.providerTaskId);
  uploadOpts.failUpload = false;
  const second = await syncBenchmarkRun(
    { runId: run.id, projectId: PROJECT_A },
    {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(created, { gets, waits, getStatus: "succeeded" }),
      fetchImpl: okDownloadFetch(),
    },
  );
  assert.equal(second.status, "succeeded");
  assert.equal(created.length, 1);
  assert.equal(waits.length, 0);
  assert.ok(second.outputPath?.includes(run.id));
});

await check("upload then interrupted DB write is recovered from existing file", async () => {
  const created: string[] = [];
  const gets: string[] = [];
  const waits: string[] = [];
  const supabase = makeFakeSupabase();
  const run = await startVideoRun({ supabase, created, gets, waits });
  let downloads = 0;
  const countingFetch: typeof fetch = (async (...args) => {
    downloads += 1;
    return okDownloadFetch()(...args);
  }) as typeof fetch;
  const first = await syncBenchmarkRun(
    { runId: run.id, projectId: PROJECT_A },
    {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(created, { gets, waits, getStatus: "succeeded" }),
      fetchImpl: countingFetch,
      afterOutputUploaded: async () => {
        throw new Error("killed_before_db");
      },
    },
  );
  assert.equal(first.status, "download_failed");
  assert.equal(first.failureCode, "finalize_interrupted");
  assert.equal(first.providerTaskId, run.providerTaskId);
  assert.ok(supabase._uploads.length >= 1);
  const downloadsAfterInterrupt = downloads;
  const recovered = await syncBenchmarkRun(
    { runId: run.id, projectId: PROJECT_A },
    {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(created, { gets, waits, getStatus: "succeeded" }),
      fetchImpl: countingFetch,
    },
  );
  assert.equal(recovered.status, "succeeded");
  assert.equal(downloads, downloadsAfterInterrupt);
  assert.equal(created.length, 1);
  assert.ok(recovered.outputPath?.includes(run.id));
});

await check("repeated status sync never creates another provider task", async () => {
  const created: string[] = [];
  const gets: string[] = [];
  const waits: string[] = [];
  const supabase = makeFakeSupabase();
  const run = await startVideoRun({ supabase, created, gets, waits });
  const deps = {
    supabase: supabase as never,
    videoProvider: fakeVideoProvider(created, { gets, waits, getStatus: "succeeded" }),
    fetchImpl: okDownloadFetch(),
  };
  const first = await syncBenchmarkRun({ runId: run.id, projectId: PROJECT_A }, deps);
  const second = await syncBenchmarkRun({ runId: run.id, projectId: PROJECT_A }, deps);
  const third = await syncBenchmarkRun({ runId: run.id, projectId: PROJECT_A }, deps);
  assert.equal(first.status, "succeeded");
  assert.equal(second.status, "succeeded");
  assert.equal(third.status, "succeeded");
  assert.equal(created.length, 1);
  assert.equal(waits.length, 0);
  assert.equal(second.outputPath, first.outputPath);
  assert.equal(third.outputPath, first.outputPath);
});

await check("download_failed retries only download/upload", async () => {
  const created: string[] = [];
  const gets: string[] = [];
  const waits: string[] = [];
  const supabase = makeFakeSupabase();
  const run = await startVideoRun({ supabase, created, gets, waits });
  await syncBenchmarkRun(
    { runId: run.id, projectId: PROJECT_A },
    {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(created, { gets, waits, getStatus: "succeeded" }),
      fetchImpl: hangingFetch(),
      downloadTimeoutMs: 40,
    },
  );
  const retried = await syncBenchmarkRun(
    { runId: run.id, projectId: PROJECT_A },
    {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(created, { gets, waits, getStatus: "succeeded" }),
      fetchImpl: okDownloadFetch(),
    },
  );
  assert.equal(retried.status, "succeeded");
  assert.equal(created.length, 1);
  assert.equal(retried.providerTaskId, run.providerTaskId);
});

await check("streamed download is bounded and oversized output is not stored", async () => {
  const chunks: Uint8Array[] = [new Uint8Array(8), new Uint8Array(8)];
  let index = 0;
  const response = new Response(
    new ReadableStream({
      pull(controller) {
        if (index < chunks.length) {
          controller.enqueue(chunks[index++]!);
          return;
        }
        controller.close();
      },
    }),
    { headers: { "content-type": "video/mp4" } },
  );
  await assert.rejects(
    () => readResponseBodyBounded(response, 10),
    /exceeds size limit/,
  );
  assert.ok(AI_MEDIA_BENCHMARK_MAX_OUTPUT_BYTES <= 80 * 1024 * 1024);

  const created: string[] = [];
  const gets: string[] = [];
  const waits: string[] = [];
  const supabase = makeFakeSupabase();
  const run = await startVideoRun({ supabase, created, gets, waits });
  const huge: typeof fetch = (async () =>
    new Response(Buffer.from("x"), {
      status: 200,
      headers: { "content-length": String(AI_MEDIA_BENCHMARK_MAX_OUTPUT_BYTES + 1), "content-type": "video/mp4" },
    })) as typeof fetch;
  const synced = await syncBenchmarkRun(
    { runId: run.id, projectId: PROJECT_A },
    {
      supabase: supabase as never,
      videoProvider: fakeVideoProvider(created, { gets, waits, getStatus: "succeeded" }),
      fetchImpl: huge,
    },
  );
  assert.equal(synced.status, "download_failed");
  assert.equal(synced.failureCode, "download_too_large");
  assert.equal(created.length, 1);
  assert.equal(supabase._uploads.length, 0);
  assert.equal(synced.providerTaskId, run.providerTaskId);
});

await check("same-run retry upserts one path and never another run file", async () => {
  const created: string[] = [];
  const gets: string[] = [];
  const waits: string[] = [];
  const supabase = makeFakeSupabase();
  const runA = await startVideoRun({
    supabase,
    created,
    gets,
    waits,
    clientRequestId: REQUEST_1,
  });
  const runB = await startVideoRun({
    supabase,
    created,
    gets,
    waits,
    clientRequestId: REQUEST_2,
  });
  const deps = {
    supabase: supabase as never,
    videoProvider: fakeVideoProvider(created, { gets, waits, getStatus: "succeeded" }),
    fetchImpl: okDownloadFetch(),
  };
  const firstA = await syncBenchmarkRun({ runId: runA.id, projectId: PROJECT_A }, deps);
  const firstB = await syncBenchmarkRun({ runId: runB.id, projectId: PROJECT_A }, deps);
  const againA = await syncBenchmarkRun({ runId: runA.id, projectId: PROJECT_A }, deps);
  assert.equal(firstA.status, "succeeded");
  assert.equal(firstB.status, "succeeded");
  assert.equal(againA.outputPath, firstA.outputPath);
  assert.notEqual(firstA.outputPath, firstB.outputPath);
  assert.ok(firstA.outputPath?.includes(runA.id));
  assert.ok(firstB.outputPath?.includes(runB.id));
  assert.equal(created.length, 2);
  assert.equal(waits.length, 0);
});

await check("Vercel maxDuration is 180 and download timeout is 120s", () => {
  const status = readFileSync(
    join(ROOT, "app/api/admin/ai-media-benchmark/runs/[id]/status/route.ts"),
    "utf8",
  );
  const video = readFileSync(
    join(ROOT, "app/api/admin/ai-media-benchmark/video/route.ts"),
    "utf8",
  );
  const voice = readFileSync(
    join(ROOT, "app/api/admin/ai-media-benchmark/voice/route.ts"),
    "utf8",
  );
  const sound = readFileSync(
    join(ROOT, "app/api/admin/ai-media-benchmark/sound/route.ts"),
    "utf8",
  );
  const panel = readFileSync(
    join(ROOT, "components/settings/AiMediaBenchmarkPanel/AiMediaBenchmarkPanel.tsx"),
    "utf8",
  );
  const service = readFileSync(join(ROOT, "lib/ai-media-benchmark/service.ts"), "utf8");
  const finalize = readFileSync(join(ROOT, "lib/ai-media-benchmark/finalize.ts"), "utf8");
  for (const src of [status, video, voice, sound]) {
    assert.match(src, /export const maxDuration = 180/);
  }
  assert.equal(AI_MEDIA_BENCHMARK_DOWNLOAD_TIMEOUT_MS, 120_000);
  assert.match(panel, /Znovu stáhnout bez nové generace/);
  assert.match(panel, /download_failed/);
  assert.doesNotMatch(
    panel.slice(panel.indexOf("const terminal"), panel.indexOf("if (data.run.status === \"download_failed\")")),
    /download_failed/,
  );
  assert.equal([...service.matchAll(/createImageToVideo/g)].length, 1);
  assert.doesNotMatch(service, /waitForImageToVideo/);
  assert.match(finalize, /readResponseBodyBounded/);
  assert.match(finalize, /upsert: true/);
});

function seedCombinedSources(
  supabase: ReturnType<typeof makeFakeSupabase>,
  videoModel = "gen4_turbo",
  outputContainsAudio = false,
) {
  seedSucceededRun(supabase, {
    id: VIDEO_RUN_ID,
    testType: "video",
    model: videoModel,
    outputContainsAudio,
    clientRequestId: REQUEST_1,
  });
  seedSucceededRun(supabase, {
    id: VOICE_RUN_ID,
    testType: "voice",
    model: "gpt-4o-mini-tts",
    clientRequestId: REQUEST_2,
    settings: { text: DEFAULT_VOICE_SCRIPT },
  });
  seedSucceededRun(supabase, {
    id: SOUND_RUN_ID,
    testType: "sound",
    model: "eleven_text_to_sound_v2",
    clientRequestId: REQUEST_3,
  });
}

await check("combined plan mixes Gen-4 video + voice + selected sound", () => {
  const plan = planCombinedScene({
    videoRunId: VIDEO_RUN_ID,
    videoModel: "gen4_turbo",
    videoOutputContainsAudio: false,
    voiceRunId: VOICE_RUN_ID,
    voiceSettings: { text: DEFAULT_VOICE_SCRIPT },
    soundRunId: SOUND_RUN_ID,
  });
  assert.equal(plan.targetDurationSeconds, 4);
  assert.equal(plan.voiceoverStartSeconds, 0);
  assert.equal(plan.mix.useSceneAudio, false);
  assert.equal(plan.mix.useAmbientSound, true);
  assert.equal(plan.layers.find((l) => l.kind === "voiceover")?.used, true);
  assert.equal(plan.layers.find((l) => l.kind === "ambient_sound")?.used, true);
  assert.equal(plan.voiceoverText, DEFAULT_VOICE_SCRIPT);
  assert.equal(AI_MEDIA_BENCHMARK_VOICEOVER_GAIN, AUDIO_MIX_DEFAULTS.voiceoverGain);
  assert.equal(AI_MEDIA_BENCHMARK_SCENE_AUDIO_GAIN, AUDIO_MIX_DEFAULTS.sceneAudioGain);
  assert.equal(AI_MEDIA_BENCHMARK_AMBIENT_GAIN, AUDIO_MIX_DEFAULTS.ambientGain);
});

await check("combined plan keeps model audio and does not stack sound", () => {
  const plan = planCombinedScene({
    videoRunId: VIDEO_RUN_ID,
    videoModel: "veo3.1_fast",
    videoOutputContainsAudio: true,
    voiceRunId: VOICE_RUN_ID,
    soundRunId: SOUND_RUN_ID,
  });
  assert.equal(plan.mix.useSceneAudio, true);
  assert.equal(plan.mix.useAmbientSound, false);
  assert.equal(
    plan.layers.find((l) => l.kind === "ambient_sound")?.skippedReason,
    "model_audio_kept",
  );
  assert.equal(plan.mix.sceneAudioGain < plan.mix.voiceoverGain, true);
});

await check("text-to-video succeeded clip can be used in Round A+", async () => {
  const supabase = makeFakeSupabase();
  seedSucceededRun(supabase, {
    id: VIDEO_RUN_C,
    testType: "video",
    model: "gen4.5",
    outputContainsAudio: false,
    clientRequestId: REQUEST_4,
    caseId: DEFAULT_TEXT_VIDEO_CASE_ID,
    settings: {
      generationMode: "text_to_video",
      promptText: "4-second portrait shot",
    },
  });
  seedSucceededRun(supabase, {
    id: VOICE_RUN_ID,
    testType: "voice",
    model: "gpt-4o-mini-tts",
    clientRequestId: REQUEST_2,
    settings: { text: DEFAULT_VOICE_SCRIPT },
  });
  seedSucceededRun(supabase, {
    id: SOUND_RUN_ID,
    testType: "sound",
    model: "eleven_text_to_sound_v2",
    clientRequestId: REQUEST_3,
  });
  const assembleCalls: string[] = [];
  const run = await createCombinedScene(
    {
      projectId: PROJECT_A,
      videoRunId: VIDEO_RUN_C,
      voiceRunId: VOICE_RUN_ID,
      soundRunId: SOUND_RUN_ID,
      clientRequestId: REQUEST_1,
    },
    {
      supabase: supabase as never,
      assemble: async (payload) => {
        assembleCalls.push(payload.output_path);
        await supabase.storage.from(payload.output_bucket).upload(payload.output_path);
        return {
          output_bucket: payload.output_bucket,
          output_path: payload.output_path,
          duration_seconds: 4,
          voiceover_duration_seconds: 3,
          reused_existing_output: false,
          used_scene_audio: false,
          used_ambient_sound: true,
        };
      },
    },
  );
  assert.equal(run.videoRunId, VIDEO_RUN_C);
  assert.equal(run.plan.mix.useAmbientSound, true);
  assert.equal(run.plan.mix.useSceneAudio, false);
  assert.equal(assembleCalls.length, 1);
  const combinedSrc = readFileSync(
    join(ROOT, "lib/ai-media-benchmark/combinedService.ts"),
    "utf8",
  );
  assert.match(combinedSrc, /assembleBenchmarkCombinedSceneViaWorker/);
  assert.doesNotMatch(combinedSrc, /newAudioMixer|mixTextToVideo/);
});

await check("voiceover longer than 3.90s is rejected without speeding up", () => {
  assert.equal(AI_MEDIA_BENCHMARK_MAX_VOICEOVER_SECONDS, 3.9);
  assert.equal(isVoiceoverTooLongForScene(3.9), false);
  assert.equal(isVoiceoverTooLongForScene(3.91), true);
  assert.equal(isVoiceoverTooLongForScene(4), true);
});

await check("assemble muxes video + voiceover at exactly 4s", async () => {
  const mixes: Array<{ target: number; scene: boolean; ambient: boolean }> = [];
  const muxes: number[] = [];
  const result = await assembleBenchmarkCombinedScene(
    {
      combinedRunId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      projectId: PROJECT_A,
      video: { bucket: "video-renders", path: `${PROJECT_A}/ai-media-benchmark/${VIDEO_RUN_ID}/output.mp4` },
      voice: { bucket: "video-renders", path: `${PROJECT_A}/ai-media-benchmark/${VOICE_RUN_ID}/audio.mp3` },
      mix: {
        targetDurationSeconds: 4,
        voiceoverStartSeconds: 0,
        voiceoverGain: 1,
        sceneAudioGain: 0.22,
        ambientGain: 0.08,
        useSceneAudio: false,
        useAmbientSound: false,
      },
      outputBucket: "video-renders",
      outputPath: `${PROJECT_A}/ai-media-benchmark/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/${AI_MEDIA_BENCHMARK_COMBINED_FILENAME}`,
    },
    {
      download: async () => undefined,
      probeDurationSeconds: async () => 3.2,
      mixAudioLayers: async (input) => {
        mixes.push({
          target: input.targetDurationSeconds,
          scene: (input.sceneAudio?.length ?? 0) > 0,
          ambient: Boolean(input.ambient?.path),
        });
        return {
          audioPath: input.outputPath,
          durationSeconds: 4,
          sampleRate: 44100,
          channels: 2,
          diagnostics: {
            sceneAudioUsed: [],
            sceneAudioSkipped: [],
            musicUsed: false,
            ambientUsed: false,
            sfxCount: 0,
            visualTimelineSeconds: 4,
            ducked: false,
          },
        };
      },
      muxVideoWithAudio: async (args) => {
        muxes.push(args.targetDurationSeconds);
      },
      upload: async () => undefined,
    },
  );
  assert.equal(result.durationSeconds, 4);
  assert.deepEqual(mixes, [{ target: 4, scene: false, ambient: false }]);
  assert.deepEqual(muxes, [4]);
  assert.equal(result.reusedExistingOutput, false);
});

await check("assemble Gen-4 uses selected sound; model-audio video ducks under VO", async () => {
  const seen: string[] = [];
  await assembleBenchmarkCombinedScene(
    {
      combinedRunId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      projectId: PROJECT_A,
      video: { bucket: "video-renders", path: `${PROJECT_A}/ai-media-benchmark/${VIDEO_RUN_ID}/output.mp4` },
      voice: { bucket: "video-renders", path: `${PROJECT_A}/ai-media-benchmark/${VOICE_RUN_ID}/audio.mp3` },
      sound: { bucket: "video-renders", path: `${PROJECT_A}/ai-media-benchmark/${SOUND_RUN_ID}/audio.mp3` },
      mix: {
        targetDurationSeconds: 4,
        voiceoverStartSeconds: 0,
        voiceoverGain: 1,
        sceneAudioGain: 0.22,
        ambientGain: 0.08,
        useSceneAudio: false,
        useAmbientSound: true,
      },
      outputBucket: "video-renders",
      outputPath: `${PROJECT_A}/ai-media-benchmark/cccccccc-cccc-4ccc-8ccc-cccccccccccc/${AI_MEDIA_BENCHMARK_COMBINED_FILENAME}`,
    },
    {
      download: async () => undefined,
      probeDurationSeconds: async () => 2,
      mixAudioLayers: async (input) => {
        seen.push(input.ambient?.path ? "ambient" : "no-ambient");
        seen.push((input.sceneAudio?.length ?? 0) > 0 ? "scene" : "no-scene");
        return {
          audioPath: input.outputPath,
          durationSeconds: 4,
          sampleRate: 44100,
          channels: 2,
          diagnostics: {
            sceneAudioUsed: [],
            sceneAudioSkipped: [],
            musicUsed: false,
            ambientUsed: true,
            sfxCount: 0,
            visualTimelineSeconds: null,
            ducked: true,
          },
        };
      },
      muxVideoWithAudio: async () => undefined,
      upload: async () => undefined,
    },
  );
  assert.deepEqual(seen, ["ambient", "no-scene"]);

  const modelAudio: string[] = [];
  await assembleBenchmarkCombinedScene(
    {
      combinedRunId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      projectId: PROJECT_A,
      video: { bucket: "video-renders", path: `${PROJECT_A}/ai-media-benchmark/${VIDEO_RUN_ID}/output.mp4` },
      voice: { bucket: "video-renders", path: `${PROJECT_A}/ai-media-benchmark/${VOICE_RUN_ID}/audio.mp3` },
      sound: { bucket: "video-renders", path: `${PROJECT_A}/ai-media-benchmark/${SOUND_RUN_ID}/audio.mp3` },
      mix: {
        targetDurationSeconds: 4,
        voiceoverStartSeconds: 0,
        voiceoverGain: 1,
        sceneAudioGain: 0.22,
        ambientGain: 0.08,
        useSceneAudio: true,
        useAmbientSound: false,
      },
      outputBucket: "video-renders",
      outputPath: `${PROJECT_A}/ai-media-benchmark/dddddddd-dddd-4ddd-8ddd-dddddddddddd/${AI_MEDIA_BENCHMARK_COMBINED_FILENAME}`,
    },
    {
      download: async () => undefined,
      probeDurationSeconds: async () => 2,
      mixAudioLayers: async (input) => {
        modelAudio.push(input.ambient?.path ? "ambient" : "no-ambient");
        modelAudio.push((input.sceneAudio?.length ?? 0) > 0 ? "scene" : "no-scene");
        assert.equal(input.sceneAudio?.[0]?.gain, 0.22);
        assert.equal(input.voiceover.gain, 1);
        return {
          audioPath: input.outputPath,
          durationSeconds: 4,
          sampleRate: 44100,
          channels: 2,
          diagnostics: {
            sceneAudioUsed: ["combined-scene"],
            sceneAudioSkipped: [],
            musicUsed: false,
            ambientUsed: false,
            sfxCount: 0,
            visualTimelineSeconds: 4,
            ducked: true,
          },
        };
      },
      muxVideoWithAudio: async () => undefined,
      upload: async () => undefined,
    },
  );
  assert.deepEqual(modelAudio, ["no-ambient", "scene"]);
});

await check("assemble rejects too-long voiceover and missing storage", async () => {
  await assert.rejects(
    () =>
      assembleBenchmarkCombinedScene(
        {
          combinedRunId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          projectId: PROJECT_A,
          video: { bucket: "video-renders", path: `${PROJECT_A}/ai-media-benchmark/${VIDEO_RUN_ID}/output.mp4` },
          voice: { bucket: "video-renders", path: `${PROJECT_A}/ai-media-benchmark/${VOICE_RUN_ID}/audio.mp3` },
          mix: {
            targetDurationSeconds: 4,
            voiceoverStartSeconds: 0,
            voiceoverGain: 1,
            sceneAudioGain: 0.22,
            ambientGain: 0.08,
            useSceneAudio: false,
            useAmbientSound: false,
          },
          outputBucket: "video-renders",
          outputPath: `${PROJECT_A}/ai-media-benchmark/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/${AI_MEDIA_BENCHMARK_COMBINED_FILENAME}`,
        },
        {
          download: async () => undefined,
          probeDurationSeconds: async () => 5,
          mixAudioLayers: async () => {
            throw new Error("mix_should_not_run");
          },
          muxVideoWithAudio: async () => {
            throw new Error("mux_should_not_run");
          },
          upload: async () => undefined,
        },
      ),
    /voiceover_too_long_for_scene/,
  );
  await assert.rejects(
    () =>
      assembleBenchmarkCombinedScene(
        {
          combinedRunId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          projectId: PROJECT_A,
          video: { bucket: "video-renders", path: `${PROJECT_A}/ai-media-benchmark/${VIDEO_RUN_ID}/output.mp4` },
          voice: { bucket: "video-renders", path: `${PROJECT_A}/ai-media-benchmark/${VOICE_RUN_ID}/audio.mp3` },
          mix: {
            targetDurationSeconds: 4,
            voiceoverStartSeconds: 0,
            voiceoverGain: 1,
            sceneAudioGain: 0.22,
            ambientGain: 0.08,
            useSceneAudio: false,
            useAmbientSound: false,
          },
          outputBucket: "video-renders",
          outputPath: `${PROJECT_A}/ai-media-benchmark/ffffffff-ffff-4fff-8fff-ffffffffffff/${AI_MEDIA_BENCHMARK_COMBINED_FILENAME}`,
        },
        {
          download: async () => {
            throw new Error("missing");
          },
          probeDurationSeconds: async () => 2,
          mixAudioLayers: async () => {
            throw new Error("mix_should_not_run");
          },
        },
      ),
    /source_output_missing/,
  );
});

await check("combined create retries without provider POST and does not overwrite another run", async () => {
  const supabase = makeFakeSupabase();
  seedCombinedSources(supabase);
  const assembleCalls: string[] = [];
  const providerCreates: string[] = [];
  const assemble = async (
    payload: { combined_run_id: string; output_bucket: string; output_path: string },
  ) => {
    assembleCalls.push(payload.output_path);
    await supabase.storage.from(payload.output_bucket).upload(payload.output_path);
    return {
      output_bucket: payload.output_bucket,
      output_path: payload.output_path,
      duration_seconds: 4,
      voiceover_duration_seconds: 3,
      reused_existing_output: false,
      used_scene_audio: false,
      used_ambient_sound: true,
    };
  };
  const first = await createCombinedScene(
    {
      projectId: PROJECT_A,
      videoRunId: VIDEO_RUN_ID,
      voiceRunId: VOICE_RUN_ID,
      soundRunId: SOUND_RUN_ID,
      clientRequestId: REQUEST_1,
    },
    { supabase: supabase as never, assemble },
  );
  const again = await createCombinedScene(
    {
      projectId: PROJECT_A,
      videoRunId: VIDEO_RUN_ID,
      voiceRunId: VOICE_RUN_ID,
      soundRunId: SOUND_RUN_ID,
      clientRequestId: REQUEST_1,
    },
    { supabase: supabase as never, assemble },
  );
  seedSucceededRun(supabase, {
    id: VIDEO_RUN_B,
    testType: "video",
    model: "gen4.5",
    outputContainsAudio: false,
    clientRequestId: REQUEST_2,
  });
  const other = await createCombinedScene(
    {
      projectId: PROJECT_A,
      videoRunId: VIDEO_RUN_B,
      voiceRunId: VOICE_RUN_ID,
      clientRequestId: REQUEST_3,
    },
    { supabase: supabase as never, assemble },
  );
  assert.equal(first.status, "succeeded");
  assert.equal(again.status, "succeeded");
  assert.equal(again.id, first.id);
  assert.equal(again.outputPath, first.outputPath);
  assert.ok(first.outputPath?.includes(first.id));
  assert.ok(first.outputPath?.endsWith(AI_MEDIA_BENCHMARK_COMBINED_FILENAME));
  assert.notEqual(other.outputPath, first.outputPath);
  assert.equal(assembleCalls.length, 2);
  assert.equal(providerCreates.length, 0);
  assert.equal(first.reusedExistingRequest, false);
  assert.equal(again.reusedExistingRequest, true);
});

await check("combined upload-then-DB-interrupt is recovered from existing file", async () => {
  const supabase = makeFakeSupabase();
  seedCombinedSources(supabase);
  let calls = 0;
  const reusedFlags: boolean[] = [];
  const assemble = async (payload: {
    combined_run_id: string;
    output_bucket: string;
    output_path: string;
  }) => {
    calls += 1;
    const alreadyThere = supabase._files.has(
      `${payload.output_bucket}/${payload.output_path}`,
    );
    if (!alreadyThere) {
      await supabase.storage.from(payload.output_bucket).upload(payload.output_path);
    }
    reusedFlags.push(alreadyThere);
    return {
      output_bucket: payload.output_bucket,
      output_path: payload.output_path,
      duration_seconds: 4,
      voiceover_duration_seconds: 3,
      reused_existing_output: alreadyThere,
      used_scene_audio: false,
      used_ambient_sound: true,
    };
  };
  const interrupted = await createCombinedScene(
    {
      projectId: PROJECT_A,
      videoRunId: VIDEO_RUN_ID,
      voiceRunId: VOICE_RUN_ID,
      soundRunId: SOUND_RUN_ID,
      clientRequestId: REQUEST_1,
    },
    {
      supabase: supabase as never,
      assemble,
      afterOutputUploaded: async () => {
        throw new Error("killed_before_db");
      },
    },
  );
  assert.equal(interrupted.status, "failed");
  assert.equal(interrupted.outputPath, null);
  const recovered = await syncCombinedScene(
    {
      runId: [...supabase._combined.values()][0]!.id as string,
      projectId: PROJECT_A,
    },
    { supabase: supabase as never, assemble },
  );
  assert.equal(recovered.status, "succeeded");
  assert.equal(calls, 2);
  assert.equal(reusedFlags[1], true);
  assert.ok(recovered.outputPath?.includes(String(recovered.id)));
});

await check("combined scene has three separate star ratings", async () => {
  const supabase = makeFakeSupabase();
  seedCombinedSources(supabase);
  const run = await createCombinedScene(
    {
      projectId: PROJECT_A,
      videoRunId: VIDEO_RUN_ID,
      voiceRunId: VOICE_RUN_ID,
      clientRequestId: REQUEST_1,
    },
    {
      supabase: supabase as never,
      assemble: async (payload) => {
        await supabase.storage.from(payload.output_bucket).upload(payload.output_path);
        return {
          output_bucket: payload.output_bucket,
          output_path: payload.output_path,
          duration_seconds: 4,
          voiceover_duration_seconds: 2,
          reused_existing_output: false,
          used_scene_audio: false,
          used_ambient_sound: false,
        };
      },
    },
  );
  const rated = await rateCombinedScene(
    {
      runId: run.id,
      projectId: PROJECT_A,
      ratingImage: 4,
      ratingAvFit: 3,
      ratingOverall: 5,
      note: "obraz zvlášť od dojmu",
    },
    { supabase: supabase as never },
  );
  assert.equal(rated.ratingImage, 4);
  assert.equal(rated.ratingAvFit, 3);
  assert.equal(rated.ratingOverall, 5);
  assert.equal(rated.note, "obraz zvlášť od dojmu");
});

await check("combined UI has assemble-one and no assemble-all", () => {
  const panel = readFileSync(
    join(ROOT, "components/settings/AiMediaBenchmarkPanel/AiMediaBenchmarkPanel.tsx"),
    "utf8",
  );
  const combined = readFileSync(
    join(ROOT, "components/settings/AiMediaBenchmarkPanel/CombinedRoundSection.tsx"),
    "utf8",
  );
  const worker = readFileSync(join(ROOT, "video-worker/server.ts"), "utf8");
  const runner = readFileSync(join(ROOT, "video-worker/jobRunner.ts"), "utf8");
  assert.match(panel, /Kolo A\+/);
  assert.match(combined, /Sestavit kombinovanou scénu/);
  assert.match(combined, /maximálně 3,90 s/);
  assert.match(combined, /text_to_video/);
  assert.doesNotMatch(combined, /sestavit všechny|assemble all/i);
  assert.match(combined, /Hodnocení obrazu[\s\S]*držte oddělené/);
  assert.match(worker, /assemble-benchmark-combined-scene/);
  assert.doesNotMatch(runner, /assembleBenchmarkCombinedScene/);
  const combinedServiceSrc = readFileSync(
    join(ROOT, "lib/ai-media-benchmark/combinedService.ts"),
    "utf8",
  );
  const assembleSrc = readFileSync(
    join(ROOT, "video-worker/services/assembleBenchmarkCombinedScene.ts"),
    "utf8",
  );
  assert.doesNotMatch(combinedServiceSrc, /adoptExistingCombinedOutput/);
  assert.doesNotMatch(combinedServiceSrc, /storage[\s\S]{0,80}\.list\(/);
  assert.doesNotMatch(assembleSrc, /outputPath\.includes\(/);
  assert.doesNotMatch(assembleSrc, /path\.includes\(input\.combinedRunId\)/);
  assert.ok(readdirSync(join(ROOT, "supabase/migrations")).some((n) =>
    String(n).includes("040_ai_media_benchmark_combined_runs"),
  ));
  const sql038 = readFileSync(
    join(ROOT, "supabase/migrations/038_ai_media_benchmark_runs.sql"),
    "utf8",
  );
  const sql039 = readFileSync(
    join(ROOT, "supabase/migrations/039_ai_media_benchmark_submission_claim.sql"),
    "utf8",
  );
  assert.doesNotMatch(sql038, /combined_runs/);
  assert.doesNotMatch(sql039, /combined_runs/);
  // 041 is the atomic Round T case snapshot migration (Step 12E).
  assert.ok(
    readdirSync(join(ROOT, "supabase/migrations")).some((n) =>
      /^041_ai_media_benchmark_round_t_cases/.test(String(n)),
    ),
    "migration 041 must exist",
  );
});

await runRoundAPlus12cChecks({
  check,
  PROJECT_A,
  PROJECT_B,
  REQUEST_1,
  REQUEST_2,
  REQUEST_3,
  REQUEST_4,
  VIDEO_RUN_ID,
  VIDEO_RUN_B,
  VIDEO_RUN_C,
  VOICE_RUN_ID,
  VOICE_RUN_B,
  SOUND_RUN_ID,
  SOUND_RUN_B,
  makeFakeSupabase: makeFakeSupabase as never,
  seedCombinedSources: seedCombinedSources as never,
  seedSucceededRun: seedSucceededRun as never,
});

await check("paid routes share input mismatch mapping", () => {
  for (const rel of [
    "app/api/admin/ai-media-benchmark/video/route.ts",
    "app/api/admin/ai-media-benchmark/voice/route.ts",
    "app/api/admin/ai-media-benchmark/sound/route.ts",
    "app/api/admin/ai-media-benchmark/text-video/route.ts",
  ]) {
    const src = readFileSync(join(ROOT, rel), "utf8");
    assert.match(src, /benchmark_request_input_mismatch/);
  }
});

await check("zero real network calls", () => {
  assert.equal(realFetchCalls, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
