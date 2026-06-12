import type { SupabaseClient } from "@supabase/supabase-js";
import {
  allItemsApproved,
  canGenerateItemVariants,
  resolveTargetLanguages,
} from "@/lib/ai/workflows/languageVariantsHelpers";
import type { ApprovalStatus, Json, LanguageCode } from "@/lib/supabase/types";

// Shared package eligibility for language-variant generation, previously inline
// in review-queue.ts and now reused by the project review surface too. A package
// qualifies (package-level) when ALL its primary items are approved, it has NO
// variants yet, and the owning project has at least one target language.
//
// ITEM-LEVEL eligibility (qualifiesItem) is independent of other items in the
// same package: a single approved primary item is eligible as soon as the
// project has target languages still missing a variant for THAT item. This lets
// an approved TikTok item localize even while sibling X items are still draft.
//
// Service-role admin client is passed in by the caller (single-tenant MVP, RLS
// bypassed, server-only).

// Reads generation_metadata.source_content_item_id from a content_items blob.
function readSourceContentItemId(metadata: Json | null): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).source_content_item_id;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export interface VariantEligibility {
  // True when the package may generate language variants for the given project
  // (package-level: every primary item approved, no variants yet).
  qualifies(projectId: string, packageId: string | null): boolean;
  // True when a SINGLE approved primary item may generate language variants,
  // regardless of sibling items' statuses.
  qualifiesItem(
    projectId: string,
    item: {
      id: string;
      language: LanguageCode | null;
      status: ApprovalStatus;
    },
  ): boolean;
  // Primary language per project, derived from the same projects read used for
  // gating. Lets callers resolve NULL item languages for badges without a second
  // projects query.
  projectLanguageById: Map<string, LanguageCode>;
}

export async function loadVariantEligibility(
  supabase: SupabaseClient,
  packageIds: string[],
  projectIds: string[],
): Promise<VariantEligibility> {
  // Per-package scan: collect primary item statuses and whether variants exist.
  const primaryStatusesByPackage = new Map<string, ApprovalStatus[]>();
  const hasVariantsByPackage = new Map<string, boolean>();
  // Item-level: languages already localized for each source (primary) item id,
  // resolved from each variant row's generation_metadata.source_content_item_id.
  const coveredLanguagesByItem = new Map<string, Set<LanguageCode>>();

  if (packageIds.length > 0) {
    const { data, error } = await supabase
      .from("content_items")
      .select("package_id, language, status, generation_metadata")
      .in("package_id", packageIds);
    if (error) throw error;

    for (const row of (data ?? []) as {
      package_id: string | null;
      language: LanguageCode | null;
      status: ApprovalStatus;
      generation_metadata: Json | null;
    }[]) {
      if (!row.package_id) continue;
      if (row.language === null) {
        const list = primaryStatusesByPackage.get(row.package_id) ?? [];
        list.push(row.status);
        primaryStatusesByPackage.set(row.package_id, list);
      } else {
        hasVariantsByPackage.set(row.package_id, true);
        const sourceId = readSourceContentItemId(row.generation_metadata);
        if (sourceId) {
          const langs = coveredLanguagesByItem.get(sourceId) ?? new Set();
          langs.add(row.language);
          coveredLanguagesByItem.set(sourceId, langs);
        }
      }
    }
  }

  // Per-project scan: primary language + resolved variant target languages.
  const projectLanguageById = new Map<string, LanguageCode>();
  const projectTargetsById = new Map<string, LanguageCode[]>();

  if (projectIds.length > 0) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, language, enabled_languages")
      .in("id", projectIds);
    if (error) throw error;

    for (const row of (data ?? []) as {
      id: string;
      language: LanguageCode;
      enabled_languages: LanguageCode[] | null;
    }[]) {
      projectLanguageById.set(row.id, row.language);
      projectTargetsById.set(
        row.id,
        resolveTargetLanguages(row.language, row.enabled_languages ?? []),
      );
    }
  }

  return {
    qualifies(projectId, packageId) {
      if (!packageId) return false;
      if (!allItemsApproved(primaryStatusesByPackage.get(packageId) ?? [])) {
        return false;
      }
      if (hasVariantsByPackage.get(packageId)) return false;
      return (projectTargetsById.get(projectId) ?? []).length > 0;
    },
    qualifiesItem(projectId, item) {
      return canGenerateItemVariants({
        itemLanguage: item.language,
        itemStatus: item.status,
        targetLanguages: projectTargetsById.get(projectId) ?? [],
        coveredLanguages: coveredLanguagesByItem.get(item.id) ?? [],
      });
    },
    projectLanguageById,
  };
}
