export const PRODUCTION_RUNTIME_VERSION = "production-runtime@6g" as const;

export const PACKAGE_GENERATION_LEASE_SECONDS = (() => {
  const raw = Number(process.env.PACKAGE_GENERATION_LEASE_SECONDS);
  return Number.isFinite(raw) && raw >= 60 ? Math.trunc(raw) : 900;
})();

/** Must be significantly shorter than PACKAGE_GENERATION_LEASE_SECONDS. */
export const PACKAGE_GENERATION_HEARTBEAT_INTERVAL_MS = (() => {
  const raw = Number(process.env.PACKAGE_GENERATION_HEARTBEAT_INTERVAL_MS);
  const fallback = 150_000;
  const value = Number.isFinite(raw) && raw >= 10_000 ? Math.trunc(raw) : fallback;
  if (value >= PACKAGE_GENERATION_LEASE_SECONDS * 1000) {
    throw new Error(
      `PACKAGE_GENERATION_HEARTBEAT_INTERVAL_MS (${value}) must be < lease ${PACKAGE_GENERATION_LEASE_SECONDS}s`,
    );
  }
  return value;
})();

export const PACKAGE_GENERATION_RENEW_MAX_FAILURES = (() => {
  const raw = Number(process.env.PACKAGE_GENERATION_RENEW_MAX_FAILURES);
  return Number.isFinite(raw) && raw >= 1 ? Math.trunc(raw) : 3;
})();

export const VIDEO_JOB_LEASE_SECONDS = (() => {
  const raw = Number(process.env.VIDEO_JOB_LEASE_SECONDS);
  return Number.isFinite(raw) && raw >= 60 ? Math.trunc(raw) : 600;
})();

export const VIDEO_JOB_HEARTBEAT_INTERVAL_MS = (() => {
  const raw = Number(process.env.VIDEO_JOB_HEARTBEAT_INTERVAL_MS);
  const value =
    Number.isFinite(raw) && raw >= 10_000 ? Math.trunc(raw) : 120_000;
  if (value >= VIDEO_JOB_LEASE_SECONDS * 1000) {
    throw new Error(
      `VIDEO_JOB_HEARTBEAT_INTERVAL_MS (${value}) must be < lease ${VIDEO_JOB_LEASE_SECONDS}s`,
    );
  }
  return value;
})();

export const VIDEO_JOB_LEGACY_STALE_MINUTES = (() => {
  const raw = Number(process.env.VIDEO_JOB_STALE_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 30;
})();

export const PRODUCTION_RUN_STUCK_WITH_PACKAGES_MS = (() => {
  const raw = Number(process.env.PRODUCTION_RUN_STUCK_WITH_PACKAGES_MS);
  return Number.isFinite(raw) && raw >= 60_000
    ? Math.trunc(raw)
    : 45 * 60 * 1000;
})();

export const PRODUCTION_RUN_RECOVERY_BATCH_SIZE = (() => {
  const raw = Number(process.env.PRODUCTION_RUN_RECOVERY_BATCH_SIZE);
  return Number.isFinite(raw) && raw >= 1 ? Math.min(Math.trunc(raw), 50) : 10;
})();

export const PRODUCTION_RUN_RECOVERY_MAX_MS = (() => {
  const raw = Number(process.env.PRODUCTION_RUN_RECOVERY_MAX_MS);
  return Number.isFinite(raw) && raw >= 5_000
    ? Math.trunc(raw)
    : 55_000;
})();

export const STUCK_VIDEO_JOB_MESSAGE =
  "Video job stale: worker lease expired without completion.";

export const TERMINAL_OPEN_ITEM_BACKFILL_MESSAGE =
  "Historická oprava (phase-6g): rodičovský běh byl terminální s otevřenou položkou.";
