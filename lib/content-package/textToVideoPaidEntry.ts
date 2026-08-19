import type { VideoPaidPreflightInput } from "@/lib/content-package/videoPaidPreflight";
import { evaluateVideoPaidPreflight } from "@/lib/content-package/videoPaidPreflight";
import { PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO } from "@/lib/content-package/packageVideoProductionMode";
import type { VoiceSynthesisCheckpoint } from "@/lib/text-to-video/voiceSynthesisCheckpoint";

export class TextToVideoPaidEntryBlockedError extends Error {
  readonly code = "text_to_video_paid_preflight_blocked" as const;
  readonly blockers: string[];

  constructor(blockers: string[]) {
    super(`text_to_video_paid_preflight_blocked:${blockers.join(",")}`);
    this.blockers = blockers;
  }
}

function assertPhase(
  input: VideoPaidPreflightInput,
  phase: NonNullable<VideoPaidPreflightInput["paidPreflightPhase"]>,
): void {
  if (input.packageVideoMode !== PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO) {
    return;
  }
  const preflight = evaluateVideoPaidPreflight({
    ...input,
    enforceFuturePaidGates: true,
    paidPreflightPhase: phase,
  });
  if (!preflight.ok) {
    throw new TextToVideoPaidEntryBlockedError(preflight.blockers);
  }
}

/** Before first ElevenLabs call: plan approved, repetition passed; timing may stay estimated. */
export function assertTextToVideoElevenLabsPreflight(
  input: VideoPaidPreflightInput,
): void {
  assertPhase(input, "elevenlabs");
}

/** Before Runway: measured timing and audio revision bound to approved voiceover. */
export function assertTextToVideoRunwayPreflight(
  input: VideoPaidPreflightInput,
): void {
  assertPhase(input, "runway");
}

export function assertTextToVideoPaidEntryReady(
  input: VideoPaidPreflightInput,
): void {
  assertTextToVideoElevenLabsPreflight(input);
}

/** Step 3: ElevenLabs voice phase, then Runway preflight stub. */
export async function runTextToVideoPaidEntryPoint(
  input: import("@/lib/text-to-video/voiceSynthesisService").TextToVideoVoicePhaseInput,
  deps?: import("@/lib/text-to-video/voiceSynthesisService").VoiceSynthesisDeps,
): Promise<{ checkpoint: VoiceSynthesisCheckpoint; brief: Record<string, unknown> }> {
  assertTextToVideoElevenLabsPreflight(input);
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const { runTextToVideoElevenLabsVoicePhase } = await import(
    "@/lib/text-to-video/voiceSynthesisService"
  );
  const supabase = deps?.supabase ?? createSupabaseAdminClient();
  const result = await runTextToVideoElevenLabsVoicePhase(input, {
    supabase,
    fetchImpl: deps?.fetchImpl,
    now: deps?.now,
    elevenLabsCall: deps?.elevenLabsCall,
    probeDuration: deps?.probeDuration,
  });
  assertTextToVideoRunwayPreflight({
    ...input,
    brief: result.brief,
  });
  const { isTextToVideoRunwayEnabled } = await import(
    "@/lib/text-to-video/runwayProductionConfig"
  );
  if (!isTextToVideoRunwayEnabled()) {
    throw new Error("text_to_video_runway_disabled");
  }
  return result;
}
