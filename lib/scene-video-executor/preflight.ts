import { RUNWAY_GEN4_IMAGE_TO_VIDEO_RATIOS } from "@/lib/ai/runway";
import {
  SCENE_VIDEO_PLAN_SUPPORTED_MODELS,
  SCENE_VIDEO_PLAN_SUPPORTED_PROVIDERS,
  type SceneVideoGenerationPlan,
} from "@/lib/scene-video-plan";

export type SceneVideoPreflightFailure =
  | "plan_empty"
  | "unpreparable_scenes"
  | "preparable_count_mismatch"
  | "provider_unsupported"
  | "model_unsupported"
  | "ratio_mismatch"
  | "missing_source_image"
  | "duplicate_scene_id"
  | "budget_invalid"
  | "budget_exceeded";

export interface SceneVideoPreflightOk {
  ok: true;
}

export interface SceneVideoPreflightErr {
  ok: false;
  reason: SceneVideoPreflightFailure;
  detail?: string;
}

export type SceneVideoPreflightResult =
  | SceneVideoPreflightOk
  | SceneVideoPreflightErr;

export function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Structural preflight — no DB, no provider.
 * Cost vs budget for *remaining* scenes is applied later after reuse lookup.
 */
export function preflightSceneVideoPlan(
  plan: SceneVideoGenerationPlan,
  maxBudgetUsd: number,
): SceneVideoPreflightResult {
  if (!plan || !Array.isArray(plan.items) || plan.items.length === 0) {
    return { ok: false, reason: "plan_empty" };
  }
  if (plan.sceneCount < 1) {
    return { ok: false, reason: "plan_empty" };
  }
  if (plan.unpreparableSceneCount > 0 || plan.unpreparableSceneIds.length > 0) {
    return {
      ok: false,
      reason: "unpreparable_scenes",
      detail: plan.unpreparableSceneIds.join(","),
    };
  }
  if (plan.preparableSceneCount !== plan.sceneCount) {
    return { ok: false, reason: "preparable_count_mismatch" };
  }
  if (
    !plan.items.every((item) => item.preparable) ||
    plan.items.length !== plan.sceneCount
  ) {
    return { ok: false, reason: "unpreparable_scenes" };
  }

  const provider = plan.defaults.provider;
  const model = plan.defaults.model;
  const ratio = plan.defaults.ratio;
  if (
    !(SCENE_VIDEO_PLAN_SUPPORTED_PROVIDERS as readonly string[]).includes(
      provider,
    )
  ) {
    return { ok: false, reason: "provider_unsupported", detail: provider };
  }
  if (
    !(SCENE_VIDEO_PLAN_SUPPORTED_MODELS as readonly string[]).includes(model)
  ) {
    return { ok: false, reason: "model_unsupported", detail: model };
  }
  if (
    !(RUNWAY_GEN4_IMAGE_TO_VIDEO_RATIOS as readonly string[]).includes(ratio)
  ) {
    return { ok: false, reason: "ratio_mismatch", detail: ratio };
  }

  const ids = new Set<string>();
  for (const item of plan.items) {
    if (item.provider !== provider || item.model !== model) {
      return {
        ok: false,
        reason: item.provider !== provider
          ? "provider_unsupported"
          : "model_unsupported",
      };
    }
    if (item.ratio !== ratio) {
      return { ok: false, reason: "ratio_mismatch", detail: item.ratio };
    }
    if (!item.sourceImageBucket?.trim() || !item.sourceImagePath?.trim()) {
      return {
        ok: false,
        reason: "missing_source_image",
        detail: item.sceneId,
      };
    }
    if (ids.has(item.sceneId)) {
      return { ok: false, reason: "duplicate_scene_id", detail: item.sceneId };
    }
    ids.add(item.sceneId);
  }

  if (!isFinitePositiveNumber(maxBudgetUsd)) {
    return { ok: false, reason: "budget_invalid" };
  }

  return { ok: true };
}
