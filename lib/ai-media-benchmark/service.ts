import type { SupabaseClient } from "@supabase/supabase-js";
import { getSpeechProvider, getVideoGenerationProvider } from "@/lib/ai/index";
import {
  RunwayVideoGenerationProvider,
  type RunwayAudioTaskSnapshot,
} from "@/lib/ai/runway";
import type { VideoGenerationProvider, TextToVideoProvider } from "@/lib/ai/videoGeneration";
import {
  ROUND_A_DURATION_SECONDS,
  ROUND_A_PORTRAIT_RATIO,
  getTextToVideoModel,
  getVideoModel,
  quoteSoundCost,
  quoteTextToVideoCost,
  quoteVideoCost,
  quoteVoiceCost,
} from "@/lib/ai-media-benchmark/catalog";
import {
  hasOpenAiApiKey,
  hasRunwayApiSecret,
  isBenchmarkSoundEnabled,
  isBenchmarkTextVideoEnabled,
  isBenchmarkVideoEnabled,
  isBenchmarkVoiceEnabled,
} from "@/lib/ai-media-benchmark/flags";
import {
  parseBenchmarkNote,
  parseBenchmarkRating,
} from "@/lib/ai-media-benchmark/rating";
import { requireSoundCandidate } from "@/lib/ai-media-benchmark/sound";
import {
  AI_MEDIA_BENCHMARK_GENERATION_MODE_IMAGE_TO_VIDEO,
  AI_MEDIA_BENCHMARK_GENERATION_MODE_TEXT_TO_VIDEO,
  DEFAULT_SOUND_CASE_ID,
  DEFAULT_TEXT_VIDEO_CASE_ID,
  DEFAULT_VIDEO_CASE_ID,
  DEFAULT_VOICE_CASE_ID,
  OPENAI_BENCHMARK_TTS_INSTRUCTIONS,
  isAiMediaBenchmarkRunStatus,
  type AiMediaAudioRole,
  type AiMediaBenchmarkRunPublicView,
  type AiMediaBenchmarkRunRow,
  type AiMediaBenchmarkRunStatus,
  type AiMediaBenchmarkTestType,
} from "@/lib/ai-media-benchmark/types";
import {
  resolveSubmittingRowForSync,
  submitPaidCreate,
  type BenchmarkSubmissionDeps,
} from "@/lib/ai-media-benchmark/submission";
import {
  createOpenAiBenchmarkVoiceProvider,
  requireVoiceCandidate,
  type BenchmarkVoiceProvider,
} from "@/lib/ai-media-benchmark/voice";
import { listRunwayTestScenesForProject } from "@/lib/runway-test/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  adoptExistingBenchmarkOutput,
  downloadBenchmarkOutput,
  outputFilenameForRun,
  storeBenchmarkOutput,
} from "@/lib/ai-media-benchmark/finalize";
import type { BrandVisualProfile } from "@/lib/ai-media-benchmark/brandVisualProfile";
import {
  assertPaidBenchmarkRequestMatches,
  type CanonicalPaidBenchmarkInput,
} from "@/lib/ai-media-benchmark/requestIntegrity";
import {
  resolveRoundTCaseSnapshot,
  setCaseSnapshotLockedByRun,
  snapshotFingerprint,
  type RoundTCaseSnapshot,
} from "@/lib/ai-media-benchmark/roundTSnapshot";

const PLAYBACK_TTL_SECONDS = 60 * 60;
const SOURCE_TTL_SECONDS = 15 * 60;

export interface BenchmarkAudioProvider {
  createTextToSpeech(args: {
    promptText: string;
    voicePresetId: string;
    model?: string;
  }): Promise<RunwayAudioTaskSnapshot>;
  createSoundEffect(args: {
    promptText: string;
    model: string;
    duration?: number;
  }): Promise<RunwayAudioTaskSnapshot>;
  getAudioTask(
    providerTaskId: string,
    options?: { model?: string },
  ): Promise<RunwayAudioTaskSnapshot>;
}

export interface AiMediaBenchmarkServiceDeps extends BenchmarkSubmissionDeps {
  supabase?: SupabaseClient;
  videoProvider?: VideoGenerationProvider;
  textVideoProvider?: TextToVideoProvider;
  audioProvider?: BenchmarkAudioProvider;
  voiceProvider?: BenchmarkVoiceProvider;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  downloadTimeoutMs?: number;
  maxOutputBytes?: number;
  afterOutputUploaded?: () => Promise<void>;
}

function supabaseOf(deps?: AiMediaBenchmarkServiceDeps): SupabaseClient {
  return deps?.supabase ?? createSupabaseAdminClient();
}

function videoProviderOf(
  deps?: AiMediaBenchmarkServiceDeps,
): VideoGenerationProvider {
  return deps?.videoProvider ?? getVideoGenerationProvider();
}

function audioProviderOf(
  deps?: AiMediaBenchmarkServiceDeps,
): BenchmarkAudioProvider {
  if (deps?.audioProvider) return deps.audioProvider;
  const runway = getVideoGenerationProvider();
  if (!(runway instanceof RunwayVideoGenerationProvider)) {
    throw new Error("audio_provider_unavailable");
  }
  return runway;
}

