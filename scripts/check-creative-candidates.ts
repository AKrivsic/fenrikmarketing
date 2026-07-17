// Creative Candidate Selection v2 (Creative Divergence)
//   npm run check:creative-candidates

import assert from "node:assert/strict";
import {
  applyGenericityRejections,
  buildCreativeCandidatePromptBlock,
  checkConceptFidelity,
  clusterRawSituations,
  extractTopicConcreteSignals,
  generateCreativeCandidates,
  generateCreativeCandidatesFromFamilies,
  generateCreativeCandidatesWithDivergence,
  generateRawVisualSituations,
  planCreativeCandidatesForPackage,
  rejectRawSituation,
  runComparativeJudge,
  selectWinner,
  weightedTotal,
} from "@/lib/creative-candidates";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import { CREATIVE_CONCEPT_FAMILIES } from "@/lib/creative-candidates/types";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import type { Project } from "@/lib/supabase/types";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

const HVAC_TOPIC =
  "The HVAC company that got slammed with website traffic during a heatwave — and lost every single online lead";
const HVAC_ANGLE =
  "Dramatize the moment a small service business is overwhelmed with phone calls while their website silently turns away visitor after visitor";

const productIs = [
  "AI website chatbot that answers visitors 24/7",
  "embed script for website",
];
const painPoints = [
  "Website visitors leave unanswered",
  "Unable to answer customer questions when offline",
];

function genericOfficeCandidate(): CreativeCandidate {
  return {
    candidateId: "generic-office",
    family: "social_observation",
    coreIdea: "Person looking at laptop in a generic office stress montage about business being busy",
    emotionalReaction: "mild stress",
    hookLine: "Most businesses think being busy means business is good",
    openingSituation:
      "A person looking at a laptop at a modern office desk, calm desk frustration, thinking at a desk",
    visualPromise: "Calm explanatory B2B montage of phones and dashboards",
    storyProgression: "Show office stress → explain the problem → show dashboard → CTA",
    productConnection: "The product is a chatbot somewhere in the dashboard",
    ending: "Sign up for the platform",
    expectedViewerQuestion: "Is this another SaaS ad?",
    familiarityRisk: "high",
    memorabilityReason: "It is easy to produce",
  };
}

console.log("\ncreative divergence v2");

check("generates 30+ raw visual situations before filter", () => {
  const signals = extractTopicConcreteSignals(HVAC_TOPIC, HVAC_ANGLE);
  const raw = generateRawVisualSituations({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    signals,
    targetCount: 45,
  });
  assert.ok(raw.length >= 30, `got ${raw.length}`);
});

check("rejects generic raw situations (office/laptop/meeting)", () => {
  assert.ok(rejectRawSituation("Person staring at a laptop in a modern office desk meeting room"));
  assert.ok(rejectRawSituation("Generic business stress explaining the product on a dashboard"));
  assert.ok(
    rejectRawSituation(
      "A person at a desk with a laptop thinking about workflow efficiency",
    ),
  );
});

check("clustering keeps distinct cluster representatives", () => {
  const signals = extractTopicConcreteSignals(HVAC_TOPIC, HVAC_ANGLE);
  const raw = generateRawVisualSituations({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    signals,
  });
  const { clusters, survivors } = clusterRawSituations(raw);
  assert.ok(clusters.length >= 8);
  assert.ok(survivors.length >= 8);
  const scenes = survivors.map((s) => s.scene);
  assert.equal(new Set(scenes).size, scenes.length);
});

check("generates 8 candidates from divergence survivors", () => {
  const { candidates, divergence } = generateCreativeCandidatesWithDivergence({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
  });
  assert.equal(candidates.length, 8);
  assert.ok(divergence.rawGeneratedCount >= 30);
  assert.ok(divergence.rawAfterFilterCount >= 20);
  assert.ok(divergence.survivors.length >= 8);
  assert.ok(candidates.every((c) => c.candidateId.includes("-div")));
});

console.log("\ngenerate + distinctness");

check("generates 8 candidates (v2 divergence)", () => {
  const c = generateCreativeCandidates({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
  });
  assert.equal(c.length, 8);
  const families = new Set(c.map((x) => x.family));
  assert.ok(families.size >= 5, `only ${families.size} families`);
});

