import type { ElevenLabsCharacterAlignment } from "@/lib/elevenlabs/adapter";
import type {
  TextToVideoCreativePlan,
  TextToVideoPlanScene,
} from "@/lib/content-package/textToVideoCreativePlan";
import {
  TEXT_TO_VIDEO_TIMING_MEASURED,
} from "@/lib/content-package/textToVideoCreativePlan";
import { excerptTimeRangeFromAlignment } from "@/lib/elevenlabs/alignmentVoiceover";

export const TIMING_MEASUREMENT_ALIGNMENT = "alignment" as const;
export const TIMING_MEASUREMENT_ESTIMATED_FALLBACK = "estimated_fallback" as const;

export type TimingMeasurementSource =
  | typeof TIMING_MEASUREMENT_ALIGNMENT
  | typeof TIMING_MEASUREMENT_ESTIMATED_FALLBACK;

export function applyAlignmentMeasuredTimingToPlan(args: {
  plan: TextToVideoCreativePlan;
  alignment: ElevenLabsCharacterAlignment;
  approvedVoiceover: string;
  audioDurationSeconds: number;
  measuredAudioRevisionId: string;
  synthesisFingerprint: string;
}): TextToVideoCreativePlan {
  const total = args.audioDurationSeconds;
  const scenes = [...args.plan.scenes].sort((a, b) => a.order - b.order);
  const timed: TextToVideoPlanScene[] = [];
  for (let index = 0; index < scenes.length; index++) {
    const scene = scenes[index]!;
    const excerpt = (scene.voiceover_excerpt ?? scene.human_meaning).trim();
    const range = excerptTimeRangeFromAlignment(
      args.alignment,
      args.approvedVoiceover,
      excerpt,
    );
    let start = range.start_seconds;
    let end = range.end_seconds;
    if (index === 0 && start > 0.35) {
      start = 0;
    }
    if (index === scenes.length - 1) {
      end = Math.max(end, total);
    }
    const duration = Math.max(0.25, end - start);
    if (index > 0) {
      const prev = timed[index - 1]!;
      const prevEnd =
        (prev.approximate_start_seconds ?? 0) +
        prev.approximate_duration_seconds;
      if (start < prevEnd) {
        start = prevEnd;
      }
    }
    timed.push({
      ...scene,
      approximate_start_seconds: Math.round(start * 100) / 100,
      approximate_duration_seconds: Math.round(duration * 100) / 100,
    });
  }
  const last = timed[timed.length - 1];
  if (last) {
    const lastEnd = last.approximate_start_seconds + last.approximate_duration_seconds;
    if (lastEnd < total - 0.05) {
      last.approximate_duration_seconds =
        Math.round((total - last.approximate_start_seconds) * 100) / 100;
    }
  }
  return {
    ...args.plan,
    target_duration_seconds: args.plan.target_duration_seconds,
    measured_audio_duration_seconds: Math.round(total * 100) / 100,
    timing_measurement_source: TIMING_MEASUREMENT_ALIGNMENT,
    scenes: timed,
    plan_fingerprint: args.plan.plan_fingerprint,
    timing_status: TEXT_TO_VIDEO_TIMING_MEASURED,
    measured_audio_revision_id: args.measuredAudioRevisionId,
    repetition: args.plan.repetition,
    status: args.plan.status,
  };
}

/** Explicit fallback — must not pass Runway preflight as precise measured timing. */
export function applyEstimatedFallbackTimingToPlan(args: {
  plan: TextToVideoCreativePlan;
  audioDurationSeconds: number;
  measuredAudioRevisionId: string;
}): TextToVideoCreativePlan {
  const total = args.audioDurationSeconds;
  const scenes = [...args.plan.scenes].sort((a, b) => a.order - b.order);
  const weights = scenes.map((s) =>
    Math.max(1, (s.voiceover_excerpt ?? s.human_meaning).trim().length),
  );
  const weightSum = weights.reduce((a, b) => a + b, 0);
  let cursor = 0;
  const timed: TextToVideoPlanScene[] = scenes.map((scene, index) => {
    const share =
      index === scenes.length - 1
        ? Math.max(0, total - cursor)
        : (weights[index]! / weightSum) * total;
    const duration = Math.max(0.5, share);
    const start = cursor;
    cursor += duration;
    return {
      ...scene,
      approximate_start_seconds: Math.round(start * 100) / 100,
      approximate_duration_seconds: Math.round(duration * 100) / 100,
    };
  });
  return {
    ...args.plan,
    measured_audio_duration_seconds: Math.round(total * 100) / 100,
    timing_measurement_source: TIMING_MEASUREMENT_ESTIMATED_FALLBACK,
    scenes: timed,
    plan_fingerprint: args.plan.plan_fingerprint,
    timing_status: TEXT_TO_VIDEO_TIMING_MEASURED,
    measured_audio_revision_id: args.measuredAudioRevisionId,
    repetition: args.plan.repetition,
    status: args.plan.status,
  };
}

/** @deprecated Use applyAlignmentMeasuredTimingToPlan */
export function applyMeasuredTimingToPlan(args: {
  plan: TextToVideoCreativePlan;
  audioDurationSeconds: number;
  measuredAudioRevisionId: string;
  synthesisFingerprint: string;
}): TextToVideoCreativePlan {
  void args.synthesisFingerprint;
  return applyEstimatedFallbackTimingToPlan({
    plan: args.plan,
    audioDurationSeconds: args.audioDurationSeconds,
    measuredAudioRevisionId: args.measuredAudioRevisionId,
  });
}
