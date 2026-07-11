import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { PackageVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import { isCtaVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import { downgradeSceneToImage } from "@/lib/scene-types/presentation/downgradeToImage";
import { narrationForScene } from "@/lib/scene-types/presentation/downgradeToImage";
import type { VisualScene } from "@/lib/scene-types/visualScene";
import { visualSceneToPlanItem } from "@/lib/scene-types/normalizeVisualScene";
import { normalizeVisualSceneEntry } from "@/lib/scene-types/normalizeVisualScene";

export interface CtaFrequencyDecision {
  scene_id: string;
  rule: "cta_video_limit_exceeded" | "cta_not_final_scene";
  reason: string;
}

function entryToVisualScene(
  entry: PackageVisualSceneEntry,
  index: number,
): VisualScene | null {
  return normalizeVisualSceneEntry(entry as unknown, index);
}

function ctaDowngradeToImagePlanItem(args: {
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

export function enforceCtaVideoLimitAndPosition(args: {
  visualScenes: PackageVisualSceneEntry[];
  voiceoverText: string;
}): {
  scenes: PackageVisualSceneEntry[];
  decisions: CtaFrequencyDecision[];
} {
  const scenes = [...args.visualScenes];
  const decisions: CtaFrequencyDecision[] = [];
  const count = scenes.length;
  const lastIndex = count - 1;

  const ctaIndices: number[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const entry = scenes[i];
    if (entry && isCtaVisualSceneEntry(entry)) ctaIndices.push(i);
  }

  if (ctaIndices.length === 0) {
    return { scenes, decisions };
  }

  const finalCtaIndex = ctaIndices[ctaIndices.length - 1]!;

  for (const i of ctaIndices) {
    const entry = scenes[i];
    if (!entry || !isCtaVisualSceneEntry(entry)) continue;

    const visual = entryToVisualScene(entry, i);
    const sceneId = visual?.id ?? `scene-${i + 1}`;

    if (i !== lastIndex) {
      scenes[i] = ctaDowngradeToImagePlanItem({
        scene: visual ?? { id: sceneId, type: "CTA", payload: entry.payload },
        voiceoverText: args.voiceoverText,
        sceneIndex: i,
        sceneCount: count,
      });
      decisions.push({
        scene_id: sceneId,
        rule: "cta_not_final_scene",
        reason: "CTA must be the final visual scene; downgraded to IMAGE",
      });
      continue;
    }

    if (i !== finalCtaIndex) {
      scenes[i] = ctaDowngradeToImagePlanItem({
        scene: visual ?? { id: sceneId, type: "CTA", payload: entry.payload },
        voiceoverText: args.voiceoverText,
        sceneIndex: i,
        sceneCount: count,
      });
      decisions.push({
        scene_id: sceneId,
        rule: "cta_video_limit_exceeded",
        reason: "only one CTA scene allowed per video; downgraded to IMAGE",
      });
    }
  }

  return { scenes, decisions };
}

export function countCtaEntries(
  entries: readonly PackageVisualSceneEntry[],
): number {
  return entries.filter((e) => isCtaVisualSceneEntry(e)).length;
}

export function applyCtaFrequencyToPackage(
  pkg: ContentPackageOutput,
): CtaFrequencyDecision[] {
  if (!Array.isArray(pkg.visual_scenes) || pkg.visual_scenes.length === 0) {
    return [];
  }
  const { scenes, decisions } = enforceCtaVideoLimitAndPosition({
    visualScenes: pkg.visual_scenes as PackageVisualSceneEntry[],
    voiceoverText: pkg.voiceover_text,
  });
  if (decisions.length > 0) {
    pkg.visual_scenes = scenes as ContentPackageOutput["visual_scenes"];
  }
  return decisions;
}
