import {
  classifyMetaphor,
  evaluateVisualStoryConcept,
} from "@/lib/visual-narrative/visualStoryDirector";
import type { MetaphorClarityDiagnostic } from "@/lib/narrative-beats/types";

/**
 * Deterministic clarity check:
 * Would a first-time viewer understand what this metaphor represents
 * within roughly the first third of the video (~10s on a ~30s short)?
 *
 * Does NOT remove metaphors — when unclear, requires earlier explanation
 * so creativity stays and comprehension rises.
 */
export function evaluateMetaphorClarity(args: {
  openingSituation: string;
  hookLine?: string | null;
  coreIdea?: string | null;
  productConnection?: string | null;
  topic?: string | null;
  angle?: string | null;
  painPoints?: readonly string[];
  productIs?: readonly string[];
}): MetaphorClarityDiagnostic {
  const visual = args.openingSituation.trim();
  const spoken = [args.hookLine, args.coreIdea].filter(Boolean).join(" ");
  const ev = evaluateVisualStoryConcept({
    visual,
    narrativeSeed: args.coreIdea,
    spokenIdea: spoken,
    topic: args.topic,
    angle: args.angle,
    painPoints: args.painPoints,
    productIs: args.productIs,
  });
  const klass = classifyMetaphor(visual);
  const clearClass =
    klass === "immediately_understandable" ||
    klass === "situation" ||
    klass === "one_mental_step";
  const understandableWithin10s = ev.accepted && clearClass;

  // First-third bar is stricter for prompt-dependent riddles / symbolism.
  const requiresPrompt =
    klass === "requires_prompt_explanation" ||
    ev.reject_reasons.includes("metaphor_requires_prompt_explanation") ||
    ev.reject_reasons.includes("symbolism_without_clarity") ||
    ev.reject_reasons.includes("originality_without_understanding");

  const spokenBridgesMetaphor =
    Boolean(args.hookLine) &&
    Boolean(args.coreIdea) &&
    /\b(website|visitor|lead|answer|chat|customer|missed|unanswered)\b/i.test(
      `${args.hookLine} ${args.coreIdea}`,
    );

  const understandableWithinFirstThird =
    understandableWithin10s &&
    !requiresPrompt &&
    (clearClass || spokenBridgesMetaphor);

  const preferEarlyProductProblem =
    !understandableWithinFirstThird ||
    !clearClass ||
    requiresPrompt;

  const reasons = [
    `class:${klass}`,
    ...(understandableWithin10s
      ? ["understandable_within_~10s"]
      : ["not_clear_within_~10s"]),
    ...(understandableWithinFirstThird
      ? ["understandable_within_first_third"]
      : ["not_clear_within_first_third"]),
    ...ev.reject_reasons.slice(0, 4),
  ];

  let guidance: string | null = null;
  if (preferEarlyProductProblem) {
    const strength = requiresPrompt || !clearClass ? "STRONG" : "STANDARD";
    guidance = [
      `METAPHOR CLARITY ${strength} (deterministic — keep the metaphor, explain sooner):`,
      "- A first-time viewer may not decode what the opening metaphor represents",
      "  within the first third of the video.",
      "- Do NOT drop the creative metaphor.",
      "- By the end of SETUP (first ~1/3), the spoken voiceover MUST name the concrete",
      "  product problem the metaphor stands for (e.g. unanswered website visitors / missed leads).",
      "- Scene 1 may stay metaphorical; scene 2 + narration must make the referent obvious.",
      "- Prefer: metaphor image → spoken bridge ('this is your website…') → consequence → solution.",
      args.productConnection
        ? `- Product bridge to surface in the first third: ${args.productConnection}`
        : "- Surface the product pain from Project Brain in the first third of narration.",
      args.coreIdea
        ? `- Core idea to land early: ${args.coreIdea}`
        : null,
      ev.preferred_situation_framing
        ? `- Director framing: ${ev.preferred_situation_framing}`
        : null,
      strength === "STRONG"
        ? "- HARD: if the metaphor needs the prompt to make sense, the first spoken third must decode it."
        : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return {
    understandableWithin10s,
    understandableWithinFirstThird,
    metaphorClass: klass,
    preferEarlyProductProblem,
    reasons,
    guidance,
  };
}
