import type { Json } from "@/lib/supabase/types";
import type { SceneType } from "@/lib/scene-types/sceneType";

export interface VideoJobPresentationHints {
  hasChecklistInFinalScenes: boolean;
  presentationAnalyzerWarningCount: number;
  requestedChecklistCount: number;
  acceptedChecklistCount: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readPresentationGeneration(
  input: Json | null | undefined,
): Record<string, unknown> | null {
  const root = asRecord(input);
  const analyzer = asRecord(root?.presentation_analyzer);
  return asRecord(analyzer?.presentation_generation);
}

function readFinalSceneTypes(
  gen: Record<string, unknown> | null,
  input: Json | null | undefined,
): SceneType[] {
  const fromGen = gen?.final_worker_scene_types;
  if (Array.isArray(fromGen)) {
    return fromGen.filter((t): t is SceneType => typeof t === "string");
  }
  const root = asRecord(input);
  const scenes = root?.scenes;
  if (!Array.isArray(scenes)) return [];
  return scenes
    .map((s) =>
      s && typeof s === "object" && !Array.isArray(s)
        ? (s as Record<string, unknown>).type
        : undefined,
    )
    .filter((t): t is SceneType => typeof t === "string");
}

export function readVideoJobPresentationHints(
  input: Json | null | undefined,
): VideoJobPresentationHints {
  const gen = readPresentationGeneration(input);
  const finalTypes = readFinalSceneTypes(gen, input);
  const hasChecklistInFinalScenes = finalTypes.includes("CHECKLIST");

  const analyzer = asRecord(asRecord(input)?.presentation_analyzer);
  const warnings = analyzer?.warnings;
  const presentationAnalyzerWarningCount = Array.isArray(warnings)
    ? warnings.length
    : 0;

  const requested =
    typeof gen?.requested_checklist_count === "number"
      ? gen.requested_checklist_count
      : 0;
  const accepted =
    typeof gen?.accepted_checklist_count === "number"
      ? gen.accepted_checklist_count
      : 0;

  return {
    hasChecklistInFinalScenes,
    presentationAnalyzerWarningCount,
    requestedChecklistCount: requested,
    acceptedChecklistCount: accepted,
  };
}
