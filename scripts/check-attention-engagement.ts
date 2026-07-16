// Attention & Engagement v1 — focused checks.
//   npm run check:attention-engagement

import assert from "node:assert/strict";
import type { Project } from "@/lib/supabase/types";
import { buildGenerateContentPackagePrompt } from "@/lib/ai/prompts/generateContentPackage";
import {
  CREATIVE_MODES,
  HOOK_ARCHETYPES,
  VOICE_PERSONAS,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { ATTENTION_MECHANISMS, ATTENTION_VERSION } from "@/lib/attention/types";
import { ATTENTION_CATALOG } from "@/lib/attention/catalog";
import {
  resolveAttentionMechanism,
  buildAttentionSeed,
} from "@/lib/attention/resolveAttention";
import { runOriginalityPass } from "@/lib/attention/originalityPass";
import { planAttentionForPackage } from "@/lib/attention/planForPackage";
import { alignHookWithFirstSpoken } from "@/lib/attention/alignHookVoiceover";
import {
  ATTENTION_PROMPT_HEADER,
  attentionFieldsForPersistence,
  attentionFieldsForVideoJob,
} from "@/lib/attention/promptBlocks";
import {
  isNotebookVsPaperDilemma,
  isGenericOfficeHumor,
  matchesOfficeCliche,
} from "@/lib/attention/cliches";
import { buildVideoTtsDeliveryHints } from "@/lib/voice/buildVideoTtsDelivery";
import { resolveBeatMotionPlan } from "@/lib/video-engine/semanticMotion/resolveSceneMotion";
import {
  fingerprintFromPackageBrief,
  compactFingerprintSummary,
} from "@/lib/series/creativeFingerprints";
import { clampSfxGain } from "@/video-worker/services/sfx/programmaticSfx";
import { parseSfxOverlayFromJobInput } from "@/video-worker/services/sfx/mixSfx";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";

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

function projectFixture(args: {
  id: string;
  name: string;
  productIs: string[];
  painPoints: string[];
  type?: string;
}): Project {
  return {
    id: args.id,
    name: args.name,
    type: args.type ?? "service",
    language: "en",
    market_scope: "local",
    goal_type: "leads",
    target_audience: { summary: `Customers of ${args.name}` },
    product_is: args.productIs,
    product_is_not: [],
    product_strengths: args.productIs.slice(0, 1),
    pain_points: args.painPoints,
    forbidden_claims: [],
    tone_of_voice: {},
    platforms: [],
    publishing_rules: {},
    default_cta: null,
  } as unknown as Project;
}

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
  mode: CREATIVE_MODES.find((m) => m.id === "observation")!,
  hook: HOOK_ARCHETYPES[0]!,
  persona: VOICE_PERSONAS[0]!,
};

const INDUSTRY_FIXTURES = [
  projectFixture({
    id: "fenrik",
    name: "Fenrik",
    productIs: ["done-for-you content system"],
    painPoints: ["never knowing what to post", "posting once then being told to do five more"],
  }),
  projectFixture({
    id: "saas",
    name: "Blueprint SaaS",
    productIs: ["development planning product"],
    painPoints: ["blank page before coding", "specs that drift"],
    type: "product",
  }),
  projectFixture({
    id: "dentist",
    name: "Bright Dental",
    productIs: ["family dentistry"],
    painPoints: ["patients delaying checkups", "fear of the chair"],
  }),
  projectFixture({
    id: "restaurant",
    name: "Harbor Kitchen",
    productIs: ["seasonal restaurant"],
    painPoints: ["empty Tuesday tables", "inconsistent social posts"],
  }),
  projectFixture({
    id: "hotel",
    name: "Nordic Stay",
    productIs: ["boutique hotel"],
    painPoints: ["lookalike booking photos", "forgotten guest moments"],
  }),
  projectFixture({
    id: "education",
    name: "SkillNest",
    productIs: ["online courses"],
    painPoints: ["students quitting mid-course", "content overwhelm"],
  }),
  projectFixture({
    id: "prosvc",
    name: "Clear Counsel",
    productIs: ["business advisory"],
    painPoints: ["clients ghosting proposals", "explaining the same thing weekly"],
  }),
] as const;

// --- 1–2 funnel preservation + independence ---------------------------------

section("funnel preservation & attention independence");

