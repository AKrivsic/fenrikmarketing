import {
  AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
  AI_MEDIA_BENCHMARK_TEXT_VIDEO_DOCS_VERIFIED_AT,
  ELEVENLABS_DOCS,
  OPENAI_DOCS,
  RUNWAY_DOCS,
  RUNWAY_USD_PER_CREDIT,
} from "@/lib/ai-media-benchmark/docs";
import {
  DEFAULT_VOICE_SCRIPT,
  type AiMediaCatalogStatus,
  type DurationSpec,
  type SoundCostQuote,
  type VideoCostQuote,
  type VoiceCostQuote,
} from "@/lib/ai-media-benchmark/types";

export const ROUND_A_DURATION_SECONDS = 4;
export const ROUND_A_PORTRAIT_RATIO = "720:1280";
export const RUNWAY_TTS_MODEL = "eleven_multilingual_v2";
export const RUNWAY_TTS_PRESET_MAYA = "Maya";
export const RUNWAY_TTS_PROMPT_MAX_UTF16 = 1000;

export type VideoModelRole =
  | "cheap_baseline"
  | "quality"
  | "generated_audio"
  | "other";

export type I2vAudioRequestStatus =
  | "documented"
  | "not_applicable"
  | "undocumented";

export interface VideoModelCatalogEntry {
  provider: "runway";
  modelId: string;
  displayName: string;
  role: VideoModelRole | "reviewed_not_selected";
  supportedModes: readonly ("image_to_video" | "text_to_video")[];
  portraitRatios: readonly string[];
  duration: DurationSpec;
  defaultDurationSeconds: number;
  defaultPortraitRatio: "720:1280";
  returnsAudio: boolean;
  audioField: boolean;
  audioDefault: boolean | null;
  i2vAudioRequest: I2vAudioRequestStatus;
  i2vAudioNote: string | null;
  promptTextMaxUtf16: number;
  promptTextRequired: boolean;
  creditsPerSecond: number | null;
  creditsPerSecondWithAudio: number | null;
  creditsPerSecondWithoutAudio: number | null;
  extraCredits: number;
  minimumCredits: number;
  usdPerCredit: number;
  endpoint: "/v1/image_to_video";
  adapter: "runway_image_to_video";
  status: AiMediaCatalogStatus;
  unsupportedReason: string | null;
  docsVerifiedAt: string;
  sourceUrls: readonly string[];
}

export interface VoiceCandidate {
  candidateId: string;
  provider: "openai" | "runway";
  modelId: string;
  displayName: string;
  voiceId: string;
  endpoint: string;
  adapter: "openai_speech" | "runway_text_to_speech";
  ttsHost: "openai_native" | "runway_hosted_elevenlabs" | "elevenlabs_native_missing";
  ttsHostNote: string;
  promptTextMaxUtf16: number;
  status: AiMediaCatalogStatus;
  unsupportedReason: string | null;
  docsVerifiedAt: string;
  sourceUrls: readonly string[];
}

export interface SoundCandidate {
  candidateId: string;
  provider: "runway";
  modelId: string;
  displayName: string;
  audioRole: "ambient_sfx";
  endpoint: "/v1/sound_effect";
  adapter: "runway_sound_effect";
  duration: DurationSpec;
  defaultDurationSeconds: number;
  status: AiMediaCatalogStatus;
  unsupportedReason: string | null;
  docsVerifiedAt: string;
  sourceUrls: readonly string[];
}

export interface TextToVideoCatalogEntry {
  provider: "runway";
  modelId: string;
  displayName: string;
  supportedModes: readonly ["text_to_video"];
  portraitRatios: readonly string[];
  duration: DurationSpec;
  defaultDurationSeconds: number;
  defaultPortraitRatio: "720:1280";
  returnsAudio: boolean;
  audioField: boolean;
  audioDefault: boolean | null;
  hasSeedField: boolean;
  /** Documented optional image references. Round T does not send them. */
  documentedImageReferences: boolean;
  promptTextMaxUtf16: number;
  promptTextRequired: true;
  creditsPerSecond: number | null;
  creditsPerSecondWithAudio: number | null;
  creditsPerSecondWithoutAudio: number | null;
  extraCredits: number;
  minimumCredits: number;
  usdPerCredit: number;
  endpoint: "/v1/text_to_video";
  adapter: "runway_text_to_video";
  status: AiMediaCatalogStatus;
  unsupportedReason: string | null;
  docsVerifiedAt: string;
  sourceUrls: readonly string[];
}

