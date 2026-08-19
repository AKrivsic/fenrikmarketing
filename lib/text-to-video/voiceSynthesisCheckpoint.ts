export const VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY =
  "video_voice_synthesis_checkpoint" as const;

export interface VoiceSynthesisCheckpoint {
  synthesis_attempt_id: string;
  synthesis_fingerprint: string;
  voiceover_revision_id: string;
  voice_id: string;
  model_id: string;
  audio_bucket: string;
  audio_path: string;
  audio_duration_seconds: number;
  phase: "voice_complete";
}
