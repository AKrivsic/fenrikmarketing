import type { SceneVideoAttemptView } from "@/lib/scene-video-attempts";
import { sceneAttemptMatchesExecutionItem } from "@/lib/text-to-video/runwayBudget";
import type { TextToVideoRunwayScenePlanItem } from "@/lib/text-to-video/runwayExecutionPlan";
import { TEXT_TO_VIDEO_RUNWAY_MODEL } from "@/lib/text-to-video/runwayProductionConfig";

export function isTextToVideoGenerationAttempt(
  view: SceneVideoAttemptView,
): boolean {
  return view.generationMode === "text_to_video";
}

/** T2V executor may only consider explicit text_to_video rows matching the plan item. */
export function selectTextToVideoAttemptForPlanItem(
  attempts: SceneVideoAttemptView[],
  item: TextToVideoRunwayScenePlanItem,
): SceneVideoAttemptView | null {
  const candidates = attempts.filter(
    (a) =>
      isTextToVideoGenerationAttempt(a) &&
      a.sceneId === item.sceneId &&
      a.provider === "runway" &&
      a.model === TEXT_TO_VIDEO_RUNWAY_MODEL &&
      sceneAttemptMatchesExecutionItem(a, item.requestFingerprint),
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return candidates[0] ?? null;
}

/** Non-matching attempts (including I2V) are ignored — never polled or reused as T2V. */
export function loadTextToVideoAttemptByScene(
  attempts: SceneVideoAttemptView[],
  item: TextToVideoRunwayScenePlanItem,
): SceneVideoAttemptView | null {
  return selectTextToVideoAttemptForPlanItem(attempts, item);
}
