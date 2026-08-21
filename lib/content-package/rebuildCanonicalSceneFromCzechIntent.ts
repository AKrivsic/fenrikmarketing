/**
 * Atomic T2V scene rebuild from the operator's Czech intent.
 * Updates image_prompt + motion_prompt for one canonical scene via Claude.
 * Does not call ElevenLabs or Runway. Does not change scene count, IDs, or order.
 */

import type { TextProvider } from "@/lib/ai/types";
import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  vNonEmptyString,
  vObject,
  type Validator,
} from "@/lib/ai/validateAiOutput";
import {
  extractCanonicalVideoScenesFromBrief,
  readVisualSceneId,
  readVisualScenesFromBrief,
  readVisualIdentityFromBrief,
  type CanonicalVideoScene,
} from "@/lib/content-package/canonicalVideoPlan";
import type { CreativeReview } from "@/lib/creative-review/types";
import { isEnglishPreviewCurrent } from "@/lib/creative-review/lifecycle";

export const T2V_SCENE_REBUILD_FAILED = "t2v_scene_rebuild_failed" as const;
export const T2V_SCENE_REBUILD_MISSING_INTENT =
  "t2v_scene_rebuild_missing_intent" as const;

const rebuiltVisualSchema = vObject({
  image_prompt: vNonEmptyString(),
  motion_prompt: vNonEmptyString(),
}) as Validator<{ image_prompt: string; motion_prompt: string }>;

const REBUILD_SYSTEM = `You update ONE photoreal marketing video scene from an approved operator intent.

Rules:
- Keep the same story beat. Do not invent a new plot, product claim, or extra character.
- image_prompt: 1–2 sentences, concrete still description (who/what/where). English only.
- motion_prompt: one short clause for the change during the clip (gesture, camera, object). English only.
- Do not copy the voiceover.
- Do not ask for readable on-screen text, captions, logos, or legible phone/monitor copy unless the intent is explicitly approved branded UI chrome.
- Do not mention lens mm, prompts, or rendering jargon.
- Output JSON only.`;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export interface RebuildCanonicalSceneVisualsInput {
  brief: Record<string, unknown>;
  review: CreativeReview;
  sceneId: string;
  textProvider?: TextProvider;
}

export type RebuildCanonicalSceneVisualsResult =
  | {
      ok: true;
      sceneId: string;
      image_prompt: string;
      motion_prompt: string;
    }
  | { ok: false; error: string; code: string };