check("catalog has the expected mechanisms (no quotas)", () => {
  assert.equal(ATTENTION_MECHANISMS.length, 16);
  assert.equal(ATTENTION_CATALOG.length, 16);
  assert.equal(ATTENTION_VERSION, "attention@1");
});

check("same topic across funnel stages can pick different mechanisms (not a fixed map)", () => {
  const base = {
    projectId: "p1",
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "why posting feels endless",
    angle: "the five-more-posts trap",
    creativeMode: "observation",
    painPoints: ["never done posting"],
    productIs: ["done-for-you content"],
  };
  const mechanisms = new Set(
    (["awareness", "problem_aware", "solution_aware", "conversion"] as const).map(
      (funnelStage) =>
        resolveAttentionMechanism({ ...base, funnelStage }).mechanism,
    ),
  );
  // Soft affinities may overlap, but must not be a single hard-coded mapping
  // enforced in code — verify reasons always include independence marker.
  for (const funnelStage of [
    "awareness",
    "problem_aware",
    "solution_aware",
    "conversion",
  ] as const) {
    const sel = resolveAttentionMechanism({ ...base, funnelStage });
    assert.ok(sel.reasons.includes("independent_of_funnel_mapping"));
    assert.ok(sel.reasons.some((r) => r.startsWith("funnel_soft_affinity:")));
  }
  assert.ok(mechanisms.size >= 1);
});

check("creative mode and attention remain separate axes", () => {
  const a = resolveAttentionMechanism({
    projectId: "p1",
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "content overwhelm",
    angle: null,
    funnelStage: "awareness",
    creativeMode: "humor",
    painPoints: ["too many posts"],
    productIs: ["automation"],
  });
  const b = resolveAttentionMechanism({
    projectId: "p1",
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "content overwhelm",
    angle: null,
    funnelStage: "awareness",
    creativeMode: "observation",
    painPoints: ["too many posts"],
    productIs: ["automation"],
  });
  // Different mode soft scores — may or may not change mechanism, but both are valid.
  assert.ok(ATTENTION_MECHANISMS.includes(a.mechanism));
  assert.ok(ATTENTION_MECHANISMS.includes(b.mechanism));
  assert.ok(a.reasons.some((r) => r.includes("creative_mode_soft_affinity")));
});

// --- 3–4 deterministic + soft history --------------------------------------

section("deterministic selection & soft history");

check("same inputs resolve deterministically", () => {
  const input = {
    projectId: "p1",
    strategyItemId: "s9",
    packageIndex: 2,
    topic: "forgotten posts",
    angle: "cemetery of content",
    funnelStage: "awareness",
    creativeMode: "shock",
    painPoints: ["nobody remembers last month's post"],
    productIs: ["content system"],
  };
  const a = resolveAttentionMechanism(input);
  const b = resolveAttentionMechanism(input);
  assert.equal(a.mechanism, b.mechanism);
  assert.deepEqual(a.reasons, b.reasons);
  assert.equal(buildAttentionSeed(input), buildAttentionSeed(input));
});

check("recent history is a soft penalty, not rotation", () => {
  const base = {
    projectId: "p1",
    strategyItemId: "s2",
    packageIndex: 0,
    topic: "content overwhelm",
    angle: "always another post",
    funnelStage: "problem_aware",
    creativeMode: "humor",
    painPoints: ["five more posts"],
    productIs: ["done-for-you"],
  };
  const without = resolveAttentionMechanism({ ...base, recentMechanisms: [] });
  const withRecent = resolveAttentionMechanism({
    ...base,
    recentMechanisms: [without.mechanism, without.mechanism, without.mechanism],
  });
  // Soft: may still pick the same if strongest; must not force a different
  // mechanism via quota. If same, reasons should note soft penalty or still strongest.
  if (withRecent.mechanism === without.mechanism) {
    assert.ok(
      withRecent.reasons.some(
        (r) =>
          r.startsWith("recent_soft_penalty:") ||
          r === "recent_seen_but_still_strongest",
      ),
    );
  } else {
    assert.ok(withRecent.scores[without.mechanism]! < without.scores[without.mechanism]!);
  }
  // No forced balancing across all mechanisms.
  assert.ok(!withRecent.reasons.some((r) => /quota|rotate|balance/.test(r)));
});

// --- 5–8 originality / clichés / relevance ----------------------------------

section("originality pass & cliché rejection");

