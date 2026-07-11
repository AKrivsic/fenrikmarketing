import type { SceneType } from "@/lib/scene-types/sceneType";
import { DEFAULT_SCENE_TYPE } from "@/lib/scene-types/sceneType";
import type { VisualScene } from "@/lib/scene-types/visualScene";
import {
  downgradeSceneToImage,
  narrationForScene,
} from "@/lib/scene-types/presentation/downgradeToImage";
import type {
  PresentationAnalyzerDecision,
  PresentationDecisionRule,
} from "@/lib/scene-types/presentation/analyzePresentation";
import type { AnalyzePresentationResult } from "@/lib/scene-types/presentation/analyzePresentation";
import {
  isSpecialSceneType,
  type SceneTypeProjectHistory,
  type SpecialSceneType,
} from "@/lib/scene-types/presentation/sceneTypeProjectHistory";

export type SceneTypeHistoryRule =
  | "scene_type_recently_overused"
  | "cta_recently_used"
  | "checklist_recently_used"
  | "phone_recently_used"
  | "quote_recently_used"
  | "statistic_recently_used";

export interface SceneTypeHistoryDecision {
  scene_id: string;
  requested_type: SceneType;
  final_type: typeof DEFAULT_SCENE_TYPE;
  rule: SceneTypeHistoryRule;
  reason: string;
}

function historyRuleForType(type: SpecialSceneType): SceneTypeHistoryRule {
  switch (type) {
    case "CHECKLIST":
      return "checklist_recently_used";
    case "PHONE":
      return "phone_recently_used";
    case "QUOTE":
      return "quote_recently_used";
    case "STATISTIC":
      return "statistic_recently_used";
    case "CTA":
      return "cta_recently_used";
    default:
      return "scene_type_recently_overused";
  }
}

export function evaluateSceneTypeHistoryDowngrade(args: {
  type: SpecialSceneType;
  history: SceneTypeProjectHistory;
}): { downgrade: boolean; rule: SceneTypeHistoryRule; reason: string } | null {
  const { type, history } = args;

  if (type === "CTA" && history.ctaUsedInRecentWindow) {
    return {
      downgrade: true,
      rule: "cta_recently_used",
      reason:
        "a CTA scene appeared in a recent package for this project; prefer narration/subtitles or IMAGE",
    };
  }

  if (history.lastPackageSpecialTypes.includes(type)) {
    return {
      downgrade: true,
      rule: historyRuleForType(type),
      reason:
        "the immediately previous package already used this scene type; prefer IMAGE for organic variety",
    };
  }

  if (history.weeklyStrategySpecialTypes.includes(type)) {
    return {
      downgrade: true,
      rule: historyRuleForType(type),
      reason:
        "another package in the current weekly strategy already used this scene type; IMAGE is sufficient",
    };
  }

  return null;
}

/**
 * Downgrades accepted non-IMAGE scenes when recent project history shows
 * overuse. Never upgrades IMAGE to another type.
 */
export function applySceneTypeHistoryGuardrail(args: {
  analyzed: AnalyzePresentationResult;
  history: SceneTypeProjectHistory;
  voiceoverText: string;
  projectName?: string;
}): {
  scenes: VisualScene[];
  decisions: PresentationAnalyzerDecision[];
  historyDecisions: SceneTypeHistoryDecision[];
  warnings: string[];
} {
  const scenes = [...args.analyzed.scenes];
  const decisions = args.analyzed.decisions.map((d) => ({ ...d }));
  const historyDecisions: SceneTypeHistoryDecision[] = [];
  const warnings = [...args.analyzed.warnings];
  const sceneCount = scenes.length;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (!scene) continue;
    const finalType = scene.type;
    if (!isSpecialSceneType(finalType)) continue;

    const decisionIdx = decisions.findIndex(
      (d) => d.scene_id === scene.id && d.final_type === finalType,
    );
    const decision =
      decisionIdx >= 0 ? decisions[decisionIdx] : null;
    if (!decision || decision.rule !== "allowed") continue;

    const verdict = evaluateSceneTypeHistoryDowngrade({
      type: finalType,
      history: args.history,
    });
    if (!verdict?.downgrade) continue;

    const narration = narrationForScene({
      voiceoverText: args.voiceoverText,
      sceneIndex: i,
      sceneCount,
      narrationHint: scene.narration_hint,
    });
    const downgraded = downgradeSceneToImage({
      scene,
      narration,
      projectName: args.projectName,
    });
    scenes[i] = downgraded;

    const sceneId = scene.id ?? decision.scene_id;
    const updated: PresentationAnalyzerDecision = {
      scene_id: sceneId,
      requested_type: decision.requested_type,
      final_type: DEFAULT_SCENE_TYPE,
      rule: verdict.rule as PresentationDecisionRule,
      reason: verdict.reason,
    };
    if (decisionIdx >= 0) decisions[decisionIdx] = updated;

    historyDecisions.push({
      scene_id: sceneId,
      requested_type: decision.requested_type,
      final_type: DEFAULT_SCENE_TYPE,
      rule: verdict.rule,
      reason: verdict.reason,
    });
    warnings.push(`${sceneId}: ${verdict.rule}`);
  }

  return { scenes, decisions, historyDecisions, warnings };
}
