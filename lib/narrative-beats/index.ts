export { NARRATIVE_BEAT_VERSION, NARRATIVE_BEAT_ROLES } from "@/lib/narrative-beats/types";
export type {
  NarrativeBeat,
  NarrativeBeatPlan,
  NarrativeBeatRole,
  ViewerComprehension,
  MetaphorClarityDiagnostic,
  StoryProgressionDiagnostics,
  StoryProgressionPairWarning,
  VisualProgressionDiagnostics,
  InformationProgressionDiagnostics,
  InformationProgressionPairWarning,
  DurationValidationDiagnostics,
  NarrativeTimelineDebug,
} from "@/lib/narrative-beats/types";

export {
  deriveNarrativeBeats,
  mapModeBeatsToRoles,
  narrativeBeatRolesForCount,
} from "@/lib/narrative-beats/deriveBeats";

export {
  buildNarrativeBeatPromptBlock,
  narrativeBeatFieldsForPersistence,
  NARRATIVE_BEAT_PROMPT_HEADER,
} from "@/lib/narrative-beats/promptBlocks";

export {
  evaluateMetaphorClarity,
} from "@/lib/narrative-beats/metaphorClarity";

export {
  deriveViewerComprehension,
  informationKeyForBeat,
} from "@/lib/narrative-beats/viewerComprehension";

export {
  validateStoryProgression,
  validateVisualProgression,
} from "@/lib/narrative-beats/storyProgression";

export {
  validateInformationProgression,
  validateBeatInformationProgression,
} from "@/lib/narrative-beats/informationProgression";

export {
  planBeatDurations,
  weightForNarrativeRole,
  NARRATIVE_DURATION_WEIGHTS,
  MAX_BEAT_SHARE,
  VO_JUSTIFICATION_WORD_SHARE,
} from "@/lib/narrative-beats/durationWeights";

export {
  validateDurationPlan,
  MAX_ENDING_SHARE,
  MAX_HOOK_SHARE,
  MIN_ESCALATION_VS_SETUP_RATIO,
} from "@/lib/narrative-beats/durationValidation";

export {
  buildNarrativeTimelineDebug,
} from "@/lib/narrative-beats/timelineDebug";
