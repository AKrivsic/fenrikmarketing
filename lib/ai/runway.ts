import {
  fetchWithRetry,
  HTTP_MAX_ATTEMPTS,
  HTTP_TIMEOUT_MS,
} from "@/lib/http/fetchWithRetry";
import type {
  GetImageToVideoTaskOptions,
  GetTextToVideoTaskOptions,
  ImageToVideoRequest,
  ImageToVideoResolvedRequest,
  ImageToVideoTaskSnapshot,
  TextToVideoProvider,
  TextToVideoRequest,
  TextToVideoResolvedRequest,
  TextToVideoTaskSnapshot,
  VideoGenerationProvider,
  VideoGenerationTaskStatus,
  WaitForImageToVideoOptions,
} from "@/lib/ai/videoGeneration";
import { isVideoGenerationTerminalStatus } from "@/lib/ai/videoGeneration";
import {
  VideoGenerationError,
  redactSecret,
  videoGenerationErrorFromUnknown,
} from "@/lib/ai/videoGenerationError";
import {
  RUNWAY_GEN4_DURATION_MAX,
  RUNWAY_GEN4_DURATION_MIN,
  RUNWAY_GEN4_IMAGE_TO_VIDEO_MODELS,
  RUNWAY_GEN4_IMAGE_TO_VIDEO_RATIOS,
  RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16,
  buildRunwayImageToVideoBody,
  resolveRunwayImageToVideoRequest,
  type RunwayGen4ImageToVideoModel,
  type RunwayGen4ImageToVideoRatio,
} from "@/lib/ai/runwayImageToVideoBody";
import {
  buildRunwayTextToVideoBody,
  resolveRunwayTextToVideoRequest,
} from "@/lib/ai/runwayTextToVideoBody";

export {
  RUNWAY_GEN4_DURATION_MAX,
  RUNWAY_GEN4_DURATION_MIN,
  RUNWAY_GEN4_IMAGE_TO_VIDEO_MODELS,
  RUNWAY_GEN4_IMAGE_TO_VIDEO_RATIOS,
  RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16,
};
export type { RunwayGen4ImageToVideoModel, RunwayGen4ImageToVideoRatio };

export const RUNWAY_API_BASE = "https://api.dev.runwayml.com";
export const RUNWAY_API_VERSION = "2024-11-06";
export const DEFAULT_RUNWAY_VIDEO_MODEL = "gen4.5";
export const RUNWAY_TEXT_TO_VIDEO_PATH = "/v1/text_to_video";

const IMAGE_TO_VIDEO_PATH = "/v1/image_to_video";
const TEXT_TO_VIDEO_PATH = "/v1/text_to_video";
const TEXT_TO_SPEECH_PATH = "/v1/text_to_speech";
const SOUND_EFFECT_PATH = "/v1/sound_effect";
const TASKS_PATH = "/v1/tasks";

/** Create POST must not auto-retry: a lost response may already have billed a task. */
export const RUNWAY_CREATE_MAX_TRANSPORT_ATTEMPTS = 1;

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_POLL_TIMEOUT_MS = 180_000;
/** Shared with scene-video-executor polling (Runway waitForImageToVideo default). */
export const RUNWAY_VIDEO_DEFAULT_POLL_INTERVAL_MS = DEFAULT_POLL_INTERVAL_MS;
export const RUNWAY_VIDEO_DEFAULT_POLL_TIMEOUT_MS = DEFAULT_POLL_TIMEOUT_MS;
const DEFAULT_HTTP_TIMEOUT_MS = HTTP_TIMEOUT_MS.ai;

interface RunwayCreateResponse {
  id?: string;
  estimatedCost?: { credits?: number };
}

interface RunwayTaskResponse {
  id?: string;
  status?: string;
  createdAt?: string;
  progress?: number;
  output?: unknown;
  failure?: string;
  failureCode?: string;
  estimatedCost?: { credits?: number };
  cost?: { credits?: number };
}

export interface RunwayAudioTaskSnapshot {
  provider: "runway";
  providerTaskId: string;
  status: VideoGenerationTaskStatus;
  model: string;
  audioUrl?: string;
  progress?: number;
  error?: { message: string; code?: string };
  createdAt?: string;
  generationMs?: number;
  estimatedCostCredits?: number;
}

function readEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function resolveHttpTimeoutMs(override?: number): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return override;
  }
  return readEnvNumber("RUNWAY_VIDEO_HTTP_TIMEOUT_MS", DEFAULT_HTTP_TIMEOUT_MS);
}

function resolvePollTimeoutMs(override?: number): number {
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return override;
  }
  const primary = process.env.RUNWAY_VIDEO_POLL_TIMEOUT_MS?.trim();
  if (primary) {
    return readEnvNumber("RUNWAY_VIDEO_POLL_TIMEOUT_MS", DEFAULT_POLL_TIMEOUT_MS);
  }
  return readEnvNumber("RUNWAY_VIDEO_TIMEOUT_MS", DEFAULT_POLL_TIMEOUT_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new VideoGenerationError(`Invalid image-to-video input: ${field} is required`, {
      code: "invalid_input",
    });
  }
  return value.trim();
}

function validateTaskId(providerTaskId: unknown): string {
  return requireNonEmptyString(providerTaskId, "providerTaskId");
}

function validateSucceededMediaUrl(
  raw: string | undefined,
  providerTaskId: string,
  kind: "video" | "audio",
): string {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    throw new VideoGenerationError(
      `Runway succeeded without a ${kind} URL in task output`,
      { code: "unexpected_response", providerTaskId },
    );
  }
  const value = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new VideoGenerationError(
      `Runway succeeded with an invalid ${kind} URL`,
      { code: "unexpected_response", providerTaskId },
    );
  }
  if (parsed.protocol !== "https:") {
    throw new VideoGenerationError(
      `Runway succeeded with a non-HTTPS ${kind} URL`,
      { code: "unexpected_response", providerTaskId },
    );
  }
  if (!parsed.hostname) {
    throw new VideoGenerationError(
      `Runway succeeded with a ${kind} URL missing a hostname`,
      { code: "unexpected_response", providerTaskId },
    );
  }
  return value;
}

function mapTaskStatus(
  status: string | undefined,
  providerTaskId?: string,
): VideoGenerationTaskStatus {
  switch (status) {
    case "PENDING":
      return "pending";
    case "THROTTLED":
      return "throttled";
    case "RUNNING":
      return "running";
    case "SUCCEEDED":
      return "succeeded";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    default:
      throw new VideoGenerationError(
        `Runway returned an unexpected task status${status ? `: ${status}` : ""}`,
        { code: "unexpected_response", providerTaskId },
      );
  }
}

function firstOutputUrl(output: unknown): string | undefined {
  if (!Array.isArray(output)) return undefined;
  const first = output.find((item) => typeof item === "string" && item.trim().length > 0);
  return typeof first === "string" ? first : undefined;
}

function creditsFrom(value: { credits?: number } | undefined): number | undefined {
  return typeof value?.credits === "number" && Number.isFinite(value.credits)
    ? value.credits
    : undefined;
}

function readErrorMessage(bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: unknown;
      issues?: { message?: string; path?: unknown }[];
    };
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
    const issue = parsed.issues?.[0]?.message;
    if (typeof issue === "string" && issue.trim()) {
      return issue.trim();
    }
  } catch {
    // fall through to sliced body
  }
  const sliced = bodyText.trim().slice(0, 400);
  return sliced || "request failed";
}

function resolveCreateMaxAttempts(req: { dangerousCreateMaxTransportAttempts?: number }): number {
  const override = req.dangerousCreateMaxTransportAttempts;
  if (override === undefined) return RUNWAY_CREATE_MAX_TRANSPORT_ATTEMPTS;
  if (
    typeof override !== "number" ||
    !Number.isInteger(override) ||
    override < 1
  ) {
    throw new VideoGenerationError(
      "Invalid image-to-video input: dangerousCreateMaxTransportAttempts must be an integer >= 1",
      { code: "invalid_input" },
    );
  }
  return override;
}

function toResolvedRequest(
  resolved: ReturnType<typeof resolveRunwayImageToVideoRequest>["resolved"],
): ImageToVideoResolvedRequest {
  return {
    provider: resolved.provider,
    model: resolved.model,
    imageUrl: resolved.imageUrl,
    motionPrompt: resolved.motionPrompt,
    duration: resolved.duration,
    ratio: resolved.ratio,
    generateAudio: resolved.generateAudio,
    ...(resolved.seed !== undefined ? { seed: resolved.seed } : {}),
  };
}

