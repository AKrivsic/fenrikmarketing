// Mocked checks for internal Runway single-scene test (no real Runway / paid calls).
//   npm run check:runway-scene-test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { VideoGenerationProvider } from "@/lib/ai/videoGeneration";
import { RUNWAY_SCENE_TEST_CONFIG } from "@/lib/runway-test/config";
import { RUNWAY_TEST_PRICING } from "@/lib/runway-test/constants";
import {
  extractUsableSceneStills,
  findUsableSceneStill,
} from "@/lib/runway-test/scenes";
import {
  createRunwayTestJob,
  syncRunwayTestJobStatus,
} from "@/lib/runway-test/service";
import {
  RUNWAY_TEST_JOB_STATUSES,
  type RunwayTestJobRow,
} from "@/lib/runway-test/types";
import { estimateRunwayTestCostUsd } from "@/lib/runway-test/constants";

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
const TASK_ID = "d2e3d1f4-1b3c-4b5c-8d46-1c1d7ee86892";

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

type FakeRow = RunwayTestJobRow;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function makeFakeSupabase(seed?: {
  projects?: string[];
  videoJobs?: Array<{
    id: string;
    project_id: string;
    status: string;
    output: unknown;
    created_at?: string;
  }>;
}) {
  const projects = new Set(seed?.projects ?? [PROJECT_A, PROJECT_B]);
  const videoJobs = (seed?.videoJobs ?? [
    {
      id: JOB_A,
      project_id: PROJECT_A,
      status: "completed",
      output: SCENE_OUTPUT,
      created_at: "2026-08-01T00:00:00.000Z",
    },
  ]).map((j) => ({ ...j }));
  const testJobs = new Map<string, FakeRow>();
  const uploads: Array<{ bucket: string; path: string; bytes: number }> = [];
  let signedCalls = 0;

  function matchesFilters(
    row: Record<string, unknown>,
    filters: Array<{ col: string; op: string; val: unknown }>,
  ): boolean {
    return filters.every((f) => {
      const cur = row[f.col];
      if (f.op === "eq") return cur === f.val;
      if (f.op === "is") return cur === f.val;
      if (f.op === "in") {
        return Array.isArray(f.val) && f.val.includes(cur);
      }
      return true;
    });
  }

  function tableApi(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = [];
    let insertRow: Record<string, unknown> | null = null;
    let updatePatch: Record<string, unknown> | null = null;
    let orderCol: string | null = null;
    let ascending = true;
    let limitN: number | null = null;
    let wantSingle = false;
    let wantMaybe = false;

    const api: Record<string, unknown> = {
      select(_cols?: string) {
        void _cols;
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
      order(col: string, opts?: { ascending?: boolean }) {
        orderCol = col;
        ascending = opts?.ascending !== false;
        return api;
      },
      limit(n: number) {
        limitN = n;
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
        return Promise.resolve()
          .then(() => execute())
          .then(resolve, reject);
      },
    };

    async function execute(): Promise<{ data: unknown; error: unknown }> {
      try {
        if (table === "projects") {
          const id = filters.find((f) => f.col === "id")?.val as string;
          const hit = projects.has(id) ? { id } : null;
          return { data: hit, error: null };
        }

        if (table === "video_jobs") {
          let rows = videoJobs.filter((j) =>
            matchesFilters(j as unknown as Record<string, unknown>, filters),
          );
          if (orderCol) {
            rows = [...rows].sort((a, b) => {
              const av = String((a as Record<string, unknown>)[orderCol!] ?? "");
              const bv = String((b as Record<string, unknown>)[orderCol!] ?? "");
              return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
            });
          }
          if (limitN != null) rows = rows.slice(0, limitN);
          if (wantSingle || wantMaybe) {
            return { data: rows[0] ?? null, error: null };
          }
          return { data: rows, error: null };
        }

        if (table === "runway_test_jobs") {
          if (insertRow) {
            const clientId = String(insertRow.client_request_id);
            for (const existing of testJobs.values()) {
              if (existing.client_request_id === clientId) {
                return {
                  data: null,
                  error: { code: "23505", message: "duplicate" },
                };
              }
            }
            const id = crypto.randomUUID();
            const now = new Date().toISOString();
            const row: FakeRow = {
              id,
              project_id: String(insertRow.project_id),
              client_request_id: clientId,
              source_video_job_id: (insertRow.source_video_job_id as string) ?? null,
              source_scene_id: String(insertRow.source_scene_id),
              source_image_bucket: String(insertRow.source_image_bucket),
              source_image_path: String(insertRow.source_image_path),
              motion_prompt: String(insertRow.motion_prompt),
              provider: String(insertRow.provider),
              model: String(insertRow.model),
              duration_seconds: Number(insertRow.duration_seconds),
              ratio: String(insertRow.ratio),
              runway_task_id: null,
              status: "created",
              estimated_credits: Number(insertRow.estimated_credits),
              estimated_cost_usd: Number(insertRow.estimated_cost_usd),
              output_bucket: null,
              output_path: null,
              error_message: null,
              failure_code: null,
              created_at: now,
              updated_at: now,
              completed_at: null,
            };
            testJobs.set(id, row);
            return { data: clone(row), error: null };
          }

          if (updatePatch) {
            const matches = [...testJobs.values()].filter((r) =>
              matchesFilters(r as unknown as Record<string, unknown>, filters),
            );
            if (matches.length === 0) {
              return { data: wantSingle || wantMaybe ? null : [], error: null };
            }
            const target = matches[0]!;
            const next = {
              ...target,
              ...updatePatch,
              updated_at: new Date().toISOString(),
            } as FakeRow;
            testJobs.set(target.id, next);
            return {
              data: wantSingle || wantMaybe ? clone(next) : [clone(next)],
              error: null,
            };
          }

          let rows = [...testJobs.values()].filter((r) =>
            matchesFilters(r as unknown as Record<string, unknown>, filters),
          );
          if (orderCol) {
            rows = [...rows].sort((a, b) => {
              const av = String((a as Record<string, unknown>)[orderCol!] ?? "");
              const bv = String((b as Record<string, unknown>)[orderCol!] ?? "");
              return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
            });
          }
          if (limitN != null) rows = rows.slice(0, limitN);
          if (wantSingle || wantMaybe) {
            return { data: rows[0] ? clone(rows[0]) : null, error: null };
          }
          return { data: rows.map(clone), error: null };
        }

        return { data: null, error: { message: `unknown table ${table}` } };
      } catch (err) {
        return { data: null, error: err };
      }
    }

    return api;
  }

  const supabase = {
    from(table: string) {
      return tableApi(table);
    },
    storage: {
      from(bucket: string) {
        return {
          async createSignedUrl(path: string, ttl: number) {
            void ttl;
            signedCalls += 1;
            return {
              data: {
                signedUrl: `https://signed.example/${bucket}/${path}?token=secret`,
              },
              error: null,
            };
          },
          async upload(path: string, body: Buffer, opts?: unknown) {
            void opts;
            uploads.push({ bucket, path, bytes: body.byteLength });
            return { data: { path }, error: null };
          },
        };
      },
    },
    _state: { testJobs, uploads, signedCalls: () => signedCalls },
  };

  return supabase;
}

function mockProvider(opts?: {
  createImpl?: VideoGenerationProvider["createImageToVideo"];
  getImpl?: VideoGenerationProvider["getImageToVideoTask"];
}): VideoGenerationProvider & { createCalls: number; getCalls: number } {
  let createCalls = 0;
  let getCalls = 0;
  return {
    name: "runway",
    get createCalls() {
      return createCalls;
    },
    get getCalls() {
      return getCalls;
    },
    async createImageToVideo(req) {
      createCalls += 1;
      if (opts?.createImpl) return opts.createImpl(req);
      return {
        provider: "runway",
        providerTaskId: TASK_ID,
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
    async getImageToVideoTask(id, options) {
      getCalls += 1;
      if (opts?.getImpl) return opts.getImpl(id, options);
      return {
        provider: "runway",
        providerTaskId: id,
        status: "running",
        model: options?.model ?? "gen4_turbo",
        progress: 0.2,
      };
    },
    async waitForImageToVideo() {
      throw new Error("not used");
    },
    async generateImageToVideo() {
      throw new Error("not used");
    },
  };
}

await check("DB status list matches TypeScript statuses", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase/migrations/033_runway_test_jobs.sql"),
    "utf8",
  );
  for (const status of RUNWAY_TEST_JOB_STATUSES) {
    assert.ok(
      migration.includes(`'${status}'`),
      `migration missing status ${status}`,
    );
  }
  assert.equal(RUNWAY_TEST_JOB_STATUSES.includes("cancelled"), true);
  assert.equal(RUNWAY_TEST_JOB_STATUSES.length, 7);
});

await check("pricing for 5s gen4_turbo is $0.25", () => {
  assert.equal(RUNWAY_TEST_PRICING.model, "gen4_turbo");
  assert.equal(RUNWAY_TEST_PRICING.creditsPerSecond, 5);
  const cost = estimateRunwayTestCostUsd(5);
  assert.equal(cost.credits, 25);
  assert.equal(cost.usd, 0.25);
  assert.equal(RUNWAY_SCENE_TEST_CONFIG.model, "gen4_turbo");
  assert.equal(RUNWAY_SCENE_TEST_CONFIG.durationSeconds, 5);
  assert.equal(RUNWAY_SCENE_TEST_CONFIG.ratio, "720:1280");
});

await check("extractUsableSceneStills requires bucket+path", () => {
  const ok = extractUsableSceneStills(SCENE_OUTPUT);
  assert.equal(ok.length, 1);
  assert.equal(ok[0]?.sceneId, "scene-1");
  const missingBucket = extractUsableSceneStills({
    render_spec: {
      version: 1,
      scenes: [
        {
          id: "scene-1",
          image_path: "only-path.png",
          image_prompt: "x",
          duration_seconds: 1,
        },
      ],
    },
  });
  assert.equal(missingBucket.length, 0);
  assert.equal(findUsableSceneStill(SCENE_OUTPUT, "scene-1")?.imageBucket, "video-renders");
});

await check("create requires paid confirmation", async () => {
  const supabase = makeFakeSupabase();
  const provider = mockProvider();
  await assert.rejects(
    () =>
      createRunwayTestJob(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "slow push",
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: false,
        },
        { supabase: supabase as never, videoProvider: provider },
      ),
    /paid_confirmation_required/,
  );
  assert.equal(provider.createCalls, 0);
});

