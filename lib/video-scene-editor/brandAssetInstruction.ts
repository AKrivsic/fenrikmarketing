import type { SceneEditorDraft } from "@/lib/video-scene-editor/metadata";
import { DEFAULT_BRAND_ASSET_INSERT_INSTRUCTION } from "@/lib/video-scene-editor/constants";

/** Trims user instruction for brand-asset insert (no scene-gen sanitizer). */
export function normalizeBrandAssetInsertInstruction(instruction: string): string {
  return instruction.replace(/\s+/g, " ").trim();
}

function latestBrandAssetInstructionFromHistory(
  draft: SceneEditorDraft,
  sceneId: string,
): string | undefined {
  const versions = draft.image_versions[sceneId] ?? [];
  for (let i = versions.length - 1; i >= 0; i--) {
    const row = versions[i]!;
    if (row.source !== "brand_asset_edit") continue;
    const text = row.instruction?.trim();
    if (text) return text;
  }
  return undefined;
}

/** Last saved insert instruction for a scene, or undefined when only the default applies. */
export function resolveBrandAssetInsertInstruction(
  draft: SceneEditorDraft | null,
  sceneId: string,
): string | undefined {
  if (!draft) return undefined;
  const fromDraft = draft.brand_asset_insert_instructions?.[sceneId]?.trim();
  if (fromDraft) return fromDraft;
  return latestBrandAssetInstructionFromHistory(draft, sceneId);
}

export function resolveBrandAssetInsertInstructionOrDefault(
  draft: SceneEditorDraft | null,
  sceneId: string,
): string {
  return (
    resolveBrandAssetInsertInstruction(draft, sceneId) ??
    DEFAULT_BRAND_ASSET_INSERT_INSTRUCTION
  );
}

export function mergeBrandAssetInsertInstruction(
  existing: Record<string, string> | undefined,
  sceneId: string,
  instruction: string,
): Record<string, string> {
  const trimmed = normalizeBrandAssetInsertInstruction(instruction);
  return { ...(existing ?? {}), [sceneId]: trimmed };
}
