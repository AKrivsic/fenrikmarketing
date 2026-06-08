import type { LanguageCode } from "@/lib/supabase/types";

// Resolves the effective language of a content item. A NULL content_items.language
// means "the project's primary language" (projects.language), so callers should
// always resolve through this helper instead of reading the raw column.
export function effectiveLanguage(
  itemLanguage: LanguageCode | null | undefined,
  projectLanguage: LanguageCode,
): LanguageCode {
  return itemLanguage ?? projectLanguage;
}
