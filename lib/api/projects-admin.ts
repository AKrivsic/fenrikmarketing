import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ApprovalStatus,
  ContentFormat,
  ContentPackage,
  FunnelStageDb,
  GoalType,
  Json,
  LanguageCode,
  MarketScope,
  PackageStatus,
  PlatformType,
  Project,
  ProjectType,
  ProjectUpdate,
} from "@/lib/supabase/types";

// Read-only project access for the internal admin UI. Uses the service-role
// admin client (RLS bypassed) because the MVP has no user session yet; keep
// this module server-only. No mutations here — editing is out of scope.

// Lightweight row for the projects list (only what the list view renders).
export interface ProjectListItem {
  id: string;
  name: string;
  type: ProjectType;
  language: LanguageCode;
  marketScope: MarketScope;
  goalType: GoalType;
  createdAt: string;
}

export async function listProjectsForAdmin(): Promise<ProjectListItem[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, type, language, market_scope, goal_type, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as {
    id: string;
    name: string;
    type: ProjectType;
    language: LanguageCode;
    market_scope: MarketScope;
    goal_type: GoalType;
    created_at: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    language: row.language,
    marketScope: row.market_scope,
    goalType: row.goal_type,
    createdAt: row.created_at,
  }));
}

export async function getProjectForAdmin(
  projectId: string,
): Promise<Project | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw error;
  return (data as Project) ?? null;
}

// Updates editable Project Brain fields. owner_id / created_at are never
// touched; updated_at is maintained by the DB trigger (migration 007). Scoped
// by id only (single-tenant internal admin, RLS bypassed).
export async function updateProjectForAdmin(
  projectId: string,
  input: ProjectUpdate,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("projects")
    .update(input)
    .eq("id", projectId);

  if (error) throw error;
}

// Read model for the project Content Packages tab.
export interface ProjectContentPackage {
  id: string;
  title: string;
  status: PackageStatus;
  funnelStage: FunnelStageDb | null;
  briefHook: string | null;
  itemCount: number;
  platforms: PlatformType[];
  createdAt: string;
}

// Reads package_brief.hook defensively (package_brief is free-form jsonb).
function readBriefHook(brief: Json | null): string | null {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) return null;
  const hook = (brief as Record<string, unknown>).hook;
  return typeof hook === "string" && hook.length > 0 ? hook : null;
}

