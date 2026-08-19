/**
 * Scene video generation plan (Step 8 / 8B) — offline dry-run tests.
 * npm run check:scene-video-plan
 *
 * No Runway / paid / network calls. No DB writes.
 */

import assert from "node:assert/strict";
import {
  sceneSchema,
  persistedSceneSchema,
} from "@/lib/video-engine/schemas";
import { resolveClipSceneTransition } from "@/lib/video-engine/clipTransition";
import {
  visualScenePlanItemValidator,
  normalizeVisualScenePlan,
  type VisualSceneAi,
} from "@/lib/content-package/visualScenePlan";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import {
  buildFallbackMotionPrompt,
  buildSceneVideoGenerationPlan,
  resolveProviderDurationSeconds,
  SCENE_VIDEO_PLAN_DEFAULT_MODEL,
  SCENE_VIDEO_PLAN_DEFAULT_PROVIDER,
  SCENE_VIDEO_PLAN_DEFAULT_RATIO,
} from "@/lib/scene-video-plan";
import { RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16 } from "@/lib/ai/runway";
import { estimateRunwayTestCostUsd } from "@/lib/runway-test/constants";
import { buildContentPackageVisualScenesBlock } from "@/lib/content-pipeline/prompts/contentPackageVisualScenes";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

const baseOk = {
  image_prompt: "Owner at desk",
  image_bucket: "video-renders",
  image_path: "a/1.png",
  duration_seconds: 4,
};

console.log("check:scene-video-plan");

await check("legacy sceneSchema without motion_prompt still parses", () => {
  const parsed = sceneSchema.safeParse({
    id: "scene-1",
    image_prompt: "Owner at desk",
    duration_seconds: 4,
    image_bucket: "video-renders",
    image_path: "p/j/scene-1.png",
  });
  assert.equal(parsed.success, true);
});

await check("persistedSceneSchema accepts optional motion_prompt", () => {
  const parsed = persistedSceneSchema.safeParse({
    id: "scene-1",
    image_prompt: "Owner at desk",
    duration_seconds: 4,
    image_bucket: "video-renders",
    image_path: "p/j/scene-1.png",
    motion_prompt:
      "Owner types then reaches for a note; papers shift; slow push-in; identity stable.",
    transition_in: "fade",
  });
  assert.equal(parsed.success, true);
});

await check("old visual_scenes ai entry still validates", () => {
  const issues = visualScenePlanItemValidator(
    { source: "ai", image_prompt: "A calm office morning" },
    "$.visual_scenes[0]",
  );
  assert.deepEqual(issues, []);
});

await check("visual_scenes with motion_prompt validates", () => {
  const issues = visualScenePlanItemValidator(
    {
      source: "ai",
      image_prompt: "Owner at desk",
      motion_prompt: "Types briefly; camera push-in; keep face stable.",
    },
    "$.visual_scenes[0]",
  );
  assert.deepEqual(issues, []);
});

await check("normalizeVisualScenePlan preserves motion_prompt", () => {
  const pkg = {
    visual_scenes: [
      {
        source: "ai",
        image_prompt: "  Owner at desk  ",
        motion_prompt: "  Hands move to keyboard; soft push-in.  ",
      },
    ],
  } as ContentPackageOutput;
  normalizeVisualScenePlan(pkg);
  const scene = pkg.visual_scenes?.[0] as VisualSceneAi;
  assert.equal(scene.source, "ai");
  assert.equal(scene.image_prompt, "Owner at desk");
  assert.equal(scene.motion_prompt, "Hands move to keyboard; soft push-in.");
});

await check("prompt contract mentions motion_prompt", () => {
  const block = buildContentPackageVisualScenesBlock({ requireVideo: true });
  assert.match(block, /MOTION_PROMPT/);
  assert.match(block, /motion_prompt/);
  assert.match(block, /lip-sync/);
});

