"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  loadVideoSceneEditorState,
  insertBrandAssetInEditor,
  editSceneImageInEditor,
  regenerateSceneImageInEditor,
  restoreSceneImageVersionInEditor,
  runSceneEditorRerender,
  updateSceneEditorVoiceoverText,
  updateSceneImagePromptInEditor,
  uploadSceneReplacementImage,
  type VideoSceneEditorState,
} from "@/lib/ai/workflows/videoSceneEditor";
import { WorkflowError } from "@/lib/ai/workflows/shared";

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
  revalidatePath(`/projects/${projectId}`, "layout");
}

async function resolveVideoCallbackUrl(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}/api/n8n/video-callback` : undefined;
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

export async function rerenderVideoFromSceneEditor(
  projectId: string,
  videoJobId: string,
): Promise<VideoSceneEditorActionResult<{ videoJobId: string }>> {
  try {
    const videoCallbackUrl = await resolveVideoCallbackUrl();
    const summary = await runSceneEditorRerender(
      { projectId, videoJobId },
      { videoCallbackUrl },
    );
    revalidateVideos(projectId);
    return { ok: true, data: { videoJobId: summary.videoJobId } };
  } catch (err) {
    return fail(mapWorkflowError(err));
  }
}
