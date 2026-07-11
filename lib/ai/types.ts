import type { GoalType, PlatformType, VisualProvider } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// AI domain primitives
// ---------------------------------------------------------------------------

// Canonical funnel stages (Single Source of Truth). Stored as lowercase
// snake_case enum values; presented to AI as human labels. The previous
// "consideration" / "retention" values are NOT part of the architecture.
export type FunnelStage =
  | "awareness"
  | "problem_aware"
  | "solution_aware"
  | "conversion";

export const FUNNEL_STAGES: readonly FunnelStage[] = [
  "awareness",
  "problem_aware",
  "solution_aware",
  "conversion",
];

// Human labels used in AI prompts and accepted in AI JSON output.
export const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> = {
  awareness: "Awareness",
  problem_aware: "Problem Aware",
  solution_aware: "Solution Aware",
  conversion: "Conversion",
};

export const FUNNEL_STAGE_LABEL_LIST: readonly string[] = FUNNEL_STAGES.map(
  (s) => FUNNEL_STAGE_LABELS[s],
);

// Accepts either a human label ("Problem Aware") or an internal DB value
// ("problem_aware") and normalizes to the canonical DB value. Returns null for
// anything outside the architecture (e.g. legacy "consideration"/"retention").
export function normalizeFunnelStage(value: unknown): FunnelStage | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase().replace(/[\s_]+/g, "_");
  const map: Record<string, FunnelStage> = {
    awareness: "awareness",
    problem_aware: "problem_aware",
    solution_aware: "solution_aware",
    conversion: "conversion",
  };
  return map[key] ?? null;
}

// True when the value can be normalized to a canonical funnel stage.
export function isFunnelStageInput(value: unknown): boolean {
  return normalizeFunnelStage(value) !== null;
}

// Platform surfaces a content package can produce outputs for. youtube + x are
// part of the package surface set since Content Production V3 (migration 016
// added "x" to platform_type; youtube has been a platform_type since 001).
//
// These are the platforms the AI is asked to produce outputs for and that can
// be persisted as content_items. A given generation only produces the SUBSET a
// project / production run selected (see resolvePackagePlatforms) — adding a
// platform here does NOT force it onto projects that did not select it.
export type PackagePlatform =
  | "tiktok"
  | "instagram"
  | "youtube"
  | "facebook"
  | "linkedin"
  | "x"
  | "google_business";

export const REQUIRED_PACKAGE_PLATFORMS: readonly PackagePlatform[] = [
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
  "linkedin",
  "x",
  "google_business",
];

// Subset of REQUIRED_PACKAGE_PLATFORMS that can be persisted as content_items.
// Every package platform is now a platform_type enum value (001 youtube, 008
// google_business, 016 x), so all of them are persistable. Typed as the literal
// union so it indexes PackagePlatform-keyed maps and satisfies PlatformType.
export const PERSISTABLE_PACKAGE_PLATFORMS = [
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
  "linkedin",
  "x",
  "google_business",
] as const satisfies readonly (PlatformType & PackagePlatform)[];

export type PersistablePackagePlatform =
  (typeof PERSISTABLE_PACKAGE_PLATFORMS)[number];

// ---------------------------------------------------------------------------
// Text provider abstraction (Claude for strategy/copy/scoring/evergreen,
// OpenAI for structured JSON repair).
// ---------------------------------------------------------------------------

export interface TextCompletionRequest {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  // Hint that the response must be a single JSON document.
  json?: boolean;
  // Optional per-call transport overrides (defaults in fetchWithRetry HTTP_*).
  timeoutMs?: number;
  maxTransportAttempts?: number;
}

export interface TextCompletionResult {
  text: string;
  model: string;
  provider: string;
  raw?: unknown;
}

export interface TextProvider {
  readonly name: string;
  complete(req: TextCompletionRequest): Promise<TextCompletionResult>;
}

// ---------------------------------------------------------------------------
// Image provider abstraction. The AI Visual Engine MUST go through this
// adapter and never call OpenAI directly. MVP default = openai.
// ---------------------------------------------------------------------------

export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  size?: string;
  model?: string;
}

