import type { SupabaseClient } from "@supabase/supabase-js";
import {
  allItemsApproved,
  resolveTargetLanguages,
} from "@/lib/ai/workflows/languageVariantsHelpers";
import type { ApprovalStatus, LanguageCode } from "@/lib/supabase/types";

// Shared package eligibility for language-variant generation, previously inline
// in review-queue.ts and now reused by the project review surface too. A package
// qualifies when ALL its primary items are approved, it has NO variants yet, and
// the owning project has at least one target language. Service-role admin client
// is passed in by the caller (single-tenant MVP, RLS bypassed, server-only).

export interface VariantEligibility {
  // True when the package may generate language variants for the given project.
  qualifies(projectId: string, packageId: string | null): boolean;
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

  if (packageIds.length > 0) {
    const { data, error } = await supabase
      .from("content_items")
      .select("package_id, language, status")
      .in("package_id", packageIds);
    if (error) throw error;

    for (const row of (data ?? []) as {
      package_id: string | null;
      language: LanguageCode | null;
      status: ApprovalStatus;
    }[]) {
      if (!row.package_id) continue;
      if (row.language === null) {
        const list = primaryStatusesByPackage.get(row.package_id) ?? [];
        list.push(row.status);
        primaryStatusesByPackage.set(row.package_id, list);
      } else {
        hasVariantsByPackage.set(row.package_id, true);
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
    projectLanguageById,
  };
}
