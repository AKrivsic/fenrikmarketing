import { attentionSpec } from "@/lib/attention/catalog";
import {
  isGenericOfficeHumor,
  isNotebookVsPaperDilemma,
  matchesOfficeCliche,
} from "@/lib/attention/cliches";
import { hashString } from "@/lib/creative-identity/hash";
import type {
  AttentionMechanism,
  OpeningConceptCandidate,
  OpeningEmotionalEffect,
  OriginalityPass,
} from "@/lib/attention/types";
import { evaluateVisualStoryConcept } from "@/lib/visual-narrative/visualStoryDirector";

export interface OriginalityInput {
  mechanism: AttentionMechanism;
  topic: string;
  angle: string | null | undefined;
  painPoints: readonly string[];
  productIs: readonly string[];
  audienceSummary?: string | null;
  industryHint?: string | null;
  seed: string;
}

function primaryPain(painPoints: readonly string[]): string {
  const p = painPoints.find((x) => x.trim());
  return p?.trim() || "the same work looping every week";
}

function primaryProduct(productIs: readonly string[]): string {
  const p = productIs.find((x) => x.trim());
  return p?.trim() || "the product";
}

function industryCue(industryHint: string | null | undefined, topic: string): string {
  if (industryHint?.trim()) return industryHint.trim();
  return topic.trim() || "this work";
}

function emotionalForMechanism(
  mechanism: AttentionMechanism,
  candidate: OpeningConceptCandidate["id"],
): OpeningEmotionalEffect {
  const map: Record<AttentionMechanism, OpeningEmotionalEffect> = {
    DILEMMA: "dilemma",
    HUMOR: "humor",
    IRONY: "humor",
    ABSURD_ASSOCIATION: "unexpected_association",
    VISUAL_METAPHOR: "unexpected_association",
    ROLE_REVERSAL: "surprise",
    PROVOCATIVE_OPINION: "strong_opinion",
    CURIOSITY_GAP: "curiosity",
    FRUSTRATION: "frustration",
    RELIEF: "relief",
    WISH_FULFILMENT: "aspiration",
    UNEXPECTED_COMPARISON: "unexpected_association",
    HUMAN_CONFLICT: "tension",
    SURPRISE: "surprise",
    SATISFACTION: "recognition",
    CONTRAST: "tension",
  };
  if (candidate === "unexpected" && mechanism === "HUMOR") return "humor";
  if (candidate === "unexpected" && mechanism === "DILEMMA") return "dilemma";
  return map[mechanism];
}

