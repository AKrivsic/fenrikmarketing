import type { WebsiteImageCandidateKind } from "@/lib/knowledge/extractWebsiteImageCandidates";
import type { ProductRole } from "@/lib/assets/productRole";

// Best-effort product_role for website-ingested assets (only when confident).
export function inferIngestProductRole(
  kind: WebsiteImageCandidateKind,
  url: string,
  alt?: string | null,
): ProductRole | null {
  if (kind === "favicon") return "logo";
  if (kind === "og_image") return "hero_image";

  const haystack = `${url} ${alt ?? ""}`.toLowerCase();
  if (haystack.includes("logo")) return "logo";
  if (haystack.includes("dashboard")) return "dashboard";
  if (haystack.includes("pricing")) return "pricing_screenshot";
  if (haystack.includes("homepage") || haystack.includes("hero")) {
    return "homepage_screenshot";
  }
  return null;
}
