/**
 * Content-package Presentation prompt — public API.
 *
 * Phase 3: this module owns types + system message + thin orchestration.
 * Ownership resolution lives upstream (Typed Decision Packs) or in
 * ensureDecisionPacks (TEMPORARY COMPAT for tests / legacy callers).
 * Section text is produced by lib/architecture/presentation renderers.
 */

import type { Project } from "@/lib/supabase/types";
import type { CreativeDirectives } from "@/lib/ai/prompts/creativeDirectives";
import type {
  TypedDecisionPacks,
  BuildTypedDecisionPacksInput,
} from "@/lib/architecture/typedDecisionPacks";
import type { CreativeDNA } from "@/lib/creative-candidates/creativeDNA";
import type { CreativeIdentity } from "@/lib/creative-identity/types";
import type { DeliveryArc } from "@/lib/attention/types";
import type { AssetCoverageDecision } from "@/lib/assets/assetCoveragePolicy";
import type { PromptPresentationType } from "@/lib/scene-types/presentation/promptPresentationTypes";
import type { GenerationMode } from "@/lib/ai/generationMode";
import type {
  AntiRepetitionMemory,
  FunnelStage,
} from "@/lib/ai/types";
import type { ProductRole } from "@/lib/assets/productRole";
import type {
  PreferredVideoUsage,
  VideoUsageRenderMode,
} from "@/lib/assets/preferredVideoUsage";
import type {
  AuthenticityForProductClaim,
  ProvenanceClass,
  RecommendedPresentationClass,
} from "@/lib/assets/productPresentationMetadata";
import {
  buildPresentationPrompt,
  toPresentationRenderInput,
} from "@/lib/architecture/presentation";

export type {
  PlatformStyleSpec,
} from "@/lib/ai/prompts/platformStyles";
export {
  PLATFORM_STYLE_SPECS,
  PLATFORM_NATIVE_WRITING_HEADER,
  buildPlatformNativeWritingRulesBlock,
  buildPlatformStyleBlock,
} from "@/lib/ai/prompts/platformStyles";
export {
  buildSamplePackageRulesBlock,
  buildSampleModePromptAppendix,
} from "@/lib/ai/prompts/sampleModePrompt";

export interface AssetRef {
  id: string;
  title: string;
  // static | editable | reference
  asset_class: string;
  media_type: string;
  ai_description?: string | null;
  detected_content_type?: string | null;
  suggested_usage?: string | null;
  trust_signal?: boolean | null;
  product_role?: ProductRole | null;
  /** From assets.metadata.asset_quality when present (ingest / analysis). */
  asset_quality?: "high" | "medium" | "low" | null;
  orientation?: string | null;
  preferred_presentation?: string | null;
  video_suitability?: string | null;
  safe_vertical_usage?: boolean | null;
  aspect_ratio?: string | number | null;
  visual_importance?: string | null;
  capture_viewport?: string | null;
  /** Stamped or computed preferred usage for vertical video. */
  preferred_video_usage?: VideoUsageRenderMode | PreferredVideoUsage | null;
  /** Wave 2 — provenance / authenticity for Product Presentation Decision. */
  provenance_class?: ProvenanceClass | null;
  authenticity_for_product_claim?: AuthenticityForProductClaim | null;
  recommended_presentation_classes?: RecommendedPresentationClass[] | null;
}

