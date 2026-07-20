// Narrative Beats + story progression + duration planner + metaphor clarity
//   npm run check:narrative-beats

import assert from "node:assert/strict";
import {
  buildNarrativeBeatPromptBlock,
  buildNarrativeTimelineDebug,
  deriveNarrativeBeats,
  evaluateMetaphorClarity,
  mapModeBeatsToRoles,
  MAX_BEAT_SHARE,
  MAX_ENDING_SHARE,
  MAX_HOOK_SHARE,
  narrativeBeatRolesForCount,
  NARRATIVE_BEAT_PROMPT_HEADER,
  planBeatDurations,
  validateDurationPlan,
  validateInformationProgression,
  validateStoryProgression,
  validateVisualProgression,
  weightForNarrativeRole,
} from "@/lib/narrative-beats";
import {
  openingSituationFaithfulToScene1,
  stripNoTextImpossibleClauses,
} from "@/lib/creative-candidates";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import { buildStoryboard, SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import { buildDeliveryArc } from "@/lib/attention/deliveryArc";
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

function section(title: string): void {
  console.log(`\n${title}`);
}

const winner: CreativeCandidate = {
  candidateId: "c1",
  family: "absurd_understandable",
  coreIdea: "A departure board that cancels every visitor who needed an answer",
  emotionalReaction: "recognition then dread",
  hookLine: "Your website has a departure board — and every flight is cancelled",
  openingSituation:
    "Airport departure board filling with CANCELLED rows while a traveler waits unanswered",
  visualPromise: "Board goes blank, traveler walks away",
  storyProgression:
    "Show the silent board → visitor waits → visitor leaves → chatbot answers next visitor",
  productConnection: "AI website chatbot answers visitors 24/7 so leads stop walking away",
  ending: "Next visitor gets an answer instantly",
  expectedViewerQuestion: "What does the board stand for?",
  familiarityRisk: "low",
  memorabilityReason: "airport metaphor for unanswered website",
};

section("deriveNarrativeBeats");

check("produces HOOK → SETUP → ESCALATION → RESOLUTION", () => {
  const plan = deriveNarrativeBeats({
    winner,
    modeBeats: ["setup", "conflict", "twist", "resolution", "cta"],
  });
  assert.deepEqual(
    plan.beats.map((b) => b.role),
    ["HOOK", "SETUP", "ESCALATION", "RESOLUTION"],
  );
  for (const b of plan.beats) {
    assert.ok(b.viewerLearns.trim().length > 0);
    assert.ok(b.whyContinue.trim().length > 0);
    assert.ok(b.comprehension.viewer_understands.trim().length > 0);
    assert.ok(b.comprehension.viewer_question.trim().length > 0);
    assert.ok(b.comprehension.viewer_expectation.trim().length > 0);
    assert.ok(b.informationKey.includes("|"));
  }
  assert.equal(plan.beats[0]!.whatChanged, "");
  assert.equal(plan.beats[3]!.comprehension.viewer_question, "none");
  assert.equal(plan.beats[3]!.comprehension.viewer_expectation, "Finished.");
});

check("maps mode beats onto structural roles", () => {
  const map = mapModeBeatsToRoles([
    "common_belief",
    "why_wrong",
    "proof",
    "cta",
  ]);
  assert.deepEqual(map.HOOK, ["common_belief"]);
  assert.ok(map.SETUP.length > 0);
  assert.ok(map.ESCALATION.length > 0);
  assert.deepEqual(map.RESOLUTION, ["cta"]);
});

check("prompt block includes viewer comprehension fields", () => {
  const plan = deriveNarrativeBeats({ winner });
  const block = buildNarrativeBeatPromptBlock(plan);
  assert.ok(block.includes(NARRATIVE_BEAT_PROMPT_HEADER));
  assert.ok(block.includes("HOOK → SETUP → ESCALATION → RESOLUTION"));
  assert.ok(block.includes("viewer_understands:"));
  assert.ok(block.includes("viewer_question:"));
  assert.ok(block.includes("viewer_expectation:"));
  assert.ok(block.includes("information_key:"));
});

check("pre-LLM corrective guidance is injected when metaphor is unclear", () => {
  const plan = deriveNarrativeBeats({
    winner: {
      ...winner,
      openingSituation:
        "A closed notebook representing website knowledge floating over a generic workshop",
    },
  });
  assert.ok(plan.correctiveGuidance);
  assert.ok(plan.correctiveGuidance!.includes("METAPHOR CLARITY"));
  const block = buildNarrativeBeatPromptBlock(plan);
  assert.ok(block.includes("first third") || block.includes("METAPHOR CLARITY"));
});

section("metaphor clarity");

check("unclear abstract metaphor prefers early product problem", () => {
  const d = evaluateMetaphorClarity({
    openingSituation: "A tiny paper boat floating in a glowing cube representing visitors",
    hookLine: "Something is wrong",
    coreIdea: "symbolic object only",
    productConnection: "chatbot answers website visitors",
  });
  assert.equal(d.preferEarlyProductProblem, true);
  assert.equal(d.understandableWithinFirstThird, false);
  assert.ok(d.guidance && d.guidance.includes("METAPHOR CLARITY"));
  assert.ok(d.guidance!.includes("first third") || d.guidance!.includes("STRONG"));
});

check("situation metaphor can pass clarity", () => {
  const d = evaluateMetaphorClarity({
    openingSituation:
      "A customer walking away from a storefront after waiting for an answer that never came",
    hookLine: "They don't wait",
    coreIdea: "unanswered visitors leave",
    productConnection: "chatbot answers 24/7",
  });
  assert.equal(d.understandableWithin10s, true);
  assert.equal(d.understandableWithinFirstThird, true);
  assert.equal(d.preferEarlyProductProblem, false);
});

check("departure-board winner injects clarity guidance into narrative plan", () => {
  const plan = deriveNarrativeBeats({
    winner: {
      ...winner,
      openingSituation:
        "A closed notebook representing website knowledge floating over a generic workshop",
    },
  });
  assert.equal(plan.metaphorClarity.preferEarlyProductProblem, true);
  const block = buildNarrativeBeatPromptBlock(plan);
  assert.ok(block.includes("METAPHOR CLARITY"));
});

section("information progression");

check("phone → laptop with same claim fails information progression", () => {
  const result = validateInformationProgression({
    imagePrompts: [
      "Close-up of a phone screen with a visitor waiting unanswered in silence",
      "Over-the-shoulder laptop screen with a visitor waiting unanswered in silence",
    ],
  });
  assert.equal(result.passed, false);
  assert.ok(
    result.warnings.some((w) => w.sameInformationDifferentSurface),
    result.summary.join(","),
  );
  assert.ok(result.correctiveGuidance);
});

check("waiting → leaving → solution advances information", () => {
  const result = validateInformationProgression({
    imagePrompts: [
      "Visitor waiting unanswered at a silent website",
      "Visitor walking away from the storefront after no answer",
      "Chat interface answering a question on the laptop",
    ],
  });
  assert.equal(result.passed, true, result.summary.join(","));
});

check("healthy narrative beats pass information progression", () => {
  const plan = deriveNarrativeBeats({ winner });
  assert.equal(
    plan.informationProgression.passed,
    true,
    plan.informationProgression.summary.join(","),
  );
});

section("story + visual progression diagnostics");

check("warns on website → website same state", () => {
  const result = validateStoryProgression({
    imagePrompts: [
      "Photorealistic website landing page on a laptop, visitor staring at the screen waiting",
      "Another angle of the same website landing page on a laptop, visitor still staring waiting",
    ],
  });
  assert.equal(result.passed, false);
  assert.ok(result.warnings.length >= 1);
  assert.ok(
    result.warnings[0]!.sameLocation || result.warnings[0]!.noEscalation,
  );
});

check("passes website → leaving → solution progression", () => {
  const result = validateStoryProgression({
    imagePrompts: [
      "Website on a laptop with a visitor waiting unanswered",
      "Visitor walking away from the storefront door, resigned",
      "Quiet desk with chat interface answering a question, relief",
    ],
  });
  assert.equal(result.passed, true, result.summary.join(","));
});

check("visual progression flags static repetition", () => {
  const result = validateVisualProgression({
    imagePrompts: [
      "Whiteboard covered in chaotic diagrams, bright office",
      "Whiteboard covered in chaotic diagrams, bright office",
    ],
  });
  assert.equal(result.passed, false);
});

check("visual progression accepts changing action/stakes", () => {
  const result = validateVisualProgression({
    imagePrompts: [
      "Visitor waiting at a silent website laptop",
      "Visitor walking away unanswered from the entrance",
      "Chat interface answering on the laptop, calm relief",
    ],
  });
  assert.equal(result.passed, true, result.summary.join(","));
});

section("duration planner");

check("hook weight >= setup; escalation leads the turn", () => {
  assert.ok(weightForNarrativeRole("HOOK") >= weightForNarrativeRole("SETUP"));
  assert.ok(weightForNarrativeRole("HOOK") < weightForNarrativeRole("ESCALATION"));
  assert.ok(
    weightForNarrativeRole("RESOLUTION") < weightForNarrativeRole("SETUP"),
  );
});

check("no beat exceeds 35% unless VO-justified", () => {
  const { durations, justifiedOverMax } = planBeatDurations({
    totalSeconds: 32,
    roles: ["HOOK", "SETUP", "ESCALATION", "RESOLUTION"],
    segmentWordCounts: [8, 12, 14, 10],
  });
  const sum = durations.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 32) < 0.15, `sum=${sum}`);
  for (let i = 0; i < durations.length; i++) {
    const share = durations[i]! / 32;
    if (!justifiedOverMax[i]) {
      assert.ok(
        share <= MAX_BEAT_SHARE + 0.02,
        `beat ${i} share ${share} > ${MAX_BEAT_SHARE}`,
      );
    }
  }
});

