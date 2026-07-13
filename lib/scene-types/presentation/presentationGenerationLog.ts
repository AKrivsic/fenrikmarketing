import type { PresentationAnalyzerDecision } from "@/lib/scene-types/presentation/analyzePresentation";
import type { ChecklistFrequencyDecision } from "@/lib/scene-types/presentation/checklistFrequencyGuardrail";
import type { PhoneFrequencyDecision } from "@/lib/scene-types/presentation/phoneFrequencyGuardrail";
import type { QuoteFrequencyDecision } from "@/lib/scene-types/presentation/quoteFrequencyGuardrail";
import type { StatisticFrequencyDecision } from "@/lib/scene-types/presentation/statisticFrequencyGuardrail";
import type { PresentationFrequencyDecision } from "@/lib/scene-types/presentation/presentationFrequencyGuardrail";
import { checklistGenerationModeLabel } from "@/lib/scene-types/checklistGenerationMode";
import { CHECKLIST_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/checklistSceneRenderer";
import { PHONE_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/phoneSceneRenderer";
import { QUOTE_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/quoteSceneRenderer";
import { STATISTIC_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/statisticSceneRenderer";
import { CTA_SCENE_RENDERER_VERSION } from "@/lib/scene-types/renderers/ctaSceneRenderer";
import type { CtaFrequencyDecision } from "@/lib/scene-types/presentation/ctaFrequencyGuardrail";
import type { SceneTypeHistoryDecision } from "@/lib/scene-types/presentation/sceneTypeHistoryGuardrail";
import {
  resolveChecklistAllowlistStatus,
  type ChecklistAllowlistStatus,
} from "@/lib/scene-types/checklistProductionRollout";
import type { SceneType } from "@/lib/scene-types/sceneType";

export interface PresentationGenerationLog {
  mode: string;
  project_id?: string;
  package_id?: string | null;
  checklist_allowlist_status?: ChecklistAllowlistStatus;
  checklist_renderer_version?: string | null;
  phone_renderer_version?: string | null;
  quote_renderer_version?: string | null;
  statistic_renderer_version?: string | null;
  cta_renderer_version?: string | null;
  requested_checklist_count: number;
  accepted_checklist_count: number;
  downgraded_checklist_count: number;
  requested_phone_count: number;
  accepted_phone_count: number;
  downgraded_phone_count: number;
  requested_quote_count: number;
  accepted_quote_count: number;
  downgraded_quote_count: number;
  requested_statistic_count: number;
  accepted_statistic_count: number;
  downgraded_statistic_count: number;
  requested_cta_count: number;
  accepted_cta_count: number;
  downgraded_cta_count: number;
  frequency_decisions: PresentationFrequencyDecision[];
  history_decisions?: SceneTypeHistoryDecision[];
  analyzer_decisions: PresentationAnalyzerDecision[];
  downgrade_rules: string[];
  final_worker_scene_types: SceneType[];
  visual_profile?: string;
  visual_profile_version?: string;
  visual_profile_source?: string;
  visual_profile_scores?: Record<string, number>;
  visual_profile_reasons?: string[];
  series_context_considered?: boolean;
  recent_creative_fingerprints?: Record<string, unknown>[];
  cta_selected?: boolean;
  cta_decision_reason?: string | null;
  cta_composition_id?: string | null;
  visual_beat_count?: number;
  target_visual_beat_count?: number;
  sparse_plan_adjustment?: boolean;
  scene_type_diversity_notes?: string[];
}

export function buildPresentationGenerationLog(args: {
  projectId: string;
  packageId?: string | null;
  requestedChecklistCount: number;
  requestedPhoneCount: number;
  requestedQuoteCount: number;
  requestedStatisticCount: number;
  requestedCtaCount: number;
  frequencyDecisions: PresentationFrequencyDecision[];
  historyDecisions?: SceneTypeHistoryDecision[];
  analyzerDecisions: PresentationAnalyzerDecision[];
  finalWorkerSceneTypes: SceneType[];
}): PresentationGenerationLog {
  const downgradeRules = new Set<string>();
  for (const d of args.frequencyDecisions) {
    downgradeRules.add(d.rule);
  }
  for (const d of args.historyDecisions ?? []) {
    downgradeRules.add(d.rule);
  }
  for (const d of args.analyzerDecisions) {
    if (d.requested_type === "CHECKLIST" && d.final_type !== "CHECKLIST") {
      downgradeRules.add(d.rule);
    }
    if (d.requested_type === "PHONE" && d.final_type !== "PHONE") {
      downgradeRules.add(d.rule);
    }
    if (d.requested_type === "QUOTE" && d.final_type !== "QUOTE") {
      downgradeRules.add(d.rule);
    }
    if (d.requested_type === "STATISTIC" && d.final_type !== "STATISTIC") {
      downgradeRules.add(d.rule);
    }
    if (d.requested_type === "CTA" && d.final_type !== "CTA") {
      downgradeRules.add(d.rule);
    }
  }

  const acceptedChecklist = args.analyzerDecisions.filter(
    (d) =>
      d.requested_type === "CHECKLIST" && d.final_type === "CHECKLIST",
  ).length;

  const acceptedPhone = args.analyzerDecisions.filter(
    (d) => d.requested_type === "PHONE" && d.final_type === "PHONE",
  ).length;

  const acceptedQuote = args.analyzerDecisions.filter(
    (d) => d.requested_type === "QUOTE" && d.final_type === "QUOTE",
  ).length;

  const acceptedStatistic = args.analyzerDecisions.filter(
    (d) => d.requested_type === "STATISTIC" && d.final_type === "STATISTIC",
  ).length;

  const acceptedCta = args.analyzerDecisions.filter(
    (d) => d.requested_type === "CTA" && d.final_type === "CTA",
  ).length;

  const downgradedFromAnalyzerChecklist = args.analyzerDecisions.filter(
    (d) =>
      d.requested_type === "CHECKLIST" && d.final_type !== "CHECKLIST",
  ).length;

  const downgradedFromAnalyzerPhone = args.analyzerDecisions.filter(
    (d) => d.requested_type === "PHONE" && d.final_type !== "PHONE",
  ).length;

  const downgradedFromAnalyzerQuote = args.analyzerDecisions.filter(
    (d) => d.requested_type === "QUOTE" && d.final_type !== "QUOTE",
  ).length;

  const downgradedFromAnalyzerStatistic = args.analyzerDecisions.filter(
    (d) => d.requested_type === "STATISTIC" && d.final_type !== "STATISTIC",
  ).length;

  const downgradedFromAnalyzerCta = args.analyzerDecisions.filter(
    (d) => d.requested_type === "CTA" && d.final_type !== "CTA",
  ).length;

  const checklistFrequencyDowngrades = args.frequencyDecisions.filter(
    (d): d is ChecklistFrequencyDecision =>
      d.rule === "checklist_video_limit_exceeded",
  ).length;

  const phoneFrequencyDowngrades = args.frequencyDecisions.filter(
    (d): d is PhoneFrequencyDecision => d.rule === "phone_video_limit_exceeded",
  ).length;

  const quoteFrequencyDowngrades = args.frequencyDecisions.filter(
    (d): d is QuoteFrequencyDecision => d.rule === "quote_video_limit_exceeded",
  ).length;

  const statisticFrequencyDowngrades = args.frequencyDecisions.filter(
    (d): d is StatisticFrequencyDecision =>
      d.rule === "statistic_video_limit_exceeded",
  ).length;

  const ctaFrequencyDowngrades = args.frequencyDecisions.filter(
    (d): d is CtaFrequencyDecision =>
      d.rule === "cta_video_limit_exceeded" || d.rule === "cta_not_final_scene",
  ).length;

  return {
    mode: checklistGenerationModeLabel(),
    project_id: args.projectId,
    ...(args.packageId !== undefined ? { package_id: args.packageId } : {}),
    checklist_allowlist_status: resolveChecklistAllowlistStatus(args.projectId),
    checklist_renderer_version:
      acceptedChecklist > 0 ? CHECKLIST_SCENE_RENDERER_VERSION : null,
    phone_renderer_version:
      acceptedPhone > 0 ? PHONE_SCENE_RENDERER_VERSION : null,
    quote_renderer_version:
      acceptedQuote > 0 ? QUOTE_SCENE_RENDERER_VERSION : null,
    statistic_renderer_version:
      acceptedStatistic > 0 ? STATISTIC_SCENE_RENDERER_VERSION : null,
    cta_renderer_version:
      acceptedCta > 0 ? CTA_SCENE_RENDERER_VERSION : null,
    requested_checklist_count: args.requestedChecklistCount,
    accepted_checklist_count: acceptedChecklist,
    downgraded_checklist_count:
      checklistFrequencyDowngrades + downgradedFromAnalyzerChecklist,
    requested_phone_count: args.requestedPhoneCount,
    accepted_phone_count: acceptedPhone,
    downgraded_phone_count:
      phoneFrequencyDowngrades + downgradedFromAnalyzerPhone,
    requested_quote_count: args.requestedQuoteCount,
    accepted_quote_count: acceptedQuote,
    downgraded_quote_count:
      quoteFrequencyDowngrades + downgradedFromAnalyzerQuote,
    requested_statistic_count: args.requestedStatisticCount,
    accepted_statistic_count: acceptedStatistic,
    downgraded_statistic_count:
      statisticFrequencyDowngrades + downgradedFromAnalyzerStatistic,
    requested_cta_count: args.requestedCtaCount,
    accepted_cta_count: acceptedCta,
    downgraded_cta_count: ctaFrequencyDowngrades + downgradedFromAnalyzerCta,
    frequency_decisions: args.frequencyDecisions,
    history_decisions: args.historyDecisions ?? [],
    analyzer_decisions: args.analyzerDecisions.map((d) => ({
      scene_id: d.scene_id,
      requested_type: d.requested_type,
      final_type: d.final_type,
      rule: d.rule,
      reason: d.reason,
    })),
    downgrade_rules: Array.from(downgradeRules),
    final_worker_scene_types: args.finalWorkerSceneTypes,
  };
}

export function compactPresentationLogForBrief(
  log: PresentationGenerationLog,
): Record<string, unknown> {
  return {
    mode: log.mode,
    project_id: log.project_id,
    package_id: log.package_id ?? null,
    checklist_allowlist_status: log.checklist_allowlist_status,
    checklist_renderer_version: log.checklist_renderer_version ?? null,
    phone_renderer_version: log.phone_renderer_version ?? null,
    quote_renderer_version: log.quote_renderer_version ?? null,
    requested_checklist_count: log.requested_checklist_count,
    accepted_checklist_count: log.accepted_checklist_count,
    downgraded_checklist_count: log.downgraded_checklist_count,
    requested_phone_count: log.requested_phone_count,
    accepted_phone_count: log.accepted_phone_count,
    downgraded_phone_count: log.downgraded_phone_count,
    requested_quote_count: log.requested_quote_count,
    accepted_quote_count: log.accepted_quote_count,
    downgraded_quote_count: log.downgraded_quote_count,
    requested_statistic_count: log.requested_statistic_count,
    accepted_statistic_count: log.accepted_statistic_count,
    downgraded_statistic_count: log.downgraded_statistic_count,
    statistic_renderer_version: log.statistic_renderer_version ?? null,
    requested_cta_count: log.requested_cta_count,
    accepted_cta_count: log.accepted_cta_count,
    downgraded_cta_count: log.downgraded_cta_count,
    cta_renderer_version: log.cta_renderer_version ?? null,
    downgrade_rules: log.downgrade_rules,
    history_decisions: log.history_decisions ?? [],
    visual_profile: log.visual_profile ?? null,
    visual_profile_version: log.visual_profile_version ?? null,
    visual_profile_source: log.visual_profile_source ?? null,
    visual_profile_scores: log.visual_profile_scores ?? null,
    visual_profile_reasons: log.visual_profile_reasons ?? null,
    final_worker_scene_types: log.final_worker_scene_types,
    frequency_decisions: log.frequency_decisions,
    series_context_considered: log.series_context_considered ?? false,
    recent_creative_fingerprints: log.recent_creative_fingerprints ?? [],
    cta_selected: log.cta_selected ?? false,
    cta_decision_reason: log.cta_decision_reason ?? null,
    cta_composition_id: log.cta_composition_id ?? null,
    visual_beat_count: log.visual_beat_count ?? null,
    target_visual_beat_count: log.target_visual_beat_count ?? null,
    sparse_plan_adjustment: log.sparse_plan_adjustment ?? false,
    scene_type_diversity_notes: log.scene_type_diversity_notes ?? [],
  };
}
