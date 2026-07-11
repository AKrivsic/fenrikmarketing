import { isSceneTypesEnabled } from "@/lib/scene-types/config";
import { isChecklistProductionEnabledForProject } from "@/lib/scene-types/checklistProductionRollout";

/** Controls LLM CHECKLIST generation vs worker rendering (Phase 5). */
export type ChecklistGenerationMode = "off" | "shadow" | "enabled";

const MODES = new Set<string>(["off", "shadow", "enabled"]);

/**
 * Rollout modes:
 * - off: prompt and output are IMAGE-only (default production).
 * - shadow: prompt may emit CHECKLIST; analyzer logs; worker still IMAGE.
 * - enabled: eligible CHECKLIST renders when SCENE_TYPES_ENABLED=true.
 *
 * CHECKLIST_GENERATION_MODE overrides. If unset: enabled when
 * SCENE_TYPES_ENABLED=true, else off (Phase 4 backward compatible).
 */
export function resolveChecklistGenerationMode(): ChecklistGenerationMode {
  const raw = process.env.CHECKLIST_GENERATION_MODE?.trim().toLowerCase();
  if (raw && MODES.has(raw)) {
    return raw as ChecklistGenerationMode;
  }
  return isSceneTypesEnabled() ? "enabled" : "off";
}

export function isChecklistGenerationPromptAllowed(): boolean {
  const mode = resolveChecklistGenerationMode();
  return mode === "shadow" || mode === "enabled";
}

/** Worker may compose CHECKLIST rasters for an allowlisted production project. */
export function shouldRenderChecklistScenes(
  projectId?: string | null,
): boolean {
  return isChecklistProductionEnabledForProject(projectId);
}

export function checklistGenerationModeLabel(): string {
  return resolveChecklistGenerationMode();
}
