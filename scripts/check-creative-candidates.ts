// Creative candidates — DNA, fidelity, prompt blocks (Creative Engine v3)
//   npm run check:creative-candidates
// Candidate invention lives in check:creative-engine-v3.

import assert from "node:assert/strict";
import {
  authorCreativeDNA,
  buildCreativeCandidatePromptBlock,
  buildCreativeDnaPromptBlock,
  buildCreativeDnaPromptBlockFromPlan,
  checkConceptFidelity,
  CREATIVE_DNA_AUTHORING_INSTRUCTIONS,
  CREATIVE_DNA_PROMPT_HEADER,
  deriveCreativeDNA,
  extractTopicConcreteSignals,
  identityEnvironmentConflictsWithDna,
  isValidCreativeDNA,
  neutralizeIdentityEnvironmentForDna,
  normalizeCreativeDNA,
  openingSituationFaithfulToScene1,
  resolveCandidateCreativeDNA,
  validateCandidateDnaConsistency,
  validateCreativeDnaAgainstPackage,
  withCreativeDNA,
} from "@/lib/creative-candidates";
import type { CreativeCandidate, CreativeCandidatePlan, CreativeDNA } from "@/lib/creative-candidates/types";
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

function emptyPlan(winner: CreativeCandidate): CreativeCandidatePlan {
  return {
    version: "creative-candidates@3.0",
    generatedCandidates: [winner],
    candidateScores: [],
    rejectedCandidates: [],
    selectedCandidate: winner,
    comparativeJudge: {
      mostLikelyToStopScrolling: winner.candidateId,
      leastInterchangeable: winner.candidateId,
      clearestMentalImage: winner.candidateId,
      mostMemorableInOneHour: winner.candidateId,
      bestProductTopicFit: winner.candidateId,
      winnerId: winner.candidateId,
      winnerReason: "test",
    },
    finalScriptFidelity: null,
    finalStoryboardFidelity: null,
    regenerationReason: null,
  };
}

console.log("\nfidelity (invented fixtures)");

check("faithful script+scene1 passes fidelity", () => {
  const winner = {
    candidateId: "inv-1",
    family: "invented" as const,
    coreIdea: "Parking-lot mascot waves while chat fakes typing",
    emotionalReaction: "amused recognition",
    hookLine: "Mascot suffers, fake typing online.",
    openingSituation:
      "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
    visualPromise: "Scroll-stop parking lot mascot; no generic office montage.",
    storyProgression: "Hold opening → silence → product answers",
    productConnection: "AI website chatbot handles the website moment",
    ending: "Next visitor gets an answer",
    expectedViewerQuestion: "Why is the mascot outside while chat fakes typing?",
    familiarityRisk: "low" as const,
    memorabilityReason: "mascot parking lot",
  };
  const fidelity = checkConceptFidelity({
    winner,
    hook: winner.hookLine,
    voiceoverText: `${winner.hookLine} The parking lot mascot keeps waving while the AI website chatbot never sends a message.`,
    visualScenes: [
      {
        source: "ai",
        image_prompt: winner.openingSituation,
      },
    ],
    topic: ACCOUNTANT_TOPIC,
    angle: ACCOUNTANT_ANGLE,
  });
  assert.equal(fidelity.passed, true, fidelity.failureReasons.join("; "));
  assert.equal(
    openingSituationFaithfulToScene1(winner.openingSituation, winner.openingSituation).ok,
    true,
  );
});

check("storyboard replacing opening with laptop/office fails fidelity", () => {
  const winner = {
    candidateId: "inv-2",
    family: "invented" as const,
    coreIdea: "Parking-lot mascot waves while chat fakes typing",
    emotionalReaction: "amused recognition",
    hookLine: "Mascot suffers, fake typing online.",
    openingSituation:
      "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
    visualPromise: "Scroll-stop parking lot mascot",
    storyProgression: "Hold opening → silence → product answers",
    productConnection: "AI website chatbot handles the website moment",
    ending: "Next visitor gets an answer",
    expectedViewerQuestion: "Why is the mascot outside?",
    familiarityRisk: "low" as const,
    memorabilityReason: "mascot",
  };
  const fidelity = checkConceptFidelity({
    winner,
    hook: winner.hookLine,
    voiceoverText: "Most businesses struggle with efficiency in today's world.",
    visualScenes: [
      {
        source: "ai",
        image_prompt: "A person looking at a laptop at a modern office desk",
      },
    ],
    topic: ACCOUNTANT_TOPIC,
    angle: ACCOUNTANT_ANGLE,
  });
  assert.equal(fidelity.passed, false);
  assert.ok(fidelity.collapsedToGenericOffice || fidelity.failureReasons.length > 0);
});

