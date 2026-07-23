export type {
  PresentationRenderInput,
  PresentationFragments,
  PresentationCompatSources,
} from "@/lib/architecture/presentation/types";
export {
  ensureDecisionPacks,
  ensurePresentationFragments,
  toPresentationRenderInput,
} from "@/lib/architecture/presentation/ensureDecisionPacks";
export { buildPresentationPrompt } from "@/lib/architecture/presentation/buildPresentationPrompt";
export {
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
  buildPackageDiversityLines,
} from "@/lib/architecture/presentation/renderers";
