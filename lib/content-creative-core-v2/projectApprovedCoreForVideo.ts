/**
 * Deterministic projection of approved Creative Core → package fields for
 * still / T2V video jobs. Never invents story. Never calls creative AI.
 */

import { CREATIVE_CORE_V2_BRIEF_KEY } from "@/lib/content-creative-core-v2/config";
import {
  CREATIVE_CORE_V2_APPROVED_SNAPSHOT_KEY,
  readApprovedCreativeCoreSnapshot,
  type CreativeCoreV2ApprovedSnapshot,
} from "@/lib/content-creative-core-v2/approvedSnapshot";
import {
  CREATIVE_CORE_V2_PROVENANCE_KEY,
  stampCreativeCoreV2Provenance,
} from "@/lib/content-creative-core-v2/legacyProjection";
import type { ContentCreativeCoreV2 } from "@/lib/content-creative-core-v2/types";
import { T2V_CANONICAL_CREATIVE_CONTRACT_VERSION } from "@/lib/content-package/t2vCanonicalCreative";

export const CREATIVE_CORE_V2_VIDEO_PROJECTION_KEY =
  "content_creative_core_v2_video_projection" as const;

/** Soft wait state — no video job until paid confirmation/budget pass. */
export const CREATIVE_CORE_V2_AWAITING_PAID_VIDEO_KEY =
  "content_creative_core_v2_awaiting_paid_video" as const;

/** @deprecated Use CREATIVE_CORE_V2_AWAITING_PAID_VIDEO_KEY */
export const CREATIVE_CORE_V2_MEDIA_BLOCKED_KEY =
  CREATIVE_CORE_V2_AWAITING_PAID_VIDEO_KEY;

export function projectApprovedCoreScenesToVisualScenes(
  core: ContentCreativeCoreV2,
): Array<Record<string, unknown>> {
  return [...core.scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene) => ({
      id: scene.scene_id,
      source: "ai",
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
      [CREATIVE_CORE_V2_PROVENANCE_KEY]: stampCreativeCoreV2Provenance(),
    }));
}

/**
 * Stamp package_brief fields that buildVideoJobInput / still+T2V workers read,
 * sourced only from the approved snapshot.
 */
export function applyApprovedCoreToPackageBriefForVideo(args: {
  brief: Record<string, unknown>;
  snapshot?: CreativeCoreV2ApprovedSnapshot | null;
}):
  | { ok: true; brief: Record<string, unknown> }
  | { ok: false; error: string } {
  const snapshot =
    args.snapshot ?? readApprovedCreativeCoreSnapshot(args.brief);
  if (!snapshot) {
    return { ok: false, error: "approved_creative_core_missing" };
  }
  const core = snapshot.core;
  const voiceover = snapshot.production_voiceover_en.trim() || core.voiceover;
  if (!voiceover) {
    return { ok: false, error: "approved_voiceover_missing" };
  }
  const visual_scenes = projectApprovedCoreScenesToVisualScenes(core);
  const provenance = stampCreativeCoreV2Provenance();
  const firstImage =
    typeof visual_scenes[0]?.image_prompt === "string"
      ? (visual_scenes[0].image_prompt as string)
      : "";

  const pgRaw =
    args.brief.presentation_generation &&
    typeof args.brief.presentation_generation === "object" &&
    !Array.isArray(args.brief.presentation_generation)
      ? (args.brief.presentation_generation as Record<string, unknown>)
      : {};

  const next: Record<string, unknown> = {
    ...args.brief,
    [CREATIVE_CORE_V2_BRIEF_KEY]: core,
    [CREATIVE_CORE_V2_APPROVED_SNAPSHOT_KEY]: snapshot,
    hook: core.hook,
    voiceover_text: voiceover,
    subtitles: voiceover,
    visual_scenes,
    image_prompts: visual_scenes.map((s) =>
      typeof s.image_prompt === "string" ? s.image_prompt : "",
    ),
    video: {
      concept: core.core_idea,
      script: voiceover,
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
    presentation_generation: {
      ...pgRaw,
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
    [CREATIVE_CORE_V2_VIDEO_PROJECTION_KEY]: {
      projected_at: provenance.projected_at,
      source_approved_locked_at: snapshot.locked_at,
      scene_count: visual_scenes.length,
      derived_only: true,
    },
  };

  return { ok: true, brief: next };
}

export function briefUsesApprovedCreativeCoreV2(
  brief: Record<string, unknown> | null | undefined,
): boolean {
  return readApprovedCreativeCoreSnapshot(brief) != null;
}
