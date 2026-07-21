import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Asset, Json, MediaType } from "@/lib/supabase/types";
import type { AssetClass } from "@/lib/ai/guardrails";
import type { TextProvider } from "@/lib/ai/types";
import { getCopywritingProvider, getVisionProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  ANALYZE_ASSET_SYSTEM,
  buildAnalyzeAssetPrompt,
} from "@/lib/ai/prompts/analyzeAsset";
import {
  analyzeAssetSchema,
  type AnalyzeAssetOutput,
} from "@/lib/ai/schemas/analyzeAsset";
import { WorkflowError, type WorkflowResult } from "@/lib/ai/workflows/shared";
import { extractAndPersistProofStatements } from "@/lib/ai/workflows/extractProofStatements";
import {
  fallbackAnalysis,
  mergeAssetAnalysis,
  type AssetAnalysisMetadata,
} from "@/lib/assets/analysis";
import { readImageDimensions } from "@/lib/knowledge/websiteImageRejectHeuristics";
import {
  inferProductRoleFromSignals,
  readProductRoleLocked,
  shouldApplyInferredProductRole,
} from "@/lib/assets/inferProductRoleFromSignals";
import { inferCaptureViewport } from "@/lib/assets/inferCaptureViewport";
import { enrichMetadataWithDeviceFrameDetection } from "@/lib/assets/deviceFrameMetadata";
import { stampDefaultPresentationTemplate } from "@/lib/assets/presentationTemplate";
import { readProductRole, type ProductRole } from "@/lib/assets/productRole";
import {
  mergeSmartUsageIntoMetadata,
  smartUsageFromAssetMetadata,
} from "@/lib/assets/smartUsageMetadata";
import { stampProductPresentationAssetMetadata } from "@/lib/assets/productPresentationMetadata";

const SIGNED_URL_TTL_SECONDS = 600;
const MAX_TEXT_LENGTH = 8_000;

export interface AnalyzeAssetContentInput {
  title: string;
  mediaType: MediaType;
  mimeType: string | null;
  assetClass: AssetClass;
  // Provide exactly one source: a signed image URL (vision) OR file text.
  imageUrl?: string;
  text?: string;
}

// Pure AI step (no DB): runs the validated-JSON loop using the vision provider
// for images or the text (copywriting) provider for readable files. Mirrors the
// existing workflow pattern.
export async function runAnalyzeAssetContent(
  input: AnalyzeAssetContentInput,
): Promise<WorkflowResult<AnalyzeAssetOutput>> {
  const { title, mediaType, mimeType, assetClass, imageUrl, text } = input;

  if (!imageUrl && typeof text !== "string") {
    throw new WorkflowError(
      "invalid_input",
      "analyzeAsset requires an image URL or file text",
    );
  }

  const prompt = buildAnalyzeAssetPrompt({
    title,
    mediaType,
    mimeType,
    assetClass,
    // text is omitted for the image path so the prompt references the attachment.
    ...(imageUrl ? {} : { text: text ?? "" }),
  });

  // For images, wrap the vision provider in a TextProvider so the shared
  // generateValidatedJson loop (parse + repair + retry) can be reused.
  const textProvider: TextProvider = imageUrl
    ? {
        name: "openai-vision",
        complete: (req) =>
          getVisionProvider().analyzeImage({
            system: req.system,
            prompt: req.prompt,
            imageUrl,
            json: req.json,
            temperature: req.temperature,
          }),
      }
    : getCopywritingProvider();

  const generated = await generateValidatedJson({
    textProvider,
    system: ANALYZE_ASSET_SYSTEM,
    prompt,
    validator: analyzeAssetSchema,
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
    };
  }

  return { ok: true, data: generated.value };
}

// Files whose text can be read directly without any OCR/parsing dependency.
function isTextReadableMime(mime: string | null): boolean {
  if (!mime) return false;
  return (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/csv"
  );
}