const COMMON_SOURCES = [
  RUNWAY_DOCS.index,
  RUNWAY_DOCS.models,
  RUNWAY_DOCS.pricing,
  RUNWAY_DOCS.api,
] as const;

const GEN4_RATIOS = [
  "1280:720",
  "720:1280",
  "1104:832",
  "960:960",
  "832:1104",
  "1584:672",
] as const;

const VEO_RATIOS = ["1280:720", "720:1280", "1080:1920", "1920:1080"] as const;

const SEEDANCE2_FAST_RATIOS = [
  "992:432",
  "864:496",
  "752:560",
  "640:640",
  "560:752",
  "496:864",
  "1470:630",
  "1280:720",
  "1112:834",
  "960:960",
  "834:1112",
  "720:1280",
] as const;

export const VIDEO_MODEL_CATALOG: readonly VideoModelCatalogEntry[] = [
  {
    provider: "runway",
    modelId: "gen4_turbo",
    displayName: "Runway Gen-4 Turbo",
    role: "cheap_baseline",
    supportedModes: ["image_to_video"],
    portraitRatios: ["720:1280"],
    duration: { kind: "range", min: 2, max: 10 },
    defaultDurationSeconds: ROUND_A_DURATION_SECONDS,
    defaultPortraitRatio: "720:1280",
    returnsAudio: false,
    audioField: false,
    audioDefault: null,
    i2vAudioRequest: "not_applicable",
    i2vAudioNote: "Gen-4 Turbo I2V has no audio field in Runway OpenAPI.",
    promptTextMaxUtf16: 1000,
    promptTextRequired: false,
    creditsPerSecond: 5,
    creditsPerSecondWithAudio: null,
    creditsPerSecondWithoutAudio: null,
    extraCredits: 0,
    minimumCredits: 0,
    usdPerCredit: RUNWAY_USD_PER_CREDIT,
    endpoint: "/v1/image_to_video",
    adapter: "runway_image_to_video",
    status: "testable",
    unsupportedReason: null,
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sourceUrls: COMMON_SOURCES,
  },
  {
    provider: "runway",
    modelId: "gen4.5",
    displayName: "Runway Gen-4.5",
    role: "quality",
    supportedModes: ["image_to_video", "text_to_video"],
    portraitRatios: ["720:1280"],
    duration: { kind: "range", min: 2, max: 10 },
    defaultDurationSeconds: ROUND_A_DURATION_SECONDS,
    defaultPortraitRatio: "720:1280",
    returnsAudio: false,
    audioField: false,
    audioDefault: null,
    i2vAudioRequest: "not_applicable",
    i2vAudioNote: "Gen-4.5 I2V has no audio field in Runway OpenAPI.",
    promptTextMaxUtf16: 1000,
    promptTextRequired: true,
    creditsPerSecond: 12,
    creditsPerSecondWithAudio: null,
    creditsPerSecondWithoutAudio: null,
    extraCredits: 0,
    minimumCredits: 0,
    usdPerCredit: RUNWAY_USD_PER_CREDIT,
    endpoint: "/v1/image_to_video",
    adapter: "runway_image_to_video",
    status: "testable",
    unsupportedReason: null,
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sourceUrls: COMMON_SOURCES,
  },
  {
    provider: "runway",
    modelId: "veo3.1_fast",
    displayName: "Veo 3.1 Fast (with audio)",
    role: "generated_audio",
    supportedModes: ["image_to_video", "text_to_video"],
    portraitRatios: ["720:1280", "1080:1920"],
    duration: { kind: "enum", values: [4, 6, 8] },
    defaultDurationSeconds: ROUND_A_DURATION_SECONDS,
    defaultPortraitRatio: "720:1280",
    returnsAudio: true,
    audioField: true,
    audioDefault: true,
    i2vAudioRequest: "documented",
    i2vAudioNote:
      "I2V `audio` boolean, default true. Round A requests generated audio.",
    promptTextMaxUtf16: 1000,
    promptTextRequired: false,
    creditsPerSecond: null,
    creditsPerSecondWithAudio: 15,
    creditsPerSecondWithoutAudio: 10,
    extraCredits: 0,
    minimumCredits: 0,
    usdPerCredit: RUNWAY_USD_PER_CREDIT,
    endpoint: "/v1/image_to_video",
    adapter: "runway_image_to_video",
    status: "testable",
    unsupportedReason: null,
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sourceUrls: COMMON_SOURCES,
  },
  {
    provider: "runway",
    modelId: "seedance2_fast",
    displayName: "Seedance 2.0 Fast (with audio)",
    role: "other",
    supportedModes: ["image_to_video", "text_to_video"],
    portraitRatios: ["720:1280"],
    duration: { kind: "range", min: 4, max: 15 },
    defaultDurationSeconds: ROUND_A_DURATION_SECONDS,
    defaultPortraitRatio: "720:1280",
    returnsAudio: true,
    audioField: true,
    audioDefault: true,
    i2vAudioRequest: "documented",
    i2vAudioNote:
      "I2V `audio` boolean, default true. Round A requests generated audio.",
    promptTextMaxUtf16: 3500,
    promptTextRequired: false,
    creditsPerSecond: 29,
    creditsPerSecondWithAudio: null,
    creditsPerSecondWithoutAudio: null,
    extraCredits: 0,
    minimumCredits: 0,
    usdPerCredit: RUNWAY_USD_PER_CREDIT,
    endpoint: "/v1/image_to_video",
    adapter: "runway_image_to_video",
    status: "testable",
    unsupportedReason: null,
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sourceUrls: COMMON_SOURCES,
  },
  {
    provider: "runway",
    modelId: "veo3.1",
    displayName: "Veo 3.1",
    role: "reviewed_not_selected",
    supportedModes: ["image_to_video", "text_to_video"],
    portraitRatios: ["720:1280", "1080:1920"],
    duration: { kind: "enum", values: [4, 6, 8] },
    defaultDurationSeconds: ROUND_A_DURATION_SECONDS,
    defaultPortraitRatio: "720:1280",
    returnsAudio: true,
    audioField: true,
    audioDefault: true,
    i2vAudioRequest: "documented",
    i2vAudioNote: "I2V `audio` boolean is documented; not selected for Round A.",
    promptTextMaxUtf16: 1000,
    promptTextRequired: false,
    creditsPerSecond: null,
    creditsPerSecondWithAudio: 40,
    creditsPerSecondWithoutAudio: 20,
    extraCredits: 0,
    minimumCredits: 0,
    usdPerCredit: RUNWAY_USD_PER_CREDIT,
    endpoint: "/v1/image_to_video",
    adapter: "runway_image_to_video",
    status: "unsupported",
    unsupportedReason:
      "Same portrait image-to-video + audio capability as veo3.1_fast at 40 credits/s with audio versus 15. Not selected as a fourth candidate.",
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sourceUrls: COMMON_SOURCES,
  },
  {
    provider: "runway",
    modelId: "seedance2_5",
    displayName: "Seedance 2.5",
    role: "reviewed_not_selected",
    supportedModes: ["image_to_video", "text_to_video"],
    portraitRatios: ["720:1280", "1080:1920"],
    duration: { kind: "range", min: 4, max: 30 },
    defaultDurationSeconds: ROUND_A_DURATION_SECONDS,
    defaultPortraitRatio: "720:1280",
    returnsAudio: true,
    audioField: true,
    audioDefault: true,
    i2vAudioRequest: "documented",
    i2vAudioNote: "I2V `audio` boolean is documented; not selected for Round A.",
    promptTextMaxUtf16: 15000,
    promptTextRequired: false,
    creditsPerSecond: 30,
    creditsPerSecondWithAudio: null,
    creditsPerSecondWithoutAudio: null,
    extraCredits: 0,
    minimumCredits: 80,
    usdPerCredit: RUNWAY_USD_PER_CREDIT,
    endpoint: "/v1/image_to_video",
    adapter: "runway_image_to_video",
    status: "unsupported",
    unsupportedReason:
      "Portrait image-to-video with audio is documented, but 720p is 30 credits/s with an 80-credit minimum. Seedance 2.0 Fast already covers the Seedance family for this lab.",
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sourceUrls: COMMON_SOURCES,
  },
  {
    provider: "runway",
    modelId: "gemini_omni_flash",
    displayName: "Gemini Omni Flash",
    role: "reviewed_not_selected",
    supportedModes: ["image_to_video", "text_to_video"],
    portraitRatios: ["720:1280"],
    duration: { kind: "range", min: 3, max: 10 },
    defaultDurationSeconds: ROUND_A_DURATION_SECONDS,
    defaultPortraitRatio: "720:1280",
    returnsAudio: false,
    audioField: false,
    audioDefault: null,
    i2vAudioRequest: "undocumented",
    i2vAudioNote:
      "Runway OpenAPI for POST /v1/image_to_video, /v1/text_to_video, and /v1/video_to_video model gemini_omni_flash (verified 2026-08-18) does not include an `audio` field. Generated-audio I2V cannot be safely requested or priced as a distinct option. This is not a claim that the model cannot emit audio.",
    promptTextMaxUtf16: 4000,
    promptTextRequired: false,
    creditsPerSecond: 10,
    creditsPerSecondWithAudio: null,
    creditsPerSecondWithoutAudio: null,
    extraCredits: 1,
    minimumCredits: 0,
    usdPerCredit: RUNWAY_USD_PER_CREDIT,
    endpoint: "/v1/image_to_video",
    adapter: "runway_image_to_video",
    status: "unsupported",
    unsupportedReason:
      "Generated-audio image-to-video cannot be safely requested: POST /v1/image_to_video for gemini_omni_flash has no `audio` field in Runway OpenAPI (2026-08-18). T2V and V2V schemas also omit `audio`. Pricing does not split audio vs silent. Silent/unspecified-audio I2V is documented (720:1280, 3–10s, 10 credits/s + 1 first-frame credit) but is not a fifth Round A candidate.",
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sourceUrls: COMMON_SOURCES,
  },
] as const;

