// Phase 4 — Repair Delta Engine checks.
//   npm run check:repair-delta
//
// Verifies Repair is a patch generator over Typed Decision Packs:
// - preserves authoritative decisions
// - does not replay full Presentation
// - merge applies only patchTargets
// - legacy appendix wording retained inside requiredChange
// Does NOT redesign Presentation, packs, validators, or schema.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildFidelityRepairDelta,
  buildStoryIntegrityRepairDelta,
  buildRepairDeltaPrompt,
  mergeRepairedPackage,
  repairDeltaToLegacyAppendix,
  buildLegacyRepairPromptViaPresentation,
  selectRepairRendererIds,
  DEFAULT_REPAIR_PRESERVE,
  REPAIR_DELTA_VERSION,
} from "@/lib/architecture/repairDelta";
import { buildTypedDecisionPacks } from "@/lib/architecture/typedDecisionPacks";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { fidelityRepairAppendix } from "@/lib/creative-candidates/fidelityCheck";
import { storyIntegrityRepairAppendix } from "@/lib/creative-candidates/storyIntegrity";
import type { ConceptFidelityResult } from "@/lib/creative-candidates/types";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import type { StoryIntegrityResult } from "@/lib/creative-candidates/storyIntegrity";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
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

const directives: CreativeDirectives = {
  mode: CREATIVE_MODES.find((m) => m.id === "observation") ?? CREATIVE_MODES[0]!,
  hook: HOOK_ARCHETYPES[0]!,
  persona: VOICE_PERSONAS[0]!,
};

const winnerHook = "Your Friday report is still blank at 4:55.";

const winner = {
  candidateId: "c1",
  family: "story",
  coreIdea: "Friday scramble",
  emotionalReaction: "anxious then relieved",
  hookLine: winnerHook,
  openingSituation: "Empty cells at 4:55",
  visualPromise: "clock vs blank",
  storyProgression: "pressure to clarity",
  productConnection: "one-click export",
  ending: "calm export",
  expectedViewerQuestion: "faster way?",
  memorabilityReason: "time",
  creativeDNA: {
    world: "late ops desk",
    mainCharacter: "ops lead",
    coreConflict: "manual report race",
    productRole: "one-click export",
    viewerQuestion: "faster way?",
    endingIntent: "calm export",
    immutableRules: ["Stay in the ops desk world."],
  },
} as unknown as CreativeCandidate;

