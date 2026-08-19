import {
  RUNWAY_GEN4_DURATION_MAX,
  RUNWAY_GEN4_DURATION_MIN,
  RUNWAY_GEN4_IMAGE_TO_VIDEO_RATIOS,
  RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16,
} from "@/lib/ai/runway";
import {
  estimateRunwayTestCostUsd,
  RUNWAY_TEST_PRICING,
} from "@/lib/runway-test/constants";
import { resolveClipSceneTransition } from "@/lib/video-engine/clipTransition";
import { buildFallbackMotionPrompt } from "@/lib/scene-video-plan/fallbackMotionPrompt";
import type {
  BuildSceneVideoGenerationPlanInput,
  SceneVideoGenerationPlan,
  SceneVideoGenerationPlanItem,
  SceneVideoPlanSceneInput,
} from "@/lib/scene-video-plan/types";

export const SCENE_VIDEO_PLAN_DEFAULT_PROVIDER = "runway";
export const SCENE_VIDEO_PLAN_DEFAULT_MODEL = RUNWAY_TEST_PRICING.model; // gen4_turbo
export const SCENE_VIDEO_PLAN_DEFAULT_RATIO = "720:1280" as const;

/** Only combination with a real adapter + local cost model today. */
export const SCENE_VIDEO_PLAN_SUPPORTED_PROVIDERS = [
  SCENE_VIDEO_PLAN_DEFAULT_PROVIDER,
] as const;
export const SCENE_VIDEO_PLAN_SUPPORTED_MODELS = [
  SCENE_VIDEO_PLAN_DEFAULT_MODEL,
] as const;

/**
 * Ceil scene timeline duration to an integer, then clamp to Runway Gen-4
 * image-to-video duration range (2–10).
 *
 * Invalid durations still return a display placeholder (`RUNWAY_GEN4_DURATION_MIN`)
 * with `valid: false` — callers must not treat that as a preparable scene.
 */
export function resolveProviderDurationSeconds(
  targetDurationSeconds: number,
): {
  providerDurationSeconds: number;
  diagnostics: string[];
  valid: boolean;
} {
  const diagnostics: string[] = [];
  if (
    typeof targetDurationSeconds !== "number" ||
    !Number.isFinite(targetDurationSeconds) ||
    targetDurationSeconds <= 0
  ) {
    diagnostics.push("invalid_target_duration");
    return {
      providerDurationSeconds: RUNWAY_GEN4_DURATION_MIN,
      diagnostics,
      valid: false,
    };
  }
  const ceiled = Math.ceil(targetDurationSeconds);
  let provider = ceiled;
  if (provider < RUNWAY_GEN4_DURATION_MIN) {
    diagnostics.push(
      `duration_clamped_up:${provider}->${RUNWAY_GEN4_DURATION_MIN}`,
    );
    provider = RUNWAY_GEN4_DURATION_MIN;
  } else if (provider > RUNWAY_GEN4_DURATION_MAX) {
    diagnostics.push(
      `duration_clamped_down:${provider}->${RUNWAY_GEN4_DURATION_MAX}`,
    );
    provider = RUNWAY_GEN4_DURATION_MAX;
  }
  return { providerDurationSeconds: provider, diagnostics, valid: true };
}

type OriginalMotionResolution =
  | {
      kind: "missing";
      diagnostics: string[];
    }
  | {
      kind: "empty";
      diagnostics: string[];
    }
  | {
      kind: "ok";
      prompt: string;
      diagnostics: string[];
    }
  | {
      kind: "reject";
      /** Original text kept for diagnostics; not a silent fallback. */
      prompt: string;
      diagnostics: string[];
    };