function toAnalysisMetadata(output: AnalyzeAssetOutput): AssetAnalysisMetadata {
  return {
    ai_description: output.ai_description || null,
    detected_content_type: output.detected_content_type || null,
    suggested_usage: output.suggested_usage || null,
    suggested_asset_class: output.suggested_asset_class,
    extracted_text: output.extracted_text || null,
    trust_signal: output.trust_signal,
    analyzed_at: new Date().toISOString(),
    analysis_status: "completed",
  };
}

// Orchestration triggered after upload. Analyzes the asset (vision for images,
// text for readable files, skip otherwise) and persists the result into
// assets.metadata, preserving the existing asset_class. NEVER throws: any
// failure is recorded as analysis_status "failed" so the upload stays valid and
// the UI cannot crash.
export async function analyzeUploadedAsset(asset: Asset): Promise<void> {
  const assetClass = readAssetClass(asset);

  let analysis: AssetAnalysisMetadata;
  try {
    analysis = await computeAnalysis(asset, assetClass);
  } catch {
    analysis = fallbackAnalysis("failed");
  }

  const mergedMetadata = mergeAssetAnalysis(asset.metadata, analysis);
  let withSmartUsage: Json;
  try {
    withSmartUsage = await enrichAssetMetadataWithDimensionsAndSmartUsage({
      ...asset,
      metadata: mergedMetadata as Json,
    });
  } catch {
    withSmartUsage = mergedMetadata as Json;
  }
  try {
    const supabase = createSupabaseAdminClient();
    await supabase
      .from("assets")
      .update({ metadata: withSmartUsage })
      .eq("id", asset.id);
  } catch {
    // Persisting analysis is best-effort; the upload itself already succeeded.
  }

  // Task 3 — Proof Intelligence trigger. Only trust/proof assets feed the Proof
  // pool; everything else is a no-op. extractAndPersistProofStatements never
  // throws, so a failed extraction cannot break asset analysis or the upload.
  if (analysis.trust_signal) {
    await extractAndPersistProofStatements({
      ...asset,
      metadata: withSmartUsage,
    });
  }
}

function readAssetClass(asset: Asset): AssetClass {
  const metadata = asset.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const value = (metadata as Record<string, unknown>).asset_class;
    if (value === "static" || value === "editable" || value === "reference") {
      return value;
    }
  }
  return "static";
}

async function computeAnalysis(
  asset: Asset,
  assetClass: AssetClass,
): Promise<AssetAnalysisMetadata> {
  if (!asset.storage_bucket || !asset.storage_path) {
    return fallbackAnalysis("skipped", "Not analyzed");
  }

  const supabase = createSupabaseAdminClient();

  if (asset.media_type === "image") {
    const { data, error } = await supabase.storage
      .from(asset.storage_bucket)
      .createSignedUrl(asset.storage_path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      return fallbackAnalysis("failed");
    }
    const result = await runAnalyzeAssetContent({
      title: asset.title,
      mediaType: asset.media_type,
      mimeType: asset.mime_type,
      assetClass,
      imageUrl: data.signedUrl,
    });
    return result.ok
      ? toAnalysisMetadata(result.data)
      : fallbackAnalysis("failed");
  }

  if (isTextReadableMime(asset.mime_type)) {
    const { data, error } = await supabase.storage
      .from(asset.storage_bucket)
      .download(asset.storage_path);
    if (error || !data) {
      return fallbackAnalysis("failed");
    }
    const text = (await data.text()).slice(0, MAX_TEXT_LENGTH);
    const result = await runAnalyzeAssetContent({
      title: asset.title,
      mediaType: asset.media_type,
      mimeType: asset.mime_type,
      assetClass,
      text,
    });
    return result.ok
      ? toAnalysisMetadata(result.data)
      : fallbackAnalysis("failed");
  }

  // Non-image, non-readable (e.g. PDF/binary) — skipped, no OCR dependency.
  return fallbackAnalysis("skipped", "Not analyzed");
}

