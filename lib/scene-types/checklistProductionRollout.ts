import { isSceneTypesEnabled } from "@/lib/scene-types/config";
import {
  isChecklistGenerationPromptAllowed,
  resolveChecklistGenerationMode,
} from "@/lib/scene-types/checklistGenerationMode";

const PROJECT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let cachedAllowlist: ReadonlySet<string> | null = null;
let cachedWildcard: boolean | null = null;

function parseChecklistEnabledProjectIdsFromEnv(): {
  wildcard: boolean;
  ids: ReadonlySet<string>;
} {
  const raw = process.env.CHECKLIST_ENABLED_PROJECT_IDS;
  if (!raw?.trim()) {
    return { wildcard: false, ids: new Set() };
  }
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const wildcard = parts.some((part) => part === "*");
  if (wildcard) {
    return { wildcard: true, ids: new Set() };
  }
  const ids = parts
    .filter((id) => PROJECT_ID_RE.test(id));
  return { wildcard: false, ids: new Set(ids) };
}

function loadChecklistAllowlistEnv(): {
  wildcard: boolean;
  ids: ReadonlySet<string>;
} {
  if (cachedAllowlist === null || cachedWildcard === null) {
    const parsed = parseChecklistEnabledProjectIdsFromEnv();
    cachedWildcard = parsed.wildcard;
    cachedAllowlist = parsed.ids;
  }
  return { wildcard: cachedWildcard, ids: cachedAllowlist };
}

/** True when CHECKLIST_ENABLED_PROJECT_IDS=* (all valid projects eligible). */
export function isChecklistAllowlistWildcard(): boolean {
  return loadChecklistAllowlistEnv().wildcard;
}

/** Production allowlist from CHECKLIST_ENABLED_PROJECT_IDS (invalid ids ignored). Empty when wildcard. */
export function checklistEnabledProjectIds(): ReadonlySet<string> {
  return loadChecklistAllowlistEnv().ids;
}

/** Test-only: reset env cache between check script cases. */
export function resetChecklistProductionRolloutCacheForTests(): void {
  cachedAllowlist = null;
  cachedWildcard = null;
}

export type ChecklistAllowlistStatus = "allowlisted" | "not_allowlisted";

export function resolveChecklistAllowlistStatus(
  projectId: string | null | undefined,
): ChecklistAllowlistStatus {
  const id = projectId?.trim();
  if (!id) return "not_allowlisted";
  const { wildcard, ids } = loadChecklistAllowlistEnv();
  if (wildcard) return "allowlisted";
  return ids.has(id) ? "allowlisted" : "not_allowlisted";
}

export function isProjectAllowlistedForChecklist(
  projectId: string | null | undefined,
): boolean {
  return resolveChecklistAllowlistStatus(projectId) === "allowlisted";
}

/**
 * Full production activation for CHECKLIST generation + rendering.
 *
 * Precedence:
 * 1. SCENE_TYPES_ENABLED !== true → false
 * 2. CHECKLIST_GENERATION_MODE !== enabled → false
 * 3. project not allowlisted (UUID list or `*` wildcard) → false
 * 4. empty/missing allowlist → false (unless wildcard `*`)
 */
export function isChecklistProductionEnabledForProject(
  projectId: string | null | undefined,
): boolean {
  if (!isSceneTypesEnabled()) return false;
  if (resolveChecklistGenerationMode() !== "enabled") return false;
  return isProjectAllowlistedForChecklist(projectId);
}

/**
 * Whether the content-generation prompt may offer CHECKLIST for this project.
 * Shadow and enabled modes require the same allowlist (empty = IMAGE-only).
 */
export function isChecklistPromptPermittedForProject(
  projectId: string | null | undefined,
): boolean {
  if (!isSceneTypesEnabled()) return false;
  if (!isChecklistGenerationPromptAllowed()) return false;
  return isProjectAllowlistedForChecklist(projectId);
}
