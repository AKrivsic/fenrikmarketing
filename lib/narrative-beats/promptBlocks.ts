import type {
  DurationValidationDiagnostics,
  InformationProgressionDiagnostics,
  NarrativeBeatPlan,
  NarrativeTimelineDebug,
  StoryProgressionDiagnostics,
  VisualProgressionDiagnostics,
} from "@/lib/narrative-beats/types";
import { NARRATIVE_BEAT_VERSION } from "@/lib/narrative-beats/types";

export const NARRATIVE_BEAT_PROMPT_HEADER = "NARRATIVE BEATS";

// Phase 2B ownership:
//   Story Structure owner: MODE BEATS / StoryStructurePack only (C1 resolved).
//   This block is Candidate-derived comprehension + progression guidance —
//   labels map onto MODE BEATS; it must NOT inject a competing required arc.

/**
 * Prompt block between Creative Candidate and visual/storyboard generation.
 * Includes viewer comprehension + any pre-LLM corrective guidance
 * (validator escalation without regenerate).
 */
export function buildNarrativeBeatPromptBlock(
  plan: NarrativeBeatPlan,
  opts?: { modeBeatArc?: string },
): string {
  const modeArc =
    opts?.modeBeatArc?.trim() ||
    "(see MODE BEATS / StoryStructurePack — authoritative structure)";
  const lines: string[] = [
    `${NARRATIVE_BEAT_PROMPT_HEADER} (${NARRATIVE_BEAT_VERSION}):`,
    "Derived from the selected Creative Candidate — NOT a new concept.",
    "Map voiceover_text and visual_scenes onto these Candidate-derived beat labels.",
    `Authoritative story structure is MODE BEATS only: ${modeArc}.`,
    "HOOK / SETUP / ESCALATION / RESOLUTION here are comprehension labels mapped",
    "onto that MODE BEATS structure — NOT a second required story grammar.",
    "",
    "Every beat must introduce NEW INFORMATION (not just a new camera or device).",
    "Never let two consecutive beats communicate the same claim",
    "(e.g. unanswered channel A → unanswered channel B is still a failure).",
    "Prefer: anomaly → problem named → cost/failure → solution.",
    "",
    "OPENING MEANING BLOCK (Attention First):",
    "- HOOK is the first meaning unit of the story — complete the curiosity/stakes spike",
    "  before SETUP explains or lectures.",
    "- Voiceover: the first spoken meaning unit MUST finish the hook thought;",
    "  SETUP information starts only after that unit.",
    "- Visual: visual_scenes[0] carries the HOOK event/meaning — not SETUP exposition.",
    "- Tempo may vary; do not pad SETUP into the opening meaning block.",
    "",
  ];

  for (const beat of plan.beats) {
    const mode =
      beat.modeBeatLabels.length > 0
        ? ` [mode: ${beat.modeBeatLabels.join(" → ")}]`
        : "";
    const c = beat.comprehension;
    lines.push(`${beat.role}${mode}:`);
    lines.push(`  - Viewer learns: ${beat.viewerLearns}`);
    lines.push(
      `  - What changed: ${beat.whatChanged || "(cold open — first state)"}`,
    );
    lines.push(`  - Why continue: ${beat.whyContinue}`);
    lines.push(`  - viewer_understands: ${c.viewer_understands}`);
    lines.push(`  - viewer_question: ${c.viewer_question}`);
    lines.push(`  - viewer_expectation: ${c.viewer_expectation}`);
    lines.push(`  - information_key: ${beat.informationKey}`);
    lines.push("");
  }

  lines.push("Hard rules for visual_scenes + voiceover:");
  lines.push(
    "- INFORMATION must advance every beat — surface changes alone do not count.",
  );
  lines.push(
    "- Each scene must change at least one of: location, action, information, emotion, stakes.",
  );
  lines.push(
    "- Escalation must show failure or rising cost — not a second angle on the same setup.",
  );
  lines.push(
    "- Resolution must VISUALLY show the product solving the problem",
    "  (AI reply appears / booking confirmed / lead captured / conversation continues).",
    "- Resolution must NOT be a smile, success pose, floating chat icon, or landing page.",
    "- Keep PRIMARY_ACTOR continuous — same person across beats; no identity swaps for variety.",
  );
  lines.push(
    "- Voiceover must track viewer_question → viewer_expectation across the arc.",
  );

  if (plan.progressionWarnings.length > 0) {
    lines.push("");
    lines.push(
      `Internal progression notes: ${plan.progressionWarnings.join(", ")}`,
    );
  }

  // Validator escalation: inject corrective guidance BEFORE generation.
  if (plan.correctiveGuidance) {
    lines.push("");
    lines.push(plan.correctiveGuidance);
  } else if (plan.metaphorClarity.guidance) {
    lines.push("");
    lines.push(plan.metaphorClarity.guidance);
  }

  return lines.join("\n");
}

/** Persist narrative beats + optional post-LLM diagnostics on package_brief. */
export function narrativeBeatFieldsForPersistence(
  plan: NarrativeBeatPlan,
  extras?: {
    storyProgression?: StoryProgressionDiagnostics | null;
    visualProgression?: VisualProgressionDiagnostics | null;
    informationProgression?: InformationProgressionDiagnostics | null;
    durationValidation?: DurationValidationDiagnostics | null;
    timelineDebug?: NarrativeTimelineDebug | null;
  },
): Record<string, unknown> {
  return {
    narrative_beats: {
      version: plan.version,
      beats: plan.beats,
      progressionWarnings: plan.progressionWarnings,
      informationProgression: plan.informationProgression,
      metaphorClarity: plan.metaphorClarity,
      correctiveGuidance: plan.correctiveGuidance,
      ...(extras?.storyProgression
        ? { storyProgressionDiagnostics: extras.storyProgression }
        : {}),
      ...(extras?.visualProgression
        ? { visualProgressionDiagnostics: extras.visualProgression }
        : {}),
      ...(extras?.informationProgression
        ? { postLlmInformationProgression: extras.informationProgression }
        : {}),
      ...(extras?.durationValidation
        ? { durationValidation: extras.durationValidation }
        : {}),
      ...(extras?.timelineDebug
        ? { timeline_debug: extras.timelineDebug }
        : {}),
    },
  };
}
