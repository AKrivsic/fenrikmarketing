/**
 * Phase 7A — Cancel Manual Review regression checks.
 *
 * Run: npx tsx scripts/check-creative-review-phase7a.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canCancelManualReview,
  cancelManualReview,
  MANUAL_REVIEW_CANCELLED_MESSAGE,
} from "../lib/ai/workflows/cancelManualReview";
import { continueCreativeReviewGeneration } from "../lib/ai/workflows/continueCreativeReviewGeneration";
import { seedCreativeReviewFromPackage } from "../lib/creative-review/seed";
import { readCreativeReviewFromBrief } from "../lib/creative-review/read";
import type { CreativeReview } from "../lib/creative-review/types";
import type { ContentPackageOutput } from "../lib/ai/schemas/contentPackage";
import { CREATIVE_REVIEW_HISTORY_EVENTS } from "../lib/creative-review/types";

const root = join(import.meta.dirname, "..");
const ACTOR = { type: "user" as const, id: "editor-1" };

type Row = Record<string, unknown>;

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
    visual_scenes: [{ source: "ai", image_prompt: "A calm office morning" }],
    image_prompts: ["A calm office morning"],
  };
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
    visual_scenes: [{ source: "ai", image_prompt: "A calm office morning" }],
    platform_outputs: { tiktok: { caption: "tt" } },
    creative_review: review,
    presentation_generation: {
      visual_identity: {
        art_direction: "clean",
        lighting: "soft",
        palette: "neutral",
        environment: "office",
        camera_style: "steady",
        character_style: "founder",
        opening_emotion: "urgent",
        opening_first_image: "Founder at desk",
      },
      opening_impact: {
        first_image: "Founder at desk",
        first_spoken_sentence: "Most teams waste mornings.",
        emotion: "urgent",
        pacing: "fast",
        attention_pattern: "pattern_interrupt",
      },
      video_concept: {
        title: "Title",
        core_idea: "Idea",
        narrative_arc: "arc",
        emotional_tone: "tone",
        audience_insight: "insight",
        product_role: "hero",
        why_it_works: "why",
        visual_direction: {
          art_direction: "clean",
          lighting: "soft",
          palette: "neutral",
          environment: "office",
          camera_style: "steady",
          character_style: "founder",
        },
      },
    },
  };
}

class FakeQuery {
  private filters: Array<(row: Row) => boolean> = [];
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private updatePatch: Row = {};
  private insertRows: Row[] | null = null;
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private wantSelect = false;

  constructor(
    private db: FakeDb,
    private table: string,
  ) {}

  select(_cols?: string) {
    this.wantSelect = true;
    if (this.mode === "update" || this.mode === "insert") {
      // chained after mutation — keep mutation mode
    } else {
      this.mode = "select";
    }
    return this;
  }

  insert(rows: Row | Row[]) {
    this.mode = "insert";
    this.insertRows = Array.isArray(rows) ? rows : [rows];
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

  not(col: string, op: string, value: unknown) {
    if (op === "is" && value === null) {
      this.filters.push((row) => row[col] != null);
    }
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

  async maybeSingle(): Promise<{ data: Row | null; error: null }> {
    const result = await this.execute();
    const rows = (result.data as Row[] | null) ?? [];
    return { data: rows[0] ?? null, error: null };
  }

  async single(): Promise<{ data: Row; error: unknown }> {
    const result = await this.execute();
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
        const withId = {
          ...row,
          id: row.id ?? `${this.table}-${++this.db.seq}`,
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
      return { data: this.wantSelect || matched.length >= 0 ? matched : matched, error: null };
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
    if (name === "settle_production_run_terminal") {
      const runId = args.p_run_id as string;
      const status = args.p_status as string;
      const errorMessage = args.p_error_message as string | null;
      const itemMsg = args.p_item_error_message as string | null;
      const open = this.tables.production_run_items.filter(
        (row) =>
          row.production_run_id === runId &&
          (row.status === "queued" || row.status === "running"),
      );
      for (const row of open) {
        row.status = "failed";
        row.error_message = itemMsg ?? row.error_message;
      }
      const run = this.tables.production_runs.find((row) => row.id === runId);
      if (run) {
        run.status = status;
        if (status === "cancelled" || status === "failed") {
          run.error_message = errorMessage ?? run.error_message;
        }
      }
      return {
        data: {
          run_id: runId,
          status,
          settled_open_items: open.length,
          counters: {
            requested_total: this.tables.production_run_items.length,
            generated_total: this.tables.production_run_items.filter(
              (r) => r.status === "completed",
            ).length,
            failed_total: this.tables.production_run_items.filter(
              (r) => r.status === "failed" || r.status === "cancelled",
            ).length,
          },
        },
        error: null,
      };
    }
    return { data: null, error: { message: `unknown rpc ${name}` } };
  }
}

function seedManualReviewRun(
  db: FakeDb,
  args?: {
    status?: string;
    mode?: string;
    openItem?: boolean;
  },
) {
  const seeded = seedCreativeReviewFromPackage(minimalPackage(), {
    now: () => new Date("2026-08-12T12:00:00.000Z"),
  });
  const brief = packageBriefWithReview(seeded);
  const runId = "run-1";
  const projectId = "proj-1";
  const packageId = "pkg-1";

  db.tables.production_runs.push({
    id: runId,
    project_id: projectId,
    status: args?.status ?? "waiting_for_creative_review",
    requested_config: {
      plan: { videoCount: 1, activeVideoPlatforms: ["tiktok"] },
      config: { generationMode: args?.mode ?? "manual_review" },
    },
    package_count: 1,
    generated_total: 1,
    failed_total: 0,
    error_message: null,
  });
  db.tables.production_run_items.push({
    id: "pri-1",
    package_index: 0,
    content_package_id: packageId,
    status: "completed",
    production_run_id: runId,
    project_id: projectId,
    error_message: null,
  });
  if (args?.openItem) {
    db.tables.production_run_items.push({
      id: "pri-2",
      package_index: 1,
      content_package_id: null,
      status: "queued",
      production_run_id: runId,
      project_id: projectId,
      error_message: null,
    });
    db.tables.production_run_items.push({
      id: "pri-3",
      package_index: 2,
      content_package_id: null,
      status: "running",
      production_run_id: runId,
      project_id: projectId,
      error_message: null,
    });
  }
  db.tables.content_packages.push({
    id: packageId,
    title: "Package 1",
    package_brief: brief,
    project_id: projectId,
  });
  db.tables.content_items.push({
    id: "ci-1",
    package_id: packageId,
    platform: "tiktok",
    project_id: projectId,
    language: null,
    generation_metadata: { production_run_id: runId },
  });

  return { runId, projectId, packageId, seeded, brief };
}

async function main() {
  console.log("A — Guards");

  await check("canCancelManualReview only for waiting manual_review", () => {
    assert.equal(
      canCancelManualReview({
        runStatus: "waiting_for_creative_review",
        generationMode: "manual_review",
      }),
      true,
    );
    assert.equal(
      canCancelManualReview({
        runStatus: "running",
        generationMode: "manual_review",
      }),
      false,
    );
    assert.equal(
      canCancelManualReview({
        runStatus: "waiting_for_creative_review",
        generationMode: "production",
      }),
      false,
    );
    assert.equal(
      canCancelManualReview({
        runStatus: "cancelled",
        generationMode: "manual_review",
      }),
      false,
    );
  });

  await check("history event enum includes manual_review_cancelled", () => {
    assert.ok(
      (CREATIVE_REVIEW_HISTORY_EVENTS as readonly string[]).includes(
        "manual_review_cancelled",
      ),
    );
  });

  console.log("\nB — Cancel orchestration");

  await check("Cancel success sets run cancelled and appends history", async () => {
    const db = new FakeDb();
    const fixture = seedManualReviewRun(db);
    const beforeJobs = db.tables.video_jobs.length;

    const result = await cancelManualReview({
      projectId: fixture.projectId,
      runId: fixture.runId,
      actor: ACTOR,
      deps: {
        supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
        now: () => new Date("2026-08-12T13:00:00.000Z"),
      },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.code, "ok");
    assert.equal(result.status, "cancelled");
    assert.equal(result.packagesUpdated, 1);
    assert.equal(db.tables.production_runs[0]!.status, "cancelled");
    assert.equal(
      db.tables.production_runs[0]!.error_message,
      MANUAL_REVIEW_CANCELLED_MESSAGE,
    );
    assert.equal(db.tables.video_jobs.length, beforeJobs);

    const pkg = db.tables.content_packages[0]!;
    assert.ok(pkg.package_brief);
    const read = readCreativeReviewFromBrief(pkg.package_brief);
    assert.equal(read.ok, true);
    if (!read.ok || !read.value) return;
    const last = read.value.history[read.value.history.length - 1]!;
    assert.equal(last.event, "manual_review_cancelled");
    assert.equal(last.actor.id, ACTOR.id);
    // Prior history preserved (seed still present).
    assert.ok(read.value.history.some((entry) => entry.event === "seed"));
    // Package not deleted.
    assert.equal(db.tables.content_packages.length, 1);
    assert.equal(db.tables.content_items.length, 1);
  });

  await check("Cancel cancels open items and leaves completed packages", async () => {
    const db = new FakeDb();
    const fixture = seedManualReviewRun(db, { openItem: true });

    const result = await cancelManualReview({
      projectId: fixture.projectId,
      runId: fixture.runId,
      actor: ACTOR,
      deps: {
        supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(result.itemsCancelled >= 1);

    const completed = db.tables.production_run_items.find(
      (row) => row.id === "pri-1",
    );
    assert.equal(completed?.status, "completed");
    assert.equal(completed?.content_package_id, fixture.packageId);

    const cancelled = db.tables.production_run_items.filter(
      (row) => row.status === "cancelled",
    );
    assert.ok(cancelled.length >= 1);
    for (const row of cancelled) {
      assert.equal(row.error_message, MANUAL_REVIEW_CANCELLED_MESSAGE);
    }
  });

  await check("Cancel rejects production mode", async () => {
    const db = new FakeDb();
    const fixture = seedManualReviewRun(db, { mode: "production" });
    const result = await cancelManualReview({
      projectId: fixture.projectId,
      runId: fixture.runId,
      actor: ACTOR,
      deps: {
        supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "forbidden_mode");
    assert.equal(db.tables.production_runs[0]!.status, "waiting_for_creative_review");
  });

  await check("Cancel rejects non-waiting status", async () => {
    const db = new FakeDb();
    const fixture = seedManualReviewRun(db, { status: "running" });
    const result = await cancelManualReview({
      projectId: fixture.projectId,
      runId: fixture.runId,
      actor: ACTOR,
      deps: {
        supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "invalid_status");
  });

  await check("Cancel is idempotent when already cancelled", async () => {
    const db = new FakeDb();
    const fixture = seedManualReviewRun(db);
    const first = await cancelManualReview({
      projectId: fixture.projectId,
      runId: fixture.runId,
      actor: ACTOR,
      deps: {
        supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
      },
    });
    assert.equal(first.ok, true);
    const second = await cancelManualReview({
      projectId: fixture.projectId,
      runId: fixture.runId,
      actor: ACTOR,
      deps: {
        supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
      },
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.code, "already_cancelled");

    const read = readCreativeReviewFromBrief(
      db.tables.content_packages[0]!.package_brief,
    );
    assert.equal(read.ok, true);
    if (!read.ok || !read.value) return;
    const cancelEvents = read.value.history.filter(
      (entry) => entry.event === "manual_review_cancelled",
    );
    assert.equal(cancelEvents.length, 1);
  });

  await check("Continue Generation rejects cancelled Manual Review", async () => {
    const db = new FakeDb();
    const fixture = seedManualReviewRun(db);
    await cancelManualReview({
      projectId: fixture.projectId,
      runId: fixture.runId,
      actor: ACTOR,
      deps: {
        supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
      },
    });
    const continued = await continueCreativeReviewGeneration({
      projectId: fixture.projectId,
      runId: fixture.runId,
      actor: ACTOR,
      deps: {
        supabase: db as unknown as import("@supabase/supabase-js").SupabaseClient,
        videoCallbackUrl: "https://example.com/api/n8n/video-callback",
        startVideoJob: async () => {
          throw new Error("should not dispatch");
        },
      },
    });
    assert.equal(continued.ok, false);
    if (continued.ok) return;
    assert.equal(continued.code, "cancelled");
    assert.equal(db.tables.video_jobs.length, 0);
  });

  console.log("\nC — UI / wiring / regression");

  await check("UI exposes Cancel Manual Review with confirmation", () => {
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
    assert.match(workspace, /Cancel Manual Review/);
    assert.match(workspace, /window\.confirm/);
    assert.match(workspace, /Manual Review cancelled/);
    assert.match(workspace, /readOnly=\{readOnly\}/);
    assert.match(workspace, /canCancelManualReview/);
    assert.match(workspace, /@\/lib\/creative-review\/cancelGate/);
    assert.doesNotMatch(
      workspace,
      /@\/lib\/ai\/workflows\/cancelManualReview/,
    );
    assert.match(actions, /cancelManualReviewAction/);
    assert.match(actions, /cancelManualReview\(/);
  });

  await check("Package panel supports read-only cancelled mode", () => {
    const panel = readFileSync(
      join(
        root,
        "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx",
      ),
      "utf8",
    );
    const workspace = readFileSync(
      join(
        root,
        "components/creative-review/CreativeReviewWorkspace/CreativeReviewWorkspace.tsx",
      ),
      "utf8",
    );
    assert.match(panel, /readOnly/);
    assert.match(panel, /readOnlyMessage/);
    assert.match(panel, /manual_review_cancelled/);
    assert.match(
      workspace,
      /Manual Review cancelled — this package is read-only/,
    );
  });

  await check("Production cancel path remains separate from Manual Review cancel", () => {
    const admin = readFileSync(
      join(root, "lib/api/production-run-admin.ts"),
      "utf8",
    );
    assert.match(admin, /export async function cancelProductionRun/);
    assert.match(admin, /Pouze aktivní běh lze zastavit/);
    assert.doesNotMatch(admin, /MANUAL_REVIEW_CANCELLED_MESSAGE/);
    assert.doesNotMatch(admin, /manual_review_cancelled/);
  });

  await check("Cancel Manual Review module does not create video jobs", () => {
    const src = readFileSync(
      join(root, "lib/ai/workflows/cancelManualReview.ts"),
      "utf8",
    );
    assert.doesNotMatch(src, /video_jobs/);
    assert.doesNotMatch(src, /buildVideoJobInput/);
    assert.doesNotMatch(src, /startVideoWorkerJob/);
    assert.match(src, /manual_review_cancelled/);
    assert.match(src, /do not delete|Preserves packages/i);
  });

  console.log("\nAll Phase 7A Cancel Manual Review checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