export const VOICE_CANDIDATES: readonly VoiceCandidate[] = [
  {
    candidateId: "openai-gpt-4o-mini-tts-alloy",
    provider: "openai",
    modelId: "gpt-4o-mini-tts",
    displayName: "OpenAI Alloy (gpt-4o-mini-tts)",
    voiceId: "alloy",
    endpoint: OPENAI_DOCS.speechEndpoint,
    adapter: "openai_speech",
    ttsHost: "openai_native",
    ttsHostNote: "Native OpenAI Speech API (`POST /v1/audio/speech`).",
    promptTextMaxUtf16: 4096,
    status: "testable",
    unsupportedReason: null,
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sourceUrls: [OPENAI_DOCS.gpt4oMiniTts, OPENAI_DOCS.pricing],
  },
  {
    candidateId: "runway-eleven-multilingual-v2-maya",
    provider: "runway",
    modelId: RUNWAY_TTS_MODEL,
    displayName:
      "ElevenLabs Multilingual v2 · Maya (Runway-hosted, not native ElevenLabs API)",
    voiceId: RUNWAY_TTS_PRESET_MAYA,
    endpoint: "/v1/text_to_speech",
    adapter: "runway_text_to_speech",
    ttsHost: "runway_hosted_elevenlabs",
    ttsHostNote:
      "ElevenLabs model served by Runway `POST /v1/text_to_speech`. This is not the native ElevenLabs API.",
    promptTextMaxUtf16: RUNWAY_TTS_PROMPT_MAX_UTF16,
    status: "testable",
    unsupportedReason: null,
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sourceUrls: [RUNWAY_DOCS.models, RUNWAY_DOCS.pricing, RUNWAY_DOCS.api],
  },
  {
    candidateId: "elevenlabs-native",
    provider: "runway",
    modelId: "elevenlabs_native",
    displayName: "Native ElevenLabs TTS",
    voiceId: "",
    endpoint: "https://api.elevenlabs.io/v1/text-to-speech",
    adapter: "openai_speech",
    ttsHost: "elevenlabs_native_missing",
    ttsHostNote: "Fenrik has no native ElevenLabs client or API key.",
    promptTextMaxUtf16: 0,
    status: "unsupported",
    unsupportedReason:
      "Fenrik has no ElevenLabs client or API key. Production TTS is OpenAI only. The ElevenLabs comparison uses Runway-hosted eleven_multilingual_v2 (preset Maya), not a native ElevenLabs API call.",
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sourceUrls: [ELEVENLABS_DOCS.soundGeneration],
  },
] as const;

