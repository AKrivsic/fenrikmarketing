/**
 * Narrative Beats — lightweight story spine derived from the Creative Candidate.
 * No new LLM call. Sits between Creative Candidate and Storyboard in the prompt.
 */

export const NARRATIVE_BEAT_VERSION = "narrative-beats@1.1" as const;

export const NARRATIVE_BEAT_ROLES = [
  "HOOK",
  "SETUP",
  "ESCALATION",
  "RESOLUTION",
] as const;

export type NarrativeBeatRole = (typeof NARRATIVE_BEAT_ROLES)[number];

/** Deterministic model of what the viewer holds after this beat. */
export interface ViewerComprehension {
  /** What the viewer now understands. */
  viewer_understands: string;
  /** Open question in the viewer's mind ("none" when closed). */
  viewer_question: string;
  /** What the viewer expects next. */
  viewer_expectation: string;
}

export interface NarrativeBeat {
  role: NarrativeBeatRole;
  /** What the viewer learns in this beat (story content). */
  viewerLearns: string;
  /** What changed since the previous beat (empty for HOOK). */
  whatChanged: string;
  /** Why the viewer should keep watching. */
  whyContinue: string;
  /** Explicit comprehension model for this beat. */
  comprehension: ViewerComprehension;
  /** Compact semantic information key for progression checks. */
  informationKey: string;
  /** Candidate fields that fed this beat. */
  sourceFields: string[];
  /** Creative-mode beat labels mapped onto this structural role. */
  modeBeatLabels: string[];
}

export interface NarrativeBeatPlan {
  version: typeof NARRATIVE_BEAT_VERSION;
  beats: NarrativeBeat[];
  /** Consecutive-beat state / information collision warnings. */
  progressionWarnings: string[];
  /** Pre-LLM information-progression diagnostics (beats). */
  informationProgression: InformationProgressionDiagnostics;
  /** Metaphor clarity for the opening (diagnostics + prompt guidance). */
  metaphorClarity: MetaphorClarityDiagnostic;
  /**
   * Corrective prompt guidance derived BEFORE the LLM call.
   * Injected into the storyboard/VO prompt — no regenerate / no new call.
   */
  correctiveGuidance: string | null;
}

export interface MetaphorClarityDiagnostic {
  /** Legacy ~10s heuristic (kept for backward-compatible consumers). */
  understandableWithin10s: boolean;
  /** Can the viewer decode the metaphor within ~first third of the video? */
  understandableWithinFirstThird: boolean;
  metaphorClass: string;
  preferEarlyProductProblem: boolean;
  reasons: string[];
  guidance: string | null;
}

export interface StoryProgressionPairWarning {
  indexA: number;
  indexB: number;
  reasons: string[];
  sameLocation: boolean;
  sameAction: boolean;
  sameNarrativeState: boolean;
  noEscalation: boolean;
}

export interface StoryProgressionDiagnostics {
  version: "story-progression@1";
  passed: boolean;
  warnings: StoryProgressionPairWarning[];
  summary: string[];
}

export interface VisualProgressionDiagnostics {
  version: "visual-progression@1";
  passed: boolean;
  warnings: Array<{
    indexA: number;
    indexB: number;
    changed: {
      location: boolean;
      action: boolean;
      information: boolean;
      emotion: boolean;
      stakes: boolean;
    };
    reasons: string[];
  }>;
  summary: string[];
}

export interface InformationProgressionPairWarning {
  indexA: number;
  indexB: number;
  informationKeyA: string;
  informationKeyB: string;
  overlap: number;
  reasons: string[];
  /** True when images/locations differ but information does not advance. */
  sameInformationDifferentSurface: boolean;
}

export interface InformationProgressionDiagnostics {
  version: "information-progression@1";
  passed: boolean;
  warnings: InformationProgressionPairWarning[];
  summary: string[];
  /** Corrective guidance to inject into the prompt when failed pre-LLM. */
  correctiveGuidance: string | null;
}

export interface DurationValidationDiagnostics {
  version: "duration-validation@1";
  passed: boolean;
  warnings: string[];
  summary: string[];
  shares: number[];
}

/**
 * Developer-friendly debug spine for one package generation.
 * No UI required — persisted under presentation_generation when available.
 */
export interface NarrativeTimelineDebug {
  version: "narrative-timeline-debug@1";
  creative_candidate: {
    candidateId: string;
    family: string;
    hookLine: string;
    openingSituation: string;
    coreIdea: string;
    storyProgression: string;
    productConnection: string;
    ending: string;
  } | null;
  narrative_beats: Array<{
    role: NarrativeBeatRole;
    viewerLearns: string;
    whatChanged: string;
    whyContinue: string;
    informationKey: string;
    modeBeatLabels: string[];
  }>;
  viewer_comprehension: ViewerComprehension[];
  storyboard: {
    sceneCount: number;
    sceneSummaries: string[];
  } | null;
  voiceover: {
    text: string;
    wordCount: number;
  } | null;
  duration_plan: {
    roles: string[];
    durationsSeconds: number[];
    shares: number[];
    justifiedOverMax: boolean[];
    validation: DurationValidationDiagnostics | null;
  } | null;
  timeline: Array<{
    index: number;
    role: string;
    durationSeconds: number | null;
    share: number | null;
    comprehension: ViewerComprehension | null;
    informationKey: string | null;
    sceneSummary: string | null;
  }>;
  metaphor_clarity: MetaphorClarityDiagnostic | null;
  information_progression: InformationProgressionDiagnostics | null;
  corrective_guidance: string | null;
}
