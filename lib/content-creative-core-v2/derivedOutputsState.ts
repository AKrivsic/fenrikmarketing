/**
 * Read/write helpers for content_derived_outputs_v2 on package_brief.
 */

import {
  CREATIVE_CORE_V2_DERIVED_CONTRACT_VERSION,
  CREATIVE_CORE_V2_DERIVED_OUTPUTS_KEY,
  PLATFORM_DEPENDENCY_FINGERPRINT_VERSION,
  type ContentDerivedOutputsV2,
  type DerivedOperatorPhase,
  type DerivedOutputsStatus,
} from "@/lib/content-creative-core-v2/derivedOutputsTypes";
import { packageNeedsSocialImage } from "@/lib/content-package/socialImage";
import { parsePackageSocialImage } from "@/lib/content-package/socialImage";
import { readApprovedCreativeCoreSnapshot } from "@/lib/content-creative-core-v2/approvedSnapshot";
import {
  approvedCoreSourceFingerprint,
  computePlatformDependencyFingerprint,
  platformDependencyFieldsFromCore,
} from "@/lib/content-creative-core-v2/platformDependencyFingerprint";
import { platformOutputsContainPlaceholders } from "@/lib/content-creative-core-v2/placeholderGuard";
import { shouldMarkDeriveStuckForOperatorRetry } from "@/lib/content-creative-core-v2/stuckDerive";

