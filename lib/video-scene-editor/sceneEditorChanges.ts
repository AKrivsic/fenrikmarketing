import { sceneInputsEqual } from "@/lib/video-scene-editor/sceneDraftCompare";
import type { SceneEditorDraftScene } from "@/lib/video-scene-editor/metadata";
import type { SceneEditorDraft } from "@/lib/video-scene-editor/metadata";
import { voiceoverTextChangedInDraft } from "@/lib/video-scene-editor/voiceoverDraft";

function draftScenesToInputScenes(
  scenes: SceneEditorDraftScene[],
): Record<string, unknown>[] {
  return scenes.map((scene) => ({
    id: scene.id,
    image_prompt: scene.image_prompt,
    duration_seconds: scene.duration_seconds,
    image_bucket: scene.image_bucket,
    image_path: scene.image_path,
    ...(scene.video_usage ? { video_usage: scene.video_usage } : {}),
  }));
}

export function sceneVisualsChangedVsRenderSpec(
  scenes: SceneEditorDraftScene[],
  baselineFromOutput: Record<string, unknown>[] | null,
): boolean {
  if (baselineFromOutput === null) return false;
  return !sceneInputsEqual(draftScenesToInputScenes(scenes), baselineFromOutput);
}

export function hasSceneEditorRerenderChanges(args: {
  scenes: SceneEditorDraftScene[];
  baselineFromOutput: Record<string, unknown>[] | null;
  draft: SceneEditorDraft | null;
  sourceVideoJobId: string;
  baselineVoiceover: string;
}): boolean {
  const visualsChanged = sceneVisualsChangedVsRenderSpec(
    args.scenes,
    args.baselineFromOutput,
  );
  const voiceoverChanged = voiceoverTextChangedInDraft({
    draft: args.draft,
    sourceVideoJobId: args.sourceVideoJobId,
    baselineVoiceover: args.baselineVoiceover,
  });
  return visualsChanged || voiceoverChanged;
}
