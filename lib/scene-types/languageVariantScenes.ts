import type { SceneType } from "@/lib/scene-types/sceneType";
import { DEFAULT_SCENE_TYPE } from "@/lib/scene-types/sceneType";
import { isSceneTypesEnabled } from "@/lib/scene-types/config";
import {
  narrationForScene,
  downgradeSceneToImage,
} from "@/lib/scene-types/presentation/downgradeToImage";
import type { VisualScene } from "@/lib/scene-types/visualScene";

/**
 * Language variants copy primary render_spec scenes verbatim. CHECKLIST text is
 * language-bound; until typed payloads are localized per variant, downgrade to
 * IMAGE and drop storage reuse so the worker generates a narration-based still.
 */
export function prepareRenderScenesForLanguageVariant(args: {
  scenes: Record<string, unknown>[];
  voiceoverText: string;
}): { scenes: Record<string, unknown>[]; warnings: string[] } {
  const warnings: string[] = [];
  const sceneCount = args.scenes.length;

  const out = args.scenes.map((scene, index) => {
    const type = typeof scene.type === "string" ? scene.type.toUpperCase() : "";
    if (type !== "CHECKLIST" && type !== "PHONE" && type !== "QUOTE" && type !== "STATISTIC" && type !== "CTA" && type !== "PRODUCT_DEMO") {
      return { ...scene };
    }

    const sceneId =
      typeof scene.id === "string" && scene.id.trim()
        ? scene.id.trim()
        : `scene-${index + 1}`;

    warnings.push(
      `${sceneId}: ${type} downgraded to IMAGE for language variant (${type} payload not localized)`,
    );

    const narration = narrationForScene({
      voiceoverText: args.voiceoverText,
      sceneIndex: index,
      sceneCount,
    });

    const visual: VisualScene = {
      id: sceneId,
      type:
        type === "PHONE"
          ? "PHONE"
          : type === "QUOTE"
            ? "QUOTE"
            : type === "STATISTIC"
              ? "STATISTIC"
              : type === "CTA"
                ? "CTA"
                : "CHECKLIST",
      payload: (scene.payload_snapshot as Record<string, unknown>) ?? {},
    };

    const downgraded = downgradeSceneToImage({
      scene: visual,
      narration,
    });

    const media = downgraded.payload as {
      media?: { source?: string; image_prompt?: string };
    };
    const image_prompt =
      media.media?.source === "ai" && media.media.image_prompt
        ? media.media.image_prompt
        : "Localized video still supporting the narration beat.";

    const {
      payload_snapshot: _dropPayload,
      renderer_version: _dropRv,
      image_bucket: _dropB,
      image_path: _dropP,
      type: _dropT,
      ...rest
    } = scene;

    return {
      ...rest,
      id: sceneId,
      type: DEFAULT_SCENE_TYPE,
      image_prompt,
      duration_seconds:
        typeof scene.duration_seconds === "number" && scene.duration_seconds > 0
          ? scene.duration_seconds
          : 4,
    };
  });

  return { scenes: out, warnings };
}

export function sceneTypeFromWorkerScene(
  scene: Record<string, unknown>,
): SceneType {
  const raw = scene.type;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim().toUpperCase() as SceneType;
  }
  return DEFAULT_SCENE_TYPE;
}

export function checklistRendererActive(): boolean {
  return isSceneTypesEnabled();
}