check("last scene cannot quietly eat 13s of 32s without justification", () => {
  const { durations } = planBeatDurations({
    totalSeconds: 32,
    roles: ["HOOK", "SETUP", "ESCALATION", "RESOLUTION"],
    // Even if resolution had many words historically, without 40%+ share it caps
    segmentWordCounts: [10, 12, 12, 10],
  });
  assert.ok(durations[3]! / 32 <= MAX_BEAT_SHARE + 0.02);
});

check("buildStoryboard weights durations (not equal split)", () => {
  const beats = buildStoryboard({
    voiceoverText:
      "Stop. Your website is silent. Visitors wait. Then they leave. Fix it now.",
    sceneIds: ["s1", "s2", "s3", "s4"],
    audioDurationSeconds: 20,
    narrativeBeatRoles: ["HOOK", "SETUP", "ESCALATION", "RESOLUTION"],
    modeBeats: ["hook", "setup", "escalation", "cta"],
  });
  assert.equal(beats.length >= 3, true);
  const speechBeats = beats.map((b) => b.durationSeconds);
  // Not all equal (allow tiny float equality only if planner collapsed — shouldn't)
  const unique = new Set(speechBeats.map((d) => d.toFixed(2)));
  assert.ok(unique.size >= 2, `expected varied durations, got ${[...unique]}`);
  for (const b of beats) {
    assert.ok(
      b.durationSeconds / 20 <= MAX_BEAT_SHARE + 0.08,
      `beat ${b.id} too long: ${b.durationSeconds}`,
    );
  }
});

