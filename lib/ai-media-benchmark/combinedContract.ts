import {
  ROUND_A_DURATION_SECONDS,
  ROUND_A_PORTRAIT_RATIO,
} from "@/lib/ai-media-benchmark/catalog";
import {
  isAllowedCombinedMix,
  type CombinedMixSettings,
} from "@/lib/ai-media-benchmark/combinedPlan";
import {
  AI_MEDIA_BENCHMARK_AUDIO_FILENAME,
  AI_MEDIA_BENCHMARK_COMBINED_DURATION_TOLERANCE_SECONDS,
  AI_MEDIA_BENCHMARK_COMBINED_FILENAME,
  AI_MEDIA_BENCHMARK_VIDEO_FILENAME,
} from "@/lib/ai-media-benchmark/constants";
import { buildAiMediaBenchmarkPath, STORAGE_BUCKETS } from "@/lib/api/storage";

export const BENCHMARK_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SOURCE_RUN_PATH_RE = new RegExp(
  `^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/ai-media-benchmark/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/([^/]+)$`,
  "i",
);

export class CombinedContractError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "CombinedContractError";
    this.code = code;
  }
}

export function assertBenchmarkUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new CombinedContractError(`${field}_invalid`);
  }
  const v = value.trim();
  if (!BENCHMARK_UUID_RE.test(v)) {
    throw new CombinedContractError(`${field}_invalid`);
  }
  return v;
}

export function expectedCombinedOutput(
  projectId: string,
  combinedRunId: string,
): { bucket: string; path: string } {
  return {
    bucket: STORAGE_BUCKETS.videoRenders,
    path: buildAiMediaBenchmarkPath(
      projectId,
      combinedRunId,
      AI_MEDIA_BENCHMARK_COMBINED_FILENAME,
    ),
  };
}

export function parsePortraitSize(ratio = ROUND_A_PORTRAIT_RATIO): {
  width: number;
  height: number;
} {
  const [w, h] = ratio.split(":").map(Number);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: 720, height: 1280 };
  }
  return { width: w, height: h };
}

function assertSourceRef(
  projectId: string,
  combinedRunId: string,
  ref: { bucket: string; path: string },
  expectedFilename: string,
): void {
  if (ref.bucket !== STORAGE_BUCKETS.videoRenders) {
    throw new CombinedContractError("source_bucket_mismatch");
  }
  const match = SOURCE_RUN_PATH_RE.exec(ref.path);
  if (!match) {
    throw new CombinedContractError("source_path_mismatch");
  }
  const pathProjectId = match[1]!;
  const sourceRunId = match[2]!;
  const filename = match[3]!;
  if (pathProjectId.toLowerCase() !== projectId.toLowerCase()) {
    throw new CombinedContractError("source_path_mismatch");
  }
  if (sourceRunId.toLowerCase() === combinedRunId.toLowerCase()) {
    throw new CombinedContractError("source_path_mismatch");
  }
  if (filename !== expectedFilename) {
    throw new CombinedContractError("source_path_mismatch");
  }
}

export function assertCombinedAssembleContract(input: {
  combinedRunId: string;
  projectId: string;
  video: { bucket: string; path: string };
  voice: { bucket: string; path: string };
  sound?: { bucket: string; path: string } | null;
  mix: CombinedMixSettings;
  outputBucket: string;
  outputPath: string;
}): void {
  const projectId = assertBenchmarkUuid(input.projectId, "project_id");
  const combinedRunId = assertBenchmarkUuid(input.combinedRunId, "combined_run_id");
  const expected = expectedCombinedOutput(projectId, combinedRunId);

  if (input.outputBucket !== expected.bucket) {
    throw new CombinedContractError("output_bucket_mismatch");
  }
  if (input.outputPath !== expected.path) {
    throw new CombinedContractError("output_path_mismatch");
  }
  if (input.mix.targetDurationSeconds !== ROUND_A_DURATION_SECONDS) {
    throw new CombinedContractError("target_duration_mismatch");
  }
  if (!isAllowedCombinedMix(input.mix)) {
    throw new CombinedContractError("mix_not_allowed");
  }

  assertSourceRef(
    projectId,
    combinedRunId,
    input.video,
    AI_MEDIA_BENCHMARK_VIDEO_FILENAME,
  );
  assertSourceRef(
    projectId,
    combinedRunId,
    input.voice,
    AI_MEDIA_BENCHMARK_AUDIO_FILENAME,
  );
  if (input.sound) {
    assertSourceRef(
      projectId,
      combinedRunId,
      input.sound,
      AI_MEDIA_BENCHMARK_AUDIO_FILENAME,
    );
  }
}

export type CombinedMp4RejectReason =
  | "unreadable"
  | "missing_video"
  | "missing_audio"
  | "duration_mismatch"
  | "resolution_mismatch";

export interface CombinedMp4Identity {
  ok: boolean;
  reason?: CombinedMp4RejectReason;
  durationSeconds?: number;
  width?: number;
  height?: number;
  hasVideo: boolean;
  hasAudio: boolean;
}

export function evaluateCombinedMp4Identity(args: {
  readable: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  width?: number;
  height?: number;
  durationSeconds?: number;
}): CombinedMp4Identity {
  const { width: expectedWidth, height: expectedHeight } = parsePortraitSize();
  const base = {
    durationSeconds: args.durationSeconds,
    width: args.width,
    height: args.height,
    hasVideo: args.hasVideo,
    hasAudio: args.hasAudio,
  };
  if (!args.readable) {
    return { ok: false, reason: "unreadable", hasVideo: false, hasAudio: false };
  }
  if (!args.hasVideo) {
    return { ok: false, reason: "missing_video", ...base };
  }
  if (!args.hasAudio) {
    return { ok: false, reason: "missing_audio", ...base };
  }
  if (args.width !== expectedWidth || args.height !== expectedHeight) {
    return { ok: false, reason: "resolution_mismatch", ...base };
  }
  const duration = args.durationSeconds;
  if (
    duration == null ||
    !Number.isFinite(duration) ||
    Math.abs(duration - ROUND_A_DURATION_SECONDS) >
      AI_MEDIA_BENCHMARK_COMBINED_DURATION_TOLERANCE_SECONDS
  ) {
    return { ok: false, reason: "duration_mismatch", ...base };
  }
  return {
    ok: true,
    durationSeconds: duration,
    width: args.width,
    height: args.height,
    hasVideo: true,
    hasAudio: true,
  };
}
