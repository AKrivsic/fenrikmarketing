// Offline Round T text-to-video checks — no real provider / paid calls.
//   npm run check:ai-media-benchmark-text-video

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";
import type { TextToVideoProvider } from "@/lib/ai/videoGeneration";
import type { VideoGenerationProvider } from "@/lib/ai/videoGeneration";
import {
  ROUND_A_DURATION_SECONDS,
  ROUND_A_PORTRAIT_RATIO,
  TEXT_TO_VIDEO_CATALOG,
  getTestableTextToVideoModels,
  publicCatalog,
  quoteRoundT,
  quoteTextToVideoCost,
} from "@/lib/ai-media-benchmark/catalog";
import {
  AI_MEDIA_BENCHMARK_TEXT_VIDEO_FLAG,
  isBenchmarkTextVideoEnabled,
} from "@/lib/ai-media-benchmark/flags";
import { buildBrandVisualProfile } from "@/lib/ai-media-benchmark/brandVisualProfile";
import {
  composeTextToVideoPrompt,
  getTextToVideoSceneIdea,
  promptForbidsLogoAndReadableText,
  TEXT_TO_VIDEO_SCENE_IDEAS,
  TEXT_TO_VIDEO_SHARED_PROMPT_MAX_UTF16,
} from "@/lib/ai-media-benchmark/textToVideoPrompt";
import {
  assertTextToVideoPlusNotImplemented,
  planTextToVideoPlus,
} from "@/lib/ai-media-benchmark/textVideoPlus";
import {
  createTextToVideoBenchmarkRun,
  previewTextToVideoBenchmark,
  rateBenchmarkRun,
  syncBenchmarkRun,
} from "@/lib/ai-media-benchmark/service";
import {
  BENCHMARK_REQUEST_INPUT_MISMATCH,
  assertPaidBenchmarkRequestMatches,
  canonicalPaidInputFromRow,
} from "@/lib/ai-media-benchmark/requestIntegrity";
import {
  ROUND_T_CASE_SNAPSHOT_CONFLICT,
  ROUND_T_SCENE_IDEA_LOCKED,
} from "@/lib/ai-media-benchmark/roundTSnapshot";
import {
  AI_MEDIA_BENCHMARK_GENERATION_MODE_TEXT_TO_VIDEO,
  DEFAULT_TEXT_VIDEO_CASE_ID,
  isTextToVideoBenchmarkSettings,
  type AiMediaBenchmarkRunRow,
} from "@/lib/ai-media-benchmark/types";
import { parseVideoJobRenderOptions } from "@/lib/video-engine/schemas/videoJobRenderMode";
import { isSceneVideoGenerationEnabled } from "@/lib/scene-video-executor/constants";
import { SCENE_VIDEO_PLAN_DEFAULT_MODEL } from "@/lib/scene-video-plan/buildSceneVideoGenerationPlan";
import {
  AI_MEDIA_BENCHMARK_DOWNLOAD_TIMEOUT_MS,
  AI_MEDIA_BENCHMARK_MAX_OUTPUT_BYTES,
} from "@/lib/ai-media-benchmark/constants";

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
const REQUEST_1 = "44444444-4444-4444-8444-444444444444";
const REQUEST_2 = "55555555-5555-4555-8555-555555555555";
const NEW_CASE_ID = "text-to-video-scene-t-alt-case";
const ROOT = process.cwd();
const T2V_ENV = {
  AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED: "true",
  RUNWAYML_API_SECRET: "secret",
} as const;

let realFetchCalls = 0;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  realFetchCalls += 1;
  throw new Error(`real_network_forbidden:${String(input)}`);
}) as typeof fetch;

function makeFakeSupabase(opts?: { failUpload?: boolean }) {
  const runs = new Map<string, Record<string, unknown>>();
  const roundTCases = new Map<string, Record<string, unknown>>();
  const files = new Map<string, true>();
  const uploads: string[] = [];
  const project = {
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
        brand: { accent_color: "#1d4ed8", background_color: "#0f172a" },
      },
    },
  };

  function matches(
    row: Record<string, unknown>,
    filters: Array<{ col: string; op: string; val: unknown }>,
  ): boolean {
    return filters.every((f) => {
      const cur = row[f.col];
      if (f.op === "eq") return cur === f.val;
      if (f.op === "is") return cur === f.val;
      return true;
    });
  }

  function tableApi(table: string) {
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
        if (id === PROJECT_B) {
          return {
            data: {
              ...project,
              id: PROJECT_B,
              name: "Other Co",
              product_is: ["jiné služby"],
            },
            error: null,
          };
        }
        return { data: id === project.id ? project : null, error: null };
      }
      if (table === "assets") {
        return { data: [{ metadata: { product_role: "logo" } }], error: null };
      }
      if (table === "ai_media_benchmark_runs") {
        if (insertRow) {
          const clientId = String(insertRow.client_request_id);
          for (const existing of runs.values()) {
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
            output_bucket: insertRow.output_bucket ?? null,
            output_path: insertRow.output_path ?? null,
            error_message: null,
            failure_code: null,
            rating: null,
            note: null,
            latency_ms: null,
            created_at: now,
            updated_at: now,
            completed_at: null,
          };
          runs.set(id, row);
          return { data: { ...row }, error: null };
        }
        if (updatePatch) {
          const matchesRows = [...runs.values()].filter((r) => matches(r, filters));
          if (matchesRows.length === 0) {
            return { data: wantSingle || wantMaybe ? null : [], error: null };
          }
          const target = matchesRows[0]!;
          const next = { ...target, ...updatePatch, updated_at: new Date().toISOString() };
          runs.set(String(target.id), next);
          return {
            data: wantSingle || wantMaybe ? next : [next],
            error: null,
          };
        }
        const rows = [...runs.values()].filter((r) => matches(r, filters));
        if (wantSingle || wantMaybe) {
          return { data: rows[0] ?? null, error: null };
        }
        return { data: rows, error: null };
      }
      if (table === "ai_media_benchmark_round_t_cases") {
        if (insertRow) {
          // Simulate unique (project_id, case_id) constraint.
          const pid = insertRow.project_id;
          const cid = insertRow.case_id;
          for (const existing of roundTCases.values()) {
            if (existing.project_id === pid && existing.case_id === cid) {
              return { data: null, error: { code: "23505", message: "dup_case" } };
            }
          }
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const row = {
            id,
            ...insertRow,
            locked_by_run_id: insertRow.locked_by_run_id ?? null,
            locked_by_model: insertRow.locked_by_model ?? null,
            created_at: now,
            updated_at: now,
          };
          roundTCases.set(id, row);
          return { data: { ...row }, error: null };
        }
        if (updatePatch) {
          const matchesRows = [...roundTCases.values()].filter((r) => matches(r, filters));
          if (matchesRows.length === 0) {
            return { data: wantSingle || wantMaybe ? null : [], error: null };
          }
          const target = matchesRows[0]!;
          const next = { ...target, ...updatePatch, updated_at: new Date().toISOString() };
          roundTCases.set(String(target.id), next);
          return { data: wantSingle || wantMaybe ? next : [next], error: null };
        }
        const rows = [...roundTCases.values()].filter((r) => matches(r, filters));
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
    _roundTCases: roundTCases,
    _uploads: uploads,
    _project: project,
  };
}

