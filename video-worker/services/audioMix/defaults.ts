/**
 * Central default levels for the standalone multi-layer audio mixer.
 * Change gains here — do not hard-code volumes inside FFmpeg filter builders.
 */
export const AUDIO_MIX_DEFAULTS = {
  sampleRate: 44100,
  /** Stereo layout for the mixed stem. */
  channels: 2 as const,

  /** Voiceover — primary / intelligible layer. */
  voiceoverGain: 1.0,

  /** Original AI / clip scene audio under VO. */
  sceneAudioGain: 0.22,

  /** Musical underscore. */
  musicGain: 0.12,

  /** Very quiet room tone / ambient bed. */
  ambientGain: 0.08,

  /** Short accents; still below VO. */
  sfxGain: 0.22,

  musicFadeInSeconds: 0.5,
  musicFadeOutSeconds: 1.5,
  ambientFadeInSeconds: 0.3,
  ambientFadeOutSeconds: 1.0,

  /** sidechaincompress against the voiceover key. */
  duckThreshold: 0.05,
  duckRatio: 6,
  duckAttackMs: 20,
  duckReleaseMs: 280,
  duckMakeup: 1,

  /** Final peak protection (linear amplitude). */
  limiterLimit: 0.95,
  limiterAttackMs: 5,
  limiterReleaseMs: 50,
} as const;

export type AudioMixDefaults = typeof AUDIO_MIX_DEFAULTS;
export type AudioMixLevels = Partial<AudioMixDefaults>;
