/**
 * Phase 4 — Repair Delta Engine (types).
 *
 * Repair is a patch generator over Typed Decision Packs + validation failures.
 * Packs are immutable authority unless a validator explicitly requests a change.
 */

import type { TypedDecisionPacks } from "@/lib/architecture/typedDecisionPacks";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import type { ConceptFidelityResult } from "@/lib/creative-candidates/types";
import type { StoryIntegrityResult } from "@/lib/creative-candidates/storyIntegrity";
import type { ProductDemonstrationIntegrityResult } from "@/lib/creative-candidates/productDemonstrationIntegrity";

export const REPAIR_DELTA_VERSION = "repair-delta@1" as const;

/** Validators that can emit structured RepairDelta metadata. */
export type RepairValidatorId =
  | "concept_fidelity"
  | "story_integrity"
  | "product_demonstration_integrity"
  | "scene_diversity"
  | "platform_native"
  | "json_schema"
  | "guardrail";

export type RepairSeverity = "material" | "soft" | "deterministic";

/**
 * Authoritative decisions Repair must not rewrite unless the delta
 * explicitly lists them in patchTargets / omits them from preserve.
 */
export type PreserveRule =
  | "hook"
  | "opening"
  | "storyStructure"
  | "productGrounding"
  | "voicePersona"
  | "voiceEmotion"
  | "characterIdentity"
  | "visualIdentity"
  | "assetOwnership"
  | "ctaType"
  | "platformStrategy"
  | "emotionalArc";

/** Package fields the repair LLM is allowed to change. */
export type RepairPatchTarget =
  | "hook"
  | "voiceover_text"
  | "video"
  | "visual_scenes"
  | "image_prompts"
  | "cta"
  | "platform_outputs"
  | "asset_usage"
  | "subtitles"
  | "title"
  | "hashtags"
  | "scenario";

export interface RepairDelta {
  readonly version: typeof REPAIR_DELTA_VERSION;
  readonly validator: RepairValidatorId;
  readonly severity: RepairSeverity;
  /** 0-based scene indices when known; empty = all scenes in patchTargets may change. */
  readonly affectedScenes: readonly number[];
  /** Platform ids when platform_outputs must change; empty = leave platforms alone. */
  readonly affectedPlatforms: readonly string[];
  readonly problem: string;
  readonly requiredChange: string;
  readonly preserve: readonly PreserveRule[];
  readonly failureCodes: readonly string[];
  readonly patchTargets: readonly RepairPatchTarget[];
}

export interface RepairValidationResults {
  readonly fidelity?: ConceptFidelityResult | null;
  readonly storyIntegrity?: StoryIntegrityResult | null;
  readonly productDemonstration?: ProductDemonstrationIntegrityResult | null;
}

/**
 * Minimal Repair input — no full Presentation prompt assembly.
 */
export interface RepairContext {
  readonly decisionPacks: TypedDecisionPacks;
  readonly repairDelta: RepairDelta;
  readonly generatedPackage: ContentPackageOutput;
  readonly validationResults: RepairValidationResults;
  /** Winner Candidate — authoritative for hook/opening preserve. */
  readonly winner: CreativeCandidate;
  readonly funnelStageLabel?: string;
  readonly requireVideo?: boolean;
}

/** Default preserve set — all pack-owned decisions unless a validator opts out. */
export const DEFAULT_REPAIR_PRESERVE: readonly PreserveRule[] = [
  "hook",
  "opening",
  "storyStructure",
  "productGrounding",
  "voicePersona",
  "voiceEmotion",
  "characterIdentity",
  "visualIdentity",
  "assetOwnership",
  "ctaType",
  "platformStrategy",
  "emotionalArc",
] as const;
