/**
 * Rasterize + persist the package-level Facebook/LinkedIn social image.
 * Soft-fail: never throws to callers after logging; package/video/copy remain.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getImageProvider } from "@/lib/ai/index";
import {
  ImageProviderHttpError,
  isImageModerationBlocked,
  isNonRetryableImageProviderError,
} from "@/lib/ai/imageProviderHttpError";
import {
  estimateImageCostUsd,
  IMAGE_USD_PER_STILL,
  PRICING_VERSION,
} from "@/lib/ai/telemetry/cost";
import { withTelemetry } from "@/lib/ai/telemetry";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { Json } from "@/lib/supabase/types";
import { STORAGE_BUCKETS, buildGeneratedVisualPath } from "@/lib/api/storage";
import { resolveImageBytes } from "@/video-worker/services/resolveImageBytes";
import {
  buildModerationSafeRetryPrompt,
  promptLogPreview,
} from "@/video-worker/services/imageModerationFallbackPrompt";
import {
  SOCIAL_IMAGE_ASPECT,
  SOCIAL_IMAGE_SIZE,
  SOCIAL_IMAGE_USED_AS,
  buildSocialImageProviderPrompt,
  normalizeSocialImageCreative,
  packageNeedsSocialImage,
  socialImagePlatformsPresent,
  type PackageSocialImage,
  type SocialImageCreative,
  type SocialImagePlatform,
} from "@/lib/content-package/socialImage";

const SOCIAL_IMAGE_MODEL = "gpt-image-1";
const SOCIAL_IMAGE_FILENAME = "social-image.png";

export interface GeneratePackageSocialImageResult {
  attempted: boolean;
  generated: boolean;
  socialImage: PackageSocialImage | null;
}

async function requestSquareImageBytes(
  prompt: string,
): Promise<{ bytes: Buffer; model: string; provider: string }> {
  const provider = getImageProvider();
  const generated = await provider.generateImage({
    prompt,
    size: SOCIAL_IMAGE_SIZE,
    model: SOCIAL_IMAGE_MODEL,
  });
  const bytes = await resolveImageBytes(generated.imageBase64, generated.imageUrl);
  return {
    bytes,
    model: generated.model || SOCIAL_IMAGE_MODEL,
    provider: generated.provider || provider.name,
  };
}

async function generateSquareBytesWithModerationRetry(
  creative: SocialImageCreative,
): Promise<{ bytes: Buffer; model: string; provider: string }> {
  const primaryPrompt = buildSocialImageProviderPrompt(creative);
  const logBase = {
    prompt_chars: primaryPrompt.length,
    prompt_preview: promptLogPreview(primaryPrompt),
  };

  try {
    console.log(
      "[social-image] generation attempt",
      JSON.stringify({ ...logBase, attempt: 1 }),
    );
    return await requestSquareImageBytes(primaryPrompt);
  } catch (firstErr) {
    if (isNonRetryableImageProviderError(firstErr)) throw firstErr;
    if (!isImageModerationBlocked(firstErr)) throw firstErr;

    const code =
      firstErr instanceof ImageProviderHttpError ? firstErr.errorCode : null;
    console.warn(
      "[social-image] moderation blocked; safe retry",
      JSON.stringify({ provider_error_code: code }),
    );

    const retryPrompt = buildModerationSafeRetryPrompt({
      originalPrompt: primaryPrompt,
      profileSuffix:
        "Compose as a clean professional 1:1 square social feed image with no readable text.",
    });
    console.log(
      "[social-image] generation attempt",
      JSON.stringify({
        attempt: 2,
        prompt_chars: retryPrompt.length,
        prompt_preview: promptLogPreview(retryPrompt),
      }),
    );
    return await requestSquareImageBytes(retryPrompt);
  }
}

async function persistSocialImageBytes(args: {
  supabase: SupabaseClient;
  projectId: string;
  packageId: string;
  creative: SocialImageCreative;
  platforms: SocialImagePlatform[];
  bytes: Buffer;
  model: string;
  facebookItemId: string | null;
  linkedinItemId: string | null;
}): Promise<PackageSocialImage> {
  const {
    supabase,
    projectId,
    packageId,
    creative,
    platforms,
    bytes,
    model,
    facebookItemId,
    linkedinItemId,
  } = args;

  const { data: assetRow, error: assetErr } = await supabase
    .from("assets")
    .insert({
      project_id: projectId,
      title: `Social image — ${packageId.slice(0, 8)}`,
      media_type: "image",
      asset_mode: "generated",
      mime_type: "image/png",
      tags: ["social_image", "facebook", "linkedin"],
      metadata: {
        role: "social_image",
        package_id: packageId,
        aspect: SOCIAL_IMAGE_ASPECT,
        size: SOCIAL_IMAGE_SIZE,
        platforms,
        image_prompt: creative.image_prompt,
        text_overlay: creative.text_overlay ?? null,
      } as unknown as Json,
    })
    .select("id")
    .single();
  if (assetErr) throw assetErr;
  const assetId = assetRow.id as string;

  const { data: visualRow, error: visualErr } = await supabase
    .from("ai_visuals")
    .insert({
      project_id: projectId,
      prompt: creative.image_prompt,
      image_provider: "openai",
      image_model: model,
      asset_id: assetId,
      content_item_id: facebookItemId ?? linkedinItemId,
      status: "completed",
      provider_metadata: {
        role: "social_image",
        package_id: packageId,
        size: SOCIAL_IMAGE_SIZE,
        text_overlay: creative.text_overlay ?? null,
        platforms,
      } as unknown as Json,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (visualErr) {
    await supabase.from("assets").delete().eq("id", assetId);
    throw visualErr;
  }
  const aiVisualId = visualRow.id as string;

  const storagePath = buildGeneratedVisualPath(
    projectId,
    aiVisualId,
    SOCIAL_IMAGE_FILENAME,
  );
  const bucket = STORAGE_BUCKETS.generatedVisuals;

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, {
      contentType: "image/png",
      upsert: false,
    });
  if (uploadErr) {
    await supabase.from("ai_visuals").delete().eq("id", aiVisualId);
    await supabase.from("assets").delete().eq("id", assetId);
    throw uploadErr;
  }

  const { error: assetUpdateErr } = await supabase
    .from("assets")
    .update({
      storage_bucket: bucket,
      storage_path: storagePath,
    })
    .eq("id", assetId);
  if (assetUpdateErr) throw assetUpdateErr;

  const { error: visualUpdateErr } = await supabase
    .from("ai_visuals")
    .update({
      result_bucket: bucket,
      result_path: storagePath,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", aiVisualId);
  if (visualUpdateErr) throw visualUpdateErr;

  const usageRows = [
    facebookItemId
      ? {
          project_id: projectId,
          asset_id: assetId,
          content_item_id: facebookItemId,
          used_as: SOCIAL_IMAGE_USED_AS,
          metadata: {
            package_id: packageId,
            platforms,
            shared: true,
          } as unknown as Json,
        }
      : null,
    linkedinItemId
      ? {
          project_id: projectId,
          asset_id: assetId,
          content_item_id: linkedinItemId,
          used_as: SOCIAL_IMAGE_USED_AS,
          metadata: {
            package_id: packageId,
            platforms,
            shared: true,
          } as unknown as Json,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  if (usageRows.length > 0) {
    const { error: usageErr } = await supabase
      .from("asset_usage")
      .insert(usageRows);
    if (usageErr) {
      // Non-fatal: asset + brief pointer remain the source of truth.
      console.warn(
        "[social-image] asset_usage insert failed",
        usageErr.message ?? usageErr,
      );
    }
  }

  return {
    image_prompt: creative.image_prompt,
    text_overlay: creative.text_overlay ?? null,
    aspect: SOCIAL_IMAGE_ASPECT,
    size: SOCIAL_IMAGE_SIZE,
    status: "ready",
    platforms,
    asset_id: assetId,
    ai_visual_id: aiVisualId,
    storage_bucket: bucket,
    storage_path: storagePath,
    error: null,
  };
}

async function patchPackageBriefSocialImage(
  supabase: SupabaseClient,
  projectId: string,
  packageId: string,
  socialImage: PackageSocialImage,
): Promise<void> {
  const { data: briefRow, error } = await supabase
    .from("content_packages")
    .select("package_brief")
    .eq("id", packageId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  const brief =
    briefRow?.package_brief &&
    typeof briefRow.package_brief === "object" &&
    !Array.isArray(briefRow.package_brief)
      ? (briefRow.package_brief as Record<string, unknown>)
      : {};
  const { error: updateErr } = await supabase
    .from("content_packages")
    .update({
      package_brief: {
        ...brief,
        social_image: socialImage,
      },
    })
    .eq("id", packageId)
    .eq("project_id", projectId);
  if (updateErr) throw updateErr;
}

async function loadPlatformItemIds(
  supabase: SupabaseClient,
  packageId: string,
): Promise<{ facebookItemId: string | null; linkedinItemId: string | null }> {
  const { data, error } = await supabase
    .from("content_items")
    .select("id, platform")
    .eq("package_id", packageId)
    .is("language", null)
    .in("platform", ["facebook", "linkedin"]);
  if (error) throw error;
  let facebookItemId: string | null = null;
  let linkedinItemId: string | null = null;
  for (const row of data ?? []) {
    const platform = (row as { id: string; platform: string }).platform;
    const id = (row as { id: string }).id;
    if (platform === "facebook" && !facebookItemId) facebookItemId = id;
    if (platform === "linkedin" && !linkedinItemId) linkedinItemId = id;
  }
  return { facebookItemId, linkedinItemId };
}

/**
 * Generate exactly one 1024x1024 social image when the package includes
 * Facebook and/or LinkedIn. Soft-fails on error (writes status=failed).
 */
