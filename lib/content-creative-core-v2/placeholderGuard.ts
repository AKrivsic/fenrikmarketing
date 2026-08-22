/**
 * Guards against Step 2 transitional placeholders leaking into publishable content.
 */

import { PENDING_STEP_3_PLACEHOLDER_PREFIX } from "@/lib/content-creative-core-v2/derivedOutputsTypes";

export function isPendingStep3Placeholder(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.trim().startsWith(PENDING_STEP_3_PLACEHOLDER_PREFIX);
}

export function textContainsPendingPlaceholder(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.includes(PENDING_STEP_3_PLACEHOLDER_PREFIX);
}

export function platformOutputsContainPlaceholders(
  platformOutputs: unknown,
): boolean {
  if (!platformOutputs || typeof platformOutputs !== "object") return false;
  for (const value of Object.values(platformOutputs as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    if (isPendingStep3Placeholder(row.caption)) return true;
    if (textContainsPendingPlaceholder(row.caption)) return true;
    if (textContainsPendingPlaceholder(row.title)) return true;
    if (textContainsPendingPlaceholder(row.description)) return true;
    if (Array.isArray(row.caption_variants)) {
      if (row.caption_variants.some((v) => isPendingStep3Placeholder(v))) {
        return true;
      }
    }
  }
  return false;
}

export function assertNoPlaceholdersInPersistableCaptions(
  captions: readonly string[],
): { ok: true } | { ok: false; error: string } {
  for (const caption of captions) {
    if (isPendingStep3Placeholder(caption) || textContainsPendingPlaceholder(caption)) {
      return {
        ok: false,
        error: "pending_step_3_placeholder_not_persistable",
      };
    }
  }
  return { ok: true };
}
