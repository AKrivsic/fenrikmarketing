// Phase 2A — Decision Ownership checks.
//   npm run check:decision-ownership
//
// Ensures: one owner per decision, registry completeness, dangerous conflicts
// documented, illegal duplicate writers not reintroduced, behavior preserved.
// Does NOT redesign prompts or change validators.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DECISION_OWNERSHIP,
  REQUIRED_DECISION_IDS,
  ILLEGAL_DUPLICATE_WRITER_PATTERNS,
  dangerousConflicts,
  decisionOwnershipCsv,
  getDecisionOwnership,
  type DecisionId,
} from "@/lib/architecture/decisionOwnership";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  PREFERRED_STORY_ARC,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { buildAttentionPromptBlock } from "@/lib/attention/promptBlocks";
import { ATTENTION_VERSION, type AttentionPlan } from "@/lib/attention/types";
import { buildCreativeCandidatePromptBlock } from "@/lib/creative-candidates/promptBlocks";
import { buildCreativeDnaPromptBlock } from "@/lib/creative-candidates/creativeDNA";
import { NARRATIVE_BEAT_PROMPT_HEADER } from "@/lib/narrative-beats/promptBlocks";
import type { CreativeCandidatePlan } from "@/lib/creative-candidates/types";
import type { CreativeDNA } from "@/lib/creative-candidates/creativeDNA";
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
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

// --- 1. Registry integrity --------------------------------------------------

section("registry: single owner per decision");

check("required decision ids are all present exactly once", () => {
  const ids = DECISION_OWNERSHIP.map((r) => r.decision);
  assert.deepEqual([...ids].sort(), [...REQUIRED_DECISION_IDS].sort());
  assert.equal(new Set(ids).size, ids.length);
});

check("every decision has exactly one non-empty owner string", () => {
  for (const row of DECISION_OWNERSHIP) {
    assert.ok(row.owner.trim().length > 0, `${row.decision} missing owner`);
    // Owner field must not list two authorities joined as equals.
    assert.ok(
      !/\bOR\b/.test(row.owner) || row.decision === "visual_identity" || row.decision === "asset_policy",
      `${row.decision}: owner must not be an OR of competing authorities (${row.owner})`,
    );
  }
});

check("no two decisions share the same decision id", () => {
  const seen = new Set<string>();
  for (const row of DECISION_OWNERSHIP) {
    assert.ok(!seen.has(row.decision), `duplicate ${row.decision}`);
    seen.add(row.decision);
  }
});

check("dangerous conflicts must list activeContenders", () => {
  for (const row of dangerousConflicts()) {
    assert.ok(
      row.activeContenders.length > 0,
      `${row.decision} dangerous without contenders`,
    );
  }
});

check("story_structure C1 is resolved (MODE BEATS sole owner)", () => {
  const row = getDecisionOwnership("story_structure");
  assert.equal(row.conflict, "none");
  assert.ok(row.owner.includes("MODE BEATS"));
  assert.equal(row.activeContenders.length, 0);
  assert.ok(/Phase 2B|C1 resolved/i.test(row.conflictNotes));
});

check("csv export includes all decisions", () => {
  const csv = decisionOwnershipCsv();
  assert.ok(csv.startsWith("Decision,Owner,Readers"));
  for (const row of DECISION_OWNERSHIP) {
    assert.ok(csv.includes(row.label), `csv missing ${row.label}`);
    assert.ok(csv.includes(row.migrationTarget), `csv missing ${row.migrationTarget}`);
  }
  const disk = readFileSync(
    join(process.cwd(), "docs/architecture/decision-ownership.csv"),
    "utf8",
  );
  assert.equal(disk, csv, "docs CSV must match decisionOwnershipCsv()");
});

check("markdown ownership doc exists and names C1 resolution", () => {
  const md = readFileSync(
    join(process.cwd(), "docs/architecture/decision-ownership.md"),
    "utf8",
  );
  assert.ok(/Story Structure/i.test(md));
  assert.ok(/MODE BEATS/i.test(md));
  assert.ok(/TypedPack\.StoryStructure/.test(md));
});

