import type { AssetAnalysisStatus } from "@/lib/assets/analysis";
import {
  CAPTURE_VIEWPORT_LABELS,
  VIDEO_USAGE_ADMIN_HINTS,
  VIDEO_USAGE_ADMIN_LABELS,
  type CaptureViewportEditValue,
} from "@/lib/assets/assetAdminOptions";
import {
  isVideoUsageRenderMode,
  type VideoUsageRenderMode,
} from "@/lib/assets/preferredVideoUsage";
import type { AssetOrientation, VideoSuitability } from "@/lib/assets/smartUsageMetadata";

export function formatPreferredVideoUsageLabel(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  if (isVideoUsageRenderMode(value)) {
    return VIDEO_USAGE_ADMIN_LABELS[value];
  }
  return null;
}

export function formatCaptureViewportLabel(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  const key = value as CaptureViewportEditValue;
  return CAPTURE_VIEWPORT_LABELS[key] ?? null;
}

const ANALYSIS_STATUS_LABELS: Record<AssetAnalysisStatus, string> = {
  completed: "Dokončeno",
  skipped: "Přeskočeno",
  failed: "Selhalo",
};

export function formatAnalysisStatusLabel(
  status: AssetAnalysisStatus | null | undefined,
): string | null {
  if (!status) return null;
  return ANALYSIS_STATUS_LABELS[status] ?? null;
}

const ORIENTATION_LABELS: Record<AssetOrientation, string> = {
  portrait: "Na výšku",
  landscape: "Na šířku",
  square: "Čtverec",
  unknown: "Neznámá",
};

export function formatOrientationLabel(
  orientation: AssetOrientation | null | undefined,
): string | null {
  if (!orientation) return null;
  return ORIENTATION_LABELS[orientation] ?? null;
}

const VIDEO_SUITABILITY_LABELS: Record<VideoSuitability, string> = {
  primary_scene: "Hlavní scéna",
  screen_insert: "Vložka obrazovky",
  end_card: "Závěrečná karta",
  branding_prop: "Branding",
  background_only: "Pouze pozadí",
  avoid_fullscreen: "Bez fullscreen",
  unknown: "Neznámé",
};

export function formatVideoSuitabilityLabel(
  value: VideoSuitability | null | undefined,
): string | null {
  if (!value) return null;
  return VIDEO_SUITABILITY_LABELS[value] ?? null;
}

const ASSET_QUALITY_LABELS: Record<string, string> = {
  high: "Vysoká",
  medium: "Střední",
  low: "Nízká",
};

export function formatAssetQualityLabel(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  return ASSET_QUALITY_LABELS[value] ?? null;
}

export function formatTechnicalDisplayValue(
  raw: string | null | undefined,
  label: string | null,
): string {
  if (label?.trim()) return label;
  if (raw?.trim()) return raw;
  return "—";
}

export function preferredVideoUsageHintForMode(args: {
  mode: "automatic" | "manual";
  computedUsage: string;
  manualUsage: string;
}): string {
  if (args.mode === "automatic") {
    const label =
      formatPreferredVideoUsageLabel(args.computedUsage) ?? args.computedUsage;
    return `Systém aktuálně počítá: ${label}.`;
  }
  const key = args.manualUsage as VideoUsageRenderMode;
  if (isVideoUsageRenderMode(key)) {
    return VIDEO_USAGE_ADMIN_HINTS[key];
  }
  return "";
}
