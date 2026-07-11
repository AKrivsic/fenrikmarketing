import type { MotionType, TransitionType } from "@/lib/video-engine/storyboard";

// Video Quality V2 — FFmpeg motion + transition helpers.
//
// Pure string builders for the `zoompan` (Ken-Burns style motion) and `xfade`
// (light transition) filters. Kept dependency-free and separate from the worker
// so the expressions can be reasoned about (and unit-tested) in isolation.

// How much the camera zooms within a beat (1.0 = none). Kept subtle.
const ZOOM_AMPLITUDE_LOW = 0.12;
const ZOOM_AMPLITUDE_MEDIUM = 0.16;
// Constant zoom used by pan/drift motions so there is room to move inside frame.
const PAN_ZOOM_LOW = 1.12;
const PAN_ZOOM_MEDIUM = 1.16;

export type MotionIntensityLevel = "LOW" | "MEDIUM";

function amplitudeForIntensity(intensity?: MotionIntensityLevel): {
  zoom: number;
  pan: number;
} {
  if (intensity === "MEDIUM") {
    return { zoom: ZOOM_AMPLITUDE_MEDIUM, pan: PAN_ZOOM_MEDIUM };
  }
  return { zoom: ZOOM_AMPLITUDE_LOW, pan: PAN_ZOOM_LOW };
}

export interface BuildZoompanOptions {
  intensity?: MotionIntensityLevel;
}

export interface ZoompanExpr {
  z: string;
  x: string;
  y: string;
}

// Builds the zoom/x/y expressions for one motion over `frames` output frames.
// Coordinates are expressed against the (already upscaled) input dimensions so
// the crop window always stays inside the frame. `on` is the output frame index.
export function buildZoompanExpr(
  motion: MotionType,
  frames: number,
  options?: BuildZoompanOptions,
): ZoompanExpr {
  const n = Math.max(1, Math.round(frames));
  const centeredX = "iw/2-(iw/zoom/2)";
  const centeredY = "ih/2-(ih/zoom/2)";
  const { zoom: ZOOM_AMPLITUDE, pan: PAN_ZOOM } = amplitudeForIntensity(
    options?.intensity,
  );
  const zMax = (1 + ZOOM_AMPLITUDE).toFixed(3);

  switch (motion) {
    case "static":
      return {
        z: "1",
        x: centeredX,
        y: centeredY,
      };
    case "zoom_in":
      // Clamp so an over-running frame counter can never zoom past the cap.
      return {
        z: `min(1+${ZOOM_AMPLITUDE}*on/${n},${zMax})`,
        x: centeredX,
        y: centeredY,
      };
    case "zoom_out":
      return {
        z: `max(${zMax}-${ZOOM_AMPLITUDE}*on/${n},1.0)`,
        x: centeredX,
        y: centeredY,
      };
    case "pan_right":
      return {
        z: `${PAN_ZOOM}`,
        x: `(iw-iw/zoom)*on/${n}`,
        y: centeredY,
      };
    case "pan_left":
      return {
        z: `${PAN_ZOOM}`,
        x: `(iw-iw/zoom)*(1-on/${n})`,
        y: centeredY,
      };
    case "drift_up":
      return {
        z: `${PAN_ZOOM}`,
        x: centeredX,
        y: `(ih-ih/zoom)*(1-on/${n})`,
      };
    case "drift_down":
      return {
        z: `${PAN_ZOOM}`,
        x: centeredX,
        y: `(ih-ih/zoom)*on/${n}`,
      };
    default:
      return {
        z: "1",
        x: centeredX,
        y: centeredY,
      };
  }
}

// Maps our light transition vocabulary onto FFmpeg xfade transition names.
// "none" never reaches xfade (the first beat has no incoming transition); it
// maps to a quick fade defensively.
export function xfadeTransitionName(transition: TransitionType): string {
  switch (transition) {
    case "slide":
      return "slideleft";
    case "push":
      return "smoothleft";
    case "fade":
    case "none":
      return "fade";
  }
}
