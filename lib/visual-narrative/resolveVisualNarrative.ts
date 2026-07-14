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

export interface ResolveVisualNarrativeInput {
  project: Project;
  identity: CreativeIdentity | null;
  seed: string;
  series: SeriesCreativeContext;
  funnelStage: FunnelStage;
  recentPrimaryCarrierKeys?: readonly string[];
}

const MAX_CARRIER_COLLISION_ATTEMPTS = 32;

const SUBJECT_POOL: Record<MeaningCarrier, readonly string[]> = {
  human: [
    "a specific role from the audience (not a generic stock founder) in a believable moment",
    "body language and posture that express the pain without a device hero frame",
    "conversation distance — two people or one person reacting to something off-screen",
  ],
  object: [
    "workflow artifacts: notes, cards, printouts, boards, inbox piles, tools of the trade",
    "physical evidence of the problem (empty tray, crossed-out plan, half-finished stack)",
    "objects that change state across beats to tell the story",
  ],
  place: [
    "a location that belongs to this product's world (not a default tech office)",
    "environmental details that imply the pain before anyone speaks",
    "a room or corner whose order/disorder carries meaning",
  ],
  process: [
    "hands doing repetitive setup work — sorting, writing, transferring, organizing",
    "the visible steps of a tedious process (materials in, materials waiting)",
    "time passing shown through process residue, not clocks with text",
  ],
  product: [
    "the product as a tool in use — framed device or interaction when the beat is about the solution",
    "meaningful product context (where this tool actually gets used)",
    "product-adjacent props that imply the category without a blank laptop",
  ],
  comparison: [
    "side-by-side or before/after structure using objects or spaces (not split-screen text)",
    "wrong path vs right path told with contrasting props or environments",
    "two states of the same workspace or materials",
  ],
  transformation: [
    "one subject transforming across beats (mess → order, empty → prepared, scattered → structured)",
    "a single scene element that visibly changes to match the insight",
    "physical transition that mirrors the narrative turn",
  ],
  metaphor: [
    "a grounded metaphor from everyday life (weight, leakage, traffic, overgrowth, empty vs full)",
    "symbolic objects that map to the pain — believable, not surreal fantasy",
    "environmental metaphor (weather, light shift, path fork) tied to the strategy angle",
  ],
};

function scoreCarriers(args: ResolveVisualNarrativeInput): Record<MeaningCarrier, number> {
  const scores = Object.fromEntries(
    MEANING_CARRIERS.map((c) => [c, 1]),
  ) as Record<MeaningCarrier, number>;

  const blob = [
    ...(args.project.product_is ?? []),
    ...(args.project.pain_points ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (/\b(student|study|flashcard|revision|teacher)\b/.test(blob)) {
    scores.place += 2;
    scores.process += 2;
    scores.object += 2;
    scores.human -= 1;
  }
  if (/\b(app store|review|mobile|phone)\b/.test(blob)) {
    scores.product += 1;
    scores.object += 1;
    scores.comparison += 1;
  }
  if (/\b(developer|founder|sprint|backlog|architecture|requirements|blueprint)\b/.test(blob)) {
    scores.object += 2;
    scores.process += 2;
    scores.comparison += 1;
    scores.place += 1;
  }
  if (args.funnelStage === "awareness" || args.funnelStage === "problem_aware") {
    scores.metaphor += 1;
    scores.object += 1;
    scores.place += 1;
  }
  if (args.funnelStage === "solution_aware" || args.funnelStage === "conversion") {
    scores.product += 1;
    scores.transformation += 2;
  }

  const identity = args.identity;
  if (identity) {
    const hp = identity.option_ids.human_presence;
    if (hp === "hands_only" || hp === "no_people") {
      scores.human -= 2;
      scores.object += 3;
      scores.process += 2;
    } else if (hp === "silhouette_back" || hp === "single_partial") {
      scores.human += 1;
      scores.place += 1;
    } else if (hp === "implied_offscreen") {
      scores.place += 2;
      scores.object += 1;
    }
    const env = identity.option_ids.environment;
    if (env === "neighborhood_cafe" || env === "co_working_daylight") {
      scores.place += 2;
    }
    if (env === "maker_workbench" || env === "home_kitchen") {
      scores.object += 2;
      scores.process += 2;
    }
    if (env === "quiet_studio" || env === "home_office_nook") {
      scores.object += 1;
    }
  }

  const motifCounts = aggregateRecentMotifCounts(args.series.fingerprints);
  const overused = dominantMotifs(motifCounts, 3);
  if (overused.includes("laptop") || overused.includes("desk") || overused.includes("founder")) {
    scores.human -= 1;
    scores.product -= 1;
    scores.object += 2;
    scores.place += 2;
    scores.process += 2;
    scores.metaphor += 1;
    scores.comparison += 1;
  }
  if (overused.includes("office") || overused.includes("home_office")) {
    scores.place += 2;
    scores.metaphor += 1;
  }
  if (overused.includes("phone")) {
    scores.object += 1;
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
    human: ["object", "place", "process"],
    object: ["place", "process", "transformation"],
    place: ["object", "human", "metaphor"],
    process: ["object", "transformation", "place"],
    product: ["transformation", "object", "place"],
    comparison: ["object", "transformation", "place"],
    transformation: ["object", "metaphor", "process"],
    metaphor: ["object", "place", "transformation"],
  };
  return map[primary];
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
    return {
      version: VISUAL_NARRATIVE_VERSION,
      primary_meaning_carrier: primary,
      subject_focus: subjectFocus,
      supporting_carriers: supportingFor(primary),
      product_world_hints: productHints,
      recent_motif_counts: motifCounts,
      key,
    };
  }

  const fallbackSeed = `${input.seed}|vn|fallback`;
  const primary = pickFrom(MEANING_CARRIERS, fallbackSeed);
  const subjectFocus = pickFrom(SUBJECT_POOL[primary], `${fallbackSeed}|subject`);
  return {
    version: VISUAL_NARRATIVE_VERSION,
    primary_meaning_carrier: primary,
    subject_focus: subjectFocus,
    supporting_carriers: supportingFor(primary),
    product_world_hints: productHints,
    recent_motif_counts: motifCounts,
    key: narrativeKey(primary, subjectFocus),
  };
}