await check("foreign project video job is rejected", async () => {
  const supabase = makeFakeSupabase();
  const provider = mockProvider();
  await assert.rejects(
    () =>
      createRunwayTestJob(
        {
          projectId: PROJECT_B,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "slow push",
          clientRequestId: REQUEST_1,
          confirmPaidGeneration: true,
        },
        { supabase: supabase as never, videoProvider: provider },
      ),
    /video_job_project_mismatch/,
  );
  assert.equal(provider.createCalls, 0);
});

await check("create makes exactly one Runway POST", async () => {
  const supabase = makeFakeSupabase();
  const provider = mockProvider();
  const job = await createRunwayTestJob(
    {
      projectId: PROJECT_A,
      videoJobId: JOB_A,
      sceneId: "scene-1",
      motionPrompt: "slow push-in",
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
    },
    { supabase: supabase as never, videoProvider: provider },
  );
  assert.equal(provider.createCalls, 1);
  assert.equal(job.runwayTaskId, TASK_ID);
  assert.equal(job.status, "pending");
  assert.equal(job.reusedExistingRequest, false);
  assert.equal(job.estimatedCostUsd, 0.25);
  assert.equal(job.model, "gen4_turbo");
  assert.ok(job.sourceImagePath.includes("scene-1.png"));
  assert.ok(!JSON.stringify(job).includes("token=secret") || job.sourcePreviewUrl?.includes("token=secret"));
});

