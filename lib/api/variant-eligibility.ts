import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canGenerateItemVariants,
  isVideoPlatform,
  resolveTargetLanguages,
} from "@/lib/ai/workflows/languageVariantsHelpers";
import type {
  ApprovalStatus,
  Json,
  LanguageCode,
  PlatformType,
} from "@/lib/supabase/types";

// Shared package eligibility for language-variant generation, previously inline
// in review-queue.ts and now reused by the project review surface too.
//
// Review UX V2 — product rule: translations target ONLY video platforms
// (TikTok / Instagram / YouTube / Facebook). A package qualifies (package-level)
// when at least one of its APPROVED VIDEO-PLATFORM primary items still has a
// target language without a variant — i.e. there is real translation work left.
// This mirrors the package-level workflow, which delegates per approved video
// item, so the button stays visible while any approved video platform still
// needs a language and hides once they are all fully translated. Draft / pending
// text-only platforms (LinkedIn, X, Google Business) NEVER block translation.
//
// ITEM-LEVEL eligibility (qualifiesItem) is independent of other items in the
// same package and is likewise restricted to video platforms: a single approved
// video-platform primary item is eligible as soon as the project has target
// languages still missing a variant for THAT item.
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
  // (package-level: every VIDEO-PLATFORM primary item approved, no variants
  // yet). Text-only platforms (LinkedIn / X / Google Business) are ignored.
  qualifies(projectId: string, packageId: string | null): boolean;
  // True when a SINGLE approved VIDEO-PLATFORM primary item may generate
  // language variants, regardless of sibling items' statuses.
  qualifiesItem(
    projectId: string,
    item: {
      id: string;
      language: LanguageCode | null;
      status: ApprovalStatus;
      platform: PlatformType;
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
  // Per-package scan: collect VIDEO-PLATFORM primary items (text-only platforms
  // never gate translation) so package-level eligibility can be evaluated as
  // "any approved video primary still needs a language".
  interface VideoPrimaryItem {
    id: string;
    platform: PlatformType;
    language: LanguageCode | null;
    status: ApprovalStatus;
  }
  const videoPrimaryItemsByPackage = new Map<string, VideoPrimaryItem[]>();
  // Item-level: languages already localized for each source (primary) item id,
  // resolved from each variant row's generation_metadata.source_content_item_id.
  const coveredLanguagesByItem = new Map<string, Set<LanguageCode>>();

  if (packageIds.length > 0) {
    const { data, error } = await supabase
      .from("content_items")
      .select("id, package_id, platform, language, status, generation_metadata")
      .in("package_id", packageIds);
    if (error) throw error;

    for (const row of (data ?? []) as {
      id: string;
      package_id: string | null;
      platform: PlatformType;
      language: LanguageCode | null;
      status: ApprovalStatus;
      generation_metadata: Json | null;
    }[]) {
      if (!row.package_id) continue;
      if (row.language === null) {
        // Only video-platform primaries count toward translation eligibility.
        if (!isVideoPlatform(row.platform)) continue;
        const list = videoPrimaryItemsByPackage.get(row.package_id) ?? [];
        list.push({
          id: row.id,
          platform: row.platform,
          language: row.language,
          status: row.status,
        });
        videoPrimaryItemsByPackage.set(row.package_id, list);
      } else {
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

  // Shared item-level check: a single approved VIDEO-PLATFORM primary item with
  // at least one target language still missing a variant. Reused by the
  // package-level gate so both stay perfectly in sync.
  const qualifiesItem: VariantEligibility["qualifiesItem"] = (projectId, item) => {
    if (!isVideoPlatform(item.platform)) return false;
    return canGenerateItemVariants({
      itemLanguage: item.language,
      itemStatus: item.status,
      targetLanguages: projectTargetsById.get(projectId) ?? [],
      coveredLanguages: coveredLanguagesByItem.get(item.id) ?? [],
    });
  };

  return {
    qualifies(projectId, packageId) {
      if (!packageId) return false;
      // Eligible while ANY approved video-platform primary still needs a
      // language; hidden once every approved video platform is fully
      // translated (and never gated by text-only platforms).
      const items = videoPrimaryItemsByPackage.get(packageId) ?? [];
      return items.some((item) => qualifiesItem(projectId, item));
    },
    qualifiesItem,
    projectLanguageById,
  };
}
