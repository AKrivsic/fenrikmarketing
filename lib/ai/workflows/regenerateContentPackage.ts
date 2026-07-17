import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ContentItem, Json } from "@/lib/supabase/types";
import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  buildRegenerateContentPackagePrompt,
  buildRegeneratePackageSystem,
} from "@/lib/ai/prompts/regenerateContentPackage";
import {
  buildContentPackageSchema,
  type ContentPackageOutput,
} from "@/lib/ai/schemas/contentPackage";
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
import { resolvePreferredVideoUsageFromRef } from "@/lib/assets/preferredVideoUsage";
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
import { normalizeVisualScenePlan, syncLegacyFieldsFromVisualScenes } from "@/lib/content-package/visualScenePlan";
import { derivePromptPresentationTypes } from "@/lib/scene-types/presentation/promptPresentationTypes";
import { assetSignalsFromRef } from "@/lib/scene-types/presentation/projectSignals";
import { applyPresentationFrequencyToPackage } from "@/lib/scene-types/presentation/presentationFrequencyGuardrail";
import { countChecklistEntries } from "@/lib/scene-types/presentation/checklistFrequencyGuardrail";
import { countPhoneEntries } from "@/lib/scene-types/presentation/phoneFrequencyGuardrail";
import { countQuoteEntries } from "@/lib/scene-types/presentation/quoteFrequencyGuardrail";
import { countStatisticEntries } from "@/lib/scene-types/presentation/statisticFrequencyGuardrail";
import { countCtaEntries } from "@/lib/scene-types/presentation/ctaFrequencyGuardrail";
import { resolveChecklistGenerationMode } from "@/lib/scene-types/checklistGenerationMode";
import type { PackageVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import { recordAssetUsage } from "@/lib/ai/workflows/generateContentPackage";
import {
  buildRecentAssetUsageBlock,
  loadRecentAssetUsageContext,
} from "@/lib/assets/loadRecentAssetUsage";
import { canonicalWebsiteUrl } from "@/lib/knowledge/websiteUrl";
import { buildAntiRepetitionMemory } from "@/lib/ai/workflows/antiRepetitionMemory";
import { loadSceneTypeProjectHistory } from "@/lib/scene-types/presentation/sceneTypeProjectHistory";
import { buildSceneTypeHistoryRestraintBlock } from "@/lib/scene-types/presentation/sceneTypeHistoryPrompt";
import {
  resolveVisualProfileForPackage,
} from "@/lib/visual-profile/packageVisualProfile";
import { visualProfileImagePromptBlock } from "@/lib/visual-profile/imagePromptProfile";
import { loadSeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import { planCreativeIdentityForPackage } from "@/lib/creative-identity/planForPackage";
import { planVisualNarrativeForPackage } from "@/lib/visual-narrative/planForPackage";
import { planVisualMediumForPackage } from "@/lib/visual-medium/planForPackage";
import { planProductRevealForPackage } from "@/lib/product-reveal/planForPackage";
import { planAttentionForPackage } from "@/lib/attention/planForPackage";
import { alignHookWithFirstSpoken } from "@/lib/attention/alignHookVoiceover";
import { attentionFieldsForVideoJob } from "@/lib/attention/promptBlocks";
import {
  attachFidelityToPlan,
  checkConceptFidelity,
  fidelityRepairAppendix,
  planCreativeCandidatesForPackage,
} from "@/lib/creative-candidates";
import type { CreativeCandidatePlan } from "@/lib/creative-candidates/types";
import { DEFAULT_GENERATION_MODE } from "@/lib/ai/generationMode";
import { ensureUniqueHook } from "@/lib/ai/workflows/regenerateHook";
import { FUNNEL_STAGE_LABELS, normalizeFunnelStage } from "@/lib/ai/types";
import {
  buildCreativeSeed,
  buildRegenerateCreativeSeedSalt,
  type CreativeDirectives,
  pickCreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";

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
  const { projectId, packageId } = input;
  if (!packageId) {
    throw new WorkflowError("invalid_input", "package_id is required");
  }

  const supabase: SupabaseClient = client ?? (await createSupabaseServerClient());
  const project = await loadProjectOrThrow(supabase, projectId);

  // Load the existing package (must belong to the project).
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

  // Preserved strategic context (project_id, weekly_strategy_id,
  // strategy_item_id, funnel_stage) is re-derived from the strategy item.
  const context = await loadStrategyItemContext(
    supabase,
    projectId,
    existing.strategy_item_id as string,
  );
  const assets = await loadAvailableAssets(supabase, projectId);
  const recentAssetUsageBlock = buildRecentAssetUsageBlock(
    await loadRecentAssetUsageContext(supabase, projectId),
  );
  // Phase 2E — recent hooks/topics/CTAs/scenarios fed into the prompt so the
  // regenerated package avoids repeating prior content.
  const memory = await buildAntiRepetitionMemory(supabase, projectId);
  const sceneTypeHistory = await loadSceneTypeProjectHistory(supabase, projectId, {
    excludePackageId: packageId,
    currentWeeklyStrategyId: context.weeklyStrategyId,
  });
  const sceneTypeHistoryBlock =
    buildSceneTypeHistoryRestraintBlock(sceneTypeHistory);

  // Respect projects.platforms (falls back to the full required set).
  const targetPlatforms = resolvePackagePlatforms(project.platforms);

  // P3 runtime wiring — only require/create video when a selected platform is
  // video-typed (same rule as generation).
  const controls = parseContentControls(project.publishing_rules);
  const videoPlatforms = resolveVideoPackagePlatforms(
    project.platforms,
    controls.platformContentTypes,
  );
  const requireVideo = videoPlatforms.length > 0;

  const preferredVideoUsageById = new Map(
    assets.refs.map((ref) => [ref.id, resolvePreferredVideoUsageFromRef(ref)]),
  );

  // Snapshot the current package (header + items) into content_versions as a
  // package-level snapshot (content_package_id) BEFORE regenerating.
  const existingItems = await loadPackageItems(supabase, packageId);
  const versionsCreated = await snapshotPackage(supabase, projectId, packageId, {
    package: existing,
    items: existingItems,
  });

  // Attention First V1 — resolve the creative directive ONCE here, with the
  // regeneration salt so it lands on a DIFFERENT mode than the original. Shared
  // by the prompt, the storyboard role arc and the video job input. No AI call.
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

  // Visual Profile v3 — fresh AUTO with package feel (no snapshot; regen may change feel).
  const resolvedVisualProfile = resolveVisualProfileForPackage({
    project,
    pkg: undefined,
    packageSignals: {
      funnelStage: context.funnelStage,
      topic: context.topic,
      angle: context.angle,
      creativeMode: directives.mode.id,
    },
  });
  const visualProfileImagePromptBlockText = visualProfileImagePromptBlock(
    resolvedVisualProfile.profile,
  );

  const regenerateCreativeSalt = buildRegenerateCreativeSeedSalt(
    existing.title as string,
    input.feedback ?? null,
  );
  const seriesCreative = await loadSeriesCreativeContext({
    supabase,
    projectId,
    weeklyStrategyId: context.weeklyStrategyId,
    excludePackageId: packageId,
  });
  const creativeIdentityPlan = planCreativeIdentityForPackage({
    project,
    visualProfile: resolvedVisualProfile.profile,
    projectId,
    strategyItemId: context.strategyItemId,
    packageIndex: null,
    topic: context.topic,
    angle: context.angle,
    creativeSeedSalt: regenerateCreativeSalt,
    series: seriesCreative,
    requireVideo,
  });

  const visualNarrativePlan = planVisualNarrativeForPackage({
    project,
    identity: creativeIdentityPlan.identity,
    projectId,
    strategyItemId: context.strategyItemId,
    packageIndex: null,
    topic: context.topic,
    angle: context.angle,
    creativeSeedSalt: regenerateCreativeSalt,
    series: seriesCreative,
    funnelStage: context.funnelStage,
    requireVideo,
  });

  const visualMediumPlan = planVisualMediumForPackage({
    project,
    narrative: visualNarrativePlan.plan,
    identity: creativeIdentityPlan.identity,
    visualProfile: resolvedVisualProfile.profile,
    projectId,
    strategyItemId: context.strategyItemId,
    packageIndex: null,
    topic: context.topic,
    angle: context.angle,
    creativeSeedSalt: regenerateCreativeSalt,
    series: seriesCreative,
    funnelStage: context.funnelStage,
    requireVideo,
  });

  const productRevealPlan = planProductRevealForPackage({
    project,
    narrative: visualNarrativePlan.plan,
    assets: assets.refs,
    generationMode: DEFAULT_GENERATION_MODE,
    visualMedium: visualMediumPlan.resolved?.medium ?? "PHOTOGRAPHIC",
    requireVideo,
  });

  const attentionPlan = planAttentionForPackage({
    project,
    projectId,
    strategyItemId: context.strategyItemId,
    packageIndex: null,
    topic: context.topic,
    angle: context.angle,
    funnelStage: context.funnelStage,
    creativeMode: directives.mode.id,
    series: seriesCreative,
    creativeSeedSalt: regenerateCreativeSalt,
    requireVideo,
  });

  const creativeCandidatePlan = planCreativeCandidatesForPackage({
    topic: context.topic,
    angle: context.angle,
    painPoints: project.pain_points ?? [],
    productIs: project.product_is ?? [],
    requireVideo,
  });
  let creativeCandidates: CreativeCandidatePlan | null = creativeCandidatePlan.plan;

  const promptPresentationTypes = derivePromptPresentationTypes({
    projectId,
    project,
    assets: assets.refs.map((ref) => assetSignalsFromRef(ref)),
  });

  const buildRegenPrompt = (fidelityRepair?: string) =>
    buildRegenerateContentPackagePrompt({
      project,
      funnelStage: context.funnelStage,
      topic: context.topic,
      angle: context.angle,
      platform: context.platform,
      format: context.format,
      availableAssets: assets.refs,
      previousTitle: existing.title as string,
      feedback: input.feedback ?? null,
      memory,
      recentAssetUsageBlock,
      targetPlatforms,
      requireVideo,
      videoPlatforms,
      directives,
      promptPresentationTypes,
      sceneTypeHistoryBlock,
      visualProfileImagePromptBlock: visualProfileImagePromptBlockText,
      creativeIdentityPromptBlock: creativeIdentityPlan.promptBlock || undefined,
      visualNarrativePromptBlock: visualNarrativePlan.promptBlock || undefined,
      productRevealPromptBlock: productRevealPlan.promptBlock || undefined,
      visualMediumPromptBlock: visualMediumPlan.promptBlock || undefined,
      attentionPromptBlock: attentionPlan.promptBlock || undefined,
      creativeCandidatePromptBlock:
        creativeCandidatePlan.promptBlock || undefined,
      creativeCandidateFidelityRepair: fidelityRepair,
      creativeSeedSalt: regenerateCreativeSalt,
    });

  let generated = await generateValidatedJson({
    textProvider: getCopywritingProvider(),
    system: buildRegeneratePackageSystem(requireVideo),
    prompt: buildRegenPrompt(),
    validator: buildContentPackageSchema(targetPlatforms, { requireVideo }),
    guardrails: makePackageGuardrails({
      project,
      context,
      classById: assets.classById,
      requiredPlatforms: targetPlatforms,
      requireVideo,
      preferredVideoUsageById: requireVideo ? preferredVideoUsageById : undefined,
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

  let aligned = alignHookWithFirstSpoken({
    hook: generated.value.hook,
    voiceoverText: generated.value.voiceover_text,
  });
  generated.value.hook = aligned.hook;
  generated.value.voiceover_text = aligned.voiceover_text;

  let regenerationReason: string | null = null;
  if (creativeCandidates && requireVideo) {
    let fidelity = checkConceptFidelity({
      winner: creativeCandidates.selectedCandidate,
      hook: generated.value.hook,
      voiceoverText: generated.value.voiceover_text,
      imagePrompts: generated.value.image_prompts,
      visualScenes: generated.value.visual_scenes,
      topic: context.topic,
      angle: context.angle,
    });
    if (!fidelity.passed) {
      regenerationReason = fidelity.failureReasons.join(",");
      const repaired = await generateValidatedJson({
        textProvider: getCopywritingProvider(),
        system: buildRegeneratePackageSystem(requireVideo),
        prompt: buildRegenPrompt(
          fidelityRepairAppendix(
            creativeCandidates.selectedCandidate,
            fidelity,
          ),
        ),
        validator: buildContentPackageSchema(targetPlatforms, { requireVideo }),
        guardrails: makePackageGuardrails({
          project,
          context,
          classById: assets.classById,
          requiredPlatforms: targetPlatforms,
          requireVideo,
          preferredVideoUsageById: requireVideo
            ? preferredVideoUsageById
            : undefined,
        }),
      });
      if (repaired.ok) {
        generated = repaired;
        generated.value.hook = await ensureUniqueHook({
          hook: generated.value.hook,
          project,
          topic: context.topic,
          angle: context.angle,
          memory,
        });
        aligned = alignHookWithFirstSpoken({
          hook: generated.value.hook,
          voiceoverText: generated.value.voiceover_text,
        });
        generated.value.hook = aligned.hook;
        generated.value.voiceover_text = aligned.voiceover_text;
        fidelity = checkConceptFidelity({
          winner: creativeCandidates.selectedCandidate,
          hook: generated.value.hook,
          voiceoverText: generated.value.voiceover_text,
          imagePrompts: generated.value.image_prompts,
          visualScenes: generated.value.visual_scenes,
          topic: context.topic,
          angle: context.angle,
        });
      }
    }
    creativeCandidates = attachFidelityToPlan(
      creativeCandidates,
      fidelity,
      regenerationReason,
    );
  }

  const pkg = generated.value;
  // MVP scene/image cost cap — drop empty prompts and cap to the supported max
  // BEFORE persisting the brief and queuing the video job, so the stored brief
  // matches exactly what the worker renders and no extra image gens are queued.
  normalizeVisualScenePlan(pkg, { workflow: "regenerate", package_id: packageId }, {
    classById: assets.classById,
  });
  const requestedChecklistCount = countChecklistEntries(
    (pkg.visual_scenes ?? []) as PackageVisualSceneEntry[],
  );
  const requestedPhoneCount = countPhoneEntries(
    (pkg.visual_scenes ?? []) as PackageVisualSceneEntry[],
  );
  const requestedQuoteCount = countQuoteEntries(
    (pkg.visual_scenes ?? []) as PackageVisualSceneEntry[],
  );
  const requestedStatisticCount = countStatisticEntries(
    (pkg.visual_scenes ?? []) as PackageVisualSceneEntry[],
  );
  const requestedCtaCount = countCtaEntries(
    (pkg.visual_scenes ?? []) as PackageVisualSceneEntry[],
  );
  const frequencyDecisions = applyPresentationFrequencyToPackage(pkg);
  if (frequencyDecisions.length > 0) {
    syncLegacyFieldsFromVisualScenes(pkg);
  }
  pkg.presentation_generation = {
    mode: resolveChecklistGenerationMode(),
    requested_checklist_count: requestedChecklistCount,
    requested_phone_count: requestedPhoneCount,
    requested_quote_count: requestedQuoteCount,
    requested_statistic_count: requestedStatisticCount,
    requested_cta_count: requestedCtaCount,
    downgraded_checklist_count: frequencyDecisions.filter(
      (d) => d.rule === "checklist_video_limit_exceeded",
    ).length,
    downgraded_phone_count: frequencyDecisions.filter(
      (d) => d.rule === "phone_video_limit_exceeded",
    ).length,
    downgraded_quote_count: frequencyDecisions.filter(
      (d) => d.rule === "quote_video_limit_exceeded",
    ).length,
    downgraded_statistic_count: frequencyDecisions.filter(
      (d) => d.rule === "statistic_video_limit_exceeded",
    ).length,
    downgraded_cta_count: frequencyDecisions.filter(
      (d) =>
        d.rule === "cta_video_limit_exceeded" || d.rule === "cta_not_final_scene",
    ).length,
    frequency_decisions: frequencyDecisions,
    prompt_presentation_types: promptPresentationTypes,
    ...creativeIdentityPlan.persistenceFields,
    ...visualNarrativePlan.persistenceFields,
    ...visualMediumPlan.persistenceFields,
    ...productRevealPlan.persistenceFields,
    ...attentionPlan.persistenceFields,
    ...(creativeCandidates
      ? {
          creative_candidates: {
            version: creativeCandidates.version,
            creativeDivergence: creativeCandidates.creativeDivergence,
            generatedCandidates: creativeCandidates.generatedCandidates,
            candidateScores: creativeCandidates.candidateScores.map((s) => ({
              candidateId: s.candidate.candidateId,
              family: s.candidate.family,
              scores: s.scores,
              weightedTotal: s.weightedTotal,
              rejected: s.rejected,
              rejectReasons: s.rejectReasons,
              hookLine: s.candidate.hookLine,
              openingSituation: s.candidate.openingSituation,
              coreIdea: s.candidate.coreIdea,
            })),
            rejectedCandidates: creativeCandidates.rejectedCandidates,
            selectedCandidate: creativeCandidates.selectedCandidate,
            comparativeJudge: creativeCandidates.comparativeJudge,
            finalScriptFidelity: creativeCandidates.finalScriptFidelity,
            finalStoryboardFidelity: creativeCandidates.finalStoryboardFidelity,
            regenerationReason: creativeCandidates.regenerationReason,
          },
        }
      : {}),
  };
  normalizeImagePrompts(pkg, { workflow: "regenerate", package_id: packageId });
  // Preserve the strategy item's canonical funnel stage across regeneration.
  const funnelStage =
    normalizeFunnelStage(pkg.funnel_stage) ?? context.funnelStage;

  // Update the package row in place to a fresh draft, preserving identity and
  // strategic context (weekly_strategy_id, funnel_stage as first-class columns).
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

  // Update existing content_items in place (keep ids so content_versions
  // history survives), insert any newly required platforms.
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

  // Regeneration creates a fresh video job ONLY when a selected platform
  // requires video; text-only packages skip it. The job links to the primary
  // video platform's content item (one shared video per package).
  const videoPlatformSet = new Set<string>(videoPlatforms);
  let videoJobId = "";
  if (requireVideo) {
    const videoItemId =
      upserted.find((r) => videoPlatformSet.has(r.platform))?.id ??
      primaryItemId;
    const videoInput = await buildVideoJobInput(supabase, projectId, pkg, {
      regenerated: true,
      creative_mode: directives.mode.id,
      creative_mode_beats: directives.mode.narrativeBeats,
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

// Loads ONLY the primary-language content items (language IS NULL). Language
// variants (language = de/fr/...) are deliberately excluded so package
// regenerate can never read, snapshot, or overwrite them.
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

// Stores ONE package-level snapshot in content_versions using the new
// content_package_id column (migration 008). content_item_id is left null;
// the snapshot jsonb captures the package header plus all its content items.
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
        source: "creative_engine",
        regenerated: true,
      } as unknown as Json,
    };

    if (existing) {
      // Extra guard: only update the primary row. existingItems are already
      // primary-only, and the language filter makes a variant overwrite
      // impossible even if a stale id slipped through.
      const { error } = await supabase
        .from("content_items")
        .update(fields)
        .eq("id", existing.id)
        .is("language", null);
      if (error) throw error;
      result.push({ id: existing.id, platform: item.platform });
    } else {
      // New primary items are persisted with language NULL (primary language).
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
