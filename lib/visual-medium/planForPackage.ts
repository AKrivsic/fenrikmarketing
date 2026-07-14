import type { Project } from "@/lib/supabase/types";
import type { CreativeIdentity } from "@/lib/creative-identity/types";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import type { FunnelStage } from "@/lib/ai/types";
import type { VisualProfile } from "@/lib/visual-profile/visualProfile";
import type { VisualNarrativePlan } from "@/lib/visual-narrative/types";
import { buildCreativeIdentitySeed } from "@/lib/creative-identity/resolveCreativeIdentity";
import {
  projectContextForVisualMedium,
  visualMediumFieldsForPersistence,
} from "@/lib/visual-medium/packageVisualMedium";
import { resolveVisualMedium } from "@/lib/visual-medium/resolveVisualMedium";
import { visualMediumImagePromptBlock } from "@/lib/visual-medium/imagePromptMedium";
import { aggregateRecentMediumCounts } from "@/lib/visual-medium/seriesMediumMemory";
import type { ResolvedVisualMedium } from "@/lib/visual-medium/resolveVisualMedium";

export function planVisualMediumForPackage(args: {
  project: Project;
  visualProfile: VisualProfile;
  narrative: VisualNarrativePlan | null;
  identity: CreativeIdentity | null;
  series: SeriesCreativeContext;
  funnelStage: FunnelStage;
  requireVideo: boolean;
  projectId: string;
  strategyItemId?: string | null;
  packageIndex?: number | null;
  topic: string;
  angle?: string | null;
  creativeSeedSalt?: string | null;
}): {
  resolved: ResolvedVisualMedium | null;
  promptBlock: string;
  persistenceFields: Record<string, unknown>;
} {
  if (!args.requireVideo) {
    return { resolved: null, promptBlock: "", persistenceFields: {} };
  }

  void [
    buildCreativeIdentitySeed({
      projectId: args.projectId,
      strategyItemId: args.strategyItemId,
      packageIndex: args.packageIndex,
      topic: args.topic,
      angle: args.angle,
      salt: args.creativeSeedSalt,
    }),
    "visual-medium",
  ].join("|");

  const resolved = resolveVisualMedium(
    projectContextForVisualMedium({
      project: args.project,
      funnelStage: args.funnelStage,
      visualProfile: args.visualProfile,
      primaryCarrier: args.narrative?.primary_meaning_carrier ?? null,
      identity: args.identity,
      recentMediumCounts: aggregateRecentMediumCounts(args.series),
    }),
  );

  return {
    resolved,
    promptBlock: visualMediumImagePromptBlock(resolved.medium),
    persistenceFields: visualMediumFieldsForPersistence(resolved),
  };
}
