import type { Json } from "@/lib/supabase/types";
import {
  DEFAULT_VISUAL_PROFILE,
  parseVisualProfile,
  visualProfileOverrideFromKnowledge,
  VISUAL_PROFILE_UI_AUTO,
  VISUAL_PROFILE_VERSION,
  type VisualProfile,
} from "@/lib/visual-profile/visualProfile";
import { scoreVisualProfileAuto } from "@/lib/visual-profile/scoreVisualProfile";

export type VisualProfileResolutionSource =
  | "override"
  | "package_snapshot"
  | "auto"
  | "default";

export interface ResolvedVisualProfile {
  profile: VisualProfile;
  source: VisualProfileResolutionSource;
  version: string;
  scores?: Record<VisualProfile, number>;
  reasons?: string[];
}

export interface VisualProfileProjectContext {
  projectId: string;
  knowledge?: Json | null;
  goalType?: string | null;
  toneOfVoice?: Json | null;
  targetAudience?: Json | null;
  productStrengths?: readonly string[] | null;
  productIs?: readonly string[] | null;
  /** Frozen profile from package / job (retries, re-renders). */
  packageSnapshotProfile?: unknown;
  packageSnapshotVersion?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function resolveVisualProfileAuto(
  ctx: VisualProfileProjectContext,
): VisualProfile {
  return scoreVisualProfileAuto(ctx).profile;
}

export function resolveVisualProfile(
  ctx: VisualProfileProjectContext,
): ResolvedVisualProfile {
  const fromPackage = parseVisualProfile(ctx.packageSnapshotProfile);
  if (fromPackage) {
    return {
      profile: fromPackage,
      source: "package_snapshot",
      version:
        typeof ctx.packageSnapshotVersion === "string" &&
        ctx.packageSnapshotVersion.trim()
          ? ctx.packageSnapshotVersion.trim()
          : VISUAL_PROFILE_VERSION,
    };
  }

  const uiChoice = visualProfileOverrideFromKnowledge(ctx.knowledge ?? null);
  if (uiChoice !== VISUAL_PROFILE_UI_AUTO) {
    return {
      profile: uiChoice,
      source: "override",
      version: VISUAL_PROFILE_VERSION,
    };
  }

  const brandVisual = asRecord(
    asRecord(asRecord(ctx.knowledge)?.presentation)?.visual,
  );
  const fromBrandStyle = parseVisualProfile(brandVisual?.style);
  if (fromBrandStyle) {
    return {
      profile: fromBrandStyle,
      source: "override",
      version: VISUAL_PROFILE_VERSION,
    };
  }

  const scored = scoreVisualProfileAuto(ctx);
  return {
    profile: scored.profile,
    source: "auto",
    version: VISUAL_PROFILE_VERSION,
    scores: scored.scores,
    reasons: scored.reasons,
  };
}

export { DEFAULT_VISUAL_PROFILE };
