/** Max upload size for scene replacement images (bytes). */
export const SCENE_IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const SCENE_IMAGE_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

export const SCENE_EDITOR_METADATA_KEY = "video_scene_editor";