function fakeTextVideoProvider(
  created: string[] = [],
  prompts: string[] = [],
): TextToVideoProvider &
  Pick<VideoGenerationProvider, "name" | "createImageToVideo" | "getImageToVideoTask" | "waitForImageToVideo" | "generateImageToVideo"> {
  return {
    name: "runway",
    async createTextToVideo(req) {
      created.push(req.model ?? "missing");
      prompts.push(req.promptText);
      return {
        provider: "runway",
        providerTaskId: "d2e3d1f4-1b3c-4b5c-8d46-1c1d7ee86892",
        status: "pending",
        model: req.model ?? "gen4.5",
        request: {
          provider: "runway",
          model: req.model ?? "gen4.5",
          promptText: req.promptText,
          duration: req.duration,
          ratio: req.ratio,
          generateAudio: req.generateAudio,
        },
      };
    },
    async getTextToVideoTask(id) {
      return {
        provider: "runway",
        providerTaskId: id,
        status: "pending",
        model: "gen4.5",
      };
    },
    async createImageToVideo() {
      throw new Error("image_to_video_should_not_run");
    },
    async getImageToVideoTask(id) {
      return {
        provider: "runway",
        providerTaskId: id,
        status: "succeeded",
        model: "gen4.5",
        videoUrl: "https://cdn.example.com/clip.mp4",
      };
    },
    async waitForImageToVideo() {
      throw new Error("wait_should_not_run");
    },
    async generateImageToVideo() {
      throw new Error("generate_should_not_run");
    },
  };
}

function baseInput(overrides: Partial<{
  modelId: string;
  confirmPaidGeneration: boolean;
  maxCostUsd: number;
  clientRequestId: string;
  durationSeconds: number;
  projectId: string;
  sceneIdeaId: string;
  caseId: string;
}> = {}) {
  return {
    projectId: overrides.projectId ?? PROJECT_A,
    modelId: overrides.modelId ?? "gen4.5",
    sceneIdeaId: overrides.sceneIdeaId ?? "arrival-and-task",
    durationSeconds: overrides.durationSeconds ?? ROUND_A_DURATION_SECONDS,
    ratio: ROUND_A_PORTRAIT_RATIO,
    caseId: overrides.caseId,
    clientRequestId: overrides.clientRequestId ?? REQUEST_1,
    confirmPaidGeneration: overrides.confirmPaidGeneration ?? true,
    maxCostUsd: overrides.maxCostUsd ?? 0.48,
  };
}

function seedT2vRun(
  fake: ReturnType<typeof makeFakeSupabase>,
  args: {
    promptText: string;
    model?: string;
    clientRequestId?: string;
    caseId?: string;
    sceneIdeaId?: string;
    status?: string;
    createdAt?: string;
    maxCostUsd?: number;
    estimatedCostUsd?: number;
    generateAudio?: boolean;
    profile?: Record<string, unknown>;
  },
) {
  const id = crypto.randomUUID();
  const createdAt = args.createdAt ?? "2026-08-19T10:00:00.000Z";
  const profile = args.profile ?? {
    projectId: PROJECT_A,
    environment: "industrial workplace",
    wardrobeStyle: "neutral",
    lighting: "natural",
    cameraStyle: "documentary",
    realismLevel: "photoreal",
    primaryColor: "#1d4ed8",
    secondaryColor: "#0f172a",
    forbiddenVisualElements: ["generated logos"],
  };
  const row = {
    id,
    case_id: args.caseId ?? DEFAULT_TEXT_VIDEO_CASE_ID,
    test_type: "video",
    audio_role: "none",
    project_id: PROJECT_A,
    client_request_id: args.clientRequestId ?? crypto.randomUUID(),
    source_video_job_id: null,
    source_scene_id: null,
    source_image_bucket: null,
    source_image_path: null,
    provider: "runway",
    model: args.model ?? "gen4.5",
    voice_id: null,
    settings: {
      generationMode: AI_MEDIA_BENCHMARK_GENERATION_MODE_TEXT_TO_VIDEO,
      durationSeconds: 4,
      ratio: "720:1280",
      generateAudio: args.generateAudio ?? false,
      promptText: args.promptText,
      sceneIdeaId: args.sceneIdeaId ?? "arrival-and-task",
      coreIdea:
        "A skilled professional arrives at a real workplace, greets a colleague, and immediately starts a short practical task.",
      brandVisualProfile: profile,
      maxCostUsd: args.maxCostUsd ?? 0.48,
      estimatedCostUsd: args.estimatedCostUsd ?? 0.48,
      estimatedCredits: 48,
    },
    provider_task_id: args.status === "created" ? null : "task-1",
    submission_claim_owner: null,
    submission_claimed_at: null,
    status: args.status ?? "succeeded",
    estimated_credits: 48,
    estimated_cost_usd: args.estimatedCostUsd ?? 0.48,
    duration_seconds: 4,
    latency_ms: null,
    output_contains_audio: args.generateAudio ?? false,
    output_bucket: null,
    output_path: null,
    error_message: null,
    failure_code: null,
    rating: null,
    note: null,
    created_at: createdAt,
    updated_at: createdAt,
    completed_at: args.status === "succeeded" ? createdAt : null,
  };
  fake._runs.set(id, row);
  return row;
}

