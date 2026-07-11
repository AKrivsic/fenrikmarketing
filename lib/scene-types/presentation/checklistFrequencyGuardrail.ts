import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { PackageVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import { isChecklistVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import { downgradeSceneToImage } from "@/lib/scene-types/presentation/downgradeToImage";
import { narrationForScene } from "@/lib/scene-types/presentation/downgradeToImage";
import type { VisualScene } from "@/lib/scene-types/visualScene";
import { visualSceneToPlanItem } from "@/lib/scene-types/normalizeVisualScene";
import { normalizeVisualSceneEntry } from "@/lib/scene-types/normalizeVisualScene";

export interface ChecklistFrequencyDecision {
  scene_id: string;
  rule: "checklist_video_limit_exceeded";
  reason: string;
}

const MAX_CHECKLIST_SCENES_PER_VIDEO = 1;

function entryToVisualScene(
  entry: PackageVisualSceneEntry,
  index: number,
): VisualScene | null {
  return normalizeVisualSceneEntry(entry as unknown, index);
}

function checklistDowngradeToImagePlanItem(args: {
  scene: VisualScene;
  voiceoverText: string;
  sceneIndex: number;
  sceneCount: number;
}): PackageVisualSceneEntry {
  const narration = narrationForScene({
    voiceoverText: args.voiceoverText,
    sceneIndex: args.sceneIndex,
    sceneCount: args.sceneCount,
    narrationHint: args.scene.narration_hint,
  });
  const downgraded = downgradeSceneToImage({
    scene: args.scene,
    narration,
  });
  const planItem = visualSceneToPlanItem(downgraded);
  if (planItem) return planItem;
  return {
    source: "ai",
    image_prompt:
      narration.trim().length > 0
        ? `Realistic vertical video still illustrating: ${narration.slice(0, 200)}`
        : "Realistic professional vertical video still for a short social video.",
  };
}

/**
 * MVP rollout safety: at most one CHECKLIST scene per video. Additional
 * CHECKLIST entries downgrade to IMAGE without failing the package.
 */
export function enforceChecklistVideoLimit(args: {
  visualScenes: PackageVisualSceneEntry[];
  voiceoverText: string;
}): {
  scenes: PackageVisualSceneEntry[];
  decisions: ChecklistFrequencyDecision[];
} {
  const scenes = [...args.visualScenes];
  const decisions: ChecklistFrequencyDecision[] = [];
  let keptChecklist = false;
  const count = scenes.length;

  for (let i = 0; i < scenes.length; i++) {
    const entry = scenes[i];
    if (!entry || !isChecklistVisualSceneEntry(entry)) continue;

    const visual = entryToVisualScene(entry, i);
    const sceneId = visual?.id ?? `scene-${i + 1}`;

    if (!keptChecklist) {
      keptChecklist = true;
      continue;
    }

    const fallbackVisual: VisualScene = visual ?? {
      id: sceneId,
      type: "CHECKLIST",
      payload: entry.payload,
    };

    scenes[i] = checklistDowngradeToImagePlanItem({
      scene: fallbackVisual,
      voiceoverText: args.voiceoverText,
      sceneIndex: i,
      sceneCount: count,
    });

    decisions.push({
      scene_id: sceneId,
      rule: "checklist_video_limit_exceeded",
      reason: "only one CHECKLIST scene allowed per video; downgraded to IMAGE",
    });
  }

  return { scenes, decisions };
}

export function countChecklistEntries(
  entries: readonly PackageVisualSceneEntry[],
): number {
  return entries.filter((e) => isChecklistVisualSceneEntry(e)).length;
}

export function applyChecklistFrequencyToPackage(
  pkg: ContentPackageOutput,
): ChecklistFrequencyDecision[] {
  if (!Array.isArray(pkg.visual_scenes) || pkg.visual_scenes.length === 0) {
    return [];
  }
  const { scenes, decisions } = enforceChecklistVideoLimit({
    visualScenes: pkg.visual_scenes as PackageVisualSceneEntry[],
    voiceoverText: pkg.voiceover_text,
  });
  if (decisions.length > 0) {
    pkg.visual_scenes = scenes as ContentPackageOutput["visual_scenes"];
  }
  return decisions;
}
