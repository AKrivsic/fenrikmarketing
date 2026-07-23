// Phase 2B — Typed Decision Packs + C1 resolution checks.
//   npm run check:typed-decision-packs

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DECISION_OWNERSHIP,
  REQUIRED_DECISION_IDS,
  getDecisionOwnership,
  type DecisionId,
} from "@/lib/architecture/decisionOwnership";
import {
  buildTypedDecisionPacks,
  PACK_KEY_TO_DECISION_IDS,
  DEFERRED_DECISION_IDS,
  DEFERRED_DECISION_REASONS,
  TYPED_DECISION_PACKS_VERSION,
  renderStoryStructureFollowLine,
  renderHookOpeningBridge,
  renderAssetPolicyPack,
} from "@/lib/architecture/typedDecisionPacks";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  PREFERRED_STORY_ARC,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { buildNarrativeBeatPromptBlock } from "@/lib/narrative-beats/promptBlocks";
import { NARRATIVE_BEAT_VERSION } from "@/lib/narrative-beats/types";
import type { NarrativeBeatPlan } from "@/lib/narrative-beats/types";
import type { Project } from "@/lib/supabase/types";
import { buildCreativeCandidatePromptBlock } from "@/lib/creative-candidates/promptBlocks";
import { buildCreativeDnaPromptBlock } from "@/lib/creative-candidates/creativeDNA";
import type { CreativeCandidatePlan } from "@/lib/creative-candidates/types";
import type { CreativeDNA } from "@/lib/creative-candidates/creativeDNA";
import { ATTENTION_VERSION, type AttentionPlan } from "@/lib/attention/types";
import { buildAttentionPromptBlock } from "@/lib/attention/promptBlocks";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

const tok = (s: string) => Math.ceil(s.length / 4);

