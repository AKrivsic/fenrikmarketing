/**
 * Focused checks: regenerateContentPackage uses Content Pipeline only.
 * Run: npx tsx scripts/check-regenerate-content-pipeline.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRegenerationInstructionBlock,
  extractPriorPipelineArtifacts,
  summarizeExistingPackage,
  type RegenerationContext,
} from "@/lib/content-pipeline/regeneration";
import { buildVideoConceptPrompt } from "@/lib/content-pipeline/prompts/videoConcept";
import { buildOpeningImpactPrompt } from "@/lib/content-pipeline/prompts/openingImpact";
import { buildContentPackagePrompt } from "@/lib/content-pipeline/prompts/contentPackage";
import type { Project } from "@/lib/supabase/types";
import type { VideoConcept } from "@/lib/content-pipeline/types";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const regenPath = path.join(
  root,
  "lib/ai/workflows/regenerateContentPackage.ts",
);
const regenSrc = readFileSync(regenPath, "utf8");

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
  product_is: ["chat"],
  product_is_not: [],
  product_strengths: [],
  pain_points: ["missed calls"],
  forbidden_claims: [],
  platforms: ["instagram"],
  default_cta: "Book a demo",
  knowledge: null,
  publishing_rules: null,
} as unknown as Project;

const stubConcept: VideoConcept = {
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

const baseRegen: RegenerationContext = {
  instruction: "make it funnier",
  previousTitle: "Old title",
  previousPackageSummary: "title: Old\nhook: Old hook",
  priorVideoConcept: stubConcept,
  priorOpeningImpact: {
    first_image: "dark desk",
    first_spoken_sentence: "Your prospects shop at midnight.",
    emotion: "tension",
    pacing: "fast",
    attention_pattern: "pattern interrupt",
  },
  priorVisualIdentity: null,
  packageId: "pkg-1",
};

check("regenerate imports runCreativePipeline", () => {
  assert.match(regenSrc, /runCreativePipeline/);
  assert.match(regenSrc, /from "@\/lib\/content-pipeline\/runCreativePipeline"/);
});

check("regenerate excludes current package from anti-rep memory", () => {
  assert.match(regenSrc, /excludePackageId:\s*packageId/);
  assert.match(regenSrc, /parseRegenerationKeepFlags/);
});

check("regenerate does not invoke integrity or RepairDelta", () => {
  assert.doesNotMatch(regenSrc, /Concept Fidelity|Story Integrity|Product Demonstration/);
  assert.doesNotMatch(regenSrc, /repairDelta|buildFidelityRepairDelta|buildStoryIntegrityRepairDelta/);
  assert.doesNotMatch(regenSrc, /validateStoryIntegrity|checkConceptFidelity|validateProductDemonstrationIntegrity/);
  assert.doesNotMatch(regenSrc, /enforceCandidateHook|Candidate Judge|Narrative Beats/);
  assert.doesNotMatch(regenSrc, /buildTypedDecisionPacks|planCreativeIdentityForPackage/);
});

check("regenerate preserves version snapshot + video job persistence", () => {
  assert.match(regenSrc, /snapshotPackage/);
  assert.match(regenSrc, /content_versions/);
  assert.match(regenSrc, /from\("video_jobs"\)/);
  assert.match(regenSrc, /upsertPackageItems/);
  assert.match(regenSrc, /versionsCreated/);
});

check("extractPriorPipelineArtifacts reads stored concept/opening", () => {
  const prior = extractPriorPipelineArtifacts({
    hook: "Hi",
    presentation_generation: {
      video_concept: stubConcept,
      opening_impact: baseRegen.priorOpeningImpact,
    },
  });
  assert.equal(prior.video_concept?.title, "Two clocks");
  assert.equal(
    prior.opening_impact?.first_spoken_sentence,
    "Your prospects shop at midnight.",
  );
});

check("summarizeExistingPackage includes hook/concept", () => {
  const summary = summarizeExistingPackage({
    title: "Pkg",
    brief: {
      hook: "Open line",
      voiceover_text: "Open line then body",
      video: { concept: "Clock gap", script: "..." },
      cta: { type: "lead", text: "Book" },
    },
  });
  assert.match(summary, /Open line/);
  assert.match(summary, /Clock gap/);
});

check("regeneration instruction block encodes remain-vs-change guidance", () => {
  const block = buildRegenerationInstructionBlock(baseRegen);
  assert.match(block, /REGENERATION MODE/);
  assert.match(block, /make it funnier/);
  assert.match(block, /completely different concept/);
  assert.match(block, /PRIOR VIDEO CONCEPT/);
});

check("video concept prompt includes regeneration for different-concept instruction", () => {
  const prompt = buildVideoConceptPrompt({
    project: stubProject,
    funnelStage: "problem_aware",
    topic: "Missed after-hours leads",
    regeneration: {
      ...baseRegen,
      instruction: "create a completely different concept",
    },
  });
  assert.match(prompt, /REGENERATION MODE/);
  assert.match(prompt, /completely different concept/);
  assert.match(prompt, /Missed after-hours leads/);
});

check("opening impact prompt emphasizes opening-only regeneration", () => {
  const prompt = buildOpeningImpactPrompt({
    project: stubProject,
    concept: stubConcept,
    topic: "Missed after-hours leads",
    regeneration: {
      ...baseRegen,
      instruction: "change only the opening",
    },
  });
  assert.match(prompt, /change only the opening/);
  assert.match(prompt, /opening-focused|Opening Impact/i);
});

check("content package prompt supports text-only regeneration (no requireVideo)", () => {
  const prompt = buildContentPackagePrompt({
    project: stubProject,
    funnelStage: "problem_aware",
    topic: "Missed after-hours leads",
    concept: stubConcept,
    openingImpact: baseRegen.priorOpeningImpact!,
    visualIdentity: {
      art_direction: "clean",
      lighting: "soft",
      palette: "neutral",
      environment: "desk",
      camera_style: "static",
      character_style: "none",
      opening_emotion: "calm",
      opening_first_image: "desk",
    },
    availableAssets: [],
    targetPlatforms: ["linkedin"],
    requireVideo: false,
    regeneration: {
      ...baseRegen,
      instruction: "keep the concept but rewrite the wording",
    },
  });
  assert.match(prompt, /rewrite the wording/);
  assert.match(prompt, /Video block optional for text-only/);
});

check("full video package regeneration prompt requires video block", () => {
  const prompt = buildContentPackagePrompt({
    project: stubProject,
    funnelStage: "problem_aware",
    topic: "Missed after-hours leads",
    concept: stubConcept,
    openingImpact: baseRegen.priorOpeningImpact!,
    visualIdentity: {
      art_direction: "cinematic",
      lighting: "cool",
      palette: "navy",
      environment: "office night",
      camera_style: "push-in",
      character_style: "none",
      opening_emotion: "tension",
      opening_first_image: "dark desk",
    },
    availableAssets: [],
    targetPlatforms: ["instagram", "tiktok"],
    requireVideo: true,
    videoPlatforms: ["instagram", "tiktok"],
    regeneration: baseRegen,
  });
  assert.match(prompt, /Require video\.concept/);
  assert.match(prompt, /make it funnier/);
});

console.log(`\n${passed} checks passed`);
