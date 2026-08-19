import { z } from "zod";

export const PACKAGE_VIDEO_MODE_STILL = "still" as const;
export const PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO = "text_to_video" as const;

export const packageVideoProductionModeSchema = z.enum([
  PACKAGE_VIDEO_MODE_STILL,
  PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO,
]);

export type PackageVideoProductionMode = z.infer<
  typeof packageVideoProductionModeSchema
>;

export const DEFAULT_PACKAGE_VIDEO_PRODUCTION_MODE: PackageVideoProductionMode =
  PACKAGE_VIDEO_MODE_STILL;

/** Normalizes run config / API input. Unknown values fall back to still. */
export function parsePackageVideoProductionMode(
  raw: unknown,
): PackageVideoProductionMode {
  if (raw === PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO) {
    return PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO;
  }
  if (raw === PACKAGE_VIDEO_MODE_STILL) {
    return PACKAGE_VIDEO_MODE_STILL;
  }
  return DEFAULT_PACKAGE_VIDEO_PRODUCTION_MODE;
}

export function packageVideoModeFromRunConfig(
  config: Record<string, unknown> | null | undefined,
): PackageVideoProductionMode {
  if (!config) return DEFAULT_PACKAGE_VIDEO_PRODUCTION_MODE;
  return parsePackageVideoProductionMode(
    config.package_video_mode ?? config.packageVideoMode,
  );
}

export type PackageVideoProductionModeParseResult =
  | { ok: true; mode: PackageVideoProductionMode }
  | { ok: false; reason: string };

/**
 * Parses `package_video_mode` on video_jobs.input.
 * Missing / empty ⇒ still (legacy jobs unchanged).
 */
export function parsePackageVideoProductionModeFromJobInput(
  input: Record<string, unknown>,
): PackageVideoProductionModeParseResult {
  const raw = input["package_video_mode"];
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, mode: DEFAULT_PACKAGE_VIDEO_PRODUCTION_MODE };
  }
  if (typeof raw !== "string") {
    return { ok: false, reason: "package_video_mode_invalid" };
  }
  const parsed = packageVideoProductionModeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "package_video_mode_invalid" };
  }
  return { ok: true, mode: parsed.data };
}

export function readPackageVideoModeFromBrief(
  brief: Record<string, unknown> | null | undefined,
): PackageVideoProductionMode {
  if (!brief) return DEFAULT_PACKAGE_VIDEO_PRODUCTION_MODE;
  return parsePackageVideoProductionMode(brief.package_video_mode);
}
