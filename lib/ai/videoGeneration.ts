// Minimal image-to-video provider contract.
// Shared fields: imageUrl, motionPrompt, duration, ratio, optional seed.
// Model-specific fields (audio, promptImage shape, duration enum vs range)
// are applied by the provider request builder — do not send a fake unified
// body to models that reject those fields.
//
// Runway tasks are async: create returns a task id, then callers poll GET
// until a terminal status. Do not collapse that into a single hidden call
// if you need to persist the task id.

export const VIDEO_GENERATION_PROVIDER_RUNWAY = "runway" as const;

export type VideoGenerationProviderName =
  typeof VIDEO_GENERATION_PROVIDER_RUNWAY;

export type VideoGenerationTaskStatus =
  | "pending"
  | "throttled"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export const VIDEO_GENERATION_IN_PROGRESS_STATUSES = [
  "pending",
  "throttled",
  "running",
] as const satisfies readonly VideoGenerationTaskStatus[];

export const VIDEO_GENERATION_TERMINAL_STATUSES = [
  "succeeded",
  "failed",
  "cancelled",
] as const satisfies readonly VideoGenerationTaskStatus[];

export function isVideoGenerationTerminalStatus(
  status: VideoGenerationTaskStatus,
): boolean {
  return (VIDEO_GENERATION_TERMINAL_STATUSES as readonly string[]).includes(
    status,
  );
}

export interface ImageToVideoRequest {
  /** HTTPS URL, `data:image/...;base64,...`, or Runway `runway://` upload URI. */
  imageUrl: string;
  motionPrompt: string;
  /**
   * Catalog model id. Default comes from the provider.
   * Unknown or unsupported models are rejected before fetch.
   */
  model?: string;
  /** Output duration in seconds. Valid range/enum is model-specific. */
  duration: number;
  /**
   * When the model accepts an `audio` field (Veo / Seedance), whether to
   * generate scene audio. Ignored for Gen-4 (no audio field).
   */
  generateAudio?: boolean;
  /**
   * Runway `ratio` (pixel size, e.g. `720:1280`). This is not a classic
   * `9:16` / `16:9` aspect-ratio string — those values were removed in API
   * version `2024-11-06` for Gen-4 family models.
   */
  ratio: string;
  seed?: number;
  /** Timeout for a single HTTP request (create or poll GET). */
  timeoutMs?: number;
  /**
   * DANGEROUS — overrides create POST transport retries. Default is always 1.
   * Retrying POST /v1/image_to_video after a lost response can create a second
   * paid task. `generateImageToVideo` never sets this. Prefer leave unset.
   */
  dangerousCreateMaxTransportAttempts?: number;
  pollIntervalMs?: number;
  /** Max wall-clock time for polling a task to terminal status. */
  pollTimeoutMs?: number;
}

export interface ImageToVideoResolvedRequest {
  provider: VideoGenerationProviderName;
  model: string;
  imageUrl: string;
  motionPrompt: string;
  duration: number;
  ratio: string;
  seed?: number;
  generateAudio?: boolean;
}

export interface VideoGenerationTaskError {
  message: string;
  code?: string;
  httpStatus?: number;
}

export interface ImageToVideoTaskSnapshot {
  provider: VideoGenerationProviderName;
  providerTaskId: string;
  status: VideoGenerationTaskStatus;
  model: string;
  videoUrl?: string;
  progress?: number;
  error?: VideoGenerationTaskError;
  request?: ImageToVideoResolvedRequest;
  createdAt?: string;
  generationMs?: number;
  estimatedCostCredits?: number;
}

export interface TextToVideoRequest {
  promptText: string;
  /** Catalog model id. Unknown or unsupported models are rejected before fetch. */
  model?: string;
  duration: number;
  /**
   * When the model accepts an `audio` field (Veo / Seedance), whether to
   * generate scene audio. Ignored for Gen-4.5 (no audio field).
   */
  generateAudio?: boolean;
  /**
   * Runway `ratio` (pixel size, e.g. `720:1280`).
   */
  ratio: string;
  /**
   * Random seed. Only send when the model documents a `seed` field (Gen-4.5).
   * This is not an image reference.
   */
  seed?: number;
  timeoutMs?: number;
  /**
   * DANGEROUS — overrides create POST transport retries. Default is always 1.
   * Retrying POST /v1/text_to_video after a lost response can create a second
   * paid task.
   */
  dangerousCreateMaxTransportAttempts?: number;
}

export interface TextToVideoResolvedRequest {
  provider: VideoGenerationProviderName;
  model: string;
  promptText: string;
  duration: number;
  ratio: string;
  seed?: number;
  generateAudio?: boolean;
}

export interface TextToVideoTaskSnapshot {
  provider: VideoGenerationProviderName;
  providerTaskId: string;
  status: VideoGenerationTaskStatus;
  model: string;
  videoUrl?: string;
  progress?: number;
  error?: VideoGenerationTaskError;
  request?: TextToVideoResolvedRequest;
  createdAt?: string;
  generationMs?: number;
  estimatedCostCredits?: number;
}

export interface GetTextToVideoTaskOptions {
  request?: TextToVideoResolvedRequest;
  model?: string;
  timeoutMs?: number;
  maxTransportAttempts?: number;
}

export interface TextToVideoProvider {
  readonly name: VideoGenerationProviderName;
  createTextToVideo(req: TextToVideoRequest): Promise<TextToVideoTaskSnapshot>;
  getTextToVideoTask(
    providerTaskId: string,
    options?: GetTextToVideoTaskOptions,
  ): Promise<TextToVideoTaskSnapshot>;
}

export interface WaitForImageToVideoOptions {
  request?: ImageToVideoResolvedRequest;
  model?: string;
  /** Timeout for each poll GET HTTP request. */
  timeoutMs?: number;
  /** Transport retries for poll GET only (safe to retry). */
  maxTransportAttempts?: number;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  startedAtMs?: number;
}

export interface GetImageToVideoTaskOptions {
  request?: ImageToVideoResolvedRequest;
  model?: string;
  /** Timeout for the poll GET HTTP request. */
  timeoutMs?: number;
  /** Transport retries for GET only (safe to retry). */
  maxTransportAttempts?: number;
}

export interface VideoGenerationProvider {
  readonly name: VideoGenerationProviderName;
  createImageToVideo(req: ImageToVideoRequest): Promise<ImageToVideoTaskSnapshot>;
  getImageToVideoTask(
    providerTaskId: string,
    options?: GetImageToVideoTaskOptions,
  ): Promise<ImageToVideoTaskSnapshot>;
  waitForImageToVideo(
    providerTaskId: string,
    options?: WaitForImageToVideoOptions,
  ): Promise<ImageToVideoTaskSnapshot>;
  generateImageToVideo(req: ImageToVideoRequest): Promise<ImageToVideoTaskSnapshot>;
}
