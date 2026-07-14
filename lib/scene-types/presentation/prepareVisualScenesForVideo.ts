import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { PackageVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import type { Json, Project } from "@/lib/supabase/types";
import {
  analyzePresentation,
  packageCtaTextFromPackage,
  type PresentationAnalyzerDecision,
} from "@/lib/scene-types/presentation/analyzePresentation";
import { deriveAllowedSceneTypes } from "@/lib/scene-types/presentation/deriveAllowedSceneTypes";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import {
  assetSignalsFromRow,
  deriveProjectPresentationSignals,
} from "@/lib/scene-types/presentation/projectSignals";
import {
  countChecklistEntries,
  enforceChecklistVideoLimit,
  type ChecklistFrequencyDecision,
} from "@/lib/scene-types/presentation/checklistFrequencyGuardrail";
import {
  countPhoneEntries,
  enforcePhoneVideoLimit,
  type PhoneFrequencyDecision,
} from "@/lib/scene-types/presentation/phoneFrequencyGuardrail";
import {
  countQuoteEntries,
  enforceQuoteVideoLimit,
  type QuoteFrequencyDecision,
} from "@/lib/scene-types/presentation/quoteFrequencyGuardrail";
import {
  countStatisticEntries,
  enforceStatisticVideoLimit,
  type StatisticFrequencyDecision,
} from "@/lib/scene-types/presentation/statisticFrequencyGuardrail";
import {
  countCtaEntries,
  enforceCtaVideoLimitAndPosition,
  type CtaFrequencyDecision,
} from "@/lib/scene-types/presentation/ctaFrequencyGuardrail";
import type { PresentationFrequencyDecision } from "@/lib/scene-types/presentation/presentationFrequencyGuardrail";
import {
  buildPresentationGenerationLog,
  compactPresentationLogForBrief,
  type PresentationGenerationLog,
} from "@/lib/scene-types/presentation/presentationGenerationLog";
import { normalizePackageVisualScenes } from "@/lib/scene-types/compileScenePlan";
import type { VisualScene } from "@/lib/scene-types/visualScene";
import type { SceneType } from "@/lib/scene-types/sceneType";
import { loadSceneTypeProjectHistory } from "@/lib/scene-types/presentation/sceneTypeProjectHistory";
import { applySceneTypeHistoryGuardrail } from "@/lib/scene-types/presentation/sceneTypeHistoryGuardrail";
import {
  resolveVisualProfileForPackage,
  visualProfileFieldsForPersistence,
} from "@/lib/visual-profile/packageVisualProfile";
import {
  loadSeriesCreativeContext,
  seriesContextSummariesForLog,
} from "@/lib/series/loadSeriesCreativeContext";
import { expandSparseVisualPlan } from "@/lib/series/visualDensity";
import { applyTypedCtaSeriesPolicyToVisualScenes } from "@/lib/series/typedCtaPolicy";
import { enrichAcceptedCtaScenes } from "@/lib/series/enrichCtaScenes";
import { classifyAsset, type AssetClass } from "@/lib/ai/guardrails";
import { downgradeUnrenderableAssetScenes } from "@/lib/assets/assetRendererEligibility";
import { syncLegacyFieldsFromVisualScenes } from "@/lib/content-package/visualScenePlan";
import { readCreativeIdentityFromPackageBrief } from "@/lib/creative-identity/resolveCreativeIdentity";
import { creativeIdentityFieldsForPersistence } from "@/lib/creative-identity/promptBlocks";
import { CREATIVE_IDENTITY_VERSION } from "@/lib/creative-identity/types";

export interface PreparedVisualScenesResult {
  scenes: VisualScene[];
  decisions: PresentationAnalyzerDecision[];
  warnings: string[];
  allowedSceneTypes: string[];
  presentationLog: PresentationGenerationLog;
}

export async function prepareAnalyzedVisualScenesForPackage(args: {
  supabase: SupabaseClient;
  projectId: string;
  pkg: ContentPackageOutput;
  excludePackageId?: string | null;
  weeklyStrategyId?: string | null;
  productionRunId?: string | null;
}): Promise<PreparedVisualScenesResult> {
  const { supabase, projectId, pkg } = args;

  const series = await loadSeriesCreativeContext({
    supabase,
    projectId,
    weeklyStrategyId: args.weeklyStrategyId ?? null,
    productionRunId: args.productionRunId ?? null,
    excludePackageId: args.excludePackageId ?? null,
  });

  const history = await loadSceneTypeProjectHistory(supabase, projectId, {
    excludePackageId: args.excludePackageId ?? null,
    currentWeeklyStrategyId: args.weeklyStrategyId ?? null,
  });

  const { data: assetClassRows, error: assetClassErr } = await supabase
    .from("assets")
    .select("id, asset_mode, metadata")
    .eq("project_id", projectId)
    .eq("media_type", "image");
  if (assetClassErr) throw assetClassErr;
  const classById = new Map<string, AssetClass>();
  for (const row of assetClassRows ?? []) {
    classById.set(
      row.id as string,
      classifyAsset(
        row.asset_mode as string,
        (row.metadata as Record<string, unknown> | null) ?? null,
      ),
    );
  }

  let planEntries = (pkg.visual_scenes ?? []) as PackageVisualSceneEntry[];
  if (classById.size > 0 && planEntries.length > 0) {
    const downgraded = downgradeUnrenderableAssetScenes({
      scenes: planEntries,
      classById,
    });
    if (downgraded.downgradedCount > 0) {
      planEntries = downgraded.scenes;
      pkg.visual_scenes = planEntries as ContentPackageOutput["visual_scenes"];
      syncLegacyFieldsFromVisualScenes(pkg);
    }
  }

  const density = expandSparseVisualPlan({
    visualScenes: planEntries,
    voiceoverText: pkg.voiceover_text,
    durationSeconds: pkg.video?.duration_seconds,
  });
  planEntries = density.scenes;
  if (density.density.sparse_plan_adjustment) {
    pkg.visual_scenes = planEntries as ContentPackageOutput["visual_scenes"];
  }

  const typedCtaPolicy = applyTypedCtaSeriesPolicyToVisualScenes({
    visualScenes: planEntries,
    voiceoverText: pkg.voiceover_text,
    funnelStage: pkg.funnel_stage,
    history,
    series,
  });
  planEntries = typedCtaPolicy.scenes;
  if (typedCtaPolicy.guardrailDecisions.length > 0) {
    pkg.visual_scenes = planEntries as ContentPackageOutput["visual_scenes"];
  }

  const rawEntries = planEntries;
  const requestedChecklistCount = countChecklistEntries(rawEntries);
  const requestedPhoneCount = countPhoneEntries(rawEntries);
  const requestedQuoteCount = countQuoteEntries(rawEntries);
  const requestedStatisticCount = countStatisticEntries(rawEntries);
  const requestedCtaCount = countCtaEntries(rawEntries);

  const { scenes: afterChecklist, decisions: checklistFrequency } =
    enforceChecklistVideoLimit({
      visualScenes: rawEntries,
      voiceoverText: pkg.voiceover_text,
    });
  const { scenes: afterPhone, decisions: phoneFrequency } =
    enforcePhoneVideoLimit({
      visualScenes: afterChecklist,
      voiceoverText: pkg.voiceover_text,
    });
  const { scenes: afterQuote, decisions: quoteFrequency } =
    enforceQuoteVideoLimit({
      visualScenes: afterPhone,
      voiceoverText: pkg.voiceover_text,
    });
  const { scenes: afterStatistic, decisions: statisticFrequency } =
    enforceStatisticVideoLimit({
      visualScenes: afterQuote,
      voiceoverText: pkg.voiceover_text,
    });
  const { scenes: frequencyLimited, decisions: ctaFrequency } =
    enforceCtaVideoLimitAndPosition({
      visualScenes: afterStatistic,
      voiceoverText: pkg.voiceover_text,
    });
  const frequencyDecisions: PresentationFrequencyDecision[] = [
    ...checklistFrequency,
    ...phoneFrequency,
    ...quoteFrequency,
    ...statisticFrequency,
    ...ctaFrequency,
  ];

  const normalized = normalizePackageVisualScenes(
    frequencyLimited as unknown[],
  );

  const { data: projectRow, error: projectErr } = await supabase
    .from("projects")
    .select(
      "name, product_is, product_strengths, knowledge, default_cta, goal_type, tone_of_voice, target_audience",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (projectErr) throw projectErr;

  const { data: assetRows, error: assetErr } = await supabase
    .from("assets")
    .select("id, title, metadata")
    .eq("project_id", projectId)
    .eq("media_type", "image");
  if (assetErr) throw assetErr;

  const assetSignals = (assetRows ?? []).map((row) =>
    assetSignalsFromRow({
      id: row.id as string,
      title: row.title as string | null,
      metadata: row.metadata,
    }),
  );

  const proof = buildProofIndex(
    (projectRow?.knowledge as Json | null | undefined) ?? null,
  );
  const projectSignals = deriveProjectPresentationSignals({
    project: {
      product_is: (projectRow?.product_is as string[]) ?? [],
      product_strengths: (projectRow?.product_strengths as string[]) ?? [],
    } as Pick<Project, "product_is" | "product_strengths">,
    assets: assetSignals,
  });

  const packageCtaText = packageCtaTextFromPackage(pkg);

  const allowedSceneTypes = deriveAllowedSceneTypes({
    knowledge: (projectRow?.knowledge as Json | null | undefined) ?? null,
    proof,
    projectSignals,
    projectDefaultCta:
      typeof projectRow?.default_cta === "string" ? projectRow.default_cta : null,
    goalType:
      typeof projectRow?.goal_type === "string" ? projectRow.goal_type : null,
    packageCtaText,
  });

  const analyzed = analyzePresentation({
    scenes: normalized,
    allowedSceneTypes,
    voiceoverText: pkg.voiceover_text,
    proof,
    projectSignals,
    packageCtaText,
    projectDefaultCta:
      typeof projectRow?.default_cta === "string" ? projectRow.default_cta : null,
    projectName: typeof projectRow?.name === "string" ? projectRow.name : undefined,
    projectId,
  });

  const afterHistory = applySceneTypeHistoryGuardrail({
    analyzed,
    history,
    voiceoverText: pkg.voiceover_text,
    projectName: typeof projectRow?.name === "string" ? projectRow.name : undefined,
  });

  const resolvedProfile = resolveVisualProfileForPackage({
    project: {
      id: projectId,
      knowledge: projectRow?.knowledge ?? null,
      goal_type: projectRow?.goal_type as Project["goal_type"],
      tone_of_voice: projectRow?.tone_of_voice ?? null,
      target_audience: projectRow?.target_audience ?? null,
      product_strengths: (projectRow?.product_strengths as string[]) ?? [],
      product_is: (projectRow?.product_is as string[]) ?? [],
    },
    pkg,
  });

  const logoAssetAvailable = assetSignals.length > 0;

  const enrichedCta = enrichAcceptedCtaScenes({
    scenes: afterHistory.scenes,
    packageId: args.excludePackageId ?? null,
    funnelStage: pkg.funnel_stage,
    series,
    visualProfile: resolvedProfile.profile,
    logoAssetAvailable,
  });

  const finalWorkerSceneTypes = enrichedCta.scenes.map(
    (s) => s.type as SceneType,
  );

  const acceptedCta = enrichedCta.scenes.some((s) => s.type === "CTA");

  const storedIdentity = readCreativeIdentityFromPackageBrief(
    pkg as unknown as Record<string, unknown>,
  );

  const presentationLog: PresentationGenerationLog = {
    ...buildPresentationGenerationLog({
      projectId,
      requestedChecklistCount,
      requestedPhoneCount,
      requestedQuoteCount,
      requestedStatisticCount,
      requestedCtaCount,
      frequencyDecisions,
      historyDecisions: afterHistory.historyDecisions,
      analyzerDecisions: afterHistory.decisions,
      finalWorkerSceneTypes,
    }),
    ...visualProfileFieldsForPersistence(resolvedProfile),
    series_context_considered: true,
    recent_creative_fingerprints: seriesContextSummariesForLog(series),
    cta_selected: acceptedCta,
    cta_decision_reason: typedCtaPolicy.policy.reason,
    cta_composition_id: enrichedCta.compositionIds[0] ?? null,
    visual_beat_count: density.density.visual_beat_count,
    target_visual_beat_count: density.density.target_visual_beat_count,
    sparse_plan_adjustment: density.density.sparse_plan_adjustment,
    scene_type_diversity_notes: typedCtaPolicy.guardrailDecisions.map(
      (d) => `${d.rule}: ${d.reason}`,
    ),
    ...(storedIdentity
      ? {
          creative_identity_version: CREATIVE_IDENTITY_VERSION,
          ...creativeIdentityFieldsForPersistence(storedIdentity),
        }
      : {}),
  };

  return {
    scenes: enrichedCta.scenes,
    decisions: afterHistory.decisions,
    warnings: [
      ...afterHistory.warnings,
      ...frequencyDecisions.map(
        (d) => `${d.scene_id}: ${d.rule} — ${d.reason}`,
      ),
      ...typedCtaPolicy.guardrailDecisions.map(
        (d) => `${d.scene_id}: ${d.rule} — ${d.reason}`,
      ),
    ],
    allowedSceneTypes,
    presentationLog,
  };
}

export function mergePackagePresentationGenerationBrief(
  pkg: ContentPackageOutput,
  log: PresentationGenerationLog,
): void {
  const existing = pkg.presentation_generation ?? {};
  pkg.presentation_generation = {
    ...existing,
    ...compactPresentationLogForBrief(log),
  };
}

export type { ChecklistFrequencyDecision, PhoneFrequencyDecision, QuoteFrequencyDecision, StatisticFrequencyDecision, CtaFrequencyDecision };
