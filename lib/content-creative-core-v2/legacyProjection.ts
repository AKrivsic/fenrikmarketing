/**
 * Mechanical legacy projection from Content Creative Core v2.
 * Never invents creative content. Never writes back into the Core.
 */

import {
  CREATIVE_CORE_V2_BRIEF_KEY,
  CREATIVE_CORE_V2_CONTRACT_VERSION,
  CREATIVE_CORE_V2_FINGERPRINT_VERSION,
} from "@/lib/content-creative-core-v2/config";
import type {
  ContentCreativeCoreV2,
  CreativeCorePackageKind,
} from "@/lib/content-creative-core-v2/types";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import { T2V_CANONICAL_CREATIVE_CONTRACT_VERSION } from "@/lib/content-package/t2vCanonicalCreative";

export const CREATIVE_CORE_V2_PROVENANCE_KEY =
  "content_creative_core_v2_provenance" as const;

export interface CreativeCoreV2Provenance {
  source: "content_creative_core_v2";
  contract_version: typeof CREATIVE_CORE_V2_CONTRACT_VERSION;
  fingerprint_version: typeof CREATIVE_CORE_V2_FINGERPRINT_VERSION;
  projected_at: string;
  /** Fields in this snapshot were derived, not authored. */
  derived_only: true;
  voiceover_soft_clamp?: {
    applied: boolean;
    words_before: number;
    words_after: number;
  };
}

export const CREATIVE_CORE_V2_LEGACY_PROJECTION_FAILED =
  "creative_core_v2_legacy_projection_failed" as const;

export function stampCreativeCoreV2Provenance(
  projectedAt: string = new Date().toISOString(),
): CreativeCoreV2Provenance {
  return {
    source: "content_creative_core_v2",
    contract_version: CREATIVE_CORE_V2_CONTRACT_VERSION,
    fingerprint_version: CREATIVE_CORE_V2_FINGERPRINT_VERSION,
    projected_at: projectedAt,
    derived_only: true,
  };
}

/**
 * Build a ContentPackageOutput-compatible object from Core.
 * Platform outputs are deferred placeholders for Step 3 (not final copy).
 */
