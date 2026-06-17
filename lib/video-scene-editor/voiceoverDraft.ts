import type { SceneEditorDraft } from "@/lib/video-scene-editor/metadata";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Reads narration text from a video_jobs.input row (same fallbacks as the worker). */
export function readSourceVoiceoverText(jobInput: unknown): string {
  const record = asRecord(jobInput);
  if (!record) return "";
  const raw =
    record["voiceover_text"] ?? record["script"] ?? record["concept"];
  return typeof raw === "string" ? raw.trim() : "";
}

export function resolveDraftVoiceoverText(args: {
  draft: SceneEditorDraft | null;
  sourceVideoJobId: string;
  sourceJobInput: unknown;
}): string {
  if (
    args.draft &&
    args.draft.source_video_job_id === args.sourceVideoJobId &&
    typeof args.draft.voiceover_text === "string"
  ) {
    return args.draft.voiceover_text.trim();
  }
  return readSourceVoiceoverText(args.sourceJobInput);
}

export function baselineVoiceoverForEditor(args: {
  draft: SceneEditorDraft | null;
  sourceVideoJobId: string;
  sourceJobInput: unknown;
}): string {
  if (
    args.draft &&
    args.draft.source_video_job_id === args.sourceVideoJobId &&
    typeof args.draft.original_voiceover_text === "string"
  ) {
    return args.draft.original_voiceover_text.trim();
  }
  return readSourceVoiceoverText(args.sourceJobInput);
}

export function voiceoverTextChangedInDraft(args: {
  draft: SceneEditorDraft | null;
  sourceVideoJobId: string;
  baselineVoiceover: string;
}): boolean {
  if (!args.draft || args.draft.source_video_job_id !== args.sourceVideoJobId) {
    return false;
  }
  if (typeof args.draft.voiceover_text !== "string") return false;
  return args.draft.voiceover_text.trim() !== args.baselineVoiceover.trim();
}