console.log("check:ai-media-benchmark-text-video");

await check("catalog has exactly three text-to-video candidates", () => {
  assert.equal(TEXT_TO_VIDEO_CATALOG.length, 3);
  assert.deepEqual(
    TEXT_TO_VIDEO_CATALOG.map((m) => m.modelId),
    ["gen4.5", "veo3.1_fast", "seedance2_fast"],
  );
  assert.equal(
    TEXT_TO_VIDEO_CATALOG.some((m) => m.modelId === "gen4_turbo"),
    false,
  );
  assert.equal(getTestableTextToVideoModels().length, 3);
  const catalog = publicCatalog();
  assert.equal(catalog.textVideo.length, 3);
  assert.equal(catalog.roundT.items.length, 3);
});

await check("exact 4s portrait prices and Round T max $2.24", () => {
  const gen = quoteTextToVideoCost({
    modelId: "gen4.5",
    durationSeconds: 4,
    generateAudio: false,
    portraitRatio: "720:1280",
  });
  const veo = quoteTextToVideoCost({
    modelId: "veo3.1_fast",
    durationSeconds: 4,
    generateAudio: true,
    portraitRatio: "720:1280",
  });
  const seed = quoteTextToVideoCost({
    modelId: "seedance2_fast",
    durationSeconds: 4,
    generateAudio: true,
    portraitRatio: "720:1280",
  });
  assert.equal(gen.credits, 48);
  assert.equal(gen.usd, 0.48);
  assert.equal(veo.credits, 60);
  assert.equal(veo.usd, 0.6);
  assert.equal(seed.credits, 116);
  assert.equal(seed.usd, 1.16);
  const round = quoteRoundT();
  assert.equal(round.ratio, "720:1280");
  assert.equal(round.durationSeconds, 4);
  assert.equal(round.totalCredits, 224);
  assert.equal(round.totalUsd, 2.24);
});

await check("same composed prompt for all three models", () => {
  const profile = buildBrandVisualProfile({
    id: PROJECT_A,
    name: "Acme",
    product_is: ["průmyslové vytápění"],
    knowledge: {
      presentation: { brand: { accent_color: "#1d4ed8" } },
    },
  });
  const idea = getTextToVideoSceneIdea("arrival-and-task");
  const prompt = composeTextToVideoPrompt({ idea, profile });
  assert.ok(prompt.length <= TEXT_TO_VIDEO_SHARED_PROMPT_MAX_UTF16);
  assert.ok(prompt.includes("720:1280"));
  assert.ok(prompt.includes(idea.coreIdea));
  assert.equal(promptForbidsLogoAndReadableText(prompt), true);
  assert.equal(TEXT_TO_VIDEO_SCENE_IDEAS.length, 3);
});

await check("automatic visual profile uses real project data", () => {
  const profile = buildBrandVisualProfile({
    id: PROJECT_A,
    name: "Acme HVAC",
    language: "cs",
    market_scope: "CZ",
    product_is: ["průmyslové vytápění"],
    knowledge: {
      presentation: {
        brand: { accent_color: "#1d4ed8", background_color: "#0f172a" },
      },
    },
    assets: [{ metadata: { product_role: "logo" } }],
  });
  assert.equal(profile.primaryColor, "#1d4ed8");
  assert.equal(profile.secondaryColor, "#0f172a");
  assert.equal(profile.usedColorFallback, false);
  assert.match(profile.environment, /průmyslové vytápění/);
  assert.equal(profile.hasLogoAsset, true);
  assert.ok(profile.forbiddenVisualElements.includes("generated logos"));
});

await check("missing colors and industry use a safe fallback", () => {
  const profile = buildBrandVisualProfile({
    id: PROJECT_A,
    name: "Empty Co",
  });
  assert.equal(profile.primaryColor, null);
  assert.equal(profile.usedColorFallback, true);
  assert.equal(profile.usedEnvironmentFallback, true);
  assert.doesNotMatch(profile.environment, /#[0-9a-fA-F]{3,6}/);
  assert.match(profile.wardrobeStyle, /no invented brand uniform/i);
});

await check("prompt forbids logo and readable generated text", () => {
  const prompt = composeTextToVideoPrompt({
    idea: getTextToVideoSceneIdea("walkthrough-handoff"),
    profile: buildBrandVisualProfile({ id: PROJECT_A, product_is: ["servis"] }),
  });
  assert.equal(promptForbidsLogoAndReadableText(prompt), true);
  assert.match(prompt, /Do not generate logos/i);
  assert.match(prompt, /readable text/i);
});

await check("one model per launch and no run-all", () => {
  const names = readdirSync(join(ROOT, "app/api/admin/ai-media-benchmark"), {
    recursive: true,
  }).map(String);
  assert.equal(names.some((n) => /run-all|runAll|run_all/i.test(n)), false);
  const panel = readFileSync(
    join(ROOT, "components/settings/AiMediaBenchmarkPanel/AiMediaBenchmarkPanel.tsx"),
    "utf8",
  );
  const t2vUi = readFileSync(
    join(ROOT, "components/settings/AiMediaBenchmarkPanel/TextVideoRoundSection.tsx"),
    "utf8",
  );
  assert.doesNotMatch(panel, /spustit všechny|run all models/i);
  assert.doesNotMatch(t2vUi, /spustit všechny|run all models/i);
  assert.match(t2vUi, /Spustit jeden text-to-video test/);
  assert.match(t2vUi, /Jeden text-to-video model/);
  assert.match(t2vUi, /První spuštěný model uzamkne prompt/);
  assert.match(t2vUi, /Uzamčený prompt odesílaný všem modelům/);
  assert.match(t2vUi, /Nové Kolo T s novým case_id/);
  assert.match(t2vUi, /disabled=\{locked\}/);
  assert.match(t2vUi, /benchmark_request_input_mismatch/);
  assert.match(t2vUi, /round_t_case_snapshot_conflict/);
});

await check("text-video flag defaults false", () => {
  assert.equal(isBenchmarkTextVideoEnabled({}), false);
  assert.equal(AI_MEDIA_BENCHMARK_TEXT_VIDEO_FLAG, "AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED");
  const example = readFileSync(join(ROOT, ".env.example"), "utf8");
  assert.match(example, /AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED=false/);
});

await check("missing confirmation, flag, key or budget does not POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const provider = fakeTextVideoProvider(created);
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput({ confirmPaidGeneration: false }), {
        supabase: supabase as never,
        textVideoProvider: provider,
        env: T2V_ENV,
      }),
    /paid_confirmation_required/,
  );
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput(), {
        supabase: supabase as never,
        textVideoProvider: provider,
        env: {},
      }),
    /text_video_benchmark_disabled/,
  );
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput(), {
        supabase: makeFakeSupabase() as never,
        env: { AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED: "true" },
      }),
    /missing_api_key/,
  );
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput({ maxCostUsd: 0 }), {
        supabase: supabase as never,
        textVideoProvider: provider,
        env: T2V_ENV,
      }),
    /max_cost_required/,
  );
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput({ maxCostUsd: 0.01 }), {
        supabase: supabase as never,
        textVideoProvider: provider,
        env: T2V_ENV,
      }),
    /budget_exceeded/,
  );
  assert.equal(created.length, 0);
});

