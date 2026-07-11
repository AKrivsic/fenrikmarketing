import type { SceneType } from "@/lib/scene-types/sceneType";

export type SceneTransitionIn = "fade" | "slide" | "push" | "none";

export type SceneMotion =
  | "zoom_in"
  | "zoom_out"
  | "pan_left"
  | "pan_right"
  | "drift_up"
  | "drift_down"
  | "none";

export interface ScenePresentationStyling {
  theme?: "brand" | "dark" | "light";
  accent?: string;
  text_scale?: "sm" | "md" | "lg";
}

export interface ImageSceneMediaAi {
  source: "ai";
  image_prompt: string;
}

export interface ImageSceneMediaAsset {
  source: "asset";
  asset_id: string;
  used_as: string;
  video_usage?: string;
  modify?: string;
}

export type ImageSceneMedia = ImageSceneMediaAi | ImageSceneMediaAsset;

export interface ImageScenePayload {
  media: ImageSceneMedia;
}

/** Type-specific payload for non-IMAGE scenes (validated in Presentation Analyzer). */
export type TypedScenePayload = Record<string, unknown>;

export type VisualScenePayload = ImageScenePayload | TypedScenePayload;

/** Canonical visual scene (package / compile layer). */
export interface VisualScene {
  id?: string;
  type: SceneType;
  payload: VisualScenePayload;
  styling?: ScenePresentationStyling;
  transition_in?: SceneTransitionIn;
  motion?: SceneMotion;
  role?: string;
  narration_hint?: string;
}
