import type { Project } from "@/lib/supabase/types";
import type { CreativeIdentity } from "@/lib/creative-identity/types";
import { pickFrom } from "@/lib/creative-identity/hash";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import type { FunnelStage } from "@/lib/ai/types";
import {
  aggregateRecentMotifCounts,
  dominantMotifs,
} from "@/lib/visual-narrative/motifMemory";
import { productVisualWorldHints } from "@/lib/visual-narrative/productVisualWorld";
import {
  MEANING_CARRIERS,
  VISUAL_NARRATIVE_VERSION,
  type MeaningCarrier,
  type VisualNarrativePlan,
} from "@/lib/visual-narrative/types";
import {
  VISUAL_STORY_DIRECTOR_VERSION,
  situationFirstFraming,
} from "@/lib/visual-narrative/visualStoryDirector";

export interface ResolveVisualNarrativeInput {
  project: Project;
  identity: CreativeIdentity | null;
  seed: string;
  series: SeriesCreativeContext;
  funnelStage: FunnelStage;
  recentPrimaryCarrierKeys?: readonly string[];
  topic?: string | null;
  angle?: string | null;
}

const MAX_CARRIER_COLLISION_ATTEMPTS = 32;

/**
 * Subject pools are situation-first: what a director would film,
 * not which prop "represents" the idea.
 */
const SUBJECT_POOL: Record<MeaningCarrier, readonly string[]> = {
  human: [
    "a specific role from the audience in a readable emotional moment (waiting, leaving, choosing, reacting)",
    "body language that shows the relationship to the idea in one glance — not a device hero frame",
    "conversation distance — two people mid-tension or one person reacting to being ignored",
  ],
  object: [
    "objects only when they are part of a clear human situation (held, abandoned mid-use, left behind) — never a lone symbolic prop",
    "physical evidence inside a scene the viewer can read as an event (empty table after guests left, not a random notebook)",
    "props that change because something happened — state change tied to action, not abstract representation",
  ],
  place: [
    "a place where the audience's real situation happens — empty restaurant, quiet reception, after-hours doorway — readable without a caption",
    "environmental storytelling of an event (someone just left / nobody came), not architecture-as-metaphor for software",
    "a room whose emptiness or activity is the situation — avoid forcing physical storefronts onto digital products",
  ],
  process: [
    "hands doing a repetitive task the audience recognizes as the pain — sorting, transferring, restarting",
    "visible tedious steps as a situation the viewer has lived — not workshop craft for its own sake",
    "time pressure shown through unfinished work in progress, not clocks with text",
  ],
  product: [
    "the product appearing only when the beat is about the solution — in a situation of use, not a dashboard default",
    "meaningful use context (where this tool actually gets used) without forcing browser chrome",
    "product-adjacent situation (preview, embed moment, answered visitor) — never abstract glowing UI cubes",
  ],
  comparison: [
    "side-by-side situations: answered vs unanswered, helped vs abandoned — not split-screen text",
    "wrong path vs right path as two human outcomes the viewer recognizes instantly",
    "two states of the same situation (before silence / after response)",
  ],
  transformation: [
    "one situation transforming across beats (waiting → answered, alone → helped, stuck → free)",
    "a visible change that mirrors the insight — still a scene, not a morphing symbol",
    "physical transition that a stranger could narrate without the prompt",
  ],
  metaphor: [
    "immediately understandable metaphors only (graveyard of forgotten brands, robot doing the work, empty restaurant)",
    "one-mental-step metaphors allowed; reject anything that needs the prompt to explain (paper boat = visitor)",
    "environmental metaphor tied to a felt situation — weather, path fork, closed door — not floating symbolic objects",
  ],
};

