// Phase 3 — Presentation Simplification checks.
//   npm run check:presentation-simplification
//
// Verifies Presentation is a renderer over Typed Decision Packs:
// - no ownership resolution in the public prompt module
// - packs consumed by renderers
// - prompt sections preserved
// - Repair-compatible public API unchanged
// - no industry defaults
// Does NOT redesign prompts.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  buildGenerateContentPackagePrompt,
  GENERATE_PACKAGE_SYSTEM,
} from "@/lib/ai/prompts/generateContentPackage";
import {
  buildCreativeDirectiveBlock,
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { buildTypedDecisionPacks } from "@/lib/architecture/typedDecisionPacks";
import {
  ensureDecisionPacks,
  buildPresentationPrompt,
  toPresentationRenderInput,
} from "@/lib/architecture/presentation";
import { buildAttentionPromptBlock } from "@/lib/attention/promptBlocks";
import { ATTENTION_VERSION, type AttentionPlan } from "@/lib/attention/types";
import { buildCreativeDnaPromptBlock } from "@/lib/creative-candidates/creativeDNA";
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

function tok(s: string): number {
  return Math.ceil(s.length / 4);
}

function countLines(path: string): number {
  return readFileSync(path, "utf8").split("\n").length;
}

function countDirLines(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) total += countDirLines(p);
    else if (name.endsWith(".ts")) total += countLines(p);
  }
  return total;
}

function countMatches(src: string, re: RegExp): number {
  return (src.match(re) ?? []).length;
}

const directives: CreativeDirectives = {
  mode: CREATIVE_MODES.find((m) => m.id === "observation") ?? CREATIVE_MODES[0]!,
  hook: HOOK_ARCHETYPES[0]!,
  persona: VOICE_PERSONAS[0]!,
};

const dna: CreativeDNA = {
  world: "late ops desk",
  mainCharacter: "ops lead",
  coreConflict: "manual report race",
  productRole: "one-click export",
  viewerQuestion: "faster way?",
  endingIntent: "calm export",
  immutableRules: ["Stay in the ops desk world."],
};

