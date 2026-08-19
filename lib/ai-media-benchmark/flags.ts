export const AI_MEDIA_BENCHMARK_VIDEO_FLAG = "AI_MEDIA_BENCHMARK_VIDEO_ENABLED";
export const AI_MEDIA_BENCHMARK_VOICE_FLAG = "AI_MEDIA_BENCHMARK_VOICE_ENABLED";
export const AI_MEDIA_BENCHMARK_SOUND_FLAG = "AI_MEDIA_BENCHMARK_SOUND_ENABLED";
export const AI_MEDIA_BENCHMARK_TEXT_VIDEO_FLAG =
  "AI_MEDIA_BENCHMARK_TEXT_VIDEO_ENABLED";

function envTrue(env: NodeJS.ProcessEnv, name: string): boolean {
  return env[name]?.trim().toLowerCase() === "true";
}

export function isBenchmarkVideoEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envTrue(env, AI_MEDIA_BENCHMARK_VIDEO_FLAG);
}

export function isBenchmarkVoiceEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envTrue(env, AI_MEDIA_BENCHMARK_VOICE_FLAG);
}

export function isBenchmarkSoundEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envTrue(env, AI_MEDIA_BENCHMARK_SOUND_FLAG);
}

export function isBenchmarkTextVideoEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envTrue(env, AI_MEDIA_BENCHMARK_TEXT_VIDEO_FLAG);
}

export function hasRunwayApiSecret(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.RUNWAYML_API_SECRET?.trim());
}

export function hasOpenAiApiKey(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.OPENAI_API_KEY?.trim());
}
