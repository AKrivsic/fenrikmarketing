import type { TransitionType } from "@/lib/video-engine/storyboard";
import type { AudioMixLevels } from "@/video-worker/services/audioMix/defaults";

/** Required primary narration; starts at t=0. */
export interface AudioMixVoiceover {
  path: string;
  gain?: number;
}

/**
 * Optional per-scene audio. `path` may be a video (audio extracted) or audio file.
 * When `enabled` is false, the layer is skipped. Missing audio streams are skipped
 * without failing the mix.
 */
export interface AudioMixSceneAudio {
  sceneId: string;
  path: string;
  enabled?: boolean;
  gain?: number;
  /** Override timeline start; default from xfade scene start. */
  startSeconds?: number;
  /** Max audible length; default = scene duration from timeline. */
  durationSeconds?: number;
}

export interface AudioMixBedTrack {
  path: string;
  gain?: number;
  /** Loop when shorter than target (default true). */
  loop?: boolean;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
}

export interface AudioMixSfxEvent {
  path: string;
  startSeconds: number;
  gain?: number;
}

/** Visual scene list used only for xfade-aligned scene-audio placement. */
export interface AudioMixTimelineScene {
  sceneId: string;
  durationSeconds: number;
  transition: TransitionType;
}

/**
 * Standalone render contract — no providers, pricing, Runway, or DB fields.
 */
export interface AudioMixInput {
  voiceover: AudioMixVoiceover;
  /** Scenes for xfade timeline (required when sceneAudio is used). */
  timelineScenes?: AudioMixTimelineScene[];
  sceneAudio?: AudioMixSceneAudio[];
  music?: AudioMixBedTrack | null;
  ambient?: AudioMixBedTrack | null;
  sfx?: AudioMixSfxEvent[];
  /**
   * Final mix length in seconds (typically VO duration + tail, or
   * max(visual timeline, VO) + tail). Mix is trimmed/padded to this.
   */
  targetDurationSeconds: number;
  /** Defaults to SHORT_PROFILE.transitionSeconds when timelineScenes present. */
  transitionSeconds?: number;
  levels?: AudioMixLevels;
  /** Prefer `.wav` to avoid repeated lossy encode before video mux. */
  outputPath: string;
  signal?: AbortSignal;
}

export interface AudioMixResult {
  audioPath: string;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  diagnostics: {
    sceneAudioUsed: string[];
    sceneAudioSkipped: string[];
    musicUsed: boolean;
    ambientUsed: boolean;
    sfxCount: number;
    visualTimelineSeconds: number | null;
    ducked: boolean;
  };
}
