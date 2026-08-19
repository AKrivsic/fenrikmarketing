import { createHash } from "node:crypto";
import type { TextToVideoSoundPlan } from "@/lib/content-package/textToVideoSoundPlan";
import type { ResolvedSfxPlacement } from "@/lib/text-to-video/textToVideoSfxAnchoring";
import {
  TEXT_TO_VIDEO_ASSEMBLY_CONTRACT_VERSION,
  TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_HEIGHT,
  TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_WIDTH,
} from "@/lib/text-to-video/textToVideoAssemblyConstants";

export function computeTextToVideoAssemblyFingerprint(args: {
  executionFingerprint: string;
  voiceSynthesisFingerprint: string;
  measuredAudioDurationSeconds: number;
  trimmedClipSha256Ordered: string[];
  soundPlan: TextToVideoSoundPlan;
  audioAssetFingerprints: string[];
  sfxPlacements: ResolvedSfxPlacement[];
  musicRef: { bucket: string; path: string } | null;
  subtitleFingerprint: string;
  transitionPlanKey: string;
}): string {
  const payload = {
    v: TEXT_TO_VIDEO_ASSEMBLY_CONTRACT_VERSION,
    delivery_width: TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_WIDTH,
    delivery_height: TEXT_TO_VIDEO_ASSEMBLY_DELIVERY_HEIGHT,
    execution: args.executionFingerprint,
    voice: args.voiceSynthesisFingerprint,
    audio_duration: args.measuredAudioDurationSeconds,
    trims: args.trimmedClipSha256Ordered,
    sound_revision: args.soundPlan.revision,
    sound_plan: args.soundPlan,
    audio_assets: [...args.audioAssetFingerprints].sort(),
    sfx_anchors: args.sfxPlacements.map((p) => ({
      scene: p.scene_id,
      t: p.absolute_start_seconds,
      d: p.duration_seconds,
    })),
    music: args.musicRef,
    subtitles: args.subtitleFingerprint,
    transitions: args.transitionPlanKey,
  };
  return createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
}

export function subtitleContentFingerprint(srt: string | undefined): string {
  if (!srt?.trim()) return "none";
  return createHash("sha256").update(srt.trim(), "utf8").digest("hex").slice(0, 32);
}

export function transitionPlanFingerprint(
  sceneIds: string[],
  transitions: string[],
): string {
  return createHash("sha256")
    .update(sceneIds.join("|") + ";" + transitions.join("|"), "utf8")
    .digest("hex")
    .slice(0, 24);
}
