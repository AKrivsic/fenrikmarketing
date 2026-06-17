import {
  BRAND_ASSET_UPLOAD_MAX_BYTES,
  SCENE_IMAGE_ALLOWED_MIME_TYPES,
} from "@/lib/video-scene-editor/constants";

export function validateBrandAssetUpload(file: {
  type: string;
  size: number;
}): string | null {
  const mime = (file.type || "").toLowerCase();
  if (mime === "image/svg+xml" || mime.includes("svg")) {
    return "SVG není podporované — použijte PNG nebo JPEG.";
  }
  if (!SCENE_IMAGE_ALLOWED_MIME_TYPES.has(mime)) {
    return "Povolené formáty: PNG nebo JPEG.";
  }
  if (file.size <= 0) {
    return "Soubor je prázdný.";
  }
  if (file.size > BRAND_ASSET_UPLOAD_MAX_BYTES) {
    return "Soubor je příliš velký (max 5 MB).";
  }
  return null;
}