export function readDerivedOutputs(
  brief: Record<string, unknown> | null | undefined,
): ContentDerivedOutputsV2 | null {
  if (!brief) return null;
  const raw = brief[CREATIVE_CORE_V2_DERIVED_OUTPUTS_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as ContentDerivedOutputsV2;
  if (record.contract_version !== CREATIVE_CORE_V2_DERIVED_CONTRACT_VERSION) {
    return null;
  }
  return record;
}

export function writeDerivedOutputs(
  brief: Record<string, unknown>,
  derived: ContentDerivedOutputsV2,
): Record<string, unknown> {
  return {
    ...brief,
    [CREATIVE_CORE_V2_DERIVED_OUTPUTS_KEY]: derived,
  };
}

export function emptyPendingDerivedOutputs(args: {
  platforms: readonly string[];
  language: string;
  platformDependencyFingerprint: string;
  sourceApprovedCoreFingerprint: string;
  idempotencyKey: string;
}): ContentDerivedOutputsV2 {
  const socialRequired = packageNeedsSocialImage(args.platforms);
  return {
    contract_version: CREATIVE_CORE_V2_DERIVED_CONTRACT_VERSION,
    status: "pending",
    source_approved_core_fingerprint: args.sourceApprovedCoreFingerprint,
    platform_dependency_fingerprint: args.platformDependencyFingerprint,
    platform_dependency_fingerprint_version: PLATFORM_DEPENDENCY_FINGERPRINT_VERSION,
    generated_at: null,
    language: args.language,
    platforms: [...args.platforms],
    platform_outputs: {},
    hashtags: [],
    cta: null,
    social_image_creative_brief: null,
    social_image_required: socialRequired,
    social_image_ready: !socialRequired,
    texts_ready: false,
    provider_provenance: {},
    idempotency_key: args.idempotencyKey,
    claim: null,
    error: null,
    stale: false,
  };
}

export function markDerivedOutputsStale(
  brief: Record<string, unknown>,
  reason: string,
): Record<string, unknown> {
  const existing = readDerivedOutputs(brief);
  if (!existing) return brief;
  return writeDerivedOutputs(brief, {
    ...existing,
    stale: true,
    status: "failed",
    error: reason,
    claim: null,
  });
}

/**
 * Scene-only edits must NOT call this. VO / idea / CTA / conflict / reveal / payoff do.
 */
export function invalidateDerivedOutputsForPlatformDependencyChange(
  brief: Record<string, unknown>,
): Record<string, unknown> {
  const next = markDerivedOutputsStale(
    brief,
    "platform_dependency_changed",
  );
  // Clear publishable platform_outputs / social_image so placeholders cannot linger.
  const cleaned: Record<string, unknown> = {
    ...next,
    platform_outputs: {},
    social_image: null,
  };
  return cleaned;
}

export function resolveDerivedOperatorPhase(
  brief: Record<string, unknown> | null | undefined,
): DerivedOperatorPhase {
  const approved = readApprovedCreativeCoreSnapshot(brief ?? undefined);
  if (!approved) return "ready_to_approve";
  const record = brief ?? {};
  if (shouldMarkDeriveStuckForOperatorRetry(record)) {
    return "error_retry";
  }
  const derived = readDerivedOutputs(brief ?? undefined);
  if (!derived || derived.stale) {
    if (derived?.status === "failed") return "error_retry";
    return "deriving_platform_texts";
  }
  if (derived.status === "failed") return "error_retry";
  if (derived.status === "generating_texts" || derived.status === "pending") {
    return "deriving_platform_texts";
  }
  if (derived.status === "generating_social_image") {
    return "deriving_social_image";
  }
  if (derived.status === "ready" && derived.texts_ready) {
    if (derived.social_image_required && !derived.social_image_ready) {
      return "error_retry";
    }
    const awaiting =
      record.content_creative_core_v2_awaiting_paid_video === true ||
      record.content_creative_core_v2_media_blocked === true;
    if (awaiting) return "awaiting_paid_confirmation";
    return "ready_for_video";
  }
  return "deriving_platform_texts";
}

export function derivedOutputsMatchCurrentDependency(args: {
  brief: Record<string, unknown>;
  platforms: readonly string[];
  language: string;
}): boolean {
  const snapshot = readApprovedCreativeCoreSnapshot(args.brief);
  const derived = readDerivedOutputs(args.brief);
  if (!snapshot || !derived || derived.stale) return false;
  if (!derived.texts_ready) return false;
  const expectedDep = computePlatformDependencyFingerprint(
    platformDependencyFieldsFromCore(snapshot.core, {
      language: args.language,
      platforms: args.platforms,
    }),
  );
  const expectedSource = approvedCoreSourceFingerprint(snapshot);
  return (
    derived.platform_dependency_fingerprint === expectedDep &&
    derived.source_approved_core_fingerprint === expectedSource &&
    derived.idempotency_key.length > 0
  );
}

export function packageHasPublishableDerivedContent(
  brief: Record<string, unknown>,
): boolean {
  if (platformOutputsContainPlaceholders(brief.platform_outputs)) return false;
  const derived = readDerivedOutputs(brief);
  if (!derived || derived.stale || !derived.texts_ready) return false;
  if (derived.status !== "ready") return false;
  if (Object.keys(derived.platform_outputs).length === 0) return false;
  if (derived.social_image_required) {
    const social = parsePackageSocialImage(brief);
    if (!social || social.status !== "ready" || !social.storage_path) {
      return false;
    }
  }
  return true;
}

export function statusLabelForOperatorPhase(phase: DerivedOperatorPhase): string {
  switch (phase) {
    case "ready_to_approve":
      return "Připraveno ke schválení";
    case "deriving_platform_texts":
      return "Tvoří se platformní obsah";
    case "deriving_social_image":
      return "Tvoří se FB/LinkedIn obrázek";
    case "ready_for_video":
      return "Připraveno pro video";
    case "awaiting_paid_confirmation":
      return "Čeká na potvrzení placeného videa";
    case "error_retry":
      return "Chyba – zopakovat";
    default:
      return phase;
  }
}

export function withDerivedStatus(
  derived: ContentDerivedOutputsV2,
  status: DerivedOutputsStatus,
  patch?: Partial<ContentDerivedOutputsV2>,
): ContentDerivedOutputsV2 {
  return {
    ...derived,
    status,
    ...patch,
  };
}
