import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, PackageStatus } from "@/lib/supabase/types";
import { getCopywritingProvider } from "@/lib/ai/index";
import {
  FUNNEL_STAGE_LABELS,
  normalizeFunnelStage,
  type PackagePlatform,
} from "@/lib/ai/types";
import {
  buildCreativeSeed,
  type CreativeDirectives,
  pickCreativeDirectives,
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
import { canonicalWebsiteUrl } from "@/lib/knowledge/websiteUrl";
import { appendUrlToText, xUrlVariantIndices } from "@/lib/ai/websiteLinks";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  buildGenerateContentPackagePrompt,
  buildGeneratePackageSystem,
  type PreviousPackageAngle,
} from "@/lib/ai/prompts/generateContentPackage";
import {
  buildContentPackageSchema,
  type ContentPackageOutput,
} from "@/lib/ai/schemas/contentPackage";
import {
  loadProjectOrThrow,
  type WorkflowResult,
} from "@/lib/ai/workflows/shared";
import {
  buildPackageBrief,
  buildPersistableItems,
  buildVideoJobInput,
  loadAvailableAssets,
  loadStrategyItemContext,
  makePackageGuardrails,
  normalizeImagePrompts,
  type StrategyItemContext,
} from "@/lib/ai/workflows/packageShared";
import { buildAntiRepetitionMemory } from "@/lib/ai/workflows/antiRepetitionMemory";
import { ensureUniqueHook } from "@/lib/ai/workflows/regenerateHook";

export interface GenerateContentPackageInput {
  projectId: string;
  strategyItemId: string;
}

export interface ContentPackageData {
  packageId: string;
  status: PackageStatus;
  weeklyStrategyId: string;
  strategyItemId: string;
  funnelStage: string;
  contentItemIds: string[];
  videoJobId: string;
  // Set when the result is an EXISTING package returned by the idempotence
  // guard instead of a freshly generated one (no AI was run). The full AI
  // output is only present on a fresh generation.
  reused?: boolean;
  package?: ContentPackageOutput;
}