function baseProject(): Project {
  return {
    id: "p-p3",
    owner_id: "u-1",
    name: "Northline Ops",
    type: "service",
    language: "en",
    enabled_languages: [],
    market_scope: "local",
    target_audience: { summary: "ops teams" },
    goal_type: "lead_generation",
    product_is: ["ops reporting tool"],
    product_is_not: ["payroll"],
    product_strengths: ["one-click export"],
    pain_points: ["Friday scramble"],
    forbidden_claims: ["guaranteed ROI"],
    tone_of_voice: {},
    platforms: ["tiktok", "instagram", "youtube"],
    publishing_rules: {},
    default_cta: null,
    knowledge: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as Project;
}

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

const root = process.cwd();
const promptPath = join(root, "lib/ai/prompts/generateContentPackage.ts");
const rendererPath = join(root, "lib/architecture/presentation/renderers.ts");
const compatPath = join(
  root,
  "lib/architecture/presentation/ensureDecisionPacks.ts",
);
const presentationDir = join(root, "lib/architecture/presentation");
const packsDir = join(root, "lib/architecture/typedDecisionPacks");

// --- Static architecture ----------------------------------------------------

section("static: Presentation does not resolve ownership");

check("public prompt module does not call buildTypedDecisionPacks / pickCreativeDirectives", () => {
  const src = readFileSync(promptPath, "utf8");
  assert.ok(!/buildTypedDecisionPacks\(/.test(src));
  assert.ok(!/pickCreativeDirectives\(/.test(src));
  assert.ok(!/buildCreativeSeed\(/.test(src));
  assert.ok(/buildPresentationPrompt\(/.test(src));
  assert.ok(/toPresentationRenderInput\(/.test(src));
});

check("ownership assembly is isolated in ensureDecisionPacks TEMPORARY COMPAT", () => {
  const src = readFileSync(compatPath, "utf8");
  assert.ok(/TEMPORARY COMPAT/.test(src));
  assert.ok(/buildTypedDecisionPacks\(/.test(src));
  assert.ok(/pickCreativeDirectives\(/.test(src));
});

check("renderers consume packs (no duplicate Coverage/Funnel resolution)", () => {
  const src = readFileSync(rendererPath, "utf8");
  assert.ok(/renderAssetPolicyPack\(/.test(src));
  assert.ok(/renderHookOpeningBridge\(/.test(src));
  assert.ok(/renderStoryStructureFollowLine\(/.test(src));
  assert.ok(/renderVoiceDeliveryBlock\(/.test(src));
  assert.ok(!/buildFunnelAssetPolicyBlock\(/.test(src));
  assert.ok(!/buildAssetCoveragePromptBlock\(/.test(src));
  assert.ok(!/buildTypedDecisionPacks\(/.test(src));
  assert.ok(!/pickCreativeDirectives\(/.test(src));
});

check("workflows pass decisionPacks and do not re-pass pack-assembly fields", () => {
  const gen = readFileSync(
    join(root, "lib/ai/workflows/generateContentPackage.ts"),
    "utf8",
  );
  const regen = readFileSync(
    join(root, "lib/ai/workflows/regenerateContentPackage.ts"),
    "utf8",
  );
  assert.ok(/decisionPacks,/.test(gen));
  assert.ok(/decisionPacks,/.test(regen));
  // Pack assembly fields must not be passed into Presentation after packs exist.
  assert.ok(!/selectedCandidateForPacks:/.test(gen));
  assert.ok(!/creativeDnaForPacks:/.test(gen));
  assert.ok(!/attentionDeliveryArcForPacks:/.test(gen));
  assert.ok(!/selectedCandidateForPacks:/.test(regen));
  assert.ok(!/creativeDnaForPacks:/.test(regen));
});

// --- Runtime: packs → prompt ------------------------------------------------

section("runtime: packs consumed; sections preserved");

const project = baseProject();
const packs = buildTypedDecisionPacks({
  project,
  directives,
  funnelStage: "awareness",
  targetPlatforms: ["tiktok", "instagram", "youtube"],
  selectedCandidate: {
    hookLine: "Your Friday report is still blank at 4:55.",
    openingSituation: "Empty cells at 4:55",
    emotionalReaction: "anxious then relieved",
    creativeDNA: dna,
  },
  creativeDna: dna,
  attentionPromptBlock: buildAttentionPromptBlock(attentionPlan),
  creativeDnaPromptBlock: buildCreativeDnaPromptBlock(dna),
  requireVideo: true,
  videoPlatforms: ["tiktok", "instagram", "youtube"],
});

check("ensureDecisionPacks returns provided packs without rebuild", () => {
  const out = ensureDecisionPacks({
    project,
    funnelStage: "awareness",
    topic: "manual reports",
    decisionPacks: packs,
  });
  assert.equal(out, packs);
});

check("prompt preserves required sections when packs provided", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "manual reports",
    angle: "Friday scramble",
    availableAssets: [],
    directives,
    decisionPacks: packs,
    requireVideo: true,
    targetPlatforms: ["tiktok", "instagram", "youtube"],
    creativeCandidatePromptBlock: "CREATIVE CANDIDATE (test winner)",
    narrativeBeatPromptBlock: "NARRATIVE BEATS (test spine)",
  });

  assert.ok(prompt.includes("ATTENTION FIRST"));
  assert.ok(prompt.includes("CONTENT QUALITY"));
  assert.ok(prompt.includes("VISUAL BEATS"));
  assert.ok(prompt.includes("PLATFORM STYLES") || prompt.includes("PLATFORM-NATIVE"));
  assert.ok(prompt.includes("TASK: Produce ONE content package as JSON"));
  assert.ok(prompt.includes("CREATIVE CANDIDATE (test winner)"));
  assert.ok(prompt.includes("NARRATIVE BEATS (test spine)"));
  assert.ok(prompt.includes(packs.hook.hookLine!));
  assert.ok(prompt.includes(packs.storyStructure.beatArc.split(" -> ")[0]!));
  assert.ok(/CTA type MUST be one of/.test(prompt));
  assert.ok(prompt.includes("AVAILABLE ASSETS"));
  // DNA from pack
  assert.ok(prompt.includes(dna.world) || prompt.includes("CREATIVE DNA"));
});

check("no duplicate Preferred Arc as story structure owner", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "manual reports",
    availableAssets: [],
    directives,
    decisionPacks: packs,
    requireVideo: true,
  });
  assert.ok(!/PREFERRED STORY ARC|Preferred Arc as the story structure/i.test(prompt));
  assert.ok(/PACING \(non-authoritative/.test(prompt));
  assert.ok(/ONLY story structure/.test(prompt));
});

check("voice / attention delivery comes from VoicePack when present", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "manual reports",
    availableAssets: [],
    directives,
    decisionPacks: packs,
    requireVideo: true,
  });
  assert.ok(packs.voice.deliveryPromptBlock);
  assert.ok(prompt.includes(packs.voice.deliveryPromptBlock!));
});

check("asset policy comes from AssetPolicyPack (no dual Coverage+Funnel)", () => {
  const withCoverage = buildTypedDecisionPacks({
    project,
    directives,
    funnelStage: "awareness",
    targetPlatforms: ["tiktok"],
    assetCoverage: {
      stance: "should_use",
      qualityAssetCount: 2,
      seriesSlotIndices: [0],
      preferredRoles: ["product_ui"],
      packageIndex: 0,
      packageCount: 4,
    },
  });
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "x",
    availableAssets: [],
    directives,
    decisionPacks: withCoverage,
    requireVideo: true,
  });
  const coverageHits = countMatches(prompt, /ASSET COVERAGE/g);
  const funnelHits = countMatches(prompt, /FUNNEL ASSET POLICY/g);
  assert.ok(coverageHits + funnelHits <= 1 || coverageHits === 1);
  assert.equal(funnelHits, 0);
});

check("JSON schema shape and system message unchanged (Repair contract)", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "x",
    availableAssets: [],
    directives,
    decisionPacks: packs,
    requireVideo: true,
    targetPlatforms: ["tiktok", "instagram", "youtube"],
  });
  assert.ok(prompt.includes('"title": "string"'));
  assert.ok(prompt.includes('"voiceover_text": "string"'));
  assert.ok(prompt.includes('"platform_outputs"'));
  assert.ok(prompt.includes('"image_prompts"'));
  assert.ok(GENERATE_PACKAGE_SYSTEM.includes("Creative Engine"));
  assert.ok(GENERATE_PACKAGE_SYSTEM.includes("Video is MANDATORY"));
});

check("platform adaptation unchanged", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "x",
    availableAssets: [],
    directives,
    decisionPacks: packs,
    requireVideo: true,
    targetPlatforms: ["tiktok", "linkedin", "facebook"],
  });
  assert.ok(prompt.includes("- tiktok:"));
  assert.ok(prompt.includes("- linkedin:"));
  assert.ok(prompt.includes("- facebook:"));
});