function scoreCarriers(args: ResolveVisualNarrativeInput): Record<MeaningCarrier, number> {
  const scores = Object.fromEntries(
    MEANING_CARRIERS.map((c) => [c, 1]),
  ) as Record<MeaningCarrier, number>;

  const blob = [
    ...(args.project.product_is ?? []),
    ...(args.project.pain_points ?? []),
    args.topic ?? "",
    args.angle ?? "",
  ]
    .join(" ")
    .toLowerCase();

  // Visual Story Director: bias toward human situations over abstract objects.
  scores.human += 2;
  scores.process += 1;
  scores.comparison += 1;
  scores.transformation += 1;

  if (/\b(student|study|flashcard|revision|teacher)\b/.test(blob)) {
    scores.place += 2;
    scores.process += 2;
    scores.human += 1;
    scores.object -= 1;
  }
  if (/\b(app store|review|mobile|phone)\b/.test(blob)) {
    scores.product += 1;
    scores.human += 1;
    scores.comparison += 1;
  }
  if (/\b(developer|founder|sprint|backlog|architecture|requirements|blueprint)\b/.test(blob)) {
    scores.process += 2;
    scores.comparison += 1;
    scores.human += 1;
    // Do NOT auto-boost object/sticky-note worlds for SaaS.
  }
  // Website chatbot / silent website — situations, not storefronts or dashboards.
  if (
    /\b(chatbot|website|visitor|embed|after.?hours|unanswered|lead)\b/.test(blob)
  ) {
    scores.human += 3;
    scores.comparison += 2;
    scores.transformation += 1;
    scores.object -= 2;
    scores.place -= 1; // avoid automatic retail/storefront drift
    scores.metaphor += 1; // understandable metaphors still welcome
  }
  if (args.funnelStage === "awareness" || args.funnelStage === "problem_aware") {
    scores.human += 2;
    scores.metaphor += 1; // only understandable metaphors (prompt enforces)
    // Removed prior object+place auto-boost that produced paper boats / empty shops.
  }
  if (args.funnelStage === "solution_aware" || args.funnelStage === "conversion") {
    scores.product += 1;
    scores.transformation += 2;
    scores.human += 1;
  }

  const identity = args.identity;
  if (identity) {
    const hp = identity.option_ids.human_presence;
    if (hp === "hands_only" || hp === "no_people") {
      scores.human -= 1;
      scores.process += 2;
      scores.object += 1; // still prefer process-in-situation over lone symbols
    } else if (hp === "silhouette_back" || hp === "single_partial") {
      scores.human += 2;
      scores.place += 1;
    } else if (hp === "implied_offscreen") {
      scores.place += 1;
      scores.human += 1; // implied human still a situation
      scores.object -= 1;
    }
    const env = identity.option_ids.environment;
    if (env === "neighborhood_cafe" || env === "co_working_daylight") {
      scores.place += 1;
      scores.human += 1;
    }
    if (env === "maker_workbench" || env === "home_kitchen") {
      // Soft: workbench is staging, not permission for abstract craft props.
      scores.process += 1;
      scores.human += 1;
      scores.object -= 1;
    }
    if (env === "quiet_studio" || env === "home_office_nook") {
      scores.human += 1;
    }
    if (env === "urban_street_exterior" || env === "soft_focus_urban") {
      // Soft penalty against forcing digital products into storefront metaphors.
      if (/\b(chatbot|website|saas|software|platform|embed)\b/.test(blob)) {
        scores.place -= 2;
        scores.human += 2;
      }
    }
  }

  const motifCounts = aggregateRecentMotifCounts(args.series.fingerprints);
  const overused = dominantMotifs(motifCounts, 3);
  if (overused.includes("laptop") || overused.includes("desk") || overused.includes("founder")) {
    scores.human += 2;
    scores.product -= 1;
    scores.comparison += 2;
    scores.metaphor += 1;
    scores.transformation += 1;
    // Do not dump into object/place abstractions as the escape hatch.
    scores.object -= 1;
  }
  if (overused.includes("office") || overused.includes("home_office")) {
    scores.human += 1;
    scores.metaphor += 1;
    scores.place += 1;
  }
  if (overused.includes("phone")) {
    scores.human += 1;
    scores.process += 1;
  }

  for (const c of MEANING_CARRIERS) {
    if (scores[c] < 0) scores[c] = 0;
  }
  return scores;
}

