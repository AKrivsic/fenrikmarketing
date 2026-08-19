/** ElevenLabs audio asset flags (Step 5). Defaults off — API key alone does not enable. */
export const ELEVENLABS_SOUND_EFFECTS_FLAG = "ELEVENLABS_SOUND_EFFECTS_ENABLED";
export const ELEVENLABS_MUSIC_FLAG = "ELEVENLABS_MUSIC_ENABLED";
export const ELEVENLABS_MUSIC_LICENSE_FLAG =
  "ELEVENLABS_MUSIC_COMMERCIAL_LICENSE_CONFIRMED";

export function isElevenLabsSoundEffectsEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[ELEVENLABS_SOUND_EFFECTS_FLAG]?.trim().toLowerCase() === "true";
}

export function isElevenLabsMusicEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[ELEVENLABS_MUSIC_FLAG]?.trim().toLowerCase() === "true";
}

export function isElevenLabsMusicCommercialLicenseConfirmed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[ELEVENLABS_MUSIC_LICENSE_FLAG]?.trim().toLowerCase() === "true";
}

export function elevenLabsMusicAllowedForProduction(args: {
  confirmPaidRun: boolean;
}): boolean {
  return (
    isElevenLabsMusicEnabled() &&
    isElevenLabsMusicCommercialLicenseConfirmed() &&
    args.confirmPaidRun
  );
}

/** Default estimate: $0.12/min (official SFX list rate). */
export function estimateElevenLabsSfxCostUsd(durationSeconds: number): number {
  const minutes = Math.max(0, durationSeconds) / 60;
  return Math.round(minutes * 0.12 * 10000) / 10000;
}

/** Default estimate: $0.15/min for Eleven Music. */
export function estimateElevenLabsMusicCostUsd(durationSeconds: number): number {
  const minutes = Math.max(0, durationSeconds) / 60;
  return Math.round(minutes * 0.15 * 10000) / 10000;
}
