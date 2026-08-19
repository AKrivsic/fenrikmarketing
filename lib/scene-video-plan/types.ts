import type { TransitionType } from "@/lib/video-engine/storyboard";
import type { TransitionResolutionSource } from "@/lib/video-engine/clipTransition";

export type MotionPromptSource = "original" | "fallback";

/** Stable material for a future client_request_id / attempt idempotency key. */
export interface SceneVideoPlanIdempotencyMaterial {
  sceneId: string;
  sourceImageBucket: string | null;
  sourceImagePath: string | null;
  motionPrompt: string;
  provider: string;
  model: string;
  providerDurationSeconds: number;
  ratio: string;
}

export interface SceneVideoGenerationPlanItem {
  sceneId: string;
  /** 0-based order in the source storyboard / render spec. */
  sceneIndex: number;
  sourceImageBucket: string | null;
  sourceImagePath: string | null;
  motionPrompt: string;
  motionPromptSource: MotionPromptSource;
  /** Scene timeline duration from render spec / storyboard. */
  targetDurationSeconds: number;
  /**
   * Integer duration that would be sent to the provider when preparable
   * (ceil + Gen-4 clamp). For invalid durations this is a display placeholder
   * only — see diagnostics / preparable.
   */
  providerDurationSeconds: number;
  ratio: string;
  provider: string;
  model: string;
  /** Per-scene theoretical cost for this item's providerDurationSeconds. */
  estimatedCredits: number;
  estimatedCostUsd: number;
  transitionIn: TransitionType;
  transitionSource: TransitionResolutionSource;
  idempotencyMaterial: SceneVideoPlanIdempotencyMaterial;
  diagnostics: string[];
  /** False when the scene cannot safely be submitted for generation. */
  preparable: boolean;
}

export interface SceneVideoGenerationPlan {
  /** Always true for this Step 8 service — no writes / provider calls. */
  dryRun: true;
  /** All scenes in the source storyboard / render spec. */
  sceneCount: number;
  /** Scenes that pass readiness and can be priced as runnable. */
  preparableSceneCount: number;
  /** Scenes that fail readiness. */
  unpreparableSceneCount: number;
  /**
   * Runnable totals — only preparable scenes.
   * This is the amount that could actually be launched now.
   */
  totalProviderDurationSeconds: number;
  totalEstimatedCredits: number;
  totalEstimatedCostUsd: number;
  /**
   * Theoretical totals if every scene (including currently unpreparable)
   * were fixed and launched at its display provider duration. Must not be
   * confused with runnable totals above.
   */
  theoreticalTotalProviderDurationSeconds: number;
  theoreticalTotalEstimatedCredits: number;
  theoreticalTotalEstimatedCostUsd: number;
  fallbackMotionPromptCount: number;
  unpreparableSceneIds: string[];
  items: SceneVideoGenerationPlanItem[];
  defaults: {
    provider: string;
    model: string;
    ratio: string;
  };
}

export interface SceneVideoPlanSceneInput {
  id: string;
  image_prompt: string;
  duration_seconds: number;
  image_bucket?: string | null;
  image_path?: string | null;
  motion_prompt?: string | null;
  transition_in?: unknown;
  type?: string | null;
  /** Optional role / narration hint already present on some package scenes. */
  role?: string | null;
  narration_hint?: string | null;
}

export interface BuildSceneVideoGenerationPlanInput {
  scenes: SceneVideoPlanSceneInput[];
  /**
   * Dry-run only in Step 8. Must be true (default). False is rejected so
   * callers cannot accidentally enable paid create paths here.
   */
  dryRun?: boolean;
  provider?: string;
  model?: string;
  ratio?: string;
}
