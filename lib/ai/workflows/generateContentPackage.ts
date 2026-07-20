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
import {
  buildRecentAssetUsageBlock,
  loadRecentAssetUsageContext,
} from "@/lib/assets/loadRecentAssetUsage";
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
  makePackageGuardrails,
  normalizeImagePrompts,
  type StrategyItemContext,
} from "@/lib/ai/workflows/packageShared";
import {
  normalizeVisualScenePlan,
  syncLegacyFieldsFromVisualScenes,
} from "@/lib/content-package/visualScenePlan";
import { derivePromptPresentationTypes } from "@/lib/scene-types/presentation/promptPresentationTypes";
import { assetSignalsFromRef } from "@/lib/scene-types/presentation/projectSignals";
import { applyPresentationFrequencyToPackage } from "@/lib/scene-types/presentation/presentationFrequencyGuardrail";
import { countChecklistEntries } from "@/lib/scene-types/presentation/checklistFrequencyGuardrail";
import { countPhoneEntries } from "@/lib/scene-types/presentation/phoneFrequencyGuardrail";
import { countQuoteEntries } from "@/lib/scene-types/presentation/quoteFrequencyGuardrail";
import { countStatisticEntries } from "@/lib/scene-types/presentation/statisticFrequencyGuardrail";
import { countCtaEntries } from "@/lib/scene-types/presentation/ctaFrequencyGuardrail";
import { resolveChecklistGenerationMode } from "@/lib/scene-types/checklistGenerationMode";
import { resolveChecklistAllowlistStatus } from "@/lib/scene-types/checklistProductionRollout";
import { buildAntiRepetitionMemory } from "@/lib/ai/workflows/antiRepetitionMemory";
import { loadSceneTypeProjectHistory } from "@/lib/scene-types/presentation/sceneTypeProjectHistory";
import { buildSceneTypeHistoryRestraintBlock } from "@/lib/scene-types/presentation/sceneTypeHistoryPrompt";
import {
  loadSeriesCreativeContext,
} from "@/lib/series/loadSeriesCreativeContext";
import { buildSeriesCreativeContextBlock } from "@/lib/series/seriesDiversityPrompt";
import {
  resolveVisualProfileForPackage,
  visualProfileFieldsForPersistence,
} from "@/lib/visual-profile/packageVisualProfile";
import { visualProfileImagePromptBlock } from "@/lib/visual-profile/imagePromptProfile";
import { planCreativeIdentityForPackage } from "@/lib/creative-identity/planForPackage";
import { planVisualNarrativeForPackage } from "@/lib/visual-narrative/planForPackage";
import { planVisualMediumForPackage } from "@/lib/visual-medium/planForPackage";
import { planProductRevealForPackage } from "@/lib/product-reveal/planForPackage";
import { planAttentionForPackage } from "@/lib/attention/planForPackage";
import { alignHookWithFirstSpoken } from "@/lib/attention/alignHookVoiceover";
import { attentionFieldsForVideoJob } from "@/lib/attention/promptBlocks";
import {
  attachFidelityToPlan,
  attachProductDemonstrationIntegrityToPlan,
  attachStoryIntegrityToPlan,
  buildCreativeDnaDiagnostics,
  checkConceptFidelity,
  creativeCandidateFieldsForPersistence,
  fidelityRepairAppendix,
  planCreativeCandidatesForPackage,
  storyIntegrityRepairAppendix,
  storyIntegrityValidationIssues,
  validateCreativeDnaAgainstPackage,
  validateProductDemonstrationIntegrity,
  productDemonstrationValidationIssues,
  validateStoryIntegrity,
} from "@/lib/creative-candidates";
import {
  classifyFidelityFailuresForRepair,
} from "@/lib/creative-candidates/fidelityCheck";
import { enforceCandidateHook } from "@/lib/creative-candidates/enforceCandidateHook";
import { validateAndRepairCandidate } from "@/lib/creative-candidates/candidateValidation";
import { planRequiresVideo } from "@/lib/api/packageReconcileStatus";
import { ensureStructuredProductDemo } from "@/lib/scene-types/product-demo/ensureStructuredProductDemo";
import { extractDemoVariantsFromPackageBriefs } from "@/lib/scene-types/product-demo/demoVariant";
import type { ProductDemoVariant } from "@/lib/scene-types/product-demo/demoVariant";
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
import { ensureUniqueHook } from "@/lib/ai/workflows/regenerateHook";
import {
  DEFAULT_GENERATION_MODE,
  resolveGenerationMode,
  type GenerationMode,
} from "@/lib/ai/generationMode";
import { resolvePackageAssetCoverage } from "@/lib/assets/assetCoveragePolicy";
import { resolvePreferredVideoUsageFromRef } from "@/lib/assets/preferredVideoUsage";
import { collectAssetUsageFromPackage } from "@/lib/content-package/visualScenePlan";