check("prompt block describes Creative Engine v3 invented winner", () => {
  const winner = {
    candidateId: "inv-3",
    family: "invented" as const,
    coreIdea: "Parking-lot mascot",
    emotionalReaction: "amused recognition",
    hookLine: "Mascot suffers, fake typing online.",
    openingSituation: "Mascot costume melting in parking lot heat",
    visualPromise: "Parking lot frame",
    storyProgression: "Hold → silence → answer",
    productConnection: "AI website chatbot answers",
    ending: "Visitor gets an answer",
    expectedViewerQuestion: "Why the mascot?",
    familiarityRisk: "low" as const,
    memorabilityReason: "mascot",
  };
  const block = buildCreativeCandidatePromptBlock(emptyPlan(winner));
  assert.match(block, /Creative Engine v3/);
  assert.doesNotMatch(block, /Divergence|Attention First|template banks were clustered/i);
  assert.ok(block.includes(winner.hookLine));
  assert.ok(block.includes(winner.openingSituation));
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
  assert.ok(
    dna.immutableRules.some((r) => /Do not relocate the primary story away from/i.test(r)),
  );
  assert.ok(
    dna.immutableRules.some((r) =>
      /low-information empty environment|Do not replace the opening event/i.test(r),
    ),
  );
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
  const winner = mascotWinner(true);
  const plan = emptyPlan(winner);
  const promptBlock = buildCreativeCandidatePromptBlock(plan);
  const dnaPromptBlock = buildCreativeDnaPromptBlockFromPlan(plan);
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
    creativeCandidatePromptBlock: promptBlock,
    creativeDnaPromptBlock: dnaPromptBlock,
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

check("Identity environment is always locked to DNA world (treatment only)", () => {
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

  // Even a "compatible-looking" environment string is replaced — Identity never owns place.
  const softEnv: CreativeIdentity = {
    ...identity,
    environment: "open shade outdoor light near the story location",
  };
  const { identity: fixed2, suppressed: suppressed2 } =
    neutralizeIdentityEnvironmentForDna(softEnv, MASCOT_DNA);
  assert.equal(suppressed2, true);
  assert.match(fixed2.environment, /canonical Creative DNA world/i);

  const block = buildCreativeIdentityPromptBlock(fixed, [], {
    dnaWorldTreatment: true,
  });
  assert.match(block, /treatment only|NEVER location/i);
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

console.log("\nworkflow DNA wiring");

check("generate workflow always uses Creative Engine v3 (no Divergence fallback)", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const wf = readFileSync(
    path.join(root, "lib/ai/workflows/generateContentPackage.ts"),
    "utf8",
  );
  const regen = readFileSync(
    path.join(root, "lib/ai/workflows/regenerateContentPackage.ts"),
    "utf8",
  );
  assert.match(wf, /planCreativeEngineV3ForPackage/);
  assert.match(regen, /planCreativeEngineV3ForPackage/);
  assert.doesNotMatch(wf, /planCreativeCandidatesForPackage|generateCreativeCandidatesWithDivergence|resolveCreativeEngineV3Mode/);
  assert.doesNotMatch(regen, /planCreativeCandidatesForPackage|generateCreativeCandidatesWithDivergence|resolveCreativeEngineV3Mode/);
  assert.match(wf, /validateStoryIntegrity/);
  assert.match(wf, /storyIntegrityRepairAppendix/);
  assert.match(wf, /validateProductDemonstrationIntegrity/);
  assert.match(wf, /planCreativeEngineV3ForPackage/);
});

check("before/after prompt comparison: DNA locks parking-lot world vs co-working Identity", () => {
  const winner = {
    ...mascotWinner(true),
    creativeDNA: MASCOT_DNA,
  };
  const dnaBlock = buildCreativeDnaPromptBlock(MASCOT_DNA);
  const candidateBlock = buildCreativeCandidatePromptBlock(emptyPlan(winner));
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
  assert.match(dnaBlock, /sun-baked parking lot/i);
  assert.ok(candidateBlock.includes("CREATIVE CANDIDATE"));
});


console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
