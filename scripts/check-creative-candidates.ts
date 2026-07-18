// Creative Candidate Selection v3 (Commercial Success)
//   npm run check:creative-candidates

import assert from "node:assert/strict";
import {
  applyGenericityRejections,
  areNearDuplicateSituations,
  authorCreativeDNA,
  buildCreativeCandidatePromptBlock,
  buildCreativeDnaPromptBlock,
  buildCreativeDnaPromptBlockFromPlan,
  checkConceptFidelity,
  clusterRawSituations,
  commercialTotal,
  CREATIVE_DNA_AUTHORING_INSTRUCTIONS,
  CREATIVE_DNA_PROMPT_HEADER,
  CREATIVE_FAMILY_COMMERCIAL_METADATA,
  deriveCreativeDNA,
  extractTopicConcreteSignals,
  familyCommercialMetadata,
  finalSelectionScore,
  generateCreativeCandidates,
  generateCreativeCandidatesFromFamilies,
  generateCreativeCandidatesWithDivergence,
  generateRawVisualSituations,
  identityEnvironmentConflictsWithDna,
  isValidCreativeDNA,
  neutralizeIdentityEnvironmentForDna,
  normalizeCreativeDNA,
  openingSituationFaithfulToScene1,
  planCreativeCandidatesForPackage,
  rejectRawSituation,
  resolveCandidateCreativeDNA,
  runComparativeJudge,
  scoreCommercialSuccess,
  selectWinner,
  validateCandidateDnaConsistency,
  validateCreativeDnaAgainstPackage,
  weightedTotal,
  withCreativeDNA,
} from "@/lib/creative-candidates";
import type { CreativeCandidate, CreativeDNA } from "@/lib/creative-candidates/types";
import { CREATIVE_CONCEPT_FAMILIES } from "@/lib/creative-candidates/types";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import { buildCreativeIdentityPromptBlock } from "@/lib/creative-identity/promptBlocks";
import {
  CREATIVE_IDENTITY_VERSION,
  type CreativeIdentity,
} from "@/lib/creative-identity/types";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import type { Project } from "@/lib/supabase/types";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

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

const ACCOUNTANT_TOPIC =
  "The accountant who came back from vacation to a week's worth of missed leads — and zero contact details";
const ACCOUNTANT_ANGLE =
  "Walk through the gut-punch moment a small business owner realizes their website was visited dozens of times while they were away, every visitor had a real question, and not one of them left a way to follow up — because the site offered nothing but static text and a contact form nobody filled out.";

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
  const acct = extractTopicConcreteSignals(ACCOUNTANT_TOPIC, ACCOUNTANT_ANGLE);
  assert.ok(rejectRawSituation("Person staring at a laptop in a modern office desk meeting room", acct));
  assert.ok(rejectRawSituation("Generic business stress explaining the product on a dashboard", acct));
  assert.ok(
    rejectRawSituation(
      "A person at a desk with a laptop thinking about workflow efficiency",
      acct,
    ),
  );
  assert.ok(
    rejectRawSituation(
      "Outside a HVAC van in blazing heat a technician sprints to another truck during website silence",
      acct,
    ),
    "HVAC props must reject on accountant topic",
  );
});

check("clustering merges near-duplicates / camera variants", () => {
  const signals = extractTopicConcreteSignals(HVAC_TOPIC, HVAC_ANGLE);
  const raw = generateRawVisualSituations({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    signals,
  });
  const { clusters, survivors } = clusterRawSituations(raw);
  assert.ok(clusters.length >= 8);
  assert.ok(survivors.length >= 8);
  assert.ok(
    clusters.length < raw.filter((r) => !r.rejected).length,
    `expected merge: clusters=${clusters.length} nonRejected=${raw.filter((r) => !r.rejected).length}`,
  );
  const scenes = survivors.map((s) => s.scene);
  assert.equal(new Set(scenes).size, scenes.length);

  assert.ok(
    areNearDuplicateSituations(
      {
        scene: "Handheld urgency: Outside a HVAC van in blazing heat, job folders tower beside the door",
        scrollStopCue: "Lost work as a physical mountain",
      },
      {
        scene: "Outside a HVAC van in blazing heat, a growing stack of unmarked job folders towers beside the door",
        scrollStopCue: "Lost work as a physical mountain",
      },
    ),
  );
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
  assert.ok(divergence.rawAfterFilterCount >= 15);
  assert.ok(divergence.survivors.length >= 8);
  assert.ok(divergence.rejectedGenericSamples.length >= 1);
  assert.ok(candidates.every((c) => c.candidateId.includes("-div")));
  const families = candidates.map((c) => c.family);
  assert.equal(new Set(families).size, families.length, "duplicate families in slate");
});

console.log("\nrun 04911a16 regressions (accountant)");

