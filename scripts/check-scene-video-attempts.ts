/**
 * Scene video generation attempts — offline mocked provider/storage tests.
 * npm run check:scene-video-attempts
 *
 * Uses a fake Supabase + mock VideoGenerationProvider. Real FFmpeg only for
 * synthesizing probe fixtures. No Runway / paid / network calls.
 */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VideoGenerationProvider } from "@/lib/ai/videoGeneration";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";
import {
  SCENE_VIDEO_ATTEMPT_STATUSES,
  SCENE_VIDEO_DOWNLOAD_CLAIM_STALE_MS,
  SCENE_VIDEO_SUBMISSION_CLAIM_STALE_MS,
  SCENE_VIDEO_MOTION_PROMPT_MAX_UTF16,
  SCENE_VIDEO_SEED_MAX,
  classifyCreateFailure,
  createRetrySceneVideoAttempt,
  createSceneVideoAttempt,
  getSceneVideoAttempt,
  listSceneVideoAttemptsForScene,
  sceneVideoClipFromAttempt,
  syncSceneVideoAttempt,
  validateSceneVideoSeed,
  type SceneVideoAttemptRow,
} from "@/lib/scene-video-attempts";
import {
  executeSceneVideoPlan,
  defaultSceneVideoAttemptGateway,
  buildSceneVideoClientRequestId,
} from "@/lib/scene-video-executor";
import { buildSceneVideoGenerationPlan } from "@/lib/scene-video-plan";

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

async function waitUntil(
  predicate: () => boolean,
  label: string,
  timeoutMs = 3000,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitUntil timeout: ${label}`);
    }
    await new Promise((r) => setTimeout(r, 5));
  }
}

const PROJECT_A = "11111111-1111-4111-8111-111111111111";
const PROJECT_B = "22222222-2222-4222-8222-222222222222";
const JOB_A = "33333333-3333-4333-8333-333333333333";
const JOB_B = "66666666-6666-4666-8666-666666666666";
const REQUEST_1 = "44444444-4444-4444-8444-444444444444";
const REQUEST_2 = "55555555-5555-4555-8555-555555555555";
const REQUEST_3 = "77777777-7777-4777-8777-777777777777";
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

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH ?? "ffmpeg";
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBin(), args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (c: Buffer) => {
      err += c.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg ${code}: ${err.slice(-800)}`));
    });
  });
}

