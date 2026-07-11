import type { Json } from "@/lib/supabase/types";
import {
  DEFAULT_VISUAL_PROFILE,
  parseVisualProfile,
  visualProfileOverrideFromKnowledge,
  VISUAL_PROFILES,
  VISUAL_PROFILE_UI_AUTO,
  VISUAL_PROFILE_VERSION,
  type VisualProfile,
} from "@/lib/visual-profile/visualProfile";

export type VisualProfileResolutionSource =
  | "override"
  | "package_snapshot"
  | "auto"
  | "default";

export interface ResolvedVisualProfile {
  profile: VisualProfile;
  source: VisualProfileResolutionSource;
  version: string;
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

function toneSeed(toneOfVoice: Json | null | undefined): string {
  if (typeof toneOfVoice === "string") return toneOfVoice.trim().toLowerCase();
  const rec = asRecord(toneOfVoice);
  if (!rec) return "";
  const parts: string[] = [];
  for (const key of ["style", "tone", "voice", "summary"]) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) parts.push(v.trim().toLowerCase());
  }
  return parts.join(" ");
}

function audienceSeed(targetAudience: Json | null | undefined): string {
  if (typeof targetAudience === "string") return targetAudience.trim().toLowerCase();
  const rec = asRecord(targetAudience);
  if (!rec) return "";
  const parts: string[] = [];
  for (const key of ["description", "summary", "primary"]) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) parts.push(v.trim().toLowerCase());
  }
  return parts.join(" ");
}

function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function resolveVisualProfileAuto(
  ctx: VisualProfileProjectContext,
): VisualProfile {
  const tone = toneSeed(ctx.toneOfVoice);
  const audience = audienceSeed(ctx.targetAudience);
  const strengths = (ctx.productStrengths ?? []).slice(0, 4).join("|");
  const productIs = (ctx.productIs ?? []).slice(0, 3).join("|");
  const goal = (ctx.goalType ?? "").trim().toLowerCase();

  const seed = [
    ctx.projectId,
    goal,
    tone,
    audience,
    strengths,
    productIs,
  ]
    .filter(Boolean)
    .join("::");

  const index = stableHash(seed) % VISUAL_PROFILES.length;
  return VISUAL_PROFILES[index] ?? DEFAULT_VISUAL_PROFILE;
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

  return {
    profile: resolveVisualProfileAuto(ctx),
    source: "auto",
    version: VISUAL_PROFILE_VERSION,
  };
}
