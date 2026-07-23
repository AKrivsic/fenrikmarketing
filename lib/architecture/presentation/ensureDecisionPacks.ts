/**
 * TEMPORARY COMPAT (Phase 3) — assemble packs + fragments when callers have not
 * yet passed a complete PresentationRenderInput.
 *
 * Production workflows MUST pass decisionPacks (+ creativeDirectiveBlock).
 * This helper exists for unit tests and legacy callers only.
 *
 * Repair still consumes the rendered prompt string; it does not call this.
 */

import {
  buildCreativeDirectiveBlock,
  buildCreativeSeed,
  pickCreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { buildTypedDecisionPacks } from "@/lib/architecture/typedDecisionPacks";
import { DEFAULT_GENERATION_MODE } from "@/lib/ai/generationMode";
import { FUNNEL_STAGE_LABELS, REQUIRED_PACKAGE_PLATFORMS } from "@/lib/ai/types";
import type {
  PresentationCompatSources,
  PresentationFragments,
  PresentationRenderInput,
} from "@/lib/architecture/presentation/types";
import type { TypedDecisionPacks } from "@/lib/architecture/typedDecisionPacks";

export function ensureDecisionPacks(
  sources: PresentationCompatSources,
): TypedDecisionPacks {
  if (sources.decisionPacks) return sources.decisionPacks;

  const funnelLabel = FUNNEL_STAGE_LABELS[sources.funnelStage];
  const directives =
    sources.directives ??
    pickCreativeDirectives(
      buildCreativeSeed(
        funnelLabel,
        sources.topic,
        sources.angle,
        sources.creativeSeedSalt,
      ),
    );
  const targetPlatforms =
    sources.targetPlatforms && sources.targetPlatforms.length > 0
      ? sources.targetPlatforms
      : REQUIRED_PACKAGE_PLATFORMS;
  const requireVideo = sources.requireVideo ?? true;
  const videoPlatforms = sources.videoPlatforms ?? [];
  const generationMode = sources.generationMode ?? DEFAULT_GENERATION_MODE;

  return buildTypedDecisionPacks({
    project: sources.project,
    directives,
    funnelStage: sources.funnelStage,
    generationMode,
    assetCoverage: sources.assetCoverage ?? null,
    selectedCandidate: sources.selectedCandidateForPacks ?? null,
    creativeDna: sources.creativeDnaForPacks ?? null,
    creativeIdentity: sources.creativeIdentityForPacks ?? null,
    attentionDeliveryArc: sources.attentionDeliveryArcForPacks ?? null,
    attentionPromptBlock: sources.attentionPromptBlock ?? null,
    creativeDnaPromptBlock: sources.creativeDnaPromptBlock ?? null,
    creativeIdentityPromptBlock: sources.creativeIdentityPromptBlock ?? null,
    ttsVoiceId: sources.ttsVoiceIdForPacks ?? null,
    targetPlatforms,
    requireVideo,
    videoPlatforms,
  });
}

export function ensurePresentationFragments(
  sources: PresentationCompatSources,
): PresentationFragments {
  const funnelLabel = FUNNEL_STAGE_LABELS[sources.funnelStage];
  const directives =
    sources.directives ??
    (sources.creativeDirectiveBlock
      ? null
      : pickCreativeDirectives(
          buildCreativeSeed(
            funnelLabel,
            sources.topic,
            sources.angle,
            sources.creativeSeedSalt,
          ),
        ));

  const creativeDirectiveBlock =
    sources.creativeDirectiveBlock ??
    (directives ? buildCreativeDirectiveBlock(directives) : "");

  return {
    creativeDirectiveBlock,
    candidatePromptBlock: sources.creativeCandidatePromptBlock,
    narrativeBeatPromptBlock: sources.narrativeBeatPromptBlock,
    fidelityRepairBlock: sources.creativeCandidateFidelityRepair,
    visualNarrativePromptBlock: sources.visualNarrativePromptBlock,
    visualMediumPromptBlock: sources.visualMediumPromptBlock,
    productRevealPromptBlock: sources.productRevealPromptBlock,
    visualProfileImagePromptBlock: sources.visualProfileImagePromptBlock,
    seriesCreativeContextBlock: sources.seriesCreativeContextBlock,
  };
}

/** Build a complete PresentationRenderInput from legacy prompt input fields. */
export function toPresentationRenderInput(
  sources: PresentationCompatSources & {
    availableAssets: PresentationRenderInput["availableAssets"];
    memory?: PresentationRenderInput["memory"];
    recentAssetUsageBlock?: string;
    packageDiversity?: PresentationRenderInput["packageDiversity"];
    variantCounts?: Record<string, number>;
    promptPresentationTypes?: PresentationRenderInput["promptPresentationTypes"];
  },
): PresentationRenderInput {
  const packs = ensureDecisionPacks(sources);
  const fragments = ensurePresentationFragments(sources);
  const targetPlatforms =
    sources.targetPlatforms && sources.targetPlatforms.length > 0
      ? sources.targetPlatforms
      : REQUIRED_PACKAGE_PLATFORMS;
  return {
    decisionPacks: packs,
    fragments,
    project: sources.project,
    funnelStage: sources.funnelStage,
    topic: sources.topic,
    angle: sources.angle,
    availableAssets: sources.availableAssets,
    targetPlatforms,
    requireVideo: sources.requireVideo ?? true,
    videoPlatforms: sources.videoPlatforms ?? [],
    generationMode: sources.generationMode ?? DEFAULT_GENERATION_MODE,
    promptPresentationTypes:
      sources.promptPresentationTypes &&
      sources.promptPresentationTypes.length > 0
        ? sources.promptPresentationTypes
        : ["IMAGE"],
    memory: sources.memory,
    recentAssetUsageBlock: sources.recentAssetUsageBlock,
    packageDiversity: sources.packageDiversity,
    variantCounts: sources.variantCounts,
  };
}
