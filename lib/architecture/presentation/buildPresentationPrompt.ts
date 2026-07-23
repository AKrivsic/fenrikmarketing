/**
 * Presentation orchestrator — Typed Pack → Renderer → Prompt.
 * Does not resolve ownership; ensureDecisionPacks is TEMPORARY COMPAT only.
 */

import type { PresentationRenderInput } from "@/lib/architecture/presentation/types";
import {
  renderGroundingSection,
  renderCreativeDirectiveSection,
  renderPackageDiversitySection,
  renderAttentionFirstSection,
  renderVoiceSection,
  renderHookAndIdentitySection,
  renderQualitySection,
  renderVisualBeatsSection,
  renderAssetsSection,
  renderPlatformSection,
  renderSchemaSection,
} from "@/lib/architecture/presentation/renderers";

export function buildPresentationPrompt(input: PresentationRenderInput): string {
  const { decisionPacks, fragments } = input;

  return [
    ...renderGroundingSection(input),
    ...renderCreativeDirectiveSection(fragments),
    ...renderPackageDiversitySection(input.packageDiversity),
    ...renderAttentionFirstSection(decisionPacks),
    ...renderVoiceSection(decisionPacks),
    ...renderHookAndIdentitySection(decisionPacks, fragments),
    ...renderQualitySection(decisionPacks, input.requireVideo),
    ...renderVisualBeatsSection(decisionPacks, fragments, input.requireVideo),
    ...renderAssetsSection(
      input.project,
      input.availableAssets,
      input.promptPresentationTypes,
      fragments,
      input.generationMode,
    ),
    ...renderPlatformSection(input.targetPlatforms),
    ...renderSchemaSection({
      funnelStage: input.funnelStage,
      targetPlatforms: input.targetPlatforms,
      requireVideo: input.requireVideo,
      videoPlatforms: input.videoPlatforms,
      promptPresentationTypes: input.promptPresentationTypes,
      variantCounts: input.variantCounts,
    }),
  ].join("\n");
}
