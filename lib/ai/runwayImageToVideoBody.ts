import {
  GEMINI_OMNI_FLASH_IMAGE_TO_VIDEO_RATIOS,
  SEEDANCE2_FAST_IMAGE_TO_VIDEO_RATIOS,
  VEO_IMAGE_TO_VIDEO_RATIOS,
  getVideoModel,
  type VideoModelCatalogEntry,
} from "@/lib/ai-media-benchmark/catalog";
import type {
  ImageToVideoRequest,
  ImageToVideoResolvedRequest,
} from "@/lib/ai/videoGeneration";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";

export const RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16 = 1000;
export const RUNWAY_GEN4_DURATION_MIN = 2;
export const RUNWAY_GEN4_DURATION_MAX = 10;

export const RUNWAY_GEN4_IMAGE_TO_VIDEO_MODELS = [
  "gen4.5",
  "gen4_turbo",
] as const;

export const RUNWAY_GEN4_IMAGE_TO_VIDEO_RATIOS = [
  "1280:720",
  "720:1280",
  "1104:832",
  "960:960",
  "832:1104",
  "1584:672",
] as const;

export type RunwayGen4ImageToVideoModel =
  (typeof RUNWAY_GEN4_IMAGE_TO_VIDEO_MODELS)[number];
export type RunwayGen4ImageToVideoRatio =
  (typeof RUNWAY_GEN4_IMAGE_TO_VIDEO_RATIOS)[number];

const MAX_SEED = 4_294_967_295;
const HTTPS_URL_MAX_LENGTH = 2048;
const DATA_IMAGE_URI =
  /^data:image\/(jpeg|jpg|png|webp);base64,[a-z0-9+/]+=*$/i;

export type RunwayImageToVideoFamily =
  | "gen4"
  | "veo"
  | "seedance2_fast"
  | "gemini_omni_flash";

export interface RunwayImageToVideoResolved extends ImageToVideoResolvedRequest {
  family: RunwayImageToVideoFamily;
  generateAudio: boolean;
  promptTextMaxUtf16: number;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new VideoGenerationError(`Invalid image-to-video input: ${field} is required`, {
      code: "invalid_input",
    });
  }
  return value.trim();
}

function isIpv4Hostname(hostname: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function isIpv6Hostname(hostname: string): boolean {
  return hostname.includes(":");
}

export function summarizeImageUrl(imageUrl: string): string {
  if (!imageUrl.startsWith("data:")) return imageUrl;
  const comma = imageUrl.indexOf(",");
  const prefix = comma >= 0 ? imageUrl.slice(0, comma) : imageUrl.slice(0, 32);
  return `${prefix},[omitted]`;
}

export function validateImageUrl(imageUrl: string): string {
  const value = requireNonEmptyString(imageUrl, "imageUrl");

  if (value.startsWith("data:")) {
    if (!DATA_IMAGE_URI.test(value) || value.length < 13) {
      throw new VideoGenerationError(
        "Invalid image-to-video input: imageUrl data URI must be image/jpeg, image/png, or image/webp base64",
        { code: "invalid_input" },
      );
    }
    return value;
  }

  if (value.startsWith("runway://")) {
    if (value.length < 13) {
      throw new VideoGenerationError(
        "Invalid image-to-video input: imageUrl runway URI is too short",
        { code: "invalid_input" },
      );
    }
    return value;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new VideoGenerationError(
      "Invalid image-to-video input: imageUrl must be an https URL, data URI, or runway:// URI",
      { code: "invalid_input" },
    );
  }

  if (parsed.protocol !== "https:") {
    throw new VideoGenerationError(
      "Invalid image-to-video input: imageUrl URL must use https",
      { code: "invalid_input" },
    );
  }
  if (value.length > HTTPS_URL_MAX_LENGTH) {
    throw new VideoGenerationError(
      "Invalid image-to-video input: imageUrl URL exceeds 2048 characters",
      { code: "invalid_input" },
    );
  }
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || isIpv4Hostname(hostname) || isIpv6Hostname(hostname)) {
    throw new VideoGenerationError(
      "Invalid image-to-video input: imageUrl URL must use a domain name, not an IP address",
      { code: "invalid_input" },
    );
  }
  return value;
}

