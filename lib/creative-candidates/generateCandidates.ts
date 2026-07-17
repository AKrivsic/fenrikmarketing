import type {
  CreativeCandidate,
  CreativeConceptFamily,
} from "@/lib/creative-candidates/types";
import { CREATIVE_CONCEPT_FAMILIES } from "@/lib/creative-candidates/types";

export interface TopicConcreteSignals {
  industryCue: string;
  stressCue: string;
  customerCue: string;
  consequenceCue: string;
  rawTokens: string[];
}

/** Extract concrete topic signals so concepts cannot collapse to generic busy-business. */
export function extractTopicConcreteSignals(
  topic: string,
  angle: string | null | undefined,
): TopicConcreteSignals {
  const blob = `${topic} ${angle ?? ""}`;
  const lower = blob.toLowerCase();
  const rawTokens: string[] = [];

  const push = (t: string) => {
    if (t && !rawTokens.includes(t)) rawTokens.push(t);
  };

  if (/\bhvac\b|air\s*condition|cooling|heatwave|heat\s*wave|furnace|technician/i.test(blob)) {
    push("HVAC");
    push("heatwave");
    push("cooling");
    push("technician");
  }
  if (/\bdentist|dental|clinic|patient/i.test(blob)) {
    push("dental");
    push("patient");
  }
  if (/\brestaurant|kitchen|chef|dining/i.test(blob)) {
    push("restaurant");
    push("kitchen");
  }
  if (/\bchatbot|website\s+visitor|embed|after.?hours|unanswered/i.test(blob)) {
    push("website visitor");
    push("unanswered");
  }
  if (/\bheat|hot|swelter|melt/i.test(blob)) push("heat");
  if (/\bmiss(ed)?\s+(call|job|lead)|phone|ring/i.test(blob)) push("missed calls");
  if (/\bleave|leaving|walk\s*away|competitor/i.test(blob)) push("customers leaving");

  const industryCue =
    /\bhvac\b/i.test(blob)
      ? "HVAC / cooling service"
      : /\bdental/i.test(blob)
        ? "dental clinic"
        : /\brestaurant/i.test(blob)
          ? "restaurant"
          : /\bchatbot|website/i.test(blob)
            ? "website-led service business"
            : topic.trim().slice(0, 80) || "this business";

  const stressCue = /\bheatwave|heat\s*wave|heat\b/i.test(blob)
    ? "heatwave demand spike"
    : /\bmidnight|after.?hours|offline/i.test(blob)
      ? "after-hours silence"
      : "peak demand overload";

  const customerCue = /\bvisitor|online\s+lead|website/i.test(blob)
    ? "website visitor who needed an answer"
    : /\bpatient/i.test(blob)
      ? "patient waiting for a reply"
      : "customer who needed help now";

  const consequenceCue = /\blead|visitor|online/i.test(blob)
    ? "every unanswered online lead walks to a competitor"
    : "the job / sale is lost while someone else answers";

  if (rawTokens.length === 0) {
    // Keep at least topic nouns for specificity scoring.
    for (const w of topic.split(/\W+/).filter((x) => x.length > 4).slice(0, 4)) {
      push(w.toLowerCase());
    }
  }

  return { industryCue, stressCue, customerCue, consequenceCue, rawTokens };
}

function productLabel(productIs: readonly string[]): string {
  const p = productIs.find((x) => x.trim());
  return p?.trim() || "the product";
}

function painLabel(painPoints: readonly string[]): string {
  const p = painPoints.find((x) => x.trim());
  return p?.trim() || "unanswered demand";
}

type FamilyBuilder = (ctx: {
  topic: string;
  angle: string;
  signals: TopicConcreteSignals;
  product: string;
  pain: string;
}) => Omit<CreativeCandidate, "candidateId" | "family">;

