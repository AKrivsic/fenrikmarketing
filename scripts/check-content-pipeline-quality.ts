/**
 * Content Pipeline quality wiring checks (directives, fingerprints, pain point,
 * opening strength, regenerate memory).
 *   npm run check:content-pipeline-quality
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Project } from "@/lib/supabase/types";
import { pickCreativeDirectives } from "@/lib/ai/prompts/creativeDirectives";
import {
  antiRepetitionBlock,
  resolveSelectedPainPoint,
  selectedPainPointBlock,
} from "@/lib/ai/prompts/context";
import {
  buildContentPipelineFingerprint,
  pipelineFingerprintFromPackageBrief,
  pipelineFingerprintMemoryBlock,
} from "@/lib/content-memory/pipelineFingerprint";
import { CONTENT_PIPELINE_FINGERPRINT_VERSION } from "@/lib/content-memory/types";
import { buildVideoConceptPrompt } from "@/lib/content-pipeline/prompts/videoConcept";
import { buildOpeningImpactPrompt } from "@/lib/content-pipeline/prompts/openingImpact";
import { buildContentPackagePrompt } from "@/lib/content-pipeline/prompts/contentPackage";
import {
  parseRegenerationKeepFlags,
  type RegenerationContext,
} from "@/lib/content-pipeline/regeneration";
import type {
  OpeningImpact,
  VideoConcept,
  VisualIdentity,
} from "@/lib/content-pipeline/types";
import type { AntiRepetitionMemory } from "@/lib/ai/types";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok — ${name}`);
  } catch (err) {
    console.error(`FAIL — ${name}`);
    throw err;
  }
}

const stubProject = {
  name: "Test",
  type: "saas",
  language: "en",
  market_scope: "local",
  goal_type: "leads",
  target_audience: {},
  tone_of_voice: {},
  product_is: ["AI receptionist"],
  product_is_not: ["human replacement"],
  product_strengths: ["answers after hours"],
  pain_points: ["missed calls", "slow follow-up"],
  forbidden_claims: [],
  platforms: ["instagram"],
  default_cta: "Book a demo",
  knowledge: {
    version: 1,
    source_url: null,
    cards: {
      product: { summary: "", features: [], differentiators: [] },
      customer: { who: "", jobs: [], pain_points: [], objections: [] },
      voice: { tone: [], words_to_use: [], words_to_avoid: [] },
      proof: {
        statements: ["Answers 94% of after-hours calls"],
        asset_statements: [],
      },
    },
    scenarios: [{ id: "s1", text: "Owner is mid-dinner when the phone rings" }],
  },
  publishing_rules: null,
} as unknown as Project;

const concept: VideoConcept = {
  title: "Two clocks",
  core_idea: "Prospect research clock vs business hours",
  narrative_arc: "reveal → tension → CTA",
  emotional_tone: "urgent",
  audience_insight: "buyers research off-hours",
  product_role: "always-on reply",
  why_it_works: "makes invisible loss visible",
  visual_direction: {
    art_direction: "cinematic night office",
    lighting: "cool practicals",
    palette: "navy and amber",
    environment: "empty office at 11pm",
    camera_style: "slow push-ins",
    character_style: "none",
  },
};

const opening: OpeningImpact = {
  first_image: "Phone glowing on a dark desk while a dinner plate sits untouched",
  first_spoken_sentence: "Your best lead just called during dessert.",
  emotion: "tension",
  pacing: "tight",
  attention_pattern: "interrupted ritual",
};

const identity: VisualIdentity = {
  ...concept.visual_direction,
  opening_emotion: opening.emotion,
  opening_first_image: opening.first_image,
};

const memory: AntiRepetitionMemory = {
  hooks: ["Old hook"],
  topics: ["Old topic"],
  ctas: ["Old CTA"],
  scenarios: [],
  pipelineFingerprints: [
    {
      version: CONTENT_PIPELINE_FINGERPRINT_VERSION,
      core_idea: "Dashboard montage of KPIs",
      product_role: "shows charts",
      environment: "generic glass office",
      attention_pattern: "zoom on numbers",
      narrative_mechanism: "standard: tip list",
      visual_world: "generic glass office / corporate blue",
    },
  ],
};

const directives = pickCreativeDirectives("awareness|missed calls|after hours");

check("fingerprint schema builds and round-trips via package brief", () => {
  const fp = buildContentPipelineFingerprint({
    concept,
    openingImpact: opening,
    visualIdentity: identity,
    creativeModeId: directives.mode.id,
  });
  assert.equal(fp.version, CONTENT_PIPELINE_FINGERPRINT_VERSION);
  assert.ok(fp.core_idea.includes("Prospect"));
  assert.ok(fp.visual_world.includes("empty office"));
  const brief = {
    presentation_generation: { content_pipeline_fingerprint: fp },
  };
  const read = pipelineFingerprintFromPackageBrief(brief);
  assert.deepEqual(read, fp);
});

check("Video Concept prompt includes mode directives + fingerprints + pain + diversity", () => {
  const prompt = buildVideoConceptPrompt({
    project: stubProject,
    funnelStage: "problem_aware",
    topic: "Missed after-hours calls",
    angle: "dinner interrupted",
    memory,
    directives,
    painPoint: "missed calls",
  });
  assert.match(prompt, /CREATIVE DIRECTIVE \(THINKING MODEL/);
  assert.match(prompt, /MODE \(primary thinking frame/);
  assert.match(prompt, /HOW TO THINK:/);
  assert.match(prompt, /MODE OWNERSHIP/);
  assert.match(prompt, /RECENT CONTENT PIPELINE FINGERPRINTS/);
  assert.match(prompt, /SELECTED PAIN POINT/);
  assert.match(prompt, /missed calls/);
  assert.match(prompt, /PERSPECTIVE DIVERSITY/);
  assert.match(prompt, /PRODUCT CONTEXT DIVERSITY/);
  assert.match(prompt, /primary THINKING MODEL/);
  assert.doesNotMatch(prompt, /NARRATIVE DIVERSITY:/);
});

check("Opening Impact prompt includes proof, scenarios, pain, visual world, quality bars", () => {
  const prompt = buildOpeningImpactPrompt({
    project: stubProject,
    concept,
    topic: "Missed after-hours calls",
    memory,
    directives,
    painPoint: "missed calls",
  });
  assert.match(prompt, /PROOF POOL/);
  assert.match(prompt, /SCENARIO POOL/);
  assert.match(prompt, /SELECTED PAIN POINT/);
  assert.match(prompt, /VISUAL WORLD/);
  assert.match(prompt, /SPECIFICITY/);
  assert.match(prompt, /clickbait/i);
  assert.match(prompt, /OPENING DIRECTIVE \(THINKING MODEL/);
  assert.match(prompt, /HOOK DIVERSITY \(inside the MODE/);
  assert.match(prompt, /HOW TO THINK:/);
});

check("Content Package prompt includes mode directives + pain", () => {
  const prompt = buildContentPackagePrompt({
    project: stubProject,
    funnelStage: "problem_aware",
    topic: "Missed after-hours calls",
    concept,
    openingImpact: opening,
    visualIdentity: identity,
    availableAssets: [],
    memory,
    targetPlatforms: ["tiktok", "instagram", "facebook"],
    requireVideo: true,
    directives,
    painPoint: "missed calls",
  });
  assert.match(prompt, /CREATIVE DIRECTIVE \(THINKING MODEL/);
  assert.match(prompt, /SELECTED PAIN POINT/);
  assert.match(prompt, /CREATIVE MODE is the THINKING MODEL for voiceover/);
  assert.match(prompt, /Follow MODE BEATS as the natural order of thought/);
});

check("parseRegenerationKeepFlags detects keep intents", () => {
  assert.equal(parseRegenerationKeepFlags("keep the hook please").keepHook, true);
  assert.equal(
    parseRegenerationKeepFlags("keep the concept, change captions").keepConcept,
    true,
  );
  assert.equal(
    parseRegenerationKeepFlags("keep wording, just fix typos").keepWording,
    true,
  );
  assert.equal(parseRegenerationKeepFlags("make it funnier").keepHook, false);
});

check("anti-rep softens when keepHook is set", () => {
  const hard = antiRepetitionBlock(memory);
  const soft = antiRepetitionBlock(memory, { keepHook: true });
  assert.match(hard, /Do NOT reuse any hook/);
  assert.match(soft, /KEEP the hook/);
  assert.doesNotMatch(soft, /Do NOT reuse any hook above/);
});

check("resolveSelectedPainPoint prefers brief then overlap", () => {
  assert.equal(
    resolveSelectedPainPoint({
      project: stubProject,
      briefPainPoint: "slow follow-up",
      topic: "missed calls tonight",
    }),
    "slow follow-up",
  );
  assert.equal(
    resolveSelectedPainPoint({
      project: stubProject,
      briefPainPoint: null,
      topic: "We keep missing evening calls",
    }),
    "missed calls",
  );
});

check("pipelineFingerprintMemoryBlock is rejection-only", () => {
  const block = pipelineFingerprintMemoryBlock(memory.pipelineFingerprints!);
  assert.match(block, /avoid repeating/i);
  assert.match(block, /Dashboard montage/);
});

check("regenerate excludes package id from memory builder", () => {
  const src = readFileSync(
    path.join(root, "lib/ai/workflows/regenerateContentPackage.ts"),
    "utf8",
  );
  assert.match(src, /excludePackageId:\s*packageId/);
  assert.match(src, /parseRegenerationKeepFlags/);
});

check("runCreativePipeline stamps content_pipeline_fingerprint", () => {
  const src = readFileSync(
    path.join(root, "lib/content-pipeline/runCreativePipeline.ts"),
    "utf8",
  );
  assert.match(src, /content_pipeline_fingerprint/);
  assert.match(src, /buildContentPipelineFingerprint/);
  assert.match(src, /selected_pain_point/);
});

check("strategy prompt asks for pain_point field", () => {
  const src = readFileSync(
    path.join(root, "lib/ai/prompts/contentStrategyPlan.ts"),
    "utf8",
  );
  assert.match(src, /"pain_point"/);
});

console.log(`\n${passed} checks passed`);
