import type { VisualScene } from "@/lib/scene-types/visualScene";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import {
  pickCtaComposition,
  type CtaCompositionId,
} from "@/lib/scene-types/cta/ctaComposition";
import { parseCtaScenePayload } from "@/lib/scene-types/cta/ctaScenePayload";
import { normalizeFunnelStage } from "@/lib/ai/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function enrichAcceptedCtaScenes(args: {
  scenes: VisualScene[];
  packageId?: string | null;
  funnelStage: unknown;
  series: SeriesCreativeContext;
  visualProfile?: string | null;
  logoAssetAvailable: boolean;
}): { scenes: VisualScene[]; compositionIds: CtaCompositionId[] } {
  const stage = normalizeFunnelStage(args.funnelStage);
  const compositionIds: CtaCompositionId[] = [];
  const scenes = args.scenes.map((scene, index) => {
    if (scene.type !== "CTA") return scene;
    const parsed = parseCtaScenePayload(scene.payload);
    if (!parsed.ok) return scene;

    const prev = index > 0 ? args.scenes[index - 1] : null;
    const prevPayload = asRecord(prev?.payload);
    const prevMedia = asRecord(prevPayload?.media);
    const precedingSceneIsAsset =
      prev?.type === "IMAGE" && prevMedia?.source === "asset";

    const composition = pickCtaComposition({
      packageId: args.packageId,
      payload: parsed.data,
      funnelStage: stage,
      recentCompositionIds: args.series.recentCtaCompositionIds,
      hasLogoAsset: args.logoAssetAvailable,
      hasHeroAsset: Boolean(parsed.data.asset_id),
      visualProfile: args.visualProfile,
      precedingSceneIsAsset,
    });

    compositionIds.push(composition);
    return {
      ...scene,
      payload: {
        ...parsed.data,
        composition,
      },
    };
  });

  return { scenes, compositionIds };
}
