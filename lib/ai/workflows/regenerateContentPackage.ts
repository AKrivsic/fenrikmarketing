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
import { classifyGenerationThrow } from "@/lib/ai/workflows/generationTerminal";
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
import {
  resolveVisualProfileForPackage,
} from "@/lib/visual-profile/packageVisualProfile";
import { visualProfileImagePromptBlock } from "@/lib/visual-profile/imagePromptProfile";
import { loadSeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import { planCreativeIdentityForPackage } from "@/lib/creative-identity/planForPackage";
import { planVisualNarrativeForPackage } from "@/lib/visual-narrative/planForPackage";
import { planVisualMediumForPackage } from "@/lib/visual-medium/planForPackage";
import { planProductRevealForPackage } from "@/lib/product-reveal/planForPackage";
import { planProductPresentationForPackage } from "@/lib/product-presentation/planForPackage";
import {
  productPresentationFieldsForValidationPersistence,
  productPresentationValidationIssues,
  validateProductPresentationPackage,
} from "@/lib/product-presentation/validateProductPresentation";
import { planAttentionForPackage } from "@/lib/attention/planForPackage";
import { alignHookWithFirstSpoken } from "@/lib/attention/alignHookVoiceover";
import { attentionFieldsForVideoJob } from "@/lib/attention/promptBlocks";
import { buildTypedDecisionPacks } from "@/lib/architecture/typedDecisionPacks";
import {
  buildFidelityRepairDelta,
  buildProductDemonstrationRepairDelta,
  buildStoryIntegrityRepairDelta,
  buildRepairDeltaPrompt,
  mergeRepairedPackage,
} from "@/lib/architecture/repairDelta";
import {
  assertNoActivePackageRender,
  findActivePackageVideoJobIds,
  shouldHardFailFidelityAfterRepair,
  shouldHardFailStoryIntegrityAfterRepair,
} from "@/lib/production-runtime";
import {
  attachFidelityToPlan,
  attachProductDemonstrationIntegrityToPlan,
  attachStoryIntegrityToPlan,
  buildCreativeDnaDiagnostics,
  checkConceptFidelity,
  creativeCandidateFieldsForPersistence,
  productDemonstrationValidationIssues,
  storyIntegrityValidationIssues,
  validateCreativeDnaAgainstPackage,
  validateProductDemonstrationIntegrity,
  validateStoryIntegrity,
} from "@/lib/creative-candidates";
import {
  planCreativeEngineV3ForPackage,
  creativeEngineV3FieldsForPersistence,
} from "@/lib/creative-engine-v3";
import { classifyFidelityFailuresForRepair } from "@/lib/creative-candidates/fidelityCheck";
import { enforceCandidateHook } from "@/lib/creative-candidates/enforceCandidateHook";
import { validateAndRepairCandidate } from "@/lib/creative-candidates/candidateValidation";
import { alignOnScreenCtaContract } from "@/lib/content-package/alignOnScreenCtaContract";
import { normalizeCreativeDNA } from "@/lib/creative-candidates/creativeDNA";
import type { CreativeCandidatePlan } from "@/lib/creative-candidates/types";
import type { CreativeDnaDiagnostics } from "@/lib/creative-candidates/creativeDNA";
import {
  buildNarrativeBeatPromptBlock,
  buildNarrativeTimelineDebug,
  deriveNarrativeBeats,
  narrativeBeatFieldsForPersistence,
  narrativeBeatRolesForCount,
  planBeatDurations,
  validateDurationPlan,
  validateInformationProgression,
  validateStoryProgression,
  validateVisualProgression,
  type NarrativeBeatPlan,
  type StoryProgressionDiagnostics,
  type VisualProgressionDiagnostics,
  type InformationProgressionDiagnostics,
  type DurationValidationDiagnostics,
  type NarrativeTimelineDebug,
} from "@/lib/narrative-beats";
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
  try {
    return await runRegenerateContentPackageUnchecked(input, client);
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
  await assertNoActivePackageRender(supabase, { projectId, packageId });

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
  // Phase 1: Scene Type Memory prose no longer injected into Presentation.
  // Soft restraint remains in applySceneTypeHistoryGuardrail (loads history itself).

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

  let creativeEnginePersistence: Record<string, unknown> = {};
  let creativeCandidatePlan: {
    plan: CreativeCandidatePlan | null;
    promptBlock: string;
    dnaPromptBlock: string;
    dnaResolve: import("@/lib/creative-candidates/creativeDNA").CreativeDnaResolveResult | null;
  } = {
    plan: null,
    promptBlock: "",
    dnaPromptBlock: "",
    dnaResolve: null,
  };

  if (requireVideo) {
    const v3 = await planCreativeEngineV3ForPackage({
      project,
      projectId,
      topic: context.topic,
      angle: context.angle,
      funnelStage: context.funnelStage,
      platform: context.platform,
      format: context.format,
      ctaHint: project.default_cta,
      productionRunId: context.productionRunId,
      packageIndex: context.packageIndex,
      packageCount: null,
      assets: assets.refs,
      memory,
    });
    if (!v3.ok) {
      return {
        ok: false,
        error: "generation_failed",
        validationErrors: v3.validationErrors,
        attempts: v3.attempts,
      };
    }
    creativeCandidatePlan = {
      plan: v3.plan,
      promptBlock: v3.promptBlock,
      dnaPromptBlock: v3.dnaPromptBlock,
      dnaResolve: v3.dnaResolve,
    };
    creativeEnginePersistence = creativeEngineV3FieldsForPersistence({
      telemetry: v3.telemetry,
      plan: null,
    });
  }

  let creativeCandidates: CreativeCandidatePlan | null = creativeCandidatePlan.plan;
  const selectedDna = normalizeCreativeDNA(
    creativeCandidates?.selectedCandidate.creativeDNA,
  );

  let narrativeBeatPlan: NarrativeBeatPlan | null =
    creativeCandidates && requireVideo
      ? deriveNarrativeBeats({
          winner: creativeCandidates.selectedCandidate,
          modeBeats: directives.mode.narrativeBeats,
          topic: context.topic,
          angle: context.angle,
          painPoints: project.pain_points ?? [],
          productIs: project.product_is ?? [],
        })
      : null;
  let storyProgressionDiagnostics: StoryProgressionDiagnostics | null = null;
  let visualProgressionDiagnostics: VisualProgressionDiagnostics | null = null;
  let postLlmInformationProgression: InformationProgressionDiagnostics | null =
    null;
  let durationValidation: DurationValidationDiagnostics | null = null;
  let timelineDebug: NarrativeTimelineDebug | null = null;

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
    creativeDNA: selectedDna,
    openingSituation:
      creativeCandidates?.selectedCandidate?.openingSituation ?? null,
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

  // Wave 1 PPD: compute + persist only when flag on; does not change gates.
  const productPresentationPlan = planProductPresentationForPackage({
    productReveal: productRevealPlan.plan,
    assets: assets.refs,
    visualNarrative: visualNarrativePlan.plan,
    assetCoverage: null,
    funnelStage: context.funnelStage,
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

  const decisionPacks = buildTypedDecisionPacks({
    project,
    directives,
    funnelStage: context.funnelStage,
    generationMode: DEFAULT_GENERATION_MODE,
    assetCoverage: null,
    selectedCandidate: creativeCandidates?.selectedCandidate
      ? {
          hookLine: creativeCandidates.selectedCandidate.hookLine,
          openingSituation: creativeCandidates.selectedCandidate.openingSituation,
          emotionalReaction:
            creativeCandidates.selectedCandidate.emotionalReaction,
          creativeDNA: creativeCandidates.selectedCandidate.creativeDNA ?? null,
        }
      : null,
    creativeDna: selectedDna,
    creativeIdentity: creativeIdentityPlan.identity,
    attentionDeliveryArc: attentionPlan.plan?.delivery_arc ?? null,
    attentionPromptBlock: attentionPlan.promptBlock || null,
    creativeDnaPromptBlock: creativeCandidatePlan.dnaPromptBlock || null,
    creativeIdentityPromptBlock: creativeIdentityPlan.promptBlock || null,
    targetPlatforms,
    requireVideo,
    videoPlatforms,
  });

  const narrativeBeatPromptBlock = narrativeBeatPlan
    ? buildNarrativeBeatPromptBlock(narrativeBeatPlan, {
        modeBeatArc: decisionPacks.storyStructure.beatArc,
      })
    : "";

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
      visualProfileImagePromptBlock: visualProfileImagePromptBlockText,
      visualNarrativePromptBlock: visualNarrativePlan.promptBlock || undefined,
      productRevealPromptBlock: productRevealPlan.promptBlock || undefined,
      visualMediumPromptBlock: visualMediumPlan.promptBlock || undefined,
      creativeCandidatePromptBlock:
        creativeCandidatePlan.promptBlock || undefined,
      narrativeBeatPromptBlock: narrativeBeatPromptBlock || undefined,
      creativeCandidateFidelityRepair: fidelityRepair,
      creativeSeedSalt: regenerateCreativeSalt,
      // Phase 3 — packs are authoritative; Presentation renders only.
      decisionPacks,
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
    lockToHook: Boolean(creativeCandidates),
  });
  generated.value.hook = aligned.hook;
  generated.value.voiceover_text = aligned.voiceover_text;

  let regenerationReason: string | null = null;
  if (creativeCandidates && requireVideo) {
    const repairedCand = validateAndRepairCandidate(
      creativeCandidates.selectedCandidate,
      { productLabel: project.product_is?.[0] },
    );
    creativeCandidates = {
      ...creativeCandidates,
      selectedCandidate: repairedCand.candidate,
    };
    const enforced = enforceCandidateHook({
      hookLine: creativeCandidates.selectedCandidate.hookLine,
      hook: generated.value.hook,
      voiceoverText: generated.value.voiceover_text,
    });
    generated.value.hook = enforced.hook;
    generated.value.voiceover_text = enforced.voiceover_text;

    let fidelity = checkConceptFidelity({
      winner: creativeCandidates.selectedCandidate,
      hook: generated.value.hook,
      voiceoverText: generated.value.voiceover_text,
      imagePrompts: generated.value.image_prompts,
      visualScenes: generated.value.visual_scenes,
      topic: context.topic,
      angle: context.angle,
    });
    const classification = classifyFidelityFailuresForRepair(fidelity);
    if (!fidelity.passed && classification.material) {
      regenerationReason = classification.materialReasons.join(",");
      const priorPackage = generated.value;
      const fidelityDelta = buildFidelityRepairDelta({
        winner: creativeCandidates.selectedCandidate,
        fidelity,
      });
      const repaired = await generateValidatedJson({
        textProvider: getCopywritingProvider(),
        system: buildRegeneratePackageSystem(requireVideo),
        prompt: buildRepairDeltaPrompt({
          decisionPacks,
          repairDelta: fidelityDelta,
          generatedPackage: priorPackage,
          validationResults: { fidelity },
          winner: creativeCandidates.selectedCandidate,
          funnelStageLabel: FUNNEL_STAGE_LABELS[context.funnelStage],
          requireVideo,
        }),
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
        generated = {
          ...repaired,
          value: mergeRepairedPackage({
            prior: priorPackage,
            repaired: repaired.value,
            delta: fidelityDelta,
            decisionPacks,
            winner: creativeCandidates.selectedCandidate,
          }),
        };
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
          lockToHook: true,
        });
        generated.value.hook = aligned.hook;
        generated.value.voiceover_text = aligned.voiceover_text;
        const reEnforce = enforceCandidateHook({
          hookLine: creativeCandidates.selectedCandidate.hookLine,
          hook: generated.value.hook,
          voiceoverText: generated.value.voiceover_text,
        });
        generated.value.hook = reEnforce.hook;
        generated.value.voiceover_text = reEnforce.voiceover_text;
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
    if (shouldHardFailFidelityAfterRepair(fidelity)) {
      return {
        ok: false,
        error: "generation_failed",
        validationErrors: fidelity.failureReasons.map((reason) => ({
          path: "concept_fidelity",
          message: reason,
        })),
        attempts: generated.attempts,
      };
    }
    if (!fidelity.passed) {
      console.warn(
        "[concept-fidelity] soft-continue after non-material residues",
        fidelity.failureReasons,
      );
    }

    const alignOnScreenCta = () => {
      if (!generated.ok) return;
      const ctaAlign = alignOnScreenCtaContract({
        videoScript: generated.value.video?.script ?? null,
        visualScenes: generated.value.visual_scenes,
      });
      if (ctaAlign.changed && generated.value.video && ctaAlign.script !== null) {
        generated.value.video = {
          ...generated.value.video,
          script: ctaAlign.script,
        };
      }
    };
    alignOnScreenCta();

    let storyIntegrity = validateStoryIntegrity({
      winner: creativeCandidates.selectedCandidate,
      voiceoverText: generated.value.voiceover_text,
      packageCta: generated.value.cta?.text ?? "",
      imagePrompts: generated.value.image_prompts,
      visualScenes: generated.value.visual_scenes,
      hook: generated.value.hook,
      productPresentation: productPresentationPlan.plan,
    });
    if (!storyIntegrity.passed) {
      const integrityReason = `story_integrity:${storyIntegrity.summary}`;
      regenerationReason = regenerationReason
        ? `${regenerationReason};${integrityReason}`
        : integrityReason;
      const priorPackage = generated.value;
      const storyDelta = buildStoryIntegrityRepairDelta({
        winner: creativeCandidates.selectedCandidate,
        integrity: storyIntegrity,
        packageCta: priorPackage.cta?.text ?? "",
      });
      const repairedIntegrity = await generateValidatedJson({
        textProvider: getCopywritingProvider(),
        system: buildRegeneratePackageSystem(requireVideo),
        prompt: buildRepairDeltaPrompt({
          decisionPacks,
          repairDelta: storyDelta,
          generatedPackage: priorPackage,
          validationResults: { storyIntegrity, fidelity },
          winner: creativeCandidates.selectedCandidate,
          funnelStageLabel: FUNNEL_STAGE_LABELS[context.funnelStage],
          requireVideo,
        }),
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
      if (repairedIntegrity.ok) {
        generated = {
          ...repairedIntegrity,
          value: mergeRepairedPackage({
            prior: priorPackage,
            repaired: repairedIntegrity.value,
            delta: storyDelta,
            decisionPacks,
            winner: creativeCandidates.selectedCandidate,
          }),
        };
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
          lockToHook: true,
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
        creativeCandidates = attachFidelityToPlan(
          creativeCandidates,
          fidelity,
          regenerationReason,
        );
        alignOnScreenCta();
        storyIntegrity = validateStoryIntegrity({
          winner: creativeCandidates.selectedCandidate,
          voiceoverText: generated.value.voiceover_text,
          packageCta: generated.value.cta?.text ?? "",
          imagePrompts: generated.value.image_prompts,
          visualScenes: generated.value.visual_scenes,
          hook: generated.value.hook,
          productPresentation: productPresentationPlan.plan,
        });
      }
    }
    creativeCandidates = attachStoryIntegrityToPlan(
      creativeCandidates,
      storyIntegrity,
      regenerationReason,
    );
    if (storyIntegrity.warnings.length > 0) {
      console.warn(
        "[story-integrity] soft warnings (non-blocking)",
        creativeCandidates.selectedCandidate.candidateId,
        storyIntegrity.warnings,
        storyIntegrity.ctaMatch,
      );
    }
    if (shouldHardFailStoryIntegrityAfterRepair(storyIntegrity)) {
      console.error(
        "[story-integrity] hard fail after repair",
        creativeCandidates.selectedCandidate.candidateId,
        storyIntegrity.violations,
      );
      return {
        ok: false,
        error: "generation_failed",
        validationErrors: storyIntegrityValidationIssues(storyIntegrity),
        attempts: generated.attempts,
      };
    }
    if (!storyIntegrity.passed) {
      console.warn(
        "[story-integrity] soft-continue after repairable residues",
        storyIntegrity.violations,
      );
    }

    let productDemoIntegrity = validateProductDemonstrationIntegrity({
      winner: creativeCandidates.selectedCandidate,
      voiceoverText: generated.value.voiceover_text,
      imagePrompts: generated.value.image_prompts,
      visualScenes: generated.value.visual_scenes,
      productPresentation: productPresentationPlan.plan,
    });
    if (!productDemoIntegrity.passed) {
      const demoReason = `product_demonstration_integrity:${productDemoIntegrity.summary}`;
      regenerationReason = regenerationReason
        ? `${regenerationReason};${demoReason}`
        : demoReason;
      const priorPackage = generated.value;
      const demoDelta = buildProductDemonstrationRepairDelta({
        winner: creativeCandidates.selectedCandidate,
        integrity: productDemoIntegrity,
      });
      const repairedDemo = await generateValidatedJson({
        textProvider: getCopywritingProvider(),
        system: buildRegeneratePackageSystem(requireVideo),
        prompt: buildRepairDeltaPrompt({
          decisionPacks,
          repairDelta: demoDelta,
          generatedPackage: priorPackage,
          validationResults: {
            productDemonstration: productDemoIntegrity,
            fidelity,
            storyIntegrity,
          },
          winner: creativeCandidates.selectedCandidate,
          funnelStageLabel: FUNNEL_STAGE_LABELS[context.funnelStage],
          requireVideo,
        }),
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
      if (repairedDemo.ok) {
        generated = {
          ...repairedDemo,
          value: mergeRepairedPackage({
            prior: priorPackage,
            repaired: repairedDemo.value,
            delta: demoDelta,
            decisionPacks,
            winner: creativeCandidates.selectedCandidate,
          }),
        };
        productDemoIntegrity = validateProductDemonstrationIntegrity({
          winner: creativeCandidates.selectedCandidate,
          voiceoverText: generated.value.voiceover_text,
          imagePrompts: generated.value.image_prompts,
          visualScenes: generated.value.visual_scenes,
          productPresentation: productPresentationPlan.plan,
        });
      }
    }
    creativeCandidates = attachProductDemonstrationIntegrityToPlan(
      creativeCandidates,
      productDemoIntegrity,
      regenerationReason,
    );
    if (!productDemoIntegrity.passed) {
      console.error(
        "[product-demonstration-integrity] hard fail after repair",
        creativeCandidates.selectedCandidate.candidateId,
        productDemoIntegrity.violations,
      );
      return {
        ok: false,
        error: "generation_failed",
        validationErrors: productDemonstrationValidationIssues(
          productDemoIntegrity,
        ),
        attempts: generated.attempts,
      };
    }

    const productPresentationValidation = validateProductPresentationPackage({
      plan: productPresentationPlan.plan,
      visualScenes: generated.value.visual_scenes,
      assets: assets.refs,
    });
    if (
      productPresentationValidation.active &&
      !productPresentationValidation.passed
    ) {
      console.error(
        "[product-presentation] validation failed",
        productPresentationValidation.summary,
        productPresentationValidation.violations,
      );
      return {
        ok: false,
        error: "generation_failed",
        validationErrors: productPresentationValidationIssues(
          productPresentationValidation,
        ),
        attempts: generated.attempts,
      };
    }

    storyProgressionDiagnostics = validateStoryProgression({
      imagePrompts: generated.value.image_prompts,
      visualScenes: generated.value.visual_scenes,
    });
    visualProgressionDiagnostics = validateVisualProgression({
      imagePrompts: generated.value.image_prompts,
      visualScenes: generated.value.visual_scenes,
    });
    postLlmInformationProgression = validateInformationProgression({
      imagePrompts: generated.value.image_prompts,
      visualScenes: generated.value.visual_scenes,
    });
    if (!storyProgressionDiagnostics.passed) {
      console.warn(
        "[story-progression] consecutive scenes near-duplicate purpose",
        storyProgressionDiagnostics.summary,
      );
    }
    if (!visualProgressionDiagnostics.passed) {
      console.warn(
        "[visual-progression] static scene repetition",
        visualProgressionDiagnostics.summary,
      );
    }
    if (!postLlmInformationProgression.passed) {
      console.warn(
        "[information-progression] same information across scenes",
        postLlmInformationProgression.summary,
      );
    }
  }

  if (narrativeBeatPlan && requireVideo) {
    const vo = generated.value.voiceover_text ?? "";
    const wordCount = vo.trim().split(/\s+/).filter(Boolean).length;
    const estimatedSeconds = Math.max(15, Math.min(25, wordCount / 2.6));
    const roles = narrativeBeatRolesForCount(
      Math.min(5, Math.max(3, narrativeBeatPlan.beats.length)),
    );
    const per = Math.max(1, Math.floor(wordCount / Math.max(roles.length, 1)));
    const segmentWordCounts = roles.map((_r, i) =>
      i === roles.length - 1
        ? Math.max(1, wordCount - per * (roles.length - 1))
        : per,
    );
    const planned = planBeatDurations({
      totalSeconds: estimatedSeconds,
      roles,
      segmentWordCounts,
    });
    durationValidation = validateDurationPlan({
      roles,
      durationsSeconds: planned.durations,
      segmentWordCounts,
      justifiedOverMax: planned.justifiedOverMax,
    });
    timelineDebug = buildNarrativeTimelineDebug({
      winner: creativeCandidates?.selectedCandidate ?? null,
      plan: narrativeBeatPlan,
      voiceoverText: vo,
      imagePrompts: generated.value.image_prompts,
      visualScenes: generated.value.visual_scenes,
      durationPlan: {
        roles,
        durationsSeconds: planned.durations,
        justifiedOverMax: planned.justifiedOverMax,
        validation: durationValidation,
      },
      informationProgression:
        postLlmInformationProgression ??
        narrativeBeatPlan.informationProgression,
    });
  }

  let creativeDnaDiagnostics: CreativeDnaDiagnostics | null = null;
  if (creativeCandidates && requireVideo) {
    const dna = normalizeCreativeDNA(
      creativeCandidates.selectedCandidate.creativeDNA,
    );
    const validation = dna
      ? validateCreativeDnaAgainstPackage(dna, {
          hook: generated.value.hook,
          voiceoverText: generated.value.voiceover_text,
          concept: generated.value.video?.concept,
          imagePrompts: generated.value.image_prompts,
          visualScenes: generated.value.visual_scenes,
        })
      : null;
    creativeDnaDiagnostics = buildCreativeDnaDiagnostics({
      plan: creativeCandidates,
      identityEnvironmentSuppressed:
        creativeIdentityPlan.identityEnvironmentSuppressed,
      validation,
      dnaResolve: creativeCandidatePlan.dnaResolve,
    });
    if (validation && !validation.passed) {
      console.warn(
        "[creative-dna] validation warnings",
        creativeCandidates.selectedCandidate.candidateId,
        validation.violations,
      );
    }
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
  {
    const ctaAlign = alignOnScreenCtaContract({
      videoScript: pkg.video?.script ?? null,
      visualScenes: pkg.visual_scenes,
    });
    if (ctaAlign.changed && pkg.video && ctaAlign.script !== null) {
      pkg.video = {
        ...pkg.video,
        script: ctaAlign.script,
      };
    }
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
    ...productPresentationPlan.persistenceFields,
    ...productPresentationFieldsForValidationPersistence(
      validateProductPresentationPackage({
        plan: productPresentationPlan.plan,
        visualScenes: pkg.visual_scenes,
        assets: assets.refs,
      }),
    ),
    ...attentionPlan.persistenceFields,
    ...(creativeCandidates
      ? creativeCandidateFieldsForPersistence(
          creativeCandidates,
          creativeDnaDiagnostics,
        )
      : {}),
    ...creativeEnginePersistence,
    ...(narrativeBeatPlan
      ? narrativeBeatFieldsForPersistence(narrativeBeatPlan, {
          storyProgression: storyProgressionDiagnostics,
          visualProgression: visualProgressionDiagnostics,
          informationProgression: postLlmInformationProgression,
          durationValidation,
          timelineDebug,
        })
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
    await assertNoActivePackageRender(supabase, { projectId, packageId });
    const videoItemId =
      upserted.find((r) => videoPlatformSet.has(r.platform))?.id ??
      primaryItemId;
    const videoInput = await buildVideoJobInput(supabase, projectId, pkg, {
      regenerated: true,
      creative_mode: directives.mode.id,
      creative_mode_beats: directives.mode.narrativeBeats,
      ...(narrativeBeatPlan
        ? {
            narrative_beat_roles: narrativeBeatPlan.beats.map((b) => b.role),
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