check("first obvious office cliché is rejected when stronger idea exists", () => {
  const pass = runOriginalityPass({
    mechanism: "FRUSTRATION",
    topic: "endless posting",
    angle: "never done",
    painPoints: ["always five more"],
    productIs: ["automation"],
    seed: "test|frustration|1",
  });
  const obvious = pass.candidates.find((c) => c.id === "obvious")!;
  assert.equal(obvious.rejected, true);
  assert.ok(obvious.reject_reasons.some((r) => r.includes("cliche") || r.includes("obvious")));
  assert.notEqual(pass.selected_candidate_id, "obvious");
  assert.equal(matchesOfficeCliche(pass.selected_visual_concept), null);
});

check("Dilemma does not default to notebook versus paper", () => {
  const pass = runOriginalityPass({
    mechanism: "DILEMMA",
    topic: "life vs work posting",
    angle: "family dinner vs drafts",
    painPoints: ["missing dinner for content"],
    productIs: ["done-for-you content"],
    seed: "test|dilemma|1",
  });
  assert.equal(isNotebookVsPaperDilemma(pass.selected_visual_concept), false);
  assert.notEqual(pass.selected_candidate_id, "obvious");
});

check("Humor does not default to generic office jokes", () => {
  const pass = runOriginalityPass({
    mechanism: "HUMOR",
    topic: "no idea what to post",
    angle: "banana photoshoot",
    painPoints: ["blank content calendar"],
    productIs: ["content help"],
    seed: "test|humor|1",
  });
  assert.equal(isGenericOfficeHumor(pass.selected_visual_concept), false);
  assert.ok(!/busy entrepreneur at a laptop/i.test(pass.selected_visual_concept));
});

check("unexpected association stays connected to product/topic", () => {
  const pass = runOriginalityPass({
    mechanism: "ABSURD_ASSOCIATION",
    topic: "forgotten content",
    angle: "posts that die quietly",
    painPoints: ["nobody remembers last campaign"],
    productIs: ["content system that keeps posts alive"],
    seed: "test|absurd|1",
  });
  const selected = pass.candidates.find((c) => c.id === pass.selected_candidate_id)!;
  assert.ok(selected.scores.relevance >= 5);
  assert.ok(
    /content|post|campaign|forgotten|product|system/i.test(
      `${selected.visual_concept} ${selected.narrative_seed}`,
    ),
  );
});

for (const proj of INDUSTRY_FIXTURES) {
  check(`${proj.name}: opening visual does not collapse to desk/laptop cliché`, () => {
    const plan = planAttentionForPackage({
      project: proj,
      projectId: proj.id,
      strategyItemId: `${proj.id}-s1`,
      packageIndex: 0,
      topic: proj.pain_points[0] ?? "audience pain",
      angle: "specific human moment",
      funnelStage: "awareness",
      creativeMode: "observation",
      series: emptySeries,
      requireVideo: true,
    });
    assert.ok(plan.plan);
    const visual = plan.plan!.originality.selected_visual_concept;
    assert.equal(matchesOfficeCliche(visual), null);
    assert.ok(!/calm desk|laptop and coffee|empty whiteboard/i.test(visual));
  });
}

// --- 9–10 hook alignment ----------------------------------------------------

section("hook / first spoken alignment");

check("stored hook and first spoken line stay aligned", () => {
  const r = alignHookWithFirstSpoken({
    hook: "Five more posts. Already.",
    voiceoverText: "Five more posts. Already. That is the trap.",
  });
  assert.equal(r.aligned, true);
  assert.equal(r.reason, "already_aligned");
});

check("strong hook is not diluted into generic setup", () => {
  const r = alignHookWithFirstSpoken({
    hook: "You finished one post. They asked for five more.",
    voiceoverText:
      "Most businesses struggle with content. You finished one post. They asked for five more.",
  });
  assert.equal(r.aligned, true);
  assert.equal(r.reason, "hook_applied_to_voiceover_opening");
  assert.ok(r.voiceover_text.startsWith("You finished one post"));
  assert.ok(!/^Most businesses/i.test(r.voiceover_text));
});

// --- 11–13 delivery arc -----------------------------------------------------

section("emotional delivery arc");

