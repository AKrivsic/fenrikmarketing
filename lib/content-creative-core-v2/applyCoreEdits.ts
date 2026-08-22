/**
 * Apply operator VO / scene edits to Creative Core v2 without Claude.
 */

import { fingerprintFromCreativeCore } from "@/lib/content-creative-core-v2/fingerprint";
import {
  redistributeVoiceoverAcrossScenes,
  voiceoverCoveredExactlyOnce,
} from "@/lib/content-creative-core-v2/redistributeVoiceover";
import type {
  ContentCreativeCoreV2,
  CreativeCoreV2Scene,
} from "@/lib/content-creative-core-v2/types";

export type ApplyCoreVoiceoverEditResult =
  | {
      ok: true;
      core: ContentCreativeCoreV2;
      preliminary_durations_seconds: number[];
      media_projections_stale: true;
    }
  | { ok: false; error: string };

export function applyCreativeCoreVoiceoverEdit(args: {
  core: ContentCreativeCoreV2;
  newVoiceover: string;
  painPoint?: string | null;
}): ApplyCoreVoiceoverEditResult {
  const voiceover = args.newVoiceover.trim();
  if (!voiceover) return { ok: false, error: "voiceover_empty" };

  if (args.core.scenes.length === 0) {
    // Text-only: update VO only.
    const next: ContentCreativeCoreV2 = {
      ...args.core,
      voiceover,
      creative_fingerprint: fingerprintFromCreativeCore({
        ...args.core,
        pain_point: args.painPoint ?? null,
      }),
    };
    return {
      ok: true,
      core: next,
      preliminary_durations_seconds: [],
      media_projections_stale: true,
    };
  }

  const split = redistributeVoiceoverAcrossScenes({
    voiceover,
    scenes: args.core.scenes,
  });
  if (!split.ok) return { ok: false, error: split.error };

  const next: ContentCreativeCoreV2 = {
    ...args.core,
    // Hook / core_idea / scene visuals intentionally unchanged.
    voiceover,
    scenes: split.scenes,
    creative_fingerprint: fingerprintFromCreativeCore({
      ...args.core,
      scenes: split.scenes,
      pain_point: args.painPoint ?? null,
    }),
  };

  if (!voiceoverCoveredExactlyOnce(voiceover, next.scenes)) {
    return { ok: false, error: "voiceover_coverage_mismatch" };
  }

  return {
    ok: true,
    core: next,
    preliminary_durations_seconds: split.preliminary_durations_seconds,
    media_projections_stale: true,
  };
}

export type ApplyCoreSceneEditResult =
  | { ok: true; core: ContentCreativeCoreV2; media_projections_stale: true }
  | { ok: false; error: string };

export function applyCreativeCoreSceneEdit(args: {
  core: ContentCreativeCoreV2;
  sceneId: string;
  patch: Partial<
    Pick<
      CreativeCoreV2Scene,
      | "visual_event"
      | "motion_or_change"
      | "emotion"
      | "sound_intent"
      | "action"
      | "subjects"
      | "environment"
      | "camera_intent"
      | "continuity_hints"
      | "screen_policy"
    >
  >;
  painPoint?: string | null;
}): ApplyCoreSceneEditResult {
  const idx = args.core.scenes.findIndex((s) => s.scene_id === args.sceneId);
  if (idx < 0) return { ok: false, error: "scene_not_found" };

  const scenes = args.core.scenes.map((scene, i) => {
    if (i !== idx) return scene;
    return {
      ...scene,
      ...args.patch,
      // Never allow VO excerpt / id / order changes via scene edit.
      scene_id: scene.scene_id,
      order: scene.order,
      voiceover_excerpt: scene.voiceover_excerpt,
    };
  });

  const next: ContentCreativeCoreV2 = {
    ...args.core,
    // Hook + voiceover unchanged.
    scenes,
    creative_fingerprint: fingerprintFromCreativeCore({
      ...args.core,
      scenes,
      pain_point: args.painPoint ?? null,
    }),
  };

  return { ok: true, core: next, media_projections_stale: true };
}