await check("preview does not call the provider", async () => {
  const created: string[] = [];
  const preview = await previewTextToVideoBenchmark(
    { projectId: PROJECT_A, sceneIdeaId: "arrival-and-task" },
    {
      supabase: makeFakeSupabase() as never,
      textVideoProvider: fakeTextVideoProvider(created),
      env: {},
    },
  );
  assert.equal(created.length, 0);
  assert.equal(preview.ratio, "720:1280");
  assert.equal(preview.durationSeconds, 4);
  assert.equal(preview.profile.primaryColor, "#1d4ed8");
  assert.ok(promptForbidsLogoAndReadableText(preview.promptText));
});

await check("one create posts exactly one selected model", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const run = await createTextToVideoBenchmarkRun(baseInput({ modelId: "veo3.1_fast", maxCostUsd: 0.6 }), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created),
    videoProvider: fakeTextVideoProvider(created) as never,
    env: T2V_ENV,
  });
  assert.deepEqual(created, ["veo3.1_fast"]);
  assert.equal(run.model, "veo3.1_fast");
  assert.equal(run.caseId, DEFAULT_TEXT_VIDEO_CASE_ID);
  assert.equal(run.testType, "video");
  assert.equal(isTextToVideoBenchmarkSettings(run.settings), true);
  assert.equal(run.estimatedCostUsd, 0.6);
  assert.equal(run.outputContainsAudio, true);
  assert.equal(run.settings.ratio, "720:1280");
  assert.equal(typeof run.settings.promptText, "string");
});

await check("concurrent same request creates at most one POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const input = baseInput();
  const [first, second] = await Promise.all([
    createTextToVideoBenchmarkRun(input, {
      supabase: supabase as never,
      textVideoProvider: fakeTextVideoProvider(created),
      env: T2V_ENV,
      submissionClaimOwner: "owner-a",
    }),
    createTextToVideoBenchmarkRun(input, {
      supabase: supabase as never,
      textVideoProvider: fakeTextVideoProvider(created),
      env: T2V_ENV,
      submissionClaimOwner: "owner-b",
    }),
  ]);
  assert.equal(created.length, 1);
  assert.equal(first.id, second.id);
});

await check("timeout or 5xx after possible POST ends submission_unknown", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const timeoutProvider = fakeTextVideoProvider(created);
  timeoutProvider.createTextToVideo = async (req) => {
    created.push(req.model ?? "missing");
    throw new VideoGenerationError("provider timeout", { code: "timeout" });
  };
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput(), {
        supabase: supabase as never,
        textVideoProvider: timeoutProvider,
        env: T2V_ENV,
      }),
    /submission_unknown/,
  );
  assert.equal(created.length, 1);
  assert.equal([...supabase._runs.values()][0]?.status, "submission_unknown");

  const created5xx: string[] = [];
  const supabase5xx = makeFakeSupabase();
  const httpProvider = fakeTextVideoProvider(created5xx);
  httpProvider.createTextToVideo = async (req) => {
    created5xx.push(req.model ?? "missing");
    throw new VideoGenerationError("upstream 503", {
      code: "http_error",
      httpStatus: 503,
    });
  };
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput({ clientRequestId: REQUEST_2 }), {
        supabase: supabase5xx as never,
        textVideoProvider: httpProvider,
        env: T2V_ENV,
      }),
    /submission_unknown/,
  );
  assert.equal(created5xx.length, 1);
  assert.equal([...supabase5xx._runs.values()][0]?.status, "submission_unknown");
});

await check("retry of submission_unknown does not POST again", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const timeoutProvider = fakeTextVideoProvider(created);
  timeoutProvider.createTextToVideo = async (req) => {
    created.push(req.model ?? "missing");
    throw new VideoGenerationError("provider timeout", { code: "timeout" });
  };
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput(), {
        supabase: supabase as never,
        textVideoProvider: timeoutProvider,
        env: T2V_ENV,
      }),
    /submission_unknown/,
  );
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput(), {
        supabase: supabase as never,
        textVideoProvider: fakeTextVideoProvider(created),
        env: T2V_ENV,
      }),
    /submission_unknown/,
  );
  assert.equal(created.length, 1);
});