export const SOUND_CANDIDATES: readonly SoundCandidate[] = [
  {
    candidateId: "runway-eleven-sfx-v2",
    provider: "runway",
    modelId: "eleven_text_to_sound_v2",
    displayName: "ElevenLabs SFX v2 (via Runway)",
    audioRole: "ambient_sfx",
    endpoint: "/v1/sound_effect",
    adapter: "runway_sound_effect",
    duration: { kind: "range", min: 0.5, max: 30 },
    defaultDurationSeconds: 4,
    status: "testable",
    unsupportedReason: null,
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sourceUrls: [RUNWAY_DOCS.pricing, RUNWAY_DOCS.api, ELEVENLABS_DOCS.soundGeneration],
  },
  {
    candidateId: "runway-seed-audio-sfx",
    provider: "runway",
    modelId: "seed_audio",
    displayName: "Seed Audio SFX (via Runway)",
    audioRole: "ambient_sfx",
    endpoint: "/v1/sound_effect",
    adapter: "runway_sound_effect",
    duration: { kind: "range", min: 1, max: 30 },
    defaultDurationSeconds: 4,
    status: "unsupported",
    unsupportedReason:
      "POST /v1/sound_effect for seed_audio has no duration field. Pricing is 0.25 credits/s with a 5-credit minimum, so a finite pre-run test price cannot be quoted. Not marked testable.",
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sourceUrls: [RUNWAY_DOCS.pricing, RUNWAY_DOCS.api],
  },
] as const;

