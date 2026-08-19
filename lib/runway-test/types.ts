/** Status values for runway_test_jobs — must match DB CHECK exactly. */
export const RUNWAY_TEST_JOB_STATUSES = [
  "created",
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "download_failed",
] as const;

export type RunwayTestJobStatus = (typeof RUNWAY_TEST_JOB_STATUSES)[number];

export function isRunwayTestJobStatus(value: unknown): value is RunwayTestJobStatus {
  return (
    typeof value === "string" &&
    (RUNWAY_TEST_JOB_STATUSES as readonly string[]).includes(value)
  );
}

export interface RunwayTestJobRow {
  id: string;
  project_id: string;
  client_request_id: string;
  source_video_job_id: string | null;
  source_scene_id: string;
  source_image_bucket: string;
  source_image_path: string;
  motion_prompt: string;
  provider: string;
  model: string;
  duration_seconds: number;
  ratio: string;
  runway_task_id: string | null;
  status: RunwayTestJobStatus;
  estimated_credits: number | null;
  estimated_cost_usd: number | null;
  output_bucket: string | null;
  output_path: string | null;
  error_message: string | null;
  failure_code: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface RunwayTestSceneOption {
  projectId: string;
  videoJobId: string;
  sceneId: string;
  imageBucket: string;
  imagePath: string;
  /** Short-lived preview URL for the admin UI only — not a durable identity. */
  previewUrl: string | null;
  videoJobCreatedAt: string;
  videoJobStatus: string;
}

export interface RunwayTestJobPublicView {
  id: string;
  projectId: string;
  clientRequestId: string;
  sourceVideoJobId: string | null;
  sourceSceneId: string;
  sourceImageBucket: string;
  sourceImagePath: string;
  motionPrompt: string;
  provider: string;
  model: string;
  durationSeconds: number;
  ratio: string;
  runwayTaskId: string | null;
  status: RunwayTestJobStatus;
  estimatedCredits: number | null;
  estimatedCostUsd: number | null;
  outputBucket: string | null;
  outputPath: string | null;
  /** Short-lived playback URL; never the canonical storage identity. */
  playbackUrl: string | null;
  /** Short-lived source preview; never persisted as identity. */
  sourcePreviewUrl: string | null;
  errorMessage: string | null;
  failureCode: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  reusedExistingRequest: boolean;
}
