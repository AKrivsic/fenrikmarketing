import {
  SCENE_IMAGE_ALLOWED_MIME_TYPES,
  SCENE_IMAGE_UPLOAD_MAX_BYTES,
} from "@/lib/video-scene-editor/constants";

export function validateSceneImageUpload(file: {
  type: string;
  size: number;
}): string | null {
  const mime = (file.type || "").toLowerCase();
  if (!SCENE_IMAGE_ALLOWED_MIME_TYPES.has(mime)) {
    return "Povolené formáty: PNG nebo JPEG.";
  }
  if (file.size <= 0) {
    return "Soubor je prázdný.";
  }
  if (file.size > SCENE_IMAGE_UPLOAD_MAX_BYTES) {
    return "Soubor je příliš velký (max 10 MB).";
  }
  return null;
}
