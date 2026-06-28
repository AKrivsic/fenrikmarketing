import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Asset, Json, MediaType } from "@/lib/supabase/types";
import { STORAGE_BUCKETS, buildAssetPath } from "@/lib/api/storage";
import { analyzeUploadedAsset } from "@/lib/ai/workflows/analyzeAsset";
import {
  computeAssetQualityTier,
  ingestPriorityRank,
} from "@/lib/assets/assetIngestMetadata";
import { inferIngestProductRole } from "@/lib/assets/ingestProductRole";
import {
  inferProductRoleFromSignals,
  readProductRoleLocked,
  shouldApplyInferredProductRole,
} from "@/lib/assets/inferProductRoleFromSignals";
import { readProductRole } from "@/lib/assets/productRole";
import { roleLabel } from "@/lib/knowledge/websiteIngestDebugReport";
import {
  bumpReportCount,
  createEmptyIngestReport,
  logWebsiteIngestDebugReport,
  logWebsiteIngestResult,
  type WebsiteIngestDebugReport,
} from "@/lib/knowledge/websiteIngestDebugReport";
import { normalizeWebsiteUrl } from "@/lib/knowledge/websiteUrl";
import { FetchUrlError } from "@/lib/knowledge/fetchUrlText";
import { extractWebsiteImageCandidates } from "@/lib/knowledge/extractWebsiteImageCandidates";
import {
  dedupeWebsiteImageCandidates,
  isDuplicateOfExisting,
  normalizeAssetUrl,
  sha256Hex,
} from "@/lib/knowledge/websiteImageDedupe";
import {
  MAX_WEBSITE_INGEST_ASSETS,
  prioritizeWebsiteImageCandidates,
} from "@/lib/knowledge/websiteImagePrioritize";
import {
  readImageDimensions,
  rejectDownloadedImage,
  rejectWebsiteImageCandidate,
} from "@/lib/knowledge/websiteImageRejectHeuristics";
import type { WebsiteImageCandidate } from "@/lib/knowledge/extractWebsiteImageCandidates";
import { isSvgUrl } from "@/lib/knowledge/websiteImageParseHelpers";
import { mergeAssetAnalysis, fallbackAnalysis } from "@/lib/assets/analysis";
import { computeSmartUsageMetadata } from "@/lib/assets/smartUsageMetadata";
import { enrichAssetMetadataWithDimensionsAndSmartUsage } from "@/lib/ai/workflows/analyzeAsset";
import {
  isComponentCaptureEnabled,
  maybeRunComponentCaptureFallback,
  projectHasTier1ProductVisual,
} from "@/lib/knowledge/componentCapture";
import { resolveWebsiteVisualIngestReason } from "@/lib/knowledge/websiteVisualIngestReason";
import type {
  IngestWebsiteVisualsDeps,
  IngestWebsiteVisualsResult,
} from "@/lib/knowledge/websiteVisualIngestTypes";

export type {
  ComponentCaptureFallbackRunner,
  IngestWebsiteVisualsDeps,
  IngestWebsiteVisualsResult,
} from "@/lib/knowledge/websiteVisualIngestTypes";

const FETCH_HTML_TIMEOUT_MS = 12_000;
const MAX_DOWNLOAD_ATTEMPTS = 24;
const MAX_IMAGE_BYTES = 3_000_000;

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/svg+xml",
]);

function looksLikeSvgMarkup(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.slice(0, 256)).toLowerCase();
  return head.includes("<svg");
}

function normalizeDownloadMime(
  url: string,
  headerMime: string,
  bytes: Uint8Array,
): string | null {
  const mime = headerMime.toLowerCase();
  if (mime && ALLOWED_MIME.has(mime)) return mime;
  if (isSvgUrl(url) || looksLikeSvgMarkup(bytes)) {
    return "image/svg+xml";
  }
  if (
    isSvgUrl(url) &&
    (mime === "text/xml" ||
      mime === "application/xml" ||
      mime === "application/octet-stream" ||
      mime === "")
  ) {
    return "image/svg+xml";
  }
  return null;
}