// Generate Content Package — Claude can exceed the default 60s transport budget;
// align with weekly/production strategy. Single transport attempt per validation
// try so n8n/Vercel 300s is not spent on stacked HTTP retries.
const GENERATE_CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS = 180_000;
const GENERATE_CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS = 1;

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
    return await runGenerateContentPackageUnchecked(input, client);
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
  const supabase: SupabaseClient = client ?? (await createSupabaseServerClient());

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

  const project = await loadProjectOrThrow(supabase, input.projectId);
  const context = await loadStrategyItemContext(
    supabase,
    input.projectId,
    input.strategyItemId,
  );
  const assets = await loadAvailableAssets(supabase, input.projectId);
  const recentAssetUsageBlock = buildRecentAssetUsageBlock(
    await loadRecentAssetUsageContext(supabase, input.projectId),
  );
  // Phase 2E — recent hooks/topics/CTAs/scenarios fed into the prompt so the
  // model avoids repeating itself.
  const memory = await buildAntiRepetitionMemory(supabase, input.projectId);
  const sceneTypeHistory = await loadSceneTypeProjectHistory(
    supabase,
    input.projectId,
    { currentWeeklyStrategyId: context.weeklyStrategyId },
  );
  const sceneTypeHistoryBlock =
    buildSceneTypeHistoryRestraintBlock(sceneTypeHistory);
  const seriesCreative = await loadSeriesCreativeContext({
    supabase,
    projectId: input.projectId,
    weeklyStrategyId: context.weeklyStrategyId,
    productionRunId: context.productionRunId,
  });
  const seriesCreativeContextBlock = buildSeriesCreativeContextBlock({
    series: seriesCreative,
  });

  // Sprint 5.1 — recent PRODUCT_DEMO variants in this production run (LRU rotation).
  const recentDemoVariants: ProductDemoVariant[] = context.productionRunId
    ? await loadRunRecentDemoVariants(
        supabase,
        input.projectId,
        context.productionRunId,
        context.strategyItemId,
      )
    : [];

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
  // Visual Profile v3 needs the mode before AUTO scoring (package feel).
  const directives: CreativeDirectives = pickCreativeDirectives(
    buildCreativeSeed(
      FUNNEL_STAGE_LABELS[context.funnelStage],
      context.topic,
      context.angle,
    ),
  );

  // Visual Profile v3 — Product Brain baseline + package feel (funnel/topic/angle/mode).
  const resolvedVisualProfile = resolveVisualProfileForPackage({
    project,
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

  // Candidates first so Creative DNA can neutralize conflicting Identity environments.
  const creativeCandidatePlan = planCreativeCandidatesForPackage({
    topic: context.topic,
    angle: context.angle,
    painPoints: project.pain_points ?? [],
    productIs: project.product_is ?? [],
    requireVideo,
  });
  let creativeCandidates: CreativeCandidatePlan | null = creativeCandidatePlan.plan;
  const selectedDna = normalizeCreativeDNA(
    creativeCandidates?.selectedCandidate.creativeDNA,
  );

  // Narrative Beats — derived story spine (no new LLM). Between candidate and storyboard.
  const narrativeBeatPlan: NarrativeBeatPlan | null =
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
  const narrativeBeatPromptBlock = narrativeBeatPlan
    ? buildNarrativeBeatPromptBlock(narrativeBeatPlan)
    : "";
  let storyProgressionDiagnostics: StoryProgressionDiagnostics | null = null;
  let visualProgressionDiagnostics: VisualProgressionDiagnostics | null = null;
  let postLlmInformationProgression: InformationProgressionDiagnostics | null =
    null;
  let durationValidation: DurationValidationDiagnostics | null = null;
  let timelineDebug: NarrativeTimelineDebug | null = null;

  const creativeIdentityPlan = planCreativeIdentityForPackage({
    project,
    visualProfile: resolvedVisualProfile.profile,
    projectId: input.projectId,
    strategyItemId: context.strategyItemId,
    packageIndex: context.packageIndex,
    topic: context.topic,
    angle: context.angle,
    series: seriesCreative,
    requireVideo,
    creativeDNA: selectedDna,
  });

  const visualNarrativePlan = planVisualNarrativeForPackage({
    project,
    identity: creativeIdentityPlan.identity,
    projectId: input.projectId,
    strategyItemId: context.strategyItemId,
    packageIndex: context.packageIndex,
    topic: context.topic,
    angle: context.angle,
    series: seriesCreative,
    funnelStage: context.funnelStage,
    requireVideo,
  });

  const visualMediumPlan = planVisualMediumForPackage({
    project,
    visualProfile: resolvedVisualProfile.profile,
    narrative: visualNarrativePlan.plan,
    identity: creativeIdentityPlan.identity,
    series: seriesCreative,
    funnelStage: context.funnelStage,
    requireVideo,
    projectId: input.projectId,
    strategyItemId: context.strategyItemId,
    packageIndex: context.packageIndex,
    topic: context.topic,
    angle: context.angle,
  });

  const productRevealPlan = planProductRevealForPackage({
    project,
    generationMode,
    assets: assets.refs,
    narrative: visualNarrativePlan.plan,
    visualMedium: visualMediumPlan.resolved?.medium ?? "PHOTOGRAPHIC",
    requireVideo,
  });

  const attentionPlan = planAttentionForPackage({
    project,
    projectId: input.projectId,
    strategyItemId: context.strategyItemId,
    packageIndex: context.packageIndex,
    topic: context.topic,
    angle: context.angle,
    funnelStage: context.funnelStage,
    creativeMode: directives.mode.id,
    series: seriesCreative,
    requireVideo,
  });

  const buildPackagePrompt = (fidelityRepair?: string) =>
    buildGenerateContentPackagePrompt({
      project,
      funnelStage: context.funnelStage,
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
      promptPresentationTypes,
      sceneTypeHistoryBlock,
      seriesCreativeContextBlock,
      visualProfileImagePromptBlock: visualProfileImagePromptBlockText,
      creativeIdentityPromptBlock: creativeIdentityPlan.promptBlock || undefined,
      visualNarrativePromptBlock: visualNarrativePlan.promptBlock || undefined,
      visualMediumPromptBlock: visualMediumPlan.promptBlock || undefined,
      productRevealPromptBlock: productRevealPlan.promptBlock || undefined,
      attentionPromptBlock: attentionPlan.promptBlock || undefined,
      creativeCandidatePromptBlock:
        creativeCandidatePlan.promptBlock || undefined,
      narrativeBeatPromptBlock: narrativeBeatPromptBlock || undefined,
      creativeDnaPromptBlock: creativeCandidatePlan.dnaPromptBlock || undefined,
      creativeCandidateFidelityRepair: fidelityRepair,
    });

  let generated = await generateValidatedJson({
    textProvider: getCopywritingProvider(),
    system: buildGeneratePackageSystem(requireVideo),
    prompt: buildPackagePrompt(),
    validator: buildContentPackageSchema(targetPlatforms, { requireVideo }),
    guardrails: makePackageGuardrails({
      project,
      context,
      classById: assets.classById,
      requiredPlatforms: targetPlatforms,
      requireVideo,
      assetCoverage,
      preferredVideoUsageById: requireVideo ? preferredVideoUsageById : undefined,
    }),
    timeoutMs: GENERATE_CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
    maxTransportAttempts: GENERATE_CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
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

  // Attention & Engagement v1 — keep stored hook and first spoken line aligned.
  let aligned = alignHookWithFirstSpoken({
    hook: generated.value.hook,
    voiceoverText: generated.value.voiceover_text,
  });
  generated.value.hook = aligned.hook;
  generated.value.voiceover_text = aligned.voiceover_text;

  // Creative Candidate Selection — concept fidelity.
  // Order: deterministic hook enforce → fidelity check → material repair only.
  let regenerationReason: string | null = null;
  let fidelityFirstPassPassed: boolean | null = null;
  let fidelityFirstPassReasons: string[] = [];
  let fullPackageGenerations = 1;
  let hookDeterministicEnforceReason: string | null = null;
  let candidateRepairReasons: string[] = [];
  const generationTelemetry: Array<Record<string, unknown>> = [];

  const recordPhase = (
    phase: string,
    startMs: number,
    extra?: Record<string, unknown>,
  ) => {
    generationTelemetry.push({
      phase,
      latency_ms: Date.now() - startMs,
      provider: "anthropic",
      ...extra,
    });
  };

  if (creativeCandidates && requireVideo) {
    const repairedCand = validateAndRepairCandidate(
      creativeCandidates.selectedCandidate,
      { productLabel: project.product_is?.[0] },
    );
    candidateRepairReasons = repairedCand.reasons;
    creativeCandidates = {
      ...creativeCandidates,
      selectedCandidate: repairedCand.candidate,
    };

    const enforced = enforceCandidateHook({
      hookLine: creativeCandidates.selectedCandidate.hookLine,
      hook: generated.value.hook,
      voiceoverText: generated.value.voiceover_text,
    });
    hookDeterministicEnforceReason = enforced.reason;
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
    fidelityFirstPassPassed = fidelity.passed;
    fidelityFirstPassReasons = [...fidelity.failureReasons];
    if (fidelity.diagnostics?.length) {
      console.info(
        "[concept-fidelity] first-pass diagnostics",
        creativeCandidates.selectedCandidate.candidateId,
        fidelity.diagnostics.map((d) => ({
          rule: d.rule,
          passed: d.passed,
          reason: d.reason,
          aliases: d.matchedAliases,
        })),
      );
    }

    const classification = classifyFidelityFailuresForRepair(fidelity);
    if (!fidelity.passed && classification.material) {
      regenerationReason = classification.materialReasons.join(",");
      const repairStart = Date.now();
      const repaired = await generateValidatedJson({
        textProvider: getCopywritingProvider(),
        system: buildGeneratePackageSystem(requireVideo),
        prompt: buildPackagePrompt(
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
          assetCoverage,
          preferredVideoUsageById: requireVideo
            ? preferredVideoUsageById
            : undefined,
        }),
        timeoutMs: GENERATE_CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
        maxTransportAttempts:
          GENERATE_CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
      });
      recordPhase("fidelity_repair", repairStart, {
        ok: repaired.ok,
        attempts: repaired.ok ? repaired.attempts : undefined,
      });
      if (repaired.ok) {
        fullPackageGenerations += 1;
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
    } else if (!fidelity.passed && !classification.material) {
      // Deterministic-only residues — do not burn a full Claude regenerate.
      regenerationReason = null;
      console.info(
        "[concept-fidelity] non-material failures after deterministic fixes",
        classification.deterministicReasons,
      );
    }
    creativeCandidates = attachFidelityToPlan(
      creativeCandidates,
      fidelity,
      regenerationReason,
    );

    // Hard gate: after at most one material fidelity repair, do not persist a
    // package that still fails concept fidelity (same terminal pattern as story).
    if (!fidelity.passed) {
      console.error(
        "[concept-fidelity] hard fail after repair",
        creativeCandidates.selectedCandidate.candidateId,
        fidelity.failureReasons,
      );
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

    // Sprint 4C.1 / 5.3 — ensure structured PRODUCT_DEMO before Story Integrity
    // when an authored beat already exists (never fabricate chatbot demos).
    const ensureDemo = (force: boolean) => {
      if (!generated.ok) {
        throw new Error("ensureDemo requires a successful package generation");
      }
      const narrativeText = [
        generated.value.hook,
        generated.value.voiceover_text,
        generated.value.video?.concept,
        generated.value.scenario,
      ]
        .filter(Boolean)
        .join(" ");
      const ensured = ensureStructuredProductDemo({
        visualScenes: generated.value.visual_scenes,
        winner: creativeCandidates!.selectedCandidate,
        force,
        narrativeText,
        recentVariants: recentDemoVariants,
      });
      generated.value.visual_scenes =
        ensured.scenes as typeof generated.value.visual_scenes;
      return ensured;
    };
    ensureDemo(false);

    // Story Integrity — selected commercial world must survive every beat.
    // Hard gate: one repair, then fail generation (do not silently continue).
    let storyIntegrity = validateStoryIntegrity({
      winner: creativeCandidates.selectedCandidate,
      voiceoverText: generated.value.voiceover_text,
      packageCta: generated.value.cta?.text ?? "",
      imagePrompts: generated.value.image_prompts,
      visualScenes: generated.value.visual_scenes,
      hook: generated.value.hook,
    });
    if (!storyIntegrity.passed) {
      const integrityReason = `story_integrity:${storyIntegrity.summary}`;
      regenerationReason = regenerationReason
        ? `${regenerationReason};${integrityReason}`
        : integrityReason;
      const storyStart = Date.now();
      const repairedIntegrity = await generateValidatedJson({
        textProvider: getCopywritingProvider(),
        system: buildGeneratePackageSystem(requireVideo),
        prompt: buildPackagePrompt(
          storyIntegrityRepairAppendix(
            creativeCandidates.selectedCandidate,
            storyIntegrity,
            generated.value.cta?.text ?? "",
          ),
        ),
        validator: buildContentPackageSchema(targetPlatforms, { requireVideo }),
        guardrails: makePackageGuardrails({
          project,
          context,
          classById: assets.classById,
          requiredPlatforms: targetPlatforms,
          requireVideo,
          assetCoverage,
          preferredVideoUsageById: requireVideo
            ? preferredVideoUsageById
            : undefined,
        }),
        timeoutMs: GENERATE_CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
        maxTransportAttempts:
          GENERATE_CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
      });
      recordPhase("story_repair", storyStart, {
        ok: repairedIntegrity.ok,
      });
      if (repairedIntegrity.ok) {
        fullPackageGenerations += 1;
        generated = repairedIntegrity;
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
        creativeCandidates = attachFidelityToPlan(
          creativeCandidates,
          fidelity,
          regenerationReason,
        );
        ensureDemo(false);
        storyIntegrity = validateStoryIntegrity({
          winner: creativeCandidates.selectedCandidate,
          voiceoverText: generated.value.voiceover_text,
          packageCta: generated.value.cta?.text ?? "",
          imagePrompts: generated.value.image_prompts,
          visualScenes: generated.value.visual_scenes,
          hook: generated.value.hook,
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
    if (!storyIntegrity.passed) {
      console.error(
        "[story-integrity] hard fail after repair",
        creativeCandidates.selectedCandidate.candidateId,
        storyIntegrity.violations,
      );
      return {
        ok: false,
        error: "generation_failed",
        validationErrors: storyIntegrityValidationIssues(storyIntegrity).map(
          (issue) => ({
            path: issue.path,
            message: issue.message,
          }),
        ),
        attempts: generated.attempts,
      };
    }

    // Sprint 4C.1 — Product Demonstration Integrity (structured beat +
    // controlled chat visual). One deterministic repair (force inject), then fail.
    let productDemoIntegrity = validateProductDemonstrationIntegrity({
      winner: creativeCandidates.selectedCandidate,
      voiceoverText: generated.value.voiceover_text,
      imagePrompts: generated.value.image_prompts,
      visualScenes: generated.value.visual_scenes,
    });
    if (!productDemoIntegrity.passed) {
      const demoReason = `product_demonstration_integrity:${productDemoIntegrity.summary}`;
      regenerationReason = regenerationReason
        ? `${regenerationReason};${demoReason}`
        : demoReason;
      // Deterministic repair: replace failing resolution with structured PRODUCT_DEMO.
      ensureDemo(true);
      productDemoIntegrity = validateProductDemonstrationIntegrity({
        winner: creativeCandidates.selectedCandidate,
        voiceoverText: generated.value.voiceover_text,
        imagePrompts: generated.value.image_prompts,
        visualScenes: generated.value.visual_scenes,
      });
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
        ).map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
        attempts: generated.attempts,
      };
    }

    // Diagnostics only — story / visual / information progression (no regenerate).
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
    if (
      narrativeBeatPlan &&
      !narrativeBeatPlan.metaphorClarity.understandableWithinFirstThird
    ) {
      console.warn(
        "[metaphor-clarity] opening may need earlier product-problem bridge (first third)",
        narrativeBeatPlan.metaphorClarity.reasons,
      );
    }
  }

  // Duration validation + timeline debug (deterministic estimate from VO words).
  if (narrativeBeatPlan && requireVideo) {
    const vo = generated.value.voiceover_text ?? "";
    const wordCount = vo.trim().split(/\s+/).filter(Boolean).length;
    const estimatedSeconds = Math.max(15, Math.min(25, wordCount / 2.6));
    const roles = narrativeBeatRolesForCount(
      Math.min(5, Math.max(3, narrativeBeatPlan.beats.length)),
    );
    // Rough equal word split for pre-render diagnostics
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
    if (!durationValidation.passed) {
      console.warn(
        "[duration-validation] pacing diagnostics",
        durationValidation.summary,
      );
    }
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

  // MVP scene/image cost cap — drop empty prompts and cap to the supported max
  // BEFORE persistence, so the stored package_brief and the queued video job
  // both carry the exact render-ready list (≤5 generated stills per video).
  normalizeVisualScenePlan(generated.value, {
    workflow: "generate",
    strategy_item_id: context.strategyItemId,
  }, {
    classById: assets.classById,
  });
  const requestedChecklistCount = countChecklistEntries(
    (generated.value.visual_scenes ?? []) as import("@/lib/content-package/generatedVisualScene").PackageVisualSceneEntry[],
  );
  const requestedPhoneCount = countPhoneEntries(
    (generated.value.visual_scenes ?? []) as import("@/lib/content-package/generatedVisualScene").PackageVisualSceneEntry[],
  );
  const requestedQuoteCount = countQuoteEntries(
    (generated.value.visual_scenes ?? []) as import("@/lib/content-package/generatedVisualScene").PackageVisualSceneEntry[],
  );
  const requestedStatisticCount = countStatisticEntries(
    (generated.value.visual_scenes ?? []) as import("@/lib/content-package/generatedVisualScene").PackageVisualSceneEntry[],
  );
  const requestedCtaCount = countCtaEntries(
    (generated.value.visual_scenes ?? []) as import("@/lib/content-package/generatedVisualScene").PackageVisualSceneEntry[],
  );
  const frequencyDecisions = applyPresentationFrequencyToPackage(generated.value);
  if (frequencyDecisions.length > 0) {
    syncLegacyFieldsFromVisualScenes(generated.value);
  }
  generated.value.presentation_generation = {
    mode: resolveChecklistGenerationMode(),
    project_id: input.projectId,
    ...visualProfileFieldsForPersistence(resolvedVisualProfile),
    checklist_allowlist_status: resolveChecklistAllowlistStatus(input.projectId),
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
      ? creativeCandidateFieldsForPersistence(
          creativeCandidates,
          creativeDnaDiagnostics,
        )
      : {}),
    generation_telemetry: {
      strategy_item_id: context.strategyItemId,
      production_run_id: context.productionRunId ?? null,
      full_package_generations: fullPackageGenerations,
      fidelity_first_pass_passed: fidelityFirstPassPassed,
      fidelity_first_pass_failure_reasons: fidelityFirstPassReasons,
      fidelity_final_passed:
        creativeCandidates?.finalScriptFidelity?.passed ?? null,
      hook_deterministic_enforce_reason: hookDeterministicEnforceReason,
      candidate_repair_reasons: candidateRepairReasons,
      phases: generationTelemetry,
    },
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

// Run Package Diversity V1 — loads a compact list of the angles already used by
// SIBLING packages in the same production run, so the prompt can say "do not
// repeat these". Reuses EXISTING rows only (strategy items tagged with the run
// in their brief + their content_packages' title/hook) — no new table, no AI
// call. Best-effort: any error yields an empty list so generation is never
// blocked by this enrichment.
const SIBLING_ANGLE_LIMIT = 12;
async function loadRunRecentDemoVariants(
  supabase: SupabaseClient,
  projectId: string,
  productionRunId: string,
  currentStrategyItemId: string,
): Promise<ProductDemoVariant[]> {
  try {
    const { data: items, error: itemsErr } = await supabase
      .from("content_strategy_items")
      .select("id")
      .eq("project_id", projectId)
      .eq("brief->>production_run_id", productionRunId);
    if (itemsErr || !items) return [];

    const siblingItemIds = (items as { id: string }[])
      .map((row) => row.id)
      .filter((id) => id && id !== currentStrategyItemId);
    if (siblingItemIds.length === 0) return [];

    const { data: pkgs, error: pkgErr } = await supabase
      .from("content_packages")
      .select("package_brief, created_at")
      .eq("project_id", projectId)
      .in("strategy_item_id", siblingItemIds)
      .order("created_at", { ascending: true })
      .limit(24);
    if (pkgErr || !pkgs) return [];

    return extractDemoVariantsFromPackageBriefs(
      (pkgs as { package_brief: unknown }[]).map((p) => p.package_brief),
    );
  } catch {
    return [];
  }
}

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
