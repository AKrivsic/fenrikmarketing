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

// Every content package must produce outputs for these surfaces. Note that
// "google_business" is NOT part of the platform_type DB enum; outputs for it
// live in package_brief only (see BLOCKERS in the report).
export type PackagePlatform =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "google_business";

export const REQUIRED_PACKAGE_PLATFORMS: readonly PackagePlatform[] = [
  "tiktok",
  "instagram",
  "facebook",
  "linkedin",
  "google_business",
];

// Subset of REQUIRED_PACKAGE_PLATFORMS that can be persisted as content_items.
// Since migration 008 added google_business to the platform_type enum, every
// required platform is now persistable. Typed as the literal union so it
// indexes both PackagePlatform-keyed maps and satisfies PlatformType.
export const PERSISTABLE_PACKAGE_PLATFORMS = [
  "tiktok",
  "instagram",
  "facebook",
  "linkedin",
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

export interface ImageProvider {
  readonly name: VisualProvider;
  generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResult>;
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