const FAMILY_BUILDERS: Record<CreativeConceptFamily, FamilyBuilder> = {
  human_conflict: ({ signals, product, pain }) => ({
    coreIdea: `Staff drowning in ${signals.stressCue} argue over which ${signals.customerCue} to ignore first while ${pain} keeps happening online.`,
    emotionalReaction: "tension",
    hookLine: `During the ${signals.stressCue}, two teammates fight over the ringing line — and the ${signals.customerCue} on the website already left.`,
    openingSituation: `Two ${signals.industryCue} workers mid-argument at a service counter while phones stack and a customer silhouette turns away through the glass.`,
    visualPromise: "Human conflict in a specific operational moment — never a passive screen stare.",
    storyProgression:
      "Argue → realize the website visitor left → see the cost → product answers the channel they abandoned.",
    productConnection: `${product} covers the online questions while humans handle the physical chaos.`,
    ending: `The next ${signals.customerCue} gets an answer without stealing a technician from the floor.`,
    expectedViewerQuestion: "Wait — are we losing the online jobs while we fight the phones?",
    familiarityRisk: "medium",
    memorabilityReason: "Argument + specific industry stress is a scene, not a slogan.",
  }),

  absurd_understandable: ({ signals, product }) => ({
    coreIdea: `A ${signals.industryCue} queues desperate customers like airport boarding while the website line is empty and ignored.`,
    emotionalReaction: "amused recognition",
    hookLine: `They ran boarding-group tickets for phone callers — and left the website visitors without a group.`,
    openingSituation: `A ridiculous but readable queue: numbered paper tickets for phone callers in a ${signals.industryCue} lobby during ${signals.stressCue}, while a laptop with an open chat sits ignored on the counter.`,
    visualPromise: "Absurd queue system that still makes the missed channel obvious.",
    storyProgression:
      "Show the absurd phone queue → reveal the silent website channel → flip to answered online questions.",
    productConnection: `${product} is the missing queue for website questions.`,
    ending: "Online visitors get a boarding pass that actually boards.",
    expectedViewerQuestion: "Why is the website the only line with no tickets?",
    familiarityRisk: "low",
    memorabilityReason: "Boarding tickets for calls is unexpected but instantly understood.",
  }),

  visual_exaggeration: ({ signals, product, pain }) => ({
    coreIdea: `The missed online leads from ${signals.stressCue} pile into a physical mountain of abandoned jobs while techs run past it.`,
    emotionalReaction: "unease",
    hookLine: `The heat didn't break the business — the unanswered website pile did.`,
    openingSituation: `Outside a ${signals.industryCue} van in blazing heat, a growing stack of unmarked job folders / sticky demand slips towers beside the door while a technician sprints to another truck.`,
    visualPromise: "Exaggerated physical pile of lost demand next to real service urgency.",
    storyProgression:
      "Tower of lost jobs grows → tech keeps running → reveal those were website visitors → product stops the pile.",
    productConnection: `${product} answers before demand becomes a physical stack of ${pain}.`,
    ending: "The pile stops growing when the website can answer.",
    expectedViewerQuestion: "How many jobs are in that pile?",
    familiarityRisk: "low",
    memorabilityReason: "Physical mountain of lost work is a memorable exaggeration.",
  }),

  consequence_first: ({ signals, product }) => ({
    coreIdea: `${signals.consequenceCue} — show the competitor winning the job before explaining why.`,
    emotionalReaction: "urgency",
    hookLine: `Your competitor finished the quote while your phone was still ringing.`,
    openingSituation: `Split-second consequence: a rival van already on the driveway / a signed clipboard in a competitor's hand, while your ${signals.industryCue} phone lights up unanswered and a website chat sits idle.`,
    visualPromise: "Start on the lost job, then rewind to the silent website.",
    storyProgression:
      "Lost job to competitor → rewind to unanswered website visitor → product closes the gap.",
    productConnection: `${product} answers before the competitor can.`,
    ending: "Next heat-spike visitor gets an answer in time.",
    expectedViewerQuestion: "Who got that job instead of us?",
    familiarityRisk: "medium",
    memorabilityReason: "Consequence-first creates an instant stake.",
  }),

  role_reversal: ({ signals, product }) => ({
    coreIdea: `The website becomes the only employee still working during ${signals.stressCue} while humans are trapped on phones.`,
    emotionalReaction: "relief / surprise",
    hookLine: `When every technician was on a truck, the website finally started answering.`,
    openingSituation: `Empty front desk at a ${signals.industryCue} during ${signals.stressCue}; phones blink alone; on a wall screen / tablet a chat calmly replies while the building is half-abandoned.`,
    visualPromise: "Role reversal: empty humans, working digital receptionist.",
    storyProgression:
      "Empty chaos → digital answers appear → humans return to the hard jobs → product owns the online shift.",
    productConnection: `${product} takes the website shift humans can't cover.`,
    ending: "Phones can ring; the site still answers.",
    expectedViewerQuestion: "Who is answering if nobody is at the desk?",
    familiarityRisk: "low",
    memorabilityReason: "Empty office + working chat flips the expected hero.",
  }),

  social_observation: ({ signals, product }) => ({
    coreIdea: `Neighbors / customers notice ${signals.industryCue} vans everywhere during ${signals.stressCue} — then whisper that nobody answers online.`,
    emotionalReaction: "recognition",
    hookLine: `The whole street saw your vans — and still couldn't get a reply on your site.`,
    openingSituation: `Residential street in heat: multiple ${signals.industryCue} vans, neighbors pointing at phones, one person closing a laptop after no reply.`,
    visualPromise: "Social proof of demand + public failure to answer online.",
    storyProgression:
      "Visible demand in the neighborhood → private failed website attempt → product turns visibility into captured leads.",
    productConnection: `${product} converts the public demand spike into answered chats.`,
    ending: "The street still sees the vans — and the site finally answers.",
    expectedViewerQuestion: "Are we famous for being busy or for being unreachable?",
    familiarityRisk: "medium",
    memorabilityReason: "Neighborhood observation makes the pain social, not corporate.",
  }),

  unexpected_comparison: ({ signals, product }) => ({
    coreIdea: `Treat unanswered website visitors like a broken AC unit left running — waste you can feel.`,
    emotionalReaction: "irritation",
    hookLine: `Leaving your website silent in a heatwave is like leaving the AC on with the windows open.`,
    openingSituation: `A home in heat: windows open, AC blasting uselessly — cut to a ${signals.industryCue} website chat sitting open with nobody typing while demand spikes.`,
    visualPromise: "Unexpected comparison that is immediately felt in the body.",
    storyProgression:
      "Wasted cooling image → map onto wasted website traffic → product seals the leak.",
    productConnection: `${product} closes the open window on your website.`,
    ending: "Traffic stops leaking the moment answers start.",
    expectedViewerQuestion: "How much demand are we wasting like open-window AC?",
    familiarityRisk: "low",
    memorabilityReason: "Bodily discomfort metaphor sticks to heatwave topics.",
  }),

  direct_product_world: ({ signals, product, pain }) => ({
    coreIdea: `A ${signals.customerCue} types a real urgent question during ${signals.stressCue} and gets silence — then gets an answer.`,
    emotionalReaction: "frustration then relief",
    hookLine: `"Is anyone free for an emergency cool-down today?" — sent. Seen by nobody.`,
    openingSituation: `Close on a customer's hands in heat (sweat, cold drink sweating) sending a website question about ${signals.industryCue} help; the business side shows an empty reply thread.`,
    visualPromise: "Direct product-world: the unanswered chat in a specific urgent context.",
    storyProgression:
      "Urgent question → silence → competitor temptation → product answers the same question.",
    productConnection: `${product} turns ${pain} into an answered visitor moment.`,
    ending: "Same question, answered while the crew is on trucks.",
    expectedViewerQuestion: "What happens to that exact question when we're slammed?",
    familiarityRisk: "medium",
    memorabilityReason: "Concrete urgent question is topic-specific, not generic busy-business.",
  }),
};

