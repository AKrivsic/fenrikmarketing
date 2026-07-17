/**
 * Visual Story Director v1 — decision-engine pass.
 *
 * Think like a film director: prefer situations a viewer understands in one
 * second over symbolic objects that only make sense after reading the prompt.
 * Does not remove metaphor — classifies and rejects prompt-dependent riddles.
 */

export const VISUAL_STORY_DIRECTOR_VERSION = "visual-story-director@1" as const;

export type MetaphorClass =
  | "immediately_understandable"
  | "one_mental_step"
  | "requires_prompt_explanation"
  | "office_cliche"
  | "situation";

export interface VisualStoryScores {
  emotional_clarity: number;
  visual_clarity: number;
  immediate_recognisability: number;
  originality: number;
  memorability: number;
  spoken_line_relationship: number;
  cinematic_potential: number;
  /** High when the only strength is symbolism without clarity. */
  symbolism_without_clarity: number;
}

export interface VisualStoryEvaluation {
  accepted: boolean;
  metaphor_class: MetaphorClass;
  scores: VisualStoryScores;
  total: number;
  reject_reasons: string[];
  reasons: string[];
  preferred_situation_framing: string | null;
}

/** Abstract riddles — unusual but not understandable without the prompt. */
export const ABSTRACT_RIDDLE_PATTERNS: readonly RegExp[] = [
  /\bpaper\s+boat\b/i,
  /\btiny\s+paper\s+boat\b/i,
  /\bclosed\s+notebook\b/i,
  /\bnotebook[, ].{0,40}\bunused\b/i,
  /\bnotebook\b.{0,40}\b(answers|knowledge|website)\b/i,
  /\babstract\s+card\b/i,
  /\bembed\s+script\s+card\b/i,
  /\bfloating\s+(object|card|cube|orb|symbol)\b/i,
  /\bglowing\s+(cube|orb|symbol|abstract)\b/i,
  /\brandom\s+notebook\b/i,
  /\bgeneric\s+workshop\b/i,
  /\bmaker\s+workbench\b.{0,80}\b(boat|notebook|card)\b/i,
  /\bbeautiful\s+but\s+unrelated\b/i,
  /\bunrelated\s+architecture\b/i,
  /\bsymbolic\s+object\s+only\b/i,
  /\bobject\s+representing\s+(a\s+)?visitor\b/i,
  /\brepresenting\s+(a\s+)?(visitor|website|embed|chatbot)\b/i,
];

/** Understandable metaphors / situations that must remain allowed. */
export const ALLOWED_SITUATION_PATTERNS: readonly RegExp[] = [
  /\brobot\b.{0,60}\b(work|working|tasks?|automat)/i,
  /\b(automat\w+|robot)\b.{0,40}\b(human|owner|person)\b.{0,40}\b(leave|leaves|drink|sun)/i,
  /\b(graveyard|cemetery|tombstone)\b/i,
  /\bforgotten\s+(brands?|posts?|campaigns?)\b/i,
  /\bfamily\b.{0,40}\b(work|dinner|suitcase)\b/i,
  /\b(work|desk)\b.{0,40}\bfamily\b/i,
  /\bempty\s+(restaurant|tables?|dining)\b/i,
  /\bbanana\b.{0,40}\b(photo|photograph|instagram|post)/i,
  /\b(customer|visitor|buyer)\b.{0,40}\b(walk|walking|leave|leaving|abandon)/i,
  /\b(walk|walking)\s+away\b/i,
  /\bwaiting\s+for\s+(an\s+)?answer\b/i,
  /\bsomeone\s+waiting\b/i,
];

const OFFICE_BACKSLIDE: readonly RegExp[] = [
  /\bdashboard\b/i,
  /\bgeneric\s+meeting\b/i,
  /\bsticky[- ]?notes?\b/i,
  /\bcalm\s+desk\b/i,
  /\blaptop\s+and\s+coffee\b/i,
  /\bmodern\s+office\s+desk\b/i,
];

/** Forced product scenery we also reject as automatic defaults. */
const FORCED_SCENERY: readonly RegExp[] = [
  /\bchatbot\b.{0,40}\b(dashboard|admin\s+panel)\b/i,
  /\b(dashboard|admin\s+panel)\b.{0,40}\bchatbot\b/i,
  /\bchatbot\b.{0,40}\bstorefront\b/i,
  /\bstorefront\b.{0,40}\bchatbot\b/i,
  /\bwebsite\s+chatbot\b.{0,30}\bas\s+a\s+physical\s+store\b/i,
];

function clamp(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n)));
}

