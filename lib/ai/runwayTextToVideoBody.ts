import {
  getTextToVideoModel,
  type TextToVideoCatalogEntry,
} from "@/lib/ai-media-benchmark/catalog";
import type {
  TextToVideoRequest,
  TextToVideoResolvedRequest,
} from "@/lib/ai/videoGeneration";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";

const MAX_SEED = 4_294_967_295;

export type RunwayTextToVideoFamily = "gen4.5" | "veo" | "seedance2_fast";

export interface RunwayTextToVideoResolved extends TextToVideoResolvedRequest {
  family: RunwayTextToVideoFamily;
  generateAudio: boolean;
  promptTextMaxUtf16: number;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new VideoGenerationError(`Invalid text-to-video input: ${field} is required`, {
      code: "invalid_input",
    });
  }
  return value.trim();
}

function utf16Length(value: string): number {
  return value.length;
}

function validateSeed(seed: unknown): number | undefined {
  if (seed === undefined) return undefined;
  if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    throw new VideoGenerationError(
      "Invalid text-to-video input: seed must be an integer between 0 and 4294967295",
      { code: "invalid_input" },
    );
  }
  return seed;
}

function familyOf(entry: TextToVideoCatalogEntry): RunwayTextToVideoFamily {
  if (entry.modelId === "gen4.5") return "gen4.5";
  if (entry.modelId === "veo3.1_fast") return "veo";
  if (entry.modelId === "seedance2_fast") return "seedance2_fast";
  throw new VideoGenerationError(
    `Invalid text-to-video input: model "${entry.modelId}" has no request builder`,
    { code: "invalid_input" },
  );
}

function isDurationAllowed(
  spec: TextToVideoCatalogEntry["duration"],
  duration: number,
): boolean {
  if (!Number.isInteger(duration)) return false;
  if (spec.kind === "enum") return spec.values.includes(duration);
  return duration >= spec.min && duration <= spec.max;
}

export function resolveRunwayTextToVideoRequest(
  req: TextToVideoRequest,
  defaultModel: string,
): { resolved: RunwayTextToVideoResolved } {
  const modelId = requireNonEmptyString(req.model ?? defaultModel, "model");
  const entry = getTextToVideoModel(modelId);
  if (!entry) {
    throw new VideoGenerationError(
      `Invalid text-to-video input: model "${modelId}" is not a Round T catalog model`,
      { code: "invalid_input" },
    );
  }
  if (entry.status !== "testable") {
    throw new VideoGenerationError(
      `Invalid text-to-video input: model "${modelId}" is unsupported`,
      { code: "invalid_input" },
    );
  }

  const promptText = requireNonEmptyString(req.promptText, "promptText");
  if (utf16Length(promptText) > entry.promptTextMaxUtf16) {
    throw new VideoGenerationError(
      `Invalid text-to-video input: promptText exceeds ${entry.promptTextMaxUtf16} UTF-16 code units`,
      { code: "invalid_input" },
    );
  }

  const duration = req.duration;
  if (typeof duration !== "number" || !isDurationAllowed(entry.duration, duration)) {
    throw new VideoGenerationError(
      "Invalid text-to-video input: duration is not supported for this model",
      { code: "invalid_input" },
    );
  }

  const ratio = requireNonEmptyString(req.ratio, "ratio");
  if (!entry.portraitRatios.includes(ratio)) {
    throw new VideoGenerationError(
      "Invalid text-to-video input: ratio is not supported for this model",
      { code: "invalid_input" },
    );
  }

  const generateAudio =
    entry.audioField ? req.generateAudio !== false : false;
  if (generateAudio && !entry.audioField) {
    throw new VideoGenerationError(
      "Invalid text-to-video input: generateAudio is not supported for this model",
      { code: "invalid_input" },
    );
  }

  const seed = entry.hasSeedField ? validateSeed(req.seed) : undefined;
  if (req.seed !== undefined && !entry.hasSeedField) {
    throw new VideoGenerationError(
      "Invalid text-to-video input: seed is not documented for this model",
      { code: "invalid_input" },
    );
  }

  return {
    resolved: {
      provider: "runway",
      model: entry.modelId,
      promptText,
      duration,
      ratio,
      generateAudio,
      family: familyOf(entry),
      promptTextMaxUtf16: entry.promptTextMaxUtf16,
      ...(seed !== undefined ? { seed } : {}),
    },
  };
}

export function buildRunwayTextToVideoBody(
  resolved: RunwayTextToVideoResolved,
): Record<string, unknown> {
  if (resolved.family === "gen4.5") {
    const body: Record<string, unknown> = {
      model: "gen4.5",
      promptText: resolved.promptText,
      ratio: resolved.ratio,
      duration: resolved.duration,
    };
    if (resolved.seed !== undefined) body.seed = resolved.seed;
    return body;
  }

  if (resolved.family === "veo") {
    return {
      model: "veo3.1_fast",
      promptText: resolved.promptText,
      ratio: resolved.ratio,
      duration: resolved.duration,
      audio: resolved.generateAudio,
    };
  }

  return {
    model: "seedance2_fast",
    promptText: resolved.promptText,
    ratio: resolved.ratio,
    duration: resolved.duration,
    audio: resolved.generateAudio,
  };
}
