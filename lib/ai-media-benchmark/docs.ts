/** Official sources verified for Step 12. Do not invent rates from model names. */

export const AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT = "2026-08-18";

export const AI_MEDIA_BENCHMARK_TEXT_VIDEO_DOCS_VERIFIED_AT = "2026-08-19";

export const RUNWAY_DOCS = {
  index: "https://docs.dev.runwayml.com/index.md",
  models: "https://docs.dev.runwayml.com/guides/models.md",
  pricing: "https://docs.dev.runwayml.com/guides/pricing.md",
  api: "https://docs.dev.runwayml.com/api.md",
  imageToVideo:
    "https://docs.dev.runwayml.com/api#tag/Start-generating/paths/~1v1~1image_to_video/post",
  textToVideo:
    "https://docs.dev.runwayml.com/api#tag/Start-generating/paths/~1v1~1text_to_video/post",
} as const;

export const OPENAI_DOCS = {
  gpt4oMiniTts: "https://developers.openai.com/api/docs/models/gpt-4o-mini-tts.md",
  pricing: "https://developers.openai.com/api/docs/pricing",
  speechEndpoint: "https://api.openai.com/v1/audio/speech",
} as const;

export const ELEVENLABS_DOCS = {
  soundGeneration:
    "https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert",
} as const;

export const RUNWAY_USD_PER_CREDIT = 0.01;
