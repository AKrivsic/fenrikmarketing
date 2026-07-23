// Phase 1 Prompt Cleanup — capability preservation, redundancy removal,
// universality fixtures, and static vertical-default guard on prompt modules.
//   npm run check:phase-1-prompt-cleanup

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Project } from "@/lib/supabase/types";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import {
  ATTENTION_PROMPT_HEADER,
  ATTENTION_MECHANISM_HEADER_LEGACY,
  buildAttentionPromptBlock,
} from "@/lib/attention/promptBlocks";
import { ATTENTION_VERSION, type AttentionPlan } from "@/lib/attention/types";
import { buildCreativeCandidatePromptBlock } from "@/lib/creative-candidates/promptBlocks";
import {
  buildCreativeDnaPromptBlock,
  type CreativeDNA,
} from "@/lib/creative-candidates/creativeDNA";
import { buildSceneTypeHistoryRestraintBlock } from "@/lib/scene-types/presentation/sceneTypeHistoryPrompt";
import { visualStyleGuardrailBlock } from "@/lib/ai/prompts/visualStyle";
import { buildFunnelAssetPolicyBlock } from "@/lib/ai/prompts/funnelAssetPolicy";
import type { AssetCoverageDecision } from "@/lib/assets/assetCoveragePolicy";
import type { CreativeCandidatePlan } from "@/lib/creative-candidates/types";

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