await check("download retry does not create a new generation", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const provider = fakeTextVideoProvider(created);
  const run = await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: provider,
    videoProvider: provider as never,
    env: T2V_ENV,
  });
  const synced = await syncBenchmarkRun(
    { runId: run.id, projectId: PROJECT_A },
    {
      supabase: supabase as never,
      videoProvider: provider as never,
      fetchImpl: (async () =>
        new Response(Buffer.from("fake-mp4"), {
          status: 200,
          headers: { "content-type": "video/mp4" },
        })) as typeof fetch,
    },
  );
  assert.equal(synced.status, "succeeded");
  assert.ok(synced.outputPath?.includes(run.id));
  assert.match(String(synced.outputPath), /output\.mp4$/);
  assert.equal(created.length, 1);
});

await check("stars and note work on a text-to-video run", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const createdRun = await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created),
    env: T2V_ENV,
  });
  const rated = await rateBenchmarkRun(
    { runId: createdRun.id, projectId: PROJECT_A, rating: 4, note: "text_to_video gen4.5 dynamika" },
    { supabase: supabase as never },
  );
  assert.equal(rated.rating, 4);
  assert.match(String(rated.note), /text_to_video/);
});

await check("Round T+ is stubbed and never posts", () => {
  const plan = planTextToVideoPlus({ winnerModelId: "seedance2_fast" });
  assert.equal(plan.canSubmit, false);
  assert.equal(plan.enabled, false);
  assert.match(plan.blockedReason, /seed is a random integer/i);
  assert.throws(() => assertTextToVideoPlusNotImplemented(), /text_to_video_plus_not_implemented/);
  const plusUi = readFileSync(
    join(ROOT, "components/settings/AiMediaBenchmarkPanel/TextVideoRoundSection.tsx"),
    "utf8",
  );
  assert.match(plusUi, /Random seed/);
  assert.match(plusUi, /Reference image/);
  assert.match(plusUi, /First-frame image/);
  assert.match(plusUi, /Kolo T\+ zatím nelze spustit/);
  const plusRoute = readFileSync(
    join(ROOT, "app/api/admin/ai-media-benchmark/text-video-plus/route.ts"),
    "utf8",
  );
  assert.match(plusRoute, /assertTextToVideoPlusNotImplemented/);
});

await check("no new audio mixer and production workflow unchanged", () => {
  const combined = readFileSync(
    join(ROOT, "lib/ai-media-benchmark/combinedService.ts"),
    "utf8",
  );
  assert.match(combined, /assembleBenchmarkCombinedSceneViaWorker/);
  assert.doesNotMatch(combined, /mixTextToVideo|newAudioMixer/);
  assert.equal(parseVideoJobRenderOptions({}).ok, true);
  if (parseVideoJobRenderOptions({}).ok) {
    assert.equal(parseVideoJobRenderOptions({}).mode, "still");
  }
  assert.equal(isSceneVideoGenerationEnabled({}), false);
  assert.equal(SCENE_VIDEO_PLAN_DEFAULT_MODEL, "gen4_turbo");
  assert.equal(AI_MEDIA_BENCHMARK_DOWNLOAD_TIMEOUT_MS, 120_000);
  assert.equal(AI_MEDIA_BENCHMARK_MAX_OUTPUT_BYTES, 80 * 1024 * 1024);
  const textVideoRoute = readFileSync(
    join(ROOT, "app/api/admin/ai-media-benchmark/text-video/route.ts"),
    "utf8",
  );
  assert.match(textVideoRoute, /export const maxDuration = 180/);
  // 041 is now the atomic case snapshot migration (12E).
  assert.ok(
    readdirSync(join(ROOT, "supabase/migrations")).some((n) =>
      /^041_ai_media_benchmark_round_t_cases/.test(String(n)),
    ),
    "migration 041 must exist",
  );
});

await check("canonical mismatch rejects prompt, project, model and budget", () => {
  const row = {
    project_id: PROJECT_A,
    test_type: "video",
    case_id: DEFAULT_TEXT_VIDEO_CASE_ID,
    provider: "runway",
    model: "gen4.5",
    duration_seconds: 4,
    estimated_cost_usd: 0.48,
    estimated_credits: 48,
    source_video_job_id: null,
    source_scene_id: null,
    source_image_bucket: null,
    source_image_path: null,
    output_contains_audio: false,
    settings: {
      generationMode: AI_MEDIA_BENCHMARK_GENERATION_MODE_TEXT_TO_VIDEO,
      durationSeconds: 4,
      ratio: "720:1280",
      generateAudio: false,
      promptText: "locked prompt",
      sceneIdeaId: "arrival-and-task",
      brandVisualProfile: { projectId: PROJECT_A, environment: "hall" },
      estimatedCostUsd: 0.48,
      estimatedCredits: 48,
      maxCostUsd: 0.48,
    },
  } as unknown as AiMediaBenchmarkRunRow;
  const matching = canonicalPaidInputFromRow(row);
  assertPaidBenchmarkRequestMatches(row, matching);
  assert.throws(
    () =>
      assertPaidBenchmarkRequestMatches(row, {
        ...matching,
        promptText: "other prompt",
      }),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  assert.throws(
    () =>
      assertPaidBenchmarkRequestMatches(row, {
        ...matching,
        projectId: PROJECT_B,
      }),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  assert.throws(
    () =>
      assertPaidBenchmarkRequestMatches(row, { ...matching, model: "veo3.1_fast" }),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  assert.throws(
    () =>
      assertPaidBenchmarkRequestMatches(row, { ...matching, maxCostUsd: 2.24 }),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
});

await check("same client_request_id + other model does not POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created),
    env: T2V_ENV,
  });
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(
        baseInput({ modelId: "veo3.1_fast", maxCostUsd: 0.6 }),
        {
          supabase: supabase as never,
          textVideoProvider: fakeTextVideoProvider(created),
          env: T2V_ENV,
        },
      ),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  assert.deepEqual(created, ["gen4.5"]);
});

await check("same client_request_id + other prompt does not POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  seedT2vRun(supabase, {
    promptText: "stored-alpha-prompt",
    clientRequestId: REQUEST_1,
    status: "created",
  });
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(
        baseInput({
          caseId: NEW_CASE_ID,
          sceneIdeaId: "walkthrough-handoff",
        }),
        {
          supabase: supabase as never,
          textVideoProvider: fakeTextVideoProvider(created),
          env: T2V_ENV,
        },
      ),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  assert.equal(created.length, 0);
});