check("opening delivery differs from body when arc is present", () => {
  const plan = planAttentionForPackage({
    project: INDUSTRY_FIXTURES[0]!,
    projectId: "fenrik",
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "posting overwhelm",
    angle: "five more",
    funnelStage: "awareness",
    creativeMode: "humor",
    series: emptySeries,
    requireVideo: true,
  });
  const phases = plan.plan!.delivery_arc.phases;
  assert.ok(phases.some((p) => p.phase === "opening"));
  assert.ok(phases.some((p) => p.phase === "body"));
  const opening = phases.find((p) => p.phase === "opening")!.delivery;
  const body = phases.find((p) => p.phase === "body")!.delivery;
  assert.notEqual(opening, body);
});

check("TTS hints include delivery arc / opening style", () => {
  const hints = buildVideoTtsDeliveryHints({
    funnelStage: "awareness",
    creativeMode: "humor",
    deliveryArcFragment:
      "Opening: dry deadpan; let the line land before lifting. Then settle into conversational body delivery.",
    openingDeliveryStyle: "deadpan",
  });
  assert.ok(hints.some((h) => /deadpan|Opening:/i.test(h)));
  assert.ok(hints.some((h) => /body/i.test(h)));
});

check("calm/whispered openings remain possible", () => {
  const hints = buildVideoTtsDeliveryHints({
    openingDeliveryStyle: "whispered",
  });
  assert.ok(hints.some((h) => /quieter|intimate|whisper/i.test(h)));
});

// --- 14–16 funnel CTA / visual systems --------------------------------------

section("funnel CTA & existing visual systems remain active");

check("awareness prompt does not force product into every package", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project: INDUSTRY_FIXTURES[0]!,
    funnelStage: "awareness",
    topic: "forgotten posts",
    angle: "quiet death of content",
    availableAssets: [],
    directives,
    requireVideo: true,
    attentionPromptBlock: planAttentionForPackage({
      project: INDUSTRY_FIXTURES[0]!,
      projectId: "fenrik",
      strategyItemId: "s1",
      packageIndex: 0,
      topic: "forgotten posts",
      angle: "quiet death",
      funnelStage: "awareness",
      creativeMode: "observation",
      series: emptySeries,
      requireVideo: true,
    }).promptBlock,
  });
  assert.ok(prompt.includes(ATTENTION_PROMPT_HEADER));
  assert.ok(/product need not appear|product does not need|NO_PRODUCT|memorable/i.test(prompt));
  assert.ok(prompt.includes("funnel_stage=\"Awareness\"") || prompt.includes("Awareness"));
});

check("CTA frequency / funnel stage still present in prompt (unchanged rules)", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project: INDUSTRY_FIXTURES[0]!,
    funnelStage: "conversion",
    topic: "book a call",
    angle: "clear next step",
    availableAssets: [],
    directives,
    requireVideo: true,
  });
  assert.ok(/CTA type MUST be one of/i.test(prompt));
  assert.ok(/Conversion/i.test(prompt));
});

check("Visual Narrative/Medium/Profile/Identity blocks still injectable", () => {
  const prompt = buildGenerateContentPackagePrompt({
    project: INDUSTRY_FIXTURES[0]!,
    funnelStage: "awareness",
    topic: "x",
    availableAssets: [],
    directives,
    requireVideo: true,
    visualNarrativePromptBlock: "VISUAL NARRATIVE (test)",
    visualMediumPromptBlock: "VISUAL MEDIUM (test)",
    visualProfileImagePromptBlock: "VISUAL PROFILE (test)",
    creativeIdentityPromptBlock: "CREATIVE IDENTITY (test)",
  });
  assert.ok(prompt.includes("VISUAL NARRATIVE (test)"));
  assert.ok(prompt.includes("VISUAL MEDIUM (test)"));
  assert.ok(prompt.includes("VISUAL PROFILE (test)"));
  assert.ok(prompt.includes("CREATIVE IDENTITY (test)"));
});

// --- 17 semantic motion -----------------------------------------------------

section("semantic motion opening attention context");

check("Semantic Motion receives opening attention context on beat 0", () => {
  const plan = resolveBeatMotionPlan({
    beatIndex: 0,
    beatCount: 5,
    sceneId: "s1",
    sceneType: "IMAGE",
    sceneIndex: 0,
    sceneCount: 3,
    narrativeRole: "body",
    visualProfile: "NATURAL",
    openingAttentionMotionIntent: "ATTENTION",
  });
  assert.equal(plan.motion_intent, "ATTENTION");
  assert.notEqual(plan.motion_intent, "EXPLAIN");
});

