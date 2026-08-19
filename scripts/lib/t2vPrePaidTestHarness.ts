/**
 * Offline harness for T2V pre-paid gate tests (Step 5C).
 * Atomic CAS on scene attempts + multi-table E2E fake. No real providers.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VideoGenerationProvider } from "@/lib/ai/videoGeneration";
import type { SceneVideoAttemptRow } from "@/lib/scene-video-attempts/types";
import type { VoiceSynthesisRow } from "@/lib/text-to-video/voiceSynthesisRepository";
import type { AudioAssetRow } from "@/lib/text-to-video/audioAssetRepository";

type Filter = { col: string; op: "eq" | "is" | "in"; val: unknown };

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function rowMatches(row: Record<string, unknown>, filters: Filter[]): boolean {
  return filters.every((f) => {
    const cur = row[f.col];
    if (f.op === "eq") return cur === f.val;
    if (f.op === "is") return cur === f.val || (f.val === null && cur == null);
    if (f.op === "in") {
      return Array.isArray(f.val) && f.val.includes(cur);
    }
    return true;
  });
}

export class RunwayCreateTracker {
  readonly createCalls: Array<{ promptText: string; taskId: string }> = [];

  buildProvider(videoUrl: string): VideoGenerationProvider {
    const self = this;
    return {
      name: "runway",
      createImageToVideo: async () => {
        throw new Error("i2v_forbidden");
      },
      getImageToVideoTask: async () => {
        throw new Error("i2v_forbidden");
      },
      waitForImageToVideo: async () => {
        throw new Error("i2v_forbidden");
      },
      generateImageToVideo: async () => {
        throw new Error("i2v_forbidden");
      },
      createTextToVideo: async (req) => {
        const taskId = `task-${self.createCalls.length + 1}`;
        self.createCalls.push({ promptText: req.promptText, taskId });
        return {
          provider: "runway",
          providerTaskId: taskId,
          status: "pending",
          model: "gen4.5",
        };
      },
      getTextToVideoTask: async (_id) => ({
        provider: "runway",
        providerTaskId: _id,
        status: "succeeded",
        model: "gen4.5",
        videoUrl,
      }),
    };
  }
}

export function makeAtomicSceneAttemptSupabase(seed?: {
  uploadShouldFail?: () => string | null;
}) {
  const attempts = new Map<string, SceneVideoAttemptRow>();
  const storage = new Map<string, Buffer>();
  let insertGate = Promise.resolve();
  let updateGate = Promise.resolve();

  function sceneTableApi() {
    const filters: Filter[] = [];
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
      if (insertRow) {
        const run = insertGate.then(async () => {
          await new Promise((r) => setTimeout(r, 4));
          const clientId = String(insertRow!.client_request_id);
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
          const row = {
            id,
            project_id: String(insertRow!.project_id),
            video_job_id: String(insertRow!.video_job_id),
            scene_id: String(insertRow!.scene_id),
            client_request_id: clientId,
            parent_attempt_id:
              (insertRow!.parent_attempt_id as string | null) ?? null,
            source_image_bucket:
              insertRow!.source_image_bucket == null
                ? ""
                : String(insertRow!.source_image_bucket),
            source_image_path:
              insertRow!.source_image_path == null
                ? ""
                : String(insertRow!.source_image_path),
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
            status: "created" as const,
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
            provider_metadata: insertRow!.provider_metadata ?? null,
            download_claimed_at: null,
            download_claim_owner: null,
            submission_claimed_at: null,
            submission_claim_owner: null,
            generation_mode:
              (insertRow!.generation_mode as SceneVideoAttemptRow["generation_mode"]) ??
              "text_to_video",
            request_fingerprint:
              (insertRow!.request_fingerprint as string | null) ?? null,
            required_trimmed_duration_seconds:
              insertRow!.required_trimmed_duration_seconds == null
                ? null
                : Number(insertRow!.required_trimmed_duration_seconds),
            prompt_contract_version:
              insertRow!.prompt_contract_version == null
                ? null
                : Number(insertRow!.prompt_contract_version),
          } satisfies SceneVideoAttemptRow;
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
            rowMatches(r as unknown as Record<string, unknown>, filters),
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
        rowMatches(r as unknown as Record<string, unknown>, filters),
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

    return api;
  }

  const supabase = {
    from(table: string) {
      if (table === "scene_video_generation_attempts") {
        return sceneTableApi();
      }
      return sceneTableApi();
    },
    storage: {
      from(_bucket: string) {
        return {
          async upload(path: string, body: Buffer, _opts?: unknown) {
            void _opts;
            const fail = seed?.uploadShouldFail?.();
            if (fail) return { error: { message: fail } };
            storage.set(`${_bucket}:${path}`, Buffer.from(body));
            return { error: null };
          },
          async download(path: string) {
            const buf = storage.get(`${_bucket}:${path}`);
            if (!buf) return { data: null, error: { message: "missing" } };
            return { data: new Blob([buf]), error: null };
          },
          async createSignedUrl(path: string) {
            return {
              data: { signedUrl: `https://fake.test/${_bucket}/${path}` },
              error: null,
            };
          },
        };
      },
    },
    rpc(name: string) {
      void name;
      return Promise.resolve({ data: true, error: null });
    },
  };

  return {
    attempts,
    storage,
    supabase: supabase as unknown as SupabaseClient,
  };
}

export function makeTextToVideoE2ESupabase(args: {
  projectId: string;
  packageId: string;
  initialBrief: Record<string, unknown>;
}) {
  const sceneStore = makeAtomicSceneAttemptSupabase();
  const voiceRows = new Map<string, VoiceSynthesisRow>();
  const audioRows = new Map<string, AudioAssetRow>();
  let voiceSeq = 0;
  let audioSeq = 0;
  let packageBrief = { ...args.initialBrief };
  const storage = sceneStore.storage;

  const counters = {
    elevenVoicePosts: 0,
    runwayCreates: 0,
    sfxPosts: 0,
    musicPosts: 0,
  };

  function genericTableApi<T extends Record<string, unknown>>(
    table: string,
    rows: Map<string, T>,
    onInsert?: (payload: Record<string, unknown>) => T,
  ) {
    const filters: Filter[] = [];
    let insertRow: Record<string, unknown> | null = null;
    let updatePatch: Record<string, unknown> | null = null;
    let wantSingle = false;
    let mode = "select";

    const api: Record<string, unknown> = {
      select() {
        return api;
      },
      insert(p: Record<string, unknown>) {
        mode = "insert";
        insertRow = p;
        return api;
      },
      update(p: Record<string, unknown>) {
        mode = "update";
        updatePatch = p;
        return api;
      },
      eq(c: string, v: unknown) {
        filters.push({ col: c, op: "eq", val: v });
        return api;
      },
      is(c: string, v: unknown) {
        filters.push({ col: c, op: "is", val: v });
        return api;
      },
      in(c: string, v: unknown[]) {
        filters.push({ col: c, op: "in", val: v });
        return api;
      },
      maybeSingle() {
        wantSingle = true;
        return Promise.resolve(run());
      },
      single() {
        wantSingle = true;
        return Promise.resolve(run());
      },
    };

    function run(): { data: unknown; error: unknown } {
      if (table === "content_packages" && mode === "update" && updatePatch) {
        if (updatePatch.package_brief) {
          packageBrief = updatePatch.package_brief as Record<string, unknown>;
        }
        return { data: { id: args.packageId }, error: null };
      }
      if (mode === "insert" && insertRow && onInsert) {
        const row = onInsert(insertRow);
        rows.set(String(row.id), row);
        return { data: wantSingle ? row : [row], error: null };
      }
      if (mode === "update" && updatePatch) {
        for (const row of rows.values()) {
          if (rowMatches(row, filters)) {
            Object.assign(row, updatePatch);
            return { data: wantSingle ? row : [row], error: null };
          }
        }
        return { data: wantSingle ? null : [], error: null };
      }
      const matched = [...rows.values()].filter((r) => rowMatches(r, filters));
      if (wantSingle) return { data: matched[0] ?? null, error: null };
      return { data: matched, error: null };
    }
    return api;
  }

  const supabase = {
    from(table: string) {
      if (table === "projects") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({
              data: {
                id: args.projectId,
                language: "cs",
                tone_of_voice: null,
                knowledge: null,
                target_audience: null,
              },
              error: null,
            });
          },
        };
      }
      if (table === "scene_video_generation_attempts") {
        return sceneStore.supabase.from(table);
      }
      if (table === "text_to_video_voice_syntheses") {
        return genericTableApi("text_to_video_voice_syntheses", voiceRows, (p) => {
          const fp = String(p.input_fingerprint ?? p.synthesis_fingerprint);
          for (const r of voiceRows.values()) {
            if (r.input_fingerprint === fp || r.synthesis_fingerprint === fp) {
              return r;
            }
          }
          const id = `voice-${++voiceSeq}`;
          return {
            id,
            ...p,
            submission_claim_owner: null,
            submission_claimed_at: null,
          } as VoiceSynthesisRow;
        });
      }
      if (table === "text_to_video_audio_assets") {
        return genericTableApi("text_to_video_audio_assets", audioRows, (p) => {
          const fp = String(p.input_fingerprint);
          for (const r of audioRows.values()) {
            if (
              r.input_fingerprint === fp &&
              r.scope_key === p.scope_key &&
              r.asset_kind === p.asset_kind
            ) {
              return r;
            }
          }
          const id = `audio-${++audioSeq}`;
          return {
            id,
            ...p,
            submission_claim_owner: null,
            submission_claimed_at: null,
          } as AudioAssetRow;
        });
      }
      if (table === "content_packages") {
        const filters: Filter[] = [];
        let patch: Record<string, unknown> | null = null;
        const api: Record<string, unknown> = {
          select() {
            return api;
          },
          update(p: Record<string, unknown>) {
            patch = p;
            return api;
          },
          eq(col: string, val: unknown) {
            filters.push({ col, op: "eq", val });
            return api;
          },
          maybeSingle() {
            if (patch?.package_brief) {
              packageBrief = patch.package_brief as Record<string, unknown>;
            }
            return Promise.resolve({ data: { id: args.packageId }, error: null });
          },
        };
        return api;
      }
      return genericTableApi(table, new Map(), () => ({ id: "x" }) as never);
    },
    storage: sceneStore.supabase.storage,
    rpc(name: string) {
      if (name === "renew_video_job_lease") {
        return Promise.resolve({ data: true, error: null });
      }
      if (name === "persist_video_job_artifacts") {
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: true, error: null });
    },
  };

  return {
    supabase: supabase as unknown as SupabaseClient,
    sceneAttempts: sceneStore.attempts,
    voiceRows,
    audioRows,
    storage,
    counters,
    getBrief: () => packageBrief,
  };
}
