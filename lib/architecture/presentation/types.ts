/**
 * Phase 3 — Presentation is a renderer over Typed Decision Packs.
 * Ownership resolution lives upstream (or in ensureDecisionPacks compat only).
 */

import type { Project } from "@/lib/supabase/types";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import type {
  AntiRepetitionMemory,
  FunnelStage,
} from "@/lib/ai/types";
import type { GenerationMode } from "@/lib/ai/generationMode";
import type { PromptPresentationType } from "@/lib/scene-types/presentation/promptPresentationTypes";
import type { PackageDiversitySpec } from "@/lib/ai/prompts/generateContentPackage";
import type { TypedDecisionPacks } from "@/lib/architecture/typedDecisionPacks";
import type { CreativeDirectives } from "@/lib/ai/prompts/creativeDirectives";

/**
 * Pre-rendered upstream fragments. These are NOT ownership decisions —
 * workflows (or compat) format them before Presentation renders the prompt.
 */
export interface PresentationFragments {
  readonly creativeDirectiveBlock: string;
  readonly candidatePromptBlock?: string;
  readonly narrativeBeatPromptBlock?: string;
  readonly fidelityRepairBlock?: string;
  readonly visualNarrativePromptBlock?: string;
  readonly visualMediumPromptBlock?: string;
  readonly productRevealPromptBlock?: string;
  readonly visualProfileImagePromptBlock?: string;
  readonly seriesCreativeContextBlock?: string;
}

/**
 * Target Presentation API (Phase 3).
 * decisionPacks are required for ownership-sensitive sections.
 * project remains for Product Brain extensions not yet packed
 * (pain/proof/scenario/website knowledge cards).
 */
export interface PresentationRenderInput {
  readonly decisionPacks: TypedDecisionPacks;
  readonly fragments: PresentationFragments;
  readonly project: Project;
  readonly funnelStage: FunnelStage;
  readonly topic: string;
  readonly angle?: string | null;
  readonly availableAssets: readonly AssetRef[];
  readonly targetPlatforms: readonly string[];
  readonly requireVideo: boolean;
  readonly videoPlatforms: readonly string[];
  readonly generationMode: GenerationMode;
  readonly promptPresentationTypes: readonly PromptPresentationType[];
  readonly memory?: AntiRepetitionMemory;
  readonly recentAssetUsageBlock?: string;
  readonly packageDiversity?: PackageDiversitySpec;
  readonly variantCounts?: Record<string, number>;
}

/**
 * Legacy GenerateContentPackagePromptInput fields used only by
 * ensureDecisionPacks / fragment assembly for tests and older callers.
 */
export interface PresentationCompatSources {
  readonly project: Project;
  readonly funnelStage: FunnelStage;
  readonly topic: string;
  readonly angle?: string | null;
  readonly creativeSeedSalt?: string;
  readonly directives?: CreativeDirectives;
  readonly decisionPacks?: TypedDecisionPacks;
  readonly generationMode?: GenerationMode;
  readonly assetCoverage?: import("@/lib/assets/assetCoveragePolicy").AssetCoverageDecision | null;
  readonly selectedCandidateForPacks?: import("@/lib/architecture/typedDecisionPacks").BuildTypedDecisionPacksInput["selectedCandidate"];
  readonly creativeDnaForPacks?: import("@/lib/creative-candidates/creativeDNA").CreativeDNA | null;
  readonly creativeIdentityForPacks?: import("@/lib/creative-identity/types").CreativeIdentity | null;
  readonly attentionDeliveryArcForPacks?: import("@/lib/attention/types").DeliveryArc | null;
  readonly attentionPromptBlock?: string | null;
  readonly creativeDnaPromptBlock?: string | null;
  readonly creativeIdentityPromptBlock?: string | null;
  readonly ttsVoiceIdForPacks?: string | null;
  readonly targetPlatforms?: readonly string[];
  readonly requireVideo?: boolean;
  readonly videoPlatforms?: readonly string[];
  readonly creativeDirectiveBlock?: string;
  readonly creativeCandidatePromptBlock?: string;
  readonly narrativeBeatPromptBlock?: string;
  readonly creativeCandidateFidelityRepair?: string;
  readonly visualNarrativePromptBlock?: string;
  readonly visualMediumPromptBlock?: string;
  readonly productRevealPromptBlock?: string;
  readonly visualProfileImagePromptBlock?: string;
  readonly seriesCreativeContextBlock?: string;
}