async function tryReadImageDimensionsFromStorage(
  asset: Asset,
): Promise<{ width: number; height: number } | null> {
  if (!asset.storage_bucket || !asset.storage_path) return null;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(asset.storage_bucket)
    .download(asset.storage_path);
  if (error || !data) return null;
  const bytes = new Uint8Array(await data.arrayBuffer());
  return readImageDimensions(bytes, asset.mime_type ?? "") ?? null;
}

export async function enrichAssetMetadataWithDimensionsAndSmartUsage(
  asset: Asset,
): Promise<Json> {
  let metadata = asset.metadata;
  let record =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  if (
    asset.media_type === "image" &&
    (typeof record.width !== "number" || typeof record.height !== "number")
  ) {
    const dims = await tryReadImageDimensionsFromStorage(asset);
    if (dims) {
      record.width = dims.width;
      record.height = dims.height;
      record.resolution = dims.width * dims.height;
      metadata = record as Json;
    }
  }

  record = applyInferredProductRoleIfAllowed(record, asset.title);

  const analysisView = {
    detected_content_type:
      typeof record.detected_content_type === "string"
        ? record.detected_content_type
        : null,
    ai_description:
      typeof record.ai_description === "string" ? record.ai_description : null,
  };
  const smart = smartUsageFromAssetMetadata(record as Json, {
    width: typeof record.width === "number" ? record.width : null,
    height: typeof record.height === "number" ? record.height : null,
    mimeType: asset.mime_type,
    productRole: readProductRole(record),
    title: asset.title,
    detectedContentType: analysisView.detected_content_type,
    aiDescription: analysisView.ai_description,
    ingestKind:
      (record.ingest_kind as import("@/lib/knowledge/extractWebsiteImageCandidates").WebsiteImageCandidateKind) ??
      null,
    sourceUrl: typeof record.source_url === "string" ? record.source_url : null,
    source:
      record.source === "website_ingestion"
        ? "website_ingestion"
        : record.source === "component_capture"
          ? "component_capture"
          : "upload",
  });
  let merged: Record<string, unknown> = {
    ...(mergeSmartUsageIntoMetadata(record as Json, smart) as Record<string, unknown>),
  };

  const inferredViewport = inferCaptureViewport({
    metadata: merged,
    smart,
    title: asset.title,
  });
  if (inferredViewport) {
    merged = { ...merged, capture_viewport: inferredViewport };
  }

  merged = enrichMetadataWithDeviceFrameDetection(
    merged as Json,
    asset.title,
  ) as unknown as Record<string, unknown>;
  merged = stampDefaultPresentationTemplate(
    merged as Json,
  ) as unknown as Record<string, unknown>;

  // Wave 2 — provenance / authenticity for PPD (library-time; generation only reads).
  merged = stampProductPresentationAssetMetadata(merged, {
    sourceHint:
      typeof merged.source === "string" ? merged.source : "upload",
  });

  return merged as Json;
}

/** Applies vision/heuristic product_role when upload did not lock a role. */
export function applyInferredProductRoleIfAllowed(
  record: Record<string, unknown>,
  title: string,
): Record<string, unknown> {
  if (readProductRoleLocked(record)) return record;
  if (readProductRole(record)) return record;

  const inference = inferProductRoleFromSignals({
    kind: undefined,
    url: typeof record.source_url === "string" ? record.source_url : "",
    alt: null,
    title,
    vision: {
      detected_content_type:
        typeof record.detected_content_type === "string"
          ? record.detected_content_type
          : null,
      ai_description:
        typeof record.ai_description === "string" ? record.ai_description : null,
    },
  });

  if (!shouldApplyInferredProductRole(inference, false) || !inference.role) {
    return record;
  }
  const next = { ...record, product_role: inference.role as ProductRole };
  return next;
}
