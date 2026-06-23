import type { GenerateLanguageVariantsForItemSummary } from "@/lib/ai/workflows/generateLanguageVariants";

export function formatCompletedWithoutVariantError(
  summary: GenerateLanguageVariantsForItemSummary,
): string {
  const detail =
    summary.warnings.length > 0
      ? summary.warnings.join("; ")
      : "no variant content_item created";
  const msg = `completed_without_variant_content_item: ${detail}`;
  return msg.slice(0, 500);
}