function carriersByScore(scores: Record<MeaningCarrier, number>): MeaningCarrier[] {
  const max = Math.max(...MEANING_CARRIERS.map((c) => scores[c]));
  const top = MEANING_CARRIERS.filter((c) => scores[c] === max && scores[c] > 0);
  if (top.length === 0) return [...MEANING_CARRIERS];
  return top.sort();
}

function narrativeKey(carrier: MeaningCarrier, subjectFocus: string): string {
  return `${carrier}|${subjectFocus.trim().toLowerCase().slice(0, 120)}`;
}

function supportingFor(primary: MeaningCarrier): MeaningCarrier[] {
  const map: Record<MeaningCarrier, MeaningCarrier[]> = {
    human: ["place", "process", "comparison"],
    object: ["human", "process", "transformation"],
    place: ["human", "comparison", "metaphor"],
    process: ["human", "transformation", "object"],
    product: ["transformation", "human", "place"],
    comparison: ["human", "transformation", "place"],
    transformation: ["human", "metaphor", "process"],
    metaphor: ["human", "place", "transformation"],
  };
  return map[primary];
}

function buildPlan(
  input: ResolveVisualNarrativeInput,
  primary: MeaningCarrier,
  subjectFocus: string,
  motifCounts: Record<string, number>,
  productHints: string[],
): VisualNarrativePlan {
  return {
    version: VISUAL_NARRATIVE_VERSION,
    primary_meaning_carrier: primary,
    subject_focus: subjectFocus,
    supporting_carriers: supportingFor(primary),
    product_world_hints: productHints,
    recent_motif_counts: motifCounts,
    key: narrativeKey(primary, subjectFocus),
    storytelling_mode: "situation_first",
    director_version: VISUAL_STORY_DIRECTOR_VERSION,
    preferred_situation_framing: situationFirstFraming({
      topic: input.topic,
      angle: input.angle,
      painPoints: input.project.pain_points ?? [],
      productIs: input.project.product_is ?? [],
    }),
    reject_abstract_riddles: true,
    metaphor_policy: "understandable_preferred",
  };
}

export function resolveVisualNarrative(
  input: ResolveVisualNarrativeInput,
): VisualNarrativePlan {
  const scores = scoreCarriers(input);
  const recent = new Set(
    (input.recentPrimaryCarrierKeys ?? []).filter(
      (k): k is string => typeof k === "string" && k.trim().length > 0,
    ),
  );
  const productHints = productVisualWorldHints(input.project);
  const motifCounts = aggregateRecentMotifCounts(input.series.fingerprints);

  for (let attempt = 0; attempt < MAX_CARRIER_COLLISION_ATTEMPTS; attempt++) {
    const attemptSeed = `${input.seed}|vn|${attempt}`;
    const tier = carriersByScore(scores);
    const primary = pickFrom(tier, attemptSeed);
    const subjectFocus = pickFrom(SUBJECT_POOL[primary], `${attemptSeed}|subject`);
    const key = narrativeKey(primary, subjectFocus);
    if (recent.has(key) && attempt < MAX_CARRIER_COLLISION_ATTEMPTS - 1) {
      continue;
    }
    return buildPlan(input, primary, subjectFocus, motifCounts, productHints);
  }

  const fallbackSeed = `${input.seed}|vn|fallback`;
  const primary = pickFrom(MEANING_CARRIERS, fallbackSeed);
  const subjectFocus = pickFrom(SUBJECT_POOL[primary], `${fallbackSeed}|subject`);
  return buildPlan(input, primary, subjectFocus, motifCounts, productHints);
}