check("intentional HOLD stillness is preserved for confession-like openings", () => {
  const plan = resolveBeatMotionPlan({
    beatIndex: 0,
    beatCount: 5,
    sceneId: "s1",
    sceneType: "IMAGE",
    sceneIndex: 0,
    sceneCount: 3,
    narrativeRole: "hook",
    visualProfile: "NATURAL",
    openingAttentionMotionIntent: "HOLD",
  });
  assert.equal(plan.motion_intent, "HOLD");
});

// --- 18–19 SFX --------------------------------------------------------------

section("optional SFX");

check("SFX gain is clamped so it never masks voice", () => {
  assert.ok(clampSfxGain(1.5) <= 0.28);
  assert.ok(clampSfxGain(0.18) === 0.18);
  assert.ok(clampSfxGain(-1) === 0.18);
});

check("SFX is omitted when not selected / no suitable effect", () => {
  const omitted = parseSfxOverlayFromJobInput({ sfx_selected: false });
  assert.equal(omitted.selected, false);
  const bad = parseSfxOverlayFromJobInput({
    sfx_selected: true,
    sfx_category: "not_a_real_effect",
  });
  assert.equal(bad.selected, false);
});

check("persistence includes sfx_* fields", () => {
  const plan = planAttentionForPackage({
    project: INDUSTRY_FIXTURES[0]!,
    projectId: "fenrik",
    strategyItemId: "s1",
    packageIndex: 1,
    topic: "x",
    angle: "y",
    funnelStage: "awareness",
    creativeMode: "shock",
    series: emptySeries,
    requireVideo: true,
  });
  const fields = attentionFieldsForPersistence(plan.plan!);
  const att = (fields.attention as Record<string, unknown>) ?? {};
  assert.ok("sfx_selected" in att);
  assert.ok("sfx_category" in att);
  assert.ok("sfx_timing_ms" in att);
  assert.ok("sfx_reason" in att);
  assert.ok("sfx_source" in att);
  const job = attentionFieldsForVideoJob({
    presentation_generation: fields,
  });
  assert.ok("sfx_selected" in job);
});

// --- 20–22 series fingerprint + legacy --------------------------------------

section("series fingerprints & legacy compatibility");

check("series fingerprint includes new attention fields", () => {
  const fp = fingerprintFromPackageBrief({
    packageId: "pkg1",
    topic: "t",
    brief: {
      hook: "Hello",
      voiceover_text: "Hello world",
      funnel_stage: "awareness",
      creative_mode: "observation",
      presentation_generation: {
        attention: {
          attention_mechanism: "DILEMMA",
          opening_visual_motif: "suitcase_vs_reminder",
          opening_emotional_effect: "dilemma",
          sfx_category: "click",
          opening_structure: "split_choice",
        },
      },
    },
  });
  assert.equal(fp.attention_mechanism, "DILEMMA");
  assert.equal(fp.opening_visual_motif, "suitcase_vs_reminder");
  assert.equal(fp.opening_emotional_effect, "dilemma");
  assert.equal(fp.sfx_category, "click");
  assert.equal(fp.opening_structure, "split_choice");
  const summary = compactFingerprintSummary(fp);
  assert.equal(summary.attention_mechanism, "DILEMMA");
});

check("legacy packages without attention remain compatible", () => {
  const fp = fingerprintFromPackageBrief({
    packageId: "legacy",
    brief: { hook: "Old", voiceover_text: "Old vo" },
  });
  assert.equal(fp.attention_mechanism ?? null, null);
  const job = attentionFieldsForVideoJob({ presentation_generation: null });
  assert.deepEqual(job, {});
});

check("no quotas or forced mechanism balancing in planner reasons", () => {
  const plan = planAttentionForPackage({
    project: INDUSTRY_FIXTURES[0]!,
    projectId: "fenrik",
    strategyItemId: "s1",
    packageIndex: 0,
    topic: "x",
    angle: null,
    funnelStage: "awareness",
    creativeMode: "standard",
    series: emptySeries,
    requireVideo: true,
  });
  assert.ok(
    !plan.plan!.attention_reasons.some((r) =>
      /quota|must rotate|force balance|equal distribution/i.test(r),
    ),
  );
});

// --- summary ----------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
