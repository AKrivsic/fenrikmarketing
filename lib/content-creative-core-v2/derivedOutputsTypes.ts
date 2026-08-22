/**
 * content_derived_outputs_v2 — platform texts + social-image brief derived from
 * an approved Creative Core. Never mutates the Core.
 */

export const CREATIVE_CORE_V2_DERIVED_OUTPUTS_KEY =
  "content_derived_outputs_v2" as const;

export const CREATIVE_CORE_V2_DERIVED_CONTRACT_VERSION = 1 as const;

export const PLATFORM_DEPENDENCY_FINGERPRINT_VERSION =
  "platform-dependency-fingerprint@1" as const;

export type DerivedOutputsStatus =
  | "pending"
  | "generating_texts"
  | "generating_social_image"
  | "ready"
  | "failed";

export type DerivedOperatorPhase =
  | "ready_to_approve"
  | "deriving_platform_texts"
  | "deriving_social_image"
  | "ready_for_video"
  | "awaiting_paid_confirmation"
  | "error_retry";

export interface DerivedPlatformOutputV2 {
  caption: string;
  cta?: string | null;
  hashtags?: string[];
  /** YouTube / X title when applicable. */
  title?: string | null;
  /** YouTube description when applicable. */
  description?: string | null;
}

export interface DerivedSocialImageCreativeBriefV2 {
  image_prompt: string;
  text_overlay?: string | null;
  /** Never a video scene copy — explicit package-level brief. */
  source: "approved_creative_core_v2";
}

export interface DerivedOutputsClaimV2 {
  owner_token: string;
  lease_expires_at: string;
  claimed_at: string;
}

export interface ContentDerivedOutputsV2 {
  contract_version: typeof CREATIVE_CORE_V2_DERIVED_CONTRACT_VERSION;
  status: DerivedOutputsStatus;
  /** Fingerprint of the approved Core snapshot used as creative authority. */
  source_approved_core_fingerprint: string;
  /**
   * Content that platform texts + social image depend on
   * (idea/hook/VO/cta/conflict/reveal/payoff — NOT scene motion/SFX/camera).
   */
  platform_dependency_fingerprint: string;
  platform_dependency_fingerprint_version: typeof PLATFORM_DEPENDENCY_FINGERPRINT_VERSION;
  generated_at: string | null;
  language: string;
  platforms: string[];
  platform_outputs: Record<string, DerivedPlatformOutputV2>;
  hashtags: string[];
  cta: { type: string; text: string } | null;
  social_image_creative_brief: DerivedSocialImageCreativeBriefV2 | null;
  social_image_required: boolean;
  social_image_ready: boolean;
  /** When texts are done but image may still be pending/failed. */
  texts_ready: boolean;
  provider_provenance: {
    text_provider?: string | null;
    text_model?: string | null;
    image_provider?: string | null;
    image_model?: string | null;
  };
  idempotency_key: string;
  claim: DerivedOutputsClaimV2 | null;
  error: string | null;
  /** Stale when dependency fingerprint no longer matches approved Core. */
  stale: boolean;
}

export const PENDING_STEP_3_PLACEHOLDER_PREFIX = "[pending_step_3:" as const;