export function classifyMetaphor(text: string): MetaphorClass {
  const t = text.trim();
  if (!t) return "requires_prompt_explanation";
  if (OFFICE_BACKSLIDE.some((re) => re.test(t))) return "office_cliche";
  if (ABSTRACT_RIDDLE_PATTERNS.some((re) => re.test(t))) {
    return "requires_prompt_explanation";
  }
  if (ALLOWED_SITUATION_PATTERNS.some((re) => re.test(t))) {
    // Graveyard / robot / banana / walk-away: metaphor or situation with clarity.
    if (
      /\b(graveyard|cemetery|tombstone|robot|banana)\b/i.test(t) ||
      /\b(representing|symbol|metaphor)\b/i.test(t)
    ) {
      return /\b(graveyard|cemetery|robot|banana|family|empty\s+restaurant)\b/i.test(
        t,
      )
        ? "immediately_understandable"
        : "one_mental_step";
    }
    return "situation";
  }
  // Human action verbs → situation bias
  if (
    /\b(walking|leaving|waiting|choosing|arguing|celebrating|abandoning|holding|photographing)\b/i.test(
      t,
    )
  ) {
    return "situation";
  }
  // Lone prop with no human action → likely riddle
  if (
    /\b(boat|notebook|card|cube|orb|plaque|trophy)\b/i.test(t) &&
    !/\b(person|human|customer|visitor|owner|robot|hand)\b/i.test(t)
  ) {
    return "requires_prompt_explanation";
  }
  return "one_mental_step";
}

export function scoreVisualStoryConcept(args: {
  visual: string;
  narrativeSeed?: string | null;
  spokenIdea?: string | null;
}): VisualStoryScores {
  const text = `${args.visual} ${args.narrativeSeed ?? ""}`;
  const spoken = (args.spokenIdea ?? "").toLowerCase();
  const klass = classifyMetaphor(text);

  let emotional_clarity = 5;
  let visual_clarity = 5;
  let immediate_recognisability = 5;
  let originality = 5;
  let memorability = 5;
  let spoken_line_relationship = spoken ? 5 : 6;
  let cinematic_potential = 5;
  let symbolism_without_clarity = 0;

  if (klass === "situation" || klass === "immediately_understandable") {
    emotional_clarity += 3;
    visual_clarity += 3;
    immediate_recognisability += 3;
    cinematic_potential += 2;
    memorability += 2;
  } else if (klass === "one_mental_step") {
    emotional_clarity += 1;
    visual_clarity += 1;
    immediate_recognisability += 1;
    originality += 2;
    memorability += 2;
  } else if (klass === "requires_prompt_explanation") {
    symbolism_without_clarity += 8;
    immediate_recognisability -= 4;
    visual_clarity -= 3;
    emotional_clarity -= 2;
    originality += 2; // unusual ≠ good
  } else if (klass === "office_cliche") {
    originality -= 4;
    memorability -= 3;
    immediate_recognisability += 1;
  }

  if (ALLOWED_SITUATION_PATTERNS.some((re) => re.test(text))) {
    originality += 1;
    memorability += 2;
  }
  if (ABSTRACT_RIDDLE_PATTERNS.some((re) => re.test(text))) {
    symbolism_without_clarity += 4;
  }
  if (spoken) {
    const tokens = spoken.split(/\W+/).filter((w) => w.length > 4).slice(0, 8);
    const hits = tokens.filter((w) => text.toLowerCase().includes(w)).length;
    spoken_line_relationship += Math.min(3, hits);
  }

  return {
    emotional_clarity: clamp(emotional_clarity),
    visual_clarity: clamp(visual_clarity),
    immediate_recognisability: clamp(immediate_recognisability),
    originality: clamp(originality),
    memorability: clamp(memorability),
    spoken_line_relationship: clamp(spoken_line_relationship),
    cinematic_potential: clamp(cinematic_potential),
    symbolism_without_clarity: clamp(symbolism_without_clarity),
  };
}

function totalScore(s: VisualStoryScores): number {
  return (
    s.emotional_clarity +
    s.visual_clarity +
    s.immediate_recognisability +
    s.originality +
    s.memorability +
    s.spoken_line_relationship +
    s.cinematic_potential -
    s.symbolism_without_clarity * 2
  );
}

/**
 * Situation a human director would film for common website/chatbot pains.
 * Prompt guidance — not a hardcoded template to repeat.
 */