function textVideoProviderOf(
  deps?: AiMediaBenchmarkServiceDeps,
): TextToVideoProvider {
  if (deps?.textVideoProvider) return deps.textVideoProvider;
  const injected = deps?.videoProvider;
  if (
    injected &&
    typeof (injected as unknown as TextToVideoProvider).createTextToVideo ===
      "function"
  ) {
    return injected as unknown as TextToVideoProvider;
  }
  const runway = getVideoGenerationProvider();
  if (!(runway instanceof RunwayVideoGenerationProvider)) {
    throw new Error("text_video_provider_unavailable");
  }
  return runway;
}

function envOf(deps?: AiMediaBenchmarkServiceDeps): NodeJS.ProcessEnv {
  return deps?.env ?? process.env;
}

function fetchOf(deps?: AiMediaBenchmarkServiceDeps): typeof fetch {
  return deps?.fetchImpl ?? fetch;
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

function mapRow(
  row: AiMediaBenchmarkRunRow,
): Omit<
  AiMediaBenchmarkRunPublicView,
  "playbackUrl" | "sourcePreviewUrl" | "reusedExistingRequest"
> {
  return {
    id: row.id,
    caseId: row.case_id,
    testType: row.test_type,
    audioRole: row.audio_role,
    projectId: row.project_id,
    clientRequestId: row.client_request_id,
    sourceVideoJobId: row.source_video_job_id,
    sourceSceneId: row.source_scene_id,
    sourceImageBucket: row.source_image_bucket,
    sourceImagePath: row.source_image_path,
    provider: row.provider,
    model: row.model,
    voiceId: row.voice_id,
    settings: row.settings ?? {},
    providerTaskId: row.provider_task_id,
    status: row.status,
    estimatedCredits:
      row.estimated_credits === null ? null : Number(row.estimated_credits),
    estimatedCostUsd:
      row.estimated_cost_usd === null ? null : Number(row.estimated_cost_usd),
    durationSeconds:
      row.duration_seconds === null ? null : Number(row.duration_seconds),
    latencyMs: row.latency_ms,
    outputContainsAudio: row.output_contains_audio,
    outputBucket: row.output_bucket,
    outputPath: row.output_path,
    errorMessage: row.error_message,
    failureCode: row.failure_code,
    rating: row.rating,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

async function signPath(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  ttlSeconds: number,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function toPublicView(
  supabase: SupabaseClient,
  row: AiMediaBenchmarkRunRow,
  reusedExistingRequest: boolean,
): Promise<AiMediaBenchmarkRunPublicView> {
  const base = mapRow(row);
  let sourcePreviewUrl: string | null = null;
  if (row.source_image_bucket && row.source_image_path) {
    sourcePreviewUrl = await signPath(
      supabase,
      row.source_image_bucket,
      row.source_image_path,
      PLAYBACK_TTL_SECONDS,
    );
  }
  let playbackUrl: string | null = null;
  if (row.output_bucket && row.output_path) {
    playbackUrl = await signPath(
      supabase,
      row.output_bucket,
      row.output_path,
      PLAYBACK_TTL_SECONDS,
    );
  }
  return { ...base, sourcePreviewUrl, playbackUrl, reusedExistingRequest };
}

async function findByClientRequestId(
  supabase: SupabaseClient,
  clientRequestId: string,
): Promise<AiMediaBenchmarkRunRow | null> {
  const { data, error } = await supabase
    .from("ai_media_benchmark_runs")
    .select("*")
    .eq("client_request_id", clientRequestId)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as AiMediaBenchmarkRunRow) : null;
}

async function insertRun(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  clientRequestId: string,
  expected: CanonicalPaidBenchmarkInput,
): Promise<{ row: AiMediaBenchmarkRunRow; reused: boolean }> {
  const existing = await findByClientRequestId(supabase, clientRequestId);
  if (existing) {
    assertPaidBenchmarkRequestMatches(existing, expected);
    return { row: existing, reused: true };
  }

  const { data, error } = await supabase
    .from("ai_media_benchmark_runs")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      const raced = await findByClientRequestId(supabase, clientRequestId);
      if (raced) {
        assertPaidBenchmarkRequestMatches(raced, expected);
        return { row: raced, reused: true };
      }
    }
    throw error;
  }
  return { row: data as AiMediaBenchmarkRunRow, reused: false };
}

export async function listBenchmarkRuns(args: {
  caseId?: string;
  testType?: AiMediaBenchmarkTestType;
  projectId?: string;
}, deps?: AiMediaBenchmarkServiceDeps): Promise<AiMediaBenchmarkRunPublicView[]> {
  const supabase = supabaseOf(deps);
  let query = supabase
    .from("ai_media_benchmark_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (args.caseId) query = query.eq("case_id", args.caseId);
  if (args.testType) query = query.eq("test_type", args.testType);
  if (args.projectId) {
    query = query.eq("project_id", validateUuid(args.projectId, "project_id"));
  }
  const { data, error } = await query;
  if (error) throw error;
  const views: AiMediaBenchmarkRunPublicView[] = [];
  for (const row of (data ?? []) as AiMediaBenchmarkRunRow[]) {
    if (!isAiMediaBenchmarkRunStatus(row.status)) continue;
    views.push(await toPublicView(supabase, row, false));
  }
  return views;
}

export interface CreateVideoBenchmarkInput {
  projectId: string;
  videoJobId: string;
  sceneId: string;
  motionPrompt: string;
  modelId: string;
  durationSeconds: number;
  ratio?: string;
  caseId?: string;
  clientRequestId: string;
  confirmPaidGeneration: boolean;
  maxCostUsd: number;
}

export async function createVideoBenchmarkRun(
  input: CreateVideoBenchmarkInput,
  deps?: AiMediaBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkRunPublicView> {
  if (input.confirmPaidGeneration !== true) {
    throw new Error("paid_confirmation_required");
  }
  const env = envOf(deps);
  if (!isBenchmarkVideoEnabled(env)) throw new Error("video_benchmark_disabled");
  if (!deps?.videoProvider && !hasRunwayApiSecret(env)) {
    throw new Error("missing_api_key");
  }

  const model = getVideoModel(input.modelId);
  if (!model) throw new Error("unknown_video_model");
  if (model.status !== "testable") throw new Error("video_model_unsupported");
  if (input.durationSeconds !== ROUND_A_DURATION_SECONDS) {
    throw new Error("duration_must_be_round_a");
  }
  const ratio = input.ratio ?? model.defaultPortraitRatio;
  if (ratio !== ROUND_A_PORTRAIT_RATIO) {
    throw new Error("ratio_must_be_round_a");
  }

  const quote = quoteVideoCost({
    modelId: input.modelId,
    durationSeconds: ROUND_A_DURATION_SECONDS,
    generateAudio: model.returnsAudio,
    portraitRatio: ROUND_A_PORTRAIT_RATIO,
  });
  if (
    typeof input.maxCostUsd !== "number" ||
    !Number.isFinite(input.maxCostUsd) ||
    input.maxCostUsd <= 0
  ) {
    throw new Error("max_cost_required");
  }
  if (quote.usd > input.maxCostUsd) throw new Error("budget_exceeded");

  const projectId = validateUuid(input.projectId, "project_id");
  const videoJobId = validateUuid(input.videoJobId, "video_job_id");
  const clientRequestId = validateUuid(input.clientRequestId, "client_request_id");
  const sceneId = typeof input.sceneId === "string" ? input.sceneId.trim() : "";
  if (!sceneId) throw new Error("scene_id_required");
  const motionPrompt = typeof input.motionPrompt === "string" ? input.motionPrompt.trim() : "";
  if (!motionPrompt) throw new Error("motion_prompt_required");
  if (motionPrompt.length > model.promptTextMaxUtf16) {
    throw new Error("motion_prompt_too_long");
  }

  const supabase = supabaseOf(deps);
  const scenes = await listRunwayTestScenesForProject(projectId, {
    supabase,
  });
  const scene = scenes.find(
    (item) => item.videoJobId === videoJobId && item.sceneId === sceneId,
  );
  if (!scene) throw new Error("scene_not_found");

  const audioRole: AiMediaAudioRole = model.returnsAudio
    ? "scene_model_audio"
    : "none";
  const caseId = input.caseId?.trim() || DEFAULT_VIDEO_CASE_ID;
  const expected: CanonicalPaidBenchmarkInput = {
    projectId,
    testType: "video",
    generationMode: AI_MEDIA_BENCHMARK_GENERATION_MODE_IMAGE_TO_VIDEO,
    provider: model.provider,
    model: model.modelId,
    caseId,
    durationSeconds: quote.durationSeconds,
    ratio: ROUND_A_PORTRAIT_RATIO,
    generateAudio: quote.generateAudio,
    promptText: motionPrompt,
    sceneIdeaId: null,
    brandVisualProfile: null,
    estimatedCostUsd: quote.usd,
    estimatedCredits: quote.credits,
    maxCostUsd: input.maxCostUsd,
    sourceVideoJobId: videoJobId,
    sourceSceneId: scene.sceneId,
    sourceImageBucket: scene.imageBucket,
    sourceImagePath: scene.imagePath,
    voiceCandidateId: null,
    voiceText: null,
    soundCandidateId: null,
    soundPrompt: null,
    soundDurationSeconds: null,
  };
  const { row, reused } = await insertRun(
    supabase,
    {
      case_id: caseId,
      test_type: "video" satisfies AiMediaBenchmarkTestType,
      audio_role: audioRole,
      project_id: projectId,
      client_request_id: clientRequestId,
      source_video_job_id: videoJobId,
      source_scene_id: scene.sceneId,
      source_image_bucket: scene.imageBucket,
      source_image_path: scene.imagePath,
      provider: model.provider,
      model: model.modelId,
      voice_id: null,
      settings: {
        generationMode: AI_MEDIA_BENCHMARK_GENERATION_MODE_IMAGE_TO_VIDEO,
        durationSeconds: quote.durationSeconds,
        ratio: ROUND_A_PORTRAIT_RATIO,
        generateAudio: quote.generateAudio,
        motionPrompt,
        maxCostUsd: input.maxCostUsd,
        estimatedCostUsd: quote.usd,
        estimatedCredits: quote.credits,
        formula: quote.formula,
      },
      status: "created",
      estimated_credits: quote.credits,
      estimated_cost_usd: quote.usd,
      duration_seconds: quote.durationSeconds,
      output_contains_audio: quote.generateAudio,
      submission_claim_owner: null,
      submission_claimed_at: null,
    },
    clientRequestId,
    expected,
  );

  let signedSourceUrl = "";
  const submitted = await submitPaidCreate({
    supabase,
    row,
    deps,
    prepare: async () => {
      const sourceSignedUrl = await signPath(
        supabase,
        scene.imageBucket,
        scene.imagePath,
        SOURCE_TTL_SECONDS,
      );
      if (!sourceSignedUrl) {
        throw new Error("source_signed_url_failed");
      }
      signedSourceUrl = sourceSignedUrl;
    },
    post: async () => {
      const created = await videoProviderOf(deps).createImageToVideo({
        imageUrl: signedSourceUrl,
        motionPrompt,
        model: model.modelId,
        duration: quote.durationSeconds,
        ratio: ROUND_A_PORTRAIT_RATIO,
        generateAudio: quote.generateAudio,
        dangerousCreateMaxTransportAttempts: 1,
      });
      return { kind: "async", providerTaskId: created.providerTaskId };
    },
  });
  return toPublicView(supabase, submitted, reused);
}

export interface PreviewTextToVideoBenchmarkInput {
  projectId: string;
  sceneIdeaId?: string;
  caseId?: string;
}

export interface TextToVideoBenchmarkPreview {
  profile: BrandVisualProfile;
  sceneIdeaId: string;
  sceneIdeaLabel: string;
  coreIdea: string;
  promptText: string;
  durationSeconds: number;
  ratio: string;
  caseId: string;
  caseSnapshotId: string | null;
  fingerprint: string;
  locked: boolean;
  lockedByModel: string | null;
  lockedByRunId: string | null;
  fromProjectData: boolean;
}

function previewFromSnapshot(
  snapshot: RoundTCaseSnapshot,
  caseId: string,
): TextToVideoBenchmarkPreview {
  return {
    profile: snapshot.brandVisualProfile,
    sceneIdeaId: snapshot.sceneIdeaId,
    sceneIdeaLabel: snapshot.sceneIdeaLabel,
    coreIdea: snapshot.coreIdea,
    promptText: snapshot.promptText,
    durationSeconds: snapshot.durationSeconds,
    ratio: snapshot.ratio,
    caseId,
    caseSnapshotId: snapshot.caseSnapshotId,
    fingerprint: snapshot.fingerprint,
    locked: snapshot.locked,
    lockedByModel: snapshot.lockedByModel,
    lockedByRunId: snapshot.lockedByRunId,
    fromProjectData: snapshot.fromProjectData,
  };
}

export async function previewTextToVideoBenchmark(
  input: PreviewTextToVideoBenchmarkInput,
  deps?: AiMediaBenchmarkServiceDeps,
): Promise<TextToVideoBenchmarkPreview> {
  const projectId = validateUuid(input.projectId, "project_id");
  const caseId = input.caseId?.trim() || DEFAULT_TEXT_VIDEO_CASE_ID;
  const supabase = supabaseOf(deps);
  const snapshot = await resolveRoundTCaseSnapshot({
    supabase,
    projectId,
    caseId,
    requestedSceneIdeaId: input.sceneIdeaId,
    rejectMismatchedSceneIdea: false,
  });
  return previewFromSnapshot(snapshot, caseId);
}

export interface CreateTextToVideoBenchmarkInput {
  projectId: string;
  modelId: string;
  sceneIdeaId?: string;
  durationSeconds: number;
  ratio?: string;
  caseId?: string;
  clientRequestId: string;
  confirmPaidGeneration: boolean;
  maxCostUsd: number;
}

export async function createTextToVideoBenchmarkRun(
  input: CreateTextToVideoBenchmarkInput,
  deps?: AiMediaBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkRunPublicView> {
  if (input.confirmPaidGeneration !== true) {
    throw new Error("paid_confirmation_required");
  }
  const env = envOf(deps);
  if (!isBenchmarkTextVideoEnabled(env)) {
    throw new Error("text_video_benchmark_disabled");
  }
  if (!deps?.textVideoProvider && !deps?.videoProvider && !hasRunwayApiSecret(env)) {
    throw new Error("missing_api_key");
  }

  const model = getTextToVideoModel(input.modelId);
  if (!model) throw new Error("unknown_text_to_video_model");
  if (model.status !== "testable") throw new Error("text_to_video_model_unsupported");
  if (input.durationSeconds !== ROUND_A_DURATION_SECONDS) {
    throw new Error("duration_must_be_round_t");
  }
  const ratio = input.ratio ?? model.defaultPortraitRatio;
  if (ratio !== ROUND_A_PORTRAIT_RATIO) {
    throw new Error("ratio_must_be_round_t");
  }

  const quote = quoteTextToVideoCost({
    modelId: input.modelId,
    durationSeconds: ROUND_A_DURATION_SECONDS,
    generateAudio: model.returnsAudio,
    portraitRatio: ROUND_A_PORTRAIT_RATIO,
  });
  if (
    typeof input.maxCostUsd !== "number" ||
    !Number.isFinite(input.maxCostUsd) ||
    input.maxCostUsd <= 0
  ) {
    throw new Error("max_cost_required");
  }
  if (quote.usd > input.maxCostUsd) throw new Error("budget_exceeded");

  const projectId = validateUuid(input.projectId, "project_id");
  const clientRequestId = validateUuid(input.clientRequestId, "client_request_id");
  const caseId = input.caseId?.trim() || DEFAULT_TEXT_VIDEO_CASE_ID;
  const supabase = supabaseOf(deps);
  const snapshot = await resolveRoundTCaseSnapshot({
    supabase,
    projectId,
    caseId,
    requestedSceneIdeaId: input.sceneIdeaId,
    rejectMismatchedSceneIdea: true,
  });

  const audioRole: AiMediaAudioRole = model.returnsAudio
    ? "scene_model_audio"
    : "none";
  const expected: CanonicalPaidBenchmarkInput = {
    projectId,
    testType: "video",
    generationMode: AI_MEDIA_BENCHMARK_GENERATION_MODE_TEXT_TO_VIDEO,
    provider: model.provider,
    model: model.modelId,
    caseId,
    durationSeconds: quote.durationSeconds,
    ratio: ROUND_A_PORTRAIT_RATIO,
    generateAudio: quote.generateAudio,
    promptText: snapshot.promptText,
    sceneIdeaId: snapshot.sceneIdeaId,
    brandVisualProfile: snapshot.brandVisualProfile,
    estimatedCostUsd: quote.usd,
    estimatedCredits: quote.credits,
    maxCostUsd: input.maxCostUsd,
    sourceVideoJobId: null,
    sourceSceneId: null,
    sourceImageBucket: null,
    sourceImagePath: null,
    voiceCandidateId: null,
    voiceText: null,
    soundCandidateId: null,
    soundPrompt: null,
    soundDurationSeconds: null,
  };
  const snapshotFp = snapshotFingerprint({
    promptText: snapshot.promptText,
    sceneIdeaId: snapshot.sceneIdeaId,
    coreIdea: snapshot.coreIdea,
    brandVisualProfile: snapshot.brandVisualProfile,
    durationSeconds: snapshot.durationSeconds,
    ratio: snapshot.ratio,
  });

  const { row, reused } = await insertRun(
    supabase,
    {
      case_id: caseId,
      test_type: "video" satisfies AiMediaBenchmarkTestType,
      audio_role: audioRole,
      project_id: projectId,
      client_request_id: clientRequestId,
      source_video_job_id: null,
      source_scene_id: null,
      source_image_bucket: null,
      source_image_path: null,
      provider: model.provider,
      model: model.modelId,
      voice_id: null,
      settings: {
        generationMode: AI_MEDIA_BENCHMARK_GENERATION_MODE_TEXT_TO_VIDEO,
        durationSeconds: quote.durationSeconds,
        ratio: ROUND_A_PORTRAIT_RATIO,
        generateAudio: quote.generateAudio,
        promptText: snapshot.promptText,
        sceneIdeaId: snapshot.sceneIdeaId,
        coreIdea: snapshot.coreIdea,
        brandVisualProfile: snapshot.brandVisualProfile,
        caseSnapshotId: snapshot.caseSnapshotId,
        snapshotFingerprint: snapshotFp,
        snapshotLockedByModel: snapshot.lockedByModel ?? model.modelId,
        snapshotLockedByRunId: snapshot.lockedByRunId,
        regenerationCount: 0,
        maxCostUsd: input.maxCostUsd,
        estimatedCostUsd: quote.usd,
        estimatedCredits: quote.credits,
        formula: quote.formula,
      },
      status: "created",
      estimated_credits: quote.credits,
      estimated_cost_usd: quote.usd,
      duration_seconds: quote.durationSeconds,
      output_contains_audio: quote.generateAudio,
      submission_claim_owner: null,
      submission_claimed_at: null,
    },
    clientRequestId,
    expected,
  );

  // After first run insert, update the case snapshot attribution (best-effort).
  if (!reused && snapshot.caseSnapshotId) {
    await setCaseSnapshotLockedByRun(supabase, snapshot.caseSnapshotId, row.id, model.modelId);
  }

  // Pre-POST fingerprint guard: ensure the run's stored snapshot matches the
  // authoritative case snapshot before sending money to the provider.
  const submitted = await submitPaidCreate({
    supabase,
    row,
    deps,
    prepare: async () => {
      // Re-read the authoritative case snapshot from DB and verify fingerprint.
      const authoritative = await resolveRoundTCaseSnapshot({
        supabase,
        projectId,
        caseId,
        rejectMismatchedSceneIdea: false,
      });
      const storedFp =
        typeof row.settings.snapshotFingerprint === "string"
          ? row.settings.snapshotFingerprint
          : snapshotFp;
      if (authoritative.fingerprint !== storedFp) {
        throw new Error("round_t_snapshot_fingerprint_mismatch");
      }
    },
    post: async () => {
      const created = await textVideoProviderOf(deps).createTextToVideo({
        promptText: snapshot.promptText,
        model: model.modelId,
        duration: quote.durationSeconds,
        ratio: ROUND_A_PORTRAIT_RATIO,
        generateAudio: quote.generateAudio,
        dangerousCreateMaxTransportAttempts: 1,
      });
      return { kind: "async", providerTaskId: created.providerTaskId };
    },
  });
  return toPublicView(supabase, submitted, reused);
}

export interface CreateVoiceBenchmarkInput {
  projectId: string;
  candidateId: string;
  text: string;
  caseId?: string;
  clientRequestId: string;
  confirmPaidGeneration: boolean;
  maxCostUsd?: number;
}

export async function createVoiceBenchmarkRun(
  input: CreateVoiceBenchmarkInput,
  deps?: AiMediaBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkRunPublicView> {
  if (input.confirmPaidGeneration !== true) {
    throw new Error("paid_confirmation_required");
  }
  const env = envOf(deps);
  if (!isBenchmarkVoiceEnabled(env)) throw new Error("voice_benchmark_disabled");

  const candidate = requireVoiceCandidate(input.candidateId);
  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (!text) throw new Error("voice_text_required");
  if (text.length > candidate.promptTextMaxUtf16) throw new Error("voice_text_too_long");
  const quote = quoteVoiceCost({ candidateId: candidate.candidateId, text });
  if (quote.usd != null) {
    if (
      typeof input.maxCostUsd !== "number" ||
      !Number.isFinite(input.maxCostUsd) ||
      input.maxCostUsd <= 0
    ) {
      throw new Error("max_cost_required");
    }
    if (quote.usd > input.maxCostUsd) throw new Error("budget_exceeded");
  }

  if (candidate.adapter === "openai_speech") {
    if (!deps?.voiceProvider && !hasOpenAiApiKey(env)) {
      throw new Error("missing_api_key");
    }
  } else if (!deps?.audioProvider && !hasRunwayApiSecret(env)) {
    throw new Error("missing_api_key");
  }

  const projectId = validateUuid(input.projectId, "project_id");
  const clientRequestId = validateUuid(input.clientRequestId, "client_request_id");
  const caseId = input.caseId?.trim() || DEFAULT_VOICE_CASE_ID;
  const supabase = supabaseOf(deps);
  const expected: CanonicalPaidBenchmarkInput = {
    projectId,
    testType: "voice",
    generationMode: "voice",
    provider: candidate.provider,
    model: candidate.modelId,
    caseId,
    durationSeconds: null,
    ratio: null,
    generateAudio: true,
    promptText: text,
    sceneIdeaId: null,
    brandVisualProfile: null,
    estimatedCostUsd: quote.usd,
    estimatedCredits: quote.credits,
    maxCostUsd: input.maxCostUsd ?? null,
    sourceVideoJobId: null,
    sourceSceneId: null,
    sourceImageBucket: null,
    sourceImagePath: null,
    voiceCandidateId: candidate.candidateId,
    voiceText: text,
    soundCandidateId: null,
    soundPrompt: null,
    soundDurationSeconds: null,
  };
  const { row, reused } = await insertRun(
    supabase,
    {
      case_id: caseId,
      test_type: "voice" satisfies AiMediaBenchmarkTestType,
      audio_role: "voiceover",
      project_id: projectId,
      client_request_id: clientRequestId,
      provider: candidate.provider,
      model: candidate.modelId,
      voice_id: candidate.voiceId,
      settings: {
        text,
        candidateId: candidate.candidateId,
        formula: quote.formula,
        maxCostUsd: input.maxCostUsd ?? null,
        estimatedCostUsd: quote.usd,
        estimatedCredits: quote.credits,
        generateAudio: true,
        ttsHost: candidate.ttsHost,
        ttsHostNote: candidate.ttsHostNote,
        openaiTtsInstructions:
          candidate.adapter === "openai_speech"
            ? OPENAI_BENCHMARK_TTS_INSTRUCTIONS
            : null,
      },
      status: "created",
      estimated_credits: quote.credits,
      estimated_cost_usd: quote.usd,
      output_contains_audio: true,
      submission_claim_owner: null,
      submission_claimed_at: null,
    },
    clientRequestId,
    expected,
  );

  const submitted = await submitPaidCreate({
    supabase,
    row,
    deps,
    post: async (claimed) => {
      if (candidate.adapter === "openai_speech") {
        const voice =
          deps?.voiceProvider ??
          createOpenAiBenchmarkVoiceProvider(getSpeechProvider());
        const started = Date.now();
        const result = await voice.synthesize({ candidate, text });
        if (!result.audioBase64) throw new Error("voice_empty_output");
        const buffer = Buffer.from(result.audioBase64, "base64");
        const stored = await storeBenchmarkOutput(
          supabase,
          claimed,
          buffer,
          "audio/mpeg",
          outputFilenameForRun(claimed),
        );
        return {
          kind: "sync_success",
          patch: {
            status: "succeeded",
            output_bucket: stored.bucket,
            output_path: stored.path,
            latency_ms: result.latencyMs || Date.now() - started,
            duration_seconds: result.durationSeconds,
            estimated_cost_usd: result.estimatedCostUsd,
            estimated_credits: result.estimatedCredits,
            completed_at: new Date().toISOString(),
          },
        };
      }

      const created = await audioProviderOf(deps).createTextToSpeech({
        promptText: text,
        voicePresetId: candidate.voiceId,
        model: candidate.modelId,
      });
      return { kind: "async", providerTaskId: created.providerTaskId };
    },
  });
  return toPublicView(supabase, submitted, reused);
}

export interface CreateSoundBenchmarkInput {
  projectId: string;
  candidateId: string;
  promptText: string;
  durationSeconds: number;
  caseId?: string;
  clientRequestId: string;
  confirmPaidGeneration: boolean;
  maxCostUsd: number;
}

export async function createSoundBenchmarkRun(
  input: CreateSoundBenchmarkInput,
  deps?: AiMediaBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkRunPublicView> {
  if (input.confirmPaidGeneration !== true) {
    throw new Error("paid_confirmation_required");
  }
  const env = envOf(deps);
  if (!isBenchmarkSoundEnabled(env)) throw new Error("sound_benchmark_disabled");
  if (!deps?.audioProvider && !hasRunwayApiSecret(env)) {
    throw new Error("missing_api_key");
  }
  const candidate = requireSoundCandidate(input.candidateId);
  const promptText =
    typeof input.promptText === "string" ? input.promptText.trim() : "";
  if (!promptText) throw new Error("sound_prompt_required");
  const quote = quoteSoundCost({
    candidateId: candidate.candidateId,
    durationSeconds: input.durationSeconds,
  });
  if (
    typeof input.maxCostUsd !== "number" ||
    !Number.isFinite(input.maxCostUsd) ||
    input.maxCostUsd <= 0
  ) {
    throw new Error("max_cost_required");
  }
  if (quote.usd > input.maxCostUsd) throw new Error("budget_exceeded");

  const projectId = validateUuid(input.projectId, "project_id");
  const clientRequestId = validateUuid(input.clientRequestId, "client_request_id");
  const caseId = input.caseId?.trim() || DEFAULT_SOUND_CASE_ID;
  const supabase = supabaseOf(deps);
  const expected: CanonicalPaidBenchmarkInput = {
    projectId,
    testType: "sound",
    generationMode: "sound",
    provider: candidate.provider,
    model: candidate.modelId,
    caseId,
    durationSeconds: quote.durationSeconds,
    ratio: null,
    generateAudio: true,
    promptText,
    sceneIdeaId: null,
    brandVisualProfile: null,
    estimatedCostUsd: quote.usd,
    estimatedCredits: quote.credits,
    maxCostUsd: input.maxCostUsd,
    sourceVideoJobId: null,
    sourceSceneId: null,
    sourceImageBucket: null,
    sourceImagePath: null,
    voiceCandidateId: null,
    voiceText: null,
    soundCandidateId: candidate.candidateId,
    soundPrompt: promptText,
    soundDurationSeconds: quote.durationSeconds,
  };
  const { row, reused } = await insertRun(
    supabase,
    {
      case_id: caseId,
      test_type: "sound" satisfies AiMediaBenchmarkTestType,
      audio_role: "ambient_sfx",
      project_id: projectId,
      client_request_id: clientRequestId,
      provider: candidate.provider,
      model: candidate.modelId,
      voice_id: null,
      settings: {
        promptText,
        durationSeconds: quote.durationSeconds,
        candidateId: candidate.candidateId,
        formula: quote.formula,
        maxCostUsd: input.maxCostUsd,
        estimatedCostUsd: quote.usd,
        estimatedCredits: quote.credits,
        generateAudio: true,
        audioRole: "ambient_sfx",
      },
      status: "created",
      estimated_credits: quote.credits,
      estimated_cost_usd: quote.usd,
      duration_seconds: quote.durationSeconds,
      output_contains_audio: true,
      submission_claim_owner: null,
      submission_claimed_at: null,
    },
    clientRequestId,
    expected,
  );
  const submitted = await submitPaidCreate({
    supabase,
    row,
    deps,
    post: async () => {
      const created = await audioProviderOf(deps).createSoundEffect({
        promptText,
        model: candidate.modelId,
        duration: quote.durationSeconds ?? input.durationSeconds,
      });
      return { kind: "async", providerTaskId: created.providerTaskId };
    },
  });
  return toPublicView(supabase, submitted, reused);
}

function mapProviderStatus(
  status: string,
): AiMediaBenchmarkRunStatus | null {
  switch (status) {
    case "pending":
    case "throttled":
      return "pending";
    case "running":
      return "running";
    case "succeeded":
      return "succeeded";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}

async function downloadAndStore(
  row: AiMediaBenchmarkRunRow,
  url: string,
  fallbackType: string,
  filename: string,
  deps?: AiMediaBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkRunRow> {
  return downloadBenchmarkOutput({
    row,
    url,
    fallbackType,
    filename,
    supabase: supabaseOf(deps),
    fetchImpl: fetchOf(deps),
    timeoutMs: deps?.downloadTimeoutMs,
    maxOutputBytes: deps?.maxOutputBytes,
    afterOutputUploaded: deps?.afterOutputUploaded,
  });
}

export async function syncBenchmarkRun(
  args: { runId: string; projectId: string },
  deps?: AiMediaBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkRunPublicView> {
  const supabase = supabaseOf(deps);
  const runId = validateUuid(args.runId, "run_id");
  const projectId = validateUuid(args.projectId, "project_id");
  const { data, error } = await supabase
    .from("ai_media_benchmark_runs")
    .select("*")
    .eq("id", runId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("benchmark_run_not_found");
  let row = data as AiMediaBenchmarkRunRow;
  if (!isAiMediaBenchmarkRunStatus(row.status)) {
    throw new Error("benchmark_run_invalid_status");
  }
  if (
    row.status === "succeeded" &&
    row.output_bucket &&
    row.output_path
  ) {
    return toPublicView(supabase, row, false);
  }
  if (
    row.status === "failed" ||
    row.status === "cancelled" ||
    row.status === "submission_unknown"
  ) {
    return toPublicView(supabase, row, false);
  }
  if (row.status === "submitting" && !row.provider_task_id) {
    row = await resolveSubmittingRowForSync(supabase, row, deps);
    return toPublicView(supabase, row, false);
  }
  if (!row.provider_task_id) {
    return toPublicView(supabase, row, false);
  }

  const adopted = await adoptExistingBenchmarkOutput(supabase, row);
  if (adopted) {
    return toPublicView(supabase, adopted, false);
  }

  if (row.test_type === "video") {
    const snapshot = await videoProviderOf(deps).getImageToVideoTask(
      row.provider_task_id,
      { model: row.model, maxTransportAttempts: 1 },
    );
    const mapped = mapProviderStatus(snapshot.status);
    if (mapped === "succeeded" && snapshot.videoUrl) {
      try {
        row = await downloadAndStore(
          row,
          snapshot.videoUrl,
          "video/mp4",
          outputFilenameForRun(row),
          deps,
        );
      } catch {
        const { data: current } = await supabase
          .from("ai_media_benchmark_runs")
          .select("*")
          .eq("id", row.id)
          .single();
        if (current) row = current as AiMediaBenchmarkRunRow;
      }
    } else if (mapped === "pending" || mapped === "running") {
      if (row.status !== "download_failed") {
        const { data: updated } = await supabase
          .from("ai_media_benchmark_runs")
          .update({ status: mapped })
          .eq("id", row.id)
          .select("*")
          .maybeSingle();
        if (updated) row = updated as AiMediaBenchmarkRunRow;
      }
    } else if (mapped === "failed" || mapped === "cancelled") {
      const { data: updated } = await supabase
        .from("ai_media_benchmark_runs")
        .update({
          status: mapped,
          error_message: snapshot.error?.message?.slice(0, 1000) ?? mapped,
          failure_code: snapshot.error?.code ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .select("*")
        .maybeSingle();
      if (updated) row = updated as AiMediaBenchmarkRunRow;
    }
    return toPublicView(supabase, row, false);
  }

  const snapshot = await audioProviderOf(deps).getAudioTask(row.provider_task_id, {
    model: row.model,
  });
  const mapped = mapProviderStatus(snapshot.status);
  if (mapped === "succeeded" && snapshot.audioUrl) {
    try {
      row = await downloadAndStore(
        row,
        snapshot.audioUrl,
        "audio/mpeg",
        outputFilenameForRun(row),
        deps,
      );
    } catch {
      const { data: current } = await supabase
        .from("ai_media_benchmark_runs")
        .select("*")
        .eq("id", row.id)
        .single();
      if (current) row = current as AiMediaBenchmarkRunRow;
    }
  } else if (mapped === "pending" || mapped === "running") {
    if (row.status !== "download_failed") {
      const { data: updated } = await supabase
        .from("ai_media_benchmark_runs")
        .update({ status: mapped })
        .eq("id", row.id)
        .select("*")
        .maybeSingle();
      if (updated) row = updated as AiMediaBenchmarkRunRow;
    }
  } else if (mapped === "failed" || mapped === "cancelled") {
    const { data: updated } = await supabase
      .from("ai_media_benchmark_runs")
      .update({
        status: mapped,
        error_message: snapshot.error?.message?.slice(0, 1000) ?? mapped,
        failure_code: snapshot.error?.code ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select("*")
      .maybeSingle();
    if (updated) row = updated as AiMediaBenchmarkRunRow;
  }
  return toPublicView(supabase, row, false);
}

export async function rateBenchmarkRun(
  args: {
    runId: string;
    projectId: string;
    rating: unknown;
    note?: unknown;
  },
  deps?: AiMediaBenchmarkServiceDeps,
): Promise<AiMediaBenchmarkRunPublicView> {
  const rating = parseBenchmarkRating(args.rating);
  const note = parseBenchmarkNote(args.note);
  const supabase = supabaseOf(deps);
  const runId = validateUuid(args.runId, "run_id");
  const projectId = validateUuid(args.projectId, "project_id");
  const { data, error } = await supabase
    .from("ai_media_benchmark_runs")
    .update({ rating, note })
    .eq("id", runId)
    .eq("project_id", projectId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("benchmark_run_not_found");
  return toPublicView(supabase, data as AiMediaBenchmarkRunRow, false);
}

export { listRunwayTestScenesForProject as listBenchmarkScenesForProject };