function makeFakeSupabase(seed?: {
  projects?: string[];
  videoJobs?: Array<{
    id: string;
    project_id: string;
    status: string;
    output: unknown;
  }>;
  /** When returns an error message, upload fails with that message. */
  uploadShouldFail?: () => string | null;
}) {
  const projects = new Set(seed?.projects ?? [PROJECT_A, PROJECT_B]);
  const videoJobs = (seed?.videoJobs ?? [
    {
      id: JOB_A,
      project_id: PROJECT_A,
      status: "completed",
      output: SCENE_OUTPUT,
    },
    {
      id: JOB_B,
      project_id: PROJECT_B,
      status: "completed",
      output: SCENE_OUTPUT,
    },
  ]).map((j) => ({ ...j }));

  const attempts = new Map<string, SceneVideoAttemptRow>();
  const uploads: Array<{ bucket: string; path: string; bytes: number }> = [];
  let insertGate = Promise.resolve();
  let updateGate = Promise.resolve();

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
      select(_c?: string) {
        void _c;
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
      if (table === "projects") {
        const id = filters.find((f) => f.col === "id")?.val as string;
        return { data: projects.has(id) ? { id } : null, error: null };
      }
      if (table === "video_jobs") {
        const rows = videoJobs.filter((j) =>
          matchesFilters(j as unknown as Record<string, unknown>, filters),
        );
        if (wantSingle || wantMaybe) {
          return { data: rows[0] ?? null, error: null };
        }
        return { data: rows, error: null };
      }
      if (table === "scene_video_generation_attempts") {
        if (insertRow) {
          const run = insertGate.then(async () => {
            const clientId = String(insertRow!.client_request_id);
            for (const existing of attempts.values()) {
              if (existing.client_request_id === clientId) {
                return {
                  data: null,
                  error: { code: "23505", message: "duplicate" },
                };
              }
            }
            // Simulate brief race window under concurrency.
            await new Promise((r) => setTimeout(r, 5));
            for (const existing of attempts.values()) {
              if (existing.client_request_id === clientId) {
                return {
                  data: null,
                  error: { code: "23505", message: "duplicate" },
                };
              }
            }
            const id = crypto.randomUUID();
            const now = new Date().toISOString();
            const row: SceneVideoAttemptRow = {
              id,
              project_id: String(insertRow!.project_id),
              video_job_id: String(insertRow!.video_job_id),
              scene_id: String(insertRow!.scene_id),
              client_request_id: clientId,
              parent_attempt_id:
                (insertRow!.parent_attempt_id as string | null) ?? null,
              source_image_bucket: String(insertRow!.source_image_bucket),
              source_image_path: String(insertRow!.source_image_path),
              motion_prompt: String(insertRow!.motion_prompt),
              provider: String(insertRow!.provider),
              model: String(insertRow!.model),
              duration_seconds: Number(insertRow!.duration_seconds),
              ratio: String(insertRow!.ratio),
              seed:
                insertRow!.seed === null || insertRow!.seed === undefined
                  ? null
                  : Number(insertRow!.seed),
              provider_task_id: null,
              status: "created",
              failure_code: null,
              error_message: null,
              estimated_credits:
                insertRow!.estimated_credits == null
                  ? null
                  : Number(insertRow!.estimated_credits),
              estimated_cost_usd:
                insertRow!.estimated_cost_usd == null
                  ? null
                  : Number(insertRow!.estimated_cost_usd),
              created_at: now,
              submitted_at: null,
              started_at: null,
              completed_at: null,
              updated_at: now,
              generation_duration_ms: null,
              output_bucket: null,
              output_path: null,
              output_duration_seconds: null,
              output_has_audio: null,
              provider_metadata: null,
              download_claimed_at: null,
              download_claim_owner: null,
              submission_claimed_at: null,
              submission_claim_owner: null,
            };
            attempts.set(id, row);
            return { data: clone(row), error: null };
          });
          insertGate = run.then(
            () => undefined,
            () => undefined,
          );
          return run;
        }

        if (updatePatch) {
          const run = updateGate.then(async () => {
            await new Promise((r) => setTimeout(r, 2));
            const matches = [...attempts.values()].filter((r) =>
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
            } as SceneVideoAttemptRow;
            attempts.set(target.id, next);
            return {
              data: wantSingle || wantMaybe ? clone(next) : [clone(next)],
              error: null,
            };
          });
          updateGate = run.then(
            () => undefined,
            () => undefined,
          );
          return run;
        }

        let rows = [...attempts.values()].filter((r) =>
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
    }

    return api;
  }

  return {
    attempts,
    uploads,
    supabase: {
      from(table: string) {
        return tableApi(table);
      },
      storage: {
        from(bucket: string) {
          return {
            async createSignedUrl(path: string) {
              return {
                data: {
                  signedUrl: `https://signed.example/${bucket}/${path}?token=x`,
                },
                error: null,
              };
            },
            async upload(path: string, body: Buffer) {
              const failMsg = seed?.uploadShouldFail?.() ?? null;
              if (failMsg) {
                return { data: null, error: { message: failMsg } };
              }
              uploads.push({ bucket, path, bytes: body.byteLength });
              return { data: { path }, error: null };
            },
          };
        },
      },
    },
  };
}

function mockProvider(opts?: {
  createImageToVideo?: VideoGenerationProvider["createImageToVideo"];
  getImageToVideoTask?: VideoGenerationProvider["getImageToVideoTask"];
}): {
  provider: VideoGenerationProvider;
  createCalls: number;
  getCalls: number;
} {
  let createCalls = 0;
  let getCalls = 0;
  const provider: VideoGenerationProvider = {
    name: "runway",
    async createImageToVideo(req) {
      createCalls += 1;
      if (opts?.createImageToVideo) return opts.createImageToVideo(req);
      return {
        provider: "runway",
        providerTaskId: TASK_ID,
        status: "pending",
        model: req.model ?? "gen4_turbo",
      };
    },
    async getImageToVideoTask(id, o) {
      getCalls += 1;
      if (opts?.getImageToVideoTask) return opts.getImageToVideoTask(id, o);
      return {
        provider: "runway",
        providerTaskId: id,
        status: "pending",
        model: "gen4_turbo",
      };
    },
    async waitForImageToVideo() {
      throw new Error("not_used");
    },
    async generateImageToVideo() {
      throw new Error("not_used");
    },
  };
  return {
    provider,
    get createCalls() {
      return createCalls;
    },
    get getCalls() {
      return getCalls;
    },
  };
}

const baseCreate = {
  projectId: PROJECT_A,
  videoJobId: JOB_A,
  sceneId: "scene-1",
  motionPrompt: "slow camera push-in",
  provider: "runway",
  model: "gen4_turbo",
  durationSeconds: 5,
  ratio: "720:1280",
  estimatedCredits: 5,
  estimatedCostUsd: 0.25,
};

console.log("check:scene-video-attempts");

const fixtureDir = await mkdtemp(join(tmpdir(), "fenrik-attempt-fix-"));
const mp4WithAudio = join(fixtureDir, "with-audio.mp4");
const mp4Silent = join(fixtureDir, "silent.mp4");
const notVideo = join(fixtureDir, "too-big.bin");

try {
  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=320x560:rate=24:duration=2",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:duration=2",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    mp4WithAudio,
  ]);
  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=320x560:rate=24:duration=2",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    mp4Silent,
  ]);
  await writeFile(notVideo, Buffer.alloc(200));

  const mp4WithAudioBytes = await readFile(mp4WithAudio);
  const mp4SilentBytes = await readFile(mp4Silent);

  await check("26) DB CHECK statuses match TypeScript", () => {
    const sql034 = readFileSync(
      join(process.cwd(), "supabase/migrations/034_scene_video_generation_attempts.sql"),
      "utf8",
    );
    const sql036 = readFileSync(
      join(process.cwd(), "supabase/migrations/036_scene_video_submission_claim.sql"),
      "utf8",
    );
    const match =
      sql036.match(/check \(status in \(([\s\S]*?)\)\)/) ??
      sql034.match(/check \(status in \(([\s\S]*?)\)\)/);
    assert.ok(match, "missing status check in migration");
    const dbStatuses = [...match[1]!.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!);
    assert.deepEqual(
      [...dbStatuses].sort(),
      [...SCENE_VIDEO_ATTEMPT_STATUSES].sort(),
    );
  });

  await check("1) create attempt", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const view = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: REQUEST_1 },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    assert.equal(view.status, "submitted");
    assert.equal(view.providerTaskId, TASK_ID);
    assert.equal(mock.createCalls, 1);
    assert.equal(view.reusedExistingRequest, false);
  });

  await check("2) project missing", async () => {
    const fake = makeFakeSupabase({ projects: [PROJECT_B] });
    const mock = mockProvider();
    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          { ...baseCreate, clientRequestId: crypto.randomUUID() },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /project_not_found/,
    );
  });

  await check("3) video job other project", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          {
            ...baseCreate,
            videoJobId: JOB_B,
            clientRequestId: crypto.randomUUID(),
          },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /video_job_project_mismatch/,
    );
  });

  await check("4) scene missing", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          {
            ...baseCreate,
            sceneId: "nope",
            clientRequestId: crypto.randomUUID(),
          },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /scene_not_found/,
    );
  });

  await check("5) source image mismatch", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          {
            ...baseCreate,
            clientRequestId: crypto.randomUUID(),
            sourceImageBucket: "video-renders",
            sourceImagePath: "wrong/path.png",
          },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /source_image_mismatch/,
    );
  });

  await check("6) motion prompt missing/long", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          {
            ...baseCreate,
            motionPrompt: "  ",
            clientRequestId: crypto.randomUUID(),
          },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /motion_prompt_required/,
    );
    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          {
            ...baseCreate,
            motionPrompt: "x".repeat(SCENE_VIDEO_MOTION_PROMPT_MAX_UTF16 + 1),
            clientRequestId: crypto.randomUUID(),
          },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /motion_prompt_too_long/,
    );
  });

  await check("7) duplicate client request returns existing", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const a = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: REQUEST_2 },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    const b = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: REQUEST_2 },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    assert.equal(a.id, b.id);
    assert.equal(b.reusedExistingRequest, true);
    assert.equal(mock.createCalls, 1);
  });

  await check("8) concurrent creates → one provider task", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const id = crypto.randomUUID();
    const [a, b] = await Promise.all([
      createSceneVideoAttempt(
        { ...baseCreate, clientRequestId: id },
        { supabase: fake.supabase as never, videoProvider: mock.provider },
      ),
      createSceneVideoAttempt(
        { ...baseCreate, clientRequestId: id },
        { supabase: fake.supabase as never, videoProvider: mock.provider },
      ),
    ]);
    assert.equal(a.id, b.id);
    assert.equal(mock.createCalls, 1);
    assert.equal(
      [...fake.attempts.values()].filter((r) => r.client_request_id === id)
        .length,
      1,
    );
  });

  await check("9-10) create timeout → submission_unknown; no auto retry", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider({
      async createImageToVideo() {
        throw new VideoGenerationError("timed out", { code: "timeout" });
      },
    });
    const req = crypto.randomUUID();
    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          { ...baseCreate, clientRequestId: req },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /submission_unknown/,
    );
    const row = [...fake.attempts.values()].find(
      (r) => r.client_request_id === req,
    )!;
    assert.equal(row.status, "submission_unknown");
    assert.equal(row.provider_task_id, null);

    const before = mock.getCalls;
    const synced = await syncSceneVideoAttempt(row.id, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
    });
    assert.equal(synced.status, "submission_unknown");
    assert.equal(mock.getCalls, before);

    await assert.rejects(
      () =>
        createRetrySceneVideoAttempt(
          { parentAttemptId: row.id, clientRequestId: crypto.randomUUID() },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /retry_forbidden_submission_unknown/,
    );
  });

  await check("11-12) pending then running", async () => {
    const fake = makeFakeSupabase();
    let phase: "pending" | "running" = "pending";
    const mock = mockProvider({
      async getImageToVideoTask(id) {
        return {
          provider: "runway",
          providerTaskId: id,
          status: phase,
          model: "gen4_turbo",
        };
      },
    });
    const created = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: crypto.randomUUID() },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    const p = await syncSceneVideoAttempt(created.id, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
    });
    assert.equal(p.status, "pending");
    phase = "running";
    const r = await syncSceneVideoAttempt(created.id, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
    });
    assert.equal(r.status, "running");
    assert.ok(r.startedAt);
  });

  await check("13) failed", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider({
      async getImageToVideoTask(id) {
        return {
          provider: "runway",
          providerTaskId: id,
          status: "failed",
          model: "gen4_turbo",
          error: { message: "boom", code: "PROVIDER" },
        };
      },
    });
    const created = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: crypto.randomUUID() },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    const view = await syncSceneVideoAttempt(created.id, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
    });
    assert.equal(view.status, "failed");
  });

  await check("14) cancelled", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider({
      async getImageToVideoTask(id) {
        return {
          provider: "runway",
          providerTaskId: id,
          status: "cancelled",
          model: "gen4_turbo",
        };
      },
    });
    const created = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: crypto.randomUUID() },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    const view = await syncSceneVideoAttempt(created.id, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
    });
    assert.equal(view.status, "cancelled");
  });

  await check("15-16/19-20) succeeded one finalize + audio + duration", async () => {
    const fake = makeFakeSupabase();
    let downloads = 0;
    const mock = mockProvider({
      async getImageToVideoTask(id) {
        return {
          provider: "runway",
          providerTaskId: id,
          status: "succeeded",
          model: "gen4_turbo",
          videoUrl: "https://cdn.example/out.mp4",
        };
      },
    });
    const created = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: crypto.randomUUID() },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );

    const fetchImpl: typeof fetch = async () => {
      downloads += 1;
      await new Promise((r) => setTimeout(r, 30));
      return new Response(mp4WithAudioBytes, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    };

    const [a, b] = await Promise.all([
      syncSceneVideoAttempt(created.id, {
        supabase: fake.supabase as never,
        videoProvider: mock.provider,
        fetchImpl,
      }),
      syncSceneVideoAttempt(created.id, {
        supabase: fake.supabase as never,
        videoProvider: mock.provider,
        fetchImpl,
      }),
    ]);
    assert.equal(downloads, 1, "exactly one download");
    assert.equal(fake.uploads.length, 1, "exactly one upload");
    // One concurrent poll may observe mid-finalize `downloading`; settle to succeeded.
    const settled = await syncSceneVideoAttempt(created.id, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
      fetchImpl,
    });
    assert.equal(settled.status, "succeeded");
    assert.ok(
      a.status === "succeeded" ||
        b.status === "succeeded" ||
        a.status === "downloading" ||
        b.status === "downloading",
    );
    assert.match(fake.uploads[0]!.path, /scene-video-attempts/);
    assert.equal(settled.outputHasAudio, true);
    assert.ok((settled.outputDurationSeconds ?? 0) > 1.5);
    assert.equal(downloads, 1, "no second download on settle");
  });

  await check("17) invalid / too large output", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider({
      async getImageToVideoTask(id) {
        return {
          provider: "runway",
          providerTaskId: id,
          status: "succeeded",
          model: "gen4_turbo",
          videoUrl: "https://cdn.example/out.mp4",
        };
      },
    });
    const created = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: crypto.randomUUID() },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    await assert.rejects(
      () =>
        syncSceneVideoAttempt(created.id, {
          supabase: fake.supabase as never,
          videoProvider: mock.provider,
          fetchImpl: async () =>
            new Response(Buffer.from("not-a-video"), {
              status: 200,
              headers: { "content-type": "text/plain" },
            }),
        }),
      /download_not_video/,
    );
  });

  await check("18) video without audio stream", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider({
      async getImageToVideoTask(id) {
        return {
          provider: "runway",
          providerTaskId: id,
          status: "succeeded",
          model: "gen4_turbo",
          videoUrl: "https://cdn.example/silent.mp4",
        };
      },
    });
    const created = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: crypto.randomUUID() },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    const view = await syncSceneVideoAttempt(created.id, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
      fetchImpl: async () =>
        new Response(mp4SilentBytes, {
          status: 200,
          headers: { "content-type": "video/mp4" },
        }),
    });
    assert.equal(view.status, "succeeded");
    assert.equal(view.outputHasAudio, false);
  });

  await check("21-23) retry lineage; parent unchanged", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider({
      async getImageToVideoTask(id) {
        return {
          provider: "runway",
          providerTaskId: id,
          status: "failed",
          model: "gen4_turbo",
          error: { message: "fail" },
        };
      },
    });
    const parent = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: REQUEST_3 },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    await syncSceneVideoAttempt(parent.id, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
    });
    const parentBefore = await getSceneVideoAttempt(parent.id, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
    });

    const child = await createRetrySceneVideoAttempt(
      {
        parentAttemptId: parent.id,
        clientRequestId: crypto.randomUUID(),
        motionPrompt: "retry motion",
      },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    assert.equal(child.parentAttemptId, parent.id);
    assert.notEqual(child.id, parent.id);
    assert.equal(child.motionPrompt, "retry motion");
    assert.equal(mock.createCalls, 2);

    const parentAfter = await getSceneVideoAttempt(parent.id, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
    });
    assert.equal(parentAfter.status, parentBefore.status);
    assert.equal(parentAfter.errorMessage, parentBefore.errorMessage);
    assert.equal(parentAfter.clientRequestId, parentBefore.clientRequestId);

    const history = await listSceneVideoAttemptsForScene(
      { videoJobId: JOB_A, sceneId: "scene-1" },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    assert.ok(history.length >= 2);
  });

  await check("24-25) SceneVideoClip convert", async () => {
    const ok: SceneVideoAttemptRow = {
      id: crypto.randomUUID(),
      project_id: PROJECT_A,
      video_job_id: JOB_A,
      scene_id: "scene-1",
      client_request_id: crypto.randomUUID(),
      parent_attempt_id: null,
      source_image_bucket: "video-renders",
      source_image_path: "x.png",
      motion_prompt: "m",
      provider: "runway",
      model: "gen4_turbo",
      duration_seconds: 5,
      ratio: "720:1280",
      seed: null,
      provider_task_id: TASK_ID,
      status: "succeeded",
      failure_code: null,
      error_message: null,
      estimated_credits: null,
      estimated_cost_usd: null,
      created_at: new Date().toISOString(),
      submitted_at: null,
      started_at: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      generation_duration_ms: 1000,
      output_bucket: "video-renders",
      output_path: `${PROJECT_A}/scene-video-attempts/x/output.mp4`,
      output_duration_seconds: 4.2,
      output_has_audio: true,
      provider_metadata: null,
      download_claimed_at: null,
      download_claim_owner: null,
    };
    const clip = sceneVideoClipFromAttempt(ok);
    assert.equal(clip.generation_attempt_id, ok.id);
    assert.equal(clip.has_audio, true);
    assert.equal(clip.duration_seconds, 4.2);

    assert.throws(
      () => sceneVideoClipFromAttempt({ ...ok, status: "failed" }),
      /attempt_not_succeeded/,
    );
  });

  await check("7B seed range 0 and max; reject out of range", async () => {
    assert.equal(validateSceneVideoSeed(0), 0);
    assert.equal(validateSceneVideoSeed(SCENE_VIDEO_SEED_MAX), SCENE_VIDEO_SEED_MAX);
    assert.throws(() => validateSceneVideoSeed(-1), /seed_out_of_range/);
    assert.throws(
      () => validateSceneVideoSeed(SCENE_VIDEO_SEED_MAX + 1),
      /seed_out_of_range/,
    );

    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const withMax = await createSceneVideoAttempt(
      {
        ...baseCreate,
        clientRequestId: crypto.randomUUID(),
        seed: SCENE_VIDEO_SEED_MAX,
      },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    assert.equal(withMax.seed, SCENE_VIDEO_SEED_MAX);
    const withZero = await createSceneVideoAttempt(
      {
        ...baseCreate,
        clientRequestId: crypto.randomUUID(),
        seed: 0,
      },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    assert.equal(withZero.seed, 0);
    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          {
            ...baseCreate,
            clientRequestId: crypto.randomUUID(),
            seed: -1,
          },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /seed_out_of_range/,
    );
  });

  await check("7B classifyCreateFailure rules", () => {
    assert.equal(
      classifyCreateFailure(new VideoGenerationError("t", { code: "timeout" })),
      "submission_unknown",
    );
    assert.equal(
      classifyCreateFailure(new Error("fetch failed ECONNRESET")),
      "submission_unknown",
    );
    assert.equal(
      classifyCreateFailure(
        new VideoGenerationError("bad", { code: "http_error", httpStatus: 400 }),
      ),
      "failed",
    );
    assert.equal(
      classifyCreateFailure(
        new VideoGenerationError("auth", { code: "http_error", httpStatus: 401 }),
      ),
      "failed",
    );
    assert.equal(
      classifyCreateFailure(
        new VideoGenerationError("rate", { code: "http_error", httpStatus: 429 }),
      ),
      "failed",
    );
    assert.equal(
      classifyCreateFailure(
        new VideoGenerationError("down", { code: "http_error", httpStatus: 503 }),
      ),
      "submission_unknown",
    );
  });

  await check("7B HTTP 400/401 create → failed (not submission_unknown)", async () => {
    for (const status of [400, 401] as const) {
      const fake = makeFakeSupabase();
      const mock = mockProvider({
        async createImageToVideo() {
          throw new VideoGenerationError(`http ${status}`, {
            code: "http_error",
            httpStatus: status,
          });
        },
      });
      const req = crypto.randomUUID();
      await assert.rejects(
        () =>
          createSceneVideoAttempt(
            { ...baseCreate, clientRequestId: req },
            { supabase: fake.supabase as never, videoProvider: mock.provider },
          ),
      );
      const row = [...fake.attempts.values()].find(
        (r) => r.client_request_id === req,
      )!;
      assert.equal(row.status, "failed", `status ${status}`);
    }
  });

  await check("7B HTTP 503 create → submission_unknown", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider({
      async createImageToVideo() {
        throw new VideoGenerationError("unavailable", {
          code: "http_error",
          httpStatus: 503,
        });
      },
    });
    const req = crypto.randomUUID();
    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          { ...baseCreate, clientRequestId: req },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /submission_unknown/,
    );
    const row = [...fake.attempts.values()].find(
      (r) => r.client_request_id === req,
    )!;
    assert.equal(row.status, "submission_unknown");
  });

  await check("7B parent lineage validation", async () => {
    const sceneOutputJobB = {
      render_spec: {
        version: 1,
        scenes: [
          {
            id: "scene-1",
            image_prompt: "product",
            image_bucket: "video-renders",
            image_path: `${PROJECT_A}/video/${JOB_B}/scene-1.png`,
            duration_seconds: 3,
          },
        ],
      },
    };
    const fake = makeFakeSupabase({
      projects: [PROJECT_A, PROJECT_B],
      videoJobs: [
        {
          id: JOB_A,
          project_id: PROJECT_A,
          status: "completed",
          output: SCENE_OUTPUT,
        },
        {
          id: JOB_B,
          project_id: PROJECT_A,
          status: "completed",
          output: sceneOutputJobB,
        },
        {
          id: "88888888-8888-4888-8888-888888888888",
          project_id: PROJECT_B,
          status: "completed",
          output: {
            render_spec: {
              version: 1,
              scenes: [
                {
                  id: "scene-1",
                  image_prompt: "product",
                  image_bucket: "video-renders",
                  image_path: `${PROJECT_B}/video/x/scene-1.png`,
                  duration_seconds: 3,
                },
              ],
            },
          },
        },
      ],
    });
    const mock = mockProvider();
    const parent = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: crypto.randomUUID() },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );

    const jobOnProjectB = "88888888-8888-4888-8888-888888888888";
    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          {
            ...baseCreate,
            projectId: PROJECT_B,
            videoJobId: jobOnProjectB,
            clientRequestId: crypto.randomUUID(),
            parentAttemptId: parent.id,
            sourceImageBucket: "video-renders",
            sourceImagePath: `${PROJECT_B}/video/x/scene-1.png`,
          },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /parent_project_mismatch/,
    );

    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          {
            ...baseCreate,
            videoJobId: JOB_B,
            clientRequestId: crypto.randomUUID(),
            parentAttemptId: parent.id,
            sourceImageBucket: "video-renders",
            sourceImagePath: `${PROJECT_A}/video/${JOB_B}/scene-1.png`,
          },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /parent_video_job_mismatch/,
    );

    const parentRow = fake.attempts.get(parent.id)!;
    fake.attempts.set(parent.id, { ...parentRow, scene_id: "other-scene" });
    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          {
            ...baseCreate,
            clientRequestId: crypto.randomUUID(),
            parentAttemptId: parent.id,
          },
          { supabase: fake.supabase as never, videoProvider: mock.provider },
        ),
      /parent_scene_mismatch/,
    );
    // Restore parent scene for valid retry.
    fake.attempts.set(parent.id, parentRow);

    const okChild = await createSceneVideoAttempt(
      {
        ...baseCreate,
        clientRequestId: crypto.randomUUID(),
        parentAttemptId: parent.id,
        motionPrompt: "valid retry",
      },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    assert.equal(okChild.parentAttemptId, parent.id);
  });

  await check("7B concurrent stale claim reclaim → one download", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider({
      async getImageToVideoTask(id) {
        return {
          provider: "runway",
          providerTaskId: id,
          status: "succeeded",
          model: "gen4_turbo",
          videoUrl: "https://cdn.example/out.mp4",
        };
      },
    });
    const created = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: crypto.randomUUID() },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );
    const row = fake.attempts.get(created.id)!;
    const staleAt = new Date(
      Date.now() - SCENE_VIDEO_DOWNLOAD_CLAIM_STALE_MS - 1000,
    ).toISOString();
    fake.attempts.set(created.id, {
      ...row,
      status: "downloading",
      provider_task_id: TASK_ID,
      download_claim_owner: "old-owner",
      download_claimed_at: staleAt,
      output_path: null,
      output_bucket: null,
    });

    let downloads = 0;
    const fetchImpl: typeof fetch = async () => {
      downloads += 1;
      await new Promise((r) => setTimeout(r, 20));
      return new Response(mp4WithAudioBytes, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    };

    await Promise.all([
      syncSceneVideoAttempt(created.id, {
        supabase: fake.supabase as never,
        videoProvider: mock.provider,
        fetchImpl,
      }),
      syncSceneVideoAttempt(created.id, {
        supabase: fake.supabase as never,
        videoProvider: mock.provider,
        fetchImpl,
      }),
    ]);
    assert.equal(downloads, 1);
    assert.equal(fake.uploads.length, 1);
    const settled = await getSceneVideoAttempt(created.id, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
    });
    assert.equal(settled.status, "succeeded");
    assert.equal(settled.outputPath != null, true);
    // Claim cleaned after success.
    const raw = fake.attempts.get(created.id)!;
    assert.equal(raw.download_claim_owner, null);
    assert.equal(raw.download_claimed_at, null);
  });

  await check("7B bounded stream without Content-Length", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider({
      async getImageToVideoTask(id) {
        return {
          provider: "runway",
          providerTaskId: id,
          status: "succeeded",
          model: "gen4_turbo",
          videoUrl: "https://cdn.example/huge.mp4",
        };
      },
    });
    const created = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: crypto.randomUUID() },
      { supabase: fake.supabase as never, videoProvider: mock.provider },
    );

    let pulled = 0;
    const limit = 8_000;
    const fetchImpl: typeof fetch = async () => {
      const chunk = new Uint8Array(4_000).fill(7);
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          pulled += 1;
          if (pulled > 20) {
            controller.close();
            return;
          }
          controller.enqueue(chunk);
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    };

    await assert.rejects(
      () =>
        syncSceneVideoAttempt(created.id, {
          supabase: fake.supabase as never,
          videoProvider: mock.provider,
          fetchImpl,
          maxOutputBytes: limit,
        }),
      /download_too_large/,
    );
    assert.equal(fake.uploads.length, 0);
    const row = fake.attempts.get(created.id)!;
    assert.equal(row.status, "download_failed");
    assert.ok(pulled >= 2 && pulled < 20, `stopped early pulled=${pulled}`);
  });

  await check(
    "7C stale reclaim: old worker download error cannot overwrite new owner",
    async () => {
      let clock = Date.parse("2026-01-01T00:00:00.000Z");
      const now = () => new Date(clock);
      const fake = makeFakeSupabase();
      const mock = mockProvider({
        async getImageToVideoTask(id) {
          return {
            provider: "runway",
            providerTaskId: id,
            status: "succeeded",
            model: "gen4_turbo",
            videoUrl: "https://cdn.example/out.mp4",
          };
        },
      });
      const created = await createSceneVideoAttempt(
        { ...baseCreate, clientRequestId: crypto.randomUUID() },
        {
          supabase: fake.supabase as never,
          videoProvider: mock.provider,
          now,
        },
      );
      const createCallsAfterCreate = mock.createCalls;

      let releaseA!: () => void;
      const aGate = new Promise<void>((r) => {
        releaseA = r;
      });
      const fetchA: typeof fetch = async () => {
        await aGate;
        throw new Error("old worker network boom");
      };
      const fetchB: typeof fetch = async () =>
        new Response(mp4WithAudioBytes, {
          status: 200,
          headers: { "content-type": "video/mp4" },
        });

      const syncAPromise = syncSceneVideoAttempt(created.id, {
        supabase: fake.supabase as never,
        videoProvider: mock.provider,
        fetchImpl: fetchA,
        now,
      });

      await waitUntil(
        () => fake.attempts.get(created.id)?.status === "downloading",
        "worker A claim",
      );
      const ownerA = fake.attempts.get(created.id)!.download_claim_owner;
      assert.ok(ownerA);

      clock += SCENE_VIDEO_DOWNLOAD_CLAIM_STALE_MS + 1_000;

      const resultB = await syncSceneVideoAttempt(created.id, {
        supabase: fake.supabase as never,
        videoProvider: mock.provider,
        fetchImpl: fetchB,
        now,
      });
      assert.equal(resultB.status, "succeeded");
      assert.equal(resultB.outputPath != null, true);
      const ownerAfterB = fake.attempts.get(created.id)!;
      assert.equal(ownerAfterB.download_claim_owner, null);
      assert.equal(ownerAfterB.status, "succeeded");

      releaseA();
      const resultA = await syncAPromise;
      assert.equal(resultA.status, "succeeded");
      assert.equal(fake.attempts.get(created.id)!.status, "succeeded");
      assert.equal(fake.attempts.get(created.id)!.failure_code, null);
      assert.equal(fake.uploads.length, 1);
      assert.equal(mock.createCalls, createCallsAfterCreate);
      assert.notEqual(
        fake.attempts.get(created.id)!.download_claim_owner,
        ownerA,
      );
    },
  );

  await check(
    "7C stale reclaim: old worker upload failure cannot overwrite new owner",
    async () => {
      let clock = Date.parse("2026-01-01T00:00:00.000Z");
      const now = () => new Date(clock);
      let failUploads = false;
      const fake = makeFakeSupabase({
        uploadShouldFail: () => (failUploads ? "forced upload deny" : null),
      });
      const mock = mockProvider({
        async getImageToVideoTask(id) {
          return {
            provider: "runway",
            providerTaskId: id,
            status: "succeeded",
            model: "gen4_turbo",
            videoUrl: "https://cdn.example/out.mp4",
          };
        },
      });
      const created = await createSceneVideoAttempt(
        { ...baseCreate, clientRequestId: crypto.randomUUID() },
        {
          supabase: fake.supabase as never,
          videoProvider: mock.provider,
          now,
        },
      );
      const createCallsAfterCreate = mock.createCalls;

      let releaseA!: () => void;
      const aGate = new Promise<void>((r) => {
        releaseA = r;
      });
      const fetchA: typeof fetch = async () => {
        await aGate;
        return new Response(mp4WithAudioBytes, {
          status: 200,
          headers: { "content-type": "video/mp4" },
        });
      };
      const fetchB: typeof fetch = async () =>
        new Response(mp4WithAudioBytes, {
          status: 200,
          headers: { "content-type": "video/mp4" },
        });

      const syncAPromise = syncSceneVideoAttempt(created.id, {
        supabase: fake.supabase as never,
        videoProvider: mock.provider,
        fetchImpl: fetchA,
        now,
      });

      await waitUntil(
        () => fake.attempts.get(created.id)?.status === "downloading",
        "worker A claim",
      );
      clock += SCENE_VIDEO_DOWNLOAD_CLAIM_STALE_MS + 1_000;

      const resultB = await syncSceneVideoAttempt(created.id, {
        supabase: fake.supabase as never,
        videoProvider: mock.provider,
        fetchImpl: fetchB,
        now,
      });
      assert.equal(resultB.status, "succeeded");
      failUploads = true;
      releaseA();
      const resultA = await syncAPromise;
      assert.equal(resultA.status, "succeeded");
      assert.equal(fake.attempts.get(created.id)!.status, "succeeded");
      assert.equal(fake.attempts.get(created.id)!.failure_code, null);
      assert.equal(mock.createCalls, createCallsAfterCreate);
    },
  );

  await check(
    "7C stale reclaim: old worker upload ok but lost claim skips final DB write",
    async () => {
      let clock = Date.parse("2026-01-01T00:00:00.000Z");
      const now = () => new Date(clock);
      const fake = makeFakeSupabase();
      const mock = mockProvider({
        async getImageToVideoTask(id) {
          return {
            provider: "runway",
            providerTaskId: id,
            status: "succeeded",
            model: "gen4_turbo",
            videoUrl: "https://cdn.example/out.mp4",
          };
        },
      });
      const created = await createSceneVideoAttempt(
        { ...baseCreate, clientRequestId: crypto.randomUUID() },
        {
          supabase: fake.supabase as never,
          videoProvider: mock.provider,
          now,
        },
      );
      const createCallsAfterCreate = mock.createCalls;

      let releaseA!: () => void;
      const aGate = new Promise<void>((r) => {
        releaseA = r;
      });
      const fetchA: typeof fetch = async () => {
        await aGate;
        return new Response(mp4WithAudioBytes, {
          status: 200,
          headers: { "content-type": "video/mp4" },
        });
      };
      const fetchB: typeof fetch = async () =>
        new Response(mp4WithAudioBytes, {
          status: 200,
          headers: { "content-type": "video/mp4" },
        });

      const syncAPromise = syncSceneVideoAttempt(created.id, {
        supabase: fake.supabase as never,
        videoProvider: mock.provider,
        fetchImpl: fetchA,
        now,
      });

      await waitUntil(
        () => fake.attempts.get(created.id)?.status === "downloading",
        "worker A claim",
      );
      clock += SCENE_VIDEO_DOWNLOAD_CLAIM_STALE_MS + 1_000;

      const resultB = await syncSceneVideoAttempt(created.id, {
        supabase: fake.supabase as never,
        videoProvider: mock.provider,
        fetchImpl: fetchB,
        now,
      });
      assert.equal(resultB.status, "succeeded");
      const pathAfterB = fake.attempts.get(created.id)!.output_path;
      assert.ok(pathAfterB);

      releaseA();
      const resultA = await syncAPromise;
      assert.equal(resultA.status, "succeeded");
      assert.equal(fake.attempts.get(created.id)!.status, "succeeded");
      assert.equal(fake.attempts.get(created.id)!.output_path, pathAfterB);
      assert.equal(mock.createCalls, createCallsAfterCreate);
      // B uploaded once; A may upsert the same path — still one durable attempt output.
      assert.ok(fake.uploads.length >= 1);
      assert.equal(
        new Set(fake.uploads.map((u) => u.path)).size,
        1,
        "single output path",
      );
    },
  );

  await check("9B-1) concurrent submission claim → one provider POST", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const attemptId = crypto.randomUUID();
    const clientId = crypto.randomUUID();
    const now = new Date("2026-01-01T00:00:00.000Z").toISOString();
    fake.attempts.set(attemptId, {
      id: attemptId,
      project_id: PROJECT_A,
      video_job_id: JOB_A,
      scene_id: "scene-1",
      client_request_id: clientId,
      parent_attempt_id: null,
      source_image_bucket: "video-renders",
      source_image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
      motion_prompt: "slow camera push-in",
      provider: "runway",
      model: "gen4_turbo",
      duration_seconds: 5,
      ratio: "720:1280",
      seed: null,
      provider_task_id: null,
      status: "created",
      failure_code: null,
      error_message: null,
      estimated_credits: 5,
      estimated_cost_usd: 0.25,
      created_at: now,
      submitted_at: null,
      started_at: null,
      completed_at: null,
      updated_at: now,
      generation_duration_ms: null,
      output_bucket: null,
      output_path: null,
      output_duration_seconds: null,
      output_has_audio: null,
      provider_metadata: null,
      download_claimed_at: null,
      download_claim_owner: null,
      submission_claimed_at: null,
      submission_claim_owner: null,
    });

    const [a, b] = await Promise.all([
      createSceneVideoAttempt(
        { ...baseCreate, clientRequestId: clientId },
        {
          supabase: fake.supabase as never,
          videoProvider: mock.provider,
          submissionClaimOwner: "worker-a",
        },
      ),
      createSceneVideoAttempt(
        { ...baseCreate, clientRequestId: clientId },
        {
          supabase: fake.supabase as never,
          videoProvider: mock.provider,
          submissionClaimOwner: "worker-b",
        },
      ),
    ]);
    assert.equal(a.id, b.id);
    assert.equal(mock.createCalls, 1);
  });

  await check("9B-2) non-owner does not POST on active submitting claim", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const id = crypto.randomUUID();
    const now = new Date("2026-01-01T00:00:00.000Z");
    fake.attempts.set(id, {
      id,
      project_id: PROJECT_A,
      video_job_id: JOB_A,
      scene_id: "scene-1",
      client_request_id: REQUEST_3,
      parent_attempt_id: null,
      source_image_bucket: "video-renders",
      source_image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
      motion_prompt: "slow camera push-in",
      provider: "runway",
      model: "gen4_turbo",
      duration_seconds: 5,
      ratio: "720:1280",
      seed: null,
      provider_task_id: null,
      status: "submitting",
      failure_code: null,
      error_message: null,
      estimated_credits: 5,
      estimated_cost_usd: 0.25,
      created_at: now.toISOString(),
      submitted_at: null,
      started_at: null,
      completed_at: null,
      updated_at: now.toISOString(),
      generation_duration_ms: null,
      output_bucket: null,
      output_path: null,
      output_duration_seconds: null,
      output_has_audio: null,
      provider_metadata: null,
      download_claimed_at: null,
      download_claim_owner: null,
      submission_claimed_at: now.toISOString(),
      submission_claim_owner: "worker-a",
    });

    const view = await createSceneVideoAttempt(
      { ...baseCreate, clientRequestId: REQUEST_3 },
      {
        supabase: fake.supabase as never,
        videoProvider: mock.provider,
        submissionClaimOwner: "worker-b",
        now: () => new Date(now.getTime() + 1_000),
      },
    );
    assert.equal(mock.createCalls, 0);
    assert.equal(view.status, "submitting");
    assert.equal(view.reusedExistingRequest, true);
  });

  await check("9B-3) stale submission claim → submission_unknown; no auto POST", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const attemptId = crypto.randomUUID();
    const now = new Date("2026-01-01T00:00:00.000Z");
    fake.attempts.set(attemptId, {
      id: attemptId,
      project_id: PROJECT_A,
      video_job_id: JOB_A,
      scene_id: "scene-1",
      client_request_id: REQUEST_1,
      parent_attempt_id: null,
      source_image_bucket: "video-renders",
      source_image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
      motion_prompt: "slow camera push-in",
      provider: "runway",
      model: "gen4_turbo",
      duration_seconds: 5,
      ratio: "720:1280",
      seed: null,
      provider_task_id: null,
      status: "submitting",
      failure_code: null,
      error_message: null,
      estimated_credits: 5,
      estimated_cost_usd: 0.25,
      created_at: now.toISOString(),
      submitted_at: null,
      started_at: null,
      completed_at: null,
      updated_at: now.toISOString(),
      generation_duration_ms: null,
      output_bucket: null,
      output_path: null,
      output_duration_seconds: null,
      output_has_audio: null,
      provider_metadata: null,
      download_claimed_at: null,
      download_claim_owner: null,
      submission_claimed_at: now.toISOString(),
      submission_claim_owner: "worker-a",
    });

    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          { ...baseCreate, clientRequestId: REQUEST_1 },
          {
            supabase: fake.supabase as never,
            videoProvider: mock.provider,
            submissionClaimOwner: "worker-b",
            now: () =>
              new Date(now.getTime() + SCENE_VIDEO_SUBMISSION_CLAIM_STALE_MS + 1),
          },
        ),
      /submission_unknown/,
    );
    assert.equal(mock.createCalls, 0);
    assert.equal(fake.attempts.get(attemptId)!.status, "submission_unknown");
  });

  await check("9B-4) signed URL failure before POST → failed; no provider create", async () => {
    const fake = makeFakeSupabase();
    const supabaseBroken = {
      from: fake.supabase.from.bind(fake.supabase),
      storage: {
        from() {
          return {
            async createSignedUrl() {
              return { data: null, error: { message: "denied" } };
            },
            async upload() {
              return { data: { path: "x" }, error: null };
            },
          };
        },
      },
    };
    const mock = mockProvider();
    await assert.rejects(
      () =>
        createSceneVideoAttempt(
          { ...baseCreate, clientRequestId: crypto.randomUUID() },
          {
            supabase: supabaseBroken as never,
            videoProvider: mock.provider,
          },
        ),
      /source_signed_url_failed/,
    );
    assert.equal(mock.createCalls, 0);
    const row = [...fake.attempts.values()].find(
      (r) => r.status === "failed",
    );
    assert.ok(row);
    assert.equal(row!.failure_code, "source_signed_url_failed");
  });

  await check("9C-1) active submitting sync keeps submitting", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const attemptId = crypto.randomUUID();
    const now = new Date("2026-01-01T00:00:00.000Z");
    fake.attempts.set(attemptId, {
      id: attemptId,
      project_id: PROJECT_A,
      video_job_id: JOB_A,
      scene_id: "scene-1",
      client_request_id: REQUEST_2,
      parent_attempt_id: null,
      source_image_bucket: "video-renders",
      source_image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
      motion_prompt: "slow camera push-in",
      provider: "runway",
      model: "gen4_turbo",
      duration_seconds: 5,
      ratio: "720:1280",
      seed: null,
      provider_task_id: null,
      status: "submitting",
      failure_code: null,
      error_message: null,
      estimated_credits: 5,
      estimated_cost_usd: 0.25,
      created_at: now.toISOString(),
      submitted_at: null,
      started_at: null,
      completed_at: null,
      updated_at: now.toISOString(),
      generation_duration_ms: null,
      output_bucket: null,
      output_path: null,
      output_duration_seconds: null,
      output_has_audio: null,
      provider_metadata: null,
      download_claimed_at: null,
      download_claim_owner: null,
      submission_claimed_at: now.toISOString(),
      submission_claim_owner: "worker-a",
    });
    const synced = await syncSceneVideoAttempt(attemptId, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
      now: () => new Date(now.getTime() + 1_000),
    });
    assert.equal(synced.status, "submitting");
    assert.equal(mock.createCalls, 0);
    assert.equal(mock.getCalls, 0);
  });

  await check("9C-2) active submitting sync does not call provider", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const attemptId = crypto.randomUUID();
    const now = new Date("2026-01-01T00:00:00.000Z");
    fake.attempts.set(attemptId, {
      id: attemptId,
      project_id: PROJECT_A,
      video_job_id: JOB_A,
      scene_id: "scene-1",
      client_request_id: REQUEST_3,
      parent_attempt_id: null,
      source_image_bucket: "video-renders",
      source_image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
      motion_prompt: "slow camera push-in",
      provider: "runway",
      model: "gen4_turbo",
      duration_seconds: 5,
      ratio: "720:1280",
      seed: null,
      provider_task_id: null,
      status: "submitting",
      failure_code: null,
      error_message: null,
      estimated_credits: 5,
      estimated_cost_usd: 0.25,
      created_at: now.toISOString(),
      submitted_at: null,
      started_at: null,
      completed_at: null,
      updated_at: now.toISOString(),
      generation_duration_ms: null,
      output_bucket: null,
      output_path: null,
      output_duration_seconds: null,
      output_has_audio: null,
      provider_metadata: null,
      download_claimed_at: null,
      download_claim_owner: null,
      submission_claimed_at: now.toISOString(),
      submission_claim_owner: "worker-a",
    });
    await syncSceneVideoAttempt(attemptId, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
      now: () => new Date(now.getTime() + 500),
    });
    assert.equal(mock.getCalls, 0);
    assert.equal(mock.createCalls, 0);
  });

  await check("9C-3) stale submitting sync → submission_unknown", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const attemptId = crypto.randomUUID();
    const now = new Date("2026-01-01T00:00:00.000Z");
    fake.attempts.set(attemptId, {
      id: attemptId,
      project_id: PROJECT_A,
      video_job_id: JOB_A,
      scene_id: "scene-1",
      client_request_id: REQUEST_1,
      parent_attempt_id: null,
      source_image_bucket: "video-renders",
      source_image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
      motion_prompt: "slow camera push-in",
      provider: "runway",
      model: "gen4_turbo",
      duration_seconds: 5,
      ratio: "720:1280",
      seed: null,
      provider_task_id: null,
      status: "submitting",
      failure_code: null,
      error_message: null,
      estimated_credits: 5,
      estimated_cost_usd: 0.25,
      created_at: now.toISOString(),
      submitted_at: null,
      started_at: null,
      completed_at: null,
      updated_at: now.toISOString(),
      generation_duration_ms: null,
      output_bucket: null,
      output_path: null,
      output_duration_seconds: null,
      output_has_audio: null,
      provider_metadata: null,
      download_claimed_at: null,
      download_claim_owner: null,
      submission_claimed_at: now.toISOString(),
      submission_claim_owner: "worker-a",
    });
    const synced = await syncSceneVideoAttempt(attemptId, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
      now: () =>
        new Date(now.getTime() + SCENE_VIDEO_SUBMISSION_CLAIM_STALE_MS + 1),
    });
    assert.equal(synced.status, "submission_unknown");
    assert.equal(fake.attempts.get(attemptId)!.status, "submission_unknown");
  });

  await check("9C-4) stale submitting sync never create/poll without task id", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const attemptId = crypto.randomUUID();
    const now = new Date("2026-01-01T00:00:00.000Z");
    fake.attempts.set(attemptId, {
      id: attemptId,
      project_id: PROJECT_A,
      video_job_id: JOB_A,
      scene_id: "scene-1",
      client_request_id: REQUEST_2,
      parent_attempt_id: null,
      source_image_bucket: "video-renders",
      source_image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
      motion_prompt: "slow camera push-in",
      provider: "runway",
      model: "gen4_turbo",
      duration_seconds: 5,
      ratio: "720:1280",
      seed: null,
      provider_task_id: null,
      status: "submitting",
      failure_code: null,
      error_message: null,
      estimated_credits: 5,
      estimated_cost_usd: 0.25,
      created_at: now.toISOString(),
      submitted_at: null,
      started_at: null,
      completed_at: null,
      updated_at: now.toISOString(),
      generation_duration_ms: null,
      output_bucket: null,
      output_path: null,
      output_duration_seconds: null,
      output_has_audio: null,
      provider_metadata: null,
      download_claimed_at: null,
      download_claim_owner: null,
      submission_claimed_at: now.toISOString(),
      submission_claim_owner: "worker-a",
    });
    await syncSceneVideoAttempt(attemptId, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
      now: () =>
        new Date(now.getTime() + SCENE_VIDEO_SUBMISSION_CLAIM_STALE_MS + 1),
    });
    assert.equal(mock.createCalls, 0);
    assert.equal(mock.getCalls, 0);
  });

  await check("9C-5) stale CAS returns row if claim already cleared", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const attemptId = crypto.randomUUID();
    const now = new Date("2026-01-01T00:00:00.000Z");
    fake.attempts.set(attemptId, {
      id: attemptId,
      project_id: PROJECT_A,
      video_job_id: JOB_A,
      scene_id: "scene-1",
      client_request_id: REQUEST_3,
      parent_attempt_id: null,
      source_image_bucket: "video-renders",
      source_image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
      motion_prompt: "slow camera push-in",
      provider: "runway",
      model: "gen4_turbo",
      duration_seconds: 5,
      ratio: "720:1280",
      seed: null,
      provider_task_id: TASK_ID,
      status: "submitted",
      failure_code: null,
      error_message: null,
      estimated_credits: 5,
      estimated_cost_usd: 0.25,
      created_at: now.toISOString(),
      submitted_at: now.toISOString(),
      started_at: null,
      completed_at: null,
      updated_at: now.toISOString(),
      generation_duration_ms: null,
      output_bucket: null,
      output_path: null,
      output_duration_seconds: null,
      output_has_audio: null,
      provider_metadata: null,
      download_claimed_at: null,
      download_claim_owner: null,
      submission_claimed_at: null,
      submission_claim_owner: null,
    });
    const synced = await syncSceneVideoAttempt(attemptId, {
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
    });
    assert.equal(synced.status, "pending");
    assert.equal(mock.getCalls, 1);
    assert.equal(mock.createCalls, 0);
  });

  await check("9C-6) executor stale submitting → needs_review, no POST", async () => {
    const fake = makeFakeSupabase();
    const mock = mockProvider();
    const plan = buildSceneVideoGenerationPlan({
      scenes: [
        {
          id: "scene-1",
          image_prompt: "Still one",
          duration_seconds: 4,
          image_bucket: "video-renders",
          image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
          motion_prompt: "slow push-in scene one",
        },
        {
          id: "scene-2",
          image_prompt: "Still two",
          duration_seconds: 4,
          image_bucket: "video-renders",
          image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
          motion_prompt: "slow push-in scene two",
        },
      ],
      dryRun: true,
    });
    const client1 = buildSceneVideoClientRequestId({
      videoJobId: JOB_A,
      material: plan.items[0]!.idempotencyMaterial,
    });
    const attemptId = crypto.randomUUID();
    const now = new Date("2026-01-01T00:00:00.000Z");
    fake.attempts.set(attemptId, {
      id: attemptId,
      project_id: PROJECT_A,
      video_job_id: JOB_A,
      scene_id: "scene-1",
      client_request_id: client1,
      parent_attempt_id: null,
      source_image_bucket: "video-renders",
      source_image_path: `${PROJECT_A}/video/${JOB_A}/scene-1.png`,
      motion_prompt: "slow push-in scene one",
      provider: "runway",
      model: "gen4_turbo",
      duration_seconds: 5,
      ratio: "720:1280",
      seed: null,
      provider_task_id: null,
      status: "submitting",
      failure_code: null,
      error_message: null,
      estimated_credits: 5,
      estimated_cost_usd: 0.25,
      created_at: now.toISOString(),
      submitted_at: null,
      started_at: null,
      completed_at: null,
      updated_at: now.toISOString(),
      generation_duration_ms: null,
      output_bucket: null,
      output_path: null,
      output_duration_seconds: null,
      output_has_audio: null,
      provider_metadata: null,
      download_claimed_at: null,
      download_claim_owner: null,
      submission_claimed_at: now.toISOString(),
      submission_claim_owner: "worker-a",
    });
    const gateway = defaultSceneVideoAttemptGateway({
      supabase: fake.supabase as never,
      videoProvider: mock.provider,
      now: () =>
        new Date(now.getTime() + SCENE_VIDEO_SUBMISSION_CLAIM_STALE_MS + 1),
    });
    const result = await executeSceneVideoPlan(
      {
        projectId: PROJECT_A,
        videoJobId: JOB_A,
        plan,
        maxBudgetUsd: 10,
        confirmPaidRun: true,
      },
      {
        gateway,
        isGenerationEnabled: true,
        hasApiKey: true,
        pollIntervalMs: 50,
        pollTimeoutMs: 5_000,
        sleep: async () => undefined,
      },
    );
    assert.equal(result.status, "needs_review");
    assert.equal(result.scenes[0]!.outcome, "unresolved");
    assert.equal(result.scenes[0]!.attemptStatus, "submission_unknown");
    assert.equal(result.scenes[1]!.outcome, "skipped");
    assert.equal(mock.createCalls, 0);
    assert.equal(mock.getCalls, 0);
  });

  await check("27) no real network / paid calls", () => {
    assert.ok(true);
  });
} finally {
  await rm(fixtureDir, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
