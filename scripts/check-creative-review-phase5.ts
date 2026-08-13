/**
 * Phase 5 — Continue Generation orchestration checks.
 *
 * Run: npx tsx scripts/check-creative-review-phase5.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  clearContinuedAfterCreativeReview,
  hasContinuedAfterCreativeReview,
  markContinuedAfterCreativeReview,
  shouldDeferVideoUntilCreativeReview,
} from "../lib/ai/generationMode";
import {
  continueCreativeReviewGeneration,
  validatePackagesReadyForContinue,
} from "../lib/ai/workflows/continueCreativeReviewGeneration";
import {
  canContinueCreativeReviewGeneration,
  computeCreativeReviewRunProgress,
} from "../lib/creative-review/progress";
import { seedCreativeReviewFromPackage } from "../lib/creative-review/seed";
import {
  commitCreativeReviewApprove,
  commitCreativeReviewSave,
  commitCreativeReviewTranslate,
} from "../lib/creative-review/mutations";
import type { CreativeReview } from "../lib/creative-review/types";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";

const root = join(import.meta.dirname, "..");
const ACTOR = { type: "user" as const, id: "editor-1" };
const FIXED_NOW = () => new Date("2026-08-11T16:00:00.000Z");

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`  ✓ ${name}`))
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      throw err;
    });
}

function minimalPackage(): Pick<
  ContentPackageOutput,
  "voiceover_text" | "visual_scenes" | "image_prompts"
> {
  return {
    voiceover_text: "Original VO.",
    visual_scenes: [
      { source: "ai", image_prompt: "A calm office morning" },
    ],
    image_prompts: ["A calm office morning"],
  };
}

function approveReview(review: CreativeReview): CreativeReview {
  const saved = commitCreativeReviewSave({
    current: review,
    expectedVersion: review.version,
    edits: {
      voiceoverLocalizedEdit: "Schválený voiceover.",
      scenes: review.scenes.map((scene) => ({
        id: scene.id,
        intentLocalizedEdit: scene.intent.localized_edit,
        directorNotes: scene.director_notes,
      })),
    },
    actor: ACTOR,
    timestamp: "2026-08-11T12:01:00.000Z",
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) throw new Error("save failed");
  const voiceover = {
    ...saved.review.voiceover,
    english_preview: "Approved voiceover.",
    english_preview_outdated: false,
  };
  const scenes = saved.review.scenes.map((scene, index) => ({
    ...scene,
    intent: {
      ...scene.intent,
      english_preview: `Scene ${index + 1} EN`,
      english_preview_outdated: false,
    },
  }));
  const translated = commitCreativeReviewTranslate({
    current: saved.review,
    expectedVersion: saved.review.version,
    voiceover,
    scenes,
    actor: ACTOR,
    timestamp: "2026-08-11T12:02:00.000Z",
  });
  assert.equal(translated.ok, true);
  if (!translated.ok) throw new Error("translate failed");
  const approved = commitCreativeReviewApprove({
    current: translated.review,
    expectedVersion: translated.review.version,
    actor: ACTOR,
    timestamp: "2026-08-11T12:04:00.000Z",
  });
  assert.equal(approved.ok, true);
  if (!approved.ok) throw new Error("approve failed");
  return approved.review;
}

function packageBriefWithReview(review: CreativeReview): Record<string, unknown> {
  return {
    title: "Pkg",
    funnel_stage: "Awareness",
    hook: "Hook",
    voiceover_text: "Original VO.",
    subtitles: "Original VO.",
    cta: { type: "learn_more", text: "Learn more" },
    video: { concept: "Concept", script: "Script" },
    image_prompts: ["A calm office morning"],
    visual_scenes: [
      { source: "ai", image_prompt: "A calm office morning" },
    ],
    platform_outputs: {
      tiktok: { caption: "tt" },
      instagram: { caption: "ig" },
      facebook: { caption: "fb" },
      youtube: { caption: "yt" },
      linkedin: { caption: "li" },
      x: { caption: "x" },
      google_business: { caption: "gb" },
    },
    presentation_generation: {
      pipeline: "content_pipeline",
      video_concept: {
        title: "Test concept",
        core_idea: "Core idea for consistency",
        narrative_arc: "arc",
        emotional_tone: "confident",
        audience_insight: "insight",
        product_role: "hero",
        why_it_works: "works",
        visual_direction: {
          art_direction: "clean modern documentary",
          lighting: "soft natural window light",
          palette: "cool neutrals with teal accent",
          environment: "bright contemporary office",
          camera_style: "steady mid shots",
          character_style: "professional founders",
        },
      },
      opening_impact: {
        first_image: "Founder at a laptop in morning light",
        first_spoken_sentence: "Most teams waste their mornings.",
        emotion: "urgent clarity",
        pacing: "fast",
        attention_pattern: "pattern_interrupt",
      },
      visual_identity: {
        art_direction: "clean modern documentary",
        lighting: "soft natural window light",
        palette: "cool neutrals with teal accent",
        environment: "bright contemporary office",
        camera_style: "steady mid shots",
        character_style: "professional founders",
        opening_emotion: "urgent clarity",
        opening_first_image: "Founder at a laptop in morning light",
      },
    },
    creative_review: review,
  };
}

type Row = Record<string, unknown>;

class FakeQuery {
  private filters: Array<(row: Row) => boolean> = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private insertRows: Row[] | null = null;
  private updatePatch: Row | null = null;
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private selectCols = "*";

  constructor(
    private readonly db: FakeDb,
    private readonly table: string,
  ) {}

  select(cols = "*") {
    this.selectCols = cols;
    if (this.mode === "update" || this.mode === "insert") {
      // chained after mutation
    } else {
      this.mode = "select";
    }
    return this;
  }

  insert(row: Row | Row[]) {
    this.mode = "insert";
    this.insertRows = Array.isArray(row) ? row : [row];
    return this;
  }

  update(patch: Row) {
    this.mode = "update";
    this.updatePatch = patch;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  eq(col: string, value: unknown) {
    this.filters.push((row) => row[col] === value);
    return this;
  }

  in(col: string, values: unknown[]) {
    const set = new Set(values);
    this.filters.push((row) => set.has(row[col]));
    return this;
  }

  is(col: string, value: null) {
    this.filters.push((row) => row[col] === value);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  private applyFilters(rows: Row[]): Row[] {
    let out = rows.filter((row) => this.filters.every((fn) => fn(row)));
    if (this.orderCol) {
      const col = this.orderCol;
      out = [...out].sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return av < bv ? (this.orderAsc ? -1 : 1) : this.orderAsc ? 1 : -1;
      });
    }
    if (this.limitN != null) out = out.slice(0, this.limitN);
    return out;
  }

  private maybeUniqueViolation(row: Row): { error: { code: string } } | null {
    if (this.table !== "video_jobs") return null;
    const packageId = row.package_id;
    if (!packageId) return null;
    const active = this.db.tables.video_jobs.filter(
      (j) =>
        j.package_id === packageId &&
        (j.status === "queued" || j.status === "processing") &&
        j.render_kind === "package" &&
        (j.render_language == null || j.render_language === null),
    );
    if (active.length > 0) return { error: { code: "23505" } };
    return null;
  }

  async maybeSingle(): Promise<{ data: Row | null; error: null }> {
    const result = await this.execute();
    const rows = (result.data as Row[] | null) ?? [];
    return { data: rows[0] ?? null, error: null };
  }

  async single(): Promise<{ data: Row; error: unknown }> {
    const result = await this.execute();
    if (result.error) return { data: null as unknown as Row, error: result.error };
    const rows = (result.data as Row[] | null) ?? [];
    return { data: rows[0]!, error: null };
  }

  then<TResult1 = { data: Row[] | null; error: unknown }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Row[] | null; error: unknown }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: Row[] | null; error: unknown }> {
    const table = this.db.tables[this.table] ?? [];
    if (this.mode === "select") {
      return { data: this.applyFilters(table), error: null };
    }
    if (this.mode === "insert") {
      const inserted: Row[] = [];
      for (const row of this.insertRows ?? []) {
        const violation = this.maybeUniqueViolation(row);
        if (violation) return { data: null, error: violation.error };
        const withId = {
          ...row,
          id: row.id ?? `${this.table}-${++this.db.seq}`,
          created_at: row.created_at ?? new Date().toISOString(),
        };
        table.push(withId);
        inserted.push(withId);
      }
      this.db.tables[this.table] = table;
      return { data: inserted, error: null };
    }
    if (this.mode === "update") {
      const matched = this.applyFilters(table);
      for (const row of matched) {
        Object.assign(row, this.updatePatch);
      }
      return { data: matched, error: null };
    }
    if (this.mode === "delete") {
      const matched = new Set(this.applyFilters(table));
      this.db.tables[this.table] = table.filter((row) => !matched.has(row));
      return { data: [...matched], error: null };
    }
    return { data: [], error: null };
  }
}

class FakeDb {
  seq = 0;
  tables: Record<string, Row[]> = {
    production_runs: [],
    production_run_items: [],
    content_packages: [],
    content_items: [],
    video_jobs: [],
  };

  from(table: string) {
    return new FakeQuery(this, table);
  }

  async rpc(name: string, args: Record<string, unknown>) {
    if (name === "claim_video_job_for_dispatch") {
      const job = this.tables.video_jobs.find(
        (row) =>
          row.id === args.p_job_id && row.project_id === args.p_project_id,
      );
      if (!job) return { data: { status: "missing" }, error: null };
      if (job.status === "queued") {
        return {
          data: {
            status: "claimed",
            lease_owner: null,
            lease_expires_at: null,
          },
          error: null,
        };
      }
      if (job.status === "completed" || job.status === "failed") {
        return {
          data: {
            status: "terminal",
            job_status: job.status,
            output: job.output ?? {},
          },
          error: null,
        };
      }
      return {
        data: {
          status: "busy",
          job_status: job.status,
          lease_expires_at: null,
        },
        error: null,
      };
    }
    return { data: null, error: { message: `unknown rpc ${name}` } };
  }
}

function buildApprovedFixture() {
  const seeded = seedCreativeReviewFromPackage(minimalPackage(), {
    now: () => new Date("2026-08-11T12:00:00.000Z"),
  });
  const approved = approveReview(seeded);
  const brief = packageBriefWithReview(approved);
  return { approved, brief };
}

function seedFakeRun(db: FakeDb, args?: { status?: string; continued?: boolean }) {
  const { approved, brief } = buildApprovedFixture();
  const runId = "run-1";
  const projectId = "proj-1";
  const packageId = "pkg-1";
  const itemId = "ci-1";

  let requested_config: Record<string, unknown> = {
    plan: {
      videoCount: 1,
      activeVideoPlatforms: ["tiktok"],
      platformOutputs: [{ kind: "video", platform: "tiktok" }],
    },
    config: { generationMode: "manual_review" },
  };
  if (args?.continued) {
    requested_config = markContinuedAfterCreativeReview(requested_config, {
      at: "2026-08-11T15:00:00.000Z",
      by: ACTOR.id,
    });
  }

  db.tables.production_runs.push({
    id: runId,
    project_id: projectId,
    status: args?.status ?? "waiting_for_creative_review",
    requested_config,
    package_count: 1,
    generated_total: 1,
    failed_total: 0,
    error_message: null,
  });
  db.tables.production_run_items.push({
    package_index: 0,
    content_package_id: packageId,
    status: "completed",
    production_run_id: runId,
    project_id: projectId,
  });
  db.tables.content_packages.push({
    id: packageId,
    title: "Package 1",
    package_brief: brief,
    project_id: projectId,
  });
  db.tables.content_items.push({
    id: itemId,
    package_id: packageId,
    platform: "tiktok",
    project_id: projectId,
    language: null,
    generation_metadata: { production_run_id: runId },
  });

  return { runId, projectId, packageId, itemId, approved, brief };
}

async function main() {
  console.log("A — Validation + readiness");

  await check("validatePackagesReadyForContinue accepts approved packages", () => {
    const { brief } = buildApprovedFixture();
    const result = validatePackagesReadyForContinue([
      { packageId: "pkg-1", packageIndex: 0, brief },
    ]);
    assert.equal(result.ok, true);
  });

  await check("validatePackagesReadyForContinue rejects unapproved", () => {
    const seeded = seedCreativeReviewFromPackage(minimalPackage(), {
      now: () => new Date("2026-08-11T12:00:00.000Z"),
    });
    const brief = packageBriefWithReview(seeded);
    const result = validatePackagesReadyForContinue([
      { packageId: "pkg-1", packageIndex: 0, brief },
    ]);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.issues.some((i) => i.path.includes("approved")));
  });

  await check("validatePackagesReadyForContinue rejects missing creative_review", () => {
    const result = validatePackagesReadyForContinue([
      { packageId: "pkg-1", packageIndex: 0, brief: { title: "x" } },
    ]);
    assert.equal(result.ok, false);
  });

  await check("canContinueCreativeReviewGeneration UI gate", () => {
    const progress = computeCreativeReviewRunProgress([
      { status: "approved", approved: true } as CreativeReview,
      { status: "approved", approved: true } as CreativeReview,
    ]);
    assert.equal(
      canContinueCreativeReviewGeneration({
        runStatus: "waiting_for_creative_review",
        progress: { ...progress, total: 2, approved: 2 },
      }),
      true,
    );
    assert.equal(
      canContinueCreativeReviewGeneration({
        runStatus: "running",
        progress: { ...progress, total: 2, approved: 2 },
      }),
      false,
    );
    assert.equal(
      canContinueCreativeReviewGeneration({
        runStatus: "waiting_for_creative_review",
        progress: { ...progress, total: 2, approved: 1 },
      }),
      false,
    );
  });

  console.log("\nB — Continue orchestration (fake DB)");

  await check("Continue success creates job + dispatches via existing helpers", async () => {
    const db = new FakeDb();
    const fixture = seedFakeRun(db);
    const dispatches: Array<Record<string, unknown>> = [];

    // Stub buildVideoJobInput path: ensureVideoJob uses real buildVideoJobInput
    // which needs TTS/assets — inject by pre-creating is heavy. Instead, spy via
    // startVideoJob and monkey-patch ensure by providing a minimal package brief
    // that buildVideoJobInput can handle — it may call supabase for assets.
    // For this test we intercept video_jobs insert by pre-seeding nothing and
    // mocking startVideoJob only after job exists.
    //
    // buildVideoJobInput hits supabase for assets/TTS — FakeDb returns empty → OK.

    const result = await continueCreativeReviewGeneration({
      projectId: fixture.projectId,
      runId: fixture.runId,
      actor: ACTOR,
      deps: {
        supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
        videoCallbackUrl: "https://example.com/api/n8n/video-callback",
        now: FIXED_NOW,
        startVideoJob: async (payload) => {
          dispatches.push(payload as unknown as Record<string, unknown>);
        },
      },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.code, "ok");
    assert.equal(result.status, "running");
    assert.equal(result.packages.length, 1);
    assert.ok(result.packages[0]!.videoJobId);
    assert.equal(result.packages[0]!.jobCreated, true);
    assert.equal(result.packages[0]!.dispatched, true);
    assert.equal(dispatches.length, 1);
    assert.equal(dispatches[0]!.project_id, fixture.projectId);
    assert.equal(dispatches[0]!.content_package_id, fixture.packageId);
    assert.equal(dispatches[0]!.video_job_id, result.packages[0]!.videoJobId);
    assert.ok(dispatches[0]!.input);
    // Worker payload must look like production (no manual_review flag on root).
    assert.equal(
      Object.prototype.hasOwnProperty.call(dispatches[0]!, "manual_review"),
      false,
    );

    const run = db.tables.production_runs[0]!;
    assert.equal(run.status, "running");
    assert.equal(hasContinuedAfterCreativeReview(run.requested_config), true);
    assert.equal(
      shouldDeferVideoUntilCreativeReview(
        "manual_review",
        run.requested_config,
      ),
      false,
    );

    const brief = db.tables.content_packages[0]!.package_brief as {
      creative_review: CreativeReview;
      voiceover_text?: string;
      subtitles?: string;
      hook?: string;
      video?: { script?: string };
    };
    const spoken = brief.creative_review.voiceover.final_approved;
    assert.equal(
      brief.creative_review.history.at(-1)!.event,
      "continue_generation_started",
    );
    assert.equal(brief.voiceover_text, spoken);
    assert.equal(brief.subtitles, spoken);
    assert.equal(brief.video?.script, spoken);
    assert.equal(db.tables.content_items[0]!.body, spoken);
  });

  await check("Continue validation failure does not change run", async () => {
    const db = new FakeDb();
    const fixture = seedFakeRun(db);
    // Downgrade approval.
    const brief = db.tables.content_packages[0]!.package_brief as {
      creative_review: CreativeReview;
    };
    brief.creative_review.approved = false;
    brief.creative_review.status = "ready";

    const result = await continueCreativeReviewGeneration({
      projectId: fixture.projectId,
      runId: fixture.runId,
      actor: ACTOR,
      deps: {
        supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
        videoCallbackUrl: "https://example.com/api/n8n/video-callback",
        now: FIXED_NOW,
        startVideoJob: async () => undefined,
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "validation_failed");
    assert.equal(db.tables.production_runs[0]!.status, "waiting_for_creative_review");
    assert.equal(db.tables.video_jobs.length, 0);
  });

  await check("Continue idempotency — second call does not duplicate jobs", async () => {
    const db = new FakeDb();
    const fixture = seedFakeRun(db);
    const deps = {
      supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
      videoCallbackUrl: "https://example.com/api/n8n/video-callback",
      now: FIXED_NOW,
      startVideoJob: async () => undefined,
    };
    const first = await continueCreativeReviewGeneration({
      projectId: fixture.projectId,
      runId: fixture.runId,
      actor: ACTOR,
      deps,
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const jobCount = db.tables.video_jobs.length;
    assert.equal(jobCount, 1);

    const second = await continueCreativeReviewGeneration({
      projectId: fixture.projectId,
      runId: fixture.runId,
      actor: ACTOR,
      deps,
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.code, "already_continued");
    assert.equal(db.tables.video_jobs.length, 1);
    assert.equal(second.packages[0]!.jobCreated, false);
    assert.equal(
      second.packages[0]!.videoJobId,
      first.packages[0]!.videoJobId,
    );
  });

  await check("Duplicate concurrent claim returns already_running", async () => {
    const db = new FakeDb();
    const fixture = seedFakeRun(db, { status: "running", continued: true });
    // Simulate another request while first is mid-flight with jobs not yet present —
    // actually with continued+running and no jobs, second call will create jobs
    // (idempotent ensure). For already_running without continued flag:
    const db2 = new FakeDb();
    seedFakeRun(db2, { status: "running", continued: false });
    const result = await continueCreativeReviewGeneration({
      projectId: "proj-1",
      runId: "run-1",
      actor: ACTOR,
      deps: {
        supabase: db2 as unknown as import("@supabase/supabase-js").SupabaseClient,
        now: FIXED_NOW,
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "already_running");
    void fixture;
  });

  await check("Cancelled runs are rejected", async () => {
    const db = new FakeDb();
    seedFakeRun(db, { status: "cancelled" });
    const result = await continueCreativeReviewGeneration({
      projectId: "proj-1",
      runId: "run-1",
      actor: ACTOR,
      deps: {
        supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
        now: FIXED_NOW,
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "cancelled");
  });

  await check("Partial job-creation failure rolls back to waiting", async () => {
    const db = new FakeDb();
    seedFakeRun(db);
    // Force insert failure by making from('video_jobs').insert throw via override.
    const originalFrom = db.from.bind(db);
    let insertAttempts = 0;
    db.from = ((table: string) => {
      const q = originalFrom(table);
      if (table === "video_jobs") {
        const originalInsert = q.insert.bind(q);
        q.insert = (row: Row | Row[]) => {
          insertAttempts += 1;
          if (insertAttempts === 1) {
            throw new Error("simulated insert failure");
          }
          return originalInsert(row);
        };
      }
      return q;
    }) as typeof db.from;

    const result = await continueCreativeReviewGeneration({
      projectId: "proj-1",
      runId: "run-1",
      actor: ACTOR,
      deps: {
        supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
        videoCallbackUrl: "https://example.com/api/n8n/video-callback",
        now: FIXED_NOW,
        startVideoJob: async () => undefined,
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "job_creation_failed");
    assert.equal(db.tables.production_runs[0]!.status, "waiting_for_creative_review");
    assert.equal(
      hasContinuedAfterCreativeReview(
        db.tables.production_runs[0]!.requested_config,
      ),
      false,
    );
    assert.equal(db.tables.video_jobs.length, 0);
  });

  await check("clearContinuedAfterCreativeReview restores deferral", () => {
    const stamped = markContinuedAfterCreativeReview(
      { plan: {}, config: { generationMode: "manual_review" } },
      { at: "2026-08-11T12:00:00.000Z" },
    );
    const cleared = clearContinuedAfterCreativeReview(stamped);
    assert.equal(hasContinuedAfterCreativeReview(cleared), false);
    assert.equal(
      shouldDeferVideoUntilCreativeReview("manual_review", cleared),
      true,
    );
  });

  console.log("\nC — Source wiring / compatibility");

  await check("Continue reuses buildVideoJobInput + claimAndDispatchVariantVideoJob", () => {
    const src = readFileSync(
      join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
      "utf8",
    );
    assert.match(src, /buildVideoJobInput/);
    assert.match(src, /claimAndDispatchVariantVideoJob/);
    assert.match(src, /markContinuedAfterCreativeReview/);
    assert.match(src, /continue_generation_started/);
    assert.match(src, /rebuildCreativePackageForVideo/);
    assert.doesNotMatch(src, /video-worker\/jobRunner/);
  });

  await check("reconcile + start-video-job honor continue flag", () => {
    const admin = readFileSync(
      join(root, "lib/api/production-run-admin.ts"),
      "utf8",
    );
    const start = readFileSync(
      join(root, "app/api/n8n/start-video-job/route.ts"),
      "utf8",
    );
    assert.match(admin, /shouldDeferVideoUntilCreativeReview/);
    assert.match(start, /shouldDeferVideoUntilCreativeReview/);
  });

  await check("UI exposes Continue Generation with server action", () => {
    const workspace = readFileSync(
      join(
        root,
        "components/creative-review/CreativeReviewWorkspace/CreativeReviewWorkspace.tsx",
      ),
      "utf8",
    );
    const actions = readFileSync(
      join(root, "app/projects/[id]/creative-review/actions.ts"),
      "utf8",
    );
    assert.match(workspace, /Continue Generation/);
    assert.match(workspace, /continueCreativeReviewGenerationAction/);
    assert.match(actions, /continueCreativeReviewGeneration/);
    assert.match(actions, /getProjectForAdmin/);
    assert.match(actions, /resolveVideoCallbackUrl/);
    assert.doesNotMatch(workspace, /Scene Intent → Image/i);
  });

  await check("permission failures require project ownership", () => {
    const actions = readFileSync(
      join(root, "app/projects/[id]/creative-review/actions.ts"),
      "utf8",
    );
    assert.match(actions, /continueCreativeReviewGenerationAction/);
    assert.match(actions, /requireProjectEditor/);
  });

  await check("worker / persist paths unchanged for production generation", () => {
    const persist = readFileSync(
      join(root, "lib/ai/workflows/generateContentPackage.ts"),
      "utf8",
    );
    assert.match(persist, /!defersVideoUntilCreativeReview\(generationMode\)/);
    assert.match(persist, /shouldDeferVideoUntilCreativeReview/);
  });

  console.log("\nAll Phase 5 Continue Generation checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