export async function runGenerateContentPackage(
  input: GenerateContentPackageInput,
  // Optional injected client. Frontend/RLS callers omit it and get the cookie-
  // bound server client; automation (n8n) callers pass the service-role admin
  // client so the same business logic runs without a user session.
  client?: SupabaseClient,
): Promise<WorkflowResult<ContentPackageData>> {
  const supabase: SupabaseClient = client ?? (await createSupabaseServerClient());

  // Idempotence guard (C1). A strategy item maps to AT MOST ONE content package.
  // If a package already exists for this (project, strategy item), return it
  // instead of running the (~160s) AI generation + insert again. This makes a
  // duplicate webhook delivery / n8n retry / re-trigger a safe no-op: no second
  // package, no second video job, no extra AI cost.
  const existingPackage = await loadExistingPackageData(
    supabase,
    input.projectId,
    input.strategyItemId,
  );
  if (existingPackage) {
    return { ok: true, data: existingPackage };
  }

  const project = await loadProjectOrThrow(supabase, input.projectId);
  const context = await loadStrategyItemContext(
    supabase,
    input.projectId,
    input.strategyItemId,
  );
  const assets = await loadAvailableAssets(supabase, input.projectId);
  // Phase 2E — recent hooks/topics/CTAs/scenarios fed into the prompt so the
  // model avoids repeating itself.
  const memory = await buildAntiRepetitionMemory(supabase, input.projectId);

  // Production Run V3: when this item was seeded by a production run, the run's
  // selected platforms + multipliers drive generation (incl. youtube / x and
  // text-output fan-out). Otherwise fall back to projects.platforms (existing
  // weekly-strategy-driven behavior — fully backwards compatible).
  const runInfo = context.productionRunId
    ? await loadRunGenerationPlan(supabase, input.projectId, context.productionRunId)
    : null;
  const runPlan = runInfo?.plan ?? null;

  const controls = parseContentControls(project.publishing_rules);

  // Respect projects.platforms: only generate/require/persist the package
  // surfaces the project selected (falls back to the full required set).
  const targetPlatforms = runPlan
    ? runPlan.targetPlatforms
    : resolvePackagePlatforms(project.platforms);

  // P3 runtime wiring — derive which selected platforms require video. A package
  // gets ONE shared video only when at least one selected platform is
  // video-typed; otherwise it is a text-only package and no video job.
  const videoPlatforms = runPlan
    ? runPlan.videoPlatforms
    : resolveVideoPackagePlatforms(
        project.platforms,
        controls.platformContentTypes,
      );
  const requireVideo = videoPlatforms.length > 0;

  // Multiplier Variants MVP-1 — how many outputs each platform must produce for
  // THIS package (run + package index). When > 1 the prompt asks for that many
  // distinct captions so fan-out persists real variants. Computed once here and
  // reused by persistNewPackage (same inputs => identical counts).
  const variantCounts =
    runPlan && context.productionRunId
      ? buildVariantCounts(
          targetPlatforms,
          videoPlatforms,
          runPlan.multipliers,
          context.packageIndex ?? 0,
        )
      : undefined;

  // Attention First V1 — resolve the creative directive ONCE here (no salt for
  // fresh generation) so the prompt, the storyboard role arc and the video job
  // input all share the SAME mode. Pure + deterministic: no AI call.
  const directives: CreativeDirectives = pickCreativeDirectives(
    buildCreativeSeed(
      FUNNEL_STAGE_LABELS[context.funnelStage],
      context.topic,
      context.angle,
    ),
  );

  // Run Package Diversity V1 — when this item belongs to a production run, give
  // the prompt a PACKAGE DIVERSITY block (this is package N of M, lead with a
  // distinct angle lens, and don't repeat sibling angles) so multiple packages
  // in one run take different angles. Prompt/context-only: no new AI call, no
  // new table. Omitted for legacy generation (prompt unchanged).
  const packageDiversity =
    runPlan && context.productionRunId && context.packageIndex !== null
      ? {
          packageIndex: context.packageIndex,
          packageCount: runInfo?.packageCount,
          angleLens: angleLensForIndex(context.packageIndex),
          // Pain Point First V1 — deterministically anchor THIS package to a
          // project pain point (cycled by index) and pick its primary/supporting
          // mode (80/20). Null when the project has no pain points → the focus
          // line is omitted and the block is unchanged.
          ...painPointFocusFields(project, context.packageIndex),
          previousAngles: await loadRunSiblingAngles(
            supabase,
            input.projectId,
            context.productionRunId,
            context.strategyItemId,
          ),
        }
      : undefined;

  const generated = await generateValidatedJson({
    textProvider: getCopywritingProvider(),
    system: buildGeneratePackageSystem(requireVideo),
    prompt: buildGenerateContentPackagePrompt({
      project,
      funnelStage: context.funnelStage,
      topic: context.topic,
      angle: context.angle,
      platform: context.platform,
      format: context.format,
      availableAssets: assets.refs,
      memory,
      targetPlatforms,
      requireVideo,
      videoPlatforms,
      variantCounts,
      directives,
      packageDiversity,
    }),
    validator: buildContentPackageSchema(targetPlatforms, { requireVideo }),
    guardrails: makePackageGuardrails({
      project,
      context,
      classById: assets.classById,
      requiredPlatforms: targetPlatforms,
      requireVideo,
    }),
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
    };
  }

  // Phase 2E — lightweight dedup: if the hook is identical to a recent one,
  // regenerate ONLY the hook (never the whole package).
  generated.value.hook = await ensureUniqueHook({
    hook: generated.value.hook,
    project,
    topic: context.topic,
    angle: context.angle,
    memory,
  });

  // MVP scene/image cost cap — drop empty prompts and cap to the supported max
  // BEFORE persistence, so the stored package_brief and the queued video job
  // both carry the exact render-ready list (≤5 generated stills per video).
  normalizeImagePrompts(generated.value, {
    workflow: "generate",
    strategy_item_id: context.strategyItemId,
  });

  const data = await persistNewPackage(
    supabase,
    input.projectId,
    context,
    generated.value,
    targetPlatforms,
    videoPlatforms,
    // Fan-out is enabled only for production-run items, using the run's
    // multipliers + this package's index. Non-run generation keeps 1 item per
    // platform (fanOut = null).
    runPlan && context.productionRunId
      ? {
          multipliers: runPlan.multipliers,
          packageIndex: context.packageIndex ?? 0,
          productionRunId: context.productionRunId,
        }
      : null,
    directives,
    canonicalWebsiteUrl(project),
  );

  return { ok: true, data };
}

