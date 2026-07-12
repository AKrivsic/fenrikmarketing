import type { SupabaseClient } from "@supabase/supabase-js";
import type { SceneType } from "@/lib/scene-types/sceneType";
import {
  DEFAULT_SCENE_TYPE,
  isSceneType,
  normalizeSceneType,
} from "@/lib/scene-types/sceneType";

/** How many recent packages to scan for scene-type usage. */
export const SCENE_TYPE_HISTORY_PACKAGE_LIMIT = 12;

/** CTA end cards should not repeat across this many recent packages. */
export const CTA_RECENT_USAGE_WINDOW = 5;

export type SpecialSceneType = Exclude<SceneType, "IMAGE">;

export const SPECIAL_SCENE_TYPES: readonly SpecialSceneType[] = [
  "CHECKLIST",
  "PHONE",
  "QUOTE",
  "STATISTIC",
  "CTA",
];

export function isSpecialSceneType(value: SceneType): value is SpecialSceneType {
  return value !== DEFAULT_SCENE_TYPE;
}

export interface SceneTypePackageSnapshot {
  packageId: string;
  createdAt: string;
  weeklyStrategyId: string | null;
  strategyItemId: string | null;
  /** Non-IMAGE types accepted or requested for that package. */
  specialTypes: SpecialSceneType[];
}

export interface SceneTypeProjectHistory {
  recentPackages: SceneTypePackageSnapshot[];
  /** Types used in the most recent prior package (empty when none). */
  lastPackageSpecialTypes: SpecialSceneType[];
  /** Types already used by siblings in the current weekly strategy (excludes current package). */
  weeklyStrategySpecialTypes: SpecialSceneType[];
  /** Whether CTA appeared in the recent CTA window (excludes current package). */
  ctaUsedInRecentWindow: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function specialTypesFromAnalyzerDecisions(
  pg: Record<string, unknown>,
): SpecialSceneType[] | null {
  const decisions = pg.analyzer_decisions;
  if (!Array.isArray(decisions) || decisions.length === 0) return null;
  const out = new Set<SpecialSceneType>();
  for (const entry of decisions) {
    const rec = asRecord(entry);
    if (!rec) continue;
    const finalType =
      typeof rec.final_type === "string"
        ? normalizeSceneType(rec.final_type)
        : null;
    if (finalType && isSpecialSceneType(finalType)) out.add(finalType);
  }
  return out.size > 0 ? [...out] : null;
}

function specialTypesFromPackageBrief(
  brief: Record<string, unknown>,
): SpecialSceneType[] {
  const pg = asRecord(brief.presentation_generation);
  const finals = pg?.final_worker_scene_types;
  if (Array.isArray(finals) && finals.length > 0) {
    const out = new Set<SpecialSceneType>();
    for (const t of finals) {
      if (typeof t !== "string") continue;
      const normalized = normalizeSceneType(t);
      if (normalized && isSpecialSceneType(normalized)) out.add(normalized);
    }
    if (out.size > 0) return [...out];
  }

  if (pg) {
    const fromAnalyzer = specialTypesFromAnalyzerDecisions(pg);
    if (fromAnalyzer) return fromAnalyzer;
  }

  // Do not infer shipped scene types from model-requested visual_scenes alone —
  // a requested CTA/CHECKLIST may have been downgraded to IMAGE before render.
  return [];
}

export function buildSceneTypeProjectHistory(args: {
  rows: {
    id: string;
    created_at: string;
    weekly_strategy_id: string | null;
    strategy_item_id: string | null;
    package_brief: unknown;
  }[];
  currentWeeklyStrategyId?: string | null;
  excludePackageId?: string | null;
}): SceneTypeProjectHistory {
  const snapshots: SceneTypePackageSnapshot[] = [];
  for (const row of args.rows) {
    if (args.excludePackageId && row.id === args.excludePackageId) continue;
    const brief = asRecord(row.package_brief);
    if (!brief) continue;
    snapshots.push({
      packageId: row.id,
      createdAt: row.created_at,
      weeklyStrategyId: row.weekly_strategy_id,
      strategyItemId: row.strategy_item_id,
      specialTypes: specialTypesFromPackageBrief(brief),
    });
  }

  const lastPackageSpecialTypes = snapshots[0]?.specialTypes ?? [];

  const weeklyId = args.currentWeeklyStrategyId?.trim() ?? "";
  const weeklyStrategySpecialTypes = weeklyId
    ? [
        ...new Set(
          snapshots
            .filter((s) => s.weeklyStrategyId === weeklyId)
            .flatMap((s) => s.specialTypes),
        ),
      ]
    : [];

  const ctaWindow = snapshots.slice(0, CTA_RECENT_USAGE_WINDOW);
  const ctaUsedInRecentWindow = ctaWindow.some((s) =>
    s.specialTypes.includes("CTA"),
  );

  return {
    recentPackages: snapshots,
    lastPackageSpecialTypes,
    weeklyStrategySpecialTypes,
    ctaUsedInRecentWindow,
  };
}

export const EMPTY_SCENE_TYPE_PROJECT_HISTORY: SceneTypeProjectHistory = {
  recentPackages: [],
  lastPackageSpecialTypes: [],
  weeklyStrategySpecialTypes: [],
  ctaUsedInRecentWindow: false,
};

export async function loadSceneTypeProjectHistory(
  supabase: SupabaseClient,
  projectId: string,
  opts?: {
    excludePackageId?: string | null;
    currentWeeklyStrategyId?: string | null;
  },
): Promise<SceneTypeProjectHistory> {
  if (!projectId) return EMPTY_SCENE_TYPE_PROJECT_HISTORY;
  try {
    const { data, error } = await supabase
      .from("content_packages")
      .select(
        "id, created_at, weekly_strategy_id, strategy_item_id, package_brief",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(SCENE_TYPE_HISTORY_PACKAGE_LIMIT + 1);
    if (error || !data) return EMPTY_SCENE_TYPE_PROJECT_HISTORY;

    return buildSceneTypeProjectHistory({
      rows: data.map((row) => ({
        id: row.id as string,
        created_at: row.created_at as string,
        weekly_strategy_id: (row.weekly_strategy_id as string | null) ?? null,
        strategy_item_id: (row.strategy_item_id as string | null) ?? null,
        package_brief: row.package_brief,
      })),
      currentWeeklyStrategyId: opts?.currentWeeklyStrategyId ?? null,
      excludePackageId: opts?.excludePackageId ?? null,
    });
  } catch {
    return EMPTY_SCENE_TYPE_PROJECT_HISTORY;
  }
}