function baseProject(
  overrides: Partial<Project> & { name: string; product_is: string[] },
): Project {
  return {
    id: "p-2b",
    owner_id: "u-1",
    name: overrides.name,
    type: overrides.type ?? "service",
    language: "en",
    enabled_languages: [],
    market_scope: overrides.market_scope ?? "local",
    target_audience: overrides.target_audience ?? { summary: "customers" },
    goal_type: "lead_generation",
    product_is: overrides.product_is,
    product_is_not: overrides.product_is_not ?? [],
    product_strengths: overrides.product_strengths ?? overrides.product_is.slice(0, 1),
    pain_points: overrides.pain_points ?? ["friction"],
    forbidden_claims: overrides.forbidden_claims ?? [],
    tone_of_voice: {},
    platforms: ["tiktok", "instagram", "youtube"],
    publishing_rules: {},
    default_cta: null,
    knowledge: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Project;
}

const directives: CreativeDirectives = {
  mode: CREATIVE_MODES.find((m) => m.id === "observation") ?? CREATIVE_MODES[0]!,
  hook: HOOK_ARCHETYPES[0]!,
  persona: VOICE_PERSONAS[0]!,
};

const winnerHook = "Your Friday report is still blank at 4:55.";
const dna: CreativeDNA = {
  world: "late ops desk",
  mainCharacter: "ops lead",
  coreConflict: "manual report race",
  productRole: "one-click export",
  viewerQuestion: "faster way?",
  endingIntent: "calm export",
  immutableRules: ["Stay in the ops desk world."],
};

const candidatePlan = {
  version: "creative-candidates@1",
  selectedCandidate: {
    candidateId: "c1",
    family: "story",
    coreIdea: "Friday scramble",
    emotionalReaction: "anxious then relieved",
    hookLine: winnerHook,
    openingSituation: "Empty cells at 4:55",
    visualPromise: "clock vs blank",
    storyProgression: "pressure to clarity",
    productConnection: "export",
    ending: "calm",
    expectedViewerQuestion: "how?",
    memorabilityReason: "time",
    creativeDNA: dna,
  },
  comparativeJudge: { winnerReason: "stop" },
} as unknown as CreativeCandidatePlan;

const attentionPlan = {
  version: ATTENTION_VERSION,
  attention_mechanism: "CURIOSITY_GAP",
  attention_source: "deterministic_v1",
  attention_reasons: ["seed"],
  originality: {
    selected_candidate_id: "a",
    selected_visual_concept: "v",
    selected_narrative_seed: "s",
    selected_emotional_effect: "curiosity",
    reject_summary: [],
    candidates: [],
  },
  opening: {
    first_spoken_guidance: "r",
    first_subtitle_guidance: "s",
    first_visual_guidance: "v",
    opening_structure: "interruption",
    opening_delivery: "urgent",
    emotional_effect: "curiosity",
    first_motion_intent: "ATTENTION",
    land_within_seconds: [0.5, 2],
    align_hook_with_first_spoken: true,
  },
  delivery_arc: {
    version: "delivery-arc@1",
    phases: [
      { phase: "opening", delivery: "sharp, urgent" },
      { phase: "payoff", delivery: "relieved clarity" },
    ],
    tts_instruction_fragment: "urgent then clear",
    reasons: ["fixture"],
  },
  sfx: {
    sfx_selected: false,
    sfx_category: null,
    sfx_timing_ms: null,
    sfx_reason: "none",
    sfx_source: "omitted_no_fit",
    sfx_gain: 0,
    render_supported: false,
  },
  opening_visual_motif: "g",
  opening_emotional_effect: "curiosity",
  opening_structure: "interruption",
} as unknown as AttentionPlan;

const software = baseProject({
  name: "Acme Analytics",
  type: "product",
  product_is: ["analytics platform"],
  pain_points: ["manual Friday reports"],
});

// --- Completeness -----------------------------------------------------------

section("completeness + ownership registry");

check("typed packs version is set", () => {
  assert.equal(TYPED_DECISION_PACKS_VERSION, "typed-decision-packs@1");
});

check("every pack maps to registered decision ids", () => {
  const covered = new Set<DecisionId>();
  for (const ids of Object.values(PACK_KEY_TO_DECISION_IDS)) {
    for (const id of ids) covered.add(id);
  }
  for (const id of DEFERRED_DECISION_IDS) covered.add(id);
  assert.deepEqual([...covered].sort(), [...REQUIRED_DECISION_IDS].sort());
});

check("deferred decisions have documented reasons", () => {
  for (const id of DEFERRED_DECISION_IDS) {
    assert.ok(DEFERRED_DECISION_REASONS[id].length > 20);
  }
});

check("pack meta decisionIds exist in registry", () => {
  const packs = buildTypedDecisionPacks({
    project: software,
    directives,
    funnelStage: "awareness",
    targetPlatforms: ["tiktok"],
    selectedCandidate: {
      hookLine: winnerHook,
      openingSituation: "Empty cells",
      emotionalReaction: "anxious",
      creativeDNA: dna,
    },
    creativeDna: dna,
    attentionDeliveryArc: attentionPlan.delivery_arc,
    attentionPromptBlock: buildAttentionPromptBlock(attentionPlan),
  });
  assert.equal(packs.hook.meta.decisionId, "hook");
  assert.equal(packs.storyStructure.meta.decisionId, "story_structure");
  assert.equal(packs.storyStructure.meta.owner, "mode_beats");
  assert.equal(packs.storyStructure.source, "mode_beats");
  getDecisionOwnership(packs.hook.meta.decisionId);
  getDecisionOwnership(packs.storyStructure.meta.decisionId);
});

check("no pack declares an illegal writer as owner for story_structure", () => {
  const row = getDecisionOwnership("story_structure");
  const packs = buildTypedDecisionPacks({
    project: software,
    directives,
    funnelStage: "awareness",
    targetPlatforms: ["tiktok"],
  });
  assert.equal(packs.storyStructure.meta.owner, "mode_beats");
  for (const illegal of row.illegalWriters) {
    assert.ok(
      !illegal.toLowerCase().includes("mode beats"),
      "MODE BEATS must remain legal owner",
    );
  }
});

// --- C1 resolution ----------------------------------------------------------

section("C1 story structure resolution");

check("StoryStructurePack beats equal MODE BEATS", () => {
  const packs = buildTypedDecisionPacks({
    project: software,
    directives,
    funnelStage: "awareness",
    targetPlatforms: ["tiktok"],
  });
  assert.deepEqual(
    packs.storyStructure.beats.map((b) => b.id),
    [...directives.mode.narrativeBeats],
  );
  assert.equal(
    packs.storyStructure.beatArc,
    directives.mode.narrativeBeats.join(" -> "),
  );
});

check("Preferred Story Arc is not injected as structure owner", () => {
  const packs = buildTypedDecisionPacks({
    project: software,
    directives,
    funnelStage: "awareness",
    targetPlatforms: ["tiktok"],
  });
  const prompt = buildGenerateContentPackagePrompt({
    project: software,
    funnelStage: "awareness",
    topic: "reports",
    angle: null,
    availableAssets: [],
    requireVideo: true,
    directives,
    decisionPacks: packs,
  });
  assert.ok(!/PREFERRED STORY ARC:/i.test(prompt));
  assert.ok(/PACING \(non-authoritative/i.test(prompt));
  assert.ok(/ONLY story structure/i.test(prompt));
  // Constant still exists for preferred-mode picker (not Presentation structure).
  assert.deepEqual([...PREFERRED_STORY_ARC], ["hook", "twist", "payoff", "cta"]);
});

check("Narrative Beats does not inject competing Required arc owner", () => {
  const plan = {
    version: NARRATIVE_BEAT_VERSION,
    beats: [
      {
        role: "HOOK",
        viewerLearns: "blank report",
        whatChanged: "",
        whyContinue: "stakes",
        comprehension: {
          viewer_understands: "blank",
          viewer_question: "will it finish?",
          viewer_expectation: "cost",
        },
        informationKey: "blank",
        sourceFields: ["openingSituation"],
        modeBeatLabels: ["setup"],
      },
    ],
    progressionWarnings: [],
    informationProgression: {
      passed: true,
      warnings: [],
      pairs: [],
    },
    metaphorClarity: {
      understandableWithin10s: true,
      understandableWithinFirstThird: true,
      metaphorClass: "none",
      preferEarlyProductProblem: false,
      reasons: [],
      guidance: null,
    },
    correctiveGuidance: null,
  } as unknown as NarrativeBeatPlan;

  const packs = buildTypedDecisionPacks({
    project: software,
    directives,
    funnelStage: "awareness",
    targetPlatforms: ["tiktok"],
  });
  const block = buildNarrativeBeatPromptBlock(plan, {
    modeBeatArc: packs.storyStructure.beatArc,
  });
  assert.ok(!/Required arc:/i.test(block));
  assert.ok(/Authoritative story structure is MODE BEATS only/i.test(block));
  assert.ok(block.includes(packs.storyStructure.beatArc));
});

check("different creative modes retain different MODE BEATS", () => {
  const modes = CREATIVE_MODES.slice(0, 3);
  const arcs = new Set<string>();
  for (const mode of modes) {
    const d: CreativeDirectives = {
      mode,
      hook: HOOK_ARCHETYPES[0]!,
      persona: VOICE_PERSONAS[0]!,
    };
    const packs = buildTypedDecisionPacks({
      project: software,
      directives: d,
      funnelStage: "awareness",
      targetPlatforms: ["tiktok"],
    });
    arcs.add(packs.storyStructure.beatArc);
    assert.ok(packs.storyStructure.beats.length >= 2);
  }
  assert.ok(arcs.size >= 2, "expected mode-specific beat diversity");
});

check("registry marks story_structure conflict as none (C1 resolved)", () => {
  assert.equal(getDecisionOwnership("story_structure").conflict, "none");
  assert.equal(getDecisionOwnership("story_structure").activeContenders.length, 0);
});

// --- Capability preservation ------------------------------------------------

section("capability preservation");

check("full prompt preserves Product Brain, Candidate, DNA, voice, assets, safety, schema", () => {
  const packs = buildTypedDecisionPacks({
    project: software,
    directives,
    funnelStage: "awareness",
    targetPlatforms: ["tiktok", "instagram", "youtube"],
    selectedCandidate: {
      hookLine: winnerHook,
      openingSituation: "Empty cells at 4:55",
      emotionalReaction: "anxious then relieved",
      creativeDNA: dna,
    },
    creativeDna: dna,
    assetCoverage: {
      stance: "should_use",
      qualityAssetCount: 2,
      seriesSlotIndices: [0],
      preferredRoles: ["product_ui"],
      packageIndex: 0,
      packageCount: 4,
    },
    attentionDeliveryArc: attentionPlan.delivery_arc,
    attentionPromptBlock: buildAttentionPromptBlock(attentionPlan),
    creativeDnaPromptBlock: buildCreativeDnaPromptBlock(dna),
  });

  const prompt = buildGenerateContentPackagePrompt({
    project: software,
    funnelStage: "awareness",
    topic: "manual reports",
    angle: "Friday scramble",
    availableAssets: [],
    requireVideo: true,
    directives,
    decisionPacks: packs,
    creativeCandidatePromptBlock: buildCreativeCandidatePromptBlock(candidatePlan),
    creativeDnaPromptBlock: buildCreativeDnaPromptBlock(dna),
    attentionPromptBlock: buildAttentionPromptBlock(attentionPlan),
    selectedCandidateForPacks: {
      hookLine: winnerHook,
      openingSituation: "Empty cells at 4:55",
      emotionalReaction: "anxious then relieved",
      creativeDNA: dna,
    },
  });

  assert.ok(/PROJECT BRAIN/i.test(prompt));
  assert.ok(prompt.includes("Acme Analytics"));
  assert.ok(prompt.includes(winnerHook));
  assert.ok(prompt.includes("CREATIVE CANDIDATE"));
  assert.ok(prompt.includes("CANONICAL CREATIVE DNA"));
  assert.ok(prompt.includes(dna.world));
  assert.ok(prompt.includes(dna.mainCharacter));
  assert.ok(prompt.includes("VOICE PERSONA"));
  assert.ok(prompt.includes("ATTENTION DELIVERY") || prompt.includes("EMOTIONAL PERFORMANCE"));
  assert.ok(prompt.includes("PACKAGE ASSET COVERAGE"));
  assert.ok(!prompt.includes("FUNNEL ASSET POLICY"));
  assert.ok(prompt.includes("CREATIVE SAFETY"));
  assert.ok(prompt.includes("TASK: Produce ONE content package as JSON"));
  assert.ok(prompt.includes('"voiceover_text": "string"'));
  assert.ok(prompt.includes("MODE BEATS"));
  assert.ok(prompt.includes(renderStoryStructureFollowLine(packs.storyStructure).slice(0, 40)));
});

check("funnel asset fallback when coverage absent", () => {
  const packs = buildTypedDecisionPacks({
    project: software,
    directives,
    funnelStage: "awareness",
    targetPlatforms: ["tiktok"],
  });
  assert.equal(packs.assetPolicy.source, "funnel_asset_policy_fallback");
  assert.ok(renderAssetPolicyPack(packs.assetPolicy).includes("FUNNEL ASSET POLICY"));
});

check("hook pack renders winner hook into Presentation", () => {
  const packs = buildTypedDecisionPacks({
    project: software,
    directives,
    funnelStage: "awareness",
    targetPlatforms: ["tiktok"],
    selectedCandidate: {
      hookLine: winnerHook,
      openingSituation: "Empty",
      emotionalReaction: "anxious",
    },
  });
  const lines = renderHookOpeningBridge(packs.hook, packs.storyStructure);
  assert.ok(lines.some((l) => l.includes(winnerHook)));
});

// --- Universality -----------------------------------------------------------

section("universality fixtures");

const FIXTURES = [
  software,
  baseProject({
    name: "Bright Clean Co",
    type: "local_service",
    product_is: ["residential cleaning"],
  }),
  baseProject({
    name: "Harbor Kitchen",
    type: "restaurant",
    product_is: ["seasonal restaurant"],
  }),
  baseProject({
    name: "Clear Counsel",
    type: "service",
    product_is: ["business advisory"],
  }),
  baseProject({
    name: "Trail Flask",
    type: "product",
    product_is: ["insulated water bottle"],
  }),
] as const;

for (const fixture of FIXTURES) {
  check(`pack builder accepts ${fixture.name} without unrelated domain injection`, () => {
    const packs = buildTypedDecisionPacks({
      project: fixture,
      directives,
      funnelStage: "awareness",
      targetPlatforms: ["tiktok"],
      selectedCandidate: {
        hookLine: "A concrete opening line.",
        openingSituation: "A concrete opening situation.",
        emotionalReaction: "recognition",
      },
    });
    assert.equal(packs.productGrounding.projectName, fixture.name);
    assert.deepEqual(packs.productGrounding.productIs, [...fixture.product_is]);
    const prompt = buildGenerateContentPackagePrompt({
      project: fixture,
      funnelStage: "awareness",
      topic: "topic",
      angle: null,
      availableAssets: [],
      requireVideo: true,
      directives,
      decisionPacks: packs,
    });
    assert.ok(prompt.includes(fixture.name));
    assert.ok(!/saas dashboard default|clinic patient|office worker default/i.test(prompt));
  });
}

// --- Static: Presentation does not re-resolve ownership ---------------------

section("static ownership protection");

check("Presentation builder does not call buildFunnelAssetPolicyBlock / buildAssetCoveragePromptBlock", () => {
  const promptSrc = readFileSync(
    join(process.cwd(), "lib/ai/prompts/generateContentPackage.ts"),
    "utf8",
  );
  const rendererSrc = readFileSync(
    join(process.cwd(), "lib/architecture/presentation/renderers.ts"),
    "utf8",
  );
  const compatSrc = readFileSync(
    join(process.cwd(), "lib/architecture/presentation/ensureDecisionPacks.ts"),
    "utf8",
  );
  assert.ok(!/buildFunnelAssetPolicyBlock\(/.test(promptSrc));
  assert.ok(!/buildAssetCoveragePromptBlock\(/.test(promptSrc));
  assert.ok(!/buildTypedDecisionPacks\(/.test(promptSrc));
  assert.ok(/buildPresentationPrompt\(/.test(promptSrc));
  assert.ok(/renderAssetPolicyPack\(/.test(rendererSrc));
  assert.ok(/renderStoryStructureFollowLine\(/.test(rendererSrc));
  assert.ok(!/PREFERRED_STORY_ARC/.test(rendererSrc));
  assert.ok(/buildTypedDecisionPacks\(/.test(compatSrc));
  assert.ok(/TEMPORARY COMPAT/.test(compatSrc));
});

check("Presentation uses StoryStructurePack beatArc rather than only raw directives join for ATTENTION FIRST", () => {
  const rendererSrc = readFileSync(
    join(process.cwd(), "lib/architecture/presentation/renderers.ts"),
    "utf8",
  );
  assert.ok(/packs\.storyStructure\.beatArc|storyStructure\.beatArc/.test(rendererSrc));
  assert.ok(/renderHookOpeningBridge\(packs\.hook|renderHookOpeningBridge\(/.test(rendererSrc));
});

// --- Metrics ----------------------------------------------------------------

section("metrics (ESTIMATED Math.ceil(chars/4))");

{
  const packs = buildTypedDecisionPacks({
    project: software,
    directives,
    funnelStage: "awareness",
    targetPlatforms: ["tiktok", "instagram", "youtube"],
    selectedCandidate: {
      hookLine: winnerHook,
      openingSituation: "Empty cells",
      emotionalReaction: "anxious",
      creativeDNA: dna,
    },
    creativeDna: dna,
    assetCoverage: {
      stance: "should_use",
      qualityAssetCount: 2,
      seriesSlotIndices: [0],
      preferredRoles: ["product_ui"],
      packageIndex: 0,
      packageCount: 4,
    },
    attentionPromptBlock: buildAttentionPromptBlock(attentionPlan),
    creativeDnaPromptBlock: buildCreativeDnaPromptBlock(dna),
  });
  const after = buildGenerateContentPackagePrompt({
    project: software,
    funnelStage: "awareness",
    topic: "manual reports",
    angle: "Friday",
    availableAssets: [],
    requireVideo: true,
    directives,
    decisionPacks: packs,
    creativeCandidatePromptBlock: buildCreativeCandidatePromptBlock(candidatePlan),
    creativeDnaPromptBlock: buildCreativeDnaPromptBlock(dna),
    attentionPromptBlock: buildAttentionPromptBlock(attentionPlan),
  });
  console.log(
    JSON.stringify(
      {
        method: "Math.ceil(chars/4)",
        after_presentation_tokens_est: tok(after),
        decisions_migrated: Object.keys(PACK_KEY_TO_DECISION_IDS).length,
        deferred_decisions: DEFERRED_DECISION_IDS.length,
        story_structure_owners_before: 3,
        story_structure_owners_after: 1,
        registry_dangerous_conflicts: DECISION_OWNERSHIP.filter(
          (r) => r.conflict === "dangerous",
        ).length,
      },
      null,
      2,
    ),
  );
  check("after prompt still substantial (capabilities preserved)", () => {
    assert.ok(tok(after) > 5000);
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
