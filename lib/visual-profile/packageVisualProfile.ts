import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { Json } from "@/lib/supabase/types";
import type { Project } from "@/lib/supabase/types";
import {
  resolveVisualProfile,
  type ResolvedVisualProfile,
  type VisualProfileProjectContext,
} from "@/lib/visual-profile/resolveVisualProfile";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readPackageVisualProfileSnapshot(
  pkg: Pick<ContentPackageOutput, "presentation_generation">,
): { profile?: unknown; version?: unknown } {
  const pg = asRecord(pkg.presentation_generation);
  return {
    profile: pg?.visual_profile,
    version: pg?.visual_profile_version,
  };
}

export function projectContextForVisualProfile(args: {
  project: Pick<
    Project,
    "id" | "knowledge" | "goal_type" | "tone_of_voice" | "target_audience" | "product_strengths" | "product_is"
  >;
  pkg?: Pick<ContentPackageOutput, "presentation_generation"> | null;
}): VisualProfileProjectContext {
  const snap = args.pkg ? readPackageVisualProfileSnapshot(args.pkg) : {};
  return {
    projectId: args.project.id,
    knowledge: args.project.knowledge,
    goalType: args.project.goal_type,
    toneOfVoice: args.project.tone_of_voice,
    targetAudience: args.project.target_audience,
    productStrengths: args.project.product_strengths ?? [],
    productIs: args.project.product_is ?? [],
    packageSnapshotProfile: snap.profile,
    packageSnapshotVersion: snap.version,
  };
}

export function resolveVisualProfileForPackage(args: {
  project: Pick<
    Project,
    "id" | "knowledge" | "goal_type" | "tone_of_voice" | "target_audience" | "product_strengths" | "product_is"
  >;
  pkg?: Pick<ContentPackageOutput, "presentation_generation"> | null;
}): ResolvedVisualProfile {
  return resolveVisualProfile(projectContextForVisualProfile(args));
}

export function visualProfileFieldsForPersistence(
  resolved: ResolvedVisualProfile,
): Record<string, string | Record<string, number> | string[]> {
  const out: Record<string, string | Record<string, number> | string[]> = {
    visual_profile: resolved.profile,
    visual_profile_version: resolved.version,
    visual_profile_source: resolved.source,
  };
  if (resolved.scores && resolved.source === "auto") {
    out.visual_profile_scores = resolved.scores;
  }
  if (resolved.reasons?.length && resolved.source === "auto") {
    out.visual_profile_reasons = resolved.reasons;
  }
  return out;
}

export function readVisualProfileFromJobInput(
  input: Json | null | undefined,
): { profile?: unknown; version?: unknown } {
  const root = asRecord(input);
  const fromRoot = {
    profile: root?.visual_profile,
    version: root?.visual_profile_version,
  };
  if (fromRoot.profile) return fromRoot;
  const analyzer = asRecord(root?.presentation_analyzer);
  const gen = asRecord(analyzer?.presentation_generation);
  return {
    profile: gen?.visual_profile ?? root?.visual_profile,
    version: gen?.visual_profile_version ?? root?.visual_profile_version,
  };
}
