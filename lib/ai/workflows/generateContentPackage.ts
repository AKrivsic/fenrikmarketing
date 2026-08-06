import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json, PackageStatus } from "@/lib/supabase/types";
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
  normalizeProductionConfig,
  outputsForPackageIndex,
  resolveRunGenerationPlan,
} from "@/lib/projects/productionRun";
import { canonicalWebsiteUrl } from "@/lib/knowledge/websiteUrl";
import { appendUrlToText, xUrlVariantIndices } from "@/lib/ai/websiteLinks";
import {
  buildGenerationTelemetryDocument,
  getTelemetryCollector,
  runWithTelemetrySession,
  withTelemetry,
} from "@/lib/ai/telemetry";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import {
  loadProjectOrThrow,
  WorkflowError,
  type WorkflowResult,
} from "@/lib/ai/workflows/shared";
import { classifyGenerationThrow } from "@/lib/ai/workflows/generationTerminal";
import {
  buildPackageBrief,
  buildPersistableItems,
  buildVideoJobInput,
  loadAvailableAssets,
  loadStrategyItemContext,
  type StrategyItemContext,
} from "@/lib/ai/workflows/packageShared";
import { derivePromptPresentationTypes } from "@/lib/scene-types/presentation/promptPresentationTypes";
import { assetSignalsFromRef } from "@/lib/scene-types/presentation/projectSignals";
import { buildAntiRepetitionMemory } from "@/lib/ai/workflows/antiRepetitionMemory";
import { attentionFieldsForVideoJob } from "@/lib/attention/promptBlocks";
import { planRequiresVideo } from "@/lib/api/packageReconcileStatus";
import { generateAndPersistPackageSocialImage } from "@/lib/content-package/generateSocialImage";
import {
  claimPackageGeneration,
  newOwnerToken,
  releasePackageGenerationClaim,
  startPackageGenerationHeartbeat,
  PackageGenerationClaimLostError,
  persistActiveCollectorFailureTelemetry,
  lookupProductionRunItemId,
  runtimeLog,
} from "@/lib/production-runtime";
import {
  DEFAULT_GENERATION_MODE,
  resolveGenerationMode,
  type GenerationMode,
} from "@/lib/ai/generationMode";
import { resolvePackageAssetCoverage } from "@/lib/assets/assetCoveragePolicy";
import { resolvePreferredVideoUsageFromRef } from "@/lib/assets/preferredVideoUsage";
import { collectAssetUsageFromPackage } from "@/lib/content-package/visualScenePlan";
import { runCreativePipeline } from "@/lib/content-pipeline/runCreativePipeline";

export interface GenerateContentPackageInput {
  projectId: string;
  strategyItemId: string;
  /** When omitted, resolved from the production run config or defaults to production. */
  generationMode?: GenerationMode;
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
  try {
    const { result } = await runWithTelemetrySession(() =>
      runGenerateContentPackageUnchecked(input, client),
    );
    return result;
  } catch (err) {
    // Precondition / auth-style errors stay thrown for HTTP mapping.
    if (err instanceof WorkflowError) throw err;
    // Sprint 5.3 — every other throw becomes a terminal, settleable failure.
    return classifyGenerationThrow(err);
  }
}

