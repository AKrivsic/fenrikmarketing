import type { Json, MediaType } from "@/lib/supabase/types";
import { STORAGE_BUCKETS, buildAssetPath } from "@/lib/api/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { analyzeUploadedAsset } from "@/lib/ai/workflows/analyzeAsset";
import { smartUsageFromAssetMetadata } from "@/lib/assets/smartUsageMetadata";
import { readProductRole, normalizeProductRole } from "@/lib/assets/productRole";
import { isAssetArchivedFromLibrary } from "@/lib/assets/libraryArchive";
import { COMPONENT_CAPTURE_MAX_SCREENSHOTS } from "@/lib/knowledge/componentCaptureRules";
import {
  assetLibraryHasTier1ProductVisual,
  requestComponentCapture,
  type ComponentCaptureFetch,
  type ComponentCaptureScreenshotPayload,
} from "@/lib/knowledge/componentCaptureClient";

export {
  assetLibraryHasTier1ProductVisual,
  isComponentCaptureEnabled,
  parseComponentCaptureWorkerJson,
  requestComponentCapture,
  COMPONENT_CAPTURE_MAX_RESPONSE_BYTES,
  type ComponentCaptureScreenshotPayload,
  type ComponentCaptureWorkerResponse,
} from "@/lib/knowledge/componentCaptureClient";

export async function projectHasTier1ProductVisual(projectId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("assets")
    .select("metadata")
    .eq("project_id", projectId);
  return assetLibraryHasTier1ProductVisual(
    (data ?? [])
      .filter((row) => !isAssetArchivedFromLibrary(row.metadata as Json))
      .map((row) => ({ metadata: row.metadata as Json })),
  );
}

function decodeScreenshotBytes(payload: ComponentCaptureScreenshotPayload): Uint8Array | null {
  if (payload.imageBase64) {
    try {
      return Uint8Array.from(Buffer.from(payload.imageBase64, "base64"));
    } catch {
      return null;
    }
  }
  return null;
}

async function persistCaptureScreenshot(
  projectId: string,
  pageUrl: string,
  shot: ComponentCaptureScreenshotPayload,
  bytes: Uint8Array,
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const title = shot.label?.trim() || "Website component screenshot";
  const roleHint = shot.roleHint ? normalizeProductRole(shot.roleHint) : null;
  const smart = smartUsageFromAssetMetadata({} as Json, {
    width: shot.width,
    height: shot.height,
    title: shot.label,
    productRole: roleHint,
    source: "component_capture",
    detectedContentType: shot.roleHint ?? "product ui",
  });

  const metadata: Record<string, unknown> = {
    asset_class: "static",
    source: "component_capture",
    capture_page_url: pageUrl,
    capture_label: shot.label,
    ...(shot.selectorHint ? { capture_selector: shot.selectorHint } : {}),
    ...(shot.roleHint ? { capture_role_hint: shot.roleHint } : {}),
    ...(shot.viewport === "desktop" || shot.viewport === "mobile"
      ? { capture_viewport: shot.viewport }
      : {}),
    ...(roleHint ? { product_role: roleHint } : {}),
    width: shot.width,
    height: shot.height,
    ...smart,
  };

  const { data: created, error: insertError } = await supabase
    .from("assets")
    .insert({
      project_id: projectId,
      title,
      media_type: "image" as MediaType,
      asset_mode: "source",
      tags: ["component_capture"],
      metadata: metadata as Json,
      mime_type: "image/png",
    })
    .select("*")
    .single();
  if (insertError || !created) return false;

  const assetId = created.id as string;
  const path = buildAssetPath(projectId, assetId, "component-capture.png");
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.projectAssets)
    .upload(path, bytes, { contentType: "image/png", upsert: false });
  if (uploadError) {
    await supabase.from("assets").delete().eq("id", assetId);
    return false;
  }

  const { data: updated } = await supabase
    .from("assets")
    .update({
      storage_bucket: STORAGE_BUCKETS.projectAssets,
      storage_path: path,
    })
    .eq("id", assetId)
    .select("*")
    .single();
  if (!updated) return false;

  try {
    await analyzeUploadedAsset(updated as Parameters<typeof analyzeUploadedAsset>[0]);
  } catch {
    // Best-effort vision + smart usage refresh.
  }
  return true;
}

// After HTML ingest: if the library still lacks Tier 1 visuals, optionally call
// the external Playwright worker. Silent no-op when disabled or misconfigured.
export async function maybeRunComponentCaptureFallback(
  projectId: string,
  pageUrl: string,
  deps: { fetchImpl?: ComponentCaptureFetch } = {},
): Promise<{ attempted: boolean; saved: number; skippedReason?: string }> {
  const enabled = process.env.ENABLE_COMPONENT_CAPTURE === "true";
  if (!enabled) {
    return { attempted: false, saved: 0, skippedReason: "disabled" };
  }
  if (await projectHasTier1ProductVisual(projectId)) {
    return { attempted: false, saved: 0, skippedReason: "tier1_exists" };
  }

  const result = await requestComponentCapture(
    { url: pageUrl, projectId },
    deps,
  );
  if (!result.ok || !result.screenshots?.length) {
    return {
      attempted: true,
      saved: 0,
      skippedReason: result.error ?? "no_screenshots",
    };
  }

  let saved = 0;
  for (const shot of result.screenshots.slice(0, COMPONENT_CAPTURE_MAX_SCREENSHOTS)) {
    const bytes = decodeScreenshotBytes(shot);
    if (!bytes || bytes.byteLength === 0) continue;
    const ok = await persistCaptureScreenshot(projectId, pageUrl, shot, bytes);
    if (ok) saved += 1;
  }
  return { attempted: true, saved };
}