function normalizeOriginalMotionPrompt(
  raw: unknown,
): OriginalMotionResolution {
  if (raw === undefined || raw === null) {
    return { kind: "missing", diagnostics: [] };
  }
  if (typeof raw !== "string") {
    return {
      kind: "reject",
      prompt: "",
      diagnostics: ["motion_prompt_invalid_type"],
    };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { kind: "empty", diagnostics: ["motion_prompt_empty"] };
  }
  if (trimmed.length > RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16) {
    return {
      kind: "reject",
      prompt: trimmed,
      diagnostics: ["motion_prompt_too_long"],
    };
  }
  return { kind: "ok", prompt: trimmed, diagnostics: [] };
}

function hasDurableStill(scene: SceneVideoPlanSceneInput): boolean {
  return (
    typeof scene.image_bucket === "string" &&
    scene.image_bucket.trim().length > 0 &&
    typeof scene.image_path === "string" &&
    scene.image_path.trim().length > 0
  );
}

function assertSupportedProviderModelRatio(args: {
  provider: string;
  model: string;
  ratio: string;
}): void {
  if (
    !(SCENE_VIDEO_PLAN_SUPPORTED_PROVIDERS as readonly string[]).includes(
      args.provider,
    )
  ) {
    throw new Error("scene_video_plan_provider_unsupported");
  }
  if (
    !(SCENE_VIDEO_PLAN_SUPPORTED_MODELS as readonly string[]).includes(
      args.model,
    )
  ) {
    throw new Error("scene_video_plan_model_unsupported");
  }
  if (
    !(RUNWAY_GEN4_IMAGE_TO_VIDEO_RATIOS as readonly string[]).includes(
      args.ratio,
    )
  ) {
    throw new Error("scene_video_plan_ratio_unsupported");
  }
}

/**
 * Pure dry-run planner: builds per-scene image-to-video intents for every
 * storyboard / render-spec scene. Never writes attempts, never calls Runway.
 */