export interface ImageGenerationResult {
  provider: VisualProvider;
  model: string;
  // base64 payload or remote url, depending on provider capability.
  imageBase64?: string;
  imageUrl?: string;
  raw?: unknown;
}

export interface ImageEditReferenceImage {
  imageBytes: Buffer;
  mimeType: "image/png" | "image/jpeg";
  /** Hint for providers that distinguish roles (e.g. logo overlay). */
  role?: "reference" | "logo";
}

export interface ImageEditRequest {
  /** Source still bytes (PNG or JPEG). */
  sourceImageBytes: Buffer;
  mimeType?: "image/png" | "image/jpeg";
  instruction: string;
  size?: string;
  model?: string;
  /** Extra images (e.g. uploaded logo) for multi-image edit. */
  additionalImages?: ImageEditReferenceImage[];
}

export interface ImageProvider {
  readonly name: VisualProvider;
  generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResult>;
  /** Optional inpainting / edit on an existing image. */
  editImage?(req: ImageEditRequest): Promise<ImageGenerationResult>;
  /** When true, editImage accepts additionalImages (logo / brand asset). */
  readonly supportsMultiImageEdit?: boolean;
}

// ---------------------------------------------------------------------------
// Text-to-speech abstraction (OpenAI in MVP) used by the Video Engine for
// voiceover synthesis.
// ---------------------------------------------------------------------------

export interface SpeechRequest {
  text: string;
  voice?: string;
  model?: string;
  format?: string;
  /** gpt-4o-mini-tts delivery style; omitted for legacy/default API behaviour. */
  instructions?: string;
}

export interface SpeechResult {
  provider: string;
  model: string;
  audioBase64: string;
  raw?: unknown;
}

export interface SpeechProvider {
  readonly name: string;
  synthesize(req: SpeechRequest): Promise<SpeechResult>;
}

// ---------------------------------------------------------------------------
// Speech-to-text (transcription) abstraction. Word Timestamp Subtitles V1 —
// after TTS produces the voiceover MP3 we transcribe it with OpenAI whisper-1
// (verbose_json + word granularity) to obtain REAL per-word timings, so phrase
// subtitles are aligned to the actual spoken audio instead of a proportional
// estimate. This is best-effort: callers must fall back to the estimate if it
// is unavailable (see video-worker/services/wordTimestamps.ts).
// ---------------------------------------------------------------------------

// One word with its start/end offset (seconds) within the audio.
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptionRequest {
  // Raw audio bytes (e.g. the MP3 buffer). Sent as multipart/form-data.
  audio: Uint8Array;
  // Filename hint for the multipart upload (extension drives format detection).
  filename?: string;
  // MIME type for the uploaded blob (defaults to audio/mpeg).
  contentType?: string;
  // ISO-639-1 language hint (e.g. "cs", "en", "de"). Improves accuracy; when
  // omitted whisper auto-detects the language.
  language?: string;
  model?: string;
}

export interface TranscriptionResult {
  provider: string;
  model: string;
  // Detected (or hinted) language code echoed back by the API, when present.
  language?: string;
  words: WordTimestamp[];
  raw?: unknown;
}

export interface TranscriptionProvider {
  readonly name: string;
  transcribeWords(req: TranscriptionRequest): Promise<TranscriptionResult>;
}

// Allowed CTA categories per project goal. Used by the content-package
// guardrails so the generated CTA type matches project.goal_type.
export const CTA_TYPES_BY_GOAL: Record<GoalType, readonly string[]> = {
  lead_generation: ["lead", "contact", "book", "request_quote", "sign_up"],
  awareness: ["learn_more", "follow", "watch", "share"],
  activation: ["try", "start", "activate", "download", "sign_up"],
  retention: ["renew", "upgrade", "refer", "community", "feedback"],
};

// Phase 2E — Anti-Repetition Memory. A compact, deterministic snapshot of the
// last N hooks/topics/CTAs/scenarios already produced for a project. Built from
// existing data (no new AI layer) and embedded into the generation prompts so
// the model avoids repeating itself. Each list is already deduplicated and
// capped; empty lists are valid (a brand-new project has no history).
export interface AntiRepetitionMemory {
  hooks: string[];
  topics: string[];
  ctas: string[];
  scenarios: string[];
}