export class RunwayVideoGenerationProvider
  implements VideoGenerationProvider, TextToVideoProvider
{
  readonly name = "runway" as const;
  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel?: string) {
    this.apiKey = apiKey ?? process.env.RUNWAYML_API_SECRET ?? "";
    const configured =
      defaultModel?.trim() ||
      process.env.RUNWAY_VIDEO_MODEL?.trim() ||
      DEFAULT_RUNWAY_VIDEO_MODEL;
    this.defaultModel = configured;
  }

  async createImageToVideo(
    req: ImageToVideoRequest,
  ): Promise<ImageToVideoTaskSnapshot> {
    this.requireApiKey();
    const { imageUrl, resolved } = resolveRunwayImageToVideoRequest(
      req,
      this.defaultModel,
    );
    const request = toResolvedRequest(resolved);
    const startedAtMs = Date.now();
    const createMaxAttempts = resolveCreateMaxAttempts(req);
    const body = buildRunwayImageToVideoBody(imageUrl, resolved);

    const data = (await this.requestJson(
      `${RUNWAY_API_BASE}${IMAGE_TO_VIDEO_PATH}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      {
        label: "runway:image_to_video",
        timeoutMs: resolveHttpTimeoutMs(req.timeoutMs),
        maxAttempts: createMaxAttempts,
      },
    )) as RunwayCreateResponse;

    const providerTaskId = typeof data.id === "string" ? data.id.trim() : "";
    if (!providerTaskId) {
      throw new VideoGenerationError(
        "Runway create task response did not include a task id",
        { code: "unexpected_response" },
      );
    }

    return {
      provider: this.name,
      providerTaskId,
      status: "pending",
      model: resolved.model,
      request,
      estimatedCostCredits: creditsFrom(data.estimatedCost),
      generationMs: Date.now() - startedAtMs,
    };
  }

  async createTextToVideo(
    req: TextToVideoRequest,
  ): Promise<TextToVideoTaskSnapshot> {
    this.requireApiKey();
    const { resolved } = resolveRunwayTextToVideoRequest(req, this.defaultModel);
    const request: TextToVideoResolvedRequest = {
      provider: resolved.provider,
      model: resolved.model,
      promptText: resolved.promptText,
      duration: resolved.duration,
      ratio: resolved.ratio,
      generateAudio: resolved.generateAudio,
      ...(resolved.seed !== undefined ? { seed: resolved.seed } : {}),
    };
    const startedAtMs = Date.now();
    const createMaxAttempts = resolveCreateMaxAttempts(req);
    const body = buildRunwayTextToVideoBody(resolved);

    const data = (await this.requestJson(
      `${RUNWAY_API_BASE}${TEXT_TO_VIDEO_PATH}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      {
        label: "runway:text_to_video",
        timeoutMs: resolveHttpTimeoutMs(req.timeoutMs),
        maxAttempts: createMaxAttempts,
      },
    )) as RunwayCreateResponse;

    const providerTaskId = typeof data.id === "string" ? data.id.trim() : "";
    if (!providerTaskId) {
      throw new VideoGenerationError(
        "Runway create task response did not include a task id",
        { code: "unexpected_response" },
      );
    }

    return {
      provider: this.name,
      providerTaskId,
      status: "pending",
      model: resolved.model,
      request,
      estimatedCostCredits: creditsFrom(data.estimatedCost),
      generationMs: Date.now() - startedAtMs,
    };
  }

  async createTextToSpeech(args: {
    promptText: string;
    voicePresetId: string;
    model?: string;
    timeoutMs?: number;
    dangerousCreateMaxTransportAttempts?: number;
  }): Promise<RunwayAudioTaskSnapshot> {
    this.requireApiKey();
    const model = args.model?.trim() || "eleven_multilingual_v2";
    if (model !== "eleven_multilingual_v2") {
      throw new VideoGenerationError(
        `Invalid text-to-speech input: model "${model}" is not supported`,
        { code: "invalid_input" },
      );
    }
    const promptText = requireNonEmptyString(args.promptText, "promptText");
    if (promptText.length > 1000) {
      throw new VideoGenerationError(
        "Invalid text-to-speech input: promptText exceeds 1000 UTF-16 code units",
        { code: "invalid_input" },
      );
    }
    const presetId = requireNonEmptyString(args.voicePresetId, "voicePresetId");
    const startedAtMs = Date.now();
    const data = (await this.requestJson(
      `${RUNWAY_API_BASE}${TEXT_TO_SPEECH_PATH}`,
      {
        method: "POST",
        body: JSON.stringify({
          model,
          promptText,
          voice: { type: "runway-preset", presetId },
        }),
      },
      {
        label: "runway:text_to_speech",
        timeoutMs: resolveHttpTimeoutMs(args.timeoutMs),
        maxAttempts: resolveCreateMaxAttempts(args),
      },
    )) as RunwayCreateResponse;
    const providerTaskId = typeof data.id === "string" ? data.id.trim() : "";
    if (!providerTaskId) {
      throw new VideoGenerationError(
        "Runway create task response did not include a task id",
        { code: "unexpected_response" },
      );
    }
    return {
      provider: this.name,
      providerTaskId,
      status: "pending",
      model,
      estimatedCostCredits: creditsFrom(data.estimatedCost),
      generationMs: Date.now() - startedAtMs,
    };
  }

  async createSoundEffect(args: {
    promptText: string;
    model: string;
    duration?: number;
    timeoutMs?: number;
    dangerousCreateMaxTransportAttempts?: number;
  }): Promise<RunwayAudioTaskSnapshot> {
    this.requireApiKey();
    if (args.model !== "eleven_text_to_sound_v2") {
      throw new VideoGenerationError(
        `Invalid sound-effect input: model "${args.model}" is not supported`,
        { code: "invalid_input" },
      );
    }
    const promptText = requireNonEmptyString(args.promptText, "promptText");
    if (promptText.length > 3000) {
      throw new VideoGenerationError(
        "Invalid sound-effect input: promptText exceeds 3000 UTF-16 code units",
        { code: "invalid_input" },
      );
    }
    const duration = args.duration;
    if (
      duration === undefined ||
      typeof duration !== "number" ||
      !Number.isFinite(duration) ||
      duration < 0.5 ||
      duration > 30
    ) {
      throw new VideoGenerationError(
        "Invalid sound-effect input: duration must be 0.5–30 seconds",
        { code: "invalid_input" },
      );
    }
    const startedAtMs = Date.now();
    const data = (await this.requestJson(
      `${RUNWAY_API_BASE}${SOUND_EFFECT_PATH}`,
      {
        method: "POST",
        body: JSON.stringify({
          model: args.model,
          promptText,
          duration,
          loop: false,
        }),
      },
      {
        label: "runway:sound_effect",
        timeoutMs: resolveHttpTimeoutMs(args.timeoutMs),
        maxAttempts: resolveCreateMaxAttempts(args),
      },
    )) as RunwayCreateResponse;
    const providerTaskId = typeof data.id === "string" ? data.id.trim() : "";
    if (!providerTaskId) {
      throw new VideoGenerationError(
        "Runway create task response did not include a task id",
        { code: "unexpected_response" },
      );
    }
    return {
      provider: this.name,
      providerTaskId,
      status: "pending",
      model: args.model,
      estimatedCostCredits: creditsFrom(data.estimatedCost),
      generationMs: Date.now() - startedAtMs,
    };
  }

  async getImageToVideoTask(
    providerTaskId: string,
    options?: GetImageToVideoTaskOptions,
  ): Promise<ImageToVideoTaskSnapshot> {
    const apiKey = this.requireApiKey();
    const taskId = validateTaskId(providerTaskId);
    const data = (await this.pollTask(taskId, options?.timeoutMs, options?.maxTransportAttempts));
    const status = mapTaskStatus(data.status, taskId);
    const failure = typeof data.failure === "string" ? data.failure.trim() : "";
    const failureCode =
      typeof data.failureCode === "string" && data.failureCode.trim()
        ? data.failureCode.trim()
        : undefined;

    let videoUrl: string | undefined;
    if (status === "succeeded") {
      videoUrl = validateSucceededMediaUrl(firstOutputUrl(data.output), taskId, "video");
    }

    const snapshot: ImageToVideoTaskSnapshot = {
      provider: this.name,
      providerTaskId: typeof data.id === "string" && data.id.trim() ? data.id.trim() : taskId,
      status,
      model: options?.model ?? options?.request?.model ?? this.defaultModel,
      videoUrl,
      request: options?.request,
      createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
      estimatedCostCredits: creditsFrom(data.cost) ?? creditsFrom(data.estimatedCost),
    };

    if (typeof data.progress === "number" && Number.isFinite(data.progress)) {
      snapshot.progress = data.progress;
    }

    if (status === "failed") {
      snapshot.error = {
        message: redactSecret(failure || "Runway task failed", apiKey),
        code: failureCode,
      };
    } else if (status === "cancelled") {
      snapshot.error = {
        message: "Runway task was cancelled",
        code: "CANCELLED",
      };
    }

    return snapshot;
  }

  async getTextToVideoTask(
    providerTaskId: string,
    options?: GetTextToVideoTaskOptions,
  ): Promise<TextToVideoTaskSnapshot> {
    const snapshot = await this.getImageToVideoTask(providerTaskId, {
      model: options?.model ?? options?.request?.model,
      timeoutMs: options?.timeoutMs,
      maxTransportAttempts: options?.maxTransportAttempts,
    });
    return {
      provider: snapshot.provider,
      providerTaskId: snapshot.providerTaskId,
      status: snapshot.status,
      model: snapshot.model,
      videoUrl: snapshot.videoUrl,
      progress: snapshot.progress,
      error: snapshot.error,
      request: options?.request,
      createdAt: snapshot.createdAt,
      generationMs: snapshot.generationMs,
      estimatedCostCredits: snapshot.estimatedCostCredits,
    };
  }

  async getAudioTask(
    providerTaskId: string,
    options?: { model?: string; timeoutMs?: number; maxTransportAttempts?: number },
  ): Promise<RunwayAudioTaskSnapshot> {
    const apiKey = this.requireApiKey();
    const taskId = validateTaskId(providerTaskId);
    const data = await this.pollTask(taskId, options?.timeoutMs, options?.maxTransportAttempts);
    const status = mapTaskStatus(data.status, taskId);
    const failure = typeof data.failure === "string" ? data.failure.trim() : "";
    const failureCode =
      typeof data.failureCode === "string" && data.failureCode.trim()
        ? data.failureCode.trim()
        : undefined;
    let audioUrl: string | undefined;
    if (status === "succeeded") {
      audioUrl = validateSucceededMediaUrl(firstOutputUrl(data.output), taskId, "audio");
    }
    const snapshot: RunwayAudioTaskSnapshot = {
      provider: this.name,
      providerTaskId: typeof data.id === "string" && data.id.trim() ? data.id.trim() : taskId,
      status,
      model: options?.model ?? "unknown",
      audioUrl,
      createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
      estimatedCostCredits: creditsFrom(data.cost) ?? creditsFrom(data.estimatedCost),
    };
    if (typeof data.progress === "number" && Number.isFinite(data.progress)) {
      snapshot.progress = data.progress;
    }
    if (status === "failed") {
      snapshot.error = {
        message: redactSecret(failure || "Runway task failed", apiKey),
        code: failureCode,
      };
    } else if (status === "cancelled") {
      snapshot.error = {
        message: "Runway task was cancelled",
        code: "CANCELLED",
      };
    }
    return snapshot;
  }

  async waitForImageToVideo(
    providerTaskId: string,
    options?: WaitForImageToVideoOptions,
  ): Promise<ImageToVideoTaskSnapshot> {
    const taskId = validateTaskId(providerTaskId);
    const startedAtMs = options?.startedAtMs ?? Date.now();
    const pollIntervalMs =
      options?.pollIntervalMs ??
      readEnvNumber("RUNWAY_VIDEO_POLL_INTERVAL_MS", DEFAULT_POLL_INTERVAL_MS);
    const pollTimeoutMs = resolvePollTimeoutMs(options?.pollTimeoutMs);

    while (true) {
      const snapshot = await this.getImageToVideoTask(taskId, {
        request: options?.request,
        model: options?.model ?? options?.request?.model,
        timeoutMs: options?.timeoutMs,
        maxTransportAttempts: options?.maxTransportAttempts,
      });
      snapshot.generationMs = Date.now() - startedAtMs;

      if (isVideoGenerationTerminalStatus(snapshot.status)) {
        return snapshot;
      }

      if (Date.now() - startedAtMs >= pollTimeoutMs) {
        throw new VideoGenerationError(
          `Runway task ${taskId} timed out after ${pollTimeoutMs} ms while ${snapshot.status}`,
          { code: "timeout", providerTaskId: taskId },
        );
      }

      await sleep(pollIntervalMs);
    }
  }

  async waitForAudioTask(
    providerTaskId: string,
    options?: {
      model?: string;
      timeoutMs?: number;
      pollIntervalMs?: number;
      pollTimeoutMs?: number;
      startedAtMs?: number;
    },
  ): Promise<RunwayAudioTaskSnapshot> {
    const taskId = validateTaskId(providerTaskId);
    const startedAtMs = options?.startedAtMs ?? Date.now();
    const pollIntervalMs =
      options?.pollIntervalMs ??
      readEnvNumber("RUNWAY_VIDEO_POLL_INTERVAL_MS", DEFAULT_POLL_INTERVAL_MS);
    const pollTimeoutMs = resolvePollTimeoutMs(options?.pollTimeoutMs);
    while (true) {
      const snapshot = await this.getAudioTask(taskId, {
        model: options?.model,
        timeoutMs: options?.timeoutMs,
      });
      snapshot.generationMs = Date.now() - startedAtMs;
      if (isVideoGenerationTerminalStatus(snapshot.status)) {
        return snapshot;
      }
      if (Date.now() - startedAtMs >= pollTimeoutMs) {
        throw new VideoGenerationError(
          `Runway task ${taskId} timed out after ${pollTimeoutMs} ms while ${snapshot.status}`,
          { code: "timeout", providerTaskId: taskId },
        );
      }
      await sleep(pollIntervalMs);
    }
  }

  async generateImageToVideo(
    req: ImageToVideoRequest,
  ): Promise<ImageToVideoTaskSnapshot> {
    const startedAtMs = Date.now();
    const { dangerousCreateMaxTransportAttempts: _ignored, ...safeReq } = req;
    void _ignored;
    const created = await this.createImageToVideo(safeReq);
    return this.waitForImageToVideo(created.providerTaskId, {
      request: created.request,
      model: created.model,
      timeoutMs: req.timeoutMs,
      pollIntervalMs: req.pollIntervalMs,
      pollTimeoutMs: req.pollTimeoutMs,
      startedAtMs,
    });
  }

  private requireApiKey(): string {
    if (!this.apiKey.trim()) {
      throw new VideoGenerationError("Missing RUNWAYML_API_SECRET", {
        code: "missing_api_key",
      });
    }
    return this.apiKey;
  }

  private async pollTask(
    taskId: string,
    timeoutMs?: number,
    maxTransportAttempts?: number,
  ): Promise<RunwayTaskResponse> {
    return (await this.requestJson(
      `${RUNWAY_API_BASE}${TASKS_PATH}/${encodeURIComponent(taskId)}`,
      { method: "GET" },
      {
        label: "runway:tasks",
        timeoutMs: resolveHttpTimeoutMs(timeoutMs),
        maxAttempts: maxTransportAttempts ?? HTTP_MAX_ATTEMPTS.ai,
        providerTaskId: taskId,
      },
    )) as RunwayTaskResponse;
  }

  private async requestJson(
    url: string,
    init: { method: string; body?: string },
    args: {
      label: string;
      timeoutMs: number;
      maxAttempts: number;
      providerTaskId?: string;
    },
  ): Promise<unknown> {
    const apiKey = this.requireApiKey();
    let res: Response;
    try {
      res = await fetchWithRetry(
        url,
        {
          method: init.method,
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
            "X-Runway-Version": RUNWAY_API_VERSION,
          },
          ...(init.body ? { body: init.body } : {}),
        },
        {
          timeoutMs: args.timeoutMs,
          maxAttempts: args.maxAttempts,
          label: args.label,
        },
      );
    } catch (err) {
      throw videoGenerationErrorFromUnknown(err, apiKey, args.providerTaskId);
    }

    const bodyText = await res.text().catch(() => "");

    if (!res.ok) {
      const detail = redactSecret(readErrorMessage(bodyText), apiKey);
      throw new VideoGenerationError(
        redactSecret(`Runway request failed (${res.status}): ${detail}`, apiKey),
        {
          code: "http_error",
          httpStatus: res.status,
          providerTaskId: args.providerTaskId,
        },
      );
    }

    if (!bodyText.trim()) {
      throw new VideoGenerationError("Runway returned an empty response", {
        code: "unexpected_response",
        httpStatus: res.status,
        providerTaskId: args.providerTaskId,
      });
    }

    try {
      return JSON.parse(bodyText) as unknown;
    } catch {
      throw new VideoGenerationError("Runway returned a non-JSON response", {
        code: "unexpected_response",
        httpStatus: res.status,
        providerTaskId: args.providerTaskId,
      });
    }
  }
}
