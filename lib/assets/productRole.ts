// Product asset roles — stored in assets.metadata.product_role (jsonb, no migration).
// Optional: when absent, the rest of the pipeline behaves as before.

export const PRODUCT_ROLES = [
  "logo",
  "product_ui",
  "dashboard",
  "homepage_screenshot",
  "hero_image",
  "founder_photo",
  "pricing_screenshot",
  "testimonial",
  "certificate",
  "decorative",
  "other",
] as const;

export type ProductRole = (typeof PRODUCT_ROLES)[number];

export const PRODUCT_ROLE_LABELS: Record<ProductRole, string> = {
  logo: "Logo",
  product_ui: "Product UI",
  dashboard: "Dashboard",
  homepage_screenshot: "Homepage screenshot",
  hero_image: "Hero image",
  founder_photo: "Founder photo",
  pricing_screenshot: "Pricing screenshot",
  testimonial: "Testimonial",
  certificate: "Certificate",
  decorative: "Decorative",
  other: "Other",
};

export function isProductRole(value: string): value is ProductRole {
  return (PRODUCT_ROLES as readonly string[]).includes(value);
}

// Returns a canonical role or null when blank/unknown (caller omits metadata key).
export function normalizeProductRole(
  raw: string | null | undefined,
): ProductRole | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (!trimmed) return null;
  if (isProductRole(trimmed)) return trimmed;
  return null;
}

export function readProductRole(metadata: unknown): ProductRole | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).product_role;
  return typeof value === "string" ? normalizeProductRole(value) : null;
}