// Pain Point First V1 — resolves the deterministic pain-point focus for a run
// package index into the PackageDiversitySpec fields. Returns an empty object
// (no fields) when the project has no pain points, so the diversity block is
// unchanged for those projects.
function painPointFocusFields(
  project: Parameters<typeof normalizePainPoints>[0],
  packageIndex: number,
): { painPoint?: string; painPointMode?: "primary" | "supporting" } {
  const focus = painPointFocusForIndex(
    normalizePainPoints(project),
    packageIndex,
  );
  if (!focus) return {};
  return { painPoint: focus.painPoint, painPointMode: focus.mode };
}

// Multiplier Variants MVP-1 — outputs each platform produces for THIS package
// (run + package index). Mirrors the persist-time fan-out math so the prompt
// asks for exactly as many distinct captions as will be persisted. Video
// platforms are always 1 (single shared video); only text platforms with a
// multiplier > 1 yield > 1 here.
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

// Reads a production run's stored config and resolves it into the generation
// plan (target platforms, video platforms, per-platform multipliers). Returns
// null when the run / config is missing so generation safely falls back to the
// project's platforms.
async function loadRunGenerationPlan(
  supabase: SupabaseClient,
  projectId: string,
  runId: string,
): Promise<{
  plan: ReturnType<typeof resolveRunGenerationPlan>;
  // Total packages requested in the run (M in "package N of M"). Used only by
  // the PACKAGE DIVERSITY prompt block.
  packageCount: number;
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
    ? { plan, packageCount: config.packageCount }
    : null;
}

// Run Package Diversity V1 — loads a compact list of the angles already used by
// SIBLING packages in the same production run, so the prompt can say "do not
// repeat these". Reuses EXISTING rows only (strategy items tagged with the run
// in their brief + their content_packages' title/hook) — no new table, no AI
// call. Best-effort: any error yields an empty list so generation is never
// blocked by this enrichment.
const SIBLING_ANGLE_LIMIT = 12;
async function loadRunSiblingAngles(
  supabase: SupabaseClient,
  projectId: string,
  productionRunId: string,
  currentStrategyItemId: string,
): Promise<PreviousPackageAngle[]> {
  try {
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
  } catch {
    return [];
  }
}

// Idempotence lookup: the existing package for (project, strategy item), if any.
// Returns the same shape the n8n bridge needs (packageId + videoJobId for the
// follow-up start-video-job call) so a duplicate request resolves to the
// existing work. When duplicate rows already exist (legacy data), the OLDEST is
// treated as canonical so the result is deterministic.
async function loadExistingPackageData(
  supabase: SupabaseClient,
  projectId: string,
  strategyItemId: string,
): Promise<ContentPackageData | null> {
  const { data: pkg, error } = await supabase
    .from("content_packages")
    .select("id, status, weekly_strategy_id, strategy_item_id, funnel_stage")
    .eq("project_id", projectId)
    .eq("strategy_item_id", strategyItemId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!pkg) return null;

  const packageId = pkg.id as string;

  const { data: items, error: itemErr } = await supabase
    .from("content_items")
    .select("id")
    .eq("project_id", projectId)
    .eq("package_id", packageId)
    .is("language", null);
  if (itemErr) throw itemErr;
  const contentItemIds = (items ?? []).map((r) => r.id as string);

  return {
    packageId,
    status: (pkg.status as PackageStatus | null) ?? "draft",
    weeklyStrategyId: (pkg.weekly_strategy_id as string | null) ?? "",
    strategyItemId: (pkg.strategy_item_id as string | null) ?? strategyItemId,
    funnelStage: (pkg.funnel_stage as string | null) ?? "",
    contentItemIds,
    videoJobId: await loadLatestVideoJobId(supabase, projectId, contentItemIds),
    reused: true,
  };
}

// The most recent video_jobs id for a package's content items (any status), or
// "" when none exists. video_jobs has no content_package_id column, so it is
// resolved via the package's content items.
async function loadLatestVideoJobId(
  supabase: SupabaseClient,
  projectId: string,
  contentItemIds: string[],
): Promise<string> {
  if (contentItemIds.length === 0) return "";
  const { data, error } = await supabase
    .from("video_jobs")
    .select("id")
    .eq("project_id", projectId)
    .in("content_item_id", contentItemIds)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.id as string | undefined) ?? "";
}

// Production-run fan-out: how many content_items each text platform produces
// for THIS package + the run tag/index stamped onto every row.
interface PackageFanOut {
  multipliers: Record<string, number>;
  packageIndex: number;
  productionRunId: string;
}