await check("same client_request_id + other project does not POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created),
    env: T2V_ENV,
  });
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput({ projectId: PROJECT_B }), {
        supabase: supabase as never,
        textVideoProvider: fakeTextVideoProvider(created),
        env: T2V_ENV,
      }),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  assert.equal(created.length, 1);
});

await check("same client_request_id + other budget does not POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  await createTextToVideoBenchmarkRun(baseInput({ maxCostUsd: 0.48 }), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created),
    env: T2V_ENV,
  });
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput({ maxCostUsd: 2.24 }), {
        supabase: supabase as never,
        textVideoProvider: fakeTextVideoProvider(created),
        env: T2V_ENV,
      }),
    new RegExp(BENCHMARK_REQUEST_INPUT_MISMATCH),
  );
  assert.equal(created.length, 1);
});

await check("concurrent insert with other inputs mismatches and posts at most once", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const results = await Promise.allSettled([
    createTextToVideoBenchmarkRun(baseInput({ modelId: "gen4.5", maxCostUsd: 0.48 }), {
      supabase: supabase as never,
      textVideoProvider: fakeTextVideoProvider(created),
      env: T2V_ENV,
      submissionClaimOwner: "owner-a",
    }),
    createTextToVideoBenchmarkRun(
      baseInput({ modelId: "veo3.1_fast", maxCostUsd: 0.6 }),
      {
        supabase: supabase as never,
        textVideoProvider: fakeTextVideoProvider(created),
        env: T2V_ENV,
        submissionClaimOwner: "owner-b",
      },
    ),
  ]);
  assert.ok(created.length <= 1);
  assert.ok(results.some((item) => item.status === "fulfilled"));
  assert.ok(
    results.some(
      (item) =>
        item.status === "rejected" &&
        item.reason instanceof Error &&
        item.reason.message === BENCHMARK_REQUEST_INPUT_MISMATCH,
    ),
  );
});

await check("matching client_request_id posts at most once including created and done", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const provider = fakeTextVideoProvider(created);
  const first = await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: provider,
    env: T2V_ENV,
  });
  const again = await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: provider,
    env: T2V_ENV,
  });
  assert.equal(created.length, 1);
  assert.equal(first.id, again.id);

  const createdOnly: string[] = [];
  const supabaseCreated = makeFakeSupabase();
  const preview = await previewTextToVideoBenchmark(
    { projectId: PROJECT_A, sceneIdeaId: "arrival-and-task" },
    { supabase: supabaseCreated as never },
  );
  seedT2vRun(supabaseCreated, {
    promptText: preview.promptText,
    profile: preview.profile,
    clientRequestId: REQUEST_1,
    status: "created",
  });
  await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabaseCreated as never,
    textVideoProvider: fakeTextVideoProvider(createdOnly),
    env: T2V_ENV,
  });
  assert.equal(createdOnly.length, 1);
});

await check("second Round T model uses the first model's locked prompt", async () => {
  const created: string[] = [];
  const prompts: string[] = [];
  const supabase = makeFakeSupabase();
  const first = await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created, prompts),
    env: T2V_ENV,
  });
  const second = await createTextToVideoBenchmarkRun(
    baseInput({
      modelId: "veo3.1_fast",
      maxCostUsd: 0.6,
      clientRequestId: REQUEST_2,
    }),
    {
      supabase: supabase as never,
      textVideoProvider: fakeTextVideoProvider(created, prompts),
      env: T2V_ENV,
    },
  );
  assert.deepEqual(created, ["gen4.5", "veo3.1_fast"]);
  assert.equal(prompts.length, 2);
  assert.equal(prompts[0], prompts[1]);
  assert.equal(first.settings.promptText, second.settings.promptText);
  assert.equal(first.settings.sceneIdeaId, second.settings.sceneIdeaId);
  assert.equal(
    JSON.stringify(first.settings.brandVisualProfile),
    JSON.stringify(second.settings.brandVisualProfile),
  );
  assert.equal(first.settings.ratio, second.settings.ratio);
  assert.notEqual(first.model, second.model);
});

await check("Product Brain change does not rewrite a locked Round T snapshot", async () => {
  const created: string[] = [];
  const prompts: string[] = [];
  const supabase = makeFakeSupabase();
  const first = await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created, prompts),
    env: T2V_ENV,
  });
  supabase._project.product_is = ["úplně jiný obor po změně Product Brainu"];
  const live = await previewTextToVideoBenchmark(
    { projectId: PROJECT_A, caseId: NEW_CASE_ID, sceneIdeaId: "arrival-and-task" },
    { supabase: supabase as never },
  );
  const second = await createTextToVideoBenchmarkRun(
    baseInput({
      modelId: "seedance2_fast",
      maxCostUsd: 1.16,
      clientRequestId: REQUEST_2,
    }),
    {
      supabase: supabase as never,
      textVideoProvider: fakeTextVideoProvider(created, prompts),
      env: T2V_ENV,
    },
  );
  // Same case: second model uses locked snapshot regardless of Product Brain change.
  assert.equal(second.settings.promptText, first.settings.promptText);
  assert.equal(prompts[1], prompts[0]);
  assert.equal(
    JSON.stringify(second.settings.brandVisualProfile),
    JSON.stringify(first.settings.brandVisualProfile),
  );
  // NEW_CASE_ID preview created an independent case snapshot for the new case.
  // Its case snapshot ID must differ from the original case.
  assert.notEqual(live.caseSnapshotId, first.settings.caseSnapshotId as string);
  // The changed product_is is reflected in the new case profile.
  assert.match(String(live.profile.productSummary), /úplně jiný obor/);
});

