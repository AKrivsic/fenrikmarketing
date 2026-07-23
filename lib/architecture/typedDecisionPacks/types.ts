/**
 * Phase 2B — Typed Decision Packs (types).
 *
 * Authoritative intermediate representation between decision producers and
 * Presentation. Ownership must match lib/architecture/decisionOwnership.ts.
 * No industry defaults — domain facts come from runtime inputs only.
 */

import type { DecisionId } from "@/lib/architecture/decisionOwnership";
import type { CreativeDirectives } from "@/lib/ai/prompts/creativeDirectives";
import type { FunnelStage } from "@/lib/ai/types";
import type { GenerationMode } from "@/lib/ai/generationMode";
import type { AssetCoverageDecision } from "@/lib/assets/assetCoveragePolicy";
import type { CreativeDNA } from "@/lib/creative-candidates/creativeDNA";
import type { CreativeIdentity } from "@/lib/creative-identity/types";
import type { DeliveryArc } from "@/lib/attention/types";

export const TYPED_DECISION_PACKS_VERSION = "typed-decision-packs@1" as const;

export type DecisionPackOwner =
  | "product_brain"
  | "winner_candidate"
  | "creative_dna"
  | "mode_beats"
  | "attention_delivery"
  | "creative_directive_persona"
  | "creative_identity"
  | "asset_coverage"
  | "funnel_asset_policy_fallback"
  | "cta_guardrails"
  | "safety_guardrails"
  | "platform_styles"
  | "content_package_schema";

export interface DecisionPackMeta {
  readonly owner: DecisionPackOwner;
  /** Phase 2A registry decision id this pack operationalizes. */
  readonly decisionId: DecisionId;
  readonly source: string;
  readonly version: 1;
  /** True when a documented fallback path was used (no winner, no coverage, etc.). */
  readonly usedFallback: boolean;
}

export interface ProductGroundingPack {
  readonly meta: DecisionPackMeta;
  readonly projectName: string;
  readonly projectType: string;
  readonly language: string;
  readonly marketScope: string;
  readonly goalType: string;
  readonly productIs: readonly string[];
  readonly productIsNot: readonly string[];
  readonly productStrengths: readonly string[];
  readonly painPoints: readonly string[];
  readonly forbiddenClaims: readonly string[];
  readonly defaultCta: string | null;
}

export interface HookPack {
  readonly meta: DecisionPackMeta;
  readonly hookLine: string;
  readonly source:
    | "winner_candidate_hookLine"
    | "creative_directive_hook_archetype";
  readonly archetypeId: string | null;
  readonly archetypeInstruction: string | null;
}

export interface OpeningPack {
  readonly meta: DecisionPackMeta;
  readonly openingSituation: string | null;
  readonly dnaWorld: string | null;
  readonly source: "winner_candidate_opening" | "legacy_directive_only";
}

export interface StoryBeat {
  readonly id: string;
  readonly order: number;
}

export interface StoryStructurePack {
  readonly meta: DecisionPackMeta;
  readonly modeId: string;
  readonly modeName: string;
  /** Authoritative progression — MODE BEATS only (C1 resolved). */
  readonly beats: readonly StoryBeat[];
  readonly beatArc: string;
  readonly source: "mode_beats";
}

export interface EmotionalArcPack {
  readonly meta: DecisionPackMeta;
  readonly emotionalReaction: string | null;
  readonly source: "winner_candidate" | "absent";
}

export interface VoicePack {
  readonly meta: DecisionPackMeta;
  readonly personaName: string;
  readonly personaVocabulary: string;
  readonly personaRhythm: string;
  readonly personaEnergy: string;
  readonly personaExaggeration: string;
  /** Spoken delivery phases — Attention delivery_arc (not persona). */
  readonly deliveryArc: DeliveryArc | null;
  readonly deliveryPromptBlock: string | null;
  /** Provider TTS voice id is orthogonal; optional reference only. */
  readonly ttsVoiceId: string | null;
}