function extensionFromMime(mime: string): string {
  if (mime.includes("svg")) return "svg";
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
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;
    const normalized = normalizeDownloadMime(url, mimeType, buf);
    if (!normalized) return null;
    return { bytes: buf, mimeType: normalized };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadExistingIngestKeys(
  projectId: string,
): Promise<{ urls: Set<string>; hashes: Set<string> }> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("assets")
    .select("metadata")
    .eq("project_id", projectId);
  const urls = new Set<string>();
  const hashes = new Set<string>();
  for (const row of data ?? []) {
    const meta = row.metadata as Record<string, unknown> | null;
    const raw = meta?.source_url;
    if (typeof raw === "string" && raw.trim()) {
      urls.add(normalizeAssetUrl(raw));
    }
    const hash = meta?.content_hash;
    if (typeof hash === "string" && hash.trim()) {
      hashes.add(hash);
    }
  }
  return { urls, hashes };
}

async function uploadIngestedImage(
  projectId: string,
  candidate: WebsiteImageCandidate,
  bytes: Uint8Array,
  mimeType: string,
): Promise<Asset | null> {
  const supabase = createSupabaseAdminClient();
  const title = titleForCandidate(candidate);
  const productRole = inferIngestProductRole(
    candidate.kind,
    candidate.url,
    candidate.alt,
    title,
  );
  const dims = readImageDimensions(bytes, mimeType);
  const contentHash = sha256Hex(bytes);
  const ingestPriority = ingestPriorityRank({
    kind: candidate.kind,
    productRole: productRole,
  });
  const assetQuality = computeAssetQualityTier({
    productRole,
    ingestPriority,
    byteLength: bytes.byteLength,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    source: "website_ingestion",
  });

  const metadata: Record<string, unknown> = {
    asset_class: "static",
    source: "website_ingestion",
    ingest_kind: candidate.kind,
    source_url: candidate.url,
    content_hash: contentHash,
    ingest_priority: ingestPriority,
    asset_quality: assetQuality,
    ...(dims
      ? { width: dims.width, height: dims.height, resolution: dims.width * dims.height }
      : {}),
    byte_length: bytes.byteLength,
    ...(productRole ? { product_role: productRole } : {}),
  };

  const smart = computeSmartUsageMetadata({
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    mimeType,
    productRole,
    ingestKind: candidate.kind,
    sourceUrl: candidate.url,
    title,
    source: "website_ingestion",
  });
  Object.assign(metadata, smart);

  const { data: created, error: insertError } = await supabase
    .from("assets")
    .insert({
      project_id: projectId,
      title,
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

async function persistSvgIngestAnalysisFallback(
  asset: Asset,
  candidate: WebsiteImageCandidate,
): Promise<void> {
  const title = titleForCandidate(candidate);
  const productRole = inferIngestProductRole(
    candidate.kind,
    candidate.url,
    candidate.alt,
    title,
  );
  const analysis = fallbackAnalysis(
    "skipped",
    "SVG website asset (vision skipped during ingest).",
  );
  const merged = mergeAssetAnalysis(asset.metadata, {
    ...analysis,
    detected_content_type: productRole === "logo" ? "logo" : "vector graphic",
    ai_description:
      productRole === "logo"
        ? "Vector logo (SVG) from website ingestion."
        : "Vector graphic (SVG) from website ingestion.",
  });
  if (productRole) merged.product_role = productRole;
  const smart = computeSmartUsageMetadata({
    width: null,
    height: null,
    mimeType: "image/svg+xml",
    productRole,
    ingestKind: candidate.kind,
    sourceUrl: candidate.url,
    title,
    detectedContentType: productRole === "logo" ? "logo" : "vector graphic",
    source: "website_ingestion",
  });
  Object.assign(merged, smart);

  try {
    const supabase = createSupabaseAdminClient();
    await supabase
      .from("assets")
      .update({ metadata: merged as Json })
      .eq("id", asset.id);
  } catch {
    // Best-effort — upload already succeeded.
  }
}

async function refineAssetAfterVision(assetId: string): Promise<Asset | null> {
  const supabase = createSupabaseAdminClient();
  const { data: row } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .maybeSingle();
  if (!row) return null;
  const asset = row as Asset;
  const metadata = asset.metadata as Record<string, unknown>;
  const locked = readProductRoleLocked(metadata);
  const kind = (metadata.ingest_kind as WebsiteImageCandidate["kind"]) ?? "img";
  const sourceUrl =
    typeof metadata.source_url === "string" ? metadata.source_url : "";

  const inference = inferProductRoleFromSignals({
    kind,
    url: sourceUrl,
    alt: null,
    title: asset.title,
    vision: {
      detected_content_type:
        typeof metadata.detected_content_type === "string"
          ? metadata.detected_content_type
          : null,
      ai_description:
        typeof metadata.ai_description === "string" ? metadata.ai_description : null,
    },
  });

  const next: Record<string, unknown> = { ...metadata };
  if (shouldApplyInferredProductRole(inference, locked) && inference.role) {
    next.product_role = inference.role;
  }

  const resolvedRole = readProductRole(next as Json);
  const width = typeof metadata.width === "number" ? metadata.width : null;
  const height = typeof metadata.height === "number" ? metadata.height : null;
  const byteLength =
    typeof metadata.byte_length === "number" ? metadata.byte_length : 0;
  const ingestPriority =
    typeof metadata.ingest_priority === "number"
      ? metadata.ingest_priority
      : ingestPriorityRank({ kind, productRole: resolvedRole });

  next.asset_quality = computeAssetQualityTier({
    productRole: resolvedRole,
    ingestPriority,
    byteLength,
    width,
    height,
    visionConfidence: inference.confidence,
    source: "website_ingestion",
  });

  let metadataOut: Json = next as Json;
  try {
    metadataOut = await enrichAssetMetadataWithDimensionsAndSmartUsage({
      ...(row as Asset),
      metadata: next as Json,
    });
  } catch {
    metadataOut = next as Json;
  }

  const { data: updated } = await supabase
    .from("assets")
    .update({ metadata: metadataOut })
    .eq("id", asset.id)
    .select("*")
    .single();
  return (updated as Asset) ?? asset;
}

function buildIngestResult(args: {
  projectId: string;
  pageUrl: string;
  report: WebsiteIngestDebugReport;
  htmlCreated: number;
  htmlCandidates: number;
  prioritized: number;
  capture: {
    attempted: boolean;
    saved: number;
    skippedReason?: string;
    enabled: boolean;
  };
}): IngestWebsiteVisualsResult {
  const { report, htmlCreated, capture } = args;
  const htmlDuplicates = report.duplicates;
  const htmlRejected = report.rejected;
  const componentCaptureSaved = capture.saved;
  const created = htmlCreated + componentCaptureSaved;
  const hadPrioritizedCandidates = args.prioritized > 0;

  report.htmlCandidates = args.htmlCandidates;
  report.prioritized = args.prioritized;
  report.htmlCreated = htmlCreated;
  report.componentCaptureAttempted = capture.attempted;
  report.componentCaptureSaved = componentCaptureSaved;
  report.componentCaptureSkippedReason = capture.skippedReason;
  report.finalAssets = created;

  const reason = resolveWebsiteVisualIngestReason({
    htmlCreated,
    captureSaved: componentCaptureSaved,
    hadPrioritizedCandidates,
    captureEnabled: capture.enabled,
    captureSkippedReason: capture.skippedReason,
  });

  logWebsiteIngestDebugReport(args.projectId, args.pageUrl, report);
  logWebsiteIngestResult(args.projectId, args.pageUrl, {
    htmlCandidates: args.htmlCandidates,
    prioritized: args.prioritized,
    htmlCreated,
    duplicates: htmlDuplicates,
    rejected: htmlRejected,
    reason,
    componentCaptureAttempted: capture.attempted,
    componentCaptureSaved,
    componentCaptureSkippedReason: capture.skippedReason,
  });

  return {
    created,
    htmlCreated,
    htmlDuplicates,
    htmlRejected,
    componentCaptureAttempted: capture.attempted,
    componentCaptureSaved,
    componentCaptureSkippedReason: capture.skippedReason,
    skipped: created === 0,
    reason,
    debugReport: report,
  };
}

async function invokeComponentCaptureFallback(
  projectId: string,
  pageUrl: string,
  deps: IngestWebsiteVisualsDeps,
): Promise<{
  attempted: boolean;
  saved: number;
  skippedReason?: string;
  enabled: boolean;
  tier1Exists: boolean;
  called: boolean;
}> {
  const enabled = isComponentCaptureEnabled();
  const tier1Exists = enabled ? await projectHasTier1ProductVisual(projectId) : false;
  const preSkipReason = !enabled
    ? "disabled"
    : tier1Exists
      ? "tier1_exists"
      : undefined;

  console.info(
    "[component_capture_decision]",
    JSON.stringify({
      projectId,
      url: pageUrl,
      enabled,
      called: enabled && !tier1Exists,
      tier1Exists,
      skippedReason: preSkipReason,
    }),
  );

  const run = deps.runComponentCaptureFallback ?? maybeRunComponentCaptureFallback;
  let result: { attempted: boolean; saved: number; skippedReason?: string };
  try {
    result = await run(projectId, pageUrl);
  } catch {
    result = { attempted: true, saved: 0, skippedReason: "error" };
  }

  console.info(
    "[component_capture_result]",
    JSON.stringify({
      projectId,
      attempted: result.attempted,
      saved: result.saved,
      skippedReason: result.skippedReason,
      error:
        result.attempted && result.saved === 0 ? result.skippedReason : undefined,
    }),
  );

  return {
    ...result,
    enabled,
    tier1Exists,
    called: enabled && !tier1Exists,
  };
}

// Best-effort: fetches the project website HTML, ingests a few images as assets,
// runs vision analysis. NEVER throws — onboarding / knowledge extraction must
// continue when this fails.
export async function ingestWebsiteVisualsBestEffort(
  projectId: string,
  sourceUrl: string,
  deps: IngestWebsiteVisualsDeps = {},
): Promise<IngestWebsiteVisualsResult> {
  const report = createEmptyIngestReport();

  if (!projectId || !sourceUrl?.trim()) {
    return {
      created: 0,
      htmlCreated: 0,
      htmlDuplicates: 0,
      htmlRejected: 0,
      componentCaptureAttempted: false,
      componentCaptureSaved: 0,
      skipped: true,
      reason: "missing_input",
      debugReport: report,
    };
  }

  const pageUrl = normalizeWebsiteUrl(sourceUrl);
  if (!pageUrl) {
    return {
      created: 0,
      htmlCreated: 0,
      htmlDuplicates: 0,
      htmlRejected: 0,
      componentCaptureAttempted: false,
      componentCaptureSaved: 0,
      skipped: true,
      reason: "invalid_url",
      debugReport: report,
    };
  }

  const fetchHtml = deps.fetchWebsiteHtmlImpl ?? fetchWebsiteHtml;
  let html: string;
  try {
    html = await fetchHtml(pageUrl);
  } catch {
    return {
      created: 0,
      htmlCreated: 0,
      htmlDuplicates: 0,
      htmlRejected: 0,
      componentCaptureAttempted: false,
      componentCaptureSaved: 0,
      skipped: true,
      reason: "fetch_html_failed",
      debugReport: report,
    };
  }

  const extracted = extractWebsiteImageCandidates(html, pageUrl);
  const filtered: WebsiteImageCandidate[] = [];
  for (const candidate of extracted) {
    const reason = rejectWebsiteImageCandidate(candidate, {
      title: titleForCandidate(candidate),
    });
    if (reason) {
      report.rejected += 1;
      bumpReportCount(report, "rejectedBreakdown", reason);
      continue;
    }
    filtered.push(candidate);
  }

  const { kept, duplicates } = dedupeWebsiteImageCandidates(filtered);
  report.duplicates += duplicates;

  const prioritized = prioritizeWebsiteImageCandidates(
    kept,
    MAX_DOWNLOAD_ATTEMPTS,
  );

  if (prioritized.length === 0) {
    const capture = await invokeComponentCaptureFallback(projectId, pageUrl, deps);
    return buildIngestResult({
      projectId,
      pageUrl,
      report,
      htmlCreated: 0,
      htmlCandidates: extracted.length,
      prioritized: 0,
      capture,
    });
  }

  const { urls: existingUrls, hashes: existingHashes } =
    await loadExistingIngestKeys(projectId);
  const seenHashes = new Set<string>(existingHashes);
  let htmlCreated = 0;
  const finalRoles: string[] = [];

  for (const candidate of prioritized) {
    if (htmlCreated >= MAX_WEBSITE_INGEST_ASSETS) break;

    const dupReason = isDuplicateOfExisting(
      candidate,
      existingUrls,
      null,
      seenHashes,
    );
    if (dupReason) {
      report.duplicates += 1;
      bumpReportCount(report, "duplicateBreakdown", dupReason);
      continue;
    }

    const downloaded = await downloadImage(candidate.url);
    if (!downloaded) {
      report.rejected += 1;
      bumpReportCount(report, "rejectedBreakdown", "download_failed");
      continue;
    }
    report.downloaded += 1;

    const postReject = rejectDownloadedImage({
      bytes: downloaded.bytes,
      mimeType: downloaded.mimeType,
      candidate,
    });
    if (postReject) {
      report.rejected += 1;
      bumpReportCount(report, "rejectedBreakdown", postReject);
      continue;
    }

    const hash = sha256Hex(downloaded.bytes);
    const hashDup = isDuplicateOfExisting(
      candidate,
      existingUrls,
      hash,
      seenHashes,
    );
    if (hashDup) {
      report.duplicates += 1;
      bumpReportCount(report, "duplicateBreakdown", hashDup);
      continue;
    }

    const asset = await uploadIngestedImage(
      projectId,
      candidate,
      downloaded.bytes,
      downloaded.mimeType,
    );
    if (!asset) {
      report.rejected += 1;
      bumpReportCount(report, "rejectedBreakdown", "upload_failed");
      continue;
    }

    seenHashes.add(hash);
    existingUrls.add(normalizeAssetUrl(candidate.url));

    try {
      if (downloaded.mimeType.includes("svg")) {
        await persistSvgIngestAnalysisFallback(asset, candidate);
      } else {
        await analyzeUploadedAsset(asset);
      }
    } catch {
      // analyzeUploadedAsset should not throw; swallow defensively.
    }

    try {
      const refined = await refineAssetAfterVision(asset.id);
      const meta = (refined?.metadata ?? asset.metadata) as Record<string, unknown>;
      const role = readProductRole(meta as Json);
      finalRoles.push(roleLabel(role));
    } catch {
      finalRoles.push("Other");
    }

    htmlCreated += 1;
  }

  report.finalRoles = finalRoles;

  const capture = await invokeComponentCaptureFallback(projectId, pageUrl, deps);
  return buildIngestResult({
    projectId,
    pageUrl,
    report,
    htmlCreated,
    htmlCandidates: extracted.length,
    prioritized: prioritized.length,
    capture,
  });
}