check("accountant topic cannot produce HVAC technician/van/heat concepts", () => {
  const signals = extractTopicConcreteSignals(ACCOUNTANT_TOPIC, ACCOUNTANT_ANGLE, {
    productIs,
  });
  assert.equal(signals.world, "professional_return");
  assert.match(signals.industryCue, /account/i);
  assert.doesNotMatch(signals.industryCue, /website-led service business/i);

  const { candidates, divergence } = generateCreativeCandidatesWithDivergence({
    topic: ACCOUNTANT_TOPIC,
    angle: ACCOUNTANT_ANGLE,
    painPoints,
    productIs,
  });
  const survivingScenes = divergence.survivors.map((s) => s.scene).join("\n");
  const candidateBlob = candidates.map((c) => c.openingSituation).join("\n");
  const blob = `${survivingScenes}\n${candidateBlob}`;
  assert.doesNotMatch(blob, /\btechnician\b/i);
  assert.doesNotMatch(blob, /\bheatwave\b/i);
  assert.doesNotMatch(blob, /\bblazing heat\b/i);
  assert.doesNotMatch(blob, /\bservice van\b/i);
  assert.match(blob, /accountant|vacation|suitcase|contact|pto|passport/i);
  assert.ok(divergence.rawAfterFilterCount < divergence.rawGeneratedCount);
});

check("duplicate families cannot survive final accountant slate", () => {
  const { candidates } = generateCreativeCandidatesWithDivergence({
    topic: ACCOUNTANT_TOPIC,
    angle: ACCOUNTANT_ANGLE,
    painPoints,
    productIs,
  });
  assert.equal(candidates.length, 8);
  assert.equal(new Set(candidates.map((c) => c.family)).size, 8);
});

