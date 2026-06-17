import type { SceneEditorDraft, SceneEditorDraftScene } from "@/lib/video-scene-editor/metadata";
import {
  seedOriginalScenes,
  seedSceneImageHistory,
} from "@/lib/video-scene-editor/imageHistory";

export function buildSceneEditorDraft(args: {
  sourceVideoJobId: string;
  scenes: SceneEditorDraftScene[];
  existing: SceneEditorDraft | null;
  baselineScenes: SceneEditorDraftScene[];
  baselineVoiceoverText?: string;
}): SceneEditorDraft {
  const hasOriginals =
    args.existing !== null &&
    Object.keys(args.existing.original_scenes).length > 0;
  const hasHistory =
    args.existing !== null &&
    Object.keys(args.existing.image_versions).length > 0;

  const baselineVoiceover = args.baselineVoiceoverText?.trim() ?? "";
  const originalVoiceover =
    args.existing?.original_voiceover_text?.trim() ||
    (baselineVoiceover.length > 0 ? baselineVoiceover : undefined);

  const draft: SceneEditorDraft = {
    source_video_job_id: args.sourceVideoJobId,
    scenes: args.scenes,
    updated_at: new Date().toISOString(),
    original_scenes: hasOriginals
      ? args.existing!.original_scenes
      : seedOriginalScenes(args.baselineScenes),
    image_versions: hasHistory
      ? args.existing!.image_versions
      : seedSceneImageHistory(args.baselineScenes),
  };

  if (originalVoiceover) {
    draft.original_voiceover_text = originalVoiceover;
  }
  if (typeof args.existing?.voiceover_text === "string") {
    draft.voiceover_text = args.existing.voiceover_text;
  }

  return draft;
}
