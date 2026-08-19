import {
  ROUND_A_DURATION_SECONDS,
  getTextToVideoModel,
  getVideoModel,
} from "@/lib/ai-media-benchmark/catalog";
import {
  AI_MEDIA_BENCHMARK_AMBIENT_GAIN,
  AI_MEDIA_BENCHMARK_MAX_VOICEOVER_SECONDS,
  AI_MEDIA_BENCHMARK_SCENE_AUDIO_GAIN,
  AI_MEDIA_BENCHMARK_VOICEOVER_GAIN,
} from "@/lib/ai-media-benchmark/constants";

export type CombinedAudioLayerKind =
  | "voiceover"
  | "scene_model_audio"
  | "ambient_sound";

export type CombinedLayerSkipReason =
  | "not_selected"
  | "model_audio_kept"
  | "video_has_no_model_audio";

export interface CombinedLayerPreview {
  kind: CombinedAudioLayerKind;
  used: boolean;
  label: string;
  gain: number | null;
  duckedUnderVoiceover: boolean;
  skippedReason: CombinedLayerSkipReason | null;
  sourceRunId: string | null;
}

export interface CombinedMixSettings {
  targetDurationSeconds: number;
  voiceoverStartSeconds: 0;
  voiceoverGain: number;
  sceneAudioGain: number;
  ambientGain: number;
  useSceneAudio: boolean;
  useAmbientSound: boolean;
}

export interface CombinedScenePlan {
  targetDurationSeconds: number;
  voiceoverStartSeconds: 0;
  voiceoverText: string | null;
  videoHasModelAudio: boolean;
  layers: CombinedLayerPreview[];
  mix: CombinedMixSettings;
}

export function videoHasUsableModelAudio(video: {
  model: string;
  outputContainsAudio: boolean | null;
}): boolean {
  if (video.outputContainsAudio === true) return true;
  if (video.outputContainsAudio === false) return false;
  return (
    getVideoModel(video.model)?.returnsAudio === true ||
    getTextToVideoModel(video.model)?.returnsAudio === true
  );
}

export function extractVoiceoverText(settings: Record<string, unknown> | null | undefined): string | null {
  const text = settings?.text;
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  return trimmed || null;
}

/**
 * Fair 4s combined-scene mix plan. Voiceover is always first and never ducked.
 * Model audio (Veo/Seedance) is kept as scene bed and a selected sound run is
 * not stacked on top of it. Gen-4 uses the selected sound run as ambient.
 */
export function planCombinedScene(args: {
  videoRunId: string;
  videoModel: string;
  videoOutputContainsAudio: boolean | null;
  voiceRunId: string;
  voiceSettings?: Record<string, unknown> | null;
  soundRunId?: string | null;
}): CombinedScenePlan {
  const videoHasModelAudio = videoHasUsableModelAudio({
    model: args.videoModel,
    outputContainsAudio: args.videoOutputContainsAudio,
  });
  const soundRunId = args.soundRunId?.trim() || null;
  const useSceneAudio = videoHasModelAudio;
  const useAmbientSound = !videoHasModelAudio && Boolean(soundRunId);

  const layers: CombinedLayerPreview[] = [
    {
      kind: "voiceover",
      used: true,
      label: "Společný voiceover od t = 0 s",
      gain: AI_MEDIA_BENCHMARK_VOICEOVER_GAIN,
      duckedUnderVoiceover: false,
      skippedReason: null,
      sourceRunId: args.voiceRunId,
    },
    {
      kind: "scene_model_audio",
      used: useSceneAudio,
      label: useSceneAudio
        ? "Vlastní zvuk video modelu (zeslabený pod hlasem)"
        : "Video model nemá vlastní zvuk",
      gain: useSceneAudio ? AI_MEDIA_BENCHMARK_SCENE_AUDIO_GAIN : null,
      duckedUnderVoiceover: useSceneAudio,
      skippedReason: useSceneAudio ? null : "video_has_no_model_audio",
      sourceRunId: useSceneAudio ? args.videoRunId : null,
    },
    {
      kind: "ambient_sound",
      used: useAmbientSound,
      label: useAmbientSound
        ? "Společný sound benchmark jako podkres"
        : videoHasModelAudio && soundRunId
          ? "Společný sound se nepřidá — model už má vlastní ambient"
          : "Sound benchmark nevybrán",
      gain: useAmbientSound ? AI_MEDIA_BENCHMARK_AMBIENT_GAIN : null,
      duckedUnderVoiceover: useAmbientSound,
      skippedReason: useAmbientSound
        ? null
        : videoHasModelAudio && soundRunId
          ? "model_audio_kept"
          : "not_selected",
      sourceRunId: useAmbientSound ? soundRunId : null,
    },
  ];

  return {
    targetDurationSeconds: ROUND_A_DURATION_SECONDS,
    voiceoverStartSeconds: 0,
    voiceoverText: extractVoiceoverText(args.voiceSettings),
    videoHasModelAudio,
    layers,
    mix: {
      targetDurationSeconds: ROUND_A_DURATION_SECONDS,
      voiceoverStartSeconds: 0,
      voiceoverGain: AI_MEDIA_BENCHMARK_VOICEOVER_GAIN,
      sceneAudioGain: AI_MEDIA_BENCHMARK_SCENE_AUDIO_GAIN,
      ambientGain: AI_MEDIA_BENCHMARK_AMBIENT_GAIN,
      useSceneAudio,
      useAmbientSound,
    },
  };
}

export function isVoiceoverTooLongForScene(durationSeconds: number): boolean {
  return durationSeconds > AI_MEDIA_BENCHMARK_MAX_VOICEOVER_SECONDS;
}

export function mixSettingsMatch(
  left: CombinedMixSettings,
  right: CombinedMixSettings,
): boolean {
  return (
    left.targetDurationSeconds === right.targetDurationSeconds &&
    left.voiceoverStartSeconds === right.voiceoverStartSeconds &&
    left.voiceoverGain === right.voiceoverGain &&
    left.sceneAudioGain === right.sceneAudioGain &&
    left.ambientGain === right.ambientGain &&
    left.useSceneAudio === right.useSceneAudio &&
    left.useAmbientSound === right.useAmbientSound
  );
}

/** Canonical Round A+ mix: exact gains, 4 s, VO at t=0, no scene+ambient stack. */
export function isAllowedCombinedMix(mix: CombinedMixSettings): boolean {
  if (mix.targetDurationSeconds !== ROUND_A_DURATION_SECONDS) return false;
  if (mix.voiceoverStartSeconds !== 0) return false;
  if (mix.voiceoverGain !== AI_MEDIA_BENCHMARK_VOICEOVER_GAIN) return false;
  if (mix.sceneAudioGain !== AI_MEDIA_BENCHMARK_SCENE_AUDIO_GAIN) return false;
  if (mix.ambientGain !== AI_MEDIA_BENCHMARK_AMBIENT_GAIN) return false;
  if (typeof mix.useSceneAudio !== "boolean") return false;
  if (typeof mix.useAmbientSound !== "boolean") return false;
  if (mix.useSceneAudio && mix.useAmbientSound) return false;
  return true;
}
