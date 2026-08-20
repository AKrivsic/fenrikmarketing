import { excerptTimeRangeFromAlignment } from "@/lib/elevenlabs/alignmentVoiceover";
import type { ElevenLabsCharacterAlignment } from "@/lib/elevenlabs/adapter";
import type {
  TextToVideoSceneSound,
  TextToVideoSfxAnchor,
} from "@/lib/content-package/textToVideoSoundPlan";
import type { TextToVideoRunwayScenePlanItem } from "@/lib/text-to-video/runwayExecutionPlan";

export interface ResolvedSfxPlacement {
  scene_id: string;
  absolute_start_seconds: number;
  duration_seconds: number;
  gain: number;
  fade_in_seconds: number;
  fade_out_seconds: number;
  prompt: string;
}

const SFX_GAIN = 0.35;
const SFX_DURATION = 2.5;

export function resolveSfxAnchorSeconds(args: {
  anchor: TextToVideoSfxAnchor;
  scene: TextToVideoRunwayScenePlanItem;
  alignment: ElevenLabsCharacterAlignment;
  approvedVoiceover: string;
  voicePhrase?: string;
}): number {
  const start = args.scene.measuredStartSeconds;
  const dur = args.scene.requiredTrimSeconds;
  switch (args.anchor) {
    case "scene_start":
    case "scene_beginning":
      return start;
    case "scene_middle":
      return start + dur / 2;
    case "scene_end":
      return start + Math.max(0, dur - 0.5);
    case "voice_phrase": {
      const phrase = args.voicePhrase?.trim();
      if (!phrase) throw new Error("sfx_voice_phrase_required");
      const range = excerptTimeRangeFromAlignment(
        args.alignment,
        args.approvedVoiceover,
        phrase,
      );
      const matches = args.approvedVoiceover
        .toLowerCase()
        .split(phrase.toLowerCase()).length - 1;
      if (matches !== 1) throw new Error("sfx_voice_phrase_ambiguous");
      return range.start_seconds;
    }
    default:
      return start;
  }
}

export function validateSceneSoundForApproval(
  sound: TextToVideoSceneSound,
  approvedVoiceover: string,
): void {
  if (sound.mode !== "custom") return;
  if (!sound.custom_effect_description?.trim()) {
    throw new Error("sfx_custom_description_required");
  }
  if (sound.anchor === "voice_phrase") {
    const phrase = sound.voice_phrase?.trim();
    if (!phrase) throw new Error("sfx_voice_phrase_required");
    const norm = approvedVoiceover.toLowerCase();
    const idx = norm.indexOf(phrase.toLowerCase());
    if (idx < 0) throw new Error("sfx_voice_phrase_not_found");
    const second = norm.indexOf(phrase.toLowerCase(), idx + 1);
    if (second >= 0) throw new Error("sfx_voice_phrase_ambiguous");
  }
}

export function resolveSfxPlacements(args: {
  scenes: TextToVideoRunwayScenePlanItem[];
  sceneSound: Record<string, TextToVideoSceneSound>;
  alignment: ElevenLabsCharacterAlignment;
  approvedVoiceover: string;
  videoDurationSeconds: number;
}): ResolvedSfxPlacement[] {
  const out: ResolvedSfxPlacement[] = [];
  let effectCount = 0;
  for (const scene of args.scenes) {
    const sound = args.sceneSound[scene.sceneId] ?? { mode: "none" as const };
    if (sound.mode === "none") continue;
    if (sound.mode === "auto") continue;
    if (effectCount >= 3) break;
    const anchor = sound.anchor ?? "scene_beginning";
    const start = resolveSfxAnchorSeconds({
      anchor,
      scene,
      alignment: args.alignment,
      approvedVoiceover: args.approvedVoiceover,
      voicePhrase: sound.voice_phrase,
    });
    const duration = Math.min(SFX_DURATION, args.videoDurationSeconds - start);
    if (duration <= 0.2) continue;
    out.push({
      scene_id: scene.sceneId,
      absolute_start_seconds: Math.round(start * 100) / 100,
      duration_seconds: duration,
      gain: SFX_GAIN,
      fade_in_seconds: 0.05,
      fade_out_seconds: 0.2,
      prompt: sound.custom_effect_description!.trim(),
    });
    effectCount += 1;
  }
  return out;
}

export function countAutoSoundEffects(
  sceneSound: Record<string, TextToVideoSceneSound>,
): number {
  let n = 0;
  for (const s of Object.values(sceneSound)) {
    if (s.mode === "custom") n += 1;
  }
  return n;
}

export function assertAtMostOneEffectPerScene(
  sceneSound: Record<string, TextToVideoSceneSound>,
): void {
  for (const [sceneId, s] of Object.entries(sceneSound)) {
    if (s.mode === "custom" && !s.custom_effect_description?.trim()) {
      throw new Error(`sfx_invalid_scene:${sceneId}`);
    }
  }
}
