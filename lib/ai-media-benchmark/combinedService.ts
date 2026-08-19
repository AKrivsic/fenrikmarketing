import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { expectedCombinedOutput } from "@/lib/ai-media-benchmark/combinedContract";
import {
  DEFAULT_COMBINED_CASE_ID,
} from "@/lib/ai-media-benchmark/constants";
import {
  mixSettingsMatch,
  planCombinedScene,
  type CombinedMixSettings,
  type CombinedScenePlan,
} from "@/lib/ai-media-benchmark/combinedPlan";
import {
  isAiMediaBenchmarkCombinedStatus,
  type AiMediaBenchmarkCombinedRunPublicView,
  type AiMediaBenchmarkCombinedRunRow,
} from "@/lib/ai-media-benchmark/combinedTypes";
import {
  parseBenchmarkNote,
  parseBenchmarkRating,
} from "@/lib/ai-media-benchmark/rating";
import type { AiMediaBenchmarkRunRow } from "@/lib/ai-media-benchmark/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assembleBenchmarkCombinedSceneViaWorker,
  type AssembleBenchmarkCombinedSceneResponse,
} from "@/lib/video-worker/assembleBenchmarkCombinedSceneClient";
import { VideoWorkerRequestError } from "@/lib/video-worker/client";

const PLAYBACK_TTL_SECONDS = 60 * 60;
const ASSEMBLY_CLAIM_STALE_MS = 5 * 60 * 1000;

export interface CombinedBenchmarkServiceDeps {
  supabase?: SupabaseClient;
  assemble?: (
    payload: Parameters<typeof assembleBenchmarkCombinedSceneViaWorker>[0],
  ) => Promise<AssembleBenchmarkCombinedSceneResponse>;
  now?: () => Date;
  assemblyClaimOwner?: string;
  afterOutputUploaded?: () => Promise<void>;
}

function supabaseOf(deps?: CombinedBenchmarkServiceDeps): SupabaseClient {
  return deps?.supabase ?? createSupabaseAdminClient();
}

function nowIso(deps?: CombinedBenchmarkServiceDeps): string {
  return (deps?.now ?? (() => new Date()))().toISOString();
}

function claimOwner(deps?: CombinedBenchmarkServiceDeps): string {
  return deps?.assemblyClaimOwner ?? randomUUID();
}

function validateUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field}_required`);
  }
  const v = value.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v,
    )
  ) {
    throw new Error(`${field}_invalid`);
  }
  return v;
}

function requireSucceededSource(
  row: AiMediaBenchmarkRunRow | null,
  expectedType: "video" | "voice" | "sound",
  projectId: string,
): AiMediaBenchmarkRunRow {
  if (!row) throw new Error(`${expectedType}_run_not_found`);
  if (row.test_type !== expectedType) throw new Error(`${expectedType}_run_wrong_type`);
  if (row.project_id !== projectId) throw new Error(`${expectedType}_run_wrong_project`);
  if (row.status !== "succeeded") throw new Error(`${expectedType}_run_not_succeeded`);
  if (!row.output_bucket || !row.output_path) {
    throw new Error("source_output_missing");
  }
  return row;
}

function planFromRow(
  row: AiMediaBenchmarkCombinedRunRow,
  video: Pick<AiMediaBenchmarkRunRow, "id" | "model" | "output_contains_audio">,
): CombinedScenePlan {
  return planCombinedScene({
    videoRunId: video.id,
    videoModel: video.model,
    videoOutputContainsAudio: video.output_contains_audio,
    voiceRunId: row.voice_run_id,
    voiceSettings: { text: row.voiceover_text ?? "" },
    soundRunId: row.sound_run_id,
  });
}

async function signPath(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, PLAYBACK_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function toPublicView(
  supabase: SupabaseClient,
  row: AiMediaBenchmarkCombinedRunRow,
  reusedExistingRequest: boolean,
  video?: Pick<AiMediaBenchmarkRunRow, "id" | "model" | "output_contains_audio">,
): Promise<AiMediaBenchmarkCombinedRunPublicView> {
  let videoMeta = video;
  if (!videoMeta) {
    const { data } = await supabase
      .from("ai_media_benchmark_runs")
      .select("id, model, output_contains_audio")
      .eq("id", row.video_run_id)
      .maybeSingle();
    videoMeta = data as Pick<
      AiMediaBenchmarkRunRow,
      "id" | "model" | "output_contains_audio"
    > | undefined;
  }
  const plan = videoMeta
    ? planFromRow(row, videoMeta)
    : planCombinedScene({
        videoRunId: row.video_run_id,
        videoModel: "unknown",
        videoOutputContainsAudio: null,
        voiceRunId: row.voice_run_id,
        voiceSettings: { text: row.voiceover_text ?? "" },
        soundRunId: row.sound_run_id,
      });
  let playbackUrl: string | null = null;
  if (row.output_bucket && row.output_path) {
    playbackUrl = await signPath(supabase, row.output_bucket, row.output_path);
  }
  return {
    id: row.id,
    caseId: row.case_id,
    projectId: row.project_id,
    clientRequestId: row.client_request_id,
    videoRunId: row.video_run_id,
    voiceRunId: row.voice_run_id,
    soundRunId: row.sound_run_id,
    voiceoverText: row.voiceover_text,
    mixSettings: plan.mix,
    plan,
    status: row.status,
    outputBucket: row.output_bucket,
    outputPath: row.output_path,
    playbackUrl,
    durationSeconds:
      row.duration_seconds === null ? null : Number(row.duration_seconds),
    errorMessage: row.error_message,
    failureCode: row.failure_code,
    ratingImage: row.rating_image,
    ratingAvFit: row.rating_av_fit,
    ratingOverall: row.rating_overall,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    reusedExistingRequest,
  };
}

async function loadCombined(
  supabase: SupabaseClient,
  id: string,
  projectId: string,
): Promise<AiMediaBenchmarkCombinedRunRow> {
  const { data, error } = await supabase
    .from("ai_media_benchmark_combined_runs")
    .select("*")
    .eq("id", id)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("combined_run_not_found");
  const row = data as AiMediaBenchmarkCombinedRunRow;
  if (!isAiMediaBenchmarkCombinedStatus(row.status)) {
    throw new Error("combined_run_invalid_status");
  }
  return row;
}

async function loadSourceRun(
  supabase: SupabaseClient,
  id: string,
): Promise<AiMediaBenchmarkRunRow | null> {
  const { data, error } = await supabase
    .from("ai_media_benchmark_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as AiMediaBenchmarkRunRow) : null;
}

const ASSEMBLE_FAILURE_CODES = new Set([
  "voiceover_too_long_for_scene",
  "source_output_missing",
  "voiceover_duration_unknown",
  "output_path_mismatch",
  "output_bucket_mismatch",
  "source_path_mismatch",
  "source_bucket_mismatch",
  "mix_not_allowed",
  "target_duration_mismatch",
  "project_id_invalid",
  "combined_run_id_invalid",
]);

function expectedOutputPath(projectId: string, combinedRunId: string): {
  bucket: string;
  path: string;
} {
  return expectedCombinedOutput(projectId, combinedRunId);
}

function assertCombinedRequestMatches(
  row: AiMediaBenchmarkCombinedRunRow,
  expected: {
    projectId: string;
    videoRunId: string;
    voiceRunId: string;
    soundRunId: string | null;
    caseId: string;
    mix: CombinedMixSettings;
  },
): void {
  const storedMix = row.mix_settings as CombinedMixSettings;
  if (
    row.project_id !== expected.projectId ||
    row.video_run_id !== expected.videoRunId ||
    row.voice_run_id !== expected.voiceRunId ||
    (row.sound_run_id ?? null) !== (expected.soundRunId ?? null) ||
    row.case_id !== expected.caseId ||
    storedMix.targetDurationSeconds !== expected.mix.targetDurationSeconds ||
    !mixSettingsMatch(storedMix, expected.mix)
  ) {
    throw new Error("combined_request_input_mismatch");
  }
}

async function completeCombinedOutput(
  supabase: SupabaseClient,
  row: AiMediaBenchmarkCombinedRunRow,
  owner: string,
  claimedAt: string,
  bucket: string,
  path: string,
  durationSeconds: number,
): Promise<AiMediaBenchmarkCombinedRunRow> {
  const { data: updated, error } = await supabase
    .from("ai_media_benchmark_combined_runs")
    .update({
      status: "succeeded",
      output_bucket: bucket,
      output_path: path,
      duration_seconds: durationSeconds,
      error_message: null,
      failure_code: null,
      assembly_claim_owner: null,
      assembly_claimed_at: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "assembling")
    .eq("assembly_claim_owner", owner)
    .eq("assembly_claimed_at", claimedAt)
    .is("output_path", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!updated) {
    const current = await loadCombined(supabase, row.id, row.project_id);
    return current;
  }
  return updated as AiMediaBenchmarkCombinedRunRow;
}

async function markAssembleFailed(
  supabase: SupabaseClient,
  row: AiMediaBenchmarkCombinedRunRow,
  owner: string,
  claimedAt: string,
  code: string,
  message: string,
): Promise<void> {
  await supabase
    .from("ai_media_benchmark_combined_runs")
    .update({
      status: "failed",
      failure_code: code,
      error_message: message.slice(0, 1000),
      assembly_claim_owner: null,
      assembly_claimed_at: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "assembling")
    .eq("assembly_claim_owner", owner)
    .eq("assembly_claimed_at", claimedAt)
    .is("output_path", null);
}

async function markStaleAssemblyClaim(
  supabase: SupabaseClient,
  row: AiMediaBenchmarkCombinedRunRow,
  deps?: CombinedBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkCombinedRunRow | null> {
  if (!row.assembly_claim_owner || !row.assembly_claimed_at) return null;
  const { data, error } = await supabase
    .from("ai_media_benchmark_combined_runs")
    .update({
      status: "failed",
      failure_code: "assembly_claim_stale",
      error_message: "assembly_claim_stale",
      assembly_claim_owner: null,
      assembly_claimed_at: null,
      completed_at: nowIso(deps),
    })
    .eq("id", row.id)
    .eq("status", "assembling")
    .eq("assembly_claim_owner", row.assembly_claim_owner)
    .eq("assembly_claimed_at", row.assembly_claimed_at)
    .is("output_path", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? (data as AiMediaBenchmarkCombinedRunRow) : null;
}

function isClaimStale(
  row: AiMediaBenchmarkCombinedRunRow,
  deps?: CombinedBenchmarkServiceDeps,
): boolean {
  if (!row.assembly_claimed_at || !row.assembly_claim_owner) return false;
  const claimedAt = Date.parse(row.assembly_claimed_at);
  if (!Number.isFinite(claimedAt)) return false;
  return Date.parse(nowIso(deps)) - claimedAt > ASSEMBLY_CLAIM_STALE_MS;
}

async function claimAssembly(
  supabase: SupabaseClient,
  row: AiMediaBenchmarkCombinedRunRow,
  owner: string,
  deps?: CombinedBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkCombinedRunRow | null> {
  const { data, error } = await supabase
    .from("ai_media_benchmark_combined_runs")
    .update({
      status: "assembling",
      assembly_claim_owner: owner,
      assembly_claimed_at: nowIso(deps),
      error_message: null,
      failure_code: null,
      completed_at: null,
    })
    .eq("id", row.id)
    .in("status", ["created", "failed"])
    .is("output_path", null)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? (data as AiMediaBenchmarkCombinedRunRow) : null;
}

async function runAssembler(
  row: AiMediaBenchmarkCombinedRunRow,
  video: AiMediaBenchmarkRunRow,
  voice: AiMediaBenchmarkRunRow,
  sound: AiMediaBenchmarkRunRow | null,
  plan: CombinedScenePlan,
  owner: string,
  claimedAt: string,
  deps?: CombinedBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkCombinedRunRow> {
  const supabase = supabaseOf(deps);
  const expected = expectedOutputPath(row.project_id, row.id);
  const assemble = deps?.assemble ?? assembleBenchmarkCombinedSceneViaWorker;
  try {
    const result = await assemble({
      combined_run_id: row.id,
      project_id: row.project_id,
      video: { bucket: video.output_bucket!, path: video.output_path! },
      voice: { bucket: voice.output_bucket!, path: voice.output_path! },
      sound:
        plan.mix.useAmbientSound && sound?.output_bucket && sound.output_path
          ? { bucket: sound.output_bucket, path: sound.output_path }
          : null,
      mix: plan.mix,
      output_bucket: expected.bucket,
      output_path: expected.path,
    });
    if (
      result.output_bucket !== expected.bucket ||
      result.output_path !== expected.path
    ) {
      throw new Error("output_path_mismatch");
    }
    if (deps?.afterOutputUploaded) {
      await deps.afterOutputUploaded();
    }
    return completeCombinedOutput(
      supabase,
      row,
      owner,
      claimedAt,
      result.output_bucket,
      result.output_path,
      result.duration_seconds,
    );
  } catch (err) {
    const code =
      err instanceof VideoWorkerRequestError
        ? err.message
        : err instanceof Error
          ? err.message
          : "assemble_failed";
    const known = ASSEMBLE_FAILURE_CODES.has(code) ? code : "assemble_failed";
    await markAssembleFailed(supabase, row, owner, claimedAt, known, code);
    const current = await loadCombined(supabase, row.id, row.project_id);
    if (known === "voiceover_too_long_for_scene" || known === "source_output_missing") {
      throw new Error(known);
    }
    return current;
  }
}

export async function previewCombinedScene(
  args: {
    projectId: string;
    videoRunId: string;
    voiceRunId: string;
    soundRunId?: string | null;
  },
  deps?: CombinedBenchmarkServiceDeps,
): Promise<CombinedScenePlan> {
  const projectId = validateUuid(args.projectId, "project_id");
  const videoRunId = validateUuid(args.videoRunId, "video_run_id");
  const voiceRunId = validateUuid(args.voiceRunId, "voice_run_id");
  const soundRunId = args.soundRunId
    ? validateUuid(args.soundRunId, "sound_run_id")
    : null;
  const supabase = supabaseOf(deps);
  const video = requireSucceededSource(
    await loadSourceRun(supabase, videoRunId),
    "video",
    projectId,
  );
  const voice = requireSucceededSource(
    await loadSourceRun(supabase, voiceRunId),
    "voice",
    projectId,
  );
  if (soundRunId) {
    requireSucceededSource(await loadSourceRun(supabase, soundRunId), "sound", projectId);
  }
  return planCombinedScene({
    videoRunId: video.id,
    videoModel: video.model,
    videoOutputContainsAudio: video.output_contains_audio,
    voiceRunId: voice.id,
    voiceSettings: voice.settings,
    soundRunId,
  });
}

export async function createCombinedScene(
  args: {
    projectId: string;
    videoRunId: string;
    voiceRunId: string;
    soundRunId?: string | null;
    clientRequestId: string;
    caseId?: string;
  },
  deps?: CombinedBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkCombinedRunPublicView> {
  const projectId = validateUuid(args.projectId, "project_id");
  const videoRunId = validateUuid(args.videoRunId, "video_run_id");
  const voiceRunId = validateUuid(args.voiceRunId, "voice_run_id");
  const soundRunId = args.soundRunId
    ? validateUuid(args.soundRunId, "sound_run_id")
    : null;
  const clientRequestId = validateUuid(args.clientRequestId, "client_request_id");
  const supabase = supabaseOf(deps);

  const video = requireSucceededSource(
    await loadSourceRun(supabase, videoRunId),
    "video",
    projectId,
  );
  const voice = requireSucceededSource(
    await loadSourceRun(supabase, voiceRunId),
    "voice",
    projectId,
  );
  const sound = soundRunId
    ? requireSucceededSource(
        await loadSourceRun(supabase, soundRunId),
        "sound",
        projectId,
      )
    : null;

  const plan = planCombinedScene({
    videoRunId: video.id,
    videoModel: video.model,
    videoOutputContainsAudio: video.output_contains_audio,
    voiceRunId: voice.id,
    voiceSettings: voice.settings,
    soundRunId: sound?.id ?? null,
  });
  const caseId = args.caseId?.trim() || DEFAULT_COMBINED_CASE_ID;
  const expectedInputs = {
    projectId,
    videoRunId: video.id,
    voiceRunId: voice.id,
    soundRunId: sound?.id ?? null,
    caseId,
    mix: plan.mix,
  };

  const existing = await supabase
    .from("ai_media_benchmark_combined_runs")
    .select("*")
    .eq("client_request_id", clientRequestId)
    .maybeSingle();
  if (existing.error) throw existing.error;

  let row: AiMediaBenchmarkCombinedRunRow;
  let reused = false;
  if (existing.data) {
    row = existing.data as AiMediaBenchmarkCombinedRunRow;
    assertCombinedRequestMatches(row, expectedInputs);
    reused = true;
  } else {
    const inserted = await supabase
      .from("ai_media_benchmark_combined_runs")
      .insert({
        case_id: caseId,
        project_id: projectId,
        client_request_id: clientRequestId,
        video_run_id: video.id,
        voice_run_id: voice.id,
        sound_run_id: sound?.id ?? null,
        voiceover_text: plan.voiceoverText,
        mix_settings: plan.mix,
        status: "created",
      })
      .select("*")
      .single();
    if (inserted.error) {
      if (inserted.error.code === "23505") {
        const raced = await supabase
          .from("ai_media_benchmark_combined_runs")
          .select("*")
          .eq("client_request_id", clientRequestId)
          .single();
        if (raced.error) throw raced.error;
        row = raced.data as AiMediaBenchmarkCombinedRunRow;
        assertCombinedRequestMatches(row, expectedInputs);
        reused = true;
      } else {
        throw inserted.error;
      }
    } else {
      row = inserted.data as AiMediaBenchmarkCombinedRunRow;
    }
  }

  row = await syncCombinedAssembly(row, video, voice, sound, plan, deps);
  return toPublicView(supabase, row, reused, video);
}

async function syncCombinedAssembly(
  row: AiMediaBenchmarkCombinedRunRow,
  video: AiMediaBenchmarkRunRow,
  voice: AiMediaBenchmarkRunRow,
  sound: AiMediaBenchmarkRunRow | null,
  plan: CombinedScenePlan,
  deps?: CombinedBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkCombinedRunRow> {
  const supabase = supabaseOf(deps);
  if (row.status === "succeeded" && row.output_path) return row;

  if (row.status === "assembling" && !isClaimStale(row, deps)) {
    return row;
  }
  if (row.status === "assembling" && isClaimStale(row, deps)) {
    const marked = await markStaleAssemblyClaim(supabase, row, deps);
    if (!marked) {
      return loadCombined(supabase, row.id, row.project_id);
    }
    row = marked;
  }

  const owner = claimOwner(deps);
  const claimed = await claimAssembly(supabase, row, owner, deps);
  if (!claimed) {
    return loadCombined(supabase, row.id, row.project_id);
  }
  if (!claimed.assembly_claim_owner || !claimed.assembly_claimed_at) {
    return claimed;
  }
  return runAssembler(
    claimed,
    video,
    voice,
    sound,
    plan,
    claimed.assembly_claim_owner,
    claimed.assembly_claimed_at,
    deps,
  );
}

export async function syncCombinedScene(
  args: { runId: string; projectId: string },
  deps?: CombinedBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkCombinedRunPublicView> {
  const runId = validateUuid(args.runId, "run_id");
  const projectId = validateUuid(args.projectId, "project_id");
  const supabase = supabaseOf(deps);
  let row = await loadCombined(supabase, runId, projectId);
  const video = requireSucceededSource(
    await loadSourceRun(supabase, row.video_run_id),
    "video",
    projectId,
  );
  const voice = requireSucceededSource(
    await loadSourceRun(supabase, row.voice_run_id),
    "voice",
    projectId,
  );
  const sound = row.sound_run_id
    ? requireSucceededSource(
        await loadSourceRun(supabase, row.sound_run_id),
        "sound",
        projectId,
      )
    : null;
  const plan = planCombinedScene({
    videoRunId: video.id,
    videoModel: video.model,
    videoOutputContainsAudio: video.output_contains_audio,
    voiceRunId: voice.id,
    voiceSettings: voice.settings,
    soundRunId: sound?.id ?? null,
  });
  row = await syncCombinedAssembly(row, video, voice, sound, plan, deps);
  return toPublicView(supabase, row, false, video);
}

export async function listCombinedScenes(
  args: { projectId: string; caseId?: string },
  deps?: CombinedBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkCombinedRunPublicView[]> {
  const projectId = validateUuid(args.projectId, "project_id");
  const supabase = supabaseOf(deps);
  let query = supabase
    .from("ai_media_benchmark_combined_runs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (args.caseId) query = query.eq("case_id", args.caseId);
  const { data, error } = await query;
  if (error) throw error;
  const views: AiMediaBenchmarkCombinedRunPublicView[] = [];
  for (const row of (data ?? []) as AiMediaBenchmarkCombinedRunRow[]) {
    if (!isAiMediaBenchmarkCombinedStatus(row.status)) continue;
    views.push(await toPublicView(supabase, row, false));
  }
  return views;
}

export async function rateCombinedScene(
  args: {
    runId: string;
    projectId: string;
    ratingImage?: unknown;
    ratingAvFit?: unknown;
    ratingOverall?: unknown;
    note?: unknown;
  },
  deps?: CombinedBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkCombinedRunPublicView> {
  const runId = validateUuid(args.runId, "run_id");
  const projectId = validateUuid(args.projectId, "project_id");
  const patch: Record<string, unknown> = {};
  if (args.ratingImage !== undefined) {
    patch.rating_image = parseBenchmarkRating(args.ratingImage);
  }
  if (args.ratingAvFit !== undefined) {
    patch.rating_av_fit = parseBenchmarkRating(args.ratingAvFit);
  }
  if (args.ratingOverall !== undefined) {
    patch.rating_overall = parseBenchmarkRating(args.ratingOverall);
  }
  if (args.note !== undefined) {
    patch.note = parseBenchmarkNote(args.note);
  }
  if (Object.keys(patch).length === 0) throw new Error("rating_required");
  const supabase = supabaseOf(deps);
  const { data, error } = await supabase
    .from("ai_media_benchmark_combined_runs")
    .update(patch)
    .eq("id", runId)
    .eq("project_id", projectId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("combined_run_not_found");
  return toPublicView(supabase, data as AiMediaBenchmarkCombinedRunRow, false);
}
