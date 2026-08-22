/**
 * Derive platform texts + social image from approved Creative Core v2.
 * Idempotent claim on package_brief. Paid video providers are out of scope.
 */

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCopywritingProvider } from "@/lib/ai/index";
import type { Json } from "@/lib/supabase/types";
import { loadProjectOrThrow } from "@/lib/ai/workflows/shared";
import {
  buildPersistableItems,
  loadStrategyItemContext,
  type StrategyItemContext,
} from "@/lib/ai/workflows/packageShared";
import { resolvePackagePlatforms } from "@/lib/projects/contentControls";
import { packageNeedsSocialImage, parsePackageSocialImage } from "@/lib/content-package/socialImage";
import { generateAndPersistPackageSocialImage } from "@/lib/content-package/generateSocialImage";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import { readApprovedCreativeCoreSnapshot } from "@/lib/content-creative-core-v2/approvedSnapshot";
import {
  emptyPendingDerivedOutputs,
  readDerivedOutputs,
  writeDerivedOutputs,
  withDerivedStatus,
} from "@/lib/content-creative-core-v2/derivedOutputsState";
import {
  approvedCoreSourceFingerprint,
  buildDerivedIdempotencyKey,
  computePlatformDependencyFingerprint,
  platformDependencyFieldsFromCore,
} from "@/lib/content-creative-core-v2/platformDependencyFingerprint";
import {
  derivePlatformOutputsWithProvider,
} from "@/lib/content-creative-core-v2/derivePlatformOutputs";
import {
  assertNoPlaceholdersInPersistableCaptions,
  isPendingStep3Placeholder,
  platformOutputsContainPlaceholders,
} from "@/lib/content-creative-core-v2/placeholderGuard";
import type { ContentDerivedOutputsV2 } from "@/lib/content-creative-core-v2/derivedOutputsTypes";
import { canonicalWebsiteUrl } from "@/lib/knowledge/websiteUrl";

const DERIVE_LEASE_SECONDS = 180;

export type DeriveOutputsResult =
  | {
      ok: true;
      reused: boolean;
      textsReady: boolean;
      socialImageReady: boolean;
      status: ContentDerivedOutputsV2["status"];
    }
  | { ok: false; error: string; code: string; busy?: boolean };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function leaseExpired(claim: ContentDerivedOutputsV2["claim"], now: number): boolean {
  if (!claim?.lease_expires_at) return true;
  return Date.parse(claim.lease_expires_at) <= now;
}

