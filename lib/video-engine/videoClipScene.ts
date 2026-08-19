import type { TransitionType } from "@/lib/video-engine/storyboard";

/**
 * Minimal contract for a local video clip rendered by the FFmpeg video-clip path.
 * Belongs to the video render layer (not Runway / providers / DB).
 */
export interface VideoClipScene {
  /** Stable scene identifier (ordering / diagnostics). */
  sceneId: string;
  /** Absolute or process-relative path to a local video file. */
  clipPath: string;
  /** Desired on-timeline scene length in seconds. */
  durationSeconds: number;
  /** Incoming transition; first scene should use `"none"`. */
  transition: TransitionType;
  /** Optional probed/original clip length before trim/freeze. */
  sourceDurationSeconds?: number;
}
