/**
 * Offline Creative Core v2 contract + validation checks (no network / no providers).
 * Run: npm run check:content-creative-core-v2-core
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CREATIVE_CORE_V2_BRIEF_KEY,
  CREATIVE_CORE_V2_CONTRACT_VERSION,
  CREATIVE_CORE_V2_MEMORY_CONFIG,
  assembleCreativeMemory,
  buildCreativeCoreMessages,
  computeCreativeFingerprint,
  fingerprintFromCreativeCore,
  parseCreativeCoreResponse,
  validateCreativeCore,
  type ContentCreativeCoreV2,
  type CreativeCoreRequestContext,
} from "../lib/content-creative-core-v2";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void): Promise<void> {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

const NOW = "2026-08-22T00:00:00.000Z";

function videoCoreFixture(): ContentCreativeCoreV2 {
  const hook =
    "Three people, one phone, and still no usable product shot.";
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
      voiceover_excerpt: "Three people, one phone, and still no usable product shot.",
      visual_event: "Three coworkers huddle around a phone aimed at a cardboard box on a pallet.",
      environment: "bright warehouse aisle",
      subjects: "three warehouse staff",
      action: "They shift positions and block each other's light.",
      motion_or_change: "Hands bump; the phone nearly drops.",
      emotion: "impatience",
      camera_intent: "wide handheld, slight sway",
      sound_intent: "warehouse hum",
      screen_policy: "no_screen" as const,
      continuity_hints: "same aisle, same box",
    },
    {
      scene_id: "s2",
      order: 2,
      voiceover_excerpt: "The warehouse clock keeps moving while everyone waits for a better angle.",
      visual_event: "A wall clock ticks above while the group freezes mid-argument.",
      environment: "warehouse aisle under fluorescent light",
      subjects: "same three staff",
      action: "One person points at the clock; others shrug.",
      motion_or_change: "Clock second hand jumps; group posture stiffens.",
      emotion: "rising tension",
      camera_intent: "cut to clock then back to faces",
      sound_intent: "clock tick",
      screen_policy: "no_screen" as const,
      continuity_hints: "same fluorescent color",
    },
    {
      scene_id: "s3",
      order: 3,
      voiceover_excerpt: "Then one person clips a cheap stand to a box and shoots in twenty seconds.",
      visual_event: "One worker clamps a mini stand onto the box and steps back.",
      environment: "same aisle",
      subjects: "one decisive worker",
      action: "Clamps stand, taps shutter once.",
      motion_or_change: "Stand locks; phone settles; shutter click.",
      emotion: "relief spark",
      camera_intent: "close on clamp then pull back",
      sound_intent: "clamp click",
      screen_policy: "no_screen" as const,
      continuity_hints: "same box as scene 1",
    },
    {
      scene_id: "s4",
      order: 4,
      voiceover_excerpt: "The crowd was never the camera — friction was.",
      visual_event: "The other two step aside as a clean product frame appears on the phone back.",
      environment: "aisle clearing",
      subjects: "worker with stand; others exiting frame",
      action: "They leave; frame stabilizes.",
      motion_or_change: "People exit left; shot steadies.",
      emotion: "clarity",
      camera_intent: "over-shoulder to phone back (generic unreadable UI)",
      sound_intent: "soft footsteps away",
      screen_policy: "generic_unreadable_ui" as const,
      continuity_hints: "stand remains",
    },
    {
      scene_id: "s5",
      order: 5,
      voiceover_excerpt: "Simplify the setup so the next SKU ships with proof today.",
      visual_event: "Labeled carton rolls onto a dolly beside the stand kit.",
      environment: "loading edge of aisle",
      subjects: "worker pushing dolly",
      action: "Carton joins dolly; stand kit packed beside it.",
      motion_or_change: "Dolly rolls forward into light.",
      emotion: "resolve",
      camera_intent: "tracking with dolly",
      sound_intent: "dolly wheels",
      screen_policy: "no_screen" as const,
      continuity_hints: "kit visible",
    },
  ];
  const partial = {
    core_idea: "Too many cooks kill the product photo; a simple stand wins.",
    hook,
    voiceover,
    main_emotion: "impatience to clarity",
    conflict: "A crowd around a phone still cannot get a usable shot.",
    reveal_or_surprise: "One cheap stand replaces three people.",
    visible_change: "From chaotic huddle to a rolling carton with proof.",
    payoff: "Ship the next SKU with a simple repeatable setup.",
    cta_intent: "Simplify your content setup today.",
    scenes,
  };
  return {
    contract_version: CREATIVE_CORE_V2_CONTRACT_VERSION,
    strategy_item_id: "strategy-1",
    creative_fingerprint: fingerprintFromCreativeCore({
      ...partial,
      pain_point: "No time or in-house team to create content consistently",
    }),
    ...partial,
  };
}

function textOnlyCoreFixture(): ContentCreativeCoreV2 {
  const hook = "Your best offer is buried under a busy week.";
  const voiceover = [
    hook,
    "The product is ready, but the feed is still improvising.",
    "One clear promise beats five half-finished drafts.",
    "Write the promise once, then ship it.",
  ].join(" ");
  const partial = {
    core_idea: "A clear promise beats a busy improvisation.",
    hook,
    voiceover,
    main_emotion: "focus",
    conflict: "Busy weeks hide the real offer.",
    reveal_or_surprise: "The draft pile is the blocker, not talent.",
    visible_change: "From scattered drafts to one shipped promise.",
    payoff: "Publish one clear promise this week.",
    cta_intent: "Ship one clear post today.",
    scenes: [],
  };
  return {
    contract_version: CREATIVE_CORE_V2_CONTRACT_VERSION,
    strategy_item_id: null,
    creative_fingerprint: fingerprintFromCreativeCore({
      ...partial,
      pain_point: "Brand looks smaller or less credible than the product really is",
    }),
    ...partial,
  };
}

function emptyMemory() {
  return assembleCreativeMemory([], { nowIso: NOW });
}

async function run(): Promise<void> {
  console.log("content-creative-core-v2 core contract\n");

  await check("video core validates with 4–5 scenes", () => {
    const core = videoCoreFixture();
    assert.ok(core.scenes.length >= 4 && core.scenes.length <= 5);
    const result = validateCreativeCore({
      core,
      packageKind: "video",
      memory: emptyMemory(),
      painPoint: "No time or in-house team to create content consistently",
    });
    assert.equal(result.ok, true, JSON.stringify(result.issues, null, 2));
  });

  await check("text-only core rejects invented video scenes", () => {
    const core = textOnlyCoreFixture();
    core.scenes = videoCoreFixture().scenes;
    const result = validateCreativeCore({
      core,
      packageKind: "text_only",
      memory: emptyMemory(),
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.path === "$.scenes"));
  });

  await check("text-only core with empty scenes passes", () => {
    const core = textOnlyCoreFixture();
    const result = validateCreativeCore({
      core,
      packageKind: "text_only",
      memory: emptyMemory(),
    });
    assert.equal(result.ok, true, JSON.stringify(result.issues));
  });

  await check("no platform texts or provider prompts allowed in core", () => {
    const core = videoCoreFixture();
    const result = validateCreativeCore({
      core,
      packageKind: "video",
      memory: emptyMemory(),
      raw: {
        ...core,
        tiktok_caption: "buy now",
        hashtags: ["#x"],
        runway_prompt: "cinematic...",
        platform_outputs: { tiktok: {} },
      },
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.path.includes("tiktok_caption")));
    assert.ok(result.issues.some((i) => i.path.includes("runway_prompt")));
  });

  await check("hook / VO / scenes are a single authority surface", () => {
    const core = videoCoreFixture();
    assert.ok(core.voiceover.startsWith(core.hook) || core.voiceover.includes(core.hook));
    for (const scene of core.scenes) {
      assert.ok(core.voiceover.includes(scene.voiceover_excerpt));
    }
    const messages = buildCreativeCoreMessages({
      productBrain: { product_name: "Fenrik", audience: "operators" },
      strategy: {
        topic: core.core_idea,
        angle: core.conflict,
        pain_point: "No time or in-house team to create content consistently",
        creative_fingerprint: computeCreativeFingerprint({
          topic: core.core_idea,
          angle: core.conflict,
          pain_point: "No time or in-house team to create content consistently",
        }),
      },
      memory: emptyMemory(),
      packageKind: "video",
      language: "en",
      platforms: ["tiktok", "instagram"],
    } satisfies CreativeCoreRequestContext);
    assert.match(messages.system, /sole creative author/i);
    assert.match(messages.system, /NO later Video Concept/i);
    assert.doesNotMatch(messages.user, /slow push-in as required/i);
    assert.match(messages.user, /Do not default to a passive reaction/i);
    assert.doesNotMatch(messages.user, /tiktok_caption/);
    assert.doesNotMatch(messages.user, /runway_prompt/);
  });

  await check("parseCreativeCoreResponse accepts wrapper JSON", () => {
    const core = videoCoreFixture();
    const parsed = parseCreativeCoreResponse({
      content_creative_core_v2: core,
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.core.contract_version, CREATIVE_CORE_V2_CONTRACT_VERSION);
      assert.equal(parsed.core.scenes.length, 5);
    }
  });

  await check("video with 2 scenes fails validation", () => {
    const core = videoCoreFixture();
    core.scenes = core.scenes.slice(0, 2);
    const result = validateCreativeCore({
      core,
      packageKind: "video",
      memory: emptyMemory(),
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.path === "$.scenes"));
  });

  await check("config exposes single attempt for Creative Core", () => {
    assert.equal(CREATIVE_CORE_V2_MEMORY_CONFIG.maxCreativeCoreAttempts, 1);
    assert.equal(CREATIVE_CORE_V2_MEMORY_CONFIG.maxStrategyAttempts, 2);
    assert.equal(CREATIVE_CORE_V2_BRIEF_KEY, "content_creative_core_v2");
  });

  await check("Step 4: generate always v2 for new; continue routes by snapshot", () => {
    const root = join(import.meta.dirname, "..");
    const generate = readFileSync(
      join(root, "lib/ai/workflows/generateContentPackage.ts"),
      "utf8",
    );
    const continueFile = readFileSync(
      join(root, "lib/ai/workflows/continueCreativeReviewGeneration.ts"),
      "utf8",
    );
    const pipeline = readFileSync(
      join(root, "lib/content-pipeline/runCreativePipeline.ts"),
      "utf8",
    );
    assert.match(generate, /content-creative-core-v2/);
    assert.match(generate, /shouldGenerateWithCreativeCoreV2/);
    assert.doesNotMatch(generate, /isContentCreativeCoreV2Enabled/);
    assert.match(continueFile, /content-creative-core-v2/);
    assert.match(continueFile, /briefUsesApprovedCreativeCoreV2/);
    assert.doesNotMatch(continueFile, /isContentCreativeCoreV2Enabled/);
    assert.doesNotMatch(pipeline, /content-creative-core-v2/);
  });

  await check("source tree has no live provider call in v2 module", () => {
    const root = join(import.meta.dirname, "..");
    for (const rel of [
      "lib/content-creative-core-v2/createCreativeCore.ts",
      "lib/content-creative-core-v2/validate.ts",
      "lib/content-creative-core-v2/memory.ts",
      "lib/content-creative-core-v2/strategyOriginality.ts",
    ]) {
      const src = readFileSync(join(root, rel), "utf8");
      assert.doesNotMatch(src, /getCopywritingProvider\(/);
      assert.doesNotMatch(src, /getStrategyProvider\(/);
      assert.doesNotMatch(src, /fetch\(/);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void run();