async function persistNewPackage(
  supabase: SupabaseClient,
  projectId: string,
  context: StrategyItemContext,
  pkg: ContentPackageOutput,
  targetPlatforms?: readonly string[],
  // Package platforms that require video. Empty = text-only package: no video
  // job is created. Defaults to undefined (treated as "no video platforms").
  videoPlatforms?: readonly PackagePlatform[],
  // When set, text platforms fan out to multiple content_items per the run's
  // multipliers and every row is tagged with the run + package + variant index.
  // null = legacy behavior: exactly one content_item per platform.
  fanOut?: PackageFanOut | null,
  // Attention First V1 — the resolved creative directive. Its mode's narrative
  // beats are stamped onto the video job input so the worker's storyboard role
  // arc follows the mode.
  directives?: CreativeDirectives,
  // Website URL & CTA Usage V1 — the project's canonical website URL, threaded
  // in so the deterministic CTA post-process can run without re-loading the
  // project. null = no URL / no append (legacy behavior).
  websiteUrl: string | null = null,
): Promise<ContentPackageData> {
  // Normalize the AI label/value to the canonical DB funnel stage. Guardrails
  // already guarantee it normalizes and matches the strategy item.
  const funnelStage = normalizeFunnelStage(pkg.funnel_stage) ?? context.funnelStage;

  // Content package is created as draft. weekly_strategy_id and funnel_stage
  // are persisted as first-class columns (migration 008).
  const { data: packageRow, error: pkgErr } = await supabase
    .from("content_packages")
    .insert({
      project_id: projectId,
      strategy_item_id: context.strategyItemId,
      weekly_strategy_id: context.weeklyStrategyId,
      funnel_stage: funnelStage,
      title: pkg.title,
      status: "draft",
      package_brief: buildPackageBrief(pkg),
    })
    .select("id")
    .single();
  if (pkgErr) {
    // Durable idempotence (Task 2). The partial unique index
    // uniq_content_packages_strategy_item (migration 013) guarantees one
    // package per strategy_item_id. A concurrent generation that lost the race
    // (both passed the pre-check, both ran the AI, both tried to insert) lands
    // here on a 23505 unique violation. Return the package the winner created
    // instead of failing — so a concurrent retry resolves to ONE package, no
    // duplicate content_items / video_jobs. No items/video job were inserted
    // for the loser yet, so there is nothing to clean up.
    if (isUniqueViolation(pkgErr)) {
      const existing = await loadExistingPackageData(
        supabase,
        projectId,
        context.strategyItemId,
      );
      if (existing) return existing;
    }
    throw pkgErr;
  }
  const packageId = packageRow.id as string;

  // Persistable platform outputs -> content_items. Each platform yields ONE
  // base item; with a production-run fan-out, TEXT platforms are expanded into
  // multiple content_items (e.g. X ×3 → 3 rows) while VIDEO platforms keep a
  // single row (one shared package video). Every produced row is distinguished
  // by platform_variant_index and tagged with the run + package index.
  const videoPlatformSet = new Set<string>(videoPlatforms ?? []);
  const itemRows = buildPersistableItems(
    pkg,
    context,
    targetPlatforms,
    websiteUrl,
  ).flatMap(
    (item) => {
      const kind = videoPlatformSet.has(item.platform) ? "video" : "text";
      const count = fanOut
        ? outputsForPackageIndex(
            kind,
            fanOut.multipliers[item.platform] ?? 1,
            fanOut.packageIndex,
          )
        : 1;
      // Multiplier Variants MVP-1 — distinct caption per output. The model
      // returns caption_variants for fanned-out platforms; pick the variant for
      // this index, falling back to the base caption when the model returned
      // fewer variants than requested (so a row is never empty).
      const variants = pkg.platform_outputs?.[item.platform]?.caption_variants;
      const captionFor = (variantIndex: number): string => {
        const candidate = Array.isArray(variants)
          ? variants[variantIndex]
          : undefined;
        return typeof candidate === "string" && candidate.trim().length > 0
          ? candidate.trim()
          : item.caption;
      };
      // X Native Variants — distinct title per output, generated alongside the
      // caption variants. Falls back to the package base title when the model
      // returned fewer title_variants than requested (so a row is never empty).
      const titleVariants =
        pkg.platform_outputs?.[item.platform]?.title_variants;
      const titleFor = (variantIndex: number): string => {
        const candidate = Array.isArray(titleVariants)
          ? titleVariants[variantIndex]
          : undefined;
        return typeof candidate === "string" && candidate.trim().length > 0
          ? candidate.trim()
          : pkg.title;
      };
      // X URL Distribution V1 — for an X batch of `count` variants, a controlled
      // minority of CAPTIONS (never titles) get the canonical URL appended. The
      // indices are spread evenly so URL variants are not adjacent. Other
      // platforms are unaffected (their CTA append already ran in
      // buildPersistableItems; X is excluded there by design).
      const xUrlIndices =
        item.platform === "x" && websiteUrl
          ? xUrlVariantIndices(count, funnelStage)
          : null;
      const captionWithUrl = (variantIndex: number): string => {
        const base = captionFor(variantIndex);
        return xUrlIndices?.has(variantIndex)
          ? appendUrlToText(base, websiteUrl)
          : base;
      };
      return Array.from({ length: count }, (_unused, variantIndex) => ({
        project_id: projectId,
        package_id: packageId,
        platform: item.platform,
        format: item.format,
        status: "draft" as const,
        title: titleFor(variantIndex),
        body: pkg.voiceover_text,
        caption: captionWithUrl(variantIndex),
        hashtags: item.hashtags,
        cta: item.cta,
        generation_metadata: {
          funnel_stage: funnelStage,
          source: "creative_engine",
          ...(fanOut
            ? {
                production_run_id: fanOut.productionRunId,
                package_index: fanOut.packageIndex,
                platform_variant_index: variantIndex,
              }
            : {}),
        } as unknown as Json,
      }));
    },
  );

  const { data: insertedItems, error: itemErr } = await supabase
    .from("content_items")
    .insert(itemRows)
    .select("id, platform");
  if (itemErr) throw itemErr;
  const inserted = (insertedItems ?? []) as { id: string; platform: string }[];
  const contentItemIds = inserted.map((r) => r.id);
  const primaryItemId = contentItemIds[0] ?? null;

  // Video job is created ONLY when at least one selected platform requires
  // video. It is a single shared package video linked to the primary VIDEO
  // platform's content item (MVP: one video per package, not per platform).
  // Text-only packages skip video entirely and remain valid.
  const requireVideo = videoPlatformSet.size > 0;
  let videoJobId = "";
  if (requireVideo) {
    const videoItemId =
      inserted.find((r) => videoPlatformSet.has(r.platform))?.id ??
      primaryItemId;
    const videoInput = await buildVideoJobInput(
      supabase,
      projectId,
      pkg,
      directives
        ? {
            creative_mode: directives.mode.id,
            creative_mode_beats: directives.mode.narrativeBeats,
          }
        : {},
    );
    const { data: videoRow, error: videoErr } = await supabase
      .from("video_jobs")
      .insert({
        project_id: projectId,
        content_item_id: videoItemId,
        provider: "video_engine",
        status: "queued",
        input: videoInput,
      })
      .select("id")
      .single();
    if (videoErr) throw videoErr;
    videoJobId = videoRow.id as string;
  }

  // Record asset_usage for referenced assets (linked to the primary item; the
  // primary item exists whether or not the package has video).
  await recordAssetUsage(supabase, projectId, primaryItemId, pkg);

  return {
    packageId,
    status: "draft",
    weeklyStrategyId: context.weeklyStrategyId,
    strategyItemId: context.strategyItemId,
    funnelStage,
    contentItemIds,
    videoJobId,
    package: pkg,
  };
}

// PostgreSQL unique_violation (SQLSTATE 23505), surfaced by PostgREST as
// error.code. Used to turn a concurrent insert race on the strategy_item_id
// unique index into an idempotent "return the existing package" outcome.
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export async function recordAssetUsage(
  supabase: SupabaseClient,
  projectId: string,
  contentItemId: string | null,
  pkg: ContentPackageOutput,
): Promise<void> {
  const usage = pkg.asset_usage ?? [];
  if (usage.length === 0) return;
  const rows = usage.map((u) => ({
    project_id: projectId,
    asset_id: u.asset_id,
    content_item_id: contentItemId,
    used_as: u.used_as,
    metadata: { modify: u.modify ?? "false" } as unknown as Json,
  }));
  const { error } = await supabase.from("asset_usage").insert(rows);
  if (error) throw error;
}
