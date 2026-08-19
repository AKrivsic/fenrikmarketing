import type { CombinedMixSettings, CombinedScenePlan } from "@/lib/ai-media-benchmark/combinedPlan";

export const AI_MEDIA_BENCHMARK_COMBINED_STATUSES = [
  "created",
  "assembling",
  "succeeded",
  "failed",
] as const;

export type AiMediaBenchmarkCombinedStatus =
  (typeof AI_MEDIA_BENCHMARK_COMBINED_STATUSES)[number];

export function isAiMediaBenchmarkCombinedStatus(
  value: unknown,
): value is AiMediaBenchmarkCombinedStatus {
  return (
    typeof value === "string" &&
    (AI_MEDIA_BENCHMARK_COMBINED_STATUSES as readonly string[]).includes(value)
  );
}

export interface AiMediaBenchmarkCombinedRunRow {
  id: string;
  case_id: string;
  project_id: string;
  client_request_id: string;
  video_run_id: string;
  voice_run_id: string;
  sound_run_id: string | null;
  voiceover_text: string | null;
  mix_settings: CombinedMixSettings & Record<string, unknown>;
  status: AiMediaBenchmarkCombinedStatus;
  assembly_claim_owner: string | null;
  assembly_claimed_at: string | null;
  output_bucket: string | null;
  output_path: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  failure_code: string | null;
  rating_image: number | null;
  rating_av_fit: number | null;
  rating_overall: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AiMediaBenchmarkCombinedRunPublicView {
  id: string;
  caseId: string;
  projectId: string;
  clientRequestId: string;
  videoRunId: string;
  voiceRunId: string;
  soundRunId: string | null;
  voiceoverText: string | null;
  mixSettings: CombinedMixSettings;
  plan: CombinedScenePlan;
  status: AiMediaBenchmarkCombinedStatus;
  outputBucket: string | null;
  outputPath: string | null;
  playbackUrl: string | null;
  durationSeconds: number | null;
  errorMessage: string | null;
  failureCode: string | null;
  ratingImage: number | null;
  ratingAvFit: number | null;
  ratingOverall: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  reusedExistingRequest: boolean;
}
