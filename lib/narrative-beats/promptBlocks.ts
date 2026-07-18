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

/**
 * Prompt block between Creative Candidate and visual/storyboard generation.
 * Includes viewer comprehension + any pre-LLM corrective guidance
 * (validator escalation without regenerate).
 */
export function buildNarrativeBeatPromptBlock(
  plan: NarrativeBeatPlan,
): string {
  const lines: string[] = [
    `${NARRATIVE_BEAT_PROMPT_HEADER} (${NARRATIVE_BEAT_VERSION}):`,
    "Derived from the selected Creative Candidate — NOT a new concept.",
    "Map voiceover_text and visual_scenes onto this story spine.",
    "MODE BEATS still label tone/structure; these beats are the STORY progression.",
    "",
    "Required arc: HOOK → SETUP → ESCALATION → RESOLUTION",
    "Every beat must introduce NEW INFORMATION (not just a new camera or device).",
    "Never let two consecutive beats communicate the same claim",
    "(e.g. phone unanswered → laptop unanswered is still a failure).",
    "Prefer: anomaly → problem named → cost/failure → solution.",
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
