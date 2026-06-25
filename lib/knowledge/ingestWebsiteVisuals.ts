import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Asset, Json, MediaType } from "@/lib/supabase/types";
import { STORAGE_BUCKETS, buildAssetPath } from "@/lib/api/storage";
import { analyzeUploadedAsset } from "@/lib/ai/workflows/analyzeAsset";
import { inferIngestProductRole } from "@/lib/assets/ingestProductRole";
import { normalizeWebsiteUrl } from "@/lib/knowledge/websiteUrl";
import { FetchUrlError } from "@/lib/knowledge/fetchUrlText";
import {
  extractWebsiteImageCandidates,
  rankWebsiteImageCandidates,
  type WebsiteImageCandidate,
} from "@/lib/knowledge/extractWebsiteImageCandidates";

const FETCH_HTML_TIMEOUT_MS = 12_000;
const MAX_INGEST_IMAGES = 5;
const MAX_IMAGE_BYTES = 3_000_000;

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

function extensionFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("icon")) return "ico";
  return "jpg";
}

function titleForCandidate(candidate: WebsiteImageCandidate): string {
  switch (candidate.kind) {
    case "favicon":
      return "Website favicon";
    case "og_image":
      return "Website social preview image";
    default:
      return candidate.alt?.trim() || "Website image";
  }
}

async function fetchWebsiteHtml(url: string): Promise<string> {
  const normalized = url.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_HTML_TIMEOUT_MS);
  try {
    const response = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; FenrikBot/1.0; +https://fenrik.marketing)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) {
      throw new FetchUrlError(`URL vrátila stav ${response.status}.`);
    }
    return await response.text();
  } catch (err) {
    if (err instanceof FetchUrlError) throw err;
    throw new FetchUrlError(
      err instanceof Error && err.name === "AbortError"
        ? "Načtení URL trvalo příliš dlouho."
        : "URL se nepodařilo načíst.",
    );
  } finally {
    clearTimeout(timer);
  }
}

async function downloadImage(
  url: string,
): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_HTML_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; FenrikBot/1.0; +https://fenrik.marketing)",
        accept: "image/*",
      },
    });
    if (!response.ok) return null;
    const mimeType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!mimeType || !ALLOWED_MIME.has(mimeType)) return null;
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;
    return { bytes: buf, mimeType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function uploadIngestedImage(
  projectId: string,
  candidate: WebsiteImageCandidate,
  bytes: Uint8Array,
  mimeType: string,
): Promise<Asset | null> {
  const supabase = createSupabaseAdminClient();
  const productRole = inferIngestProductRole(
    candidate.kind,
    candidate.url,
    candidate.alt,
  );
  const metadata: Record<string, unknown> = {
    asset_class: "static",
    source: "website_ingestion",
    ingest_kind: candidate.kind,
    source_url: candidate.url,
    ...(productRole ? { product_role: productRole } : {}),
  };

  const { data: created, error: insertError } = await supabase
    .from("assets")
    .insert({
      project_id: projectId,
      title: titleForCandidate(candidate),
      media_type: "image" as MediaType,
      asset_mode: "source",
      tags: ["website_ingestion"],
      metadata: metadata as Json,
      mime_type: mimeType,
    })
    .select("*")
    .single();
  if (insertError || !created) return null;

  const asset = created as Asset;
  const filename = `web-${candidate.kind}.${extensionFromMime(mimeType)}`;
  const path = buildAssetPath(projectId, asset.id, filename);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.projectAssets)
    .upload(path, bytes, { contentType: mimeType, upsert: false });
  if (uploadError) {
    await supabase.from("assets").delete().eq("id", asset.id);
    return null;
  }

  const { data: updated, error: updateError } = await supabase
    .from("assets")
    .update({
      storage_bucket: STORAGE_BUCKETS.projectAssets,
      storage_path: path,
    })
    .eq("id", asset.id)
    .select("*")
    .single();
  if (updateError || !updated) return null;
  return updated as Asset;
}

export interface IngestWebsiteVisualsResult {
  created: number;
  skipped: boolean;
  reason?: string;
}

// Best-effort: fetches the project website HTML, ingests a few images as assets,
// runs vision analysis. NEVER throws — onboarding / knowledge extraction must
// continue when this fails.
export async function ingestWebsiteVisualsBestEffort(
  projectId: string,
  sourceUrl: string,
): Promise<IngestWebsiteVisualsResult> {
  if (!projectId || !sourceUrl?.trim()) {
    return { created: 0, skipped: true, reason: "missing_input" };
  }

  const pageUrl = normalizeWebsiteUrl(sourceUrl);
  if (!pageUrl) {
    return { created: 0, skipped: true, reason: "invalid_url" };
  }

  let html: string;
  try {
    html = await fetchWebsiteHtml(pageUrl);
  } catch {
    return { created: 0, skipped: true, reason: "fetch_html_failed" };
  }

  const candidates = rankWebsiteImageCandidates(
    extractWebsiteImageCandidates(html, pageUrl),
    MAX_INGEST_IMAGES,
  );
  if (candidates.length === 0) {
    return { created: 0, skipped: true, reason: "no_candidates" };
  }

  let created = 0;
  for (const candidate of candidates) {
    const downloaded = await downloadImage(candidate.url);
    if (!downloaded) continue;
    const asset = await uploadIngestedImage(
      projectId,
      candidate,
      downloaded.bytes,
      downloaded.mimeType,
    );
    if (!asset) continue;
    try {
      await analyzeUploadedAsset(asset);
    } catch {
      // analyzeUploadedAsset should not throw; swallow defensively.
    }
    created += 1;
  }

  return {
    created,
    skipped: created === 0,
    reason: created === 0 ? "none_saved" : undefined,
  };
}
