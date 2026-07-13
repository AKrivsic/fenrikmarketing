"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { listProjectAssets } from "@/lib/api/assets-admin";
import type { AssetView } from "@/lib/api/assets-admin";
import {
  loadVideoSceneEditorState,
  applyLibraryAssetAsSceneReplacement,
  insertLibraryBrandAssetInEditor,
  insertBrandAssetInEditor,
  editSceneImageInEditor,
  regenerateSceneImageInEditor,
  restoreSceneImageVersionInEditor,
  runSceneEditorRerender,
  updateSceneDurationInEditor,
  removeSceneFromEditor,
  moveSceneInEditor,
  duplicateSceneInEditor,
  insertVideoSceneWithUpload,
  resetSceneEditorFromVideoJob,
  deleteProjectVideoJobVersion,
  type SceneEditorRenderAssetMode,
  updateSceneEditorVoiceoverText,
  updateSceneImagePromptInEditor,
  uploadSceneReplacementImage,
  saveVideoVisualSourceInEditor,
  setSceneProjectAssetInEditor,
  setSceneVisualModeInEditor,
  previewFinalLayoutInEditor,
  setScenePresentationOverrideInEditor,
  type FinalLayoutPreviewPayload,
  loadVideoWorkflowState,
  type VideoWorkflowState,
  type VideoSceneEditorState,
} from "@/lib/ai/workflows/videoSceneEditor";
import type { ScenePresentationOverride } from "@/lib/video-scene-editor/scenePresentationOverride";
import type {
  SceneVisualMode,
  VideoVisualSource,
} from "@/lib/video-scene-editor/videoWorkflowMetadata";
import { WorkflowError } from "@/lib/ai/workflows/shared";
import {
  loadFailedVideoJobEditorState,
  rerunFailedVideoJobWithVoiceover,
  updateFailedVideoJobEditorVoiceover as persistFailedVideoJobEditorVoiceover,
  type FailedVideoJobEditorState,
} from "@/lib/ai/workflows/failedVideoJobEditor";

export type { FinalLayoutPreviewPayload };

export type VideoSceneEditorActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: string): VideoSceneEditorActionResult<never> {
  return { ok: false, error };
}

function mapWorkflowError(err: unknown): string {
  if (err instanceof WorkflowError) return err.message;
  return "Operace se nezdařila.";
}

function revalidateVideos(projectId: string): void {
  revalidatePath(`/projects/${projectId}/videos`);
  revalidatePath(`/projects/${projectId}/review`);
  revalidatePath(`/projects/${projectId}`, "layout");
}