await check("all scenes included; original motion preferred", () => {
  const plan = buildSceneVideoGenerationPlan({
    dryRun: true,
    scenes: [
      {
        id: "scene-1",
        image_prompt: "Owner at desk",
        duration_seconds: 3.2,
        image_bucket: "video-renders",
        image_path: "a/1.png",
        motion_prompt: "Custom original motion for scene one.",
      },
      {
        id: "scene-2",
        image_prompt: "Agent on a phone call",
        duration_seconds: 4,
        image_bucket: "video-renders",
        image_path: "a/2.png",
      },
      {
        id: "scene-3",
        image_prompt: "Product framed on counter",
        duration_seconds: 5,
        image_bucket: "video-renders",
        image_path: "a/3.png",
        transition_in: "push",
        motion_prompt: "Hands rotate the product once; soft parallax; product look stable.",
      },
    ],
  });

  assert.equal(plan.dryRun, true);
  assert.equal(plan.sceneCount, 3);
  assert.equal(plan.preparableSceneCount, 3);
  assert.equal(plan.unpreparableSceneCount, 0);
  assert.equal(plan.items.length, 3);
  assert.equal(plan.items[0]!.motionPromptSource, "original");
  assert.equal(plan.items[0]!.motionPrompt, "Custom original motion for scene one.");
  assert.equal(plan.items[1]!.motionPromptSource, "fallback");
  assert.ok(plan.items[1]!.diagnostics.includes("motion_prompt_fallback"));
  assert.equal(plan.items[2]!.motionPromptSource, "original");
  assert.equal(plan.fallbackMotionPromptCount, 1);
  assert.equal(plan.defaults.provider, SCENE_VIDEO_PLAN_DEFAULT_PROVIDER);
  assert.equal(plan.defaults.model, SCENE_VIDEO_PLAN_DEFAULT_MODEL);
  assert.equal(plan.defaults.ratio, SCENE_VIDEO_PLAN_DEFAULT_RATIO);
  assert.equal(plan.unpreparableSceneIds.length, 0);
});

await check("fallback is deterministic and clean", () => {
  const input = {
    imagePrompt: "Owner at desk answering emails in warm office light",
    sceneIndex: 0,
    durationSeconds: 4,
    hasPreviousScene: true,
    hasNextScene: true,
  };
  const a = buildFallbackMotionPrompt(input);
  const b = buildFallbackMotionPrompt(input);
  assert.equal(a, b);
  assert.ok(a.length <= RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16);
  assert.match(a, /Keep stable/);
  assert.match(a, /lip-sync/);
  assert.doesNotMatch(a, /scene-1|Scene id/i);
  assert.doesNotMatch(a, /prior=|next=/i);
  assert.doesNotMatch(a, /Agent on a phone|Product framed/i);
});

await check("missing image → unpreparable diagnostic", () => {
  const plan = buildSceneVideoGenerationPlan({
    scenes: [
      {
        id: "scene-1",
        image_prompt: "Still without storage",
        duration_seconds: 4,
      },
    ],
  });
  assert.equal(plan.items[0]!.preparable, false);
  assert.ok(plan.items[0]!.diagnostics.includes("missing_source_image"));
  assert.deepEqual(plan.unpreparableSceneIds, ["scene-1"]);
  assert.equal(plan.preparableSceneCount, 0);
  assert.equal(plan.totalEstimatedCredits, 0);
  assert.equal(plan.theoreticalTotalEstimatedCredits, plan.items[0]!.estimatedCredits);
});

await check("duration ceil + clamp", () => {
  assert.equal(resolveProviderDurationSeconds(3.2).providerDurationSeconds, 4);
  assert.equal(resolveProviderDurationSeconds(3.2).valid, true);
  assert.equal(resolveProviderDurationSeconds(1).providerDurationSeconds, 2);
  assert.equal(resolveProviderDurationSeconds(15).providerDurationSeconds, 10);
  const plan = buildSceneVideoGenerationPlan({
    scenes: [
      {
        id: "s1",
        image_prompt: "x",
        duration_seconds: 3.2,
        image_bucket: "b",
        image_path: "p",
      },
    ],
  });
  assert.equal(plan.items[0]!.targetDurationSeconds, 3.2);
  assert.equal(plan.items[0]!.providerDurationSeconds, 4);
  assert.equal(plan.items[0]!.preparable, true);
  const cost = estimateRunwayTestCostUsd(4);
  assert.equal(plan.items[0]!.estimatedCredits, cost.credits);
  assert.equal(plan.items[0]!.estimatedCostUsd, cost.usd);
  assert.equal(plan.totalEstimatedCredits, cost.credits);
});

