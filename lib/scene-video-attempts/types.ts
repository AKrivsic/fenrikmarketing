import type { SceneVideoAttemptStatus } from "@/lib/scene-video-attempts/constants";

export interface SceneVideoAttemptRow {
  id: string;
  project_id: string;
  video_job_id: string;
  scene_id: string;
  client_request_id: string;
  parent_attempt_id: string | null;
  source_image_bucket: string;
  source_image_path: string;
  motion_prompt: string;
  provider: string;
  model: string;
  duration_seconds: number;
  ratio: string;
  seed: number | null;
  provider_task_id: string | null;
  status: SceneVideoAttemptStatus;
  failure_code: string | null;
  error_message: string | null;
  estimated_credits: number | null;
  estimated_cost_usd: number | null;
  created_at: string;
  submitted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
  generation_duration_ms: number | null;
  output_bucket: string | null;
  output_path: string | null;
  output_duration_seconds: number | null;
  output_has_audio: boolean | null;
  provider_metadata: Record<string, unknown> | null;
  download_claimed_at: string | null;
  download_claim_owner: string | null;
  submission_claimed_at: string | null;
  submission_claim_owner: string | null;
}

export interface SceneVideoAttemptView {
  id: string;
  projectId: string;
  videoJobId: string;
  sceneId: string;
  clientRequestId: string;
  parentAttemptId: string | null;
  sourceImageBucket: string;
  sourceImagePath: string;
  motionPrompt: string;
  provider: string;
  model: string;
  durationSeconds: number;
  ratio: string;
  seed: number | null;
  providerTaskId: string | null;
  status: SceneVideoAttemptStatus;
  failureCode: string | null;
  errorMessage: string | null;
  estimatedCredits: number | null;
  estimatedCostUsd: number | null;
  createdAt: string;
  submittedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  generationDurationMs: number | null;
  outputBucket: string | null;
  outputPath: string | null;
  outputDurationSeconds: number | null;
  outputHasAudio: boolean | null;
  providerMetadata: Record<string, unknown> | null;
  reusedExistingRequest: boolean;
}

export function mapAttemptRow(
  row: SceneVideoAttemptRow,
  reusedExistingRequest = false,
): SceneVideoAttemptView {
  return {
    id: row.id,
    projectId: row.project_id,
    videoJobId: row.video_job_id,
    sceneId: row.scene_id,
    clientRequestId: row.client_request_id,
    parentAttemptId: row.parent_attempt_id,
    sourceImageBucket: row.source_image_bucket,
    sourceImagePath: row.source_image_path,
    motionPrompt: row.motion_prompt,
    provider: row.provider,
    model: row.model,
    durationSeconds: row.duration_seconds,
    ratio: row.ratio,
    seed: row.seed,
    providerTaskId: row.provider_task_id,
    status: row.status,
    failureCode: row.failure_code,
    errorMessage: row.error_message,
    estimatedCredits:
      row.estimated_credits === null ? null : Number(row.estimated_credits),
    estimatedCostUsd:
      row.estimated_cost_usd === null ? null : Number(row.estimated_cost_usd),
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    generationDurationMs: row.generation_duration_ms,
    outputBucket: row.output_bucket,
    outputPath: row.output_path,
    outputDurationSeconds:
      row.output_duration_seconds === null
        ? null
        : Number(row.output_duration_seconds),
    outputHasAudio: row.output_has_audio,
    providerMetadata: row.provider_metadata,
    reusedExistingRequest,
  };
}
