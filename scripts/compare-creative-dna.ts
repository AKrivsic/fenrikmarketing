/**
 * Creative DNA comparison across concept types (no LLM call).
 *
 *   node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/compare-creative-dna.ts
 */
import {
  authorCreativeDNA,
  buildCreativeDnaPromptBlock,
  CREATIVE_DNA_AUTHORING_INSTRUCTIONS,
  deriveCreativeDNA,
  extractTopicConcreteSignals,
  neutralizeIdentityEnvironmentForDna,
  resolveCandidateCreativeDNA,
  validateCandidateDnaConsistency,
  validateCreativeDnaAgainstPackage,
  type CreativeDNA,
} from "@/lib/creative-candidates";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import { buildCreativeIdentityPromptBlock } from "@/lib/creative-identity/promptBlocks";
import {
  CREATIVE_IDENTITY_VERSION,
  type CreativeIdentity,
} from "@/lib/creative-identity/types";

const productIs = ["AI website chatbot that answers visitors 24/7"];
const pain = "Website visitors leave unanswered";
const topic =
  "The accountant who came back from vacation to a week's worth of missed leads";
const angle = "Website visited while away; static site; invisible leak";
const signals = extractTopicConcreteSignals(topic, angle, { productIs });
const ctx = { signals, product: productIs[0]!, pain, productIs };

type Fixture = {
  label: string;
  candidate: Omit<CreativeCandidate, "creativeDNA" | "creativeDnaSource">;
};

const fixtures: Fixture[] = [
  {
    label: "1. Mascot / parking lot",
    candidate: {
      candidateId: "mascot-parking",
      family: "absurd_understandable",
      coreIdea:
        "Mascot costume melting in parking lot heat; employee waves at traffic; chat widget fake-typing.",
      emotionalReaction: "amused recognition",
      hookLine: "Mascot suffers, fake typing online.",
      openingSituation:
        "Mascot costume melting in parking lot heat; employee waves at traffic; inside, chat widget shows typing indicator with no message sent.",
      visualPromise: "Scroll-stop parking lot. No generic office/laptop montage.",
      storyProgression: "Hold opening → silence → product answers",
      productConnection:
        "AI website chatbot answers visitors while staff stay unavailable outside",
      ending: "Next visitor gets an answer while the mascot remains outside",
      expectedViewerQuestion:
        "Why is the mascot desperately working outside while the website only pretends to respond?",
      familiarityRisk: "low",
      memorabilityReason: "mascot",
    },
  },
  {
    label: "2. Object-led metaphor (fish tank)",
    candidate: {
      candidateId: "fish-tank",
      family: "absurd_understandable",
      coreIdea:
        "Waiting room fish tank; website-leads bowl empty; phone-leads overcrowded.",
      emotionalReaction: "amused recognition",
      hookLine: "Phone leads overcrowded; website leads gasping.",
      openingSituation:
        "Waiting room fish tank at an accounting lobby; one fish labeled website leads; bowl nearly empty while phone fish overcrowded.",
      visualPromise: "Fish-tank metaphor. No laptop montage.",
      storyProgression: "Hold tank → reveal empty website bowl → product answers",
      productConnection:
        "AI website chatbot answers website visitors while staff handle phone demand",
      ending: "Website leads get answers — the empty bowl fills with replies",
      expectedViewerQuestion: "Why is the website bowl empty?",
      familiarityRisk: "low",
      memorabilityReason: "fish tank",
    },
  },
  {
    label: "3. Absurd environment (boarding tickets)",
    candidate: {
      candidateId: "boarding-queue",
      family: "absurd_understandable",
      coreIdea:
        "Boarding-pass printer for phone callers; website line has no tickets.",
      emotionalReaction: "amused recognition",
      hookLine: "Boarding passes for calls — nothing for the site.",
      openingSituation:
        "Absurd but readable: a paper boarding pass printer for phone callers at an accounting desk — website chat sits ignored.",
      visualPromise: "Absurd queue. No generic office montage.",
      storyProgression: "Show phone queue → silent website → product boards online visitors",
      productConnection: "AI website chatbot is the missing queue for website questions",
      ending: "Online visitors get a boarding pass that actually boards",
      expectedViewerQuestion: "Why is the website the only line with no tickets?",
      familiarityRisk: "low",
      memorabilityReason: "boarding",
    },
  },
  {
    label: "4. No clear human protagonist (empty desk)",
    candidate: {
      candidateId: "empty-desk",
      family: "role_reversal",
      coreIdea:
        "Empty front desk; phones blink alone; wall screen chat calmly replies.",
      emotionalReaction: "relief / surprise",
      hookLine: "When nobody is at the desk, the website finally answers.",
      openingSituation:
        "Empty front desk at an accounting practice; phones blink alone; on a wall screen a chat calmly replies while the building is half-abandoned.",
      visualPromise: "Empty humans, working digital receptionist.",
      storyProgression: "Empty chaos → digital answers → product owns the online shift",
      productConnection: "AI website chatbot takes the website shift humans cannot cover",
      ending: "Phones can ring; the site still answers",
      expectedViewerQuestion: "Who is answering if nobody is at the desk?",
      familiarityRisk: "low",
      memorabilityReason: "empty desk",
    },
  },
  {
    label: "5. Straightforward human situation",
    candidate: {
      candidateId: "human-argument",
      family: "human_conflict",
      coreIdea:
        "Two teammates argue over which ringing line to take while a website visitor leaves.",
      emotionalReaction: "tension",
      hookLine: "They fought over the phone — and lost the website visitor.",
      openingSituation:
        "Two accounting workers mid-argument at a service counter while phones stack and a customer silhouette turns away through the glass.",
      visualPromise: "Human conflict in a specific operational moment.",
      storyProgression: "Argue → visitor left → cost → product answers the abandoned channel",
      productConnection:
        "AI website chatbot covers online questions while humans handle physical chaos",
      ending: "The next website visitor gets an answer without stealing staff from the floor",
      expectedViewerQuestion: "Are we losing online jobs while we fight the phones?",
      familiarityRisk: "medium",
      memorabilityReason: "argument",
    },
  },
];