function buildCandidates(input: OriginalityInput): OpeningConceptCandidate[] {
  const pain = primaryPain(input.painPoints);
  const product = primaryProduct(input.productIs);
  const industry = industryCue(input.industryHint, input.topic);
  const angle = (input.angle ?? "").trim() || input.topic;
  const spec = attentionSpec(input.mechanism);
  const h = hashString(input.seed);

  // Candidate banks are generative scaffolds keyed by mechanism — not hardcoded
  // viral templates. Industry + pain + product keep them relevant.
  const obviousVisual = (() => {
    switch (input.mechanism) {
      case "DILEMMA":
        return `A person at a desk choosing between a notebook and a stack of papers about ${industry}`;
      case "HUMOR":
        return `A busy entrepreneur at a laptop looking stressed about ${pain}`;
      case "FRUSTRATION":
        return `Calm desk frustration: someone staring at a laptop surrounded by sticky notes about ${pain}`;
      case "VISUAL_METAPHOR":
        return `An empty whiteboard as the only metaphor for ${angle}`;
      default:
        return `A modern office desk with laptop and coffee illustrating ${angle}`;
    }
  })();

  const lessObviousVisual = (() => {
    switch (input.mechanism) {
      case "DILEMMA":
        return `Split frame: one side a family dinner going cold, the other side unread content drafts for ${industry}`;
      case "HUMOR":
        return `Someone photographing a banana on a kitchen counter because they have no better post idea for ${industry}`;
      case "ROLE_REVERSAL":
        return `A small robot calmly finishing ${product} tasks while the human walks out with a drink`;
      case "ABSURD_ASSOCIATION":
        return `A quiet cemetery of unmarked posts — forgotten content graves for ${industry}`;
      case "WISH_FULFILMENT":
        return `Someone leaving the desk with a drink while automation keeps publishing for ${product}`;
      case "FRUSTRATION":
        return `A phone screen filling with "do it five more times" after celebrating one finished post about ${pain}`;
      case "PROVOCATIVE_OPINION":
        return `A bold handwritten sign being taped over a polished corporate slogan about ${angle}`;
      case "HUMAN_CONFLICT":
        return `Two colleagues mid-argument over whose turn it is to invent another post for ${industry}`;
      case "CONTRAST":
        return `Snap change: exhausted midnight posting vs morning already handled by ${product}`;
      case "SURPRISE":
        return `A reveal: the "content team" is one tired person wearing five different hats for ${industry}`;
      default:
        return `A concrete human moment from ${industry} that makes ${pain} visible in one glance`;
    }
  })();

  const unexpectedVisual = (() => {
    const variants: Record<AttentionMechanism, string[]> = {
      DILEMMA: [
        `Hand hovering over a packed suitcase while a glowing "post now" reminder buzzes about ${industry}`,
        `A parent at a school gate glancing at a content calendar notification about ${pain}`,
      ],
      HUMOR: [
        `Victory dance after one post — then a manager silhouette holding up five more identical tasks for ${industry}`,
        `A banana "photoshoot" setup with ring light and tiny props, captioning despair about ${pain}`,
      ],
      IRONY: [
        `A "we post daily" plaque hanging above a dark, silent phone for ${industry}`,
        `A productivity trophy collecting dust next to an overflowing unread ideas pile about ${angle}`,
      ],
      ABSURD_ASSOCIATION: [
        `Cemetery of tiny tombstones labeled with forgotten posts for ${industry}`,
        `A museum glass case displaying last month's "urgent" campaign no one remembers`,
      ],
      VISUAL_METAPHOR: [
        `A leaking hourglass filled with unread drafts instead of sand for ${pain}`,
        `A conveyor belt of identical posts dumping into a fog for ${industry}`,
      ],
      ROLE_REVERSAL: [
        `Robot in a tiny apron serving finished content while the human stretches in sunlight`,
        `${product} working the night shift; human asleep with lights off`,
      ],
      PROVOCATIVE_OPINION: [
        `Crossing out "post more" on a wall plan and writing "say one true thing" for ${industry}`,
        `A megaphone pointed at an empty room — volume without substance about ${angle}`,
      ],
      CURIOSITY_GAP: [
        `A covered tray being lifted to reveal the real reason ${pain} keeps returning`,
        `A door cracked open onto the unfinished half of a ${industry} story`,
      ],
      FRUSTRATION: [
        `Same notification stacking: "nice — now do five more" after finishing one ${industry} post`,
        `Hands crumpling a "content idea" sticky that says only "post something"`,
      ],
      RELIEF: [
        `Shoulders dropping as a phone shows scheduled posts while the person steps outside`,
        `Closing a laptop mid-spiral as ${product} takes the remaining queue`,
      ],
      WISH_FULFILMENT: [
        `Leaving the desk with a cold drink while a calm system keeps ${industry} content moving`,
        `Beach bag by the door; laptop lid closing; ${product} still ticking`,
      ],
      UNEXPECTED_COMPARISON: [
        `Dentist waiting room anxiety mapped onto waiting for a content idea for ${industry}`,
        `Kitchen fire drill energy applied to last-minute posting for ${pain}`,
      ],
      HUMAN_CONFLICT: [
        `Client pointing at a phone while the owner mouths "I already posted" about ${industry}`,
        `Partner showing a calendar full of life events next to a content backlog`,
      ],
      SURPRISE: [
        `Pull-back reveal: the polished brand feed is run from a kitchen counter at midnight`,
        `The "strategy board" is actually a fridge door with one magnet left for ${angle}`,
      ],
      SATISFACTION: [
        `One decisive stamp of "done" that actually stays done because ${product} continues`,
        `A clean queue emptying in satisfying order for ${industry}`,
      ],
      CONTRAST: [
        `Left: drowning in drafts. Right: one clear system for ${product}`,
        `Split screen: chaos posting vs calm scheduled rhythm for ${industry}`,
      ],
    };
    const list = variants[input.mechanism];
    return list[h % list.length]!;
  })();

  const mk = (
    id: OpeningConceptCandidate["id"],
    visual: string,
    narrative: string,
    scores: OpeningConceptCandidate["scores"],
  ): OpeningConceptCandidate => ({
    id,
    label: id,
    visual_concept: visual,
    narrative_seed: narrative,
    emotional_effect: emotionalForMechanism(input.mechanism, id),
    scores,
    rejected: false,
    reject_reasons: [],
  });

  return [
    mk(
      "obvious",
      obviousVisual,
      `Literal take on ${spec.name}: explain ${angle} with the most expected ${industry} image.`,
      {
        recognisability: 8,
        emotional_reaction: 3,
        novelty: 1,
        relevance: 7,
        visual_clarity: 7,
        what_happens_next: 2,
      },
    ),
    mk(
      "less_obvious",
      lessObviousVisual,
      `Less literal take: dramatize ${pain} through a specific human moment still tied to ${product}.`,
      {
        recognisability: 7,
        emotional_reaction: 7,
        novelty: 6,
        relevance: 8,
        visual_clarity: 7,
        what_happens_next: 7,
      },
    ),
    mk(
      "unexpected",
      unexpectedVisual,
      `Unexpected but relevant: ${spec.script_guidance} Keep the link to ${angle} / ${pain} clear by the next beat.`,
      {
        recognisability: 6,
        emotional_reaction: 9,
        novelty: 9,
        relevance: 7,
        visual_clarity: 6,
        what_happens_next: 9,
      },
    ),
  ];
}

