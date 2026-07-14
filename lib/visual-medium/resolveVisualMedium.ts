import type { Json } from "@/lib/supabase/types";
import {
  DEFAULT_VISUAL_MEDIUM,
  parseVisualMedium,
  visualMediumOverrideFromKnowledge,
  VISUAL_MEDIUM_UI_AUTO,
  VISUAL_MEDIUM_VERSION,
  type VisualMedium,
} from "@/lib/visual-medium/visualMedium";
import {
  scoreVisualMediumAuto,
  type VisualMediumScoreContext,
} from "@/lib/visual-medium/scoreVisualMedium";

export type VisualMediumResolutionSource =
  | "override"
  | "package_snapshot"
  | "auto"
  | "default";

export interface ResolvedVisualMedium {
  medium: VisualMedium;
  source: VisualMediumResolutionSource;
  version: string;
  scores?: Record<VisualMedium, number>;
  reasons?: string[];
}

export interface VisualMediumProjectContext
  extends Omit<VisualMediumScoreContext, "recentMediumCounts"> {
  projectId: string;
  knowledge?: Json | null;
  packageSnapshotMedium?: unknown;
  packageSnapshotVersion?: unknown;
  recentMediumCounts?: Record<string, number>;
}

export function resolveVisualMedium(
  ctx: VisualMediumProjectContext,
): ResolvedVisualMedium {
  const fromPackage = parseVisualMedium(ctx.packageSnapshotMedium);
  if (fromPackage) {
    return {
      medium: fromPackage,
      source: "package_snapshot",
      version:
        typeof ctx.packageSnapshotVersion === "string" &&
        ctx.packageSnapshotVersion.trim()
          ? ctx.packageSnapshotVersion.trim()
          : VISUAL_MEDIUM_VERSION,
    };
  }

  const uiChoice = visualMediumOverrideFromKnowledge(ctx.knowledge ?? null);
  if (uiChoice !== VISUAL_MEDIUM_UI_AUTO) {
    return {
      medium: uiChoice,
      source: "override",
      version: VISUAL_MEDIUM_VERSION,
      reasons: [`override:presentation.visual_medium=${uiChoice}`],
    };
  }

  const scored = scoreVisualMediumAuto({
    ...ctx,
    recentMediumCounts: ctx.recentMediumCounts ?? {},
  });
  return {
    medium: scored.medium,
    source: "auto",
    version: VISUAL_MEDIUM_VERSION,
    scores: scored.scores,
    reasons: scored.reasons,
  };
}

export { DEFAULT_VISUAL_MEDIUM };