await check("other scene idea in the same case is rejected", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created),
    env: T2V_ENV,
  });
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(
        baseInput({
          sceneIdeaId: "walkthrough-handoff",
          clientRequestId: REQUEST_2,
          modelId: "veo3.1_fast",
          maxCostUsd: 0.6,
        }),
        {
          supabase: supabase as never,
          textVideoProvider: fakeTextVideoProvider(created),
          env: T2V_ENV,
        },
      ),
    new RegExp(ROUND_T_SCENE_IDEA_LOCKED),
  );
  assert.equal(created.length, 1);
});

await check("a new case can create a new snapshot", async () => {
  const created: string[] = [];
  const prompts: string[] = [];
  const supabase = makeFakeSupabase();
  const first = await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created, prompts),
    env: T2V_ENV,
  });
  const second = await createTextToVideoBenchmarkRun(
    baseInput({
      caseId: NEW_CASE_ID,
      sceneIdeaId: "walkthrough-handoff",
      clientRequestId: REQUEST_2,
    }),
    {
      supabase: supabase as never,
      textVideoProvider: fakeTextVideoProvider(created, prompts),
      env: T2V_ENV,
    },
  );
  assert.equal(created.length, 2);
  assert.notEqual(first.settings.promptText, second.settings.promptText);
  assert.equal(second.caseId, NEW_CASE_ID);
  assert.equal(second.settings.sceneIdeaId, "walkthrough-handoff");
});

await check("conflicting Round T snapshots in old run data (no case row) are rejected", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  // Get a valid profile without creating a case row.
  const tempSupabase = makeFakeSupabase();
  const preview = await previewTextToVideoBenchmark(
    { projectId: PROJECT_A },
    { supabase: tempSupabase as never },
  );
  // Seed two conflicting old T2V runs in a fresh supabase that has NO case row.
  seedT2vRun(supabase, {
    promptText: "snapshot-one",
    profile: preview.profile,
    createdAt: "2026-08-19T10:00:00.000Z",
  });
  seedT2vRun(supabase, {
    promptText: "snapshot-two",
    profile: preview.profile,
    createdAt: "2026-08-19T11:00:00.000Z",
  });
  // No case row exists — conflict is detected during old-run migration.
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput({ clientRequestId: REQUEST_2 }), {
        supabase: supabase as never,
        textVideoProvider: fakeTextVideoProvider(created),
        env: T2V_ENV,
      }),
    new RegExp(ROUND_T_CASE_SNAPSHOT_CONFLICT),
  );
  await assert.rejects(
    () =>
      previewTextToVideoBenchmark(
        { projectId: PROJECT_A, caseId: DEFAULT_TEXT_VIDEO_CASE_ID },
        { supabase: supabase as never },
      ),
    new RegExp(ROUND_T_CASE_SNAPSHOT_CONFLICT),
  );
  assert.equal(created.length, 0);
});

await check("text-video route maps input integrity errors", () => {
  const route = readFileSync(
    join(ROOT, "app/api/admin/ai-media-benchmark/text-video/route.ts"),
    "utf8",
  );
  assert.match(route, /benchmark_request_input_mismatch/);
  assert.match(route, /round_t_case_snapshot_conflict/);
  assert.match(route, /round_t_scene_idea_locked/);
  assert.doesNotMatch(route, /record\.promptText/);
});

// ── 12E: atomic case snapshot ─────────────────────────────────────────────

await check("preview returns caseSnapshotId and fingerprint from DB", async () => {
  const supabase = makeFakeSupabase();
  const preview = await previewTextToVideoBenchmark(
    { projectId: PROJECT_A, sceneIdeaId: "arrival-and-task" },
    { supabase: supabase as never },
  );
  assert.equal(typeof preview.caseSnapshotId, "string");
  assert.ok(preview.caseSnapshotId!.length > 0);
  assert.equal(typeof preview.fingerprint, "string");
  assert.ok(preview.fingerprint.length > 0);
  assert.equal(supabase._roundTCases.size, 1);
});

await check("two concurrent first requests create exactly one case snapshot", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const [first, second] = await Promise.all([
    createTextToVideoBenchmarkRun(baseInput({ clientRequestId: REQUEST_1 }), {
      supabase: supabase as never,
      textVideoProvider: fakeTextVideoProvider(created),
      env: T2V_ENV,
      submissionClaimOwner: "owner-a",
    }),
    createTextToVideoBenchmarkRun(
      baseInput({ modelId: "gen4.5", clientRequestId: REQUEST_2 }),
      {
        supabase: supabase as never,
        textVideoProvider: fakeTextVideoProvider(created),
        env: T2V_ENV,
        submissionClaimOwner: "owner-b",
      },
    ),
  ]);
  assert.equal(supabase._roundTCases.size, 1);
  assert.equal(created.length <= 2, true);
  // Both runs reference the same case snapshot.
  const firstSnap = first.settings.caseSnapshotId as string;
  const secondSnap = second.settings.caseSnapshotId as string;
  assert.equal(firstSnap, secondSnap);
});

await check("two concurrent first requests with different scene ideas: one snapshot, loser does not POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const results = await Promise.allSettled([
    createTextToVideoBenchmarkRun(baseInput({ clientRequestId: REQUEST_1, sceneIdeaId: "arrival-and-task" }), {
      supabase: supabase as never,
      textVideoProvider: fakeTextVideoProvider(created),
      env: T2V_ENV,
      submissionClaimOwner: "owner-a",
    }),
    createTextToVideoBenchmarkRun(
      baseInput({
        modelId: "veo3.1_fast",
        maxCostUsd: 0.6,
        clientRequestId: REQUEST_2,
        sceneIdeaId: "walkthrough-handoff",
      }),
      {
        supabase: supabase as never,
        textVideoProvider: fakeTextVideoProvider(created),
        env: T2V_ENV,
        submissionClaimOwner: "owner-b",
      },
    ),
  ]);
  // Exactly one case snapshot in DB.
  assert.equal(supabase._roundTCases.size, 1);
  // At least one succeeded, one may have been rejected with scene_idea_locked.
  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");
  assert.ok(fulfilled.length >= 1);
  if (rejected.length > 0) {
    const err = (rejected[0] as PromiseRejectedResult).reason as Error;
    assert.match(err.message, /round_t_scene_idea_locked/);
    // Loser must not have posted.
    assert.ok(created.length <= 1);
  }
});

