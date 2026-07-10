import type { AssetClass } from "@/lib/ai/guardrails";
import type { Json } from "@/lib/supabase/types";
import {
  MANUAL_OVERRIDE_FIELDS,
  readManualOverrides,
} from "@/lib/assets/manualOverrides";

// Phase 2B — lightweight AI analysis stored INSIDE assets.metadata (no new
// columns, no new tables). The user-chosen metadata.asset_class is never
// overwritten; the AI's opinion is kept separately as suggested_asset_class.

export type AssetAnalysisStatus = "completed" | "skipped" | "failed";

export interface AssetAnalysisMetadata {
  ai_description: string | null;
  detected_content_type: string | null;
  suggested_usage: string | null;
  suggested_asset_class: AssetClass | null;
  extracted_text: string | null;
  trust_signal: boolean;
  analyzed_at: string;
  analysis_status: AssetAnalysisStatus;
}

// Merges the analysis fields into the existing metadata object, preserving every
// existing key (notably asset_class). Returns a plain record suitable for a
// jsonb column update.
export function mergeAssetAnalysis(
  existing: Json,
  analysis: AssetAnalysisMetadata,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const overrides = readManualOverrides(base);
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(analysis) as [
    keyof AssetAnalysisMetadata,
    AssetAnalysisMetadata[keyof AssetAnalysisMetadata],
  ][]) {
    if (
      (MANUAL_OVERRIDE_FIELDS as readonly string[]).includes(key) &&
      overrides[key as (typeof MANUAL_OVERRIDE_FIELDS)[number]] === true
    ) {
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

// A minimal "not analyzed / failed" block used when analysis is skipped or
// errors out, so the asset always carries a deterministic analysis state.
export function fallbackAnalysis(
  status: AssetAnalysisStatus,
  description: string | null = null,
): AssetAnalysisMetadata {
  return {
    ai_description: description,
    detected_content_type: null,
    suggested_usage: null,
    suggested_asset_class: null,
    extracted_text: null,
    trust_signal: false,
    analyzed_at: new Date().toISOString(),
    analysis_status: status,
  };
}

// Defensive reader for the UI / read models. Returns null when no analysis has
// been stored yet.
export interface AssetAnalysisView {
  aiDescription: string | null;
  suggestedUsage: string | null;
  trustSignal: boolean;
  analysisStatus: AssetAnalysisStatus | null;
}

export function readAssetAnalysis(metadata: Json): AssetAnalysisView | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const record = metadata as Record<string, unknown>;
  const status = record.analysis_status;
  if (typeof status !== "string") return null;

  return {
    aiDescription:
      typeof record.ai_description === "string" ? record.ai_description : null,
    suggestedUsage:
      typeof record.suggested_usage === "string" ? record.suggested_usage : null,
    trustSignal: record.trust_signal === true,
    analysisStatus:
      status === "completed" || status === "skipped" || status === "failed"
        ? status
        : null,
  };
}
