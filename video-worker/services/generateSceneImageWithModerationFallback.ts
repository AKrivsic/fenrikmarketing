import type { ImageProvider } from "@/lib/ai/types";
import {
  ImageProviderHttpError,
  isImageModerationBlocked,
  isNonRetryableImageProviderError,
} from "@/lib/ai/imageProviderHttpError";
import { VIDEO_SCENE_IMAGE_SIZE } from "@/lib/video-engine/videoSceneImageSize";
import type { SceneRasterPrepareContext } from "@/lib/scene-types/renderers/types";
import type { ChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import { loadRenderBrandTokensForWorker } from "@/video-worker/services/loadRenderBrandTokens";
import { writeLocalBrandedSceneFallbackPng } from "@/video-worker/services/localBrandedSceneFallback";
import {
  buildModerationSafeRetryPrompt,
  promptLogPreview,
} from "@/video-worker/services/imageModerationFallbackPrompt";
import { resolveImageBytes } from "@/video-worker/services/resolveImageBytes";

export interface SceneImageGenerationMeta {
  original_generation_blocked?: boolean;
  safe_retry_attempted?: boolean;
  safe_retry_succeeded?: boolean;
  local_fallback_used?: boolean;
  provider_error_code?: string;
  moderation_stage?: string;
}

function metaFromError(err: unknown): Partial<SceneImageGenerationMeta> {
  if (!(err instanceof ImageProviderHttpError)) return {};
  return {
    provider_error_code: err.errorCode,
    moderation_stage: err.moderationStage,
  };
}

async function requestImageBytes(
  provider: ImageProvider,
  prompt: string,
): Promise<Buffer> {
  const generated = await provider.generateImage({
    prompt,
    size: VIDEO_SCENE_IMAGE_SIZE,
  });
  return resolveImageBytes(generated.imageBase64, generated.imageUrl);
}

export async function generateSceneImageWithModerationFallback(args: {
  provider: ImageProvider;
  ctx: SceneRasterPrepareContext;
  sceneId: string;
  primaryPrompt: string;
  profileSuffix: string;
  outputPath: string;
  /** Test hook: skip Supabase when exercising local branded fallback. */
  brandTokensForLocalFallback?: ChecklistBrandTokens;
}): Promise<{ meta: SceneImageGenerationMeta }> {
  const { provider, ctx, sceneId, primaryPrompt, profileSuffix, outputPath } =
    args;
  const meta: SceneImageGenerationMeta = {};
  const logBase = {
    video_job_id: ctx.videoJobId,
    scene_id: sceneId,
  };

  const logAttempt = (attempt: number, prompt: string) => {
    console.log(
      "[video-worker] image generation attempt",
      JSON.stringify({
        ...logBase,
        attempt,
        prompt_chars: prompt.length,
        prompt_preview: promptLogPreview(prompt),
      }),
    );
  };

  try {
    logAttempt(1, primaryPrompt);
    const bytes = await requestImageBytes(provider, primaryPrompt);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(outputPath, bytes);
    return { meta };
  } catch (firstErr) {
    if (isNonRetryableImageProviderError(firstErr)) {
      throw firstErr;
    }
    if (!isImageModerationBlocked(firstErr)) {
      throw firstErr;
    }

    Object.assign(meta, metaFromError(firstErr));
    meta.original_generation_blocked = true;

    console.warn(
      "[video-worker] image moderation blocked; safe retry",
      JSON.stringify({
        ...logBase,
        provider_error_code: meta.provider_error_code ?? null,
        moderation_stage: meta.moderation_stage ?? null,
      }),
    );

    meta.safe_retry_attempted = true;
    const retryPrompt = buildModerationSafeRetryPrompt({
      originalPrompt: primaryPrompt,
      profileSuffix,
    });

    try {
      logAttempt(2, retryPrompt);
      const bytes = await requestImageBytes(provider, retryPrompt);
      const { writeFile } = await import("node:fs/promises");
      await writeFile(outputPath, bytes);
      meta.safe_retry_succeeded = true;
      console.log(
        "[video-worker] image safe retry succeeded",
        JSON.stringify(logBase),
      );
      return { meta };
    } catch (retryErr) {
      if (isNonRetryableImageProviderError(retryErr)) {
        throw retryErr;
      }
      if (!isImageModerationBlocked(retryErr)) {
        throw retryErr;
      }

      console.warn(
        "[video-worker] image safe retry blocked; local branded fallback",
        JSON.stringify({
          ...logBase,
          provider_error_code: metaFromError(retryErr).provider_error_code ?? null,
        }),
      );

      const tokens =
        args.brandTokensForLocalFallback ??
        (await loadRenderBrandTokensForWorker(ctx));
      await writeLocalBrandedSceneFallbackPng({
        outputPath,
        tokens,
      });
      meta.local_fallback_used = true;
      return { meta };
    }
  }
}