check("v1 family scaffolds still available for reference", () => {
  const c = generateCreativeCandidatesFromFamilies({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
  });
  assert.equal(c.length, 8);
  assert.deepEqual(
    c.map((x) => x.family).sort(),
    [...CREATIVE_CONCEPT_FAMILIES].sort(),
  );
});

check("candidates are meaningfully distinct (not paraphrases)", () => {
  const c = generateCreativeCandidates({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
  });
  for (let i = 0; i < c.length; i++) {
    for (let j = i + 1; j < c.length; j++) {
      const a = c[i]!.coreIdea.toLowerCase();
      const b = c[j]!.coreIdea.toLowerCase();
      assert.notEqual(a, b);
      // Jaccard-ish: shared significant words should not dominate both ideas
      const aw = new Set(a.split(/\W+/).filter((w) => w.length > 4));
      const bw = b.split(/\W+/).filter((w) => w.length > 4);
      const shared = bw.filter((w) => aw.has(w)).length;
      const ratio = shared / Math.max(bw.length, 1);
      assert.ok(
        ratio < 0.7,
        `candidates ${c[i]!.family} vs ${c[j]!.family} too similar (${ratio})`,
      );
    }
  }
});

console.log("\nscoring + judge");

check("generic office does not beat memorable concept via feasibility", () => {
  const memorable = generateCreativeCandidates({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
  }).find((c) => c.family === "consequence_first")!;

  const scored = applyGenericityRejections(
    [genericOfficeCandidate(), memorable],
    { topic: HVAC_TOPIC, angle: HVAC_ANGLE, productIs },
  );
  const generic = scored.find((s) => s.candidate.candidateId === "generic-office")!;
  const mem = scored.find((s) => s.candidate.candidateId === memorable.candidateId)!;

  assert.equal(generic.rejected, true);
  assert.ok(generic.scores.productionFeasibility >= mem.scores.productionFeasibility);
  assert.ok(mem.weightedTotal > generic.weightedTotal);

  const judge = runComparativeJudge(scored);
  const winner = selectWinner(scored, judge);
  assert.notEqual(winner.candidate.candidateId, "generic-office");
  assert.ok(winner.scores.stopPower >= 5);
});

check("HVAC concept does not collapse to generic business messaging", () => {
  const planned = planCreativeCandidatesForPackage({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
    requireVideo: true,
  });
  assert.ok(planned.plan);
  const w = planned.plan!.selectedCandidate;
  const blob = `${w.coreIdea} ${w.hookLine} ${w.openingSituation}`;
  assert.match(blob, /heat|HVAC|cooling|technician|van|heatwave/i);
  assert.doesNotMatch(w.hookLine, /^Most businesses/i);
  const signals = extractTopicConcreteSignals(HVAC_TOPIC, HVAC_ANGLE);
  assert.ok(signals.rawTokens.some((t) => /heat|HVAC|cooling/i.test(t)));
});

console.log("\npropagation + fidelity");

check("winner hook and opening propagate into prompt block", () => {
  const planned = planCreativeCandidatesForPackage({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
    requireVideo: true,
  });
  const block = buildCreativeCandidatePromptBlock(planned.plan!);
  assert.ok(block.includes(planned.plan!.selectedCandidate.hookLine));
  assert.ok(block.includes(planned.plan!.selectedCandidate.openingSituation));
  assert.ok(block.includes("MUST be visual_scenes[0]"));
});

check("storyboard replacing opening with laptop/office fails fidelity", () => {
  const planned = planCreativeCandidatesForPackage({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
    requireVideo: true,
  });
  const w = planned.plan!.selectedCandidate;
  const fidelity = checkConceptFidelity({
    winner: w,
    hook: w.hookLine,
    voiceoverText: `${w.hookLine} Then we explain the platform.`,
    imagePrompts: [
      "Photorealistic person looking at a laptop at a modern office desk with coffee",
      "Dashboard on a monitor",
    ],
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
  });
  assert.equal(fidelity.passed, false);
  assert.ok(
    fidelity.failureReasons.includes("storyboard_collapsed_to_generic_office") ||
      fidelity.failureReasons.includes("opening_situation_missing_from_scene1"),
  );
});

