import { access } from "node:fs/promises";
import { buildSceneVideoGenerationPlanFromRenderScenes } from "@/lib/scene-video-plan";
import { renderSpecOutputSchema } from "@/lib/video-engine/schemas/renderSchema";
import { validateDurableStorageIdentity } from "@/lib/video-engine/videoClipReadiness";
import type {
  PrepareVideoReelAssemblyInput,
  PrepareVideoReelAssemblyResult,
} from "@/lib/video-reel-assembly/types";

async function pathExists(path: string | undefined): Promise<boolean> {
  if (!path?.trim()) return false;
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Phase A — plan + cost + asset availability. No Runway, no attempts writes.
 */
export async function prepareVideoReelAssembly(
  input: PrepareVideoReelAssemblyInput,
): Promise<PrepareVideoReelAssemblyResult> {
  const voiceoverText = input.voiceoverText?.trim();
  if (!voiceoverText) {
    return { ok: false, reason: "voiceover_missing" };
  }

  const parsed = renderSpecOutputSchema.safeParse(input.renderSpec);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid_render_spec",
      detail: parsed.error.message.slice(0, 500),
    };
  }
  const renderSpec = parsed.data;

  const plan = buildSceneVideoGenerationPlanFromRenderScenes(
    renderSpec.scenes.map((s) => ({
      id: s.id,
      image_prompt: s.image_prompt,
      duration_seconds: s.duration_seconds,
      image_bucket: s.image_bucket,
      image_path: s.image_path,
      motion_prompt: s.motion_prompt,
      transition_in: s.transition_in,
      type: s.type,
    })),
    { dryRun: true },
  );

  if (plan.preparableSceneCount !== plan.sceneCount) {
    return {
      ok: false,
      reason: "plan_not_fully_preparable",
      detail: plan.unpreparableSceneIds.join(","),
    };
  }

  if (input.music) {
    const id = validateDurableStorageIdentity(
      input.music.bucket,
      input.music.path,
    );
    if (!id.ok) {
      return {
        ok: false,
        reason: "invalid_render_spec",
        detail: `music_${id.issue}`,
      };
    }
  }
  if (input.ambient) {
    const id = validateDurableStorageIdentity(
      input.ambient.bucket,
      input.ambient.path,
    );
    if (!id.ok) {
      return {
        ok: false,
        reason: "invalid_render_spec",
        detail: `ambient_${id.issue}`,
      };
    }
  }

  return {
    ok: true,
    renderSpec,
    plan,
    sceneCount: renderSpec.scenes.length,
    voiceoverTextPresent: true,
    voiceoverLocalPathPresent: await pathExists(input.voiceoverLocalPath),
    subtitlesAvailable: await pathExists(input.subtitlesLocalPath),
    musicRefPresent: Boolean(input.music?.bucket && input.music?.path),
    ambientRefPresent: Boolean(input.ambient?.bucket && input.ambient?.path),
  };
}
