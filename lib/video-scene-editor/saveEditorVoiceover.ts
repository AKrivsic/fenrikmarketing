import type { SupabaseClient } from "@supabase/supabase-js";
import { extractRenderSpecScenes } from "@/lib/ai/workflows/languageVariantsHelpers";
import type { Json } from "@/lib/supabase/types";
import { buildSceneEditorDraft } from "@/lib/video-scene-editor/draftEnvelope";
import {
  mergeSceneEditorDraft,
  readSceneEditorDraft,
  type SceneEditorDraftScene,
} from "@/lib/video-scene-editor/metadata";
import { readSourceVoiceoverText } from "@/lib/video-scene-editor/voiceoverDraft";

export class SaveEditorVoiceoverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveEditorVoiceoverError";
  }
}

function scenesToDraftScenes(
  scenes: Record<string, unknown>[],
): SceneEditorDraftScene[] {
  return scenes.map((scene) => {
    const id = String(scene.id ?? "");
    const image_prompt = String(scene.image_prompt ?? "");
    const image_bucket = String(scene.image_bucket ?? "");
    const image_path = String(scene.image_path ?? "");
    const duration_seconds = Number(scene.duration_seconds ?? 0);
    if (
      !id ||
      !image_prompt ||
      !image_bucket ||
      !image_path ||
      !(duration_seconds > 0)
    ) {
      throw new SaveEditorVoiceoverError(
        "scene is missing required fields for the editor",
      );
    }
    return {
      id,
      image_prompt,
      image_bucket,
      image_path,
      duration_seconds,
    };
  });
}

export async function saveEditorVoiceoverText(args: {
  supabase: SupabaseClient;
  projectId: string;
  contentItemId: string;
  sourceVideoJobId: string;
  generationMetadata: Json | null;
  jobInput: unknown;
  jobOutput: unknown;
  voiceoverText: string;
}): Promise<Json> {
  const trimmed = args.voiceoverText.trim();
  if (!trimmed) {
    throw new SaveEditorVoiceoverError("voiceover text is required");
  }

  const draft = readSceneEditorDraft(args.generationMetadata);
  let scenes: SceneEditorDraftScene[];
  if (draft && draft.source_video_job_id === args.sourceVideoJobId) {
    scenes = draft.scenes;
  } else {
    const fromOutput = extractRenderSpecScenes(args.jobOutput);
    if (!fromOutput) {
      throw new SaveEditorVoiceoverError("missing render_spec baseline");
    }
    scenes = scenesToDraftScenes(fromOutput);
  }

  const baselineFromOutput = extractRenderSpecScenes(args.jobOutput);
  if (!baselineFromOutput) {
    throw new SaveEditorVoiceoverError("missing render_spec baseline");
  }
  const baselineScenes = scenesToDraftScenes(baselineFromOutput);

  const envelope = buildSceneEditorDraft({
    sourceVideoJobId: args.sourceVideoJobId,
    scenes,
    existing: draft,
    baselineScenes,
    baselineVoiceoverText: readSourceVoiceoverText(args.jobInput),
  });
  envelope.voiceover_text = trimmed;

  return mergeSceneEditorDraft(args.generationMetadata, envelope);
}
