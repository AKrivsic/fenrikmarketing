import type { Json } from "@/lib/supabase/types";
import {
  isCaptureViewportEditValue,
  isVideoUsageRenderValue,
} from "@/lib/assets/assetAdminOptions";
import {
  enrichMetadataWithDeviceFrameDetection,
} from "@/lib/assets/deviceFrameMetadata";
import {
  type ManualOverrideField,
  withManualOverride,
} from "@/lib/assets/manualOverrides";

export type TextFieldEditMode = "automatic" | "manual";

export interface AssetMetadataTextFieldUpdate {
  mode: TextFieldEditMode;
  /** Only used when mode is manual (may be empty string). */
  value?: string;
}

export type CaptureViewportUpdate =
  | { mode: "automatic" }
  | { mode: "manual"; value: string };

export type PreferredVideoUsageUpdate =
  | { mode: "automatic" }
  | { mode: "manual"; value: string };

export type DeviceFrameInAssetUpdate =
  | { mode: "automatic" }
  | { mode: "manual"; value: "yes" | "no" };

export interface ApplyAssetMetadataUpdateInput {
  aiDescription?: AssetMetadataTextFieldUpdate;
  suggestedUsage?: AssetMetadataTextFieldUpdate;
  captureViewport?: CaptureViewportUpdate;
  preferredVideoUsage?: PreferredVideoUsageUpdate;
  deviceFrameInAsset?: DeviceFrameInAssetUpdate;
}

export type AssetMetadataUpdateValidationError = {
  field: string;
  message: string;
};

function baseRecord(existing: Json): Record<string, unknown> {
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return { ...(existing as Record<string, unknown>) };
  }
  return {};
}

function applyTextField(
  meta: Record<string, unknown>,
  key: ManualOverrideField,
  update: AssetMetadataTextFieldUpdate | undefined,
): Record<string, unknown> {
  if (!update) return meta;
  let next = { ...meta };
  if (update.mode === "automatic") {
    next = withManualOverride(next, key, false);
    return next;
  }
  next[key] = update.value ?? "";
  next = withManualOverride(next, key, true);
  return next;
}

function applyCaptureViewport(
  meta: Record<string, unknown>,
  update: CaptureViewportUpdate | undefined,
): Record<string, unknown> {
  if (!update) return meta;
  let next = { ...meta };
  if (update.mode === "automatic") {
    delete next.capture_viewport;
    next = withManualOverride(next, "capture_viewport", false);
    return next;
  }
  if (!isCaptureViewportEditValue(update.value)) {
    return next;
  }
  next.capture_viewport = update.value;
  next = withManualOverride(next, "capture_viewport", true);
  return next;
}

function applyPreferredVideoUsage(
  meta: Record<string, unknown>,
  update: PreferredVideoUsageUpdate | undefined,
): {
  meta: Record<string, unknown>;
  error: AssetMetadataUpdateValidationError | null;
} {
  if (!update) return { meta, error: null };
  let next = { ...meta };
  if (update.mode === "automatic") {
    delete next.preferred_video_usage;
    next = withManualOverride(next, "preferred_video_usage", false);
    return { meta: next, error: null };
  }
  if (!isVideoUsageRenderValue(update.value)) {
    return {
      meta,
      error: {
        field: "preferredVideoUsage",
        message: "Neplatná hodnota preferred video usage.",
      },
    };
  }
  next.preferred_video_usage = update.value;
  next = withManualOverride(next, "preferred_video_usage", true);
  return { meta: next, error: null };
}

function applyDeviceFrameInAsset(
  meta: Record<string, unknown>,
  update: DeviceFrameInAssetUpdate | undefined,
): Record<string, unknown> {
  if (!update) return meta;
  let next = { ...meta };
  if (update.mode === "automatic") {
    delete next.device_frame_in_asset;
    next = withManualOverride(next, "device_frame_in_asset", false);
    return enrichMetadataWithDeviceFrameDetection(next as Json) as Record<
      string,
      unknown
    >;
  }
  next.device_frame_in_asset = update.value;
  next = withManualOverride(next, "device_frame_in_asset", true);
  return enrichMetadataWithDeviceFrameDetection(next as Json) as Record<
    string,
    unknown
  >;
}

// Merges admin metadata edits into existing jsonb. Does not touch unrelated keys.
export function applyAssetMetadataUpdate(
  existing: Json,
  input: ApplyAssetMetadataUpdateInput,
): { metadata: Record<string, unknown>; error: AssetMetadataUpdateValidationError | null } {
  let meta = baseRecord(existing);

  meta = applyTextField(meta, "ai_description", input.aiDescription);
  meta = applyTextField(meta, "suggested_usage", input.suggestedUsage);
  meta = applyCaptureViewport(meta, input.captureViewport);

  const preferred = applyPreferredVideoUsage(meta, input.preferredVideoUsage);
  if (preferred.error) {
    return { metadata: meta, error: preferred.error };
  }
  meta = preferred.meta;

  meta = applyDeviceFrameInAsset(meta, input.deviceFrameInAsset);

  return { metadata: meta, error: null };
}

export function mergeAssetMetadataForSave(
  existing: Json,
  input: ApplyAssetMetadataUpdateInput,
): { metadata: Json; error: AssetMetadataUpdateValidationError | null } {
  const { metadata, error } = applyAssetMetadataUpdate(existing, input);
  if (error) return { metadata: existing, error };
  return { metadata: metadata as Json, error: null };
}
