// Visual Narrative v1 — meaning carrier + motif memory + prompt wiring.
//   npm run check:visual-narrative

import assert from "node:assert/strict";
import type { Project } from "@/lib/supabase/types";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { VISUAL_NARRATIVE_PROMPT_HEADER } from "@/lib/visual-narrative/promptBlocks";
import { planVisualNarrativeForPackage } from "@/lib/visual-narrative/planForPackage";
import { planCreativeIdentityForPackage } from "@/lib/creative-identity/planForPackage";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import { fingerprintFromPackageBrief } from "@/lib/series/creativeFingerprints";
import { resolveVisualNarrative } from "@/lib/visual-narrative/resolveVisualNarrative";
import { motifsFromVisualText } from "@/lib/visual-narrative/motifMemory";

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

const saasProject = {
  id: "proj-vn-saas",
  name: "BuildTool",
  type: "saas",
  language: "en",
  market_scope: "global",
  goal_type: "lead_generation",
  target_audience: { segments: ["Startup founders", "Developers"] },
  product_is: ["AI platform for SaaS product blueprints and requirements"],
  product_is_not: [],
  product_strengths: ["Generates architecture before coding"],
  pain_points: ["Developers receive incomplete requirements"],
  forbidden_claims: [],
  tone_of_voice: { notes: ["Direct"] },
  platforms: [],
  publishing_rules: {},
  default_cta: null,
} as unknown as Project;

const eduProject = {
  ...saasProject,
  id: "proj-vn-edu",
  product_is: ["AI flashcard generator for students"],
  pain_points: ["Creating flashcards manually takes too long"],
  target_audience: { segments: ["Students revising for exams"] },
} as unknown as Project;

const emptySeries: SeriesCreativeContext = {
  fingerprints: [],
  typedCtaInCurrentRun: 0,
  typedCtaInWeeklyStrategy: 0,
  recentCtaCompositionIds: [],
  recentHooks: [],
  recentCreativeModes: [],
  recentCreativeIdentityKeys: [],
  recentVisualNarrativeKeys: [],
};

const directives: CreativeDirectives = {
  mode: CREATIVE_MODES[0],
  hook: HOOK_ARCHETYPES[0],
  persona: VOICE_PERSONAS[0],
};

console.log("\nresolveVisualNarrative");

check("deterministic for same seed", () => {
  const a = resolveVisualNarrative({
    project: saasProject,
    identity: null,
    seed: "seed-a",
    series: emptySeries,
    funnelStage: "awareness",
  });
  const b = resolveVisualNarrative({
    project: saasProject,
    identity: null,
    seed: "seed-a",
    series: emptySeries,
    funnelStage: "awareness",
  });
  assert.equal(a.key, b.key);
  assert.equal(a.primary_meaning_carrier, b.primary_meaning_carrier);
});

check("motif pressure shifts away from laptop-heavy series", () => {
  const laptopHeavy: SeriesCreativeContext = {
    ...emptySeries,
    fingerprints: Array.from({ length: 6 }, (_, i) =>
      fingerprintFromPackageBrief({
        packageId: `p-${i}`,
        brief: {
          hook: "h",
          voiceover_text: "v",
          image_prompts: [
            "founder at laptop on desk in office home office typing",
          ],
        },
      }),
    ),
  };
  let objectLike = 0;
  for (let i = 0; i < 24; i++) {
    const plan = resolveVisualNarrative({
      project: saasProject,
      identity: null,
      seed: `pressure-${i}`,
      series: laptopHeavy,
      funnelStage: "awareness",
    });
    if (
      plan.primary_meaning_carrier === "object" ||
      plan.primary_meaning_carrier === "place" ||
      plan.primary_meaning_carrier === "process" ||
      plan.primary_meaning_carrier === "metaphor"
    ) {
      objectLike++;
    }
  }
  assert.ok(objectLike >= 12, `expected diversification bias, got ${objectLike}/24`);
});

check("education project hints differ from generic saas", () => {
  const edu = resolveVisualNarrative({
    project: eduProject,
    identity: null,
    seed: "edu-seed",
    series: emptySeries,
    funnelStage: "awareness",
  });
  assert.match(edu.product_world_hints.join(" "), /Education world/i);
});

console.log("\nprompt wiring");

check("generate prompt includes visual narrative block when provided", () => {
  const ci = planCreativeIdentityForPackage({
    project: saasProject,
    visualProfile: "MINIMAL",
    projectId: saasProject.id,
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "docs pain",
    angle: "mid sprint",
    series: emptySeries,
    requireVideo: true,
  });
  const vn = planVisualNarrativeForPackage({
    project: saasProject,
    identity: ci.identity,
    projectId: saasProject.id,
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "docs pain",
    angle: "mid sprint",
    series: emptySeries,
    funnelStage: "awareness",
    requireVideo: true,
  });
  const prompt = buildGenerateContentPackagePrompt({
    project: saasProject,
    funnelStage: "awareness",
    topic: "docs pain",
    angle: "mid sprint",
    platform: "tiktok",
    format: "short",
    availableAssets: [],
    requireVideo: true,
    directives,
    visualNarrativePromptBlock: vn.promptBlock,
  });
  assert.ok(prompt.includes(VISUAL_NARRATIVE_PROMPT_HEADER));
  assert.ok(prompt.includes("Primary meaning carrier"));
  assert.ok(prompt.indexOf(VISUAL_NARRATIVE_PROMPT_HEADER) < prompt.indexOf("VISUAL STYLE"));
});

check("extended motif detection includes whiteboard", () => {
  const m = motifsFromVisualText("planning on a whiteboard in the meeting room");
  assert.ok(m.includes("whiteboard"));
  assert.ok(m.includes("meeting"));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