async function runGenerateContentPackageUnchecked(
  input: GenerateContentPackageInput,
  client?: SupabaseClient,
): Promise<WorkflowResult<ContentPackageData>> {
  // Lazy-load the Next.js cookie client only when no client was injected.
  // Content-package-worker (plain Node) always passes the admin client; a
  // static import of @/lib/supabase/server would pull in next/headers and fail.
  let supabase: SupabaseClient;
  if (client) {
    supabase = client;
  } else {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    supabase = await createSupabaseServerClient();
  }

  // Idempotence guard (C1). A strategy item maps to AT MOST ONE content package.
  // If a package already exists for this (project, strategy item), return it
  // instead of running the (~160s) AI generation + insert again. This makes a
  // duplicate webhook delivery / n8n retry / re-trigger a safe no-op: no second
  // package, no second video job, no extra AI cost.
  //
  // When the existing package is video-required but has no video_jobs row,
  // attempt an idempotent heal (insert missing job) — never return text_only
  // success and never regenerate Claude for that case.
  const existingPackage = await loadExistingPackageData(
    supabase,
    input.projectId,
    input.strategyItemId,
  );
  if (existingPackage) {
    if (existingPackage.videoJobId) {
      return { ok: true, data: existingPackage };
    }
    const healed = await healMissingVideoJobIfRequired(
      supabase,
      input.projectId,
      existingPackage,
    );
    if (healed.ok === false) {
      return healed;
    }
    return { ok: true, data: healed.data };
  }

  // Invariant 1 — exclusive ownership before any paid Creative Engine / Presentation work.
  const generationOwnerToken = newOwnerToken();
  const claim = await claimPackageGeneration(supabase, {
    projectId: input.projectId,
    strategyItemId: input.strategyItemId,
    ownerToken: generationOwnerToken,
  });
  if (claim.status === "existing_package") {
    runtimeLog("info", {
      event: "package_claim_acquired",
      project_id: input.projectId,
      strategy_item_id: input.strategyItemId,
      package_id: claim.packageId,
      outcome: "existing_package",
    });
    const raced = await loadExistingPackageData(
      supabase,
      input.projectId,
      input.strategyItemId,
    );
    if (raced) {
      return { ok: true, data: { ...raced, reused: true } };
    }
  }
  if (claim.status === "busy") {
    runtimeLog("info", {
      event: "package_claim_busy",
      project_id: input.projectId,
      strategy_item_id: input.strategyItemId,
      owner_token: claim.ownerToken,
      outcome: "busy",
    });
    return {
      ok: false,
      error: "generation_in_progress",
      validationErrors: [
        {
          path: "strategy_item_id",
          message:
            "another worker holds the package-generation claim for this strategy item",
        },
      ],
      attempts: 0,
    };
  }

  runtimeLog("info", {
    event: "package_claim_acquired",
    project_id: input.projectId,
    strategy_item_id: input.strategyItemId,
    owner_token: generationOwnerToken,
    outcome: "claimed",
  });

  const heartbeat = startPackageGenerationHeartbeat(supabase, {
    strategyItemId: input.strategyItemId,
    ownerToken: generationOwnerToken,
    projectId: input.projectId,
    phase: "after_claim",
  });

  try {
    runtimeLog("info", {
      event: "package_generation_start",
      project_id: input.projectId,
      strategy_item_id: input.strategyItemId,
      owner_token: generationOwnerToken,
      outcome: "start",
    });
    const result = await runGenerateContentPackageAfterClaim(
      input,
      supabase,
      generationOwnerToken,
      heartbeat,
    );
    if (!result.ok) {
      runtimeLog("warn", {
        event: "package_generation_fail",
        project_id: input.projectId,
        strategy_item_id: input.strategyItemId,
        owner_token: generationOwnerToken,
        outcome: result.error,
      });
      // Persist paid steps so failed attempts never lose cost accounting.
      try {
        const context = await loadStrategyItemContext(
          supabase,
          input.projectId,
          input.strategyItemId,
        ).catch(() => null);
        const productionRunId = context?.productionRunId ?? null;
        const productionRunItemId =
          productionRunId
            ? await lookupProductionRunItemId(supabase, {
                productionRunId,
                strategyItemId: input.strategyItemId,
              })
            : null;
        await persistActiveCollectorFailureTelemetry(supabase, {
          projectId: input.projectId,
          strategyItemId: input.strategyItemId,
          productionRunId,
          productionRunItemId,
          ownerToken: generationOwnerToken,
          phase: "package_generation_failed",
          terminalClassification: result.error,
          errorTruncated: result.validationErrors
            ?.map((e) => `${e.path}: ${e.message}`)
            .slice(0, 5)
            .join("; "),
          attemptCount: result.attempts,
          validationErrors: result.validationErrors,
          outputRaw: result.lastRaw ?? null,
        });
      } catch {
        // Telemetry must never fail the generation path.
      }
    } else {
      runtimeLog("info", {
        event: "package_generation_end",
        project_id: input.projectId,
        strategy_item_id: input.strategyItemId,
        package_id: result.data.packageId,
        owner_token: generationOwnerToken,
        outcome: "ok",
      });
    }
    return result;
  } catch (err) {
    if (err instanceof PackageGenerationClaimLostError) {
      await persistActiveCollectorFailureTelemetry(supabase, {
        projectId: input.projectId,
        strategyItemId: input.strategyItemId,
        ownerToken: generationOwnerToken,
        phase: "claim_heartbeat",
        terminalClassification: "generation_claim_lost",
        errorTruncated: err.message,
      }).catch(() => undefined);
      return {
        ok: false,
        error: "generation_claim_lost",
        validationErrors: [
          {
            path: "strategy_item_id",
            message: err.message,
          },
        ],
        attempts: 0,
      };
    }
    throw err;
  } finally {
    heartbeat.stop();
    await releasePackageGenerationClaim(supabase, {
      strategyItemId: input.strategyItemId,
      ownerToken: generationOwnerToken,
      finalStatus: "released",
    }).catch((err) => {
      runtimeLog("warn", {
        event: "package_claim_released",
        strategy_item_id: input.strategyItemId,
        owner_token: generationOwnerToken,
        outcome: "release_failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    });
    runtimeLog("info", {
      event: "package_claim_released",
      strategy_item_id: input.strategyItemId,
      owner_token: generationOwnerToken,
      outcome: "released",
    });
  }
}

async function runGenerateContentPackageAfterClaim(
  input: GenerateContentPackageInput,
  supabase: SupabaseClient,
  generationOwnerToken: string,
  heartbeat: {
    assertOwned: (phase: string) => void;
    isLost: () => boolean;
  },
): Promise<WorkflowResult<ContentPackageData>> {
  heartbeat.assertOwned("load_context");
  const project = await loadProjectOrThrow(supabase, input.projectId);
  const context = await loadStrategyItemContext(
    supabase,
    input.projectId,
    input.strategyItemId,
  );
  const assets = await loadAvailableAssets(supabase, input.projectId);
  const memory = await buildAntiRepetitionMemory(supabase, input.projectId);

  const runInfo = context.productionRunId
    ? await loadRunGenerationPlan(supabase, input.projectId, context.productionRunId)
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

  const directives: CreativeDirectives = pickCreativeDirectives(
    buildCreativeSeed(
      FUNNEL_STAGE_LABELS[context.funnelStage],
      context.topic,
      context.angle,
    ),
  );

  const generationMode = resolveGenerationMode(
    input.generationMode,
    runInfo?.generationMode,
  );

  const preferredVideoUsageById = new Map(
    assets.refs.map((ref) => [ref.id, resolvePreferredVideoUsageFromRef(ref)]),
  );

  const assetCoverage = resolvePackageAssetCoverage({
    generationMode,
    funnelStage: context.funnelStage,
    packageIndex: context.packageIndex,
    packageCount: runInfo?.packageCount ?? null,
    availableAssets: assets.refs,
  });

  const promptPresentationTypes = derivePromptPresentationTypes({
    projectId: input.projectId,
    project,
    assets: assets.refs.map((ref) => assetSignalsFromRef(ref)),
  });

  heartbeat.assertOwned("creative_pipeline");
  const creative = await runCreativePipeline(supabase, {
    project,
    context,
    assets,
    memory,
    targetPlatforms,
    videoPlatforms,
    requireVideo,
    variantCounts,
    packageIndex: context.packageIndex,
    packageCount: runInfo?.packageCount ?? null,
    generationMode,
    assetCoverage,
    preferredVideoUsageById: requireVideo ? preferredVideoUsageById : undefined,
    directives,
  });
  if (!creative.ok) {
    return creative;
  }

  const pkg = creative.data.package;
  const pg =
    pkg.presentation_generation &&
    typeof pkg.presentation_generation === "object" &&
    !Array.isArray(pkg.presentation_generation)
      ? (pkg.presentation_generation as Record<string, unknown>)
      : {};
  pkg.presentation_generation = {
    ...pg,
    prompt_presentation_types: promptPresentationTypes,
    generation_telemetry: buildGenerationTelemetryDocument({
      legacy: {
        strategy_item_id: context.strategyItemId,
        production_run_id: context.productionRunId ?? null,
        pipeline: "content_pipeline",
        phases: [],
      },
      steps: getTelemetryCollector()?.snapshot() ?? [],
    }),
  };

  const data = await withTelemetry(
    {
      stepName: "Persist Package",
      provider: "deterministic",
      inputSummary:
        "Persist Package input:\n- Validated package\n- Content items fan-out plan",
      outputSummary: (d) =>
        `packageId=${d.packageId}; items=${d.contentItemIds?.length ?? 0}`,
      measureOutput: (d) => ({
        packageId: d.packageId,
        contentItemIds: d.contentItemIds,
        videoJobId: d.videoJobId,
      }),
    },
    () =>
      persistNewPackage(
        supabase,
        input.projectId,
        context,
        pkg,
        targetPlatforms,
        videoPlatforms,
        runPlan && context.productionRunId
          ? {
              multipliers: runPlan.multipliers,
              packageIndex: context.packageIndex ?? 0,
              productionRunId: context.productionRunId,
            }
          : null,
        creative.data.directives,
        canonicalWebsiteUrl(project),
      ),
  );

  // Shared FB/LI 1:1 social image — soft-fail; never blocks package/video/copy.
  await generateAndPersistPackageSocialImage({
    supabase,
    projectId: input.projectId,
    packageId: data.packageId,
    pkg,
    targetPlatforms,
  });

  try {
    const finalSteps = getTelemetryCollector()?.snapshot() ?? [];
    const { data: briefRow } = await supabase
      .from("content_packages")
      .select("package_brief")
      .eq("id", data.packageId)
      .eq("project_id", input.projectId)
      .maybeSingle();
    const brief =
      briefRow?.package_brief &&
      typeof briefRow.package_brief === "object" &&
      !Array.isArray(briefRow.package_brief)
        ? (briefRow.package_brief as Record<string, unknown>)
        : null;
    const existingPg =
      brief?.presentation_generation &&
      typeof brief.presentation_generation === "object" &&
      !Array.isArray(brief.presentation_generation)
        ? (brief.presentation_generation as Record<string, unknown>)
        : null;
    if (brief && existingPg) {
      const nextBrief = {
        ...brief,
        presentation_generation: {
          ...existingPg,
          generation_telemetry: buildGenerationTelemetryDocument({
            legacy:
              existingPg.generation_telemetry &&
              typeof existingPg.generation_telemetry === "object" &&
              !Array.isArray(existingPg.generation_telemetry)
                ? (existingPg.generation_telemetry as Record<string, unknown>)
                : {},
            steps: finalSteps,
          }),
        },
      };
      await supabase
        .from("content_packages")
        .update({ package_brief: nextBrief })
        .eq("id", data.packageId)
        .eq("project_id", input.projectId);
    }
  } catch {
    // Telemetry patch is non-critical.
  }

  return { ok: true, data };
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

/** Read HOOK/SETUP/ESCALATION/RESOLUTION roles from package_brief persistence. */
function readNarrativeBeatRolesFromPackage(
  pkg: ContentPackageOutput,
): string[] | undefined {
  const pg = pkg.presentation_generation;
  if (!pg || typeof pg !== "object" || Array.isArray(pg)) return undefined;
  const nb = (pg as Record<string, unknown>).narrative_beats;
  if (!nb || typeof nb !== "object" || Array.isArray(nb)) return undefined;
  const beats = (nb as Record<string, unknown>).beats;
  if (!Array.isArray(beats)) return undefined;
  const roles = beats
    .map((b) => {
      if (
        b &&
        typeof b === "object" &&
        !Array.isArray(b) &&
        typeof (b as Record<string, unknown>).role === "string"
      ) {
        return ((b as Record<string, unknown>).role as string).trim();
      }
      return "";
    })
    .filter((r) => r.length > 0);
  return roles.length > 0 ? roles : undefined;
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

  const narrativeBeatRoles = readNarrativeBeatRolesFromPackage(pkg);

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
          source: "content_pipeline",
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
    try {
      const videoItemId =
        inserted.find((r) => videoPlatformSet.has(r.platform))?.id ??
        primaryItemId;
      const videoInput = await buildVideoJobInput(
        supabase,
        projectId,
        pkg,
        {
          ...(directives
            ? {
                creative_mode: directives.mode.id,
                creative_mode_beats: directives.mode.narrativeBeats,
                ...(narrativeBeatRoles
                  ? { narrative_beat_roles: narrativeBeatRoles }
                  : {}),
              }
            : {}),
          topic: context.topic,
          angle: context.angle,
          package_id: packageId,
          weekly_strategy_id: context.weeklyStrategyId,
          ...(context.productionRunId
            ? { production_run_id: context.productionRunId }
            : {}),
          ...attentionFieldsForVideoJob(pkg),
        },
      );
      const { data: videoRow, error: videoErr } = await supabase
        .from("video_jobs")
        .insert({
          project_id: projectId,
          content_item_id: videoItemId,
          package_id: packageId,
          render_kind: "package",
          provider: "video_engine",
          status: "queued",
          input: videoInput,
        })
        .select("id")
        .single();
      if (videoErr) throw videoErr;
      videoJobId = videoRow.id as string;
      const { error: briefErr } = await supabase
        .from("content_packages")
        .update({ package_brief: buildPackageBrief(pkg) })
        .eq("id", packageId);
      if (briefErr) throw briefErr;
    } catch (err) {
      // Sprint 5.3 — no orphan package/items when job input/create fails.
      await rollbackPersistedPackage(supabase, projectId, packageId);
      throw err;
    }
  }

  // Record asset_usage for referenced assets (linked to the primary item; the
  // primary item exists whether or not the package has video).
  // Sprint 5.3.1 — failure must not leave package/job without consistent usage;
  // roll back the whole persist unit and surface operational_failure.
  try {
    await recordAssetUsage(supabase, projectId, primaryItemId, pkg);
  } catch (err) {
    await rollbackPersistedPackage(supabase, projectId, packageId);
    throw err;
  }

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

// Sprint 5.3 / 5.3.1 — remove incomplete package + items when post-persist
// steps fail so production settlement never leaves an orphan package/job.
async function rollbackPersistedPackage(
  supabase: SupabaseClient,
  projectId: string,
  packageId: string,
): Promise<void> {
  const { data: items, error: itemsErr } = await supabase
    .from("content_items")
    .select("id")
    .eq("project_id", projectId)
    .eq("package_id", packageId);
  if (itemsErr) {
    throw new Error(
      `operational_failure: rollback failed loading items for package ${packageId}: ${itemsErr.message}`,
    );
  }
  const itemIds = (items ?? []).map((r) => r.id as string);
  if (itemIds.length > 0) {
    const { error: jobDelErr } = await supabase
      .from("video_jobs")
      .delete()
      .eq("project_id", projectId)
      .in("content_item_id", itemIds);
    if (jobDelErr) {
      throw new Error(
        `operational_failure: rollback failed deleting video_jobs for package ${packageId}: ${jobDelErr.message}`,
      );
    }
    const { error: usageDelErr } = await supabase
      .from("asset_usage")
      .delete()
      .eq("project_id", projectId)
      .in("content_item_id", itemIds);
    if (usageDelErr) {
      throw new Error(
        `operational_failure: rollback failed deleting asset_usage for package ${packageId}: ${usageDelErr.message}`,
      );
    }
    const { error: itemDelErr } = await supabase
      .from("content_items")
      .delete()
      .eq("project_id", projectId)
      .eq("package_id", packageId);
    if (itemDelErr) {
      throw new Error(
        `operational_failure: rollback failed deleting content_items for package ${packageId}: ${itemDelErr.message}`,
      );
    }
  }
  const { error: pkgDelErr } = await supabase
    .from("content_packages")
    .delete()
    .eq("project_id", projectId)
    .eq("id", packageId);
  if (pkgDelErr) {
    throw new Error(
      `operational_failure: rollback failed deleting content_package ${packageId}: ${pkgDelErr.message}`,
    );
  }
}

/**
 * When an existing package is video-required but has no video_jobs row, insert
 * one idempotently from package_brief. Never regenerates Claude content.
 * Returns incomplete_package when heal is impossible.
 */
async function healMissingVideoJobIfRequired(
  supabase: SupabaseClient,
  projectId: string,
  existing: ContentPackageData,
): Promise<WorkflowResult<ContentPackageData>> {
  // Re-check for a job that may have been inserted by a concurrent retry.
  const latest = await loadLatestVideoJobId(
    supabase,
    projectId,
    existing.contentItemIds,
  );
  if (latest) {
    return { ok: true, data: { ...existing, videoJobId: latest } };
  }

  const { data: pkgRow, error: pkgErr } = await supabase
    .from("content_packages")
    .select("package_brief, strategy_item_id")
    .eq("id", existing.packageId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (pkgErr) throw pkgErr;
  if (!pkgRow?.package_brief) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: [
        {
          path: "incomplete_package",
          message: "video-required package missing brief; cannot heal video job",
        },
      ],
      attempts: 0,
    };
  }

  // Determine video requirement from production run plan when tagged.
  let requireVideo = true;
  const { data: itemsMeta } = await supabase
    .from("content_items")
    .select("id, platform, generation_metadata")
    .eq("package_id", existing.packageId)
    .eq("project_id", projectId)
    .is("language", null);
  const metaRows = (itemsMeta ?? []) as Array<{
    id: string;
    platform: string;
    generation_metadata: Record<string, unknown> | null;
  }>;
  const runId = metaRows
    .map((r) => r.generation_metadata?.production_run_id)
    .find((id): id is string => typeof id === "string" && id.length > 0);
  if (runId) {
    const { data: run } = await supabase
      .from("production_runs")
      .select("requested_config")
      .eq("id", runId)
      .eq("project_id", projectId)
      .maybeSingle();
    const cfg = run?.requested_config;
    if (cfg && typeof cfg === "object" && !Array.isArray(cfg)) {
      const plan = (cfg as Record<string, unknown>).plan;
      requireVideo = planRequiresVideo(
        plan && typeof plan === "object"
          ? (plan as {
              videoCount?: number;
              platformOutputs?: Array<{ kind?: string }>;
            })
          : null,
      );
    }
  } else {
    // No run tag: if package has video/visual_scenes, treat as video-required.
    const brief = pkgRow.package_brief as Record<string, unknown>;
    requireVideo = Boolean(
      brief.video ||
        (Array.isArray(brief.visual_scenes) && brief.visual_scenes.length > 0),
    );
  }

  if (!requireVideo) {
    return { ok: true, data: existing };
  }

  const brief = pkgRow.package_brief as unknown as ContentPackageOutput;
  const videoPlatforms = new Set(["tiktok", "instagram", "youtube", "facebook"]);
  const videoItemId =
    metaRows.find((r) => videoPlatforms.has(r.platform))?.id ??
    existing.contentItemIds[0] ??
    null;
  if (!videoItemId) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: [
        {
          path: "incomplete_package",
          message: "video-required package has no content items to attach a job",
        },
      ],
      attempts: 0,
    };
  }

  try {
    const videoInput = await buildVideoJobInput(supabase, projectId, brief, {
      package_id: existing.packageId,
      healed_missing_video_job: true,
      ...(runId ? { production_run_id: runId } : {}),
      ...(existing.weeklyStrategyId
        ? { weekly_strategy_id: existing.weeklyStrategyId }
        : {}),
    });
    const { data: videoRow, error: videoErr } = await supabase
      .from("video_jobs")
      .insert({
        project_id: projectId,
        content_item_id: videoItemId,
        package_id: existing.packageId,
        render_kind: "package",
        provider: "video_engine",
        status: "queued",
        input: videoInput,
      })
      .select("id")
      .single();
    if (videoErr) {
      // Concurrent heal: another insert may have won — re-read.
      if (isUniqueViolation(videoErr)) {
        const again = await loadLatestVideoJobId(
          supabase,
          projectId,
          existing.contentItemIds,
        );
        if (again) {
          return { ok: true, data: { ...existing, videoJobId: again } };
        }
      }
      throw videoErr;
    }
    console.info(
      "[heal-missing-video-job]",
      existing.packageId,
      videoRow.id,
    );
    return {
      ok: true,
      data: { ...existing, videoJobId: videoRow.id as string },
    };
  } catch (err) {
    console.error("[heal-missing-video-job] failed", existing.packageId, err);
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: [
        {
          path: "incomplete_package",
          message:
            err instanceof Error
              ? err.message
              : "failed to heal missing video job",
        },
      ],
      attempts: 0,
    };
  }
}

export async function recordAssetUsage(
  supabase: SupabaseClient,
  projectId: string,
  contentItemId: string | null,
  pkg: ContentPackageOutput,
): Promise<void> {
  const usage = collectAssetUsageFromPackage(pkg);
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
