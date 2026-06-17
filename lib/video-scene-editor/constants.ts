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