const T2V_SOURCES = [
  RUNWAY_DOCS.index,
  RUNWAY_DOCS.models,
  RUNWAY_DOCS.pricing,
  RUNWAY_DOCS.api,
  RUNWAY_DOCS.textToVideo,
] as const;

/**
 * Round T catalog — text-to-video only. Max three models.
 * gen4_turbo is I2V-only in Runway models.md and is not listed.
 */
export const TEXT_TO_VIDEO_CATALOG: readonly TextToVideoCatalogEntry[] = [
  {
    provider: "runway",
    modelId: "gen4.5",
    displayName: "Runway Gen-4.5 (text-to-video)",
    supportedModes: ["text_to_video"],
    portraitRatios: ["720:1280", "1280:720"],
    duration: { kind: "range", min: 2, max: 10 },
    defaultDurationSeconds: ROUND_A_DURATION_SECONDS,
    defaultPortraitRatio: "720:1280",
    returnsAudio: false,
    audioField: false,
    audioDefault: null,
    hasSeedField: true,
    documentedImageReferences: false,
    promptTextMaxUtf16: 1000,
    promptTextRequired: true,
    creditsPerSecond: 12,
    creditsPerSecondWithAudio: null,
    creditsPerSecondWithoutAudio: null,
    extraCredits: 0,
    minimumCredits: 0,
    usdPerCredit: RUNWAY_USD_PER_CREDIT,
    endpoint: "/v1/text_to_video",
    adapter: "runway_text_to_video",
    status: "testable",
    unsupportedReason: null,
    docsVerifiedAt: AI_MEDIA_BENCHMARK_TEXT_VIDEO_DOCS_VERIFIED_AT,
    sourceUrls: T2V_SOURCES,
  },
  {
    provider: "runway",
    modelId: "veo3.1_fast",
    displayName: "Veo 3.1 Fast (text-to-video, with audio)",
    supportedModes: ["text_to_video"],
    portraitRatios: ["720:1280", "1280:720", "1080:1920", "1920:1080"],
    duration: { kind: "enum", values: [4, 6, 8] },
    defaultDurationSeconds: ROUND_A_DURATION_SECONDS,
    defaultPortraitRatio: "720:1280",
    returnsAudio: true,
    audioField: true,
    audioDefault: true,
    hasSeedField: false,
    documentedImageReferences: false,
    promptTextMaxUtf16: 1000,
    promptTextRequired: true,
    creditsPerSecond: null,
    creditsPerSecondWithAudio: 15,
    creditsPerSecondWithoutAudio: 10,
    extraCredits: 0,
    minimumCredits: 0,
    usdPerCredit: RUNWAY_USD_PER_CREDIT,
    endpoint: "/v1/text_to_video",
    adapter: "runway_text_to_video",
    status: "testable",
    unsupportedReason: null,
    docsVerifiedAt: AI_MEDIA_BENCHMARK_TEXT_VIDEO_DOCS_VERIFIED_AT,
    sourceUrls: T2V_SOURCES,
  },
  {
    provider: "runway",
    modelId: "seedance2_fast",
    displayName: "Seedance 2.0 Fast (text-to-video, with audio)",
    supportedModes: ["text_to_video"],
    portraitRatios: [
      "992:432",
      "864:496",
      "752:560",
      "640:640",
      "560:752",
      "496:864",
      "1470:630",
      "1280:720",
      "1112:834",
      "960:960",
      "834:1112",
      "720:1280",
    ],
    duration: { kind: "range", min: 4, max: 15 },
    defaultDurationSeconds: ROUND_A_DURATION_SECONDS,
    defaultPortraitRatio: "720:1280",
    returnsAudio: true,
    audioField: true,
    audioDefault: true,
    hasSeedField: false,
    documentedImageReferences: true,
    promptTextMaxUtf16: 3500,
    promptTextRequired: true,
    creditsPerSecond: 29,
    creditsPerSecondWithAudio: null,
    creditsPerSecondWithoutAudio: null,
    extraCredits: 0,
    minimumCredits: 0,
    usdPerCredit: RUNWAY_USD_PER_CREDIT,
    endpoint: "/v1/text_to_video",
    adapter: "runway_text_to_video",
    status: "testable",
    unsupportedReason: null,
    docsVerifiedAt: AI_MEDIA_BENCHMARK_TEXT_VIDEO_DOCS_VERIFIED_AT,
    sourceUrls: T2V_SOURCES,
  },
];

