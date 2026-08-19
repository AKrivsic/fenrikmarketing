export const AI_MEDIA_BENCHMARK_TEST_TYPES = [
  "video",
  "voice",
  "sound",
  "final_reel",
] as const;

export type AiMediaBenchmarkTestType =
  (typeof AI_MEDIA_BENCHMARK_TEST_TYPES)[number];

export const AI_MEDIA_BENCHMARK_RUN_STATUSES = [
  "created",
  "submitting",
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "download_failed",
  "submission_unknown",
] as const;

export type AiMediaBenchmarkRunStatus =
  (typeof AI_MEDIA_BENCHMARK_RUN_STATUSES)[number];

export function isAiMediaBenchmarkRunStatus(
  value: unknown,
): value is AiMediaBenchmarkRunStatus {
  return (
    typeof value === "string" &&
    (AI_MEDIA_BENCHMARK_RUN_STATUSES as readonly string[]).includes(value)
  );
}

export const AI_MEDIA_AUDIO_ROLES = [
  "none",
  "scene_model_audio",
  "voiceover",
  "ambient_sfx",
  "music_bed",
] as const;

export type AiMediaAudioRole = (typeof AI_MEDIA_AUDIO_ROLES)[number];

export const AI_MEDIA_CATALOG_STATUSES = ["testable", "unsupported"] as const;
export type AiMediaCatalogStatus = (typeof AI_MEDIA_CATALOG_STATUSES)[number];

export const AI_MEDIA_BENCHMARK_RATING_MIN = 1;
export const AI_MEDIA_BENCHMARK_RATING_MAX = 5;
export const AI_MEDIA_BENCHMARK_NOTE_MAX_CHARS = 500;

export const DEFAULT_VIDEO_CASE_ID = "portrait-scene-a";
export const DEFAULT_TEXT_VIDEO_CASE_ID = "text-to-video-scene-t";
export const DEFAULT_VOICE_CASE_ID = "voice-script-a";
export const DEFAULT_SOUND_CASE_ID = "sound-ambient-a";

export const AI_MEDIA_BENCHMARK_GENERATION_MODE_TEXT_TO_VIDEO = "text_to_video";
export const AI_MEDIA_BENCHMARK_GENERATION_MODE_IMAGE_TO_VIDEO = "image_to_video";

export function isTextToVideoBenchmarkSettings(
  settings: Record<string, unknown> | null | undefined,
): boolean {
  return settings?.generationMode === AI_MEDIA_BENCHMARK_GENERATION_MODE_TEXT_TO_VIDEO;
}

export const DEFAULT_VOICE_SCRIPT =
  "Tento krátký testový hlas ověřuje srozumitelnost a tón pro interní srovnání.";

/** OpenAI Speech `instructions` for Benchmark Lab only. Not production TTS. */
export const OPENAI_BENCHMARK_TTS_INSTRUCTIONS =
  "Mluv svižně, energicky a přirozeně jako moderátor krátkého videa pro sociální sítě. Nezní uspěchaně ani reklamně.";

export const DEFAULT_SOUND_PROMPT =
  "Quiet indoor room tone with a faint distant city hum, no music, no speech.";

export const AI_MEDIA_BENCHMARK_TERMINAL_STATUSES = [
  "succeeded",
  "failed",
  "cancelled",
  "download_failed",
  "submission_unknown",
] as const satisfies readonly AiMediaBenchmarkRunStatus[];

export function isAiMediaBenchmarkTerminalStatus(
  value: unknown,
): value is (typeof AI_MEDIA_BENCHMARK_TERMINAL_STATUSES)[number] {
  return (
    typeof value === "string" &&
    (AI_MEDIA_BENCHMARK_TERMINAL_STATUSES as readonly string[]).includes(value)
  );
}

export type DurationSpec =
  | { kind: "range"; min: number; max: number }
  | { kind: "enum"; values: readonly number[] };

export interface VideoCostQuote {
  modelId: string;
  durationSeconds: number;
  generateAudio: boolean;
  credits: number;
  usd: number;
  usdPerCredit: number;
  formula: string;
  maxCostUsd: number;
}

export interface VoiceCostQuote {
  candidateId: string;
  characterCount: number;
  credits: number | null;
  usd: number | null;
  formula: string;
  completeness: "exact_credits" | "rates_output_unknown";
}

export interface SoundCostQuote {
  candidateId: string;
  durationSeconds: number | null;
  credits: number;
  usd: number;
  formula: string;
}

export interface AiMediaBenchmarkRunRow {
  id: string;
  case_id: string;
  test_type: AiMediaBenchmarkTestType;
  audio_role: AiMediaAudioRole;
  project_id: string | null;
  client_request_id: string;
  source_video_job_id: string | null;
  source_scene_id: string | null;
  source_image_bucket: string | null;
  source_image_path: string | null;
  provider: string;
  model: string;
  voice_id: string | null;
  settings: Record<string, unknown>;
  provider_task_id: string | null;
  submission_claim_owner: string | null;
  submission_claimed_at: string | null;
  status: AiMediaBenchmarkRunStatus;
  estimated_credits: number | null;
  estimated_cost_usd: number | null;
  duration_seconds: number | null;
  latency_ms: number | null;
  output_contains_audio: boolean | null;
  output_bucket: string | null;
  output_path: string | null;
  error_message: string | null;
  failure_code: string | null;
  rating: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AiMediaBenchmarkRunPublicView {
  id: string;
  caseId: string;
  testType: AiMediaBenchmarkTestType;
  audioRole: AiMediaAudioRole;
  projectId: string | null;
  clientRequestId: string;
  sourceVideoJobId: string | null;
  sourceSceneId: string | null;
  sourceImageBucket: string | null;
  sourceImagePath: string | null;
  provider: string;
  model: string;
  voiceId: string | null;
  settings: Record<string, unknown>;
  providerTaskId: string | null;
  status: AiMediaBenchmarkRunStatus;
  estimatedCredits: number | null;
  estimatedCostUsd: number | null;
  durationSeconds: number | null;
  latencyMs: number | null;
  outputContainsAudio: boolean | null;
  outputBucket: string | null;
  outputPath: string | null;
  playbackUrl: string | null;
  sourcePreviewUrl: string | null;
  errorMessage: string | null;
  failureCode: string | null;
  rating: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  reusedExistingRequest: boolean;
}
