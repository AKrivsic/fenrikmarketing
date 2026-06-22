export const FAILED_VIDEO_JOB_EDITOR_METADATA_KEY = "failed_video_job_editor";

export interface FailedVideoJobEditorDraft {
  source_video_job_id: string;
  voiceover_text: string;
  original_voiceover_text: string;
  updated_at: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readFailedVideoJobEditorDraft(
  generationMetadata: unknown,
): FailedVideoJobEditorDraft | null {
  const root = asRecord(generationMetadata);
  if (!root) return null;
  const row = asRecord(root[FAILED_VIDEO_JOB_EDITOR_METADATA_KEY]);
  if (!row) return null;
  const source_video_job_id = row.source_video_job_id;
  const voiceover_text = row.voiceover_text;
  const original_voiceover_text = row.original_voiceover_text;
  const updated_at = row.updated_at;
  if (
    typeof source_video_job_id !== "string" ||
    typeof voiceover_text !== "string" ||
    typeof original_voiceover_text !== "string" ||
    typeof updated_at !== "string"
  ) {
    return null;
  }
  return {
    source_video_job_id,
    voiceover_text,
    original_voiceover_text,
    updated_at,
  };
}

export function mergeFailedVideoJobEditorDraft(
  generationMetadata: unknown,
  draft: FailedVideoJobEditorDraft,
): Record<string, unknown> {
  const root = asRecord(generationMetadata) ?? {};
  return {
    ...root,
    [FAILED_VIDEO_JOB_EDITOR_METADATA_KEY]: draft,
  };
}