export const GEN4_IMAGE_TO_VIDEO_RATIOS = GEN4_RATIOS;
export const VEO_IMAGE_TO_VIDEO_RATIOS = VEO_RATIOS;
export const SEEDANCE2_FAST_IMAGE_TO_VIDEO_RATIOS = SEEDANCE2_FAST_RATIOS;
export const GEMINI_OMNI_FLASH_IMAGE_TO_VIDEO_RATIOS = [
  "1280:720",
  "720:1280",
] as const;

export function getVideoModel(modelId: string): VideoModelCatalogEntry | null {
  return VIDEO_MODEL_CATALOG.find((entry) => entry.modelId === modelId) ?? null;
}

export function getTestableVideoModels(): VideoModelCatalogEntry[] {
  return VIDEO_MODEL_CATALOG.filter((entry) => entry.status === "testable");
}

export function getVoiceCandidate(candidateId: string): VoiceCandidate | null {
  return VOICE_CANDIDATES.find((entry) => entry.candidateId === candidateId) ?? null;
}

export function getTestableVoiceCandidates(): VoiceCandidate[] {
  return VOICE_CANDIDATES.filter((entry) => entry.status === "testable");
}

export function getSoundCandidate(candidateId: string): SoundCandidate | null {
  return SOUND_CANDIDATES.find((entry) => entry.candidateId === candidateId) ?? null;
}

export function getTestableSoundCandidates(): SoundCandidate[] {
  return SOUND_CANDIDATES.filter((entry) => entry.status === "testable");
}

export function getTextToVideoModel(modelId: string): TextToVideoCatalogEntry | null {
  return TEXT_TO_VIDEO_CATALOG.find((entry) => entry.modelId === modelId) ?? null;
}

export function getTestableTextToVideoModels(): TextToVideoCatalogEntry[] {
  return TEXT_TO_VIDEO_CATALOG.filter((entry) => entry.status === "testable");
}

export function isDurationAllowed(
  spec: DurationSpec,
  durationSeconds: number,
  options?: { integer?: boolean },
): boolean {
  if (!Number.isFinite(durationSeconds)) return false;
  if (options?.integer !== false && !Number.isInteger(durationSeconds)) {
    if (spec.kind === "enum") return spec.values.includes(durationSeconds);
    if (Number.isInteger(spec.min) && Number.isInteger(spec.max)) return false;
  }
  if (spec.kind === "enum") {
    return spec.values.includes(durationSeconds);
  }
  return durationSeconds >= spec.min && durationSeconds <= spec.max;
}

function roundUsd(usd: number): number {
  return Math.round(usd * 1_000_000) / 1_000_000;
}

export function quoteVideoCost(args: {
  modelId: string;
  durationSeconds: number;
  generateAudio?: boolean;
  portraitRatio?: string;
}): VideoCostQuote {
  const entry = getVideoModel(args.modelId);
  if (!entry) {
    throw new Error("unknown_video_model");
  }
  if (entry.status !== "testable") {
    throw new Error("video_model_unsupported");
  }
  if (entry.creditsPerSecond == null && entry.creditsPerSecondWithAudio == null) {
    throw new Error("video_model_price_unknown");
  }
  if (!isDurationAllowed(entry.duration, args.durationSeconds)) {
    throw new Error("duration_not_supported");
  }
  const ratio = args.portraitRatio ?? entry.defaultPortraitRatio;
  if (!entry.portraitRatios.includes(ratio)) {
    throw new Error("ratio_not_supported");
  }

  const generateAudio =
    args.generateAudio ?? (entry.audioDefault === true || entry.returnsAudio);
  if (generateAudio && !entry.returnsAudio && !entry.audioField) {
    throw new Error("audio_not_supported");
  }

  let perSecond: number;
  if (entry.audioField && generateAudio) {
    perSecond = entry.creditsPerSecondWithAudio ?? entry.creditsPerSecond ?? NaN;
  } else if (entry.audioField && !generateAudio) {
    perSecond =
      entry.creditsPerSecondWithoutAudio ?? entry.creditsPerSecond ?? NaN;
  } else {
    perSecond = entry.creditsPerSecond ?? NaN;
  }
  if (!Number.isFinite(perSecond) || perSecond <= 0) {
    throw new Error("video_model_price_unknown");
  }

  const raw = perSecond * args.durationSeconds + entry.extraCredits;
  const credits = Math.max(raw, entry.minimumCredits);
  const usd = roundUsd(credits * entry.usdPerCredit);
  return {
    modelId: entry.modelId,
    durationSeconds: args.durationSeconds,
    generateAudio,
    credits,
    usd,
    usdPerCredit: entry.usdPerCredit,
    formula: `${perSecond} credits/s × ${args.durationSeconds}s${
      entry.extraCredits ? ` + ${entry.extraCredits}` : ""
    }${entry.minimumCredits ? `, min ${entry.minimumCredits}` : ""} × $${entry.usdPerCredit}/credit`,
    maxCostUsd: usd,
  };
}

