/**
 * Resolve signed URLs for package_brief.social_image storage objects.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parsePackageSocialImage,
  packageSocialImageHasRenderableFile,
  type PackageSocialImage,
} from "@/lib/content-package/socialImage";

const SIGN_TTL_SECONDS = 60 * 60;

export async function loadPackageSocialImageFromBrief(
  supabase: SupabaseClient,
  projectId: string,
  packageId: string,
): Promise<PackageSocialImage | null> {
  const { data, error } = await supabase
    .from("content_packages")
    .select("package_brief")
    .eq("id", packageId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return parsePackageSocialImage(data?.package_brief ?? null);
}

export async function signPackageSocialImageUrl(
  social: PackageSocialImage | null | undefined,
  ttlSeconds: number = SIGN_TTL_SECONDS,
  supabase?: SupabaseClient,
): Promise<string | null> {
  if (!packageSocialImageHasRenderableFile(social)) return null;
  const client = supabase ?? createSupabaseAdminClient();
  const { data, error } = await client.storage
    .from(social!.storage_bucket!)
    .createSignedUrl(social!.storage_path!, ttlSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export interface ReviewSocialImageView {
  imagePrompt: string;
  textOverlay: string | null;
  status: PackageSocialImage["status"];
  assetId: string | null;
  previewUrl: string | null;
  hasFile: boolean;
  error: string | null;
}

export function toReviewSocialImageView(
  social: PackageSocialImage | null,
  previewUrl: string | null,
): ReviewSocialImageView | null {
  if (!social) return null;
  if (!social.image_prompt && social.status !== "failed") return null;
  return {
    imagePrompt: social.image_prompt,
    textOverlay: social.text_overlay ?? null,
    status: social.status,
    assetId: social.asset_id ?? null,
    previewUrl,
    hasFile: packageSocialImageHasRenderableFile(social),
    error: social.error ?? null,
  };
}