check("narrativeBeatRolesForCount stretches to beat count", () => {
  assert.deepEqual(narrativeBeatRolesForCount(4), [
    "HOOK",
    "SETUP",
    "ESCALATION",
    "RESOLUTION",
  ]);
  assert.equal(narrativeBeatRolesForCount(5)[0], "HOOK");
  assert.equal(narrativeBeatRolesForCount(5)[4], "RESOLUTION");
});

section("fidelity NO_TEXT awareness");

check("stripNoTextImpossibleClauses drops label-only clauses", () => {
  const cleaned = stripNoTextImpossibleClauses(
    "Airport hall. Readable text on signs. A traveler waits.",
  );
  assert.doesNotMatch(cleaned, /Readable text/i);
  assert.match(cleaned, /traveler/i);
});

check("departure board without CANCELLED text still faithful", () => {
  const opening =
    "Airport departure board filling with CANCELLED rows while a traveler waits unanswered";
  const scene1 =
    "Photorealistic airport terminal. A large departure board with red blank rows and empty panels. A traveler waits in the foreground. No readable text or labels anywhere.";
  const faithful = openingSituationFaithfulToScene1(opening, scene1);
  assert.equal(faithful.ok, true, faithful.reason ?? "");
});

section("voiceover rhythm + prompt wiring");

check("delivery arc encourages spoken rhythm", () => {
  const arc = buildDeliveryArc({
    mechanism: "CURIOSITY_GAP",
    openingDelivery: "deadpan",
  });
  assert.match(arc.tts_instruction_fragment, /spoken rhythm|short sentences/i);
  assert.ok(
    arc.reasons.includes("spoken_rhythm_contrast_pause_emphasis"),
  );
});

check("generate prompt includes narrative beats + voiceover rhythm", () => {
  const plan = deriveNarrativeBeats({ winner });
  const project = {
    id: "p1",
    name: "Fenrik.chat",
    type: "saas",
    language: "en",
    market_scope: "global",
    goal_type: "lead_generation",
    target_audience: { segments: ["SMB"] },
    product_is: ["AI website chatbot"],
    product_is_not: [],
    product_strengths: [],
    pain_points: ["Website visitors leave unanswered"],
    forbidden_claims: [],
    tone_of_voice: { notes: ["Direct"] },
    platforms: [],
    publishing_rules: {},
    default_cta: null,
  } as unknown as Project;
  const directives: CreativeDirectives = {
    mode: CREATIVE_MODES.find((m) => m.id === "story")!,
    hook: HOOK_ARCHETYPES[0]!,
    persona: VOICE_PERSONAS[0]!,
  };
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "problem_aware",
    topic: "Missed website leads",
    angle: "Unanswered visitors leave",
    availableAssets: [],
    requireVideo: true,
    directives,
    creativeCandidatePromptBlock: "CREATIVE CANDIDATE SELECTION: winner",
    narrativeBeatPromptBlock: buildNarrativeBeatPromptBlock(plan),
  });
  assert.ok(prompt.includes(NARRATIVE_BEAT_PROMPT_HEADER));
  assert.ok(prompt.includes("VOICEOVER RHYTHM"));
  assert.ok(prompt.includes("VISUAL PROGRESSION"));
  assert.ok(prompt.includes("viewer_understands:"));
});