function validateSeed(seed: unknown): number | undefined {
  if (seed === undefined) return undefined;
  if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    throw new VideoGenerationError(
      "Invalid image-to-video input: seed must be an integer between 0 and 4294967295",
      { code: "invalid_input" },
    );
  }
  return seed;
}

function familyOf(entry: VideoModelCatalogEntry): RunwayImageToVideoFamily {
  if (entry.modelId === "gen4.5" || entry.modelId === "gen4_turbo") return "gen4";
  if (entry.modelId === "veo3.1_fast" || entry.modelId === "veo3.1") return "veo";
  if (entry.modelId === "seedance2_fast") return "seedance2_fast";
  if (entry.modelId === "gemini_omni_flash") return "gemini_omni_flash";
  throw new VideoGenerationError(
    `Invalid image-to-video input: model "${entry.modelId}" has no request builder`,
    { code: "invalid_input" },
  );
}

function durationAllowed(entry: VideoModelCatalogEntry, duration: number): boolean {
  if (!Number.isInteger(duration)) return false;
  if (entry.duration.kind === "enum") {
    return entry.duration.values.includes(duration);
  }
  return duration >= entry.duration.min && duration <= entry.duration.max;
}

export function resolveRunwayImageToVideoRequest(
  req: ImageToVideoRequest,
  defaultModel: string,
): { imageUrl: string; resolved: RunwayImageToVideoResolved } {
  const imageUrl = validateImageUrl(req.imageUrl);
  const modelId = requireNonEmptyString(req.model ?? defaultModel, "model");
  const entry = getVideoModel(modelId);
  if (!entry) {
    throw new VideoGenerationError(
      `Invalid image-to-video input: model "${modelId}" is not in the verified catalog`,
      { code: "invalid_input" },
    );
  }
  if (entry.status !== "testable") {
    throw new VideoGenerationError(
      `Invalid image-to-video input: model "${modelId}" is unsupported (${entry.unsupportedReason ?? "not testable"})`,
      { code: "invalid_input" },
    );
  }

  const motionPrompt = requireNonEmptyString(req.motionPrompt, "motionPrompt");
  if (motionPrompt.length > entry.promptTextMaxUtf16) {
    throw new VideoGenerationError(
      `Invalid image-to-video input: motionPrompt exceeds ${entry.promptTextMaxUtf16} UTF-16 code units`,
      { code: "invalid_input" },
    );
  }
  if (entry.promptTextRequired && !motionPrompt) {
    throw new VideoGenerationError(
      "Invalid image-to-video input: motionPrompt is required for this model",
      { code: "invalid_input" },
    );
  }

  if (!durationAllowed(entry, req.duration)) {
    const allowed =
      entry.duration.kind === "enum"
        ? entry.duration.values.join(", ")
        : `${entry.duration.min}–${entry.duration.max}`;
    throw new VideoGenerationError(
      `Invalid image-to-video input: duration must be ${allowed} seconds for ${entry.modelId}`,
      { code: "invalid_input" },
    );
  }

  const ratio = requireNonEmptyString(req.ratio, "ratio");
  const allowedRatios =
    entry.modelId === "gen4.5" || entry.modelId === "gen4_turbo"
      ? RUNWAY_GEN4_IMAGE_TO_VIDEO_RATIOS
      : entry.modelId === "veo3.1_fast" || entry.modelId === "veo3.1"
        ? VEO_IMAGE_TO_VIDEO_RATIOS
        : entry.modelId === "gemini_omni_flash"
          ? GEMINI_OMNI_FLASH_IMAGE_TO_VIDEO_RATIOS
          : SEEDANCE2_FAST_IMAGE_TO_VIDEO_RATIOS;
  if (!(allowedRatios as readonly string[]).includes(ratio)) {
    throw new VideoGenerationError(
      `Invalid image-to-video input: ratio must be one of ${[...allowedRatios].join(", ")} for ${entry.modelId}`,
      { code: "invalid_input" },
    );
  }

  const generateAudio = req.generateAudio ?? entry.returnsAudio;
  if (req.generateAudio === true && !entry.audioField) {
    throw new VideoGenerationError(
      entry.modelId === "gemini_omni_flash"
        ? 'Invalid image-to-video input: Runway OpenAPI does not document an `audio` field for gemini_omni_flash I2V; generated-audio I2V is not requested'
        : `Invalid image-to-video input: model "${entry.modelId}" does not accept an audio parameter`,
      { code: "invalid_input" },
    );
  }
  if (generateAudio && !entry.audioField && !entry.returnsAudio) {
    if (entry.modelId === "gemini_omni_flash") {
      throw new VideoGenerationError(
        "Invalid image-to-video input: generated-audio I2V is unsupported because the `audio` request parameter is undocumented",
        { code: "invalid_input" },
      );
    }
    throw new VideoGenerationError(
      `Invalid image-to-video input: model "${entry.modelId}" does not accept an audio parameter`,
      { code: "invalid_input" },
    );
  }

  const seed = validateSeed(req.seed);
  const family = familyOf(entry);

  return {
    imageUrl,
    resolved: {
      provider: "runway",
      model: entry.modelId,
      imageUrl: summarizeImageUrl(imageUrl),
      motionPrompt,
      duration: req.duration,
      ratio,
      family,
      generateAudio: entry.audioField ? generateAudio : false,
      promptTextMaxUtf16: entry.promptTextMaxUtf16,
      ...(seed !== undefined ? { seed } : {}),
    },
  };
}