export interface GenerateContentPackagePromptInput {
  project: Project;
  funnelStage: FunnelStage;
  topic: string;
  angle?: string | null;
  platform?: string | null;
  format?: string | null;
  availableAssets: AssetRef[];
  // Phase 2E — recent hooks/topics/CTAs/scenarios to avoid repeating.
  memory?: AntiRepetitionMemory;
  // Recent asset_usage log for optional rotation guidance (empty -> omitted).
  recentAssetUsageBlock?: string;
  // Platform surfaces the package must produce. Defaults to the full required
  // set; callers pass the project's resolved platforms to respect
  // projects.platforms.
  targetPlatforms?: readonly string[];
  // P3 runtime — whether this package must include a video (true when at least
  // one selected platform is video-typed). Defaults to true (video required),
  // which keeps the historical prompt unchanged for video packages.
  requireVideo?: boolean;
  // The subset of targetPlatforms that are video-typed. Used only to phrase a
  // mixed-package note; empty when unknown.
  videoPlatforms?: readonly string[];
  // Content Quality V3 — optional extra salt mixed into the creative-directive
  // seed. Generation leaves it empty (seed = funnel/topic/angle); regeneration
  // sets it from the previous title + feedback so a regenerated package gets a
  // different creative directive than the original.
  creativeSeedSalt?: string;
  // Attention First V1 — the pre-resolved creative directive. When provided it is
  // used verbatim (so the prompt, the storyboard role arc and the video job
  // input all share the SAME mode). When omitted the prompt resolves it the
  // legacy way from funnel/topic/angle/creativeSeedSalt — fully backward
  // compatible with existing callers and tests.
  directives?: CreativeDirectives;
  // Content Quality Sprint (Multiplier Variants MVP-1) — number of OUTPUTS this
  // package must produce per platform for the current production run + package
  // index. When a platform's count is > 1, the prompt asks for that many
  // DISTINCT captions (caption_variants) so fan-out persists real variants
  // instead of duplicating one caption. Platforms absent from the map (or with
  // a count <= 1) keep the single-caption shape unchanged.
  variantCounts?: Record<string, number>;
  // Run Package Diversity V1 — present only for production-run items (when
  // production_run_id + package_index are known). It injects the PACKAGE
  // DIVERSITY block so every package in one run commits to a DISTINCT angle.
  // Omitted for legacy / single-package generation, which keeps the prompt
  // byte-for-byte unchanged.
  packageDiversity?: PackageDiversitySpec;
  /** Phase 5 — presentation types the model may emit (IMAGE and optionally CHECKLIST). */
  promptPresentationTypes?: readonly PromptPresentationType[];
  /** Sample mode adds SAMPLE PACKAGE RULES; production leaves the prompt unchanged. */
  generationMode?: GenerationMode;
  /**
   * @deprecated Phase 3 — Coverage is owned by AssetPolicyPack. Prefer passing
   * decisionPacks. Still accepted by ensureDecisionPacks TEMPORARY COMPAT.
   */
  assetCoverage?: AssetCoverageDecision;
  /**
   * @deprecated Phase 1 — Scene Type Memory prose is no longer injected.
   * Soft restraint remains in applySceneTypeHistoryGuardrail (deterministic).
   * Accepted for backward-compatible callers; ignored by the builder.
   */
  sceneTypeHistoryBlock?: string;
  /** Series-aware creative fingerprints for weekly/monthly runs. */
  seriesCreativeContextBlock?: string;
  /** Profile-aware image prompt guidance (generation-time). */
  visualProfileImagePromptBlock?: string;
  /**
   * @deprecated Phase 3 — prefer decisionPacks.visualIdentity.identityPromptBlock.
   * Still accepted by ensureDecisionPacks when packs are rebuilt.
   */
  creativeIdentityPromptBlock?: string;
  /** Visual Narrative v1 — meaning carrier and storytelling direction before image prompts. */
  visualNarrativePromptBlock?: string;
  /** Visual Medium v1 — representation style for all image prompts in this package. */
  visualMediumPromptBlock?: string;
  /** Product Reveal v2 — solution beat visual strategy. */
  productRevealPromptBlock?: string;
  /**
   * @deprecated Phase 3 — prefer decisionPacks.voice.deliveryPromptBlock.
   * Still accepted by ensureDecisionPacks when packs are rebuilt.
   */
  attentionPromptBlock?: string;
  /** Creative Candidate Selection v1 — winning complete concept controls script + storyboard. */
  creativeCandidatePromptBlock?: string;
  /**
   * Narrative Beats — derived story spine labels mapped onto MODE BEATS.
   * Pre-rendered fragment (not ownership resolution).
   */
  narrativeBeatPromptBlock?: string;
  /**
   * @deprecated Phase 3 — prefer decisionPacks.visualIdentity.dnaPromptBlock.
   * Still accepted by ensureDecisionPacks when packs are rebuilt.
   */
  creativeDnaPromptBlock?: string;
  /** Optional fidelity repair appendix after a failed concept fidelity check. */
  creativeCandidateFidelityRepair?: string;
  /**
   * Phase 2B/3 — Typed Decision Packs (authoritative intermediate representation).
   * Production workflows MUST pass packs. When omitted, ensureDecisionPacks
   * TEMPORARY COMPAT rebuilds them for tests / legacy callers.
   */
  decisionPacks?: TypedDecisionPacks;
  /**
   * @deprecated Phase 3 — pack-assembly inputs for ensureDecisionPacks only.
   * Not read by Presentation renderers when decisionPacks is provided.
   */
  selectedCandidateForPacks?: BuildTypedDecisionPacksInput["selectedCandidate"];
  /** @deprecated Phase 3 — ensureDecisionPacks only. */
  creativeDnaForPacks?: CreativeDNA | null;
  /** @deprecated Phase 3 — ensureDecisionPacks only. */
  creativeIdentityForPacks?: CreativeIdentity | null;
  /** @deprecated Phase 3 — ensureDecisionPacks only. */
  attentionDeliveryArcForPacks?: DeliveryArc | null;
  /** @deprecated Phase 3 — ensureDecisionPacks only. */
  ttsVoiceIdForPacks?: string | null;
  /**
   * Optional pre-formatted CREATIVE DIRECTIVE block. When omitted, compat
   * formats from directives / pickCreativeDirectives.
   */
  creativeDirectiveBlock?: string;
}

