import type { Project } from "@/lib/supabase/types";
import type { CreativeIdentity } from "@/lib/creative-identity/types";
import { buildCreativeIdentitySeed } from "@/lib/creative-identity/resolveCreativeIdentity";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import type { FunnelStage } from "@/lib/ai/types";
import {
  buildVisualNarrativePromptBlock,
  visualNarrativeFieldsForPersistence,
} from "@/lib/visual-narrative/promptBlocks";
import { resolveVisualNarrative } from "@/lib/visual-narrative/resolveVisualNarrative";
import type { VisualNarrativePlan } from "@/lib/visual-narrative/types";

export function planVisualNarrativeForPackage(args: {
  project: Project;
  identity: CreativeIdentity | null;
  projectId: string;
  strategyItemId?: string | null;
  packageIndex?: number | null;
  topic: string;
  angle?: string | null;
  creativeSeedSalt?: string | null;
  series: SeriesCreativeContext;
  funnelStage: FunnelStage;
  requireVideo: boolean;
}): {
  plan: VisualNarrativePlan | null;
  promptBlock: string;
  persistenceFields: Record<string, unknown>;
} {
  if (!args.requireVideo) {
    return { plan: null, promptBlock: "", persistenceFields: {} };
  }

  const seed = [
    buildCreativeIdentitySeed({
      projectId: args.projectId,
      strategyItemId: args.strategyItemId,
      packageIndex: args.packageIndex,
      topic: args.topic,
      angle: args.angle,
      salt: args.creativeSeedSalt,
    }),
    "visual-narrative",
  ].join("|");

  const plan = resolveVisualNarrative({
    project: args.project,
    identity: args.identity,
    seed,
    series: args.series,
    funnelStage: args.funnelStage,
    recentPrimaryCarrierKeys: args.series.recentVisualNarrativeKeys,
  });

  return {
    plan,
    promptBlock: buildVisualNarrativePromptBlock(plan),
    persistenceFields: visualNarrativeFieldsForPersistence(plan),
  };
}