await check("unique conflict on case snapshot loads winning row", async () => {
  const supabase = makeFakeSupabase();
  const preview = await previewTextToVideoBenchmark(
    { projectId: PROJECT_A, sceneIdeaId: "arrival-and-task" },
    { supabase: supabase as never },
  );
  // A second resolve on same supabase must reuse existing row (no duplicate insert).
  const preview2 = await previewTextToVideoBenchmark(
    { projectId: PROJECT_A, sceneIdeaId: "arrival-and-task" },
    { supabase: supabase as never },
  );
  assert.equal(preview.caseSnapshotId, preview2.caseSnapshotId);
  assert.equal(supabase._roundTCases.size, 1);
});

await check("provider POST only happens after authoritative case snapshot is stored", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created),
    env: T2V_ENV,
  });
  assert.equal(supabase._roundTCases.size, 1);
  assert.equal(created.length, 1);
  // Case snapshot must exist before the provider was called.
  const caseRow = [...supabase._roundTCases.values()][0]!;
  assert.ok(typeof caseRow.fingerprint === "string");
  assert.ok((caseRow.fingerprint as string).length > 0);
});

await check("run with mismatched snapshot fingerprint does not POST", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  // Create a case snapshot first, then tamper its fingerprint.
  await previewTextToVideoBenchmark(
    { projectId: PROJECT_A },
    { supabase: supabase as never },
  );
  // Tamper the fingerprint in the case row.
  const caseRow = [...supabase._roundTCases.values()][0]!;
  supabase._roundTCases.set(String(caseRow.id), {
    ...caseRow,
    fingerprint: "tampered-fingerprint",
  });
  // The next create should fail because prepare() will see fingerprint mismatch.
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput(), {
        supabase: supabase as never,
        textVideoProvider: fakeTextVideoProvider(created),
        env: T2V_ENV,
      }),
    /round_t_snapshot_fingerprint_mismatch/,
  );
  assert.equal(created.length, 0);
});

await check("12E: Product Brain change after case snapshot does not affect runs", async () => {
  const created: string[] = [];
  const prompts: string[] = [];
  const supabase = makeFakeSupabase();
  const first = await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created, prompts),
    env: T2V_ENV,
  });
  supabase._project.product_is = ["zcela jiný obor"];
  const second = await createTextToVideoBenchmarkRun(
    baseInput({ modelId: "seedance2_fast", maxCostUsd: 1.16, clientRequestId: REQUEST_2 }),
    {
      supabase: supabase as never,
      textVideoProvider: fakeTextVideoProvider(created, prompts),
      env: T2V_ENV,
    },
  );
  assert.equal(first.settings.promptText, second.settings.promptText);
  assert.equal(prompts[0], prompts[1]);
  assert.equal(supabase._roundTCases.size, 1);
});

await check("12E: new case_id creates a separate atomic snapshot", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created),
    env: T2V_ENV,
  });
  await createTextToVideoBenchmarkRun(
    baseInput({ caseId: NEW_CASE_ID, clientRequestId: REQUEST_2, sceneIdeaId: "walkthrough-handoff" }),
    {
      supabase: supabase as never,
      textVideoProvider: fakeTextVideoProvider(created),
      env: T2V_ENV,
    },
  );
  assert.equal(supabase._roundTCases.size, 2);
  assert.equal(created.length, 2);
});

await check("12E: conflicting old T2V runs without case row are rejected", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const preview = await previewTextToVideoBenchmark(
    { projectId: PROJECT_A },
    { supabase: supabase as never },
  );
  // Clear the case snapshot that preview just created, then seed two conflicting old runs.
  supabase._roundTCases.clear();
  seedT2vRun(supabase, { promptText: "prompt-one", profile: preview.profile });
  seedT2vRun(supabase, { promptText: "prompt-two", profile: preview.profile });
  await assert.rejects(
    () =>
      createTextToVideoBenchmarkRun(baseInput({ clientRequestId: REQUEST_2 }), {
        supabase: supabase as never,
        textVideoProvider: fakeTextVideoProvider(created),
        env: T2V_ENV,
      }),
    new RegExp(ROUND_T_CASE_SNAPSHOT_CONFLICT),
  );
  assert.equal(created.length, 0);
});

await check("12E: same client_request_id remains idempotent with atomic snapshot", async () => {
  const created: string[] = [];
  const supabase = makeFakeSupabase();
  const first = await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created),
    env: T2V_ENV,
  });
  const again = await createTextToVideoBenchmarkRun(baseInput(), {
    supabase: supabase as never,
    textVideoProvider: fakeTextVideoProvider(created),
    env: T2V_ENV,
  });
  assert.equal(first.id, again.id);
  assert.equal(created.length, 1);
  assert.equal(supabase._roundTCases.size, 1);
});

await check("12E: migration 041 exists and has unique constraint on project+case", () => {
  const sql = readFileSync(
    join(ROOT, "supabase/migrations/041_ai_media_benchmark_round_t_cases.sql"),
    "utf8",
  );
  assert.match(sql, /ai_media_benchmark_round_t_cases/);
  assert.match(sql, /unique \(project_id, case_id\)/);
  assert.match(sql, /fingerprint/);
  assert.match(sql, /prompt_text/);
  assert.match(sql, /brand_visual_profile/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /service_role/);
});

await check("A+ UI can select text-to-video outputs from any case", () => {
  const combined = readFileSync(
    join(ROOT, "components/settings/AiMediaBenchmarkPanel/CombinedRoundSection.tsx"),
    "utf8",
  );
  assert.match(combined, /load\("video"\)/);
  assert.doesNotMatch(combined, /DEFAULT_TEXT_VIDEO_CASE_ID/);
  assert.match(combined, /text_to_video/);
});

await check("zero real network calls", () => {
  assert.equal(realFetchCalls, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
