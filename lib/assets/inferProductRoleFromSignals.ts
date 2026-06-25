import type { ProductRole } from "@/lib/assets/productRole";
import { normalizeProductRole } from "@/lib/assets/productRole";
import type { WebsiteImageCandidateKind } from "@/lib/knowledge/extractWebsiteImageCandidates";

export type ProductRoleConfidence = "high" | "medium" | "low";

export interface ProductRoleInference {
  role: ProductRole | null;
  confidence: ProductRoleConfidence;
  source: "heuristic" | "vision" | "kind";
}

const VISION_ROLE_HINTS: { pattern: RegExp; role: ProductRole }[] = [
  { pattern: /\blogo\b/i, role: "logo" },
  { pattern: /\bdashboard\b/i, role: "dashboard" },
  { pattern: /\bproduct\s*ui\b|\bapp\s*screen\b|\binterface\b/i, role: "product_ui" },
  { pattern: /\bpricing\b/i, role: "pricing_screenshot" },
  { pattern: /\bhomepage\b|\blanding\b/i, role: "homepage_screenshot" },
  { pattern: /\bhero\b|\bbanner\b/i, role: "hero_image" },
  { pattern: /\btestimonial\b|\breview\b/i, role: "testimonial" },
  { pattern: /\bcertificate\b|\bbadge\b/i, role: "certificate" },
  { pattern: /\bdecorative\b|\bstock\b|\bbackground\b/i, role: "decorative" },
];

function haystack(args: {
  url: string;
  alt?: string | null;
  title?: string | null;
  filename?: string | null;
  visionText?: string | null;
}): string {
  return [
    args.filename ?? "",
    args.alt ?? "",
    args.title ?? "",
    args.url,
    args.visionText ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function filenameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
  } catch {
    return "";
  }
}

function matchRoleInHaystack(text: string): ProductRole | null {
  if (/\blogo\b|logo\.(svg|png|jpg|webp)/i.test(text)) return "logo";
  if (/\bdashboard\b/.test(text)) return "dashboard";
  if (/\bpricing\b/.test(text)) return "pricing_screenshot";
  if (/\bproduct[-_]?ui\b|\bscreenshot\b|\bapp[-_]?screen\b/.test(text)) {
    return "product_ui";
  }
  if (/\bhomepage\b|\bhome[-_]?page\b/.test(text)) return "homepage_screenshot";
  if (/\bhero\b/.test(text)) return "hero_image";
  if (/\bfounder\b|\bteam\b|\bportrait\b/.test(text)) return "founder_photo";
  return null;
}

function roleFromVision(detectedContentType: string, aiDescription: string): ProductRole | null {
  const combined = `${detectedContentType} ${aiDescription}`;
  for (const { pattern, role } of VISION_ROLE_HINTS) {
    if (pattern.test(combined)) return role;
  }
  const normalized = normalizeProductRole(detectedContentType.replace(/\s+/g, "_"));
  return normalized;
}

// Combines filename, alt, title, url, and optional vision text. Only returns a
// role when confidence is high/medium; low confidence -> null (keep vision fields only).
export function inferProductRoleFromSignals(input: {
  kind?: WebsiteImageCandidateKind;
  url: string;
  alt?: string | null;
  title?: string | null;
  vision?: {
    detected_content_type?: string | null;
    ai_description?: string | null;
  } | null;
}): ProductRoleInference {
  const file = filenameFromUrl(input.url);
  const text = haystack({
    url: input.url,
    alt: input.alt,
    title: input.title,
    filename: file,
    visionText: input.vision
      ? `${input.vision.detected_content_type ?? ""} ${input.vision.ai_description ?? ""}`
      : null,
  });

  if (input.kind === "favicon") {
    return { role: "logo", confidence: "high", source: "kind" };
  }
  if (input.kind === "og_image") {
    return { role: "hero_image", confidence: "medium", source: "kind" };
  }

  const fromFile = matchRoleInHaystack(file);
  if (fromFile) {
    return { role: fromFile, confidence: "high", source: "heuristic" };
  }

  const fromText = matchRoleInHaystack(text);
  if (fromText) {
    return { role: fromText, confidence: "medium", source: "heuristic" };
  }

  if (input.vision) {
    const fromVision = roleFromVision(
      input.vision.detected_content_type ?? "",
      input.vision.ai_description ?? "",
    );
    if (fromVision) {
      return { role: fromVision, confidence: "low", source: "vision" };
    }
  }

  return { role: null, confidence: "low", source: "heuristic" };
}

export function shouldApplyInferredProductRole(
  inference: ProductRoleInference,
  existingLocked: boolean,
): boolean {
  if (existingLocked) return false;
  if (!inference.role) return false;
  if (inference.confidence === "low" && inference.source === "vision") return false;
  return inference.confidence === "high" || inference.confidence === "medium";
}

export function readProductRoleLocked(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }
  const record = metadata as Record<string, unknown>;
  return record.product_role_locked === true;
}
