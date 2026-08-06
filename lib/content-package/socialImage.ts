/**
 * Package-level 1:1 social image shared by Facebook + LinkedIn.
 * Creative fields come from the Content Package LLM; storage refs are stamped
 * after rasterization. Always optional on read (historical packages).
 */

export const SOCIAL_IMAGE_SIZE = "1024x1024" as const;
export const SOCIAL_IMAGE_ASPECT = "1:1" as const;
export const SOCIAL_IMAGE_USED_AS = "social_image" as const;

export const SOCIAL_IMAGE_PLATFORMS = ["facebook", "linkedin"] as const;
export type SocialImagePlatform = (typeof SOCIAL_IMAGE_PLATFORMS)[number];

/** LLM creative contract (Content Package output). */
export interface SocialImageCreative {
  image_prompt: string;
  text_overlay?: string | null;
}

export type SocialImageStatus = "ready" | "failed" | "pending";

/** Persisted on content_packages.package_brief.social_image. */
export interface PackageSocialImage extends SocialImageCreative {
  aspect: typeof SOCIAL_IMAGE_ASPECT;
  size: typeof SOCIAL_IMAGE_SIZE;
  status: SocialImageStatus;
  platforms: SocialImagePlatform[];
  asset_id?: string | null;
  ai_visual_id?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  error?: string | null;
}

export function packageNeedsSocialImage(
  platforms: readonly string[] | null | undefined,
): boolean {
  if (!platforms || platforms.length === 0) return false;
  const set = new Set(platforms.map((p) => p.trim().toLowerCase()));
  return SOCIAL_IMAGE_PLATFORMS.some((p) => set.has(p));
}

export function socialImagePlatformsPresent(
  platforms: readonly string[] | null | undefined,
): SocialImagePlatform[] {
  if (!platforms || platforms.length === 0) return [];
  const set = new Set(platforms.map((p) => p.trim().toLowerCase()));
  return SOCIAL_IMAGE_PLATFORMS.filter((p) => set.has(p));
}

export function normalizeSocialImageCreative(
  raw: unknown,
): SocialImageCreative | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const imagePrompt =
    typeof record.image_prompt === "string" ? record.image_prompt.trim() : "";
  if (!imagePrompt) return null;
  let textOverlay: string | null = null;
  if (typeof record.text_overlay === "string") {
    const trimmed = record.text_overlay.trim();
    textOverlay = trimmed.length > 0 ? trimmed : null;
  } else if (record.text_overlay === null || record.text_overlay === undefined) {
    textOverlay = null;
  }
  return { image_prompt: imagePrompt, text_overlay: textOverlay };
}

export function parsePackageSocialImage(
  briefOrSocial: unknown,
): PackageSocialImage | null {
  if (!briefOrSocial || typeof briefOrSocial !== "object" || Array.isArray(briefOrSocial)) {
    return null;
  }
  const record = briefOrSocial as Record<string, unknown>;
  // Accept either package_brief wrapper or the social_image object itself.
  const socialRaw =
    "social_image" in record && record.social_image !== undefined
      ? record.social_image
      : briefOrSocial;
  if (!socialRaw || typeof socialRaw !== "object" || Array.isArray(socialRaw)) {
    return null;
  }
  const creative = normalizeSocialImageCreative(socialRaw);
  if (!creative) return null;
  const social = socialRaw as Record<string, unknown>;
  const statusRaw = typeof social.status === "string" ? social.status : null;
  const status: SocialImageStatus =
    statusRaw === "ready" || statusRaw === "failed" || statusRaw === "pending"
      ? statusRaw
      : social.storage_path
        ? "ready"
        : "pending";
  const platformsRaw = Array.isArray(social.platforms)
    ? social.platforms.filter(
        (p): p is SocialImagePlatform =>
          p === "facebook" || p === "linkedin",
      )
    : [...SOCIAL_IMAGE_PLATFORMS];
  return {
    image_prompt: creative.image_prompt,
    text_overlay: creative.text_overlay ?? null,
    aspect: SOCIAL_IMAGE_ASPECT,
    size:
      typeof social.size === "string" && social.size.trim()
        ? (social.size.trim() as typeof SOCIAL_IMAGE_SIZE)
        : SOCIAL_IMAGE_SIZE,
    status,
    platforms: platformsRaw.length > 0 ? platformsRaw : [...SOCIAL_IMAGE_PLATFORMS],
    asset_id:
      typeof social.asset_id === "string" ? social.asset_id : null,
    ai_visual_id:
      typeof social.ai_visual_id === "string" ? social.ai_visual_id : null,
    storage_bucket:
      typeof social.storage_bucket === "string" ? social.storage_bucket : null,
    storage_path:
      typeof social.storage_path === "string" ? social.storage_path : null,
    error: typeof social.error === "string" ? social.error : null,
  };
}

export function packageSocialImageHasRenderableFile(
  social: PackageSocialImage | null | undefined,
): boolean {
  return Boolean(
    social &&
      social.status === "ready" &&
      social.storage_bucket &&
      social.storage_path,
  );
}

/**
 * Builds the provider prompt for a standalone 1:1 feed asset.
 * Separate from vertical video scene prompts.
 */
export function buildSocialImageProviderPrompt(
  creative: SocialImageCreative,
): string {
  const overlay =
    typeof creative.text_overlay === "string"
      ? creative.text_overlay.trim()
      : "";
  const lines = [
    "Create a professional 1:1 square social media feed image (not a vertical video frame).",
    "Style: believable, ready-to-publish, industry-agnostic social asset — not an AI advertisement poster.",
    "Composition: Use a strong, intentional composition appropriate to the specific concept, subject, and optional text overlay.",
    `Visual: ${creative.image_prompt.trim()}`,
  ];
  if (overlay) {
    lines.push(
      `Include short on-image text exactly: "${overlay}".`,
      "Text must be large, high-contrast, and easy to read on mobile. No paragraphs. No extra slogans.",
    );
  } else {
    lines.push(
      "Do not render any readable text, logos, watermarks, URLs, phone numbers, or captions on the image.",
    );
  }
  lines.push(
    "Do not invent statistics, testimonials, awards, certifications, prices, or contact details.",
  );
  return lines.join("\n");
}

/** Prompt block for Content Package LLM when FB and/or LI are targeted. */
export function buildContentPackageSocialImageBlock(): string {
  return [
    "SOCIAL_IMAGE CONTRACT (Facebook + LinkedIn shared 1:1 feed asset):",
    "- When Facebook and/or LinkedIn are among required platforms, you MUST output social_image.",
    '- Shape: { "image_prompt": "string", "text_overlay": string|null }',
    "- Exactly ONE social_image for the whole package (shared by Facebook and LinkedIn).",
    "- Compose intentionally as a standalone square feed image — NEVER reuse or describe a 9:16 video scene crop.",
    "- image_prompt: concrete visual description (photography, service context, educational visual, simple graphic, question/statement visual, etc.).",
    "- Choose the strongest useful visual for THIS package concept — do not force one template.",
    "- text_overlay is OPTIONAL. Prefer null when a clean visual is stronger.",
    "- If text_overlay is used: one short hook/question/statement only; meaningful without reading the post; no paragraphs.",
    "- Forbidden in text_overlay or implied visuals: fake statistics, invented facts, fake testimonials, fake awards/certifications, invented prices, unnecessary contact details, decorative nonsense AI text.",
    "- Stay universal across industries — no industry-specific template rules.",
  ].join("\n");
}
