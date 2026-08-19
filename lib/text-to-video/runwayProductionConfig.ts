/** Production text-to-video Runway Gen-4.5 — single model, no router. */
export const TEXT_TO_VIDEO_RUNWAY_MODEL = "gen4.5" as const;
export const TEXT_TO_VIDEO_RUNWAY_RATIO = "720:1280" as const;
export const TEXT_TO_VIDEO_RUNWAY_DURATION_MIN = 2 as const;
export const TEXT_TO_VIDEO_RUNWAY_DURATION_MAX = 10 as const;
export const TEXT_TO_VIDEO_RUNWAY_CREDITS_PER_SECOND = 12 as const;
export const TEXT_TO_VIDEO_PROVIDER_PROMPT_CONTRACT_VERSION = 1 as const;
export const TEXT_TO_VIDEO_RUNWAY_API_VERSION = "2024-11-06" as const;

/** Runway / trimmed scene clip validation (provider-native). */
export const TEXT_TO_VIDEO_SOURCE_CLIP_PROFILE = {
  width: 720,
  height: 1280,
} as const;

/** Final delivery canvas for T2V (Reels / TikTok / Shorts). */
export const TEXT_TO_VIDEO_DELIVERY_PROFILE = {
  width: 1080,
  height: 1920,
  fps: 30,
  transitionSeconds: 0.4,
} as const;

/** @deprecated Use TEXT_TO_VIDEO_DELIVERY_PROFILE for assembly export. */
export const TEXT_TO_VIDEO_RENDER_PROFILE = TEXT_TO_VIDEO_DELIVERY_PROFILE;

export const TEXT_TO_VIDEO_RUNWAY_FLAG = "TEXT_TO_VIDEO_RUNWAY_ENABLED";

export function isTextToVideoRunwayEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[TEXT_TO_VIDEO_RUNWAY_FLAG]?.trim().toLowerCase() === "true";
}

export function readRunwayUsdPerCredit(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.RUNWAY_USD_PER_CREDIT?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0.01;
}

export function estimateRunwayGen45SceneCostUsd(durationSeconds: number): {
  credits: number;
  usd: number;
  estimate: true;
} {
  const d = Math.max(0, Math.round(durationSeconds));
  const credits = TEXT_TO_VIDEO_RUNWAY_CREDITS_PER_SECOND * d;
  return {
    credits,
    usd: credits * readRunwayUsdPerCredit(),
    estimate: true,
  };
}