async function loadPackageBrief(
  supabase: SupabaseClient,
  projectId: string,
  packageId: string,
): Promise<{
  brief: Record<string, unknown>;
  strategyItemId: string | null;
  title: string;
} | null> {
  const { data, error } = await supabase
    .from("content_packages")
    .select("package_brief, strategy_item_id, title")
    .eq("id", packageId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const brief = asRecord(data.package_brief) ?? {};
  return {
    brief,
    strategyItemId:
      typeof data.strategy_item_id === "string" ? data.strategy_item_id : null,
    title: typeof data.title === "string" ? data.title : "Package",
  };
}

async function saveBrief(
  supabase: SupabaseClient,
  projectId: string,
  packageId: string,
  brief: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("content_packages")
    .update({ package_brief: brief as unknown as Json })
    .eq("id", packageId)
    .eq("project_id", projectId);
  if (error) throw error;
}

function derivedToPackageOutputs(
  derived: ContentDerivedOutputsV2,
): ContentPackageOutput["platform_outputs"] {
  const out: Record<string, { caption: string; cta?: string | null; hashtags?: string[]; format?: string }> =
    {};
  for (const [platform, row] of Object.entries(derived.platform_outputs)) {
    out[platform] = {
      caption: row.caption,
      cta: row.cta ?? null,
      hashtags: row.hashtags ?? derived.hashtags,
    };
  }
  return out as ContentPackageOutput["platform_outputs"];
}

async function persistContentItemsFromDerived(args: {
  supabase: SupabaseClient;
  projectId: string;
  packageId: string;
  brief: Record<string, unknown>;
  derived: ContentDerivedOutputsV2;
  context: StrategyItemContext;
  websiteUrl: string | null;
  title: string;
}): Promise<void> {
  const captions = Object.values(args.derived.platform_outputs).map((p) => p.caption);
  const guard = assertNoPlaceholdersInPersistableCaptions(captions);
  if (!guard.ok) {
    throw new Error(guard.error);
  }

  const pkg = {
    title: args.title,
    funnel_stage: args.context.funnelStage,
    hook: typeof args.brief.hook === "string" ? args.brief.hook : "",
    voiceover_text:
      typeof args.brief.voiceover_text === "string"
        ? args.brief.voiceover_text
        : "",
    platform_outputs: derivedToPackageOutputs(args.derived),
    hashtags: args.derived.hashtags,
    cta: args.derived.cta ?? { type: "other", text: "" },
  } as ContentPackageOutput;

  const itemRows = buildPersistableItems(
    pkg,
    args.context,
    args.derived.platforms,
    args.websiteUrl,
  );
  if (itemRows.some((i) => isPendingStep3Placeholder(i.caption))) {
    throw new Error("pending_step_3_placeholder_not_persistable");
  }

  // Replace draft items so placeholders cannot survive.
  const { data: existing } = await args.supabase
    .from("content_items")
    .select("id, caption")
    .eq("project_id", args.projectId)
    .eq("package_id", args.packageId);
  const existingRows = existing ?? [];
  const hasPlaceholders = existingRows.some((r) =>
    isPendingStep3Placeholder(r.caption),
  );
  if (existingRows.length === 0 || hasPlaceholders) {
    if (existingRows.length > 0) {
      const ids = existingRows.map((r) => r.id as string);
      await args.supabase
        .from("content_items")
        .delete()
        .eq("project_id", args.projectId)
        .in("id", ids);
    }
    const insertRows = itemRows.map((item) => ({
      project_id: args.projectId,
      package_id: args.packageId,
      platform: item.platform,
      format: item.format,
      status: "draft" as const,
      title: args.title,
      body:
        typeof args.brief.voiceover_text === "string"
          ? args.brief.voiceover_text
          : "",
      caption: item.caption,
      hashtags: item.hashtags,
      cta: item.cta,
      generation_metadata: {
        source: "content_creative_core_v2_derived",
        derived_idempotency_key: args.derived.idempotency_key,
      } as unknown as Json,
    }));
    if (insertRows.length > 0) {
      const { error } = await args.supabase.from("content_items").insert(insertRows);
      if (error) throw error;
    }
  } else {
    // Update captions in place for matching platforms (retry-safe).
    for (const item of itemRows) {
      await args.supabase
        .from("content_items")
        .update({
          caption: item.caption,
          hashtags: item.hashtags,
          cta: item.cta,
          title: args.title,
        })
        .eq("project_id", args.projectId)
        .eq("package_id", args.packageId)
        .eq("platform", item.platform);
    }
  }
}

/**
 * Schedule marker: put pending derived job on brief for background processor.
 */
export function enqueueDerivedOutputsPending(args: {
  brief: Record<string, unknown>;
  platforms: readonly string[];
  language: string;
  packageId?: string;
}): Record<string, unknown> {
  const snapshot = readApprovedCreativeCoreSnapshot(args.brief);
  if (!snapshot) return args.brief;
  const dep = computePlatformDependencyFingerprint(
    platformDependencyFieldsFromCore(snapshot.core, {
      language: args.language,
      platforms: args.platforms,
    }),
  );
  const source = approvedCoreSourceFingerprint(snapshot);
  const idempotencyKey = buildDerivedIdempotencyKey({
    packageId: args.packageId ?? "pending",
    platformDependencyFingerprint: dep,
    sourceApprovedCoreFingerprint: source,
  });
  const pending = emptyPendingDerivedOutputs({
    platforms: args.platforms,
    language: args.language,
    platformDependencyFingerprint: dep,
    sourceApprovedCoreFingerprint: source,
    idempotencyKey,
  });
  return writeDerivedOutputs(args.brief, pending);
}

export async function runDerivePlatformOutputsForPackage(args: {
  supabase: SupabaseClient;
  projectId: string;
  packageId: string;
  /** When true, skip text AI if texts already ready; only retry social image. */
  imageOnly?: boolean;
  /** When true, skip social image; only ensure texts + items. */
  textsOnly?: boolean;
  ownerToken?: string;
}): Promise<DeriveOutputsResult> {
  const supabase = args.supabase;
  const ownerToken = args.ownerToken ?? randomUUID();
  const now = Date.now();

  const loaded = await loadPackageBrief(supabase, args.projectId, args.packageId);
  if (!loaded) {
    return { ok: false, error: "Package not found.", code: "not_found" };
  }
  let brief = loaded.brief;
  const snapshot = readApprovedCreativeCoreSnapshot(brief);
  if (!snapshot) {
    return {
      ok: false,
      error: "Approved Creative Core required before derivation.",
      code: "not_approved",
    };
  }

  const project = await loadProjectOrThrow(supabase, args.projectId);
  const platforms = resolvePackagePlatforms(project.platforms);
  const language = project.language;
  const needSocial = packageNeedsSocialImage(platforms);

  const dep = computePlatformDependencyFingerprint(
    platformDependencyFieldsFromCore(snapshot.core, {
      language,
      platforms,
    }),
  );
  const source = approvedCoreSourceFingerprint(snapshot);
  const idempotencyKey = buildDerivedIdempotencyKey({
    packageId: args.packageId,
    platformDependencyFingerprint: dep,
    sourceApprovedCoreFingerprint: source,
  });

  let derived = readDerivedOutputs(brief);
  if (
    derived &&
    !derived.stale &&
    derived.idempotency_key === idempotencyKey &&
    derived.texts_ready &&
    derived.status === "ready" &&
    (!needSocial || derived.social_image_ready)
  ) {
    return {
      ok: true,
      reused: true,
      textsReady: true,
      socialImageReady: derived.social_image_ready,
      status: "ready",
    };
  }

  if (
    derived?.claim &&
    !leaseExpired(derived.claim, now) &&
    derived.claim.owner_token !== ownerToken
  ) {
    return {
      ok: false,
      error: "Derivation already in progress.",
      code: "busy",
      busy: true,
    };
  }

  if (!derived || derived.stale || derived.idempotency_key !== idempotencyKey) {
    derived = emptyPendingDerivedOutputs({
      platforms,
      language,
      platformDependencyFingerprint: dep,
      sourceApprovedCoreFingerprint: source,
      idempotencyKey,
    });
  }

  derived = withDerivedStatus(derived, "generating_texts", {
    claim: {
      owner_token: ownerToken,
      claimed_at: new Date(now).toISOString(),
      lease_expires_at: new Date(now + DERIVE_LEASE_SECONDS * 1000).toISOString(),
    },
    stale: false,
    error: null,
  });
  brief = writeDerivedOutputs(brief, derived);
  await saveBrief(supabase, args.projectId, args.packageId, brief);

  // Reuse texts when fingerprint matches and texts_ready.
  const canReuseTexts =
    derived.texts_ready &&
    derived.idempotency_key === idempotencyKey &&
    Object.keys(derived.platform_outputs).length > 0 &&
    !platformOutputsContainPlaceholders(derived.platform_outputs);

  if (!canReuseTexts && !args.imageOnly) {
    const core = {
      ...snapshot.core,
      voiceover: snapshot.production_voiceover_en,
    };
    const provider = getCopywritingProvider();
    const derivedAi = await derivePlatformOutputsWithProvider({
      context: {
        core,
        productionVoiceoverEn: snapshot.production_voiceover_en,
        productBrain: {
          product_name: project.name,
          product_description: Array.isArray(project.product_is)
            ? project.product_is.join("; ")
            : "",
          audience: JSON.stringify(project.target_audience ?? {}),
          market: String(project.market_scope ?? ""),
          strengths: project.product_strengths,
          pain_points: project.pain_points,
          cta: project.default_cta,
          brand_voice: JSON.stringify(project.tone_of_voice ?? {}),
        },
        language,
        market: String(project.market_scope ?? ""),
        goalType: project.goal_type,
        funnelStage:
          typeof brief.funnel_stage === "string"
            ? brief.funnel_stage
            : "awareness",
        platforms,
        requireSocialImage: needSocial,
      },
      textProvider: {
        complete: async ({ system, prompt }) => {
          const result = await provider.complete({
            system,
            prompt,
            json: true,
          });
          return {
            text: result.text,
            model: result.model,
            provider: result.provider,
          };
        },
      },
    });

    if (!derivedAi.ok) {
      derived = withDerivedStatus(derived, "failed", {
        error: derivedAi.error,
        claim: null,
      });
      brief = writeDerivedOutputs(brief, derived);
      await saveBrief(supabase, args.projectId, args.packageId, brief);
      return { ok: false, error: derivedAi.error, code: "generation_failed" };
    }

    derived = withDerivedStatus(derived, needSocial ? "generating_social_image" : "ready", {
      platform_outputs: derivedAi.data.platform_outputs,
      hashtags: derivedAi.data.hashtags,
      cta: derivedAi.data.cta,
      social_image_creative_brief: derivedAi.data.social_image_creative_brief
        ? {
            ...derivedAi.data.social_image_creative_brief,
            source: "approved_creative_core_v2",
          }
        : null,
      texts_ready: true,
      generated_at: new Date().toISOString(),
      provider_provenance: {
        ...derived.provider_provenance,
        text_provider: derivedAi.provider,
        text_model: derivedAi.model,
      },
      social_image_required: needSocial,
      social_image_ready: !needSocial,
    });

    brief = {
      ...writeDerivedOutputs(brief, derived),
      platform_outputs: derivedToPackageOutputs(derived),
      hashtags: derived.hashtags,
      cta: derived.cta,
      social_image: derived.social_image_creative_brief
        ? {
            image_prompt: derived.social_image_creative_brief.image_prompt,
            text_overlay: derived.social_image_creative_brief.text_overlay,
            status: needSocial ? "pending" : undefined,
          }
        : null,
    };
    await saveBrief(supabase, args.projectId, args.packageId, brief);

    if (!loaded.strategyItemId) {
      derived = withDerivedStatus(derived, "failed", {
        error: "missing_strategy_item",
        claim: null,
      });
      brief = writeDerivedOutputs(brief, derived);
      await saveBrief(supabase, args.projectId, args.packageId, brief);
      return { ok: false, error: "Missing strategy item.", code: "invalid_input" };
    }

    const context = await loadStrategyItemContext(
      supabase,
      args.projectId,
      loaded.strategyItemId,
    );
    await persistContentItemsFromDerived({
      supabase,
      projectId: args.projectId,
      packageId: args.packageId,
      brief,
      derived,
      context,
      websiteUrl: canonicalWebsiteUrl(project),
      title: loaded.title,
    });
  } else if (canReuseTexts) {
    // Ensure brief platform_outputs mirror derived (no placeholders).
    brief = {
      ...brief,
      platform_outputs: derivedToPackageOutputs(derived),
    };
    await saveBrief(supabase, args.projectId, args.packageId, brief);
  }

  if (needSocial && !args.textsOnly) {
    const social = parsePackageSocialImage(brief);
    if (social?.status === "ready" && social.storage_path) {
      derived = withDerivedStatus(derived, "ready", {
        social_image_ready: true,
        claim: null,
      });
      brief = writeDerivedOutputs(brief, derived);
      await saveBrief(supabase, args.projectId, args.packageId, brief);
      return {
        ok: true,
        reused: canReuseTexts,
        textsReady: true,
        socialImageReady: true,
        status: "ready",
      };
    }

    derived = withDerivedStatus(derived, "generating_social_image", {
      claim: {
        owner_token: ownerToken,
        claimed_at: new Date().toISOString(),
        lease_expires_at: new Date(
          Date.now() + DERIVE_LEASE_SECONDS * 1000,
        ).toISOString(),
      },
    });
    brief = writeDerivedOutputs(brief, derived);
    await saveBrief(supabase, args.projectId, args.packageId, brief);

    const creative = derived.social_image_creative_brief;
    if (!creative?.image_prompt) {
      derived = withDerivedStatus(derived, "failed", {
        error: "missing_social_image_brief",
        claim: null,
        social_image_ready: false,
      });
      brief = writeDerivedOutputs(brief, derived);
      await saveBrief(supabase, args.projectId, args.packageId, brief);
      return {
        ok: false,
        error: "Social image brief missing.",
        code: "social_image_failed",
      };
    }

    const pkgForImage = {
      social_image: {
        image_prompt: creative.image_prompt,
        text_overlay: creative.text_overlay ?? undefined,
      },
    } as ContentPackageOutput;

    const imageResult = await generateAndPersistPackageSocialImage({
      supabase,
      projectId: args.projectId,
      packageId: args.packageId,
      pkg: pkgForImage,
      targetPlatforms: platforms,
    });

    // Reload brief after image patch.
    const afterImage = await loadPackageBrief(
      supabase,
      args.projectId,
      args.packageId,
    );
    brief = afterImage?.brief ?? brief;
    derived = readDerivedOutputs(brief) ?? derived;

    if (!imageResult.generated) {
      derived = withDerivedStatus(derived, "failed", {
        error: imageResult.socialImage?.error ?? "social_image_failed",
        claim: null,
        social_image_ready: false,
        texts_ready: true,
      });
      brief = writeDerivedOutputs(brief, derived);
      await saveBrief(supabase, args.projectId, args.packageId, brief);
      return {
        ok: false,
        error: "Social image generation failed.",
        code: "social_image_failed",
      };
    }

    derived = withDerivedStatus(derived, "ready", {
      social_image_ready: true,
      claim: null,
      texts_ready: true,
      provider_provenance: {
        ...derived.provider_provenance,
        image_provider: "image",
        image_model: "gpt-image-1",
      },
    });
    brief = writeDerivedOutputs(brief, derived);
    await saveBrief(supabase, args.projectId, args.packageId, brief);
  } else {
    derived = withDerivedStatus(derived, "ready", {
      claim: null,
      texts_ready: true,
      social_image_ready: !needSocial,
    });
    brief = writeDerivedOutputs(brief, derived);
    await saveBrief(supabase, args.projectId, args.packageId, brief);
  }

  return {
    ok: true,
    reused: canReuseTexts,
    textsReady: true,
    socialImageReady: !needSocial || Boolean(readDerivedOutputs(brief)?.social_image_ready),
    status: "ready",
  };
}

/**
 * Drain one pending derive job (background processor).
 */
export async function processNextDerivedOutputsJob(args: {
  supabase: SupabaseClient;
  projectId?: string;
  packageId?: string;
}): Promise<{ processed: number; failed: number }> {
  let query = args.supabase
    .from("content_packages")
    .select("id, project_id, package_brief")
    .order("updated_at", { ascending: true })
    .limit(5);

  if (args.packageId) {
    query = query.eq("id", args.packageId);
  }
  if (args.projectId) {
    query = query.eq("project_id", args.projectId);
  }

  const { data, error } = await query;
  if (error) throw error;

  let processed = 0;
  let failed = 0;
  for (const row of data ?? []) {
    const brief = asRecord(row.package_brief);
    if (!brief) continue;
    const derived = readDerivedOutputs(brief);
    const approved = readApprovedCreativeCoreSnapshot(brief);
    if (!approved) continue;
    if (
      !derived ||
      derived.stale ||
      derived.status === "pending" ||
      derived.status === "failed" ||
      (derived.status !== "ready" && !derived.texts_ready) ||
      (derived.social_image_required && !derived.social_image_ready && derived.texts_ready)
    ) {
      // eligible
    } else {
      continue;
    }
    // Only process pending / failed / incomplete social.
    if (
      derived &&
      derived.status === "ready" &&
      derived.texts_ready &&
      (!derived.social_image_required || derived.social_image_ready) &&
      !derived.stale
    ) {
      continue;
    }

    const result = await runDerivePlatformOutputsForPackage({
      supabase: args.supabase,
      projectId: row.project_id as string,
      packageId: row.id as string,
      imageOnly: Boolean(derived?.texts_ready && !derived.stale),
    });
    if (result.ok) processed += 1;
    else if (!result.busy) failed += 1;
  }
  return { processed, failed };
}
