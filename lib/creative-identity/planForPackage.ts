import type { Project } from "@/lib/supabase/types";
import type { VisualProfile } from "@/lib/visual-profile/visualProfile";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import {
  buildCreativeIdentityPromptBlock,
  creativeIdentityFieldsForPersistence,
} from "@/lib/creative-identity/promptBlocks";
import {
  buildCreativeIdentitySeed,
  resolveCreativeIdentity,
  type CreativeIdentity,
} from "@/lib/creative-identity/resolveCreativeIdentity";

export function planCreativeIdentityForPackage(args: {
  project: Project;
  visualProfile: VisualProfile;
  projectId: string;
  strategyItemId?: string | null;
  packageIndex?: number | null;
  topic: string;
  angle?: string | null;
  creativeSeedSalt?: string | null;
  series: SeriesCreativeContext;
  requireVideo: boolean;
}): {
  identity: CreativeIdentity | null;
  promptBlock: string;
  persistenceFields: Record<string, unknown>;
} {
  if (!args.requireVideo) {
    return { identity: null, promptBlock: "", persistenceFields: {} };
  }

  const seed = buildCreativeIdentitySeed({
    projectId: args.projectId,
    strategyItemId: args.strategyItemId,
    packageIndex: args.packageIndex,
    topic: args.topic,
    angle: args.angle,
    salt: args.creativeSeedSalt,
  });

  const identity = resolveCreativeIdentity({
    project: args.project,
    visualProfile: args.visualProfile,
    seed,
    recentIdentityKeys: args.series.recentCreativeIdentityKeys,
  });

  return {
    identity,
    promptBlock: buildCreativeIdentityPromptBlock(
      identity,
      args.series.recentCreativeIdentityKeys,
    ),
    persistenceFields: creativeIdentityFieldsForPersistence(identity),
  };
}
