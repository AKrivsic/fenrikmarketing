import type { Project } from "@/lib/supabase/types";
import type { VisualProfile } from "@/lib/visual-profile/visualProfile";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import type { CreativeDNA } from "@/lib/creative-candidates/creativeDNA";
import {
  neutralizeIdentityEnvironmentForDna,
  normalizeCreativeDNA,
} from "@/lib/creative-candidates/creativeDNA";
import {
  buildCreativeIdentityPromptBlock,
  creativeIdentityFieldsForPersistence,
} from "@/lib/creative-identity/promptBlocks";
import {
  buildCreativeIdentitySeed,
  resolveCreativeIdentity,
} from "@/lib/creative-identity/resolveCreativeIdentity";
import type { CreativeIdentity } from "@/lib/creative-identity/types";

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
  /** When present, conflicting Identity environment is neutralized. */
  creativeDNA?: CreativeDNA | null;
}): {
  identity: CreativeIdentity | null;
  /** Identity as used for prompts / image suffix (may have neutralized environment). */
  promptIdentity: CreativeIdentity | null;
  promptBlock: string;
  persistenceFields: Record<string, unknown>;
  identityEnvironmentSuppressed: boolean;
} {
  if (!args.requireVideo) {
    return {
      identity: null,
      promptIdentity: null,
      promptBlock: "",
      persistenceFields: {},
      identityEnvironmentSuppressed: false,
    };
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

  const dna = normalizeCreativeDNA(args.creativeDNA ?? undefined);
  const neutralized = dna
    ? neutralizeIdentityEnvironmentForDna(identity, dna)
    : { identity, suppressed: false };

  return {
    identity,
    promptIdentity: neutralized.identity,
    promptBlock: buildCreativeIdentityPromptBlock(
      neutralized.identity,
      args.series.recentCreativeIdentityKeys,
      { dnaWorldTreatment: neutralized.suppressed },
    ),
    // Persist the prompt identity so the video worker matches Claude's staging.
    persistenceFields: creativeIdentityFieldsForPersistence(neutralized.identity),
    identityEnvironmentSuppressed: neutralized.suppressed,
  };
}