await check("8B invalid durations are not preparable", () => {
  for (const duration of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
    const plan = buildSceneVideoGenerationPlan({
      scenes: [
        {
          id: `bad-${String(duration)}`,
          ...baseOk,
          duration_seconds: duration,
        },
      ],
    });
    const item = plan.items[0]!;
    assert.equal(item.preparable, false, `duration=${duration}`);
    assert.ok(item.diagnostics.includes("invalid_target_duration"));
    assert.ok(item.diagnostics.includes("unpreparable"));
    assert.equal(item.providerDurationSeconds, 2);
    assert.equal(plan.totalEstimatedCredits, 0);
    assert.equal(plan.preparableSceneCount, 0);
    assert.ok(plan.theoreticalTotalEstimatedCredits > 0);
  }
  assert.equal(resolveProviderDurationSeconds(0).valid, false);
  assert.equal(resolveProviderDurationSeconds(-1).valid, false);
  assert.equal(resolveProviderDurationSeconds(Number.NaN).valid, false);
  assert.equal(
    resolveProviderDurationSeconds(Number.POSITIVE_INFINITY).valid,
    false,
  );
});

await check("8B unknown provider / model rejected", () => {
  assert.throws(
    () =>
      buildSceneVideoGenerationPlan({
        provider: "kling",
        scenes: [{ id: "s1", ...baseOk }],
      }),
    /scene_video_plan_provider_unsupported/,
  );
  assert.throws(
    () =>
      buildSceneVideoGenerationPlan({
        model: "gen4.5",
        scenes: [{ id: "s1", ...baseOk }],
      }),
    /scene_video_plan_model_unsupported/,
  );
});

await check("8B unpreparable scenes excluded from runnable price", () => {
  const plan = buildSceneVideoGenerationPlan({
    scenes: [
      { id: "ok", ...baseOk, duration_seconds: 4 },
      {
        id: "bad",
        ...baseOk,
        image_path: "a/2.png",
        duration_seconds: 0,
      },
    ],
  });
  assert.equal(plan.sceneCount, 2);
  assert.equal(plan.preparableSceneCount, 1);
  assert.equal(plan.unpreparableSceneCount, 1);
  assert.deepEqual(plan.unpreparableSceneIds, ["bad"]);
  const okCost = estimateRunwayTestCostUsd(4);
  assert.equal(plan.totalEstimatedCredits, okCost.credits);
  assert.equal(plan.totalEstimatedCostUsd, okCost.usd);
  assert.equal(plan.totalProviderDurationSeconds, 4);
  assert.ok(plan.theoreticalTotalEstimatedCredits > plan.totalEstimatedCredits);
  assert.ok(
    plan.theoreticalTotalProviderDurationSeconds >
      plan.totalProviderDurationSeconds,
  );
});

await check("8B overlong original motion_prompt is not silent fallback", () => {
  const tooLong = "x".repeat(RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16 + 5);
  const plan = buildSceneVideoGenerationPlan({
    scenes: [
      {
        id: "s1",
        ...baseOk,
        motion_prompt: tooLong,
      },
    ],
  });
  assert.equal(plan.items[0]!.motionPromptSource, "original");
  assert.equal(plan.items[0]!.preparable, false);
  assert.ok(plan.items[0]!.diagnostics.includes("motion_prompt_too_long"));
  assert.ok(!plan.items[0]!.diagnostics.includes("motion_prompt_fallback"));
  assert.equal(plan.items[0]!.motionPrompt, tooLong);
  assert.equal(plan.totalEstimatedCredits, 0);
});

await check("8B empty original still uses fallback; missing uses fallback", () => {
  const emptyPlan = buildSceneVideoGenerationPlan({
    scenes: [{ id: "empty", ...baseOk, motion_prompt: "   " }],
  });
  assert.equal(emptyPlan.items[0]!.motionPromptSource, "fallback");
  assert.equal(emptyPlan.items[0]!.preparable, true);
  assert.ok(emptyPlan.items[0]!.diagnostics.includes("motion_prompt_empty"));
  assert.ok(emptyPlan.items[0]!.diagnostics.includes("motion_prompt_fallback"));

  const missingPlan = buildSceneVideoGenerationPlan({
    scenes: [{ id: "missing", ...baseOk }],
  });
  assert.equal(missingPlan.items[0]!.motionPromptSource, "fallback");
  assert.equal(missingPlan.items[0]!.preparable, true);

  const badTypePlan = buildSceneVideoGenerationPlan({
    scenes: [
      {
        id: "badtype",
        ...baseOk,
        motion_prompt: 42 as unknown as string,
      },
    ],
  });
  assert.equal(badTypePlan.items[0]!.motionPromptSource, "original");
  assert.equal(badTypePlan.items[0]!.preparable, false);
  assert.ok(
    badTypePlan.items[0]!.diagnostics.includes("motion_prompt_invalid_type"),
  );
});