export async function generateAndPersistPackageSocialImage(args: {
  supabase: SupabaseClient;
  projectId: string;
  packageId: string;
  pkg: ContentPackageOutput;
  targetPlatforms: readonly string[];
}): Promise<GeneratePackageSocialImageResult> {
  const { supabase, projectId, packageId, pkg, targetPlatforms } = args;

  if (!packageNeedsSocialImage(targetPlatforms)) {
    return { attempted: false, generated: false, socialImage: null };
  }

  const platforms = socialImagePlatformsPresent(targetPlatforms);
  const creative = normalizeSocialImageCreative(pkg.social_image);
  if (!creative) {
    const failed: PackageSocialImage = {
      image_prompt: "",
      text_overlay: null,
      aspect: SOCIAL_IMAGE_ASPECT,
      size: SOCIAL_IMAGE_SIZE,
      status: "failed",
      platforms,
      error: "missing_social_image_creative",
    };
    try {
      await patchPackageBriefSocialImage(supabase, projectId, packageId, failed);
    } catch (err) {
      console.warn("[social-image] failed to patch missing creative", err);
    }
    return { attempted: true, generated: false, socialImage: failed };
  }

  // Stamp creative onto pkg so buildPackageBrief callers see it even before raster.
  pkg.social_image = {
    image_prompt: creative.image_prompt,
    text_overlay: creative.text_overlay || undefined,
  };

  try {
    const result = await withTelemetry(
      {
        stepName: "Social Image",
        provider: "image",
        model: SOCIAL_IMAGE_MODEL,
        inputSummary:
          "Social Image input:\n- Package social_image.image_prompt\n- Optional text_overlay\n- Size 1024x1024 (Facebook + LinkedIn shared)",
        outputSummary: (r) =>
          r.generated
            ? `social_image ready asset=${r.socialImage?.asset_id ?? "?"}`
            : `social_image failed: ${r.socialImage?.error ?? "unknown"}`,
        measureOutput: (r) => ({
          generatedImageCount: r.generated ? 1 : 0,
          socialImageStatus: r.socialImage?.status ?? "failed",
          assetId: r.socialImage?.asset_id ?? null,
        }),
        estimatedCostFromResult: (r) =>
          estimateImageCostUsd(r.generated ? 1 : 0),
        pricingVersion: PRICING_VERSION,
        rawUsageFromResult: (r) => ({
          generated_still_count: r.generated ? 1 : 0,
          usd_per_still: IMAGE_USD_PER_STILL,
          role: "social_image",
          size: SOCIAL_IMAGE_SIZE,
        }),
      },
      async () => {
        const { facebookItemId, linkedinItemId } = await loadPlatformItemIds(
          supabase,
          packageId,
        );
        const { bytes, model } =
          await generateSquareBytesWithModerationRetry(creative);
        const socialImage = await persistSocialImageBytes({
          supabase,
          projectId,
          packageId,
          creative,
          platforms,
          bytes,
          model,
          facebookItemId,
          linkedinItemId,
        });
        await patchPackageBriefSocialImage(
          supabase,
          projectId,
          packageId,
          socialImage,
        );
        return {
          attempted: true,
          generated: true,
          socialImage,
        } satisfies GeneratePackageSocialImageResult;
      },
    );
    return result;
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 500) : "social_image_failed";
    console.warn("[social-image] soft-fail", message);
    const failed: PackageSocialImage = {
      image_prompt: creative.image_prompt,
      text_overlay: creative.text_overlay ?? null,
      aspect: SOCIAL_IMAGE_ASPECT,
      size: SOCIAL_IMAGE_SIZE,
      status: "failed",
      platforms,
      error: message,
    };
    try {
      await patchPackageBriefSocialImage(supabase, projectId, packageId, failed);
    } catch (patchErr) {
      console.warn("[social-image] failed to patch failure status", patchErr);
    }
    return { attempted: true, generated: false, socialImage: failed };
  }
}
