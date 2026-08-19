export { AUDIO_MIX_DEFAULTS } from "@/video-worker/services/audioMix/defaults";
export type {
  AudioMixDefaults,
  AudioMixLevels,
} from "@/video-worker/services/audioMix/defaults";
export type {
  AudioMixBedTrack,
  AudioMixInput,
  AudioMixResult,
  AudioMixSceneAudio,
  AudioMixSfxEvent,
  AudioMixTimelineScene,
  AudioMixVoiceover,
} from "@/video-worker/services/audioMix/types";
export {
  buildAudioMixGraph,
  mixAudioLayers,
  probeHasAudioStream,
  resolveSceneAudioPlacement,
} from "@/video-worker/services/audioMix/mixAudioLayers";