export function quoteVoiceCost(args: {
  candidateId: string;
  text: string;
}): VoiceCostQuote {
  const candidate = getVoiceCandidate(args.candidateId);
  if (!candidate) throw new Error("unknown_voice_candidate");
  if (candidate.status !== "testable") throw new Error("voice_candidate_unsupported");
  const characterCount = [...args.text].length;
  if (candidate.modelId === RUNWAY_TTS_MODEL) {
    const credits = Math.max(1, Math.ceil(characterCount / 50));
    const usd = roundUsd(credits * RUNWAY_USD_PER_CREDIT);
    return {
      candidateId: candidate.candidateId,
      characterCount,
      credits,
      usd,
      formula: `ceil(${characterCount} chars / 50) credits × $${RUNWAY_USD_PER_CREDIT}/credit (Runway-hosted ${RUNWAY_TTS_MODEL})`,
      completeness: "exact_credits",
    };
  }
  if (candidate.modelId === "gpt-4o-mini-tts") {
    return {
      candidateId: candidate.candidateId,
      characterCount,
      credits: null,
      usd: null,
      formula:
        "Verified OpenAI rates: text input $0.60 / 1M tokens + audio output $12 / 1M tokens. Output token count is unknown before the call, so USD is not invented.",
      completeness: "rates_output_unknown",
    };
  }
  throw new Error("voice_candidate_price_unknown");
}

export function quoteSoundCost(args: {
  candidateId: string;
  durationSeconds: number;
}): SoundCostQuote {
  const candidate = getSoundCandidate(args.candidateId);
  if (!candidate) throw new Error("unknown_sound_candidate");
  if (candidate.status !== "testable") throw new Error("sound_candidate_unsupported");
  if (!isDurationAllowed(candidate.duration, args.durationSeconds)) {
    throw new Error("duration_not_supported");
  }
  let credits: number;
  let formula: string;
  if (candidate.modelId === "eleven_text_to_sound_v2") {
    credits = args.durationSeconds;
    formula = `${args.durationSeconds} credits (1 credit/s when duration is provided) × $${RUNWAY_USD_PER_CREDIT}/credit`;
  } else if (candidate.modelId === "seed_audio") {
    credits = Math.max(5, 0.25 * args.durationSeconds);
    formula = `max(5, 0.25 × ${args.durationSeconds}s) credits × $${RUNWAY_USD_PER_CREDIT}/credit`;
  } else {
    throw new Error("sound_candidate_price_unknown");
  }
  return {
    candidateId: candidate.candidateId,
    durationSeconds: args.durationSeconds,
    credits,
    usd: roundUsd(credits * RUNWAY_USD_PER_CREDIT),
    formula,
  };
}

export function quoteRoundA(): {
  durationSeconds: number;
  ratio: string;
  items: VideoCostQuote[];
  totalCredits: number;
  totalUsd: number;
} {
  const items = getTestableVideoModels().map((entry) =>
    quoteVideoCost({
      modelId: entry.modelId,
      durationSeconds: ROUND_A_DURATION_SECONDS,
      generateAudio: entry.returnsAudio,
      portraitRatio: ROUND_A_PORTRAIT_RATIO,
    }),
  );
  const totalCredits = items.reduce((sum, item) => sum + item.credits, 0);
  const totalUsd = roundUsd(items.reduce((sum, item) => sum + item.usd, 0));
  return {
    durationSeconds: ROUND_A_DURATION_SECONDS,
    ratio: ROUND_A_PORTRAIT_RATIO,
    items,
    totalCredits,
    totalUsd,
  };
}

