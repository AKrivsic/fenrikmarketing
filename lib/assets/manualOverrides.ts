import type { Json } from "@/lib/supabase/types";

export const MANUAL_OVERRIDE_FIELDS = [
  "ai_description",
  "suggested_usage",
  "capture_viewport",
  "preferred_video_usage",
  "device_frame_in_asset",
] as const;

export type ManualOverrideField = (typeof MANUAL_OVERRIDE_FIELDS)[number];

export type ManualOverridesMap = Partial<Record<ManualOverrideField, boolean>>;

function metadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

export function readManualOverrides(metadata: unknown): ManualOverridesMap {
  const record = metadataRecord(metadata);
  if (!record) return {};
  const raw = record.manual_overrides;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: ManualOverridesMap = {};
  for (const field of MANUAL_OVERRIDE_FIELDS) {
    if ((raw as Record<string, unknown>)[field] === true) {
      out[field] = true;
    }
  }
  return out;
}

export function isManualOverride(
  metadata: unknown,
  field: ManualOverrideField,
): boolean {
  return readManualOverrides(metadata)[field] === true;
}

export function withManualOverride(
  metadata: Record<string, unknown>,
  field: ManualOverrideField,
  locked: boolean,
): Record<string, unknown> {
  const next = { ...metadata };
  const prior = readManualOverrides(next);
  const overrides: ManualOverridesMap = { ...prior };
  if (locked) {
    overrides[field] = true;
  } else {
    delete overrides[field];
  }
  if (Object.keys(overrides).length === 0) {
    delete next.manual_overrides;
  } else {
    next.manual_overrides = overrides;
  }
  return next;
}

export function stripManualOverrideFieldsFromPatch(
  metadata: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const overrides = readManualOverrides(metadata);
  const out = { ...patch };
  for (const field of MANUAL_OVERRIDE_FIELDS) {
    if (overrides[field] === true && field in out) {
      delete out[field];
    }
  }
  return out;
}

export function mergeManualOverridesIntoMetadata(
  existing: Json,
  overrides: ManualOverridesMap,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const merged: ManualOverridesMap = {
    ...readManualOverrides(base),
    ...overrides,
  };
  for (const key of Object.keys(merged) as ManualOverrideField[]) {
    if (merged[key] !== true) delete merged[key];
  }
  if (Object.keys(merged).length === 0) {
    delete base.manual_overrides;
  } else {
    base.manual_overrides = merged;
  }
  return base;
}
