import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import type { SceneImageGenerationWarning } from "@/lib/video-engine/sceneImageGenerationMeta";
import type { CreativeIdentity } from "@/lib/creative-identity/types";
import { prepareSceneRaster } from "@/lib/scene-types/renderers/types";
import { ensureSceneRendererRegistry } from "@/video-worker/services/sceneRendererRegistry";
import {
  estimateImageCostUsd,
  IMAGE_USD_PER_STILL,
  PRICING_VERSION,
  withTelemetry,
} from "@/lib/ai/telemetry";

export interface GenerateSceneImagesInput {
  scenes: Scene[];
  projectId: string;
  videoJobId: string;
  visualProfile?: string;
  visualProfileVersion?: string;
  visualMedium?: string;
  visualMediumVersion?: string;
  creativeIdentity?: CreativeIdentity | null;
  /** Sprint 5.3.2 — language-variant jobs: reuse only, never generate. */
  forbidImageGeneration?: boolean;
  isLanguageVariant?: boolean;
}

export interface SceneImage {
  sceneId: string;
  imagePath: string;
  reusedBucket?: string;
  reusedPath?: string;
  imageGenerationWarning?: SceneImageGenerationWarning;
}

export interface GenerateSceneImagesResult {
  images: SceneImage[];
  reusedVisualAssetCount: number;
  generatedImageCount: number;
  manuallyAssignedLanguageAssetCount: number;
}

// Resolves one still PNG per scene via the SceneRenderer registry (IMAGE in Phase 2).
export async function generateSceneImages(
  input: GenerateSceneImagesInput,
): Promise<SceneImage[]> {
  const result = await generateSceneImagesWithTelemetry(input);
  return result.images;
}

export async function generateSceneImagesWithTelemetry(
  input: GenerateSceneImagesInput,
): Promise<GenerateSceneImagesResult> {
  return withTelemetry(
    {
      stepName: "Image generation",
      provider: "image",
      model: "gpt-image-1",
      inputSummary: `Image generation input:\n- ${input.scenes.length} scene(s)\n- Visual profile / medium`,
      outputSummary: (r) =>
        `generated=${r.generatedImageCount}; reused=${r.reusedVisualAssetCount}`,
      measureOutput: (r) => ({
        generatedImageCount: r.generatedImageCount,
        reusedVisualAssetCount: r.reusedVisualAssetCount,
        sceneCount: r.images.length,
      }),
      estimatedCostFromResult: (r) => estimateImageCostUsd(r.generatedImageCount),
      pricingVersion: PRICING_VERSION,
      rawUsageFromResult: (r) => ({
        generated_still_count: r.generatedImageCount,
        reused_still_count: r.reusedVisualAssetCount,
        usd_per_still: IMAGE_USD_PER_STILL,
      }),
    },
    () => generateSceneImagesWithTelemetryInner(input),
  );
}

async function generateSceneImagesWithTelemetryInner(
  input: GenerateSceneImagesInput,
): Promise<GenerateSceneImagesResult> {
  const { scenes } = input;
  if (scenes.length === 0) {
    throw new Error("generateSceneImages: at least one scene is required");
  }

  ensureSceneRendererRegistry();

  const forbid = Boolean(input.forbidImageGeneration || input.isLanguageVariant);

  const ctx = {
    projectId: input.projectId,
    videoJobId: input.videoJobId,
    visualProfile: input.visualProfile,
    visualProfileVersion: input.visualProfileVersion,
    visualMedium: input.visualMedium,
    visualMediumVersion: input.visualMediumVersion,
    creativeIdentity: input.creativeIdentity ?? null,
    forbidImageGeneration: forbid,
    isLanguageVariant: Boolean(input.isLanguageVariant) || forbid,
  };

  const results: SceneImage[] = [];
  let reusedVisualAssetCount = 0;
  let generatedImageCount = 0;
  let manuallyAssignedLanguageAssetCount = 0;

  for (const scene of scenes) {
    if (forbid) {
      const bucket =
        typeof scene.image_bucket === "string" ? scene.image_bucket.trim() : "";
      const path =
        typeof scene.image_path === "string" ? scene.image_path.trim() : "";
      if (!bucket || !path) {
        throw new Error(
          `language_variant_visual_asset_missing: scene ${scene.id} missing image_bucket/image_path; image generation forbidden`,
        );
      }
    }

    const prepared = await prepareSceneRaster(scene, ctx);
    const reused = Boolean(prepared.reusedBucket && prepared.reusedPath);
    if (reused) {
      reusedVisualAssetCount += 1;
    } else {
      generatedImageCount += 1;
    }

    const manual =
      (scene as Scene & { language_variant_manual_visual?: boolean })
        .language_variant_manual_visual === true ||
      (scene as Scene & { manual_language_visual?: boolean })
        .manual_language_visual === true;
    if (manual) manuallyAssignedLanguageAssetCount += 1;

    results.push({
      sceneId: prepared.sceneId,
      imagePath: prepared.imagePath,
      ...(prepared.reusedBucket ? { reusedBucket: prepared.reusedBucket } : {}),
      ...(prepared.reusedPath ? { reusedPath: prepared.reusedPath } : {}),
      ...(prepared.imageGenerationWarning
        ? { imageGenerationWarning: prepared.imageGenerationWarning }
        : {}),
    });
  }

  console.log(
    "[video-worker] scene image telemetry",
    JSON.stringify({
      video_job_id: input.videoJobId,
      is_language_variant: ctx.isLanguageVariant,
      reused_visual_asset_count: reusedVisualAssetCount,
      manually_assigned_language_asset_count: manuallyAssignedLanguageAssetCount,
      generated_image_count: generatedImageCount,
    }),
  );

  if (forbid && generatedImageCount > 0) {
    throw new Error(
      `language_variant_visual_invariant_violation: generated_image_count=${generatedImageCount} (must be 0)`,
    );
  }

  return {
    images: results,
    reusedVisualAssetCount,
    generatedImageCount,
    manuallyAssignedLanguageAssetCount,
  };
}