export function quoteTextToVideoCost(args: {
  modelId: string;
  durationSeconds: number;
  generateAudio?: boolean;
  portraitRatio?: string;
}): VideoCostQuote {
  const entry = getTextToVideoModel(args.modelId);
  if (!entry) throw new Error("unknown_text_to_video_model");
  if (entry.status !== "testable") throw new Error("text_to_video_model_unsupported");
  if (!isDurationAllowed(entry.duration, args.durationSeconds)) {
    throw new Error("duration_not_supported");
  }
  const ratio = args.portraitRatio ?? entry.defaultPortraitRatio;
  if (!entry.portraitRatios.includes(ratio)) {
    throw new Error("ratio_not_supported");
  }
  const generateAudio =
    args.generateAudio ?? (entry.audioDefault === true || entry.returnsAudio);
  if (generateAudio && !entry.audioField) {
    throw new Error("audio_not_supported");
  }
  let perSecond: number;
  if (entry.audioField && generateAudio) {
    perSecond = entry.creditsPerSecondWithAudio ?? entry.creditsPerSecond ?? NaN;
  } else if (entry.audioField && !generateAudio) {
    perSecond =
      entry.creditsPerSecondWithoutAudio ?? entry.creditsPerSecond ?? NaN;
  } else {
    perSecond = entry.creditsPerSecond ?? NaN;
  }
  if (!Number.isFinite(perSecond) || perSecond <= 0) {
    throw new Error("text_to_video_model_price_unknown");
  }
  const raw = perSecond * args.durationSeconds + entry.extraCredits;
  const credits = Math.max(raw, entry.minimumCredits);
  const usd = roundUsd(credits * entry.usdPerCredit);
  return {
    modelId: entry.modelId,
    durationSeconds: args.durationSeconds,
    generateAudio,
    credits,
    usd,
    usdPerCredit: entry.usdPerCredit,
    formula: `${perSecond} credits/s × ${args.durationSeconds}s${
      entry.extraCredits ? ` + ${entry.extraCredits}` : ""
    }${entry.minimumCredits ? `, min ${entry.minimumCredits}` : ""} × $${entry.usdPerCredit}/credit`,
    maxCostUsd: usd,
  };
}

export function quoteRoundT(): {
  durationSeconds: number;
  ratio: string;
  items: VideoCostQuote[];
  totalCredits: number;
  totalUsd: number;
} {
  const items = getTestableTextToVideoModels().map((entry) =>
    quoteTextToVideoCost({
      modelId: entry.modelId,
      durationSeconds: ROUND_A_DURATION_SECONDS,
      generateAudio: entry.returnsAudio,
      portraitRatio: ROUND_A_PORTRAIT_RATIO,
    }),
  );
  const totalCredits = items.reduce((sum, item) => sum + item.credits, 0);
  const totalUsd = roundUsd(items.reduce((sum, item) => sum + item.usd, 0));
  return {
    durationSeconds: ROUND_A_DURATION_SECONDS,
    ratio: ROUND_A_PORTRAIT_RATIO,
    items,
    totalCredits,
    totalUsd,
  };
}

export function publicCatalog() {
  const roundA = quoteRoundA();
  const roundT = quoteRoundT();
  return {
    docsVerifiedAt: AI_MEDIA_BENCHMARK_DOCS_VERIFIED_AT,
    sources: {
      runway: RUNWAY_DOCS,
      openai: OPENAI_DOCS,
      elevenlabs: ELEVENLABS_DOCS,
    },
    roundA,
    roundT,
    video: VIDEO_MODEL_CATALOG.map((entry) => ({
      ...entry,
      defaultQuote:
        entry.status === "testable"
          ? quoteVideoCost({
              modelId: entry.modelId,
              durationSeconds: ROUND_A_DURATION_SECONDS,
              generateAudio: entry.returnsAudio,
              portraitRatio: ROUND_A_PORTRAIT_RATIO,
            })
          : null,
    })),
    voice: VOICE_CANDIDATES.map((entry) => ({
      ...entry,
      defaultQuote:
        entry.status === "testable"
          ? quoteVoiceCost({
              candidateId: entry.candidateId,
              text: DEFAULT_VOICE_SCRIPT,
            })
          : null,
    })),
    sound: SOUND_CANDIDATES.map((entry) => ({
      ...entry,
      defaultQuote:
        entry.status === "testable"
          ? quoteSoundCost({
              candidateId: entry.candidateId,
              durationSeconds: entry.defaultDurationSeconds,
            })
          : null,
    })),
    textVideo: TEXT_TO_VIDEO_CATALOG.map((entry) => ({
      ...entry,
      defaultQuote:
        entry.status === "testable"
          ? quoteTextToVideoCost({
              modelId: entry.modelId,
              durationSeconds: ROUND_A_DURATION_SECONDS,
              generateAudio: entry.returnsAudio,
              portraitRatio: ROUND_A_PORTRAIT_RATIO,
            })
          : null,
    })),
  };
}
