import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { Json } from "@/lib/supabase/types";
import type { Project } from "@/lib/supabase/types";
import {
  resolveVisualMedium,
  type ResolvedVisualMedium,
  type VisualMediumProjectContext,
} from "@/lib/visual-medium/resolveVisualMedium";
import {
  DEFAULT_VISUAL_MEDIUM,
  parseVisualMedium,
  VISUAL_MEDIUM_VERSION,
  type VisualMedium,
} from "@/lib/visual-medium/visualMedium";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readPackageVisualMediumSnapshot(
  pkg: Pick<ContentPackageOutput, "presentation_generation">,
): { medium?: unknown; version?: unknown } {
  const pg = asRecord(pkg.presentation_generation);
  return {
    medium: pg?.visual_medium,
    version: pg?.visual_medium_version,
  };
}

export function projectContextForVisualMedium(
  args: Omit<VisualMediumProjectContext, "projectId" | "knowledge"> & {
    project: Pick<Project, "id" | "knowledge">;
    pkg?: Pick<ContentPackageOutput, "presentation_generation"> | null;
    recentMediumCounts?: Record<string, number>;
  },
): VisualMediumProjectContext {
  const snap = args.pkg ? readPackageVisualMediumSnapshot(args.pkg) : {};
  return {
    projectId: args.project.id,
    knowledge: args.project.knowledge,
    project: args.project as Project,
    funnelStage: args.funnelStage,
    visualProfile: args.visualProfile,
    primaryCarrier: args.primaryCarrier,
    identity: args.identity,
    packageSnapshotMedium: snap.medium,
    packageSnapshotVersion: snap.version,
    recentMediumCounts: args.recentMediumCounts,
  };
}

export function visualMediumFieldsForPersistence(
  resolved: ResolvedVisualMedium,
): Record<string, string | Record<string, number> | string[]> {
  const out: Record<string, string | Record<string, number> | string[]> = {
    visual_medium: resolved.medium,
    visual_medium_version: resolved.version,
    visual_medium_source: resolved.source,
  };
  if (resolved.scores && resolved.source === "auto") {
    out.visual_medium_scores = resolved.scores;
  }
  if (resolved.reasons?.length && resolved.source === "auto") {
    out.visual_medium_reasons = resolved.reasons;
  }
  if (resolved.reasons?.length && resolved.source === "override") {
    out.visual_medium_reasons = resolved.reasons;
  }
  return out;
}

export function readVisualMediumFromJobInput(
  input: unknown,
): { medium?: unknown; version?: unknown; source?: unknown } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const root = input as Record<string, unknown>;
  if (root.visual_medium) {
    return {
      medium: root.visual_medium,
      version: root.visual_medium_version,
      source: root.visual_medium_source,
    };
  }
  const analyzer = root.presentation_analyzer;
  if (analyzer && typeof analyzer === "object" && !Array.isArray(analyzer)) {
    const gen = (analyzer as Record<string, unknown>).presentation_generation;
    if (gen && typeof gen === "object" && !Array.isArray(gen)) {
      const g = gen as Record<string, unknown>;
      return {
        medium: g.visual_medium,
        version: g.visual_medium_version,
        source: g.visual_medium_source,
      };
    }
  }
  return {};
}

export function parseVisualMediumFromJobInput(input: unknown): VisualMedium {
  const snap = readVisualMediumFromJobInput(input);
  return parseVisualMedium(snap.medium) ?? DEFAULT_VISUAL_MEDIUM;
}

export function visualMediumFieldsForJobInput(
  pkg: Pick<ContentPackageOutput, "presentation_generation">,
): Record<string, string> {
  const snap = readPackageVisualMediumSnapshot(pkg);
  const medium = parseVisualMedium(snap.medium) ?? DEFAULT_VISUAL_MEDIUM;
  const pg = asRecord(pkg.presentation_generation);
  const out: Record<string, string> = {
    visual_medium: medium,
    visual_medium_version:
      typeof snap.version === "string" && snap.version.trim()
        ? snap.version.trim()
        : VISUAL_MEDIUM_VERSION,
  };
  const source =
    typeof pg?.visual_medium_source === "string"
      ? pg.visual_medium_source.trim()
      : "";
  if (source) out.visual_medium_source = source;
  return out;
}