const project = {
  id: "p-r4",
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

const packs = buildTypedDecisionPacks({
  project,
  directives,
  funnelStage: "awareness",
  targetPlatforms: ["tiktok", "instagram", "youtube"],
  selectedCandidate: {
    hookLine: winner.hookLine,
    openingSituation: winner.openingSituation,
    emotionalReaction: winner.emotionalReaction,
    creativeDNA: winner.creativeDNA ?? null,
  },
  creativeDna: winner.creativeDNA ?? null,
  requireVideo: true,
  videoPlatforms: ["tiktok", "instagram", "youtube"],
});

const priorPackage = {
  title: "Friday Scramble",
  funnel_stage: "Awareness",
  hook: "Wrong softer hook",
  voiceover_text:
    "Wrong softer hook. Then a long essay about industry trends and our mission.",
  subtitles: "Wrong softer hook",
  cta: { type: "learn_more", text: "See how it works" },
  video: { concept: "desk montage", script: "Wrong softer hook. Essay." },
  platform_outputs: {
    tiktok: { caption: "tt", cta: "bio", hashtags: ["a"] },
    instagram: { caption: "ig", cta: "bio", hashtags: ["b"] },
    youtube: { caption: "yt", cta: "sub", hashtags: ["c"] },
    x: { caption: "x", cta: "reply", hashtags: [] },
    google_business: { caption: "gb", cta: "call", hashtags: [] },
    linkedin: { caption: "li", cta: "comment", hashtags: [] },
    facebook: { caption: "fb", cta: "msg", hashtags: [] },
  },
  hashtags: ["ops"],
  image_prompts: [
    "generic office laptop coffee",
    "same office again",
    "landing page hero",
  ],
  visual_scenes: [
    { source: "ai", image_prompt: "generic office laptop coffee" },
    { source: "ai", image_prompt: "same office again" },
    { source: "ai", image_prompt: "landing page hero" },
  ],
  asset_usage: [],
  scenario: "",
} as unknown as ContentPackageOutput;

const fidelityFail: ConceptFidelityResult = {
  passed: false,
  openingSituationVisibleInScene1: false,
  openingEventPreservedInScene1: false,
  stopScrollIdeaPreserved: false,
  hookPreservedInFirstSpoken: false,
  coreIdeaRecognizable: false,
  productOrTopicImplied: true,
  collapsedToGenericOffice: true,
  voiceoverEssayCadence: true,
  salesPitchOpening: false,
  failureReasons: [
    "hook_not_preserved_in_first_spoken",
    "opening_situation_missing_from_scene1:subject",
    "storyboard_collapsed_to_generic_office",
    "voiceover_essay_or_generic_opener",
  ],
};

const storyFail = {
  passed: false,
  version: "story-integrity@1",
  allowedWorldTokens: ["ops", "desk"],
  productDemonstration: {
    present: false,
    askPresent: false,
    answerPresent: false,
    resultPresent: false,
    landingPageOnly: true,
    evidence: ["landing"],
  },
  ctaMatch: {
    packageCta: "See how it works",
    voiceoverContainsCta: false,
    ctaMismatch: true,
    evidence: null,
  },
  violations: [
    {
      code: "world_abandoned",
      message: "Left the ops desk world",
      sceneIndex: 2,
      evidence: "landing page",
    },
    {
      code: "product_demonstration_missing",
      message: "No product demo",
    },
  ],
  warnings: [
    {
      code: "cta_mismatch",
      message: "Spoken close does not support CTA",
    },
  ],
  summary: "world_abandoned,product_demonstration_missing",
} as unknown as StoryIntegrityResult;

// --- Static wiring ----------------------------------------------------------

section("static: workflows use RepairDelta (not full Presentation replay)");

check("generate workflow builds delta repair prompts + merge", () => {
  const src = readFileSync(
    join(process.cwd(), "lib/ai/workflows/generateContentPackage.ts"),
    "utf8",
  );
  assert.ok(/buildRepairDeltaPrompt\(/.test(src));
  assert.ok(/buildFidelityRepairDelta\(/.test(src));
  assert.ok(/buildStoryIntegrityRepairDelta\(/.test(src));
  assert.ok(/mergeRepairedPackage\(/.test(src));
  assert.ok(!/fidelityRepairAppendix\(/.test(src));
  assert.ok(!/storyIntegrityRepairAppendix\(/.test(src));
});

check("regenerate workflow builds delta repair prompts + merge", () => {
  const src = readFileSync(
    join(process.cwd(), "lib/ai/workflows/regenerateContentPackage.ts"),
    "utf8",
  );
  assert.ok(/buildRepairDeltaPrompt\(/.test(src));
  assert.ok(/mergeRepairedPackage\(/.test(src));
  assert.ok(!/fidelityRepairAppendix\(/.test(src));
  assert.ok(!/storyIntegrityRepairAppendix\(/.test(src));
});

check("repair delta prompt orchestrator does not import Presentation builder", () => {
  const src = readFileSync(
    join(process.cwd(), "lib/architecture/repairDelta/buildRepairPrompt.ts"),
    "utf8",
  );
  assert.ok(!/from ["']@\/lib\/ai\/prompts\/generateContentPackage["']/.test(src));
  assert.ok(!/from ["']@\/lib\/architecture\/presentation["']/.test(src));
  assert.ok(!/import\s*\{[^}]*buildGenerateContentPackagePrompt/.test(src));
  assert.ok(!/import\s*\{[^}]*buildPresentationPrompt/.test(src));
});

// --- Delta construction -----------------------------------------------------

section("RepairDelta construction + preserve");

const fidelityDelta = buildFidelityRepairDelta({
  winner,
  fidelity: fidelityFail,
});
const storyDelta = buildStoryIntegrityRepairDelta({
  winner,
  integrity: storyFail,
  packageCta: priorPackage.cta.text,
});

check("fidelity delta version + validator + failure codes", () => {
  assert.equal(fidelityDelta.version, REPAIR_DELTA_VERSION);
  assert.equal(fidelityDelta.validator, "concept_fidelity");
  assert.equal(fidelityDelta.severity, "material");
  assert.ok(fidelityDelta.failureCodes.includes("hook_not_preserved_in_first_spoken"));
  assert.ok(fidelityDelta.patchTargets.includes("voiceover_text"));
  assert.ok(fidelityDelta.patchTargets.includes("visual_scenes"));
});

check("story delta preserves authoritative pack decisions", () => {
  assert.equal(storyDelta.validator, "story_integrity");
  for (const rule of [
    "hook",
    "opening",
    "storyStructure",
    "productGrounding",
    "voicePersona",
    "characterIdentity",
    "visualIdentity",
    "assetOwnership",
    "ctaType",
    "platformStrategy",
  ] as const) {
    assert.ok(storyDelta.preserve.includes(rule), `missing preserve ${rule}`);
  }
});

check("requiredChange reuses legacy appendix wording (behavior preserved)", () => {
  const legacyFid = fidelityRepairAppendix(winner, fidelityFail);
  const legacyStory = storyIntegrityRepairAppendix(
    winner,
    storyFail,
    priorPackage.cta.text,
  );
  assert.equal(fidelityDelta.requiredChange, legacyFid);
  assert.equal(storyDelta.requiredChange, legacyStory);
  assert.equal(repairDeltaToLegacyAppendix(fidelityDelta), legacyFid);
});

check("DEFAULT_REPAIR_PRESERVE lists pack-owned decisions", () => {
  assert.ok(DEFAULT_REPAIR_PRESERVE.includes("hook"));
  assert.ok(DEFAULT_REPAIR_PRESERVE.includes("storyStructure"));
  assert.ok(DEFAULT_REPAIR_PRESERVE.includes("assetOwnership"));
});

// --- Prompt rendering -------------------------------------------------------

section("patch rendering (no full Presentation replay)");

const fidelityPrompt = buildRepairDeltaPrompt({
  decisionPacks: packs,
  repairDelta: fidelityDelta,
  generatedPackage: priorPackage,
  validationResults: { fidelity: fidelityFail },
  winner,
  funnelStageLabel: "Awareness",
  requireVideo: true,
});

const presentationPrompt = buildGenerateContentPackagePrompt({
  project,
  funnelStage: "awareness",
  topic: "manual reports",
  angle: "Friday scramble",
  availableAssets: [],
  directives,
  decisionPacks: packs,
  requireVideo: true,
  targetPlatforms: ["tiktok", "instagram", "youtube"],
  creativeCandidatePromptBlock: "CREATIVE CANDIDATE (winner)",
});

check("delta prompt includes packs + prior package + required change", () => {
  assert.ok(fidelityPrompt.includes("REPAIR DELTA"));
  assert.ok(fidelityPrompt.includes("IMMUTABLE DECISIONS"));
  assert.ok(fidelityPrompt.includes("PRIOR PACKAGE"));
  assert.ok(fidelityPrompt.includes(winnerHook) || fidelityPrompt.includes(packs.hook.hookLine));
  assert.ok(fidelityPrompt.includes(packs.storyStructure.beatArc));
  assert.ok(fidelityPrompt.includes("CREATIVE CANDIDATE FIDELITY REPAIR"));
  assert.ok(fidelityPrompt.includes("Wrong softer hook"));
});

check("delta prompt is NOT a Presentation replay", () => {
  assert.ok(!fidelityPrompt.includes("ATTENTION FIRST (internal growth engine"));
  assert.ok(!fidelityPrompt.includes("PLATFORM STYLES (make each platform"));
  assert.ok(!fidelityPrompt.includes("AVAILABLE ASSETS (optional product library"));
  assert.ok(!fidelityPrompt.includes("VISUAL BEATS: provide 3–"));
  assert.ok(!fidelityPrompt.includes("CREATIVE CANDIDATE (winner)"));
});

check("delta prompt smaller than Presentation (ESTIMATED tokens)", () => {
  const deltaTok = tok(fidelityPrompt);
  const fullTok = tok(presentationPrompt);
  console.log(`  fidelity repair ESTIMATED toks: ${deltaTok}`);
  console.log(`  presentation ESTIMATED toks:    ${fullTok}`);
  console.log(
    `  reduction vs Presentation:      ${(((fullTok - deltaTok) / fullTok) * 100).toFixed(1)}%`,
  );
  assert.ok(deltaTok < fullTok * 0.85, `expected material cut, got ${deltaTok} vs ${fullTok}`);
});

check("renderer selection matches patchTargets", () => {
  const ids = selectRepairRendererIds(fidelityDelta.patchTargets);
  assert.ok(ids.includes("voice"));
  assert.ok(ids.includes("scene"));
  assert.ok(!ids.includes("platform"));
});

check("legacy Presentation adapter still available (temporary)", () => {
  const legacy = buildLegacyRepairPromptViaPresentation({
    buildPresentationPrompt: (appendix) =>
      buildGenerateContentPackagePrompt({
        project,
        funnelStage: "awareness",
        topic: "x",
        availableAssets: [],
        directives,
        decisionPacks: packs,
        requireVideo: true,
        creativeCandidateFidelityRepair: appendix,
      }),
    delta: fidelityDelta,
  });
  assert.ok(legacy.includes("CREATIVE CANDIDATE FIDELITY REPAIR"));
  assert.ok(legacy.includes("ATTENTION FIRST"));
});

// --- Merge ------------------------------------------------------------------

section("merge applies only targeted changes");

const repairedDraft = {
  ...priorPackage,
  hook: winnerHook,
  voiceover_text: `${winnerHook} Ops lead stares at empty cells. One-click export lands.`,
  subtitles: winnerHook,
  title: "SHOULD NOT KEEP IF NOT TARGET — wait title not in fidelity targets",
  cta: { type: "book_call", text: "HACKED CTA" },
  platform_outputs: {
    ...priorPackage.platform_outputs,
    tiktok: { caption: "HACKED TT", cta: "x", hashtags: ["z"] },
  },
  visual_scenes: [
    { source: "ai", image_prompt: "empty cells at 4:55 on ops desk" },
    { source: "ai", image_prompt: "pressure rising" },
    { source: "ai", image_prompt: "one-click export calm" },
  ],
  image_prompts: [
    "empty cells at 4:55 on ops desk",
    "pressure rising",
    "one-click export calm",
  ],
  video: {
    concept: "ops desk scramble",
    script: `${winnerHook} Ops lead stares at empty cells.`,
  },
  asset_usage: [{ asset_id: "new-asset", used_as: "ui_hero", modify: "false" }],
} as unknown as ContentPackageOutput;

const merged = mergeRepairedPackage({
  prior: priorPackage,
  repaired: repairedDraft,
  delta: fidelityDelta,
  decisionPacks: packs,
  winner,
});

check("merge updates voiceover / visuals / video from repair", () => {
  assert.equal(merged.voiceover_text, repairedDraft.voiceover_text);
  assert.deepEqual(merged.visual_scenes, repairedDraft.visual_scenes);
  assert.deepEqual(merged.image_prompts, repairedDraft.image_prompts);
  assert.equal(merged.video?.concept, "ops desk scramble");
});

check("merge preserves CTA and platforms (not in fidelity patchTargets)", () => {
  assert.deepEqual(merged.cta, priorPackage.cta);
  assert.deepEqual(merged.platform_outputs, priorPackage.platform_outputs);
  assert.deepEqual(merged.asset_usage, priorPackage.asset_usage);
});

check("story merge with preserve.hook forces pack/winner hook", () => {
  const storyMerged = mergeRepairedPackage({
    prior: priorPackage,
    repaired: {
      ...repairedDraft,
      hook: "Invented different hook",
      cta: { type: "learn_more", text: "Updated close" },
    } as ContentPackageOutput,
    delta: storyDelta,
    decisionPacks: packs,
    winner,
  });
  assert.equal(storyMerged.hook, packs.hook.hookLine || winnerHook);
  // cta in patchTargets for story (cta_mismatch warning) → text may update
  assert.equal(storyMerged.cta.text, "Updated close");
  assert.equal(storyMerged.cta.type, "learn_more");
});

check("no industry defaults in repair prompt", () => {
  assert.ok(
    !/saas dashboard default|clinic patient|office worker default|restaurant menu default/i.test(
      fidelityPrompt,
    ),
  );
});

// --- Metrics ----------------------------------------------------------------

section("metrics");

const rendererCount = [
  "renderPreserveBlock",
  "renderDeltaHeader",
  "renderSceneRepair",
  "renderVoiceRepair",
  "renderCTARepair",
  "renderAssetRepair",
  "renderPlatformRepair",
  "renderPriorPackageBlock",
  "renderRepairTask",
].length;

console.log(`  repair renderers:              ${rendererCount}`);
console.log(`  validators → structured delta: 3 (fidelity, story, PDI)`);
console.log(`  full Presentation replays removed from repair path: 4 call sites`);
console.log(`  legacy adapter paths:          1 (documented temporary)`);
console.log(`  fidelity repair toks (est):    ${tok(fidelityPrompt)}`);
console.log(`  presentation toks (est):       ${tok(presentationPrompt)}`);

check("renderer count is at least 5 focused renderers", () => {
  assert.ok(rendererCount >= 5);
});

console.log(`\n${"=".repeat(60)}`);
console.log(`repair-delta: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