await check("duplicate clientRequestId does not create second POST", async () => {
  const supabase = makeFakeSupabase();
  const provider = mockProvider();
  const first = await createRunwayTestJob(
    {
      projectId: PROJECT_A,
      videoJobId: JOB_A,
      sceneId: "scene-1",
      motionPrompt: "slow push-in",
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
    },
    { supabase: supabase as never, videoProvider: provider },
  );
  const second = await createRunwayTestJob(
    {
      projectId: PROJECT_A,
      videoJobId: JOB_A,
      sceneId: "scene-1",
      motionPrompt: "different prompt ignored",
      clientRequestId: REQUEST_1,
      confirmPaidGeneration: true,
    },
    { supabase: supabase as never, videoProvider: provider },
  );
  assert.equal(provider.createCalls, 1);
  assert.equal(second.id, first.id);
  assert.equal(second.reusedExistingRequest, true);
});

await check("invalid / long motion prompt fails before provider", async () => {
  const supabase = makeFakeSupabase();
  const provider = mockProvider();
  await assert.rejects(
    () =>
      createRunwayTestJob(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "   ",
          clientRequestId: REQUEST_2,
          confirmPaidGeneration: true,
        },
        { supabase: supabase as never, videoProvider: provider },
      ),
    /motion_prompt_required/,
  );
  await assert.rejects(
    () =>
      createRunwayTestJob(
        {
          projectId: PROJECT_A,
          videoJobId: JOB_A,
          sceneId: "scene-1",
          motionPrompt: "x".repeat(1001),
          clientRequestId: crypto.randomUUID(),
          confirmPaidGeneration: true,
        },
        { supabase: supabase as never, videoProvider: provider },
      ),
    /motion_prompt_too_long/,
  );
  assert.equal(provider.createCalls, 0);
});