import { runCreativeDivergence } from "@/lib/creative-candidates/divergence/runCreativeDivergence";
import type { CreativeDivergencePlan } from "@/lib/creative-candidates/divergence/types";

/** Creative Divergence v2: raw situations → filter → cluster → 8 complete candidates. */
export function generateCreativeCandidatesWithDivergence(input: {
  topic: string;
  angle?: string | null;
  painPoints?: readonly string[];
  productIs?: readonly string[];
}): { candidates: CreativeCandidate[]; divergence: CreativeDivergencePlan } {
  return runCreativeDivergence(input);
}

/**
 * Build 8 complete creative candidates from clustered raw visual situations (v2).
 * Legacy family scaffolds remain in FAMILY_BUILDERS for tests/reference only.
 */
export function generateCreativeCandidates(input: {
  topic: string;
  angle?: string | null;
  painPoints?: readonly string[];
  productIs?: readonly string[];
}): CreativeCandidate[] {
  return generateCreativeCandidatesWithDivergence(input).candidates;
}

/** Deterministic v1 family scaffolds — used only where explicit family coverage is required. */
export function generateCreativeCandidatesFromFamilies(input: {
  topic: string;
  angle?: string | null;
  painPoints?: readonly string[];
  productIs?: readonly string[];
}): CreativeCandidate[] {
  const signals = extractTopicConcreteSignals(input.topic, input.angle);
  const product = productLabel(input.productIs ?? []);
  const pain = painLabel(input.painPoints ?? []);
  const angle = (input.angle ?? "").trim() || input.topic;
  const ctx = {
    topic: input.topic,
    angle,
    signals,
    product,
    pain,
  };

  return CREATIVE_CONCEPT_FAMILIES.map((family, i) => {
    const body = FAMILY_BUILDERS[family](ctx);
    return {
      candidateId: `c${i + 1}-${family}`,
      family,
      ...body,
    };
  });
}

export function candidateBlob(c: CreativeCandidate): string {
  return [
    c.coreIdea,
    c.hookLine,
    c.openingSituation,
    c.visualPromise,
    c.storyProgression,
    c.productConnection,
    c.ending,
  ].join(" \n ");
}