check("audio-master timeline still sums with weighted durations", () => {
  const beats = buildStoryboard({
    voiceoverText:
      "Your kitchen still smells after you clean it. The problem is the sponge. " +
      "It traps grease and spreads it around. Swap it weekly and rinse hot.",
    sceneIds: ["s1", "s2", "s3"],
    audioDurationSeconds: 30,
    narrativeBeatRoles: ["HOOK", "ESCALATION", "RESOLUTION"],
  });
  let cumulative = beats[0]!.durationSeconds;
  for (let i = 1; i < beats.length; i++) {
    const td = Math.min(
      SHORT_PROFILE.transitionSeconds,
      beats[i]!.durationSeconds / 2,
    );
    cumulative = cumulative - td + beats[i]!.durationSeconds;
  }
  assert.ok(Math.abs(cumulative - 30) < 0.15, `got ${cumulative}`);
});

section("duration validation");

check("flags ending that dominates the video", () => {
  const result = validateDurationPlan({
    roles: ["HOOK", "SETUP", "ESCALATION", "RESOLUTION"],
    durationsSeconds: [4, 6, 6, 16],
    segmentWordCounts: [8, 10, 10, 10],
  });
  assert.equal(result.passed, false);
  assert.ok(result.warnings.some((w) => w.startsWith("ending_dominates_video")));
  assert.ok(MAX_ENDING_SHARE < 0.4);
});

check("flags excessively long hook", () => {
  const result = validateDurationPlan({
    roles: ["HOOK", "SETUP", "ESCALATION", "RESOLUTION"],
    durationsSeconds: [12, 6, 7, 5],
    segmentWordCounts: [8, 10, 12, 8],
  });
  assert.equal(result.passed, false);
  assert.ok(result.warnings.some((w) => w.startsWith("hook_excessively_long")));
  assert.ok(MAX_HOOK_SHARE < 0.35);
});

check("flags escalation shorter than setup without reason", () => {
  const result = validateDurationPlan({
    roles: ["HOOK", "SETUP", "ESCALATION", "RESOLUTION"],
    durationsSeconds: [4, 12, 6, 5],
    segmentWordCounts: [8, 10, 10, 8],
  });
  assert.equal(result.passed, false);
  assert.ok(
    result.warnings.some((w) => w.startsWith("escalation_shorter_than_setup")),
  );
});

check("balanced plan passes duration validation", () => {
  const planned = planBeatDurations({
    totalSeconds: 20,
    roles: ["HOOK", "SETUP", "ESCALATION", "RESOLUTION"],
    segmentWordCounts: [8, 12, 14, 10],
  });
  const result = validateDurationPlan({
    roles: ["HOOK", "SETUP", "ESCALATION", "RESOLUTION"],
    durationsSeconds: planned.durations,
    segmentWordCounts: [8, 12, 14, 10],
    justifiedOverMax: planned.justifiedOverMax,
  });
  assert.equal(result.passed, true, result.summary.join(","));
});

section("timeline debug");

check("builds Creative Candidate → … → Timeline debug object", () => {
  const plan = deriveNarrativeBeats({ winner });
  const debug = buildNarrativeTimelineDebug({
    winner,
    plan,
    voiceoverText:
      "Your website has a departure board. Visitors wait. They leave. The chatbot answers.",
    imagePrompts: [
      "Airport departure board",
      "Traveler waiting",
      "Traveler walking away",
      "Chat answering",
    ],
    durationPlan: {
      roles: ["HOOK", "SETUP", "ESCALATION", "RESOLUTION"],
      durationsSeconds: [4, 6, 7, 5],
      justifiedOverMax: [false, false, false, false],
      validation: validateDurationPlan({
        roles: ["HOOK", "SETUP", "ESCALATION", "RESOLUTION"],
        durationsSeconds: [4, 6, 7, 5],
        segmentWordCounts: [8, 10, 12, 8],
      }),
    },
  });
  assert.equal(debug.version, "narrative-timeline-debug@1");
  assert.ok(debug.creative_candidate);
  assert.equal(debug.narrative_beats.length, 4);
  assert.equal(debug.viewer_comprehension.length, 4);
  assert.ok(debug.storyboard);
  assert.ok(debug.voiceover);
  assert.ok(debug.duration_plan);
  assert.ok(debug.timeline.length >= 4);
  assert.equal(
    debug.viewer_comprehension[0]!.viewer_expectation,
    "The explanation is coming.",
  );
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