export function projectCreativeCoreToLegacyPackage(args: {
  core: ContentCreativeCoreV2;
  packageKind: CreativeCorePackageKind;
  funnelStage: string;
  targetPlatforms: readonly string[];
  projectedAt?: string;
  provenanceExtras?: Partial<
    Pick<CreativeCoreV2Provenance, "voiceover_soft_clamp">
  >;
}):
  | { ok: true; package: ContentPackageOutput; provenance: CreativeCoreV2Provenance }
  | { ok: false; error: typeof CREATIVE_CORE_V2_LEGACY_PROJECTION_FAILED; detail: string } {
  const { core, packageKind, funnelStage } = args;
  void args.targetPlatforms;
  const projectedAt = args.projectedAt ?? new Date().toISOString();
  const provenance: CreativeCoreV2Provenance = {
    ...stampCreativeCoreV2Provenance(projectedAt),
    ...args.provenanceExtras,
  };

  if (!core.hook.trim() || !core.voiceover.trim() || !core.core_idea.trim()) {
    return {
      ok: false,
      error: CREATIVE_CORE_V2_LEGACY_PROJECTION_FAILED,
      detail: "missing_core_fields",
    };
  }
  if (packageKind === "video" && core.scenes.length < 1) {
    return {
      ok: false,
      error: CREATIVE_CORE_V2_LEGACY_PROJECTION_FAILED,
      detail: "video_requires_scenes",
    };
  }
  if (packageKind === "text_only" && core.scenes.length > 0) {
    return {
      ok: false,
      error: CREATIVE_CORE_V2_LEGACY_PROJECTION_FAILED,
      detail: "text_only_must_have_empty_scenes",
    };
  }

  const visual_scenes =
    packageKind === "video"
      ? core.scenes.map((scene) => ({
          id: scene.scene_id,
          source: "ai" as const,
          image_prompt: scene.visual_event,
          motion_prompt: scene.motion_or_change,
          voiceover_excerpt: scene.voiceover_excerpt,
          environment: scene.environment,
          characters_action: [scene.subjects, scene.action].filter(Boolean).join(" — "),
          camera: scene.camera_intent,
          emotion: scene.emotion,
          sound_intent: scene.sound_intent,
          screen_policy: scene.screen_policy,
          continuity_hints: scene.continuity_hints,
        }))
      : [];

  // Step 3: do not invent platform copy. Derived outputs are created after
  // Approve. Empty object prevents placeholder content_items.
  const platform_outputs = {} as ContentPackageOutput["platform_outputs"];

  const firstImage = visual_scenes[0]?.image_prompt ?? "";

  const pkg = {
    title: core.core_idea.slice(0, 120),
    funnel_stage: funnelStage,
    hook: core.hook,
    voiceover_text: core.voiceover,
    cta: { type: "other", text: core.cta_intent },
    visual_scenes,
    image_prompts: visual_scenes.map((s) => s.image_prompt),
    video: {
      concept: core.core_idea,
      script: core.voiceover,
    },
    platform_outputs,
    presentation_generation: {
      pipeline: "content_creative_core_v2",
      [CREATIVE_CORE_V2_PROVENANCE_KEY]: provenance,
      video_concept: {
        title: core.core_idea.slice(0, 80),
        core_idea: core.core_idea,
        narrative_arc: core.visible_change,
        emotional_tone: core.main_emotion,
        audience_insight: core.conflict,
        product_role: "",
        why_it_works: core.payoff,
        visual_direction: {
          art_direction: "",
          lighting: "",
          palette: "",
          environment: core.scenes[0]?.environment ?? "",
          camera_style: "Scene-specific. Derived from Creative Core v2.",
          character_style: core.scenes[0]?.subjects ?? "",
        },
      },
      opening_impact: {
        first_image: firstImage,
        first_spoken_sentence: core.hook,
        emotion: core.main_emotion,
        pacing: "",
        attention_pattern: "",
      },
      visual_identity: {
        art_direction: "",
        lighting: "",
        palette: "",
        environment: core.scenes[0]?.environment ?? "",
        camera_style: "Scene-specific. Derived from Creative Core v2.",
        character_style: core.scenes[0]?.subjects ?? "",
        opening_emotion: core.main_emotion,
        opening_first_image: firstImage,
      },
    },
    t2v_canonical_creative: {
      contract_version: T2V_CANONICAL_CREATIVE_CONTRACT_VERSION,
      core_idea: core.core_idea,
      primary_emotion: core.main_emotion,
      conflict: core.conflict,
      surprise: core.reveal_or_surprise,
      beginning_to_end_change: core.visible_change,
      payoff: core.payoff,
      visual_direction: {
        art_direction: "",
        lighting: "",
        palette: "",
        environment: core.scenes[0]?.environment ?? "",
        character_style: core.scenes[0]?.subjects ?? "",
      },
      [CREATIVE_CORE_V2_PROVENANCE_KEY]: provenance,
    },
    [CREATIVE_CORE_V2_BRIEF_KEY]: core,
    [CREATIVE_CORE_V2_PROVENANCE_KEY]: provenance,
    // Step 2: defer real platform copy + social image.
    social_image: undefined,
  } as unknown as ContentPackageOutput;

  return { ok: true, package: pkg, provenance };
}

export function readCreativeCoreV2FromBrief(
  brief: Record<string, unknown> | null | undefined,
): ContentCreativeCoreV2 | null {
  if (!brief) return null;
  const raw = brief[CREATIVE_CORE_V2_BRIEF_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const core = raw as ContentCreativeCoreV2;
  if (core.contract_version !== CREATIVE_CORE_V2_CONTRACT_VERSION) return null;
  return core;
}

export function briefUsesCreativeCoreV2(
  brief: Record<string, unknown> | null | undefined,
): boolean {
  return readCreativeCoreV2FromBrief(brief) != null;
}