await check("8B fallback omits scene id and neighbor prompt text", () => {
  const plan = buildSceneVideoGenerationPlan({
    scenes: [
      {
        id: "scene-alpha-unique",
        image_prompt: "UNIQUE_PREV_STILL_PHRASE_XYZ",
        duration_seconds: 4,
        image_bucket: "b",
        image_path: "1.png",
      },
      {
        id: "scene-beta-unique",
        image_prompt: "CURRENT_STILL_PHRASE_ABC",
        duration_seconds: 4,
        image_bucket: "b",
        image_path: "2.png",
      },
      {
        id: "scene-gamma-unique",
        image_prompt: "UNIQUE_NEXT_STILL_PHRASE_UVW",
        duration_seconds: 4,
        image_bucket: "b",
        image_path: "3.png",
      },
    ],
  });
  const mid = plan.items[1]!.motionPrompt;
  assert.doesNotMatch(mid, /scene-beta-unique|scene-alpha|scene-gamma/i);
  assert.doesNotMatch(mid, /UNIQUE_PREV_STILL_PHRASE_XYZ/);
  assert.doesNotMatch(mid, /UNIQUE_NEXT_STILL_PHRASE_UVW/);
  assert.match(mid, /CURRENT_STILL_PHRASE_ABC|Still context/i);
});

await check("original transition preserved; missing marked fallback", () => {
  const plan = buildSceneVideoGenerationPlan({
    scenes: [
      {
        id: "s0",
        image_prompt: "a",
        duration_seconds: 4,
        image_bucket: "b",
        image_path: "p0",
        transition_in: "none",
      },
      {
        id: "s1",
        image_prompt: "b",
        duration_seconds: 4,
        image_bucket: "b",
        image_path: "p1",
        transition_in: "slide",
      },
      {
        id: "s2",
        image_prompt: "c",
        duration_seconds: 4,
        image_bucket: "b",
        image_path: "p2",
      },
    ],
  });
  assert.equal(plan.items[0]!.transitionSource, "original");
  assert.equal(plan.items[0]!.transitionIn, "none");
  assert.equal(plan.items[1]!.transitionSource, "original");
  assert.equal(plan.items[1]!.transitionIn, "slide");
  assert.equal(plan.items[2]!.transitionSource, "fallback");
  assert.ok(plan.items[2]!.diagnostics.includes("transition_fallback"));
  assert.equal(
    plan.items[2]!.transitionIn,
    resolveClipSceneTransition({}, 2).transition,
  );
});

await check("dry-run rejects paid flag; no provider env required", () => {
  assert.throws(
    () =>
      buildSceneVideoGenerationPlan({
        dryRun: false,
        scenes: [
          {
            id: "s1",
            image_prompt: "x",
            duration_seconds: 4,
            image_bucket: "b",
            image_path: "p",
          },
        ],
      }),
    /scene_video_plan_paid_path_disabled/,
  );
  const plan = buildSceneVideoGenerationPlan({
    scenes: [
      {
        id: "s1",
        image_prompt: "x",
        duration_seconds: 4,
        image_bucket: "b",
        image_path: "p",
      },
    ],
  });
  assert.equal(plan.dryRun, true);
  assert.ok(plan.items[0]!.idempotencyMaterial.sceneId === "s1");
  assert.equal(typeof plan.totalEstimatedCostUsd, "number");
});

await check("totals across all preparable scenes", () => {
  const plan = buildSceneVideoGenerationPlan({
    scenes: [
      {
        id: "a",
        image_prompt: "1",
        duration_seconds: 2,
        image_bucket: "b",
        image_path: "1",
      },
      {
        id: "b",
        image_prompt: "2",
        duration_seconds: 5,
        image_bucket: "b",
        image_path: "2",
      },
    ],
  });
  assert.equal(plan.totalProviderDurationSeconds, 7);
  assert.equal(plan.theoreticalTotalProviderDurationSeconds, 7);
  const expected =
    estimateRunwayTestCostUsd(2).credits + estimateRunwayTestCostUsd(5).credits;
  assert.equal(plan.totalEstimatedCredits, expected);
  assert.equal(plan.theoreticalTotalEstimatedCredits, expected);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
