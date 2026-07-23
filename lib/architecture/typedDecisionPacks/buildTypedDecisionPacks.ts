/**
 * Phase 2B — pure Typed Decision Pack assembler.
 * No model calls, no DB, no side effects. Ownership from Phase 2A registry.
 */

import { CTA_TYPES_BY_GOAL } from "@/lib/ai/types";
import { DEFAULT_GENERATION_MODE } from "@/lib/ai/generationMode";
import { buildAssetCoveragePromptBlock } from "@/lib/assets/assetCoveragePolicy";
import { buildFunnelAssetPolicyBlock } from "@/lib/ai/prompts/funnelAssetPolicy";
import { normalizeCreativeDNA } from "@/lib/creative-candidates/creativeDNA";
import type {
  BuildTypedDecisionPacksInput,
  DecisionPackMeta,
  TypedDecisionPacks,
} from "@/lib/architecture/typedDecisionPacks/types";
import { TYPED_DECISION_PACKS_VERSION } from "@/lib/architecture/typedDecisionPacks/types";

function meta(
  partial: Omit<DecisionPackMeta, "version">,
): DecisionPackMeta {
  return { ...partial, version: 1 };
}

export function buildTypedDecisionPacks(
  input: BuildTypedDecisionPacksInput,
): TypedDecisionPacks {
  const generationMode = input.generationMode ?? DEFAULT_GENERATION_MODE;
  const requireVideo = input.requireVideo ?? true;
  const videoPlatforms = input.videoPlatforms ?? [];
  const candidate = input.selectedCandidate ?? null;
  const dna =
    normalizeCreativeDNA(input.creativeDna) ??
    normalizeCreativeDNA(candidate?.creativeDNA) ??
    null;
  const identity = input.creativeIdentity ?? null;
  const directives = input.directives;
  const modeBeats = directives.mode.narrativeBeats;

  const hasCoverage =
    Boolean(input.assetCoverage) &&
    (input.assetCoverage!.qualityAssetCount > 0 || generationMode === "sample");

  const assetPromptBlock = hasCoverage
    ? buildAssetCoveragePromptBlock(input.assetCoverage!, generationMode)
    : buildFunnelAssetPolicyBlock(input.funnelStage);

  const hookFromCandidate = Boolean(candidate?.hookLine?.trim());
  const openingFromCandidate = Boolean(candidate?.openingSituation?.trim());

  const allowedCtas =
    (CTA_TYPES_BY_GOAL as Record<string, readonly string[]>)[
      input.project.goal_type
    ] ?? [];

  return {
    version: TYPED_DECISION_PACKS_VERSION,
    productGrounding: {
      meta: meta({
        owner: "product_brain",
        decisionId: "product_grounding",
        source: "project",
        usedFallback: false,
      }),
      projectName: input.project.name,
      projectType: input.project.type,
      language: input.project.language,
      marketScope: input.project.market_scope,
      goalType: input.project.goal_type,
      productIs: [...input.project.product_is],
      productIsNot: [...input.project.product_is_not],
      productStrengths: [...input.project.product_strengths],
      painPoints: [...input.project.pain_points],
      forbiddenClaims: [...input.project.forbidden_claims],
      defaultCta: input.project.default_cta,
    },
    hook: {
      meta: meta({
        owner: "winner_candidate",
        decisionId: "hook",
        source: hookFromCandidate
          ? "candidate.hookLine"
          : "directives.hook (fallback)",
        usedFallback: !hookFromCandidate,
      }),
      hookLine: hookFromCandidate
        ? candidate!.hookLine.trim()
        : "",
      source: hookFromCandidate
        ? "winner_candidate_hookLine"
        : "creative_directive_hook_archetype",
      archetypeId: directives.hook.id,
      archetypeInstruction: directives.hook.instruction,
    },
    opening: {
      meta: meta({
        owner: "winner_candidate",
        decisionId: "opening",
        source: openingFromCandidate
          ? "candidate.openingSituation + dna.world"
          : "legacy_directive_only",
        usedFallback: !openingFromCandidate,
      }),
      openingSituation: openingFromCandidate
        ? candidate!.openingSituation.trim()
        : null,
      dnaWorld: dna?.world ?? null,
      source: openingFromCandidate
        ? "winner_candidate_opening"
        : "legacy_directive_only",
    },
    storyStructure: {
      meta: meta({
        owner: "mode_beats",
        decisionId: "story_structure",
        source: "directives.mode.narrativeBeats",
        usedFallback: false,
      }),
      modeId: directives.mode.id,
      modeName: directives.mode.name,
      beats: modeBeats.map((id, order) => ({ id, order })),
      beatArc: modeBeats.join(" -> "),
      source: "mode_beats",
    },
    emotionalArc: {
      meta: meta({
        owner: "winner_candidate",
        decisionId: "emotional_arc",
        source: candidate?.emotionalReaction
          ? "candidate.emotionalReaction"
          : "absent",
        usedFallback: !candidate?.emotionalReaction,
      }),
      emotionalReaction: candidate?.emotionalReaction?.trim() || null,
      source: candidate?.emotionalReaction ? "winner_candidate" : "absent",
    },
    voice: {
      meta: meta({
        owner: "attention_delivery",
        decisionId: "voice_emotion",
        source: "directives.persona + attention.delivery_arc",
        usedFallback: !input.attentionDeliveryArc,
      }),
      personaName: directives.persona.name,
      personaVocabulary: directives.persona.vocabulary,
      personaRhythm: directives.persona.rhythm,
      personaEnergy: directives.persona.energy,
      personaExaggeration: directives.persona.exaggeration,
      deliveryArc: input.attentionDeliveryArc ?? null,
      deliveryPromptBlock: input.attentionPromptBlock?.trim() || null,
      ttsVoiceId: input.ttsVoiceId ?? null,
    },
    visualIdentity: {
      meta: meta({
        owner: "creative_dna",
        decisionId: "visual_identity",
        source: "creativeDNA + creativeIdentity treatment",
        usedFallback: !dna,
      }),
      dnaWorld: dna?.world ?? null,
      immutableRules: dna?.immutableRules ? [...dna.immutableRules] : [],
      treatment: {
        lighting: identity?.lighting ?? null,
        composition: identity?.composition ?? null,
        colorFeel: identity?.color_feel ?? null,
        mood: identity?.mood ?? null,
        environmentTreatment: identity?.environment ?? null,
      },
      dnaPromptBlock: input.creativeDnaPromptBlock?.trim() || null,
      identityPromptBlock: input.creativeIdentityPromptBlock?.trim() || null,
    },
    characterConsistency: {
      meta: meta({
        owner: "creative_dna",
        decisionId: "character_consistency",
        source: "creativeDNA.mainCharacter",
        usedFallback: !dna?.mainCharacter,
      }),
      mainCharacter: dna?.mainCharacter ?? null,
      immutableRules: dna?.immutableRules ? [...dna.immutableRules] : [],
    },
    cameraStyle: {
      meta: meta({
        owner: "creative_identity",
        decisionId: "camera_style",
        source: identity?.camera
          ? "creativeIdentity.camera"
          : "absent",
        usedFallback: !identity?.camera,
      }),
      camera: identity?.camera ?? null,
      source: identity?.camera ? "creative_identity" : "absent",
    },
    assetPolicy: {
      meta: meta({
        owner: hasCoverage ? "asset_coverage" : "funnel_asset_policy_fallback",
        decisionId: "asset_policy",
        source: hasCoverage
          ? "resolvePackageAssetCoverage"
          : "buildFunnelAssetPolicyBlock",
        usedFallback: !hasCoverage,
      }),
      source: hasCoverage
        ? "package_asset_coverage"
        : "funnel_asset_policy_fallback",
      coverage: hasCoverage ? input.assetCoverage! : null,
      funnelStage: input.funnelStage,
      generationMode,
      promptBlock: assetPromptBlock,
    },
    cta: {
      meta: meta({
        owner: "cta_guardrails",
        decisionId: "cta",
        source: "CTA_TYPES_BY_GOAL",
        usedFallback: false,
      }),
      goalType: input.project.goal_type,
      allowedTypes: [...allowedCtas],
      defaultCtaHint: input.project.default_cta,
    },
    safety: {
      meta: meta({
        owner: "safety_guardrails",
        decisionId: "safety",
        source: "project constraints + CREATIVE SAFETY companion",
        usedFallback: false,
      }),
      productIsNot: [...input.project.product_is_not],
      forbiddenClaims: [...input.project.forbidden_claims],
      creativeSafetyOwnedByDirective: true,
    },
    platformAdaptation: {
      meta: meta({
        owner: "platform_styles",
        decisionId: "platform_adaptation",
        source: "targetPlatforms + PLATFORM_STYLE_SPECS",
        usedFallback: false,
      }),
      targetPlatforms: [...input.targetPlatforms],
      requireVideo,
      videoPlatforms: [...videoPlatforms],
    },
    jsonSchema: {
      meta: meta({
        owner: "content_package_schema",
        decisionId: "json_schema",
        source: "buildContentPackageSchema",
        usedFallback: false,
      }),
      schemaModule: "lib/ai/schemas/contentPackage.ts",
      requireVideo,
    },
  };
}
