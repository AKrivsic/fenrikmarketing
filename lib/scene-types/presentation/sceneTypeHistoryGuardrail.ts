import type { SceneType } from "@/lib/scene-types/sceneType";
import { DEFAULT_SCENE_TYPE } from "@/lib/scene-types/sceneType";
import type { VisualScene } from "@/lib/scene-types/visualScene";
import type {
  PresentationAnalyzerDecision,
} from "@/lib/scene-types/presentation/analyzePresentation";
import type { AnalyzePresentationResult } from "@/lib/scene-types/presentation/analyzePresentation";
import {
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

/**
 * Scene Types v2: history is a soft prompt signal only.
 * Never hard-downgrade an eligible typed scene because a sibling used it recently.
 */
export function evaluateSceneTypeHistoryDowngrade(_args: {
  type: SpecialSceneType;
  history: SceneTypeProjectHistory;
}): { downgrade: boolean; rule: SceneTypeHistoryRule; reason: string } | null {
  return null;
}

/**
 * Pass-through guardrail (v2). Series memory is applied in the generation prompt,
 * not by auto-downgrading accepted typed scenes. Never upgrades IMAGE.
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
  void args.history;
  void args.voiceoverText;
  void args.projectName;
  return {
    scenes: [...args.analyzed.scenes],
    decisions: args.analyzed.decisions.map((d) => ({ ...d })),
    historyDecisions: [],
    warnings: [...args.analyzed.warnings],
  };
}
