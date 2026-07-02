/**
 * Read-only context loader mirroring generateContentPackage prompt inputs.
 * No writes, no n8n, no runGenerateContentPackage.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project } from "@/lib/supabase/types";
import {
  FUNNEL_STAGE_LABELS,
  normalizeFunnelStage,
} from "@/lib/ai/types";
import {
  buildCreativeSeed,
  pickCreativeDirectives,
  type CreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import {
  parseContentControls,
  resolvePackagePlatforms,
  resolveVideoPackagePlatforms,
} from "@/lib/projects/contentControls";
import {
  angleLensForIndex,
  normalizeProductionConfig,
  outputsForPackageIndex,
  painPointFocusForIndex,
  resolveRunGenerationPlan,
} from "@/lib/projects/productionRun";
import { normalizePainPoints } from "@/lib/ai/prompts/context";
import {
  buildRecentAssetUsageBlock,
  loadRecentAssetUsageContext,
} from "@/lib/assets/loadRecentAssetUsage";
import type { GenerateContentPackagePromptInput } from "@/lib/ai/prompts/generateContentPackage";
import type { PreviousPackageAngle } from "@/lib/ai/prompts/generateContentPackage";
import {
  DEFAULT_GENERATION_MODE,
  resolveGenerationMode,
  type GenerationMode,
} from "@/lib/ai/generationMode";
import { resolvePackageAssetCoverage } from "@/lib/assets/assetCoveragePolicy";
import { buildAntiRepetitionMemory } from "@/lib/ai/workflows/antiRepetitionMemory";
import { loadProjectOrThrow } from "@/lib/ai/workflows/shared";
import {
  loadAvailableAssets,
  loadStrategyItemContext,
  type StrategyItemContext,
} from "@/lib/ai/workflows/packageShared";

export interface ExperimentItemContext {
  strategyItemId: string;
  context: StrategyItemContext;
  promptInput: GenerateContentPackagePromptInput;
  directives: CreativeDirectives;
  requireVideo: boolean;
  targetPlatforms: readonly string[];
}

const SIBLING_ANGLE_LIMIT = 12;

async function loadRunGenerationPlan(
  supabase: SupabaseClient,
  projectId: string,
  runId: string,
): Promise<{
  plan: ReturnType<typeof resolveRunGenerationPlan>;
  packageCount: number;
  generationMode: GenerationMode;
  packagesWithAssetSupport: number;
} | null> {
  const { data, error } = await supabase
    .from("production_runs")
    .select("requested_config")
    .eq("id", runId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const stored = data.requested_config as { config?: unknown } | null;
  const rawConfig = stored && typeof stored === "object" ? stored.config : null;
  if (!rawConfig) return null;

  const config = normalizeProductionConfig(rawConfig);
  const plan = resolveRunGenerationPlan(config);
  return plan.targetPlatforms.length > 0
    ? {
        plan,
        packageCount: config.packageCount,
        generationMode: config.generationMode ?? DEFAULT_GENERATION_MODE,
        packagesWithAssetSupport: config.packagesWithAssetSupport ?? 0,
      }
    : null;
}

async function loadRunSiblingAngles(
  supabase: SupabaseClient,
  projectId: string,
  productionRunId: string,
  currentStrategyItemId: string,
): Promise<PreviousPackageAngle[]> {
  const { data: items, error: itemsErr } = await supabase
    .from("content_strategy_items")
    .select("id, brief")
    .eq("project_id", projectId)
    .eq("brief->>production_run_id", productionRunId);
  if (itemsErr || !items) return [];

  const topicByItemId = new Map<string, string>();
  const siblingItemIds: string[] = [];
  for (const row of items) {
    const id = row.id as string;
    if (!id || id === currentStrategyItemId) continue;
    siblingItemIds.push(id);
    const brief = (row.brief ?? {}) as Record<string, unknown>;
    const topic = typeof brief.topic === "string" ? brief.topic.trim() : "";
    if (topic) topicByItemId.set(id, topic);
  }
  if (siblingItemIds.length === 0) return [];

  const { data: pkgs, error: pkgErr } = await supabase
    .from("content_packages")
    .select("title, package_brief, strategy_item_id, created_at")
    .eq("project_id", projectId)
    .in("strategy_item_id", siblingItemIds)
    .order("created_at", { ascending: true })
    .limit(SIBLING_ANGLE_LIMIT);
  if (pkgErr || !pkgs) return [];

  const angles: PreviousPackageAngle[] = [];
  for (const row of pkgs) {
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) continue;
    const brief = (row.package_brief ?? {}) as Record<string, unknown>;
    const hook = typeof brief.hook === "string" ? brief.hook.trim() : null;
    const topic = topicByItemId.get(row.strategy_item_id as string) ?? null;
    angles.push({ title, hook, topic });
  }
  return angles;
}

function painPointFocusFields(
  project: Project,
  packageIndex: number,
): { painPoint?: string; painPointMode?: "primary" | "supporting" } {
  const focus = painPointFocusForIndex(
    normalizePainPoints(project),
    packageIndex,
  );
  if (!focus) return {};
  return { painPoint: focus.painPoint, painPointMode: focus.mode };
}

function buildVariantCounts(
  targetPlatforms: readonly string[],
  videoPlatforms: readonly string[],
  multipliers: Record<string, number>,
  packageIndex: number,
): Record<string, number> {
  const videoSet = new Set<string>(videoPlatforms);
  const counts: Record<string, number> = {};
  for (const platform of targetPlatforms) {
    const kind = videoSet.has(platform) ? "video" : "text";
    counts[platform] = outputsForPackageIndex(
      kind,
      multipliers[platform] ?? 1,
      packageIndex,
    );
  }
  return counts;
}

export async function loadExperimentItemContext(
  supabase: SupabaseClient,
  projectId: string,
  strategyItemId: string,
  generationModeOverride?: GenerationMode,
): Promise<ExperimentItemContext> {
  const project = await loadProjectOrThrow(supabase, projectId);
  const context = await loadStrategyItemContext(
    supabase,
    projectId,
    strategyItemId,
  );
  const assets = await loadAvailableAssets(supabase, projectId);
  const recentAssetUsageBlock = buildRecentAssetUsageBlock(
    await loadRecentAssetUsageContext(supabase, projectId),
  );
  const memory = await buildAntiRepetitionMemory(supabase, projectId);

  const runInfo = context.productionRunId
    ? await loadRunGenerationPlan(supabase, projectId, context.productionRunId)
    : null;
  const runPlan = runInfo?.plan ?? null;

  const controls = parseContentControls(project.publishing_rules);
  const targetPlatforms = runPlan
    ? runPlan.targetPlatforms
    : resolvePackagePlatforms(project.platforms);
  const videoPlatforms = runPlan
    ? runPlan.videoPlatforms
    : resolveVideoPackagePlatforms(
        project.platforms,
        controls.platformContentTypes,
      );
  const requireVideo = videoPlatforms.length > 0;

  const variantCounts =
    runPlan && context.productionRunId
      ? buildVariantCounts(
          targetPlatforms,
          videoPlatforms,
          runPlan.multipliers,
          context.packageIndex ?? 0,
        )
      : undefined;

  const directives = pickCreativeDirectives(
    buildCreativeSeed(
      FUNNEL_STAGE_LABELS[context.funnelStage],
      context.topic,
      context.angle,
    ),
  );

  const packageDiversity =
    runPlan && context.productionRunId && context.packageIndex !== null
      ? {
          packageIndex: context.packageIndex,
          packageCount: runInfo?.packageCount,
          angleLens: angleLensForIndex(context.packageIndex),
          ...painPointFocusFields(project, context.packageIndex),
          previousAngles: await loadRunSiblingAngles(
            supabase,
            projectId,
            context.productionRunId,
            strategyItemId,
          ),
        }
      : undefined;

  const generationMode = resolveGenerationMode(
    generationModeOverride,
    runInfo?.generationMode,
  );

  const assetCoverage = resolvePackageAssetCoverage({
    generationMode,
    funnelStage: context.funnelStage,
    packageIndex: context.packageIndex,
    packageCount: runInfo?.packageCount ?? null,
    availableAssets: assets.refs,
  });

  const promptInput: GenerateContentPackagePromptInput = {
    project,
    funnelStage: normalizeFunnelStage(context.funnelStage) ?? context.funnelStage,
    topic: context.topic,
    angle: context.angle,
    platform: context.platform,
    format: context.format,
    availableAssets: assets.refs,
    memory,
    recentAssetUsageBlock,
    targetPlatforms,
    requireVideo,
    videoPlatforms,
    variantCounts,
    directives,
    packageDiversity,
    generationMode,
    assetCoverage,
  };

  return {
    strategyItemId,
    context,
    promptInput,
    directives,
    requireVideo,
    targetPlatforms,
  };
}

export async function loadRecentStrategyItemIds(
  supabase: SupabaseClient,
  projectId: string,
  limit: number,
): Promise<string[]> {
  const capped = Math.min(21, Math.max(1, limit));
  const { data, error } = await supabase
    .from("content_strategy_items")
    .select("id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(capped);
  if (error) throw error;
  return (data ?? []).map((r) => r.id as string);
}
