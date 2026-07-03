/** Max upload size for scene replacement images (bytes). */
export const SCENE_IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const SCENE_IMAGE_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

/** Max upload size for brand asset / logo inserts (bytes). */
export const BRAND_ASSET_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const DEFAULT_BRAND_ASSET_INSERT_INSTRUCTION =
  "Place this exact logo naturally on the laptop screen. Keep the rest of the image unchanged.";

export const SCENE_EDITOR_METADATA_KEY = "video_scene_editor";

export const DEFAULT_SCENE_DURATION_SECONDS = 4;
export const MIN_SCENE_DURATION_SECONDS = 1;
export const MAX_SCENE_DURATION_SECONDS = 30;
export const MIN_SCENES_IN_VIDEO = 1;
export const MAX_SCENES_IN_VIDEO = 24;
