export const VIDEO_SCENE_CLIPS_CHECKPOINT_KEY =
  "video_text_to_video_scene_clips_checkpoint" as const;

export interface TextToVideoSceneClipRef {
  scene_id: string;
  attempt_id: string;
  output_bucket: string;
  output_path: string;
  provider_duration_seconds: number;
  required_trim_seconds: number;
  estimated_cost_usd: number;
  request_fingerprint: string;
}

export interface TextToVideoSceneClipsCheckpoint {
  phase: "scene_clips_complete";
  execution_fingerprint: string;
  voice_checkpoint_fingerprint: string;
  creative_plan_fingerprint: string;
  synthesis_fingerprint: string;
  scenes: TextToVideoSceneClipRef[];
  total_estimated_cost_usd: number;
  estimate: true;
}

export function validateSceneClipsCheckpoint(
  stored: unknown,
  expected: {
    executionFingerprint: string;
    voiceCheckpointFingerprint: string;
    creativePlanFingerprint: string;
    synthesisFingerprint: string;
  },
): stored is TextToVideoSceneClipsCheckpoint {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return false;
  }
  const c = stored as TextToVideoSceneClipsCheckpoint;
  if (c.phase !== "scene_clips_complete") return false;
  if (c.execution_fingerprint !== expected.executionFingerprint) return false;
  if (c.voice_checkpoint_fingerprint !== expected.voiceCheckpointFingerprint) {
    return false;
  }
  if (c.creative_plan_fingerprint !== expected.creativePlanFingerprint) {
    return false;
  }
  if (c.synthesis_fingerprint !== expected.synthesisFingerprint) return false;
  if (!Array.isArray(c.scenes) || c.scenes.length === 0) return false;
  return true;
}
