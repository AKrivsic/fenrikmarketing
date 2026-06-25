"use server";

import { revalidatePath } from "next/cache";
import { uploadAsset } from "@/lib/api/assets";
import { analyzeUploadedAsset } from "@/lib/ai/workflows/analyzeAsset";
import type { AssetClass } from "@/lib/ai/guardrails";
import { normalizeProductRole } from "@/lib/assets/productRole";
import type { MediaType } from "@/lib/supabase/types";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const ASSET_CLASSES: AssetClass[] = ["static", "editable", "reference"];

function isAssetClass(value: string): value is AssetClass {
  return (ASSET_CLASSES as string[]).includes(value);
}

// Maps a browser MIME type onto the media_type enum. Anything that is not
// clearly audio/visual is stored as a document (no content inspection).
function inferMediaType(mime: string): MediaType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

// Phase 2A — upload a single file to the current project via the existing
// uploadAsset (Supabase Storage + assets table). The selected mode
// (static/editable/reference) is stored as metadata.asset_class, matching the
// existing guardrails.classifyAsset convention. No content extraction here.
export async function uploadProjectAsset(
  projectId: string,
  formData: FormData,
): Promise<ActionResult> {
  if (!projectId) return { ok: false, error: "Chybí identifikátor projektu." };

  const fieldErrors: Record<string, string> = {};

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    fieldErrors.file = "Vyber soubor.";
  }

  const rawTitle = formData.get("title");
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";

  const rawClass = formData.get("assetClass");
  const assetClass =
    typeof rawClass === "string" && isAssetClass(rawClass) ? rawClass : "static";

  const rawRole = formData.get("productRole");
  const productRole =
    typeof rawRole === "string" ? normalizeProductRole(rawRole) : null;

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Zkontroluj zvýrazněná pole.", fieldErrors };
  }

  const uploadFile = file as File;
  // Fall back to the file name when no explicit title is given.
  const finalTitle = title.length > 0 ? title : uploadFile.name;

  let asset;
  try {
    asset = await uploadAsset(projectId, uploadFile, {
      title: finalTitle,
      mediaType: inferMediaType(uploadFile.type),
      assetMode: "source",
      metadata: {
        asset_class: assetClass,
        ...(productRole ? { product_role: productRole } : {}),
      },
    });
  } catch {
    return { ok: false, error: "Nahrání se nezdařilo." };
  }

  // Phase 2B: analyze the asset right after upload. analyzeUploadedAsset never
  // throws (failures are recorded as analysis_status "failed"), so a failed
  // analysis cannot break the successful upload.
  await analyzeUploadedAsset(asset);

  revalidatePath(`/projects/${projectId}/assets`);
  return { ok: true };
}