// --- 2. Illegal duplicate writers -------------------------------------------

section("no new duplicate writers (static patterns)");

check("illegal duplicate-writer patterns are absent from cleaned modules", () => {
  const hits: string[] = [];
  for (const rule of ILLEGAL_DUPLICATE_WRITER_PATTERNS) {
    for (const rel of rule.files) {
      const text = readFileSync(join(process.cwd(), rel), "utf8");
      if (rule.re.test(text)) {
        hits.push(`${rule.id} in ${rel} (decision=${rule.decision})`);
      }
    }
  }
  assert.deepEqual(hits, [], hits.join("\n"));
});

check("owner modules carry Phase 2A ownership comments", () => {
  const requiredCommentFiles = [
    "lib/creative-candidates/enforceCandidateHook.ts",
    "lib/creative-candidates/promptBlocks.ts",
    "lib/creative-candidates/creativeDNA.ts",
    "lib/ai/prompts/creativeDirectives.ts",
    "lib/attention/deliveryArc.ts",
    "lib/attention/promptBlocks.ts",
    "lib/creative-identity/promptBlocks.ts",
    "lib/narrative-beats/promptBlocks.ts",
    "lib/assets/assetCoveragePolicy.ts",
    "lib/ai/schemas/contentPackage.ts",
    "lib/ai/guardrails.ts",
  ];
  for (const rel of requiredCommentFiles) {
    const text = readFileSync(join(process.cwd(), rel), "utf8");
    assert.ok(
      /Phase 2A ownership|Phase 2B ownership|Owner: Attention Delivery|Owner: Winner Candidate|Owner: Funnel Asset Policy|Owner: PACKAGE ASSET|Owner: Creative Directive/i.test(
        text,
      ),
      `missing ownership comment in ${rel}`,
    );
  }
});

// --- 3. Behavior preservation smoke ----------------------------------------

section("behavior preserved (ownership does not strip capabilities)");

const project = {
  id: "p-own",
  owner_id: "u-1",
  name: "Universal Co",
  type: "service",
  language: "en",
  enabled_languages: [],
  market_scope: "local",
  target_audience: { summary: "customers" },
  goal_type: "lead_generation",
  product_is: ["helpful service"],
  product_is_not: [],
  product_strengths: ["reliable"],
  pain_points: ["wasted time"],
  forbidden_claims: [],
  tone_of_voice: {},
  platforms: ["tiktok", "instagram"],
  publishing_rules: {},
  default_cta: null,
  knowledge: {},
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as unknown as Project;

const directives: CreativeDirectives = {
  mode: CREATIVE_MODES.find((m) => m.id === "observation") ?? CREATIVE_MODES[0]!,
  hook: HOOK_ARCHETYPES[0]!,
  persona: VOICE_PERSONAS[0]!,
};

const winnerHook = "Stop scrolling — the report is still empty at 4:55.";
const candidatePlan = {
  version: "creative-candidates@1",
  selectedCandidate: {
    candidateId: "c1",
    family: "story",
    coreIdea: "late scramble",
    emotionalReaction: "anxious then relieved",
    hookLine: winnerHook,
    openingSituation: "Empty report cells at 4:55",
    visualPromise: "clock vs blank cells",
    storyProgression: "pressure to clarity",
    productConnection: "one-click export",
    ending: "calm export",
    expectedViewerQuestion: "how?",
    memorabilityReason: "time pressure",
  },
  comparativeJudge: { winnerReason: "stop + originality" },
} as unknown as CreativeCandidatePlan;

const dna: CreativeDNA = {
  world: "late ops desk",
  mainCharacter: "ops lead",
  coreConflict: "manual report race",
  productRole: "one-click export",
  viewerQuestion: "faster way?",
  endingIntent: "calm export",
  immutableRules: ["Stay in the ops desk world."],
};

const attentionPlan = {
  version: ATTENTION_VERSION,
  attention_mechanism: "CURIOSITY_GAP",
  attention_source: "deterministic_v1",
  attention_reasons: ["seed"],
  originality: {
    selected_candidate_id: "a",
    selected_visual_concept: "visual",
    selected_narrative_seed: "seed",
    selected_emotional_effect: "curiosity",
    reject_summary: [],
    candidates: [],
  },
  opening: {
    first_spoken_guidance: "react",
    first_subtitle_guidance: "same",
    first_visual_guidance: "moment",
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
      { phase: "body", delivery: "steady" },
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
  opening_visual_motif: "gap",
  opening_emotional_effect: "curiosity",
  opening_structure: "interruption",
} as unknown as AttentionPlan;

const narrativeStubBlock = [
  `${NARRATIVE_BEAT_PROMPT_HEADER} (narrative-beats@1.1):`,
  "Derived from the selected Creative Candidate — NOT a new concept.",
  "Authoritative story structure is MODE BEATS only: setup -> reveal -> cta.",
].join("\n");

check("hook owner still transmits Candidate hookLine into Presentation", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "late reports",
    angle: "4:55 scramble",
    availableAssets: [],
    requireVideo: true,
    directives,
    creativeCandidatePromptBlock: buildCreativeCandidatePromptBlock(candidatePlan),
  });
  assert.ok(prompt.includes(winnerHook));
  assert.ok(prompt.includes("CREATIVE CANDIDATE SELECTION"));
});

