/**
 * Legacy stored packages may still contain typed PRODUCT_DEMO scenes.
 * Downgrade to AI stills at normalize — PPD is the only presentation runtime.
 */

import type { VisualSceneAi } from "@/lib/content-package/visualScenePlan";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function isLegacyProductDemoSceneEntry(entry: unknown): boolean {
  const r = asRecord(entry);
  return String(r?.type ?? "").toUpperCase() === "PRODUCT_DEMO";
}

export function downgradeLegacyProductDemoToAiImage(
  entry: unknown,
): VisualSceneAi | null {
  const r = asRecord(entry);
  if (!r) return null;
  const payload = asRecord(r.payload) ?? r;
  const parts: string[] = [];
  for (const key of [
    "visitor_question",
    "ai_answer",
    "outcome_label",
    "outcome_type",
  ]) {
    const v = payload[key];
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  }
  const prompt =
    parts.length > 0
      ? `Product value on screen: ${parts.join(". ")}`.slice(0, 4000)
      : "Product interaction and visible outcome on screen.";
  return { source: "ai", image_prompt: prompt };
}
