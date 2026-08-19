import type { TransitionType } from "@/lib/video-engine/storyboard";
import {
  SCENE_TRANSITION_IN_VALUES,
  type SceneTransitionIn,
} from "@/lib/video-engine/schemas/sceneSchema";

export type TransitionResolutionSource = "original" | "fallback";

export function isSceneTransitionIn(value: unknown): value is SceneTransitionIn {
  return (
    typeof value === "string" &&
    (SCENE_TRANSITION_IN_VALUES as readonly string[]).includes(value)
  );
}

/**
 * Deterministic index-based transition when scene.transition_in is absent.
 * Matches the prior video-clip reel orchestrator pattern (not still Ken Burns).
 */
export function fallbackClipTransitionForIndex(index: number): TransitionType {
  if (index === 0) return "none";
  if (index % 3 === 1) return "fade";
  if (index % 3 === 2) return "slide";
  return "push";
}

/**
 * Prefer explicit `transition_in` on the scene; otherwise deterministic fallback.
 * Still-image production storyboard path is unchanged (does not call this).
 */
export function resolveClipSceneTransition(
  scene: { transition_in?: unknown },
  index: number,
): { transition: TransitionType; source: TransitionResolutionSource } {
  if (isSceneTransitionIn(scene.transition_in)) {
    return { transition: scene.transition_in, source: "original" };
  }
  return {
    transition: fallbackClipTransitionForIndex(index),
    source: "fallback",
  };
}