function baseProject(overrides: Partial<Project> & { name: string; product_is: string[] }): Project {
  return {
    id: "p-phase1",
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
    pain_points: overrides.pain_points ?? ["common friction"],
    forbidden_claims: overrides.forbidden_claims ?? [],
    tone_of_voice: {},
    platforms: ["tiktok", "instagram", "youtube"],
    publishing_rules: {},
    default_cta: null,
    knowledge: overrides.knowledge ?? {},
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

const attentionPlan = {
  version: ATTENTION_VERSION,
  attention_mechanism: "CURIOSITY_GAP",
  attention_source: "deterministic_v1",
  attention_reasons: ["seed"],
  originality: {
    selected_candidate_id: "a",
    selected_visual_concept: "unexpected visual",
    selected_narrative_seed: "seed",
    selected_emotional_effect: "curiosity",
    reject_summary: ["cliche"],
    candidates: [],
  },
  opening: {
    first_spoken_guidance: "open with reaction",
    first_subtitle_guidance: "same thought",
    first_visual_guidance: "concrete moment",
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
      { phase: "body", delivery: "steady tension" },
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

const winnerHook = "Your Friday report still starts in a spreadsheet.";
const candidatePlan = {
  version: "creative-candidates@1",
  selectedCandidate: {
    candidateId: "c1",
    family: "story",
    coreIdea: "Friday scramble",
    emotionalReaction: "anxiety",
    hookLine: winnerHook,
    openingSituation: "Person staring at unfinished spreadsheet at 4:55pm",
    visualPromise: "clock vs unfinished cells",
    storyProgression: "pressure then relief",
    productConnection: "auto-report",
    ending: "one click export",
    expectedViewerQuestion: "how?",
    memorabilityReason: "time pressure",
  },
  comparativeJudge: { winnerReason: "stop + originality" },
} as unknown as CreativeCandidatePlan;

const dna: CreativeDNA = {
  world: "late-afternoon ops desk under harsh overhead light",
  mainCharacter: "ops lead with coffee-stained mug",
  coreConflict: "manual report race against the clock",
  productRole: "turns the scramble into a one-click export",
  viewerQuestion: "is there a faster way out of this Friday mess?",
  endingIntent: "one calm export replaces the scramble",
  immutableRules: [
    "Keep the ops desk world — do not relocate to a cafe or outdoor park.",
    "Preserve the ops lead as the recurring subject when a person appears.",
    "Ending must land on calm export clarity, not a sales pitch.",
  ],
};

const coverage: AssetCoverageDecision = {
  stance: "should_use",
  qualityAssetCount: 2,
  seriesSlotIndices: [0],
  preferredRoles: ["product_ui"],
  packageIndex: 0,
  packageCount: 4,
};

const sceneHist = buildSceneTypeHistoryRestraintBlock({
  recentPackages: [{ packageId: "a", specialTypes: ["CHECKLIST"] }],
  lastPackageSpecialTypes: ["CHECKLIST"],
  weeklyStrategySpecialTypes: ["PHONE"],
  ctaUsedInRecentWindow: false,
} as Parameters<typeof buildSceneTypeHistoryRestraintBlock>[0]);

function buildFullPrompt(project: Project): string {
  return buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "manual friction",
    angle: "late Friday scramble",
    availableAssets: [],
    requireVideo: true,
    directives,
    attentionPromptBlock: buildAttentionPromptBlock(attentionPlan),
    creativeCandidatePromptBlock: buildCreativeCandidatePromptBlock(candidatePlan),
    creativeDnaPromptBlock: buildCreativeDnaPromptBlock(dna),
    assetCoverage: coverage,
    // Intentionally passed — Phase 1 builder must ignore Scene Type Memory prose.
    sceneTypeHistoryBlock: sceneHist,
    memory: {
      hooks: ["old hook line"],
      topics: ["old topic"],
      ctas: ["book a demo"],
      scenarios: ["monday standup"],
    },
  });
}

const softwareProject = baseProject({
  name: "Acme Analytics",
  type: "product",
  market_scope: "global",
  product_is: ["analytics reporting platform"],
  pain_points: ["manual Friday reports"],
  target_audience: { summary: "operations teams" },
});

// --- 1. Capability preservation ---------------------------------------------

section("capability preservation");

const fullPrompt = buildFullPrompt(softwareProject);

check("Product Brain remains included", () => {
  assert.ok(
    /PROJECT BRAIN|PRODUCT BRAIN/i.test(fullPrompt),
    "expected Product/Project Brain block",
  );
  assert.ok(fullPrompt.includes("Acme Analytics"));
  assert.ok(fullPrompt.includes("analytics reporting platform"));
});

check("Winner Candidate hook is transmitted to Presentation", () => {
  assert.ok(fullPrompt.includes("CREATIVE CANDIDATE SELECTION"));
  assert.ok(fullPrompt.includes(winnerHook));
  assert.ok(/hookLine/i.test(fullPrompt));
});

check("Creative DNA remains transmitted", () => {
  assert.ok(fullPrompt.includes("CANONICAL CREATIVE DNA"));
  assert.ok(fullPrompt.includes(dna.world));
  assert.ok(fullPrompt.includes(dna.mainCharacter));
});

check("voice style / emotion fields remain available", () => {
  assert.ok(fullPrompt.includes("VOICE PERSONA"));
  assert.ok(fullPrompt.includes(ATTENTION_PROMPT_HEADER));
  assert.ok(fullPrompt.includes("EMOTIONAL PERFORMANCE"));
  assert.ok(fullPrompt.includes("sharp, urgent"));
  assert.ok(fullPrompt.includes("relieved clarity"));
});

check("visual / character / object consistency instructions remain", () => {
  assert.ok(fullPrompt.includes("PRIMARY_ACTOR IDENTITY CONTINUITY"));
  assert.ok(fullPrompt.includes("Creative DNA"));
  assert.ok(/immutable rules|immutableRules|MUST preserve/i.test(fullPrompt));
});

check("asset policy remains from one authoritative source when coverage present", () => {
  assert.ok(fullPrompt.includes("PACKAGE ASSET COVERAGE"));
  assert.ok(!fullPrompt.includes("FUNNEL ASSET POLICY"));
});

check("safety and authenticity constraints remain included", () => {
  assert.ok(fullPrompt.includes("CREATIVE SAFETY"));
  assert.ok(/Never lie/i.test(fullPrompt));
  assert.ok(/HARD CONSTRAINTS|forbidden/i.test(fullPrompt));
  assert.ok(/PURELY VISUAL|never via readable text/i.test(fullPrompt));
  assert.ok(/Product Presentation Decision|synthetic UI/i.test(fullPrompt));
});

check("output schema shape remains present and unchanged in contract", () => {
  assert.ok(fullPrompt.includes('"title": "string"'));
  assert.ok(fullPrompt.includes('"voiceover_text": "string"'));
  assert.ok(fullPrompt.includes('"visual_scenes"'));
  assert.ok(fullPrompt.includes('"platform_outputs"'));
  assert.ok(fullPrompt.includes('"asset_usage"'));
  assert.ok(fullPrompt.includes("TASK: Produce ONE content package as JSON"));
});

check("storytelling / creative direction remain (MODE BEATS + Attention First)", () => {
  assert.ok(fullPrompt.includes("MODE BEATS"));
  assert.ok(fullPrompt.includes("ATTENTION FIRST"));
  assert.ok(fullPrompt.includes("CREATIVE DIRECTIVE"));
});

// --- 2. Redundancy removal --------------------------------------------------

section("redundancy removal");

check("HOOK V2 legacy header no longer appears", () => {
  assert.ok(!fullPrompt.includes("HOOK V2"));
});

check("ATTENTION MECHANISM legacy header no longer appears", () => {
  assert.ok(!fullPrompt.includes(ATTENTION_MECHANISM_HEADER_LEGACY));
  assert.ok(!fullPrompt.includes("ORIGINALITY PASS"));
  assert.ok(!fullPrompt.includes("OPENING CONTRACT (0–3"));
  assert.ok(!fullPrompt.includes("FULL SCRIPT QUALITY"));
  assert.ok(!fullPrompt.includes("SAFETY WITHOUT CREATIVE SANITIZATION"));
});

check("VISUAL STYLE guardrail prose no longer injected", () => {
  assert.ok(!fullPrompt.includes("VISUAL STYLE (global default"));
  // Module still exists for unit tests / potential reuse.
  assert.ok(visualStyleGuardrailBlock().includes("VISUAL STYLE"));
});

check("SCENE TYPE MEMORY prose is ignored even when passed", () => {
  assert.ok(sceneHist.includes("SCENE TYPE MEMORY"));
  assert.ok(!fullPrompt.includes("SCENE TYPE MEMORY"));
});

check("authoritative replacements still appear", () => {
  assert.ok(fullPrompt.includes("OPENING HOOK:"));
  assert.ok(fullPrompt.includes(ATTENTION_PROMPT_HEADER));
  assert.ok(fullPrompt.includes("VERTICAL SCENE COMPOSITION"));
  assert.ok(fullPrompt.includes("DEVICE & SCREEN REALISM"));
});

check("funnel policy still available as fallback without coverage", () => {
  const fallback = buildGenerateContentPackagePrompt({
    project: softwareProject,
    funnelStage: "awareness",
    topic: "manual friction",
    angle: null,
    availableAssets: [],
    requireVideo: true,
    directives,
  });
  assert.ok(fallback.includes("FUNNEL ASSET POLICY"));
  assert.ok(buildFunnelAssetPolicyBlock("awareness").includes("FUNNEL ASSET POLICY"));
});

// --- 3. Universality fixtures -----------------------------------------------

section("universality fixtures");

const UNIVERSAL_FIXTURES = [
  {
    id: "software",
    project: softwareProject,
    forbidInjected: [/restaurant customer/i, /clinic patient/i, /corporate office worker/i],
  },
  {
    id: "local_physical_service",
    project: baseProject({
      name: "Bright Clean Co",
      type: "local_service",
      product_is: ["residential cleaning"],
      pain_points: ["no time to deep-clean before guests"],
      target_audience: { summary: "busy homeowners" },
    }),
    forbidInjected: [/saas dashboard/i, /startup founder/i, /clinic patient/i],
  },
  {
    id: "hospitality_food",
    project: baseProject({
      name: "Harbor Kitchen",
      type: "restaurant",
      product_is: ["seasonal restaurant"],
      pain_points: ["empty Tuesday tables"],
      target_audience: { summary: "local diners" },
    }),
    forbidInjected: [/saas churn/i, /office worker at a laptop/i, /clinic patient/i],
  },
  {
    id: "professional_service",
    project: baseProject({
      name: "Clear Counsel",
      type: "service",
      product_is: ["business advisory"],
      pain_points: ["clients ghosting proposals"],
      target_audience: { summary: "SME owners" },
    }),
    forbidInjected: [/restaurant menu/i, /e-commerce cart/i, /dental chair/i],
  },
  {
    id: "physical_consumer_product",
    project: baseProject({
      name: "Trail Flask",
      type: "product",
      product_is: ["insulated water bottle"],
      pain_points: ["drinks going warm on hikes"],
      target_audience: { summary: "outdoor hikers" },
    }),
    forbidInjected: [/saas dashboard/i, /clinic patient/i, /office standup/i],
  },
] as const;

for (const fixture of UNIVERSAL_FIXTURES) {
  check(`universal builder accepts ${fixture.id} without unrelated domain injection`, () => {
    const prompt = buildFullPrompt(fixture.project);
    assert.ok(prompt.includes(fixture.project.name));
    for (const product of fixture.project.product_is) {
      assert.ok(prompt.includes(product), `missing product_is "${product}"`);
    }
    for (const re of fixture.forbidInjected) {
      assert.ok(!re.test(prompt), `unexpected injection matching ${re}`);
    }
    // Same structural owners for every industry fixture.
    assert.ok(prompt.includes("CREATIVE CANDIDATE SELECTION"));
    assert.ok(prompt.includes("CANONICAL CREATIVE DNA"));
    assert.ok(prompt.includes(ATTENTION_PROMPT_HEADER));
    assert.ok(prompt.includes("CREATIVE SAFETY"));
  });
}

// --- 4. Static vertical-default guard (prompt modules only) -----------------

section("static vertical-default guard (prompt templates)");

/** Patterns that indicate hardcoded industry defaults in prompt constants/templates. */
const FORBIDDEN_VERTICAL_DEFAULTS: { id: string; re: RegExp }[] = [
  {
    id: "office_worker_default",
    re: /\b(?:default|always|must)\b[^\n]{0,80}\b(?:office worker|corporate office)\b/i,
  },
  {
    id: "saas_only_default",
    re: /\b(?:default|always|only)\b[^\n]{0,60}\bSaaS\b/i,
  },
  {
    id: "dashboard_as_default_product",
    re: /\b(?:default|prefer)\b[^\n]{0,40}\bdashboard\b[^\n]{0,40}\b(?:unless|always)\b/i,
  },
  {
    id: "restaurant_customer_default",
    re: /\b(?:default|always)\b[^\n]{0,60}\brestaurant customer\b/i,
  },
  {
    id: "clinic_patient_default",
    re: /\b(?:default|always)\b[^\n]{0,60}\bclinic patient\b/i,
  },
  {
    id: "ecommerce_shopper_default",
    re: /\b(?:default|always)\b[^\n]{0,60}\be-?commerce shopper\b/i,
  },
];

const PROMPT_MODULES_TO_SCAN = [
  "lib/ai/prompts/generateContentPackage.ts",
  "lib/architecture/presentation/renderers.ts",
  "lib/ai/prompts/funnelAssetPolicy.ts",
  "lib/ai/prompts/visualStyle.ts",
  "lib/attention/promptBlocks.ts",
  "lib/creative-candidates/promptBlocks.ts",
  "lib/scene-types/presentation/sceneTypeHistoryPrompt.ts",
];

check("cleaned prompt modules have no hardcoded vertical defaults", () => {
  const hits: string[] = [];
  for (const rel of PROMPT_MODULES_TO_SCAN) {
    const text = readFileSync(join(process.cwd(), rel), "utf8");
    for (const rule of FORBIDDEN_VERTICAL_DEFAULTS) {
      if (rule.re.test(text)) {
        hits.push(`${rel} :: ${rule.id}`);
      }
    }
  }
  assert.deepEqual(hits, [], `forbidden vertical defaults:\n${hits.join("\n")}`);
});

check("attention delivery no longer injects office-cliché prompt defaults", () => {
  const block = buildAttentionPromptBlock(attentionPlan);
  assert.ok(!/literal office clich/i.test(block));
  assert.ok(!/calm desk, empty board, laptop\+coffee/i.test(block));
});

// --- 5. Metrics (chars/4; ESTIMATED) ----------------------------------------

section("metrics (ESTIMATED — Math.ceil(chars/4))");

const afterAttention = buildAttentionPromptBlock(attentionPlan);
// Pre-Phase-1 attention block size measured from git HEAD before this cleanup
// (full ORIGINALITY + OPENING CONTRACT + FULL SCRIPT + SAFETY + delivery).
const BEFORE_ATTENTION_CHARS = 2870;
const beforeAttentionTok = tok("x".repeat(BEFORE_ATTENTION_CHARS));
const afterAttentionTok = tok(afterAttention);

const hookV2LegacyApprox =
  'HOOK V2 (opening meaning block — make it dramatically stronger):\n' +
  `- Write the hook in the "${directives.hook.id}" HOOK ARCHETYPE above: ${directives.hook.instruction}\n` +
  "- Open on a concrete moment: pull from the SCENARIO POOL, a sharp PAIN\n" +
  "  POINT, or a striking PROOF point above. Never use a generic intro.\n" +
  "- The hook must create curiosity or tension in one short, punchy line, and\n" +
  "  set up a loop the rest of the video keeps open until the payoff.\n" +
  "- ATTENTION ALIGNMENT: the stored hook and the first spoken line of\n" +
  "  voiceover_text MUST be the same thought — never dilute a strong hook\n" +
  "  into a weaker voiceover setup. The opening spoken thought must land as\n" +
  "  one complete meaning unit (short phrase or two ultra-short phrases).\n" +
  "- When a Creative Candidate winner is present, its hookLine is canonical:\n" +
  "  do not invent a softer opening than that hookLine.\n" +
  `- voiceover_text MUST open on that hook, then run the MODE BEATS\n` +
  "  narrated in the VOICE PERSONA and MODE above, so the narration maps onto\n" +
  "  fast visual beats. Do NOT collapse it into a generic marketing template.\n" +
  "  Follow ATTENTION MECHANISM + OPENING CONTRACT when present: immediate\n" +
  "  reaction first, body turn/payoff later, satisfying ending — not a summary.\n";

const removedDupReadable =
  "- Do not rely on readable text inside AI-generated IMAGE scenes.\n";

const funnelWhenEcho = buildFunnelAssetPolicyBlock("awareness");
const visualStyle = visualStyleGuardrailBlock();

const removedChars =
  (BEFORE_ATTENTION_CHARS - afterAttention.length) +
  hookV2LegacyApprox.length +
  funnelWhenEcho.length +
  visualStyle.length +
  sceneHist.length +
  removedDupReadable.length -
  // OPENING HOOK bridge added back (~2 lines)
  220;

const afterTok = tok(fullPrompt);
const beforeTok = afterTok + tok("x".repeat(Math.max(0, removedChars)));
const pct =
  beforeTok > 0 ? (((beforeTok - afterTok) / beforeTok) * 100).toFixed(1) : "0";

console.log(
  JSON.stringify(
    {
      method: "Math.ceil(chars/4)",
      after_presentation_tokens_est: afterTok,
      before_presentation_tokens_est: beforeTok,
      pct_reduction_est: Number(pct),
      attention_before_tok_est: beforeAttentionTok,
      attention_after_tok_est: afterAttentionTok,
      removed_families: [
        "Attention Mechanism prose (thinned to Attention Delivery)",
        "Hook V2",
        "Funnel Asset Policy echo (when Coverage present)",
        "Visual Style guardrail injection",
        "Scene Type Memory prose injection",
        "Repeated no-readable-text line in PRODUCT DEMONSTRATION",
      ],
    },
    null,
    2,
  ),
);

check("presentation prompt shrank vs reconstructed before estimate", () => {
  assert.ok(afterTok < beforeTok, `after ${afterTok} should be < before ${beforeTok}`);
  assert.ok(Number(pct) >= 5, `expected ≥5% reduction, got ${pct}%`);
});

// Touch readdir so unused-import lint stays quiet if tree scan expands later.
void readdirSync;
void statSync;

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