function totalScore(c: OpeningConceptCandidate): number {
  const s = c.scores;
  return (
    s.recognisability +
    s.emotional_reaction +
    s.novelty +
    s.relevance +
    s.visual_clarity +
    s.what_happens_next
  );
}

function applyRejections(
  candidates: OpeningConceptCandidate[],
  mechanism: AttentionMechanism,
): OpeningConceptCandidate[] {
  return candidates.map((c) => {
    const reject_reasons: string[] = [];
    const cliche = matchesOfficeCliche(c.visual_concept);
    if (cliche) reject_reasons.push(`office_cliche:${cliche}`);
    if (mechanism === "DILEMMA" && isNotebookVsPaperDilemma(c.visual_concept)) {
      reject_reasons.push("dilemma_notebook_vs_paper");
    }
    if (mechanism === "HUMOR" && isGenericOfficeHumor(c.visual_concept)) {
      reject_reasons.push("generic_office_humor");
    }
    if (c.id === "obvious" && (cliche || c.scores.novelty <= 2)) {
      reject_reasons.push("first_obvious_idea");
    }
    // Unexpected must still look connected — if relevance collapses, reject.
    if (c.id === "unexpected" && c.scores.relevance < 5) {
      reject_reasons.push("unexpected_but_unconnected");
    }

    // Visual Story Director: reject abstract riddles; keep clear metaphors / situations.
    const story = evaluateVisualStoryConcept({
      visual: c.visual_concept,
      narrativeSeed: c.narrative_seed,
      spokenIdea: mechanism,
    });
    const hardStoryReject = story.reject_reasons.find(
      (r) =>
        r.startsWith("abstract_riddle:") ||
        r.startsWith("forced_scenery:") ||
        r === "metaphor_requires_prompt_explanation" ||
        r === "office_cliche_backslide" ||
        r === "symbolism_without_clarity" ||
        r === "originality_without_understanding",
    );
    if (hardStoryReject) {
      reject_reasons.push(`visual_story:${hardStoryReject}`);
    } else if (
      c.id === "unexpected" &&
      story.metaphor_class === "requires_prompt_explanation"
    ) {
      reject_reasons.push("visual_story:unexpected_needs_caption");
    } else if (
      story.scores.originality >= 8 &&
      story.scores.emotional_clarity <= 4 &&
      story.scores.immediate_recognisability <= 4
    ) {
      // Originality that is only "unusual" without clarity → randomness.
      reject_reasons.push("visual_story:originality_without_clarity");
    }

    return {
      ...c,
      rejected: reject_reasons.length > 0,
      reject_reasons,
    };
  });
}

export function runOriginalityPass(input: OriginalityInput): OriginalityPass {
  const raw = buildCandidates(input);
  const candidates = applyRejections(raw, input.mechanism);
  const eligible = candidates.filter((c) => !c.rejected);
  const pool = eligible.length > 0 ? eligible : candidates.filter((c) => c.id !== "obvious");
  const finalPool = pool.length > 0 ? pool : candidates;

  let selected = finalPool[0]!;
  for (const c of finalPool) {
    if (totalScore(c) > totalScore(selected)) selected = c;
  }

  // Prefer unexpected/less_obvious when scores are close and obvious is rejected.
  const nonObvious = finalPool.filter((c) => c.id !== "obvious");
  if (selected.id === "obvious" && nonObvious.length > 0) {
    selected = nonObvious.sort((a, b) => totalScore(b) - totalScore(a))[0]!;
  }

  return {
    candidates,
    selected_candidate_id: selected.id,
    selected_visual_concept: selected.visual_concept,
    selected_narrative_seed: selected.narrative_seed,
    selected_emotional_effect: selected.emotional_effect,
    reject_summary: candidates.flatMap((c) =>
      c.reject_reasons.map((r) => `${c.id}:${r}`),
    ),
  };
}