check("universal — no industry SaaS/office/clinic defaults injected", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "x",
    availableAssets: [],
    directives,
    decisionPacks: packs,
    requireVideo: true,
  });
  assert.ok(
    !/saas dashboard default|clinic patient|office worker default|restaurant menu default|ecommerce cart default/i.test(
      prompt,
    ),
  );
  assert.ok(prompt.includes(project.name));
});

check("PresentationRenderInput orchestrator matches public API output", () => {
  const viaPublic = buildGenerateContentPackagePrompt({
    project,
    funnelStage: "awareness",
    topic: "manual reports",
    angle: "Friday",
    availableAssets: [],
    directives,
    decisionPacks: packs,
    requireVideo: true,
    creativeCandidatePromptBlock: "WINNER BLOCK",
  });
  const viaRender = buildPresentationPrompt(
    toPresentationRenderInput({
      project,
      funnelStage: "awareness",
      topic: "manual reports",
      angle: "Friday",
      availableAssets: [],
      directives,
      decisionPacks: packs,
      requireVideo: true,
      creativeCandidatePromptBlock: "WINNER BLOCK",
      creativeDirectiveBlock: buildCreativeDirectiveBlock(directives),
    }),
  );
  assert.equal(viaPublic, viaRender);
});

// --- Metrics ----------------------------------------------------------------

section("architecture metrics");

const promptLoc = countLines(promptPath);
const presentationLoc = countDirLines(presentationDir);
const packsLoc = countDirLines(packsDir);
const rendererLoc = countLines(rendererPath);
const compatLoc = countLines(compatPath);

const samplePrompt = buildGenerateContentPackagePrompt({
  project,
  funnelStage: "awareness",
  topic: "manual reports",
  angle: "Friday scramble",
  availableAssets: [],
  directives,
  decisionPacks: packs,
  requireVideo: true,
  targetPlatforms: ["tiktok", "instagram", "youtube"],
  creativeCandidatePromptBlock: "CREATIVE CANDIDATE",
  narrativeBeatPromptBlock: "NARRATIVE BEATS",
});

console.log(`  prompt module LOC:           ${promptLoc}  (before Phase 3 ≈ 993)`);
console.log(`  presentation/ renderers LOC: ${rendererLoc}`);
console.log(`  presentation/ total LOC:     ${presentationLoc}`);
console.log(`  ensureDecisionPacks LOC:     ${compatLoc}`);
console.log(`  typedDecisionPacks LOC:      ${packsLoc}`);
console.log(`  sample prompt ESTIMATED toks:${tok(samplePrompt)}`);

check("prompt module is thinner than pre-Phase-3 monolith (~993 LOC)", () => {
  assert.ok(promptLoc < 400, `expected <400 LOC, got ${promptLoc}`);
});

check("renderer module exists and holds section text", () => {
  assert.ok(rendererLoc > 200);
  assert.ok(presentationLoc > rendererLoc);
});

// --- Summary ----------------------------------------------------------------

console.log(`\n${"=".repeat(60)}`);
console.log(`presentation-simplification: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
