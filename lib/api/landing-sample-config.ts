// Public landing sample — env overrides only (no secrets). See .env.example.

/** ISR + Data Cache TTL for landing sample resolution (page and video API). */
export const LANDING_SAMPLE_REVALIDATE_SECONDS = 3600;

/** Scene-editor / voiceover-length tests — never use on the marketing landing. */
export const DEFAULT_LANDING_EXCLUDED_PACKAGE_IDS = [
  "42b6c920-eec8-4436-aa6b-584adbdadb51",
] as const;

function parseCsvIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function landingSamplePinnedVideoJobId(): string | null {
  const value = process.env.LANDING_SAMPLE_VIDEO_JOB_ID?.trim();
  return value || null;
}

export function landingSamplePinnedPackageId(): string | null {
  const value = process.env.LANDING_SAMPLE_PACKAGE_ID?.trim();
  return value || null;
}

export function landingSampleExcludedPackageIds(): Set<string> {
  const fromEnv = parseCsvIds(process.env.LANDING_SAMPLE_EXCLUDE_PACKAGE_IDS);
  const ids = fromEnv.length > 0 ? fromEnv : [...DEFAULT_LANDING_EXCLUDED_PACKAGE_IDS];
  return new Set(ids);
}
