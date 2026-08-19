/** Vercel Pro function budget for Benchmark Lab API routes. */
export const AI_MEDIA_BENCHMARK_VERCEL_MAX_DURATION_SECONDS = 180;

/**
 * Hard deadline for provider output download + bounded body read.
 * Must finish well under the Vercel 180s cap so upload and DB write still fit.
 */
export const AI_MEDIA_BENCHMARK_DOWNLOAD_TIMEOUT_MS = 120_000;

/** Streamed download cap — abort immediately past this, never buffer unlimited. */
export const AI_MEDIA_BENCHMARK_MAX_OUTPUT_BYTES = 80 * 1024 * 1024;

export const AI_MEDIA_BENCHMARK_VIDEO_FILENAME = "output.mp4";
export const AI_MEDIA_BENCHMARK_AUDIO_FILENAME = "audio.mp3";
export const AI_MEDIA_BENCHMARK_COMBINED_FILENAME = "combined.mp4";

/** Must match AUDIO_MIX_DEFAULTS.voiceoverGain — VO stays primary. */
export const AI_MEDIA_BENCHMARK_VOICEOVER_GAIN = 1.0;
/** Must match AUDIO_MIX_DEFAULTS.sceneAudioGain — model audio under VO. */
export const AI_MEDIA_BENCHMARK_SCENE_AUDIO_GAIN = 0.22;
/** Must match AUDIO_MIX_DEFAULTS.ambientGain — shared sound bed under VO. */
export const AI_MEDIA_BENCHMARK_AMBIENT_GAIN = 0.08;

/**
 * Hard max voiceover length for a 4s combined scene. Voiceover is never sped
 * up or trimmed; anything longer is rejected. 3.90 s is allowed, 3.91 s is not.
 */
export const AI_MEDIA_BENCHMARK_MAX_VOICEOVER_SECONDS = 3.9;

/**
 * ffprobe/mux jitter when verifying a finished combined.mp4 against 4 s.
 * Not used for the voiceover cap.
 */
export const AI_MEDIA_BENCHMARK_COMBINED_DURATION_TOLERANCE_SECONDS = 0.15;

export const DEFAULT_COMBINED_CASE_ID = "combined-scene-a";