check("faithful script+scene1 passes fidelity", () => {
  const planned = planCreativeCandidatesForPackage({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
    requireVideo: true,
  });
  const w = planned.plan!.selectedCandidate;
  const fidelity = checkConceptFidelity({
    winner: w,
    hook: w.hookLine,
    voiceoverText: `${w.hookLine} ${w.storyProgression} ${w.productConnection} ${w.ending}`,
    imagePrompts: [w.openingSituation, w.visualPromise, w.ending],
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
  });
  assert.equal(fidelity.passed, true, fidelity.failureReasons.join(","));
});

check("winner hook is required in final-script fidelity", () => {
  const planned = planCreativeCandidatesForPackage({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
    requireVideo: true,
  });
  const w = planned.plan!.selectedCandidate;
  const fidelity = checkConceptFidelity({
    winner: w,
    hook: "Most businesses struggle with productivity",
    voiceoverText:
      "Most businesses struggle with productivity. In today's world websites matter.",
    imagePrompts: [w.openingSituation],
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
  });
  assert.equal(fidelity.passed, false);
  assert.ok(
    fidelity.failureReasons.includes("hook_not_preserved_in_first_spoken") ||
      fidelity.failureReasons.includes("voiceover_essay_or_generic_opener"),
  );
});

console.log("\nworkflow wiring");

check("generate prompt includes creative candidate block when provided", () => {
  const planned = planCreativeCandidatesForPackage({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
    requireVideo: true,
  });
  const directives: CreativeDirectives = {
    mode: CREATIVE_MODES[0],
    hook: HOOK_ARCHETYPES[0],
    persona: VOICE_PERSONAS[0],
  };
  const project = {
    id: "p1",
    name: "Fenrik.chat",
    type: "saas",
    language: "en",
    market_scope: "global",
    goal_type: "lead_generation",
    target_audience: { segments: ["SMB"] },
    product_is: productIs,
    product_is_not: [],
    product_strengths: [],
    pain_points: painPoints,
    forbidden_claims: [],
    tone_of_voice: { notes: ["Direct"] },
    platforms: [],
    publishing_rules: {},
    default_cta: null,
  } as unknown as Project;

  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "problem_aware",
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    platform: "tiktok",
    format: "short",
    availableAssets: [],
    requireVideo: true,
    directives,
    creativeCandidatePromptBlock: planned.promptBlock,
  });
  assert.ok(prompt.includes("CREATIVE CANDIDATE SELECTION"));
  assert.ok(prompt.includes(planned.plan!.selectedCandidate.hookLine));
});

check("text-only packages skip candidate planning", () => {
  const planned = planCreativeCandidatesForPackage({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    requireVideo: false,
  });
  assert.equal(planned.plan, null);
  assert.equal(planned.promptBlock, "");
});

check("persistence fields include observability keys", () => {
  const planned = planCreativeCandidatesForPackage({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
    requireVideo: true,
  });
  const fields = planned.persistenceFields.creative_candidates as Record<
    string,
    unknown
  >;
  assert.ok(fields);
  assert.ok(Array.isArray(fields.generatedCandidates));
  assert.ok(Array.isArray(fields.candidateScores));
  assert.ok(fields.selectedCandidate);
  assert.ok(fields.comparativeJudge);
  assert.ok(fields.creativeDivergence);
  assert.equal(fields.version, "creative-candidates@2");
});

check("weightedTotal prefers stop/comprehension over feasibility", () => {
  const highStop = weightedTotal({
    stopPower: 9,
    immediateComprehension: 8,
    memorability: 8,
    emotionalCharge: 7,
    productRelevance: 8,
    visualSpecificity: 7,
    storyPotential: 7,
    originality: 8,
    AI_Generic_Risk: 2,
    productionFeasibility: 5,
  });
  const highFeasibleGeneric = weightedTotal({
    stopPower: 3,
    immediateComprehension: 5,
    memorability: 3,
    emotionalCharge: 3,
    productRelevance: 5,
    visualSpecificity: 3,
    storyPotential: 4,
    originality: 2,
    AI_Generic_Risk: 8,
    productionFeasibility: 10,
  });
  assert.ok(highStop > highFeasibleGeneric);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