export interface VisualIdentityPack {
  readonly meta: DecisionPackMeta;
  readonly dnaWorld: string | null;
  readonly immutableRules: readonly string[];
  readonly treatment: {
    readonly lighting: string | null;
    readonly composition: string | null;
    readonly colorFeel: string | null;
    readonly mood: string | null;
    /** Environment treatment only — must not relocate DNA world. */
    readonly environmentTreatment: string | null;
  };
  readonly dnaPromptBlock: string | null;
  readonly identityPromptBlock: string | null;
}

export interface CharacterConsistencyPack {
  readonly meta: DecisionPackMeta;
  readonly mainCharacter: string | null;
  readonly immutableRules: readonly string[];
}

export interface CameraStylePack {
  readonly meta: DecisionPackMeta;
  readonly camera: string | null;
  readonly source: "creative_identity" | "absent";
}

export interface AssetPolicyPack {
  readonly meta: DecisionPackMeta;
  readonly source: "package_asset_coverage" | "funnel_asset_policy_fallback";
  readonly coverage: AssetCoverageDecision | null;
  readonly funnelStage: FunnelStage;
  readonly generationMode: GenerationMode;
  readonly promptBlock: string;
}

export interface CtaPack {
  readonly meta: DecisionPackMeta;
  readonly goalType: string;
  readonly allowedTypes: readonly string[];
  readonly defaultCtaHint: string | null;
}

export interface SafetyPack {
  readonly meta: DecisionPackMeta;
  readonly productIsNot: readonly string[];
  readonly forbiddenClaims: readonly string[];
  /** Prompt companion lives on Creative Directive CREATIVE SAFETY. */
  readonly creativeSafetyOwnedByDirective: true;
}

export interface PlatformAdaptationPack {
  readonly meta: DecisionPackMeta;
  readonly targetPlatforms: readonly string[];
  readonly requireVideo: boolean;
  readonly videoPlatforms: readonly string[];
}

export interface JsonSchemaPack {
  readonly meta: DecisionPackMeta;
  readonly schemaModule: "lib/ai/schemas/contentPackage.ts";
  readonly requireVideo: boolean;
}

export interface TypedDecisionPacks {
  readonly version: typeof TYPED_DECISION_PACKS_VERSION;
  readonly productGrounding: ProductGroundingPack;
  readonly hook: HookPack;
  readonly opening: OpeningPack;
  readonly storyStructure: StoryStructurePack;
  readonly emotionalArc: EmotionalArcPack;
  readonly voice: VoicePack;
  readonly visualIdentity: VisualIdentityPack;
  readonly characterConsistency: CharacterConsistencyPack;
  readonly cameraStyle: CameraStylePack;
  readonly assetPolicy: AssetPolicyPack;
  readonly cta: CtaPack;
  readonly safety: SafetyPack;
  readonly platformAdaptation: PlatformAdaptationPack;
  readonly jsonSchema: JsonSchemaPack;
}

/** Runtime inputs for the pure pack assembler (no I/O, no model calls). */
export interface BuildTypedDecisionPacksInput {
  readonly project: {
    readonly name: string;
    readonly type: string;
    readonly language: string;
    readonly market_scope: string;
    readonly goal_type: string;
    readonly product_is: readonly string[];
    readonly product_is_not: readonly string[];
    readonly product_strengths: readonly string[];
    readonly pain_points: readonly string[];
    readonly forbidden_claims: readonly string[];
    readonly default_cta: string | null;
  };
  readonly directives: CreativeDirectives;
  readonly funnelStage: FunnelStage;
  readonly generationMode?: GenerationMode;
  readonly assetCoverage?: AssetCoverageDecision | null;
  readonly selectedCandidate?: {
    readonly hookLine: string;
    readonly openingSituation: string;
    readonly emotionalReaction: string;
    readonly creativeDNA?: CreativeDNA | null;
  } | null;
  readonly creativeDna?: CreativeDNA | null;
  readonly creativeIdentity?: CreativeIdentity | null;
  readonly attentionDeliveryArc?: DeliveryArc | null;
  readonly attentionPromptBlock?: string | null;
  readonly creativeDnaPromptBlock?: string | null;
  readonly creativeIdentityPromptBlock?: string | null;
  readonly ttsVoiceId?: string | null;
  readonly targetPlatforms: readonly string[];
  readonly requireVideo?: boolean;
  readonly videoPlatforms?: readonly string[];
}