export function situationFirstFraming(args: {
  topic?: string | null;
  angle?: string | null;
  painPoints?: readonly string[];
  productIs?: readonly string[];
}): string {
  const blob = [
    args.topic ?? "",
    args.angle ?? "",
    ...(args.painPoints ?? []),
    ...(args.productIs ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (/leave|leaving|abandon|walk away|silent|unanswered|no one answered/.test(blob)) {
    return (
      "Situation first: film a person walking away unanswered / waiting for a reply — " +
      "NOT a paper boat, closed notebook, or abstract prop standing in for the visitor."
    );
  }
  if (/automat|done.?for.?you|save time|after hours|24\/?7/.test(blob)) {
    return (
      "Situation first: film work continuing while a human leaves or rests " +
      "(role reversal / robot or system at work) — NOT a glowing cube or abstract card."
    );
  }
  if (/know|answers|faq|same questions|knowledge/.test(blob)) {
    return (
      "Situation first: film someone waiting for an answer that never comes — " +
      "NOT a closed notebook that 'represents' website knowledge."
    );
  }
  if (/forgot|forgotten|ignored|invisible/.test(blob)) {
    return (
      "Situation first: a clear forgotten-brand / forgotten-post metaphor is fine " +
      "(e.g. cemetery of unmarked campaigns) — avoid random floating objects."
    );
  }
  return (
    "Situation first: ask what a human director would film for this beat before " +
    "picking a symbolic object. Prefer immediate emotional relationships over props that need explanation."
  );
}

export function evaluateVisualStoryConcept(args: {
  visual: string;
  narrativeSeed?: string | null;
  spokenIdea?: string | null;
  topic?: string | null;
  angle?: string | null;
  painPoints?: readonly string[];
  productIs?: readonly string[];
}): VisualStoryEvaluation {
  const text = args.visual;
  const reject_reasons: string[] = [];
  const reasons: string[] = [];
  const metaphor_class = classifyMetaphor(`${text} ${args.narrativeSeed ?? ""}`);
  const scores = scoreVisualStoryConcept(args);
  const total = totalScore(scores);
  const framing = situationFirstFraming(args);

  for (const re of ABSTRACT_RIDDLE_PATTERNS) {
    if (re.test(text)) {
      reject_reasons.push(`abstract_riddle:${re.source}`);
    }
  }
  for (const re of FORCED_SCENERY) {
    if (re.test(text)) {
      reject_reasons.push(`forced_scenery:${re.source}`);
    }
  }
  if (metaphor_class === "requires_prompt_explanation") {
    reject_reasons.push("metaphor_requires_prompt_explanation");
  }
  if (metaphor_class === "office_cliche") {
    reject_reasons.push("office_cliche_backslide");
  }
  if (scores.symbolism_without_clarity >= 6 && scores.immediate_recognisability <= 4) {
    reject_reasons.push("symbolism_without_clarity");
  }
  // Originality that is only "unusual" with low clarity → reject
  if (scores.originality >= 7 && scores.immediate_recognisability <= 3) {
    reject_reasons.push("originality_without_understanding");
  }

  // Allowed situations always win over riddle rejection if pattern matches strongly
  const allowed = ALLOWED_SITUATION_PATTERNS.some((re) => re.test(text));
  if (allowed) {
    reasons.push("allowed_understandable_situation_or_metaphor");
    // Strip riddle rejects that falsely fire on overlapping words
    const cleaned = reject_reasons.filter(
      (r) =>
        !r.startsWith("abstract_riddle:") &&
        r !== "metaphor_requires_prompt_explanation" &&
        r !== "symbolism_without_clarity" &&
        r !== "originality_without_understanding",
    );
    reject_reasons.length = 0;
    reject_reasons.push(...cleaned);
  }

  if (metaphor_class === "immediately_understandable" || metaphor_class === "situation") {
    reasons.push(`class:${metaphor_class}`);
  } else if (metaphor_class === "one_mental_step") {
    reasons.push("class:one_mental_step_acceptable");
  }

  const accepted = reject_reasons.length === 0 && total >= 18;
  if (!accepted && reject_reasons.length === 0) {
    reject_reasons.push("score_too_low_for_story_clarity");
  }

  return {
    accepted,
    metaphor_class,
    scores,
    total,
    reject_reasons,
    reasons,
    preferred_situation_framing: framing,
  };
}

export function runVisualDirectorPass<T extends { id: string; visual_concept: string; narrative_seed?: string }>(
  candidates: readonly T[],
  ctx: {
    spokenIdea?: string | null;
    topic?: string | null;
    angle?: string | null;
    painPoints?: readonly string[];
    productIs?: readonly string[];
  },
): {
  evaluations: Record<string, VisualStoryEvaluation>;
  acceptedIds: string[];
  rejectedIds: string[];
  preferred_situation_framing: string;
} {
  const evaluations: Record<string, VisualStoryEvaluation> = {};
  const acceptedIds: string[] = [];
  const rejectedIds: string[] = [];
  let framing = situationFirstFraming(ctx);

  for (const c of candidates) {
    const ev = evaluateVisualStoryConcept({
      visual: c.visual_concept,
      narrativeSeed: c.narrative_seed,
      spokenIdea: ctx.spokenIdea,
      topic: ctx.topic,
      angle: ctx.angle,
      painPoints: ctx.painPoints,
      productIs: ctx.productIs,
    });
    evaluations[c.id] = ev;
    if (ev.preferred_situation_framing) framing = ev.preferred_situation_framing;
    if (ev.accepted) acceptedIds.push(c.id);
    else rejectedIds.push(c.id);
  }

  return {
    evaluations,
    acceptedIds,
    rejectedIds,
    preferred_situation_framing: framing,
  };
}