check("story structure owner MODE BEATS present; Preferred Arc not structure owner", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "late reports",
    angle: null,
    availableAssets: [],
    requireVideo: true,
    directives,
    narrativeBeatPromptBlock: narrativeStubBlock,
  });
  assert.ok(prompt.includes("MODE BEATS"));
  assert.ok(!/PREFERRED STORY ARC:/i.test(prompt));
  assert.ok(/PACING \(non-authoritative/i.test(prompt));
  assert.ok(prompt.includes(NARRATIVE_BEAT_PROMPT_HEADER));
  assert.deepEqual([...PREFERRED_STORY_ARC], ["hook", "twist", "payoff", "cta"]);
});

check("voice emotion owner delivery_arc still present", () => {
  const block = buildAttentionPromptBlock(attentionPlan);
  assert.ok(block.includes("EMOTIONAL PERFORMANCE"));
  assert.ok(block.includes("sharp, urgent"));
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "late reports",
    angle: null,
    availableAssets: [],
    requireVideo: true,
    directives,
    attentionPromptBlock: block,
  });
  assert.ok(prompt.includes("ATTENTION DELIVERY"));
  assert.ok(prompt.includes("relieved clarity"));
});

check("visual identity / character DNA still present", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "late reports",
    angle: null,
    availableAssets: [],
    requireVideo: true,
    directives,
    creativeDnaPromptBlock: buildCreativeDnaPromptBlock(dna),
  });
  assert.ok(prompt.includes("CANONICAL CREATIVE DNA"));
  assert.ok(prompt.includes(dna.world));
  assert.ok(prompt.includes(dna.mainCharacter));
});

check("asset policy coverage still suppresses funnel echo", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "late reports",
    angle: null,
    availableAssets: [],
    requireVideo: true,
    directives,
    assetCoverage: {
      stance: "should_use",
      qualityAssetCount: 2,
      seriesSlotIndices: [0],
      preferredRoles: ["product_ui"],
      packageIndex: 0,
      packageCount: 4,
    },
  });
  assert.ok(prompt.includes("PACKAGE ASSET COVERAGE"));
  assert.ok(!prompt.includes("FUNNEL ASSET POLICY"));
});

check("safety + schema still present", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "late reports",
    angle: null,
    availableAssets: [],
    requireVideo: true,
    directives,
  });
  assert.ok(prompt.includes("CREATIVE SAFETY"));
  assert.ok(prompt.includes("TASK: Produce ONE content package as JSON"));
  assert.ok(prompt.includes('"voiceover_text": "string"'));
});

check("getDecisionOwnership rejects unknown ids", () => {
  assert.throws(() => getDecisionOwnership("not_a_decision" as DecisionId));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