await check("status pending/running updates without download", async () => {
  const supabase = makeFakeSupabase();
  const provider = mockProvider();
  const created = await createRunwayTestJob(
    {
      projectId: PROJECT_A,
      videoJobId: JOB_A,
      sceneId: "scene-1",
      motionPrompt: "motion",
      clientRequestId: crypto.randomUUID(),
      confirmPaidGeneration: true,
    },
    { supabase: supabase as never, videoProvider: provider },
  );
  const running = await syncRunwayTestJobStatus(
    { testJobId: created.id, projectId: PROJECT_A },
    { supabase: supabase as never, videoProvider: provider },
  );
  assert.equal(running.status, "running");
  assert.equal(supabase._state.uploads.length, 0);
});

await check("succeeded downloads and stores once; repeat skips download", async () => {
  const supabase = makeFakeSupabase();
  let getPhase: "run" | "done" = "run";
  const provider = mockProvider({
    getImpl: async (id) => {
      if (getPhase === "run") {
        return {
          provider: "runway",
          providerTaskId: id,
          status: "running",
          model: "gen4_turbo",
        };
      }
      return {
        provider: "runway",
        providerTaskId: id,
        status: "succeeded",
        model: "gen4_turbo",
        videoUrl: "https://cdn.example.com/out.mp4",
      };
    },
  });
  const created = await createRunwayTestJob(
    {
      projectId: PROJECT_A,
      videoJobId: JOB_A,
      sceneId: "scene-1",
      motionPrompt: "motion",
      clientRequestId: crypto.randomUUID(),
      confirmPaidGeneration: true,
    },
    { supabase: supabase as never, videoProvider: provider },
  );

  let downloadCalls = 0;
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("cdn.example.com/out.mp4")) {
      downloadCalls += 1;
      return new Response(Buffer.from("fake-mp4-bytes"), {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;

  await syncRunwayTestJobStatus(
    { testJobId: created.id, projectId: PROJECT_A },
    { supabase: supabase as never, videoProvider: provider, fetchImpl },
  );
  assert.equal(downloadCalls, 0);

  getPhase = "done";
  const done = await syncRunwayTestJobStatus(
    { testJobId: created.id, projectId: PROJECT_A },
    { supabase: supabase as never, videoProvider: provider, fetchImpl },
  );
  assert.equal(done.status, "succeeded");
  assert.equal(downloadCalls, 1);
  assert.equal(supabase._state.uploads.length, 1);
  assert.ok(done.outputPath?.endsWith("/output.mp4"));

  const again = await syncRunwayTestJobStatus(
    { testJobId: created.id, projectId: PROJECT_A },
    { supabase: supabase as never, videoProvider: provider, fetchImpl },
  );
  assert.equal(again.status, "succeeded");
  assert.equal(downloadCalls, 1);
  assert.equal(supabase._state.uploads.length, 1);
});

await check("failed and cancelled map correctly", async () => {
  for (const terminal of ["failed", "cancelled"] as const) {
    const supabase = makeFakeSupabase();
    const provider = mockProvider({
      getImpl: async (id) => ({
        provider: "runway",
        providerTaskId: id,
        status: terminal,
        model: "gen4_turbo",
        error: { message: `${terminal} by provider`, code: "X" },
      }),
    });
    const created = await createRunwayTestJob(
      {
        projectId: PROJECT_A,
        videoJobId: JOB_A,
        sceneId: "scene-1",
        motionPrompt: "motion",
        clientRequestId: crypto.randomUUID(),
        confirmPaidGeneration: true,
      },
      { supabase: supabase as never, videoProvider: provider },
    );
    const result = await syncRunwayTestJobStatus(
      { testJobId: created.id, projectId: PROJECT_A },
      { supabase: supabase as never, videoProvider: provider },
    );
    assert.equal(result.status, terminal);
  }
});

await check("invalid / oversized download becomes download_failed", async () => {
  const cases: Array<{ name: string; response: Response }> = [
    {
      name: "not video",
      response: new Response("hello", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    },
    {
      name: "too large header",
      response: new Response(Buffer.alloc(10), {
        status: 200,
        headers: {
          "content-type": "video/mp4",
          "content-length": String(RUNWAY_SCENE_TEST_CONFIG.maxOutputBytes + 1),
        },
      }),
    },
  ];

  for (const c of cases) {
    const supabase = makeFakeSupabase();
    const provider = mockProvider({
      getImpl: async (id) => ({
        provider: "runway",
        providerTaskId: id,
        status: "succeeded",
        model: "gen4_turbo",
        videoUrl: "https://cdn.example.com/out.mp4",
      }),
    });
    const created = await createRunwayTestJob(
      {
        projectId: PROJECT_A,
        videoJobId: JOB_A,
        sceneId: "scene-1",
        motionPrompt: "motion",
        clientRequestId: crypto.randomUUID(),
        confirmPaidGeneration: true,
      },
      { supabase: supabase as never, videoProvider: provider },
    );
    const fetchImpl = (async () => c.response) as typeof fetch;
    await assert.rejects(
      () =>
        syncRunwayTestJobStatus(
          { testJobId: created.id, projectId: PROJECT_A },
          { supabase: supabase as never, videoProvider: provider, fetchImpl },
        ),
      /download_/,
    );
  }
});

await check("admin API routes require requireAdminSession", () => {
  const root = process.cwd();
  for (const rel of [
    "app/api/admin/runway-test/create/route.ts",
    "app/api/admin/runway-test/scenes/route.ts",
    "app/api/admin/runway-test/jobs/route.ts",
    "app/api/admin/runway-test/[id]/status/route.ts",
  ]) {
    const src = readFileSync(join(root, rel), "utf8");
    assert.ok(src.includes("requireAdminSession"), rel);
  }
  const page = readFileSync(
    join(root, "app/settings/runway-test/page.tsx"),
    "utf8",
  );
  assert.match(page, /redirect\("\/settings\/ai-media-benchmark"\)/);
  const lab = readFileSync(
    join(root, "app/settings/ai-media-benchmark/page.tsx"),
    "utf8",
  );
  assert.ok(lab.includes("AiMediaBenchmarkPanel"));
});

await check("no real Runway host in mocked create/status path", async () => {
  const supabase = makeFakeSupabase();
  const provider = mockProvider();
  let forbidden = false;
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("api.dev.runwayml.com")) {
      forbidden = true;
      throw new Error("real runway blocked");
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  try {
    await createRunwayTestJob(
      {
        projectId: PROJECT_A,
        videoJobId: JOB_A,
        sceneId: "scene-1",
        motionPrompt: "motion",
        clientRequestId: crypto.randomUUID(),
        confirmPaidGeneration: true,
      },
      { supabase: supabase as never, videoProvider: provider },
    );
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(forbidden, false);
  assert.equal(provider.createCalls, 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
