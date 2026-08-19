import type { SupabaseClient } from "@supabase/supabase-js";
import type { TextToVideoRunwayExecutionPlan } from "@/lib/text-to-video/runwayExecutionPlan";
import type { TextToVideoSceneClipsCheckpoint } from "@/lib/text-to-video/sceneClipsCheckpoint";
import { sceneAttemptMatchesExecutionItem } from "@/lib/text-to-video/runwayBudget";
import { TEXT_TO_VIDEO_RUNWAY_MODEL } from "@/lib/text-to-video/runwayProductionConfig";

export interface SceneClipsCheckpointExpected {
  executionFingerprint: string;
  voiceCheckpointFingerprint: string;
  creativePlanFingerprint: string;
  synthesisFingerprint: string;
}

export function validateSceneClipsCheckpointStructure(
  stored: unknown,
  expected: SceneClipsCheckpointExpected,
  plan: TextToVideoRunwayExecutionPlan,
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
  if (!Array.isArray(c.scenes)) return false;

  const planItems = [...plan.items].sort((a, b) => a.sceneOrder - b.sceneOrder);
  if (c.scenes.length !== planItems.length) return false;

  for (let i = 0; i < planItems.length; i++) {
    const item = planItems[i]!;
    const ref = c.scenes[i];
    if (!ref || ref.scene_id !== item.sceneId) return false;
    if (ref.provider_duration_seconds !== item.providerDurationSeconds) {
      return false;
    }
    if (Math.abs(ref.required_trim_seconds - item.requiredTrimSeconds) > 0.001) {
      return false;
    }
    if (!ref.attempt_id?.trim() || !ref.output_bucket?.trim() || !ref.output_path?.trim()) {
      return false;
    }
    if (ref.request_fingerprint !== item.requestFingerprint) return false;
  }

  const ids = new Set(c.scenes.map((s) => s.scene_id));
  if (ids.size !== c.scenes.length) return false;
  return true;
}

export async function assertSceneClipsCheckpointArtifacts(
  supabase: SupabaseClient,
  checkpoint: TextToVideoSceneClipsCheckpoint,
  plan: TextToVideoRunwayExecutionPlan,
  probeClip: (bucket: string, path: string) => Promise<boolean>,
): Promise<void> {
  if (!validateSceneClipsCheckpointStructure(checkpoint, {
    executionFingerprint: checkpoint.execution_fingerprint,
    voiceCheckpointFingerprint: checkpoint.voice_checkpoint_fingerprint,
    creativePlanFingerprint: checkpoint.creative_plan_fingerprint,
    synthesisFingerprint: checkpoint.synthesis_fingerprint,
  }, plan)) {
    throw new Error("scene_clips_checkpoint_structure_invalid");
  }
  for (const ref of checkpoint.scenes) {
    const item = plan.items.find((i) => i.sceneId === ref.scene_id);
    if (!item) throw new Error("scene_clips_checkpoint_orphan_scene");
    void sceneAttemptMatchesExecutionItem;
    void TEXT_TO_VIDEO_RUNWAY_MODEL;
    const ok = await probeClip(ref.output_bucket, ref.output_path);
    if (!ok) throw new Error("scene_clips_checkpoint_artifact_invalid");
  }
}