check("mascot winner cannot pass with co-working scene 1", () => {
  const winner = {
    candidateId: "c5-absurd_understandable-div",
    family: "absurd_understandable" as const,
    coreIdea:
      "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
    emotionalReaction: "amused recognition",
    hookLine: "Mascot suffers, fake typing online.",
    openingSituation:
      "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
    visualPromise: "Film the opening as a scroll-stop frame: Mascot suffers, fake typing online.",
    storyProgression: "Hold opening → product",
    productConnection: "AI chatbot handles the website moment",
    ending: "Next visitor gets an answer",
    expectedViewerQuestion: "What happens?",
    familiarityRisk: "low" as const,
    memorabilityReason: "mascot",
  };
  const cowork =
    "Portrait 9:16 vertical photorealistic photograph. Bright co-working space in daylight, warm neutral color feel. A person in a full mascot costume stands just inside a glass door.";
  const faithful = openingSituationFaithfulToScene1(winner.openingSituation, cowork);
  assert.equal(faithful.ok, false);
  const fidelity = checkConceptFidelity({
    winner,
    hook: winner.hookLine,
    voiceoverText: `${winner.hookLine} An accountant returned from vacation.`,
    imagePrompts: [cowork],
    topic: ACCOUNTANT_TOPIC,
    angle: ACCOUNTANT_ANGLE,
  });
  assert.equal(fidelity.passed, false);
  assert.ok(
    fidelity.failureReasons.some((r) =>
      r.startsWith("opening_situation_missing_from_scene1"),
    ),
  );
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
    fidelity.failureReasons.some(
      (r) =>
        r === "storyboard_collapsed_to_generic_office" ||
        r.startsWith("opening_situation_missing_from_scene1"),
    ),
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
  assert.equal(fields.version, "creative-candidates@3.0");
  assert.ok(fields.selectionDiagnostics);
  const scores = fields.candidateScores as Array<Record<string, unknown>>;
  assert.ok(scores.length > 0);
  assert.ok("commercialTotal" in scores[0]!);
  assert.ok("finalSelectionScore" in scores[0]!);
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

// ---------------------------------------------------------------------------
// Creative DNA
// ---------------------------------------------------------------------------

const MASCOT_DNA: CreativeDNA = {
  world: "A sun-baked parking lot outside a small business",
  mainCharacter: "An exhausted person in a full mascot costume",
  coreConflict:
    "The business is visibly trying to attract attention while website visitors receive no answer",
  productRole:
    "AI website chatbot handles the website moment shown in the opening",
  viewerQuestion:
    "Why is the mascot desperately working outside while the website only pretends to respond?",
  endingIntent:
    "Show that visitors finally receive a real answer without staff returning to the computer",
  immutableRules: [
    "Do not relocate the primary story into a generic office or co-working space",
    "Do not replace the mascot as the main visual subject",
    "Do not turn the middle into a laptop analytics montage",
    "Do not replace the unanswered-visitor conflict with a different marketing problem",
    "Do not resolve the story only with a happy expression; show that visitors receive answers",
    "Do not reduce the product to a generic success mood; show or clearly communicate its answering role",
  ],
};

function mascotWinner(withDna: boolean): CreativeCandidate {
  return {
    candidateId: "c5-absurd_understandable-div",
    family: "absurd_understandable",
    coreIdea:
      "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
    emotionalReaction: "amused recognition",
    hookLine: "Mascot suffers, fake typing online.",
    openingSituation:
      "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
    visualPromise:
      "Film the opening as a scroll-stop frame: Mascot suffers, fake typing online. No generic office/laptop montage.",
    storyProgression:
      "Hold opening → after-hours silence → offline pain → product answers",
    productConnection:
      "AI website chatbot handles the website moment shown in the opening",
    ending: "Next visitor gets an answer even when the crew stays outside",
    expectedViewerQuestion:
      "Why is the mascot desperately working outside while the website only pretends to respond?",
    familiarityRisk: "low",
    memorabilityReason: "mascot parking lot",
    ...(withDna ? { creativeDNA: MASCOT_DNA, creativeDnaSource: "model" as const } : {}),
  };
}

console.log("\ncreative DNA schema");

check("old candidate without Creative DNA remains structurally usable", () => {
  const old = mascotWinner(false);
  assert.equal(old.creativeDNA, undefined);
  assert.equal(normalizeCreativeDNA(old.creativeDNA), undefined);
  assert.equal(isValidCreativeDNA(undefined), false);
});

check("new candidate with valid Creative DNA is accepted", () => {
  const next = mascotWinner(true);
  assert.ok(isValidCreativeDNA(next.creativeDNA));
  assert.deepEqual(normalizeCreativeDNA(next.creativeDNA), MASCOT_DNA);
});

check("malformed Creative DNA is safely omitted", () => {
  assert.equal(normalizeCreativeDNA({ world: "x" }), undefined);
  assert.equal(
    normalizeCreativeDNA({
      ...MASCOT_DNA,
      immutableRules: ["Be creative", "Make it engaging"],
    }),
    undefined,
  );
  assert.equal(
    normalizeCreativeDNA({
      ...MASCOT_DNA,
      endingIntent: "",
    }),
    undefined,
  );
});

check("divergence winners include Creative DNA", () => {
  const planned = planCreativeCandidatesForPackage({
    topic: ACCOUNTANT_TOPIC,
    angle: ACCOUNTANT_ANGLE,
    painPoints,
    productIs,
    requireVideo: true,
  });
  const dna = planned.plan!.selectedCandidate.creativeDNA;
  assert.ok(dna, "winner missing creativeDNA");
  assert.ok(isValidCreativeDNA(dna));
  assert.equal(planned.plan!.selectedCandidate.creativeDnaSource, "model");
  assert.equal(planned.dnaResolve?.source, "model");
  assert.equal(planned.dnaResolve?.fallbackUsed, false);
  assert.ok(planned.dnaPromptBlock.includes(CREATIVE_DNA_PROMPT_HEADER));
  assert.ok(planned.dnaPromptBlock.includes(dna!.world));
  assert.ok(CREATIVE_DNA_AUTHORING_INSTRUCTIONS.includes("not a summary of the topic"));
});

check("authored DNA is not replaced by deriveCreativeDNA", () => {
  const signals = extractTopicConcreteSignals(ACCOUNTANT_TOPIC, ACCOUNTANT_ANGLE, {
    productIs,
  });
  const base = mascotWinner(false);
  const authored = { ...MASCOT_DNA };
  const resolved = resolveCandidateCreativeDNA({
    candidate: base,
    authoredDna: authored,
    ctx: { signals, product: productIs[0]!, pain: painPoints[0]!, productIs },
  });
  assert.equal(resolved.source, "model");
  assert.equal(resolved.fallbackUsed, false);
  assert.equal(resolved.dna!.world, MASCOT_DNA.world);
  assert.equal(resolved.dna!.mainCharacter, MASCOT_DNA.mainCharacter);

  const withExisting = withCreativeDNA(
    { ...base, creativeDNA: MASCOT_DNA, creativeDnaSource: "model" },
    { signals, product: productIs[0]!, pain: painPoints[0]!, productIs },
  );
  assert.equal(withExisting.creativeDnaSource, "model");
  assert.equal(withExisting.creativeDNA!.world, MASCOT_DNA.world);
});

check("missing / malformed DNA uses deterministic fallback with reason", () => {
  const signals = extractTopicConcreteSignals(ACCOUNTANT_TOPIC, ACCOUNTANT_ANGLE, {
    productIs,
  });
  const base = mascotWinner(false);
  const missing = resolveCandidateCreativeDNA({
    candidate: base,
    authoredDna: undefined,
    ctx: { signals, product: productIs[0]!, pain: painPoints[0]! },
  });
  assert.equal(missing.source, "deterministic_fallback");
  assert.equal(missing.fallbackUsed, true);
  assert.equal(missing.fallbackReason, "authored_dna_missing");
  assert.ok(missing.dna);

  const malformed = resolveCandidateCreativeDNA({
    candidate: base,
    authoredDna: { world: "x" },
    ctx: { signals, product: productIs[0]!, pain: painPoints[0]! },
  });
  assert.equal(malformed.source, "deterministic_fallback");
  assert.equal(malformed.fallbackReason, "authored_dna_malformed");
});

check("authorCreativeDNA matches exact candidate concept (not topic summary)", () => {
  const signals = extractTopicConcreteSignals(ACCOUNTANT_TOPIC, ACCOUNTANT_ANGLE, {
    productIs,
  });
  const base = mascotWinner(false);
  const authored = authorCreativeDNA(base, {
    signals,
    product: productIs[0]!,
    pain: painPoints[0]!,
  });
  assert.match(authored.world, /parking lot/i);
  assert.match(authored.mainCharacter, /mascot/i);
  assert.doesNotMatch(authored.world, /^a business environment/i);
  assert.doesNotMatch(authored.mainCharacter, /business owner/i);
  assert.equal(authored.viewerQuestion, base.expectedViewerQuestion);
  assert.match(authored.productRole, /chatbot|AI|answer/i);
  const consistency = validateCandidateDnaConsistency(base, authored, {
    productIs,
  });
  assert.equal(consistency.passed, true, consistency.violations.map((v) => v.message).join("; "));
});

check("deriveCreativeDNA remains available as fallback", () => {
  const signals = extractTopicConcreteSignals(ACCOUNTANT_TOPIC, ACCOUNTANT_ANGLE, {
    productIs,
  });
  const base = mascotWinner(false);
  const dna = deriveCreativeDNA(base, {
    signals,
    product: productIs[0]!,
    pain: painPoints[0]!,
  });
  assert.match(dna.world, /parking lot/i);
  assert.match(dna.mainCharacter, /mascot/i);
  assert.match(dna.productRole, /chatbot|AI|answer/i);
  assert.ok(dna.immutableRules.some((r) => /co-working|office/i.test(r)));
  assert.ok(dna.immutableRules.some((r) => /mascot/i.test(r)));
});

console.log("\ncreative DNA consistency");

check("parking-lot mascot candidate + matching DNA passes", () => {
  const base = mascotWinner(false);
  const result = validateCandidateDnaConsistency(base, MASCOT_DNA, { productIs });
  assert.equal(result.passed, true, result.violations.map((v) => v.message).join("; "));
});

check("parking-lot candidate + co-working DNA fails", () => {
  const base = mascotWinner(false);
  const bad: CreativeDNA = {
    ...MASCOT_DNA,
    world: "A bright co-working space in daylight",
  };
  const result = validateCandidateDnaConsistency(base, bad, { productIs });
  assert.equal(result.passed, false);
  assert.ok(result.violations.some((v) => v.field === "world"));
});

check("mascot candidate + generic business-owner character is flagged", () => {
  const base = mascotWinner(false);
  const bad: CreativeDNA = {
    ...MASCOT_DNA,
    mainCharacter: "A business owner",
  };
  const result = validateCandidateDnaConsistency(base, bad, { productIs });
  assert.equal(result.passed, false);
  assert.ok(result.violations.some((v) => v.field === "mainCharacter"));
});

check("emotion-only endingIntent is flagged", () => {
  const base = mascotWinner(false);
  const bad: CreativeDNA = {
    ...MASCOT_DNA,
    endingIntent: "End with relief.",
  };
  const result = validateCandidateDnaConsistency(base, bad, { productIs });
  assert.equal(result.passed, false);
  assert.ok(result.violations.some((v) => v.field === "endingIntent"));
});

check("product role inventing unsupported CRM functionality is rejected", () => {
  const base = mascotWinner(false);
  const bad: CreativeDNA = {
    ...MASCOT_DNA,
    productRole: "The CRM syncs payroll and inventory automatically",
  };
  const result = validateCandidateDnaConsistency(base, bad, { productIs });
  assert.equal(result.passed, false);
  assert.ok(result.violations.some((v) => v.field === "productRole"));
});

check("object-led fish-tank concept is not flattened to a generic person", () => {
  const signals = extractTopicConcreteSignals(ACCOUNTANT_TOPIC, ACCOUNTANT_ANGLE, {
    productIs,
  });
  const fishBase: Omit<CreativeCandidate, "creativeDNA" | "creativeDnaSource"> = {
    candidateId: "fish-tank-div",
    family: "absurd_understandable",
    coreIdea:
      "Waiting room fish tank; one fish labeled website leads; bowl nearly empty while phone fish overcrowded.",
    emotionalReaction: "amused recognition",
    hookLine: "Phone leads overcrowded; website leads gasping.",
    openingSituation:
      "Waiting room fish tank at an accounting lobby; one fish labeled website leads; bowl nearly empty while phone fish overcrowded.",
    visualPromise: "Film the fish-tank metaphor. No generic office/laptop montage.",
    storyProgression: "Hold tank → reveal unanswered website bowl → product fills answers",
    productConnection:
      "AI website chatbot answers website visitors while staff handle the phone bowl",
    ending: "Website leads get oxygen — visitors receive answers",
    expectedViewerQuestion: "Why is the website bowl empty?",
    familiarityRisk: "low",
    memorabilityReason: "fish tank",
  };
  const authored = authorCreativeDNA(fishBase, {
    signals,
    product: productIs[0]!,
    pain: painPoints[0]!,
  });
  assert.match(authored.mainCharacter, /fish tank/i);
  assert.doesNotMatch(authored.mainCharacter, /business owner/i);
  assert.match(authored.world, /fish tank/i);
  const consistency = validateCandidateDnaConsistency(fishBase, authored, {
    productIs,
  });
  assert.equal(
    consistency.passed,
    true,
    consistency.violations.map((v) => v.message).join("; "),
  );

  const flattened: CreativeDNA = {
    ...authored,
    mainCharacter: "A business owner",
    world: "A business environment",
  };
  // world "business environment" fails isValid; consistency also flags character
  assert.equal(isValidCreativeDNA(flattened), false);
  const flatCheck = validateCandidateDnaConsistency(fishBase, {
    ...authored,
    mainCharacter: "A tired employee at a desk",
  }, { productIs });
  assert.equal(flatCheck.passed, false);
});

console.log("\ncreative DNA prompt assembly");

check("canonical DNA section injected when present; absent for historical", () => {
  const withDna = mascotWinner(true);
  const without = mascotWinner(false);
  const planWith = {
    version: "creative-candidates@3.0" as const,
    creativeDivergence: {
      version: "creative-divergence@2.1" as const,
      rawGeneratedCount: 0,
      rawAfterFilterCount: 0,
      clusters: [],
      survivors: [],
      rejectedGenericSamples: [],
      candidateSourceIds: [],
    },
    generatedCandidates: [withDna],
    candidateScores: [],
    rejectedCandidates: [],
    selectedCandidate: withDna,
    comparativeJudge: {
      mostLikelyToStopScrolling: withDna.candidateId,
      leastInterchangeable: withDna.candidateId,
      clearestMentalImage: withDna.candidateId,
      mostMemorableInOneHour: withDna.candidateId,
      bestProductTopicFit: withDna.candidateId,
      winnerId: withDna.candidateId,
      winnerReason: "test",
    },
    finalScriptFidelity: null,
    finalStoryboardFidelity: null,
    regenerationReason: null,
  };
  const planWithout = {
    ...planWith,
    selectedCandidate: without,
    generatedCandidates: [without],
  };
  assert.ok(buildCreativeDnaPromptBlockFromPlan(planWith).includes(CREATIVE_DNA_PROMPT_HEADER));
  assert.equal(buildCreativeDnaPromptBlockFromPlan(planWithout), "");
});

check("DNA appears after candidate and before Identity / Narrative / Product Reveal", () => {
  const planned = planCreativeCandidatesForPackage({
    topic: ACCOUNTANT_TOPIC,
    angle: ACCOUNTANT_ANGLE,
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

  const identity: CreativeIdentity = {
    version: CREATIVE_IDENTITY_VERSION,
    environment: "a bright co-working space in daylight",
    mood: "quiet tension before a decision",
    lighting: "soft documentary daylight",
    camera: "eye-level handheld",
    composition: "subject-centered medium shot",
    human_presence: "one person in frame",
    color_feel: "warm neutral",
    key: "test",
    option_ids: {
      environment: "co_working_daylight",
      mood: "quietly_tense",
      lighting: "soft_documentary",
      camera: "eye_level",
      composition: "subject_centered",
      human_presence: "one_person",
      color_feel: "warm_neutral",
    },
  };

  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "problem_aware",
    topic: ACCOUNTANT_TOPIC,
    angle: ACCOUNTANT_ANGLE,
    platform: "tiktok",
    format: "short",
    availableAssets: [],
    requireVideo: true,
    directives,
    creativeCandidatePromptBlock: planned.promptBlock,
    creativeDnaPromptBlock: planned.dnaPromptBlock,
    creativeIdentityPromptBlock: buildCreativeIdentityPromptBlock(identity, []),
    visualNarrativePromptBlock: "VISUAL NARRATIVE (test)",
    productRevealPromptBlock: "PRODUCT REVEAL (test)",
  });

  const iCand = prompt.indexOf("CREATIVE CANDIDATE SELECTION");
  const iDna = prompt.indexOf(CREATIVE_DNA_PROMPT_HEADER);
  const iId = prompt.indexOf("CREATIVE IDENTITY");
  const iNar = prompt.indexOf("VISUAL NARRATIVE");
  const iRev = prompt.indexOf("PRODUCT REVEAL");
  assert.ok(iCand >= 0 && iDna > iCand);
  assert.ok(iId > iDna && iNar > iDna && iRev > iDna);
});

check("conflicting Identity environment is neutralized; compatible treatment remains", () => {
  const identity: CreativeIdentity = {
    version: CREATIVE_IDENTITY_VERSION,
    environment: "a bright co-working space in daylight",
    mood: "quiet tension before a decision",
    lighting: "soft documentary daylight",
    camera: "eye-level handheld",
    composition: "subject-centered medium shot",
    human_presence: "one person in frame",
    color_feel: "warm neutral",
    key: "test",
    option_ids: {
      environment: "co_working_daylight",
      mood: "quietly_tense",
      lighting: "soft_documentary",
      camera: "eye_level",
      composition: "subject_centered",
      human_presence: "one_person",
      color_feel: "warm_neutral",
    },
  };
  assert.equal(identityEnvironmentConflictsWithDna(identity.environment, MASCOT_DNA), true);
  const { identity: fixed, suppressed } = neutralizeIdentityEnvironmentForDna(
    identity,
    MASCOT_DNA,
  );
  assert.equal(suppressed, true);
  assert.match(fixed.environment, /canonical Creative DNA world/i);
  assert.match(fixed.environment, /parking lot/i);
  assert.equal(fixed.mood, identity.mood);
  assert.equal(fixed.lighting, identity.lighting);
  assert.equal(fixed.camera, identity.camera);

  const block = buildCreativeIdentityPromptBlock(fixed, [], {
    dnaWorldTreatment: true,
  });
  assert.match(block, /treatment only/i);
  assert.doesNotMatch(block, /^- Environment: a bright co-working/m);
  assert.match(block, /soft documentary daylight/);
});

check("without DNA, Identity environment behavior is unchanged", () => {
  const identity: CreativeIdentity = {
    version: CREATIVE_IDENTITY_VERSION,
    environment: "a bright co-working space in daylight",
    mood: "curious, alert attention",
    lighting: "soft documentary daylight",
    camera: "eye-level handheld",
    composition: "subject-centered medium shot",
    human_presence: "one person in frame",
    color_feel: "warm neutral",
    key: "test",
    option_ids: {
      environment: "co_working_daylight",
      mood: "curious",
      lighting: "soft_documentary",
      camera: "eye_level",
      composition: "subject_centered",
      human_presence: "one_person",
      color_feel: "warm_neutral",
    },
  };
  const block = buildCreativeIdentityPromptBlock(identity, []);
  assert.match(block, /^- Environment: a bright co-working space in daylight/m);
});

console.log("\ncreative DNA validator");

check("mascot + parking-lot compliant package passes", () => {
  const result = validateCreativeDnaAgainstPackage(MASCOT_DNA, {
    hook: "Mascot suffers, fake typing online.",
    voiceoverText:
      "Mascot suffers, fake typing online. Outside, the costume keeps waving at traffic. Online, website visitors finally get a real answer from the AI chatbot while the crew stays in the lot.",
    concept:
      "Mascot melting in a sun-baked parking lot; chat finally answers visitors.",
    imagePrompts: [
      "Photorealistic mascot costume melting in a parking lot heat, waving at traffic",
      "Same parking lot; phone chat bubble implying a visitor question unanswered",
      "Parking lot still; subtle cue that the AI chatbot answered the website visitor",
    ],
  });
  assert.equal(result.passed, true, result.violations.map((v) => v.message).join("; "));
});

check("office relocation violates explicit immutable rule", () => {
  const result = validateCreativeDnaAgainstPackage(MASCOT_DNA, {
    hook: "Mascot suffers, fake typing online.",
    voiceoverText: "Mascot suffers, fake typing online. Then an accountant essay.",
    imagePrompts: [
      "Bright co-working space in daylight, mascot just inside a glass door",
      "Laptop analytics dashboard on a monitor in a modern office desk",
      "Person leans back in chair, laptop closed, calm resolution",
    ],
  });
  assert.equal(result.passed, false);
  assert.ok(result.violations.some((v) => v.field === "immutableRule"));
});

check("missing mascot is detected", () => {
  const result = validateCreativeDnaAgainstPackage(MASCOT_DNA, {
    hook: "Someone looks tired.",
    voiceoverText: "Someone looks tired. The AI assistant answers visitors.",
    imagePrompts: [
      "A sun-baked parking lot outside a small business with an employee waving",
      "Parking lot continues; visitor gets an answer",
    ],
  });
  assert.equal(result.passed, false);
  assert.ok(
    result.violations.some(
      (v) => v.field === "mainCharacter" || v.field === "immutableRule",
    ),
  );
});

check("product role absent from payoff is detected", () => {
  const result = validateCreativeDnaAgainstPackage(MASCOT_DNA, {
    hook: "Mascot suffers, fake typing online.",
    voiceoverText:
      "Mascot suffers, fake typing online. In today's world businesses need better branding.",
    concept: "Mascot in parking lot.",
    imagePrompts: [
      "Mascot costume in a parking lot heat",
      "Person leans back in chair, laptop closed, calm resolution",
    ],
  });
  assert.equal(result.passed, false);
  assert.ok(
    result.violations.some(
      (v) => v.field === "productRole" || v.field === "endingIntent",
    ),
  );
});

console.log("\nno-new-LLM-call guarantee");

check("candidate planning + DNA derivation stays synchronous (no LLM)", () => {
  // planCreativeCandidatesForPackage is sync and returns DNA without awaiting providers.
  const t0 = Date.now();
  const planned = planCreativeCandidatesForPackage({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
    requireVideo: true,
  });
  const elapsed = Date.now() - t0;
  assert.ok(planned.plan?.selectedCandidate.creativeDNA);
  assert.ok(elapsed < 2000, `planning unexpectedly slow (${elapsed}ms) — possible I/O`);
  // Workflow still has exactly one primary generateValidatedJson + optional fidelity repair.
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const wf = readFileSync(
    path.join(root, "lib/ai/workflows/generateContentPackage.ts"),
    "utf8",
  );
  const calls = [...wf.matchAll(/generateValidatedJson\(/g)];
  // One initial generation + one fidelity repair path (same as before DNA).
  assert.equal(calls.length, 2, `expected 2 generateValidatedJson sites, got ${calls.length}`);
  assert.doesNotMatch(wf, /deriveCreativeDNA\([\s\S]*await/);
});

check("before/after prompt comparison: DNA locks parking-lot world vs co-working Identity", () => {
  const planned = planCreativeCandidatesForPackage({
    topic: ACCOUNTANT_TOPIC,
    angle: ACCOUNTANT_ANGLE,
    painPoints,
    productIs,
    requireVideo: true,
  });
  // Force mascot DNA onto a fixture plan for a production-like comparison.
  const winner = {
    ...mascotWinner(true),
    creativeDNA: MASCOT_DNA,
  };
  const dnaBlock = buildCreativeDnaPromptBlock(MASCOT_DNA);
  const identity: CreativeIdentity = {
    version: CREATIVE_IDENTITY_VERSION,
    environment: "a bright co-working space in daylight",
    mood: "quiet tension before a decision",
    lighting: "soft documentary daylight",
    camera: "eye-level handheld",
    composition: "subject-centered medium shot",
    human_presence: "one person in frame",
    color_feel: "warm neutral",
    key: "test",
    option_ids: {
      environment: "co_working_daylight",
      mood: "quietly_tense",
      lighting: "soft_documentary",
      camera: "eye_level",
      composition: "subject_centered",
      human_presence: "one_person",
      color_feel: "warm_neutral",
    },
  };
  const beforeIdentity = buildCreativeIdentityPromptBlock(identity, []);
  const { identity: afterId, suppressed } = neutralizeIdentityEnvironmentForDna(
    identity,
    MASCOT_DNA,
  );
  assert.equal(suppressed, true);
  const afterIdentity = buildCreativeIdentityPromptBlock(afterId, [], {
    dnaWorldTreatment: true,
  });

  assert.match(beforeIdentity, /co-working/);
  assert.doesNotMatch(afterIdentity, /^- Environment: a bright co-working/m);
  assert.match(afterIdentity, /parking lot/i);
  assert.match(dnaBlock, /endingIntent/);
  assert.match(dnaBlock, /immutableRules/);
  assert.ok(winner.hookLine.includes("Mascot"));
  // Without DNA: Identity owns environment. With DNA: world stays parking lot.
  assert.match(dnaBlock, /sun-baked parking lot/i);
  assert.ok(planned.promptBlock.includes("CREATIVE CANDIDATE"));
});

console.log("\nselection v3 — commercial success");

function fixtureCandidate(
  partial: Partial<CreativeCandidate> &
    Pick<CreativeCandidate, "candidateId" | "family" | "hookLine" | "openingSituation" | "coreIdea">,
): CreativeCandidate {
  return {
    emotionalReaction: "recognition",
    visualPromise: partial.visualPromise ?? "Film the opening situation clearly",
    storyProgression: "Hold opening → escalate → product answers",
    productConnection:
      partial.productConnection ??
      "AI website chatbot answers the visitor in the opening moment",
    ending: "Website answers when you can't",
    expectedViewerQuestion: "What happens next?",
    familiarityRisk: "medium",
    memorabilityReason: "Specific situation",
    ...partial,
  };
}

check("family metadata ranks direct_product above absurd on commercial reliability", () => {
  const dp = familyCommercialMetadata("direct_product_world");
  const abs = familyCommercialMetadata("absurd_understandable");
  const ve = familyCommercialMetadata("visual_exaggeration");
  assert.ok(dp.commercial_reliability > abs.commercial_reliability);
  assert.ok(ve.commercial_reliability > abs.commercial_reliability);
  assert.equal(abs.requires_readable_text, true);
  assert.ok(abs.metaphor_risk >= 8);
  assert.equal(CREATIVE_FAMILY_COMMERCIAL_METADATA.social_observation.requires_readable_text, true);
});

check("departure-board absurd scores low commercial vs human product-world", () => {
  const absurd = fixtureCandidate({
    candidateId: "c-absurd-board",
    family: "absurd_understandable",
    hookLine: "Departure board for the wrong channel.",
    openingSituation:
      'Train-station style departure board: "Phone caller #47" boarding; "Website visitor" stuck on Delayed',
    coreIdea:
      "Departure board comparing phone caller boarding vs website visitor Delayed",
  });
  const direct = fixtureCandidate({
    candidateId: "c-direct-hands",
    family: "direct_product_world",
    hookLine: "Urgent question dies in silence.",
    openingSituation:
      "Close on a customer's hands sending an urgent question on their phone; reply thread shows seen with no answer",
    coreIdea:
      "Hands on phone waiting for a website reply that never comes during peak demand",
    productConnection:
      "Chat answers the visitor on the services page while the owner is busy",
  });
  const visual = fixtureCandidate({
    candidateId: "c-visual-mountain",
    family: "visual_exaggeration",
    hookLine: "Lost work as a physical mountain.",
    openingSituation:
      "Physical stack of printed missed-web-session logs grows on the counter while staff handle only the phone",
    coreIdea: "Mountain of missed website sessions beside a ringing phone",
  });

  const scored = applyGenericityRejections([absurd, direct, visual], {
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    productIs,
  });
  const a = scored.find((s) => s.candidate.candidateId === "c-absurd-board")!;
  const d = scored.find((s) => s.candidate.candidateId === "c-direct-hands")!;
  const v = scored.find((s) => s.candidate.candidateId === "c-visual-mountain")!;

  assert.ok(a.commercialTotal != null && d.commercialTotal != null);
  assert.ok(
    d.commercialTotal! > a.commercialTotal!,
    `direct commercial ${d.commercialTotal} should beat absurd ${a.commercialTotal}`,
  );
  assert.ok(
    v.commercialTotal! > a.commercialTotal!,
    `visual commercial ${v.commercialTotal} should beat absurd ${a.commercialTotal}`,
  );

  // Even if absurd leads on creative originality/stop, final selection prefers commercial
  assert.ok(a.scores.originality >= d.scores.originality - 1);
  const judge = runComparativeJudge(scored);
  const winner = selectWinner(scored, judge);
  assert.notEqual(
    winner.candidate.family,
    "absurd_understandable",
    `absurd must not win on originality alone; got ${winner.candidate.family} final=${winner.finalSelectionScore}`,
  );
  assert.ok(
    winner.candidate.family === "direct_product_world" ||
      winner.candidate.family === "visual_exaggeration",
  );
  assert.ok(judge.selectionDiagnostics.whyWon.includes("commercial_score="));
  assert.ok(
    judge.selectionDiagnostics.losersPenalized.some(
      (l) => l.candidateId === "c-absurd-board",
    ),
  );
});

check("finalSelectionScore = creative + commercial", () => {
  const c = scoreCommercialSuccess(
    fixtureCandidate({
      candidateId: "x",
      family: "direct_product_world",
      hookLine: "Heat relief outside, none online.",
      openingSituation:
        "Person fans themselves in a queue while refreshing a dead chat on their phone",
      coreIdea: "Queue outside; dead chat online",
    }),
  );
  const creative = 80;
  const commercial = commercialTotal(c);
  assert.equal(finalSelectionScore(creative, commercial), creative + commercial);
});

check("plan exposes selection diagnostics and v3 version", () => {
  const planned = planCreativeCandidatesForPackage({
    topic: HVAC_TOPIC,
    angle: HVAC_ANGLE,
    painPoints,
    productIs,
    requireVideo: true,
  });
  assert.equal(planned.plan!.version, "creative-candidates@3.0");
  assert.ok(planned.plan!.selectionDiagnostics);
  assert.match(planned.plan!.selectionDiagnostics!.whyWon, /final_selection_score=/);
  assert.match(planned.promptBlock, /COMMERCIAL SUCCESS|Selection v3/);
  // Winner should not be auto-absurd solely from originality when better commercial options exist
  const winnerFamily = planned.plan!.selectedCandidate.family;
  const winnerScore = planned.plan!.candidateScores.find(
    (s) => s.candidate.candidateId === planned.plan!.selectedCandidate.candidateId,
  )!;
  assert.ok(winnerScore.finalSelectionScore != null);
  const absurd = planned.plan!.candidateScores.find(
    (s) => s.candidate.family === "absurd_understandable" && !s.rejected,
  );
  if (absurd && winnerFamily !== "absurd_understandable") {
    assert.ok(
      (winnerScore.finalSelectionScore ?? 0) >= (absurd.finalSelectionScore ?? 0),
    );
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