export function buildRunwayImageToVideoBody(
  imageUrl: string,
  resolved: RunwayImageToVideoResolved,
): Record<string, unknown> {
  if (resolved.family === "gen4") {
    const body: Record<string, unknown> = {
      model: resolved.model,
      promptImage: imageUrl,
      promptText: resolved.motionPrompt,
      duration: resolved.duration,
      ratio: resolved.ratio,
    };
    if (resolved.seed !== undefined) body.seed = resolved.seed;
    return body;
  }

  if (resolved.family === "veo") {
    return {
      model: resolved.model,
      promptImage: imageUrl,
      promptText: resolved.motionPrompt,
      duration: resolved.duration,
      ratio: resolved.ratio,
      audio: resolved.generateAudio,
    };
  }

  if (resolved.family === "seedance2_fast") {
    return {
      model: resolved.model,
      promptImage: [{ uri: imageUrl, position: "first" }],
      promptText: resolved.motionPrompt,
      duration: resolved.duration,
      ratio: resolved.ratio,
      audio: resolved.generateAudio,
    };
  }

  if (resolved.family === "gemini_omni_flash") {
    return buildDocumentedGeminiOmniFlashImageToVideoBody({
      imageUrl,
      promptText: resolved.motionPrompt,
      duration: resolved.duration,
      ratio: resolved.ratio,
    });
  }

  throw new VideoGenerationError(
    `Invalid image-to-video input: no request builder for family`,
    { code: "invalid_input" },
  );
}

/**
 * Documented Runway I2V body for gemini_omni_flash.
 * OpenAPI (2026-08-18) fields: promptImage (first-frame URI), promptText max 4000,
 * ratio 1280:720|720:1280, duration 3–10, model. No `audio` field.
 */
export function buildDocumentedGeminiOmniFlashImageToVideoBody(args: {
  imageUrl: string;
  promptText: string;
  duration: number;
  ratio: string;
  generateAudio?: boolean;
}): Record<string, unknown> {
  if (args.generateAudio === true) {
    throw new VideoGenerationError(
      "Invalid image-to-video input: Runway OpenAPI does not document an `audio` field for gemini_omni_flash I2V; generated-audio I2V is not requested",
      { code: "invalid_input" },
    );
  }
  if (!Number.isInteger(args.duration) || args.duration < 3 || args.duration > 10) {
    throw new VideoGenerationError(
      "Invalid image-to-video input: duration must be 3–10 seconds for gemini_omni_flash",
      { code: "invalid_input" },
    );
  }
  if (
    !(GEMINI_OMNI_FLASH_IMAGE_TO_VIDEO_RATIOS as readonly string[]).includes(
      args.ratio,
    )
  ) {
    throw new VideoGenerationError(
      `Invalid image-to-video input: ratio must be one of ${GEMINI_OMNI_FLASH_IMAGE_TO_VIDEO_RATIOS.join(", ")} for gemini_omni_flash`,
      { code: "invalid_input" },
    );
  }
  return {
    model: "gemini_omni_flash",
    promptImage: args.imageUrl,
    promptText: args.promptText,
    duration: args.duration,
    ratio: args.ratio,
  };
}
