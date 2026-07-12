/** Compact per-scene image generation warnings (no full provider payloads). */
export interface SceneImageGenerationWarning {
  scene_id: string;
  original_generation_blocked?: boolean;
  safe_retry_attempted?: boolean;
  safe_retry_succeeded?: boolean;
  local_fallback_used?: boolean;
  provider_error_code?: string;
  moderation_stage?: string;
}