// One sibling package already produced for the same production run, summarized
// for the "do not repeat these angles" list. Sourced from existing rows
// (content_packages.title + package_brief.hook + the item topic) — no new table
// and no AI call.
export interface PreviousPackageAngle {
  title: string;
  hook?: string | null;
  topic?: string | null;
}

export interface PackageDiversitySpec {
  // 0-based index of this package within the run.
  packageIndex: number;
  // Total packages requested in the run (M in "package N of M"), when known.
  packageCount?: number;
  // The angle lens THIS package should lead with. Defaults to the deterministic
  // lens for packageIndex when omitted.
  angleLens?: string;
  // Compact angles already used by sibling packages in the SAME run, so the
  // model is told not to repeat them. Empty/omitted when none exist yet.
  previousAngles?: PreviousPackageAngle[];
  // Pain Point First V1 — the specific pain point THIS package must anchor to,
  // plus whether the pain point is the PRIMARY topic (~80% of packages) or a
  // SUPPORTING detail that still connects back to it (~20%). Omitted for
  // projects with no pain points, so those runs keep the prior block unchanged.
  painPoint?: string;
  painPointMode?: "primary" | "supporting";
}

const PACKAGE_SYSTEM_INTRO =
  "You are the Creative Engine for an AI Content Manager. You generate a " +
  "complete content PACKAGE derived from a weekly strategy item. ";

const PACKAGE_SYSTEM_VIDEO =
  "Video is MANDATORY for every package and is a fast-paced vertical SHORT (TikTok / " +
  "Instagram Reels / YouTube Shorts share ONE video). The first 3 seconds (the " +
  "hook) decide everything. Produce platform-specific outputs.";

const PACKAGE_SYSTEM_TEXT_ONLY =
  "This is a TEXT-ONLY package: do NOT produce a video. Do not generate a video " +
  "concept or script. Produce platform-specific written copy (captions, CTA, " +
  "hashtags) plus the required body/narration fields. The first line (the hook) " +
  "still decides everything — it opens the copy.";

// Builds the system message for content-package generation. requireVideo=true
// keeps the historical, video-mandatory system message; false switches to the
// text-only variant.
export function buildGeneratePackageSystem(requireVideo: boolean): string {
  return (
    PACKAGE_SYSTEM_INTRO +
    (requireVideo ? PACKAGE_SYSTEM_VIDEO : PACKAGE_SYSTEM_TEXT_ONLY)
  );
}

// Backwards-compatible constant: the video-mandatory system message.
export const GENERATE_PACKAGE_SYSTEM = buildGeneratePackageSystem(true);

/**
 * Presentation entrypoint — orchestrates Typed Decision Packs → renderers → prompt.
 * Does not redesign prompts; preserves Repair-compatible rendered output.
 */
export function buildGenerateContentPackagePrompt(
  input: GenerateContentPackagePromptInput,
): string {
  const renderInput = toPresentationRenderInput({
    project: input.project,
    funnelStage: input.funnelStage,
    topic: input.topic,
    angle: input.angle,
    creativeSeedSalt: input.creativeSeedSalt,
    directives: input.directives,
    decisionPacks: input.decisionPacks,
    generationMode: input.generationMode,
    assetCoverage: input.assetCoverage,
    selectedCandidateForPacks: input.selectedCandidateForPacks,
    creativeDnaForPacks: input.creativeDnaForPacks,
    creativeIdentityForPacks: input.creativeIdentityForPacks,
    attentionDeliveryArcForPacks: input.attentionDeliveryArcForPacks,
    attentionPromptBlock: input.attentionPromptBlock,
    creativeDnaPromptBlock: input.creativeDnaPromptBlock,
    creativeIdentityPromptBlock: input.creativeIdentityPromptBlock,
    ttsVoiceIdForPacks: input.ttsVoiceIdForPacks,
    targetPlatforms: input.targetPlatforms,
    requireVideo: input.requireVideo,
    videoPlatforms: input.videoPlatforms,
    creativeDirectiveBlock: input.creativeDirectiveBlock,
    creativeCandidatePromptBlock: input.creativeCandidatePromptBlock,
    narrativeBeatPromptBlock: input.narrativeBeatPromptBlock,
    creativeCandidateFidelityRepair: input.creativeCandidateFidelityRepair,
    visualNarrativePromptBlock: input.visualNarrativePromptBlock,
    visualMediumPromptBlock: input.visualMediumPromptBlock,
    productRevealPromptBlock: input.productRevealPromptBlock,
    visualProfileImagePromptBlock: input.visualProfileImagePromptBlock,
    seriesCreativeContextBlock: input.seriesCreativeContextBlock,
    availableAssets: input.availableAssets,
    memory: input.memory,
    recentAssetUsageBlock: input.recentAssetUsageBlock,
    packageDiversity: input.packageDiversity,
    variantCounts: input.variantCounts,
    promptPresentationTypes: input.promptPresentationTypes,
  });

  return buildPresentationPrompt(renderInput);
}