export async function rebuildCanonicalSceneVisualsFromCzechIntent(
  args: RebuildCanonicalSceneVisualsInput,
): Promise<RebuildCanonicalSceneVisualsResult> {
  const canonical = extractCanonicalVideoScenesFromBrief(args.brief);
  const scene = canonical.find((entry) => entry.id === args.sceneId);
  if (!scene) {
    return {
      ok: false,
      error: "Scene is missing from the canonical storyboard.",
      code: "t2v_scene_id_mismatch",
    };
  }
  const reviewScene = args.review.scenes.find((entry) => entry.id === args.sceneId);
  const czech = reviewScene?.intent.localized_edit.trim() ?? "";
  const english = reviewScene?.intent.english_preview?.trim() ?? "";
  if (!czech) {
    return {
      ok: false,
      error: "Czech scene intent is empty.",
      code: T2V_SCENE_REBUILD_MISSING_INTENT,
    };
  }
  if (
    !reviewScene ||
    !isEnglishPreviewCurrent({
      english_preview: reviewScene.intent.english_preview,
      english_preview_outdated: reviewScene.intent.english_preview_outdated,
    })
  ) {
    return {
      ok: false,
      error: "English production preview must be current before rebuilding the scene.",
      code: "t2v_scene_en_missing",
    };
  }

  const identity = readVisualIdentityFromBrief(args.brief);
  const textProvider = args.textProvider ?? getCopywritingProvider();
  let generated: Awaited<ReturnType<typeof generateValidatedJson<{
    image_prompt: string;
    motion_prompt: string;
  }>>>;
  try {
    generated = await generateValidatedJson({
    textProvider,
    system: REBUILD_SYSTEM,
    prompt: [
      `Scene id: ${scene.id}`,
      `Czech operator intent: ${czech}`,
      `English production intent: ${english}`,
      scene.voiceover_excerpt
        ? `Bound voiceover excerpt (do not copy): ${scene.voiceover_excerpt}`
        : "",
      identity?.environment ? `Environment: ${identity.environment}` : "",
      identity?.camera_style ? `Camera style: ${identity.camera_style}` : "",
      identity?.art_direction ? `Art direction: ${identity.art_direction}` : "",
      "",
      'Return JSON: { "image_prompt": "...", "motion_prompt": "..." }',
    ]
      .filter((line) => line.length > 0)
      .join("\n"),
    validator: rebuiltVisualSchema,
    telemetry: {
      stepName: "Creative Review T2V Scene Visual Rebuild",
      inputSummary: `Rebuild still+motion for ${scene.id} from Czech intent`,
    },
    });
  } catch {
    return {
      ok: false,
      error: "Claude could not rebuild the scene visual from the Czech intent.",
      code: T2V_SCENE_REBUILD_FAILED,
    };
  }

  if (!generated.ok) {
    return {
      ok: false,
      error: "Claude could not rebuild the scene visual from the Czech intent.",
      code: T2V_SCENE_REBUILD_FAILED,
    };
  }

  const image_prompt = generated.value.image_prompt.trim().slice(0, 600);
  const motion_prompt = generated.value.motion_prompt.trim().slice(0, 200);
  if (!image_prompt || !motion_prompt) {
    return {
      ok: false,
      error: "Claude returned empty visual fields.",
      code: T2V_SCENE_REBUILD_FAILED,
    };
  }

  return {
    ok: true,
    sceneId: scene.id,
    image_prompt,
    motion_prompt,
  };
}

/**
 * Patch one visual_scenes entry. Preserves count, IDs, and order.
 */
export function applyRebuiltCanonicalSceneVisualsToBrief(args: {
  brief: Record<string, unknown>;
  sceneId: string;
  image_prompt: string;
  motion_prompt: string;
}): Record<string, unknown> {
  const scenes = readVisualScenesFromBrief(args.brief);
  if (scenes.length === 0) {
    throw new Error("t2v_canonical_storyboard_missing");
  }
  let found = false;
  const next = scenes.map((entry, index) => {
    const id = readVisualSceneId(entry, index);
    if (id !== args.sceneId) return entry;
    found = true;
    const record = { ...(asRecord(entry) ?? {}) };
    record.image_prompt = args.image_prompt;
    record.motion_prompt = args.motion_prompt;
    const payload = asRecord(record.payload);
    if (payload) {
      record.payload = {
        ...payload,
        image_prompt: args.image_prompt,
        motion_prompt: args.motion_prompt,
      };
    }
    return record as unknown as typeof entry;
  });
  if (!found) {
    throw new Error("t2v_scene_id_mismatch");
  }
  if (next.length !== scenes.length) {
    throw new Error("t2v_scene_count_mismatch");
  }
  const idsBefore = scenes.map((entry, index) => readVisualSceneId(entry, index));
  const idsAfter = next.map((entry, index) => readVisualSceneId(entry, index));
  if (idsBefore.join("|") !== idsAfter.join("|")) {
    throw new Error("t2v_scene_id_mismatch");
  }
  return {
    ...args.brief,
    visual_scenes: next,
  };
}

export function canonicalSceneAfterPatch(
  brief: Record<string, unknown>,
  sceneId: string,
): CanonicalVideoScene | null {
  return (
    extractCanonicalVideoScenesFromBrief(brief).find((scene) => scene.id === sceneId) ??
    null
  );
}
