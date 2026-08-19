import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readTextToVideoCreativePlan,
  TEXT_TO_VIDEO_TIMING_MEASURED,
} from "@/lib/content-package/textToVideoCreativePlan";
import { TIMING_MEASUREMENT_ALIGNMENT } from "@/lib/text-to-video/measuredSceneTiming";
import { validateElevenLabsAlignment } from "@/lib/elevenlabs/adapter";
import {
  VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY,
  type VoiceSynthesisCheckpoint,
} from "@/lib/text-to-video/voiceSynthesisCheckpoint";
import { adoptExistingVoiceArtifactIfPresent } from "@/lib/text-to-video/voiceSynthesisArtifact";
import { storedSynthesisInputsMatch } from "@/lib/elevenlabs/v3VoiceDirection";
import { voiceoverRevisionId } from "@/lib/content-package/videoCreativeRevision";

export class VoiceCheckpointReuseError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export async function validateVoiceCheckpointForEarlyReuse(
  supabase: SupabaseClient,
  args: {
    brief: Record<string, unknown>;
    projectId: string;
    packageId: string;
    fingerprint: string;
    voiceId: string;
    modelId: string;
    outputFormat: string;
    synthesisInput: Record<string, unknown>;
    probeDuration?: (audio: Buffer) => Promise<number>;
  },
): Promise<VoiceSynthesisCheckpoint> {
  const raw = args.brief[VIDEO_VOICE_SYNTHESIS_CHECKPOINT_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new VoiceCheckpointReuseError("voice_checkpoint_missing");
  }
  const checkpoint = raw as VoiceSynthesisCheckpoint;
  if (checkpoint.phase !== "voice_complete") {
    throw new VoiceCheckpointReuseError("voice_checkpoint_phase_invalid");
  }
  const vo =
    typeof args.brief.voiceover_text === "string"
      ? args.brief.voiceover_text.trim()
      : "";
  const voRev = voiceoverRevisionId(vo);
  if (checkpoint.voiceover_revision_id !== voRev) {
    throw new VoiceCheckpointReuseError("voice_checkpoint_voiceover_revision");
  }
  if (checkpoint.synthesis_fingerprint !== args.fingerprint) {
    throw new VoiceCheckpointReuseError("voice_checkpoint_fingerprint");
  }
  if (checkpoint.voice_id !== args.voiceId) {
    throw new VoiceCheckpointReuseError("voice_checkpoint_voice_id");
  }
  if (checkpoint.model_id !== args.modelId) {
    throw new VoiceCheckpointReuseError("voice_checkpoint_model_id");
  }
  if (!checkpoint.audio_bucket?.trim() || !checkpoint.audio_path?.trim()) {
    throw new VoiceCheckpointReuseError("voice_checkpoint_audio_path");
  }

  const plan = readTextToVideoCreativePlan(args.brief);
  if (
    !plan ||
    plan.timing_status !== TEXT_TO_VIDEO_TIMING_MEASURED ||
    plan.timing_measurement_source !== TIMING_MEASUREMENT_ALIGNMENT
  ) {
    throw new VoiceCheckpointReuseError("voice_checkpoint_measured_plan");
  }
  if (plan.measured_audio_revision_id !== voRev) {
    throw new VoiceCheckpointReuseError("voice_checkpoint_measured_revision");
  }

  const { data: row, error } = await supabase
    .from("text_to_video_voice_syntheses")
    .select("*")
    .eq("id", checkpoint.synthesis_attempt_id)
    .maybeSingle();
  if (error) throw error;
  if (!row || row.status !== "completed") {
    throw new VoiceCheckpointReuseError("voice_checkpoint_attempt_not_completed");
  }
  if (String(row.synthesis_fingerprint) !== args.fingerprint) {
    throw new VoiceCheckpointReuseError("voice_checkpoint_attempt_fingerprint");
  }
  if (!storedSynthesisInputsMatch(row.synthesis_input, args.synthesisInput)) {
    throw new VoiceCheckpointReuseError("voice_checkpoint_synthesis_input");
  }
  if (String(row.audio_path) !== checkpoint.audio_path) {
    throw new VoiceCheckpointReuseError("voice_checkpoint_storage_path");
  }
  if (!row.alignment) {
    throw new VoiceCheckpointReuseError("voice_checkpoint_alignment_missing");
  }
  try {
    validateElevenLabsAlignment(row.alignment);
  } catch {
    throw new VoiceCheckpointReuseError("voice_checkpoint_alignment_invalid");
  }

  try {
    await adoptExistingVoiceArtifactIfPresent(
      supabase,
      checkpoint.audio_path,
      checkpoint.audio_duration_seconds,
      args.probeDuration,
    );
  } catch {
    throw new VoiceCheckpointReuseError("voice_checkpoint_artifact_invalid");
  }

  return checkpoint;
}