// Lists a project's content packages with item count + distinct platforms.
// Two queries total (packages, then their items) — no N+1.
export async function listProjectContentPackages(
  projectId: string,
): Promise<ProjectContentPackage[]> {
  const supabase = createSupabaseAdminClient();

  const { data: packageRows, error: packagesError } = await supabase
    .from("content_packages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (packagesError) throw packagesError;

  const packages = (packageRows ?? []) as ContentPackage[];
  if (packages.length === 0) return [];

  const packageIds = packages.map((pkg) => pkg.id);
  const { data: itemRows, error: itemsError } = await supabase
    .from("content_items")
    .select("package_id, platform")
    .eq("project_id", projectId)
    .in("package_id", packageIds);

  if (itemsError) throw itemsError;

  const items = (itemRows ?? []) as {
    package_id: string | null;
    platform: PlatformType;
  }[];

  const countByPackage = new Map<string, number>();
  const platformsByPackage = new Map<string, Set<PlatformType>>();
  for (const item of items) {
    if (!item.package_id) continue;
    countByPackage.set(
      item.package_id,
      (countByPackage.get(item.package_id) ?? 0) + 1,
    );
    const set = platformsByPackage.get(item.package_id) ?? new Set();
    set.add(item.platform);
    platformsByPackage.set(item.package_id, set);
  }

  return packages.map((pkg) => ({
    id: pkg.id,
    title: pkg.title,
    status: pkg.status,
    funnelStage: pkg.funnel_stage,
    briefHook: readBriefHook(pkg.package_brief),
    itemCount: countByPackage.get(pkg.id) ?? 0,
    platforms: Array.from(platformsByPackage.get(pkg.id) ?? []),
    createdAt: pkg.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Weekly Strategy tab (read-only).
// content_strategies has no `status` column — none is read or derived here.
// `objective` is the only goal field; `theme` comes from strategy_brief.theme;
// funnel distribution lives in strategy_brief.funnel_distribution (jsonb).
// These are UI read models, intentionally NOT global DB entity types.
// ---------------------------------------------------------------------------
export interface ProjectWeeklyStrategy {
  id: string;
  name: string;
  objective: GoalType;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  theme: string | null;
  funnelDistribution: Record<string, number> | null;
  items: ProjectWeeklyStrategyItem[];
}

export interface ProjectWeeklyStrategyItem {
  id: string;
  platform: PlatformType;
  format: ContentFormat;
  funnelStage: FunnelStageDb | null;
  priority: number;
  createdAt: string;
  topic: string | null;
  angle: string | null;
  day: string | null;
}

function asRecord(value: Json | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

// Reads a non-empty string from a free-form jsonb brief.
function readBriefString(brief: Json | null, key: string): string | null {
  const record = asRecord(brief);
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

// Reads strategy_brief.funnel_distribution as a numeric map; null when absent
// or empty. Non-numeric entries are skipped (defensive against free-form jsonb).
function readFunnelDistribution(
  brief: Json | null,
): Record<string, number> | null {
  const record = asRecord(brief);
  if (!record) return null;
  const raw = record.funnel_distribution;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const distribution: Record<string, number> = {};
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof entry === "number" && !Number.isNaN(entry)) {
      distribution[key] = entry;
    }
  }
  return Object.keys(distribution).length > 0 ? distribution : null;
}

// Row shape mirroring the columns we select (kept local to this read path).
interface ContentStrategyRow {
  id: string;
  name: string;
  objective: GoalType;
  period_start: string | null;
  period_end: string | null;
  strategy_brief: Json;
  created_at: string;
}

interface ContentStrategyItemRow {
  id: string;
  platform: PlatformType;
  format: ContentFormat;
  funnel_stage: FunnelStageDb | null;
  priority: number;
  brief: Json;
  created_at: string;
}

// Returns the project's most recent content strategy (created_at desc, limit 1)
// with its plan items, or null when the project has no strategy. Two queries
// total (strategy header, then its items) — no N+1.
export async function getLatestProjectWeeklyStrategy(
  projectId: string,
): Promise<ProjectWeeklyStrategy | null> {
  const supabase = createSupabaseAdminClient();

  const { data: strategyRow, error: strategyError } = await supabase
    .from("content_strategies")
    .select(
      "id, name, objective, period_start, period_end, strategy_brief, created_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (strategyError) throw strategyError;
  if (!strategyRow) return null;

  const strategy = strategyRow as ContentStrategyRow;

  const { data: itemRows, error: itemsError } = await supabase
    .from("content_strategy_items")
    .select("id, platform, format, funnel_stage, priority, brief, created_at")
    .eq("strategy_id", strategy.id)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  const items = (itemRows ?? []) as ContentStrategyItemRow[];

  return {
    id: strategy.id,
    name: strategy.name,
    objective: strategy.objective,
    periodStart: strategy.period_start,
    periodEnd: strategy.period_end,
    createdAt: strategy.created_at,
    theme: readBriefString(strategy.strategy_brief, "theme"),
    funnelDistribution: readFunnelDistribution(strategy.strategy_brief),
    items: items.map((item) => ({
      id: item.id,
      platform: item.platform,
      format: item.format,
      funnelStage: item.funnel_stage,
      priority: item.priority,
      createdAt: item.created_at,
      topic: readBriefString(item.brief, "topic"),
      angle: readBriefString(item.brief, "angle"),
      day: readBriefString(item.brief, "day"),
    })),
  };
}

// ---------------------------------------------------------------------------
// Publishing Plan tab (read-only).
// publishing_schedule is the only publishing table — there is NO publishing_plan
// table. Rows are enriched with content_items.title/format (existing columns).
// publishing_metadata is intentionally not surfaced here. UI read model only.
// ---------------------------------------------------------------------------
export interface ProjectPublishingPlanEntry {
  id: string;
  platform: PlatformType;
  status: ApprovalStatus;
  scheduledAt: string;
  createdAt: string;
  contentItemId: string;
  itemTitle: string | null;
  itemFormat: ContentFormat | null;
}

interface PublishingScheduleRow {
  id: string;
  content_item_id: string;
  platform: PlatformType;
  status: ApprovalStatus;
  scheduled_at: string;
  created_at: string;
}

interface ContentItemEnrichmentRow {
  id: string;
  title: string | null;
  format: ContentFormat;
}

// Lists a project's publishing schedule (scheduled_at asc), enriched with the
// linked content item's title + format. Two queries total (schedule, then the
// referenced content items) — no N+1.
export async function listProjectPublishingPlan(
  projectId: string,
): Promise<ProjectPublishingPlanEntry[]> {
  const supabase = createSupabaseAdminClient();

  const { data: scheduleRows, error: scheduleError } = await supabase
    .from("publishing_schedule")
    .select("id, content_item_id, platform, status, scheduled_at, created_at")
    .eq("project_id", projectId)
    .order("scheduled_at", { ascending: true });

  if (scheduleError) throw scheduleError;

  const schedule = (scheduleRows ?? []) as PublishingScheduleRow[];
  if (schedule.length === 0) return [];

  const contentItemIds = Array.from(
    new Set(schedule.map((row) => row.content_item_id)),
  );

  const { data: itemRows, error: itemsError } = await supabase
    .from("content_items")
    .select("id, title, format")
    .eq("project_id", projectId)
    .in("id", contentItemIds);

  if (itemsError) throw itemsError;

  const items = (itemRows ?? []) as ContentItemEnrichmentRow[];
  const itemById = new Map<string, ContentItemEnrichmentRow>();
  for (const item of items) {
    itemById.set(item.id, item);
  }

  return schedule.map((row) => {
    const item = itemById.get(row.content_item_id);
    return {
      id: row.id,
      platform: row.platform,
      status: row.status,
      scheduledAt: row.scheduled_at,
      createdAt: row.created_at,
      contentItemId: row.content_item_id,
      itemTitle: item?.title ?? null,
      itemFormat: item?.format ?? null,
    };
  });
}
