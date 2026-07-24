import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContentItem, Json } from "@/lib/supabase/types";
import {
  getTelemetryCollector,
  runWithTelemetrySession,
  supersedeGenerationTelemetry,
} from "@/lib/ai/telemetry";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import {
  parseContentControls,
  resolvePackagePlatforms,
  resolveVideoPackagePlatforms,
} from "@/lib/projects/contentControls";
import {
  loadProjectOrThrow,
  WorkflowError,
  type WorkflowResult,
} from "@/lib/ai/workflows/shared";
import { classifyGenerationThrow } from "@/lib/ai/workflows/generationTerminal";
import { resolvePreferredVideoUsageFromRef } from "@/lib/assets/preferredVideoUsage";
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
import { recordAssetUsage } from "@/lib/ai/workflows/generateContentPackage";
import { canonicalWebsiteUrl } from "@/lib/knowledge/websiteUrl";
import { buildAntiRepetitionMemory } from "@/lib/ai/workflows/antiRepetitionMemory";
import { attentionFieldsForVideoJob } from "@/lib/attention/promptBlocks";
import {
  assertNoActivePackageRender,
  findActivePackageVideoJobIds,
} from "@/lib/production-runtime";
import { DEFAULT_GENERATION_MODE } from "@/lib/ai/generationMode";
import { FUNNEL_STAGE_LABELS, normalizeFunnelStage } from "@/lib/ai/types";
import {
  buildCreativeSeed,
  buildRegenerateCreativeSeedSalt,
  type CreativeDirectives,
  pickCreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { runCreativePipeline } from "@/lib/content-pipeline/runCreativePipeline";
import {
  extractPriorPipelineArtifacts,
  parseRegenerationKeepFlags,
  summarizeExistingPackage,
  type RegenerationContext,
} from "@/lib/content-pipeline/regeneration";

export interface RegenerateContentPackageInput {
  projectId: string;
  packageId: string;
  feedback?: string | null;
}

export interface RegeneratedPackageData {
  packageId: string;
  status: "draft";
  weeklyStrategyId: string;
  strategyItemId: string;
  funnelStage: string;
  versionsCreated: number;
  contentItemIds: string[];
  videoJobId: string;
  package: ContentPackageOutput;
}

export async function runRegenerateContentPackage(
  input: RegenerateContentPackageInput,
  // Optional injected client. Frontend/RLS callers omit it (cookie-bound server
  // client); automation (n8n) callers pass the service-role admin client so the
  // same business logic runs without a user session.
  client?: SupabaseClient,
): Promise<WorkflowResult<RegeneratedPackageData>> {
  try {
    const { result } = await runWithTelemetrySession(() =>
      runRegenerateContentPackageUnchecked(input, client),
    );
    return result;
  } catch (err) {
    if (err instanceof WorkflowError) throw err;
    return classifyGenerationThrow(err);
  }
}

async function runRegenerateContentPackageUnchecked(
  input: RegenerateContentPackageInput,
  client?: SupabaseClient,
): Promise<WorkflowResult<RegeneratedPackageData>> {
  const { projectId, packageId } = input;
  if (!packageId) {
    throw new WorkflowError("invalid_input", "package_id is required");
  }

  const supabase: SupabaseClient = client ?? (await createSupabaseServerClient());
  const project = await loadProjectOrThrow(supabase, projectId);

  const { data: existing, error: pkgErr } = await supabase
    .from("content_packages")
    .select("id, title, strategy_item_id, package_brief")
    .eq("id", packageId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (pkgErr) throw pkgErr;
  if (!existing) {
    throw new WorkflowError("not_found", `package ${packageId} not found`);
  }
  if (!existing.strategy_item_id) {
    throw new WorkflowError(
      "invalid_input",
      "package has no strategy_item_id; cannot preserve strategic context",
    );
  }
  await assertNoActivePackageRender(supabase, { projectId, packageId });

  const context = await loadStrategyItemContext(
    supabase,
    projectId,
    existing.strategy_item_id as string,
  );
  const assets = await loadAvailableAssets(supabase, projectId);
  const memory = await buildAntiRepetitionMemory(supabase, projectId, {
    excludePackageId: packageId,
  });

  const targetPlatforms = resolvePackagePlatforms(project.platforms);
  const controls = parseContentControls(project.publishing_rules);
  const videoPlatforms = resolveVideoPackagePlatforms(
    project.platforms,
    controls.platformContentTypes,
  );
  const requireVideo = videoPlatforms.length > 0;

  const preferredVideoUsageById = new Map(
    assets.refs.map((ref) => [ref.id, resolvePreferredVideoUsageFromRef(ref)]),
  );

  const existingItems = await loadPackageItems(supabase, packageId);
  const versionsCreated = await snapshotPackage(supabase, projectId, packageId, {
    package: existing,
    items: existingItems,
  });

  const directives: CreativeDirectives = pickCreativeDirectives(
    buildCreativeSeed(
      FUNNEL_STAGE_LABELS[context.funnelStage],
      context.topic,
      context.angle,
      buildRegenerateCreativeSeedSalt(
        existing.title as string,
        input.feedback ?? null,
      ),
    ),
  );

  const prior = extractPriorPipelineArtifacts(existing.package_brief);
  const keepFlags = parseRegenerationKeepFlags(input.feedback ?? null);
  const regeneration: RegenerationContext = {
    instruction: input.feedback ?? null,
    previousTitle: (existing.title as string) ?? "",
    previousPackageSummary: summarizeExistingPackage({
      title: (existing.title as string) ?? "",
      brief: existing.package_brief,
    }),
    priorVideoConcept: prior.video_concept,
    priorOpeningImpact: prior.opening_impact,
    priorVisualIdentity: prior.visual_identity,
    packageId,
    ...keepFlags,
  };

  const promptPresentationTypes = derivePromptPresentationTypes({
    projectId,
    project,
    assets: assets.refs.map((ref) => assetSignalsFromRef(ref)),
  });

  const creative = await runCreativePipeline(supabase, {
    project,
    context,
    assets,
    memory,
    targetPlatforms,
    videoPlatforms,
    requireVideo,
    packageIndex: context.packageIndex,
    packageCount: null,
    generationMode: DEFAULT_GENERATION_MODE,
    assetCoverage: null,
    preferredVideoUsageById: requireVideo
      ? preferredVideoUsageById
      : undefined,
    directives,
    regeneration,
  });
  if (!creative.ok) {
    return creative;
  }

  const pkg = creative.data.package;
  const previousPg =
    existing.package_brief &&
    typeof existing.package_brief === "object" &&
    !Array.isArray(existing.package_brief)
      ? ((existing.package_brief as Record<string, unknown>)
          .presentation_generation as Record<string, unknown> | undefined)
      : null;
  const previousTelemetry = previousPg?.generation_telemetry ?? null;

  const pipelinePg =
    pkg.presentation_generation &&
    typeof pkg.presentation_generation === "object" &&
    !Array.isArray(pkg.presentation_generation)
      ? (pkg.presentation_generation as Record<string, unknown>)
      : {};

  pkg.presentation_generation = {
    ...pipelinePg,
    prompt_presentation_types: promptPresentationTypes,
    generation_telemetry: supersedeGenerationTelemetry({
      previous: previousTelemetry,
      nextSteps: getTelemetryCollector()?.snapshot() ?? [],
      legacy: {
        strategy_item_id: context.strategyItemId,
        production_run_id: context.productionRunId ?? null,
        regenerated: true,
        pipeline: "content_pipeline",
      },
      reason: "regenerate",
    }),
  };

  const funnelStage =
    normalizeFunnelStage(pkg.funnel_stage) ?? context.funnelStage;

  const { error: updErr } = await supabase
    .from("content_packages")
    .update({
      title: pkg.title,
      status: "draft",
      weekly_strategy_id: context.weeklyStrategyId,
      funnel_stage: funnelStage,
      package_brief: buildPackageBrief(pkg),
    })
    .eq("id", packageId)
    .eq("project_id", projectId);
  if (updErr) throw updErr;

  const upserted = await upsertPackageItems(
    supabase,
    projectId,
    packageId,
    context,
    pkg,
    existingItems,
    targetPlatforms,
    canonicalWebsiteUrl(project),
  );
  const contentItemIds = upserted.map((r) => r.id);
  const primaryItemId = contentItemIds[0] ?? null;

  const videoPlatformSet = new Set<string>(videoPlatforms);
  let videoJobId = "";
  if (requireVideo) {
    await assertNoActivePackageRender(supabase, { projectId, packageId });
    const videoItemId =
      upserted.find((r) => videoPlatformSet.has(r.platform))?.id ??
      primaryItemId;
    const videoInput = await buildVideoJobInput(supabase, projectId, pkg, {
      regenerated: true,
      creative_mode: creative.data.directives.mode.id,
      creative_mode_beats: creative.data.directives.mode.narrativeBeats,
      topic: context.topic,
      angle: context.angle,
      package_id: packageId,
      weekly_strategy_id: context.weeklyStrategyId,
      ...(context.productionRunId
        ? { production_run_id: context.productionRunId }
        : {}),
      ...attentionFieldsForVideoJob(pkg),
    });
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
    if (videoErr) {
      if (
        typeof videoErr === "object" &&
        videoErr !== null &&
        "code" in videoErr &&
        (videoErr as { code?: unknown }).code === "23505"
      ) {
        const active = await findActivePackageVideoJobIds(supabase, {
          projectId,
          packageId,
        });
        if (active[0]) {
          videoJobId = active[0];
        } else {
          throw videoErr;
        }
      } else {
        throw videoErr;
      }
    } else {
      videoJobId = videoRow.id as string;
    }
    const { error: briefErr } = await supabase
      .from("content_packages")
      .update({ package_brief: buildPackageBrief(pkg) })
      .eq("id", packageId)
      .eq("project_id", projectId);
    if (briefErr) throw briefErr;
  }

  await recordAssetUsage(supabase, projectId, primaryItemId, pkg);

  return {
    ok: true,
    data: {
      packageId,
      status: "draft",
      weeklyStrategyId: context.weeklyStrategyId,
      strategyItemId: context.strategyItemId,
      funnelStage,
      versionsCreated,
      contentItemIds,
      videoJobId,
      package: pkg,
    },
  };
}

async function loadPackageItems(
  supabase: SupabaseClient,
  packageId: string,
): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("package_id", packageId)
    .is("language", null);
  if (error) throw error;
  return (data ?? []) as ContentItem[];
}

async function snapshotPackage(
  supabase: SupabaseClient,
  projectId: string,
  packageId: string,
  snapshot: { package: unknown; items: ContentItem[] },
): Promise<number> {
  const { data: versions, error } = await supabase
    .from("content_versions")
    .select("version_no")
    .eq("content_package_id", packageId);
  if (error) throw error;

  const nextVersion =
    (versions ?? []).reduce(
      (max, v) => Math.max(max, (v.version_no as number) ?? 0),
      0,
    ) + 1;

  const { error: insErr } = await supabase.from("content_versions").insert({
    project_id: projectId,
    content_package_id: packageId,
    content_item_id: null,
    version_no: nextVersion,
    snapshot: snapshot as unknown as Json,
    change_note: "regenerate: package snapshot before regeneration",
  });
  if (insErr) throw insErr;
  return 1;
}

async function upsertPackageItems(
  supabase: SupabaseClient,
  projectId: string,
  packageId: string,
  context: StrategyItemContext,
  pkg: ContentPackageOutput,
  existingItems: ContentItem[],
  targetPlatforms?: readonly string[],
  websiteUrl: string | null = null,
): Promise<{ id: string; platform: string }[]> {
  const existingByPlatform = new Map(existingItems.map((i) => [i.platform, i]));
  const result: { id: string; platform: string }[] = [];

  for (const item of buildPersistableItems(
    pkg,
    context,
    targetPlatforms,
    websiteUrl,
  )) {
    const existing = existingByPlatform.get(item.platform);
    const fields = {
      format: item.format,
      status: "draft" as const,
      title: pkg.title,
      body: pkg.voiceover_text,
      caption: item.caption,
      hashtags: item.hashtags,
      cta: item.cta,
      generation_metadata: {
        funnel_stage: context.funnelStage,
        source: "content_pipeline",
        regenerated: true,
      } as unknown as Json,
    };

    if (existing) {
      const { error } = await supabase
        .from("content_items")
        .update(fields)
        .eq("id", existing.id)
        .is("language", null);
      if (error) throw error;
      result.push({ id: existing.id, platform: item.platform });
    } else {
      const { data, error } = await supabase
        .from("content_items")
        .insert({
          project_id: projectId,
          package_id: packageId,
          platform: item.platform,
          language: null,
          ...fields,
        })
        .select("id")
        .single();
      if (error) throw error;
      result.push({ id: data.id as string, platform: item.platform });
    }
  }

  return result;
}