export function buildSceneVideoGenerationPlan(
  input: BuildSceneVideoGenerationPlanInput,
): SceneVideoGenerationPlan {
  if (input.dryRun === false) {
    throw new Error("scene_video_plan_paid_path_disabled");
  }

  const provider = (input.provider ?? SCENE_VIDEO_PLAN_DEFAULT_PROVIDER).trim();
  const model = (input.model ?? SCENE_VIDEO_PLAN_DEFAULT_MODEL).trim();
  const ratio = (input.ratio ?? SCENE_VIDEO_PLAN_DEFAULT_RATIO).trim();
  assertSupportedProviderModelRatio({ provider, model, ratio });

  const scenes = input.scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error("scene_video_plan_scenes_required");
  }

  const items: SceneVideoGenerationPlanItem[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]!;
    const diagnostics: string[] = [];
    const sceneId =
      typeof scene.id === "string" && scene.id.trim() ? scene.id.trim() : "";
    if (!sceneId) {
      diagnostics.push("missing_scene_id");
    }

    const imagePrompt =
      typeof scene.image_prompt === "string" ? scene.image_prompt.trim() : "";
    if (!imagePrompt) {
      diagnostics.push("missing_image_prompt");
    }

    const bucket = hasDurableStill(scene)
      ? scene.image_bucket!.trim()
      : null;
    const path = hasDurableStill(scene) ? scene.image_path!.trim() : null;
    if (!bucket || !path) {
      diagnostics.push("missing_source_image");
    }

    const original = normalizeOriginalMotionPrompt(scene.motion_prompt);
    diagnostics.push(...original.diagnostics);

    let motionPrompt: string;
    let motionPromptSource: "original" | "fallback";
    let motionPromptOk = true;

    if (original.kind === "ok") {
      motionPrompt = original.prompt;
      motionPromptSource = "original";
    } else if (original.kind === "reject") {
      // Keep creative intent visible; never silent-fallback over a bad original.
      motionPrompt = original.prompt;
      motionPromptSource = "original";
      motionPromptOk = false;
    } else {
      // missing or empty → deterministic fallback allowed
      motionPrompt = buildFallbackMotionPrompt({
        imagePrompt: imagePrompt || "scene still",
        sceneIndex: i,
        durationSeconds: scene.duration_seconds,
        role: scene.role,
        narrationHint: scene.narration_hint,
        hasPreviousScene: Boolean(scenes[i - 1]),
        hasNextScene: Boolean(scenes[i + 1]),
      });
      motionPromptSource = "fallback";
      diagnostics.push("motion_prompt_fallback");
    }

    const durationResolved = resolveProviderDurationSeconds(
      scene.duration_seconds,
    );
    diagnostics.push(...durationResolved.diagnostics);

    const cost = estimateRunwayTestCostUsd(
      durationResolved.providerDurationSeconds,
    );

    const transition = resolveClipSceneTransition(scene, i);
    if (transition.source === "fallback") {
      diagnostics.push("transition_fallback");
    }

    const preparable =
      Boolean(sceneId) &&
      Boolean(imagePrompt) &&
      Boolean(bucket) &&
      Boolean(path) &&
      durationResolved.valid &&
      motionPromptOk &&
      motionPrompt.length > 0 &&
      motionPrompt.length <= RUNWAY_GEN4_MOTION_PROMPT_MAX_UTF16;

    if (!preparable && !diagnostics.includes("unpreparable")) {
      diagnostics.push("unpreparable");
    }

    items.push({
      sceneId: sceneId || `invalid-scene-${i}`,
      sceneIndex: i,
      sourceImageBucket: bucket,
      sourceImagePath: path,
      motionPrompt,
      motionPromptSource,
      targetDurationSeconds: scene.duration_seconds,
      providerDurationSeconds: durationResolved.providerDurationSeconds,
      ratio,
      provider,
      model,
      estimatedCredits: cost.credits,
      estimatedCostUsd: cost.usd,
      transitionIn: transition.transition,
      transitionSource: transition.source,
      idempotencyMaterial: {
        sceneId: sceneId || `invalid-scene-${i}`,
        sourceImageBucket: bucket,
        sourceImagePath: path,
        motionPrompt,
        provider,
        model,
        providerDurationSeconds: durationResolved.providerDurationSeconds,
        ratio,
      },
      diagnostics,
      preparable,
    });
  }

  const preparableItems = items.filter((i) => i.preparable);
  const unpreparableItems = items.filter((i) => !i.preparable);

  const sumDuration = (list: SceneVideoGenerationPlanItem[]) =>
    list.reduce((sum, item) => sum + item.providerDurationSeconds, 0);
  const sumCredits = (list: SceneVideoGenerationPlanItem[]) =>
    list.reduce((sum, item) => sum + item.estimatedCredits, 0);
  const sumUsd = (list: SceneVideoGenerationPlanItem[]) =>
    list.reduce((sum, item) => sum + item.estimatedCostUsd, 0);

  return {
    dryRun: true,
    sceneCount: items.length,
    preparableSceneCount: preparableItems.length,
    unpreparableSceneCount: unpreparableItems.length,
    totalProviderDurationSeconds: sumDuration(preparableItems),
    totalEstimatedCredits: sumCredits(preparableItems),
    totalEstimatedCostUsd: sumUsd(preparableItems),
    theoreticalTotalProviderDurationSeconds: sumDuration(items),
    theoreticalTotalEstimatedCredits: sumCredits(items),
    theoreticalTotalEstimatedCostUsd: sumUsd(items),
    fallbackMotionPromptCount: items.filter(
      (i) => i.motionPromptSource === "fallback",
    ).length,
    unpreparableSceneIds: unpreparableItems.map((i) => i.sceneId),
    items,
    defaults: { provider, model, ratio },
  };
}

/** Convenience: plan from a render spec / persisted render_spec.scenes array. */
export function buildSceneVideoGenerationPlanFromRenderScenes(
  scenes: SceneVideoPlanSceneInput[],
  options?: Omit<BuildSceneVideoGenerationPlanInput, "scenes">,
): SceneVideoGenerationPlan {
  return buildSceneVideoGenerationPlan({
    ...options,
    scenes,
    dryRun: options?.dryRun ?? true,
  });
}