const coworkIdentity: CreativeIdentity = {
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

console.log("=== Creative DNA multi-concept comparison ===\n");
console.log("Authoring instructions (excerpt):");
console.log(
  CREATIVE_DNA_AUTHORING_INSTRUCTIONS.split("\n").slice(0, 2).join("\n"),
);
console.log("");

for (const fx of fixtures) {
  const authored = authorCreativeDNA(fx.candidate, ctx);
  const fallback = deriveCreativeDNA(fx.candidate, ctx);
  const resolved = resolveCandidateCreativeDNA({
    candidate: fx.candidate,
    authoredDna: authored,
    ctx,
  });
  const consistency = validateCandidateDnaConsistency(fx.candidate, authored, {
    productIs,
  });
  const promptDna = resolved.dna!;
  const promptBlock = buildCreativeDnaPromptBlock(promptDna);
  const { suppressed } = neutralizeIdentityEnvironmentForDna(
    coworkIdentity,
    promptDna,
  );

  const flatRisk =
    /\bbusiness owner|business environment|primary subject shown\b/i.test(
      `${authored.world} ${authored.mainCharacter}`,
    );

  console.log(`--- ${fx.label} ---`);
  console.log(`opening: ${fx.candidate.openingSituation.slice(0, 100)}…`);
  console.log(`authored.world: ${authored.world}`);
  console.log(`authored.mainCharacter: ${authored.mainCharacter}`);
  console.log(`fallback.world: ${fallback.world}`);
  console.log(`fallback.mainCharacter: ${fallback.mainCharacter}`);
  console.log(
    `final source: ${resolved.source} | fallbackUsed: ${resolved.fallbackUsed} | reason: ${resolved.fallbackReason ?? "—"}`,
  );
  console.log(
    `consistency: ${consistency.passed ? "PASS" : "FAIL"} ${consistency.violations.map((v) => v.field).join(", ") || ""}`,
  );
  console.log(`flattening risk (generic labels): ${flatRisk ? "YES" : "no"}`);
  console.log(`identity env suppressed vs co-working: ${suppressed}`);
  console.log(`package prompt DNA world: ${promptDna.world}`);
  console.log(`prompt block chars: ${promptBlock.length}`);
  console.log("");
}

// Legacy audited collapse vs faithful package (mascot)
const mascotDna: CreativeDNA = authorCreativeDNA(fixtures[0]!.candidate, ctx);
const collapsed = validateCreativeDnaAgainstPackage(mascotDna, {
  hook: "Mascot suffers, fake typing online.",
  voiceoverText: "Mascot suffers. Accountant vacation essay. Site sat silent.",
  imagePrompts: [
    "Bright co-working space, mascot inside glass door",
    "Laptop analytics dashboard at modern office desk",
    "Person leans back, laptop closed, calm resolution",
  ],
});
const faithful = validateCreativeDnaAgainstPackage(mascotDna, {
  hook: "Mascot suffers, fake typing online.",
  voiceoverText:
    "Mascot suffers, fake typing online. Visitors finally get a real answer from the AI assistant while the mascot stays outside.",
  imagePrompts: [
    "Mascot melting in parking lot heat",
    "Same parking lot; fake typing chat",
    "Parking lot; visitor receives answer from AI assistant",
  ],
});

console.log("=== Package validator (mascot) ===");
console.log(
  `collapsed co-working package: ${collapsed.passed ? "PASS" : "FAIL"} [${collapsed.violations.map((v) => v.field).join(", ")}]`,
);
console.log(
  `faithful parking-lot package: ${faithful.passed ? "PASS" : "FAIL"} [${faithful.violations.map((v) => v.field).join(", ") || "none"}]`,
);

console.log("\n=== Identity before/after (mascot) ===");
console.log(buildCreativeIdentityPromptBlock(coworkIdentity, []).split("\n")[1]);
const { identity: after } = neutralizeIdentityEnvironmentForDna(
  coworkIdentity,
  mascotDna,
);
console.log(
  buildCreativeIdentityPromptBlock(after, [], { dnaWorldTreatment: true }).split(
    "\n",
  )[1],
);

console.log("\nLLM calls: unchanged (0 for DNA authoring; package path unchanged).");
console.log(
  `Token estimate: DNA block ≈ ${Math.ceil(buildCreativeDnaPromptBlock(mascotDna).length / 4)} tokens.`,
);