async function resolveVideoCallbackUrl(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}/api/n8n/video-callback` : undefined;
}

export async function fetchProjectAssetsForPicker(
  projectId: string,
): Promise<VideoSceneEditorActionResult<AssetView[]>> {
  if (!projectId) return fail("Chybí identifikátor projektu.");
  try {
    const data = await listProjectAssets(projectId);
    return { ok: true, data };
  } catch {
    return fail("Načtení assetů se nezdařilo.");
  }
}

export async function loadVideoWorkflowStateAction(
  projectId: string,
  contentItemId: string,
): Promise<VideoSceneEditorActionResult<VideoWorkflowState>> {
  if (!projectId || !contentItemId) {
    return fail("Chybí identifikátor projektu nebo položky.");
  }
  try {
    const data = await loadVideoWorkflowState({ projectId, contentItemId });
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function saveVideoVisualSourceAction(
  projectId: string,
  videoJobId: string,
  visualSource: VideoVisualSource,
  manualAssetIds?: string[],
): Promise<VideoSceneEditorActionResult<VideoWorkflowState>> {
  try {
    const state = await saveVideoVisualSourceInEditor({
      projectId,
      videoJobId,
      visualSource,
      manualAssetIds,
    });
    revalidateVideos(projectId);
    return { ok: true, data: state.workflow };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function setSceneVisualModeAction(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  mode: SceneVisualMode,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await setSceneVisualModeInEditor({
      projectId,
      videoJobId,
      sceneId,
      mode,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function setSceneProjectAssetAction(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  assetId: string,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await setSceneProjectAssetInEditor({
      projectId,
      videoJobId,
      sceneId,
      assetId,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function fetchVideoSceneEditorState(
  projectId: string,
  videoJobId: string,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  if (!projectId || !videoJobId) return fail("Chybí identifikátor projektu nebo videa.");
  try {
    const data = await loadVideoSceneEditorState({ projectId, videoJobId });
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function uploadVideoSceneReplacement(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  formData: FormData,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("Chybí soubor k nahrání.");
  }
  try {
    const data = await uploadSceneReplacementImage({
      projectId,
      videoJobId,
      sceneId,
      file,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function regenerateVideoSceneImage(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  instruction: string,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await regenerateSceneImageInEditor({
      projectId,
      videoJobId,
      sceneId,
      instruction,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function updateVideoSceneImagePrompt(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  imagePrompt: string,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await updateSceneImagePromptInEditor({
      projectId,
      videoJobId,
      sceneId,
      imagePrompt,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function applyLibraryAssetToVideoScene(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  assetId: string,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  if (!assetId) return fail("Vyber asset z knihovny projektu.");
  try {
    const data = await applyLibraryAssetAsSceneReplacement({
      projectId,
      videoJobId,
      sceneId,
      assetId,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function insertLibraryAssetIntoVideoScene(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  assetId: string,
  instruction: string,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  if (!assetId) return fail("Vyber asset z knihovny projektu.");
  if (!instruction.trim()) return fail("Chybí instrukce pro vložení loga.");
  try {
    const data = await insertLibraryBrandAssetInEditor({
      projectId,
      videoJobId,
      sceneId,
      assetId,
      instruction,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function insertVideoSceneBrandAsset(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  formData: FormData,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  const file = formData.get("file");
  const instructionRaw = formData.get("instruction");
  if (!(file instanceof File)) {
    return fail("Chybí soubor loga / assetu.");
  }
  const instruction =
    typeof instructionRaw === "string" ? instructionRaw.trim() : "";
  if (!instruction) {
    return fail("Chybí instrukce pro vložení loga.");
  }
  try {
    const data = await insertBrandAssetInEditor({
      projectId,
      videoJobId,
      sceneId,
      file,
      instruction,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function editVideoSceneImage(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  instruction: string,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await editSceneImageInEditor({
      projectId,
      videoJobId,
      sceneId,
      instruction,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function updateVideoSceneEditorVoiceover(
  projectId: string,
  videoJobId: string,
  voiceoverText: string,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await updateSceneEditorVoiceoverText({
      projectId,
      videoJobId,
      voiceoverText,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function restoreVideoSceneImage(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  versionId: string,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await restoreSceneImageVersionInEditor({
      projectId,
      videoJobId,
      sceneId,
      versionId,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function updateVideoSceneDuration(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  durationSeconds: number,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await updateSceneDurationInEditor({
      projectId,
      videoJobId,
      sceneId,
      durationSeconds,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function removeVideoScene(
  projectId: string,
  videoJobId: string,
  sceneId: string,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await removeSceneFromEditor({
      projectId,
      videoJobId,
      sceneId,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function moveVideoScene(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  direction: "up" | "down",
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await moveSceneInEditor({
      projectId,
      videoJobId,
      sceneId,
      direction,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function duplicateVideoScene(
  projectId: string,
  videoJobId: string,
  sceneId: string,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await duplicateSceneInEditor({
      projectId,
      videoJobId,
      sceneId,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function addVideoSceneWithUpload(
  projectId: string,
  videoJobId: string,
  formData: FormData,
  afterSceneId?: string | null,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  const file = formData.get("file");
  const imagePromptRaw = formData.get("imagePrompt");
  const durationRaw = formData.get("durationSeconds");
  if (!(file instanceof File)) {
    return fail("Chybí obrázek nové scény.");
  }
  const imagePrompt =
    typeof imagePromptRaw === "string" ? imagePromptRaw.trim() : "";
  if (!imagePrompt) {
    return fail("Chybí popis (prompt) nové scény.");
  }
  const durationSeconds =
    typeof durationRaw === "string" && durationRaw.trim().length > 0
      ? Number(durationRaw)
      : undefined;
  try {
    const data = await insertVideoSceneWithUpload({
      projectId,
      videoJobId,
      afterSceneId,
      file,
      imagePrompt,
      durationSeconds,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function loadSceneEditorFromVideoVersion(
  projectId: string,
  videoJobId: string,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await resetSceneEditorFromVideoJob({ projectId, videoJobId });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function deleteVideoVersion(
  projectId: string,
  videoJobId: string,
): Promise<VideoSceneEditorActionResult<{ deletedJobId: string }>> {
  try {
    await deleteProjectVideoJobVersion({ projectId, videoJobId });
    revalidateVideos(projectId);
    return { ok: true, data: { deletedJobId: videoJobId } };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function rerenderVideoFromSceneEditor(
  projectId: string,
  videoJobId: string,
  options?: {
    renderAssetMode?: SceneEditorRenderAssetMode;
    selectedAssetIds?: string[];
  },
): Promise<VideoSceneEditorActionResult<{ videoJobId: string }>> {
  try {
    const videoCallbackUrl = await resolveVideoCallbackUrl();
    const summary = await runSceneEditorRerender(
      {
        projectId,
        videoJobId,
        renderAssetMode: options?.renderAssetMode,
        selectedAssetIds: options?.selectedAssetIds,
      },
      { videoCallbackUrl },
    );
    revalidateVideos(projectId);
    return { ok: true, data: { videoJobId: summary.videoJobId } };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function fetchFailedVideoJobEditorState(
  projectId: string,
  videoJobId: string,
): Promise<VideoSceneEditorActionResult<FailedVideoJobEditorState>> {
  try {
    const data = await loadFailedVideoJobEditorState({ projectId, videoJobId });
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function updateFailedVideoJobEditorVoiceover(
  projectId: string,
  videoJobId: string,
  voiceoverText: string,
): Promise<VideoSceneEditorActionResult<FailedVideoJobEditorState>> {
  try {
    const data = await persistFailedVideoJobEditorVoiceover({
      projectId,
      videoJobId,
      voiceoverText,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function rerenderFailedVideoJob(
  projectId: string,
  videoJobId: string,
  voiceoverText: string,
): Promise<VideoSceneEditorActionResult<{ videoJobId: string }>> {
  try {
    const videoCallbackUrl = await resolveVideoCallbackUrl();
    const summary = await rerunFailedVideoJobWithVoiceover(
      { projectId, videoJobId, voiceoverText: voiceoverText.trim() },
      { videoCallbackUrl },
    );
    revalidateVideos(projectId);
    return { ok: true, data: { videoJobId: summary.videoJobId } };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function previewFinalLayoutAction(
  projectId: string,
  videoJobId: string,
  sceneId: string,
): Promise<VideoSceneEditorActionResult<FinalLayoutPreviewPayload>> {
  try {
    const data = await previewFinalLayoutInEditor({
      projectId,
      videoJobId,
      sceneId,
    });
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}

export async function setScenePresentationOverrideAction(
  projectId: string,
  videoJobId: string,
  sceneId: string,
  override: ScenePresentationOverride,
): Promise<VideoSceneEditorActionResult<VideoSceneEditorState>> {
  try {
    const data = await setScenePresentationOverrideInEditor({
      projectId,
      videoJobId,
      sceneId,
      override,
    });
    revalidateVideos(projectId);
    return { ok: true, data };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}
