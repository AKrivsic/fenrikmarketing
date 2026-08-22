/**
 * Creative Core v2 — Step 2 offline checks (no network / no paid providers).
 * Run: npm run check:content-creative-core-v2-step2
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyCreativeCoreSceneEdit,
  applyCreativeCoreVoiceoverEdit,
  assembleCreativeMemory,
  buildApprovedCreativeCoreSnapshot,
  buildManualReviewCreativeReviewFromCore,
  computeCreativeFingerprint,
  evaluateStrategyCandidateOriginality,
  shouldGenerateWithCreativeCoreV2,
  projectCreativeCoreToLegacyPackage,
  redistributeVoiceoverAcrossScenes,
  seedCreativeReviewScenesFromCore,
  voiceoverCoveredExactlyOnce,
  CREATIVE_CORE_V2_BRIEF_KEY,
  CREATIVE_CORE_V2_PROVENANCE_KEY,
  type ContentCreativeCoreV2,
} from "../lib/content-creative-core-v2";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

const root = process.cwd();
const NOW = "2026-08-22T00:00:00.000Z";

function daysAgoIso(days: number): string {
  return new Date(Date.parse(NOW) - days * 86400000).toISOString();
}

function videoCore(): ContentCreativeCoreV2 {
  const hook = "Three people, one phone, and still no usable product shot.";
  const voiceover = [
    hook,
    "The warehouse clock keeps moving while everyone waits for a better angle.",
    "Then one person clips a cheap stand to a box and shoots in twenty seconds.",
    "The crowd was never the camera — friction was.",
    "Simplify the setup so the next SKU ships with proof today.",
  ].join(" ");
  const scenes = [
    {
      scene_id: "s1",
      order: 1,
      voiceover_excerpt: hook,
      visual_event: "Three coworkers huddle around a phone.",
      environment: "warehouse aisle",
      subjects: "three staff",
      action: "They shift and block light.",
      motion_or_change: "Phone nearly drops.",
      emotion: "impatience",
      camera_intent: "wide handheld",
      sound_intent: "warehouse hum",
      screen_policy: "no_screen" as const,
      continuity_hints: "same aisle",
    },
    {
      scene_id: "s2",
      order: 2,
      voiceover_excerpt:
        "The warehouse clock keeps moving while everyone waits for a better angle.",
      visual_event: "Wall clock ticks above the group.",
      environment: "warehouse aisle",
      subjects: "same three staff",
      action: "One points at the clock.",
      motion_or_change: "Clock jumps; posture stiffens.",
      emotion: "tension",
      camera_intent: "cut to clock",
      sound_intent: "clock tick",
      screen_policy: "no_screen" as const,
      continuity_hints: "same light",
    },
    {
      scene_id: "s3",
      order: 3,
      voiceover_excerpt:
        "Then one person clips a cheap stand to a box and shoots in twenty seconds.",
      visual_event: "Clip-on stand attaches to a box.",
      environment: "pallet corner",
      subjects: "one staff",
      action: "Clips stand and taps shutter.",
      motion_or_change: "Stand locks; phone stabilizes.",
      emotion: "relief",
      camera_intent: "close on clip",
      sound_intent: "click",
      screen_policy: "no_screen" as const,
      continuity_hints: "same box",
    },
    {
      scene_id: "s4",
      order: 4,
      voiceover_excerpt: "The crowd was never the camera — friction was.",
      visual_event: "Empty aisle with one clear photo on the phone.",
      environment: "warehouse aisle",
      subjects: "phone screen content only as unreadable blur",
      action: "Team steps back.",
      motion_or_change: "Crowd dissolves; one clear frame remains.",
      emotion: "clarity",
      camera_intent: "pull back",
      sound_intent: "quiet room",
      screen_policy: "generic_unreadable_ui" as const,
      continuity_hints: "same aisle color",
    },
    {
      scene_id: "s5",
      order: 5,
      voiceover_excerpt:
        "Simplify the setup so the next SKU ships with proof today.",
      visual_event: "Labeled SKU box ready beside the stand.",
      environment: "packing table",
      subjects: "one staff",
      action: "Places next SKU under the stand.",
      motion_or_change: "Box slides into frame.",
      emotion: "momentum",
      camera_intent: "end card energy",
      sound_intent: "soft whoosh",
      screen_policy: "no_screen" as const,
      continuity_hints: "same stand",
    },
  ];
  return {
    contract_version: 2,
    strategy_item_id: "si-1",
    creative_fingerprint: computeCreativeFingerprint({
      topic: "warehouse phone shoot",
      pain_point: "No time to create content",
      hook,
      setting: "warehouse",
      conflict: "friction",
      reveal: "stand",
      payoff: "proof today",
    }),
    core_idea: "Friction, not people, blocked the product photo.",
    hook,
    voiceover,
    main_emotion: "impatience to clarity",
    conflict: "Too many hands, no stable shot",
    reveal_or_surprise: "A cheap stand ends the huddle",
    visible_change: "From crowd chaos to one stable shot",
    payoff: "Next SKU ships with proof",
    cta_intent: "Simplify the setup today",
    scenes,
  };
}

async function main(): Promise<void> {
  console.log("content-creative-core-v2 step 2\n");

  await check("1) explicit rejected content is strongly protected", () => {
    const memory = assembleCreativeMemory(
      [
        {
          packageId: "r1",
          createdAt: daysAgoIso(1),
          centralTopic: "Candidate finds a dead feed before interview",
          hook: "Candidate finds a dead feed before interview",
          painPoint: "Social accounts inactive",
          explicitRejected: true,
          rejectionReason: "creative reject",
        },
      ],
      { nowIso: NOW },
    );
    assert.equal(memory.records[0]?.rejected, true);
  });

  await check("2) technical cancelled is not automatic hard block", () => {
    const memory = assembleCreativeMemory(
      [
        {
          packageId: "c1",
          createdAt: daysAgoIso(1),
          centralTopic: "Warehouse shoot",
          hook: "Warehouse shoot",
          painPoint: "No time",
          runStatus: "cancelled",
        },
      ],
      { nowIso: NOW },
    );
    assert.equal(memory.records[0]?.source_status, "cancelled");
    assert.equal(memory.records[0]?.rejected, false);
  });

  await check("3) same pain + different execution can pass", () => {
    const memory = assembleCreativeMemory(
      [
        {
          packageId: "p1",
          createdAt: daysAgoIso(1),
          centralTopic: "Warehouse phone huddle",
          hook: "Three people one phone",
          painPoint: "Social inactive",
          setting: "warehouse",
          visual: "phone huddle",
          conflict: "friction",
          reveal: "stand",
          payoff: "fast shoot",
          packageStatus: "ready",
        },
      ],
      { nowIso: NOW },
    );
    const result = evaluateStrategyCandidateOriginality({
      candidate: {
        topic: "Cafe menus pile up while assets never arrive on a rainy terrace",
        angle: "Weekend rush without assets",
        pain_point: "Social inactive",
        creative_fingerprint: computeCreativeFingerprint({
          pain_point: "Social inactive",
          topic: "Cafe menus pile up while assets never arrive on a rainy terrace",
          angle: "Weekend rush without assets",
          setting: "rainy terrace",
          visual: "printed menus",
          conflict: "freelancer delay",
          reveal: "blank grid",
          payoff: "one story",
        }),
      },
      memory,
      projectPains: ["Social inactive", "No team", "No conversions"],
      packageCount: 1,
    });
    assert.equal(result.ok, true);
  });

  await check("4) same pain + same recent situation blocked", () => {
    const topic = "Warehouse phone huddle blocks the SKU shot";
    const memory = assembleCreativeMemory(
      [
        {
          packageId: "p1",
          createdAt: daysAgoIso(1),
          centralTopic: topic,
          angle: topic,
          hook: topic,
          painPoint: "Social inactive",
          setting: "warehouse",
          visual: "phone huddle",
          conflict: "friction",
          packageStatus: "ready",
        },
      ],
      { nowIso: NOW },
    );
    const result = evaluateStrategyCandidateOriginality({
      candidate: {
        topic,
        angle: topic,
        pain_point: "Social inactive",
        creative_fingerprint: computeCreativeFingerprint({
          pain_point: "Social inactive",
          topic,
          angle: topic,
          setting: "warehouse",
          visual: "phone huddle",
          conflict: "friction",
        }),
      },
      memory,
      projectPains: ["Social inactive", "No team"],
      packageCount: 1,
    });
    assert.equal(result.ok, false);
  });

  await check("5) new packages always use Creative Core v2", () => {
    assert.equal(shouldGenerateWithCreativeCoreV2(), true);
    const gen = readFileSync(
      join(root, "lib/ai/workflows/generateContentPackage.ts"),
      "utf8",
    );
    assert.match(gen, /shouldGenerateWithCreativeCoreV2\(\)/);
    assert.match(gen, /runCreativePipeline/);
    assert.match(gen, /const creative = useCreativeCoreV2\s*\n\s*\? await runCreativeCoreV2Pipeline/);
    assert.match(gen, /: await runCreativePipeline/);
  });

  await check("6) flag ON path creates one Creative Core (wired)", () => {
    const gen = readFileSync(
      join(root, "lib/ai/workflows/generateContentPackage.ts"),
      "utf8",
    );
    assert.match(gen, /runCreativeCoreV2Pipeline/);
    assert.match(gen, /CREATIVE_CORE_V2_BRIEF_KEY/);
    const pipe = readFileSync(
      join(root, "lib/content-creative-core-v2/runPipeline.ts"),
      "utf8",
    );
    assert.match(pipe, /createCreativeCore/);
    assert.doesNotMatch(pipe, /generateSceneCreativeIntents/);
  });

  await check("7) legacy snapshots are projection from Core", () => {
    const core = videoCore();
    const projected = projectCreativeCoreToLegacyPackage({
      core,
      packageKind: "video",
      funnelStage: "awareness",
      targetPlatforms: ["instagram", "tiktok"],
    });
    assert.equal(projected.ok, true);
    if (!projected.ok) return;
    assert.equal(
      (projected.package as unknown as Record<string, unknown>)[
        CREATIVE_CORE_V2_BRIEF_KEY
      ],
      core,
    );
    assert.ok(projected.provenance.source === "content_creative_core_v2");
    assert.equal(projected.package.hook, core.hook);
    assert.equal(projected.package.voiceover_text, core.voiceover);
    assert.equal(projected.package.visual_scenes?.length, core.scenes.length);
  });

  await check("8) old creative service must not overwrite Core (wiring)", () => {
    const gen = readFileSync(
      join(root, "lib/ai/workflows/generateContentPackage.ts"),
      "utf8",
    );
    assert.match(gen, /do not let T2V planner invent storyboard/);
    assert.match(gen, /coreFromPkg/);
    assert.match(gen, /buildManualReviewCreativeReviewFromCore/);
  });

  await check("9) VO edit keeps scene count, IDs, order, visuals", () => {
    const core = videoCore();
    const ids = core.scenes.map((s) => s.scene_id);
    const visuals = core.scenes.map((s) => s.visual_event);
    const newVo =
      "A new spoken line opens the piece. The clock still matters. A stand appears. Friction fades. Ship the next SKU with proof.";
    const applied = applyCreativeCoreVoiceoverEdit({
      core,
      newVoiceover: newVo,
    });
    assert.equal(applied.ok, true);
    if (!applied.ok) return;
    assert.equal(applied.core.scenes.length, 5);
    assert.deepEqual(
      applied.core.scenes.map((s) => s.scene_id),
      ids,
    );
    assert.deepEqual(
      applied.core.scenes.map((s) => s.order),
      [1, 2, 3, 4, 5],
    );
    assert.deepEqual(
      applied.core.scenes.map((s) => s.visual_event),
      visuals,
    );
    assert.equal(applied.core.hook, core.hook);
    assert.equal(applied.core.core_idea, core.core_idea);
  });

  await check("10) new VO is covered exactly once across scenes", () => {
    const core = videoCore();
    const newVo =
      "First sentence here. Second sentence keeps moving. Third reveals the stand. Fourth names the friction. Fifth closes with proof today.";
    const applied = applyCreativeCoreVoiceoverEdit({
      core,
      newVoiceover: newVo,
    });
    assert.equal(applied.ok, true);
    if (!applied.ok) return;
    assert.equal(
      voiceoverCoveredExactlyOnce(newVo, applied.core.scenes),
      true,
    );
  });

  await check("11) scene 3 edit does not change VO or other scenes", () => {
    const core = videoCore();
    const vo = core.voiceover;
    const applied = applyCreativeCoreSceneEdit({
      core,
      sceneId: "s3",
      patch: {
        visual_event: "A red clamp attaches to the crate instead.",
        motion_or_change: "Clamp snaps shut.",
        emotion: "focus",
        sound_intent: "metallic snap",
      },
    });
    assert.equal(applied.ok, true);
    if (!applied.ok) return;
    assert.equal(applied.core.voiceover, vo);
    assert.equal(applied.core.hook, core.hook);
    assert.equal(applied.core.scenes[0]?.visual_event, core.scenes[0]?.visual_event);
    assert.equal(applied.core.scenes[1]?.visual_event, core.scenes[1]?.visual_event);
    assert.equal(
      applied.core.scenes[2]?.visual_event,
      "A red clamp attaches to the crate instead.",
    );
    assert.equal(applied.core.scenes[3]?.visual_event, core.scenes[3]?.visual_event);
    assert.equal(applied.core.scenes[2]?.voiceover_excerpt, core.scenes[2]?.voiceover_excerpt);
  });

  await check("12) Approve locks snapshot without regenerating", () => {
    const core = videoCore();
    const snap = buildApprovedCreativeCoreSnapshot({
      core,
      productionVoiceoverEn: core.voiceover,
      voiceDirection: null,
      lockedAt: NOW,
    });
    assert.equal(snap.core.hook, core.hook);
    assert.equal(snap.production_voiceover_en, core.voiceover);
    assert.deepEqual(snap.creative_fingerprint, core.creative_fingerprint);
    const admin = readFileSync(
      join(root, "lib/api/creative-review-admin.ts"),
      "utf8",
    );
    assert.match(admin, /buildApprovedCreativeCoreSnapshot/);
    assert.match(admin, /Approve must not regenerate/);
  });

  await check("13) text-only has no fake scenes", () => {
    const core: ContentCreativeCoreV2 = {
      ...videoCore(),
      scenes: [],
    };
    const projected = projectCreativeCoreToLegacyPackage({
      core,
      packageKind: "text_only",
      funnelStage: "awareness",
      targetPlatforms: ["linkedin"],
    });
    assert.equal(projected.ok, true);
    if (!projected.ok) return;
    assert.equal(projected.package.visual_scenes?.length ?? 0, 0);
    const scenes = seedCreativeReviewScenesFromCore(core);
    assert.equal(scenes.length, 0);
  });

  await check("14) translating one part does not mutate other parts (seed)", async () => {
    const core = videoCore();
    // Seed without calling translation provider (editorLanguage en).
    const review = await buildManualReviewCreativeReviewFromCore({
      pkg: { voiceover_text: core.voiceover, hook: core.hook },
      core,
      editorLanguage: "en",
      sourceLanguage: "en",
    });
    assert.equal(review.voiceover.original_ai, core.voiceover);
    assert.equal(review.scenes.length, core.scenes.length);
    assert.equal(review.scenes[2]?.id, "s3");
  });

  await check("15) technical fields hidden in v2 Manual Review UI", () => {
    const ui = readFileSync(
      join(
        root,
        "components/creative-review/CreativeReviewPackagePanel/CreativeReviewPackagePanel.tsx",
      ),
      "utf8",
    );
    assert.match(ui, /isCoreV2/);
    assert.match(ui, /creativeCoreV2Active/);
    assert.match(ui, /!isCoreV2 \? \(/);
    assert.match(ui, /Technické detaily/);
  });

  await check("redistribute preserves exact coverage", () => {
    const core = videoCore();
    const vo =
      "Alpha sentence one. Beta sentence two. Gamma sentence three. Delta sentence four. Epsilon sentence five.";
    const result = redistributeVoiceoverAcrossScenes({
      voiceover: vo,
      scenes: core.scenes,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(voiceoverCoveredExactlyOnce(vo, result.scenes), true);
  });

  await check("provenance key stamped on projection", () => {
    const projected = projectCreativeCoreToLegacyPackage({
      core: videoCore(),
      packageKind: "video",
      funnelStage: "awareness",
      targetPlatforms: ["instagram"],
    });
    assert.equal(projected.ok, true);
    if (!projected.ok) return;
    assert.ok(
      (projected.package as unknown as Record<string, unknown>)[
        CREATIVE_CORE_V2_PROVENANCE_KEY
      ],
    );
  });

  await check("no paid provider calls in step2 modules", () => {
    const files = [
      "lib/content-creative-core-v2/runPipeline.ts",
      "lib/content-creative-core-v2/applyCoreEdits.ts",
      "lib/content-creative-core-v2/legacyProjection.ts",
      "lib/content-creative-core-v2/autoAccept.ts",
    ];
    for (const f of files) {
      const src = readFileSync(join(root, f), "utf8");
      assert.doesNotMatch(src, /elevenlabs/i);
      assert.doesNotMatch(src, /runway/i);
      assert.doesNotMatch(src, /ffmpeg/i);
      assert.doesNotMatch(src, /generateAndPersistPackageSocialImage/);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
