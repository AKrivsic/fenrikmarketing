import type { WebsiteImageCandidateKind } from "@/lib/knowledge/extractWebsiteImageCandidates";
import type { ProductRole } from "@/lib/assets/productRole";
import { readProductRole } from "@/lib/assets/productRole";
import type { Json } from "@/lib/supabase/types";

export type AssetOrientation = "portrait" | "landscape" | "square" | "unknown";

export type PreferredPresentation =
  | "phone_screen"
  | "laptop_screen"
  | "desktop_monitor"
  | "tablet_screen"
  | "scene_prop"
  | "branding"
  | "overlay"
  | "hero_insert"
  | "end_card"
  | "flexible";

export type VisualImportance = "primary" | "supporting" | "decorative";

export type VideoSuitability =
  | "primary_scene"
  | "screen_insert"
  | "end_card"
  | "branding_prop"
  | "background_only"
  | "avoid_fullscreen"
  | "unknown";

export interface SmartUsageMetadata {
  orientation: AssetOrientation;
  preferred_presentation: PreferredPresentation;
  visual_importance: VisualImportance;
  video_suitability: VideoSuitability;
  aspect_ratio: string | number;
  safe_vertical_usage: boolean;
}

export interface SmartUsageComputeInput {
  width: number | null;
  height: number | null;
  mimeType?: string | null;
  productRole: ProductRole | null;
  ingestKind?: WebsiteImageCandidateKind | null;
  sourceUrl?: string | null;
  filename?: string | null;
  title?: string | null;
  detectedContentType?: string | null;
  aiDescription?: string | null;
  source?: "website_ingestion" | "upload" | "component_capture";
}

const LANDSCAPE_PRODUCT_ROLES: readonly ProductRole[] = [
  "product_ui",
  "dashboard",
  "homepage_screenshot",
  "hero_image",
  "pricing_screenshot",
];

function haystack(input: SmartUsageComputeInput): string {
  return [
    input.title,
    input.filename,
    input.sourceUrl,
    input.detectedContentType,
    input.aiDescription,
    input.ingestKind,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function computeOrientation(
  width: number | null,
  height: number | null,
): AssetOrientation {
  if (!width || !height || width <= 0 || height <= 0) return "unknown";
  const ratio = width / height;
  if (ratio >= 1.12) return "landscape";
  if (ratio <= 0.88) return "portrait";
  return "square";
}

export function computeAspectRatio(
  width: number | null,
  height: number | null,
): string | number {
  if (!width || !height || width <= 0 || height <= 0) return "unknown";
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(width, height);
  return `${Math.round(width / g)}:${Math.round(height / g)}`;
}

function isOgOrSocial(input: SmartUsageComputeInput): boolean {
  if (input.ingestKind === "og_image") return true;
  const hay = haystack(input);
  return (
    hay.includes("og image") ||
    hay.includes("social preview") ||
    hay.includes("open graph") ||
    hay.includes("og:")
  );
}

function isLogo(input: SmartUsageComputeInput, role: ProductRole | null): boolean {
  if (role === "logo") return true;
  const hay = haystack(input);
  return hay.includes("logo") && !hay.includes("logotype hero");
}

function isMobileUi(input: SmartUsageComputeInput, role: ProductRole | null): boolean {
  if (role === "product_ui" && computeOrientation(input.width, input.height) === "portrait") {
    return true;
  }
  const hay = haystack(input);
  return (
    hay.includes("mobile") ||
    hay.includes("phone") ||
    hay.includes("app screen") ||
    hay.includes("ios") ||
    hay.includes("android")
  );
}

export function computeSmartUsageMetadata(
  input: SmartUsageComputeInput,
): SmartUsageMetadata {
  const orientation = computeOrientation(input.width, input.height);
  const aspect_ratio = computeAspectRatio(input.width, input.height);
  const role = input.productRole;
  const hay = haystack(input);

  if (role === "decorative" || hay.includes("decorative")) {
    return {
      orientation,
      preferred_presentation: "flexible",
      visual_importance: "decorative",
      video_suitability: "background_only",
      aspect_ratio,
      safe_vertical_usage: orientation !== "landscape",
    };
  }

  if (isLogo(input, role)) {
    return {
      orientation,
      preferred_presentation: "branding",
      visual_importance: "supporting",
      video_suitability: "branding_prop",
      aspect_ratio,
      safe_vertical_usage: true,
    };
  }

  if (isOgOrSocial(input)) {
    const landscape = orientation === "landscape" || orientation === "unknown";
    return {
      orientation,
      preferred_presentation: landscape ? "laptop_screen" : "hero_insert",
      visual_importance: "supporting",
      video_suitability: landscape ? "avoid_fullscreen" : "screen_insert",
      aspect_ratio,
      safe_vertical_usage: !landscape,
    };
  }

  if (orientation === "landscape") {
    const productish =
      role &&
      (LANDSCAPE_PRODUCT_ROLES as readonly string[]).includes(role);
    if (productish || hay.includes("dashboard") || hay.includes("homepage")) {
      return {
        orientation,
        preferred_presentation:
          role === "dashboard" ? "desktop_monitor" : "laptop_screen",
        visual_importance: "primary",
        video_suitability: "screen_insert",
        aspect_ratio,
        safe_vertical_usage: false,
      };
    }
    return {
      orientation,
      preferred_presentation: "laptop_screen",
      visual_importance: "supporting",
      video_suitability: "avoid_fullscreen",
      aspect_ratio,
      safe_vertical_usage: false,
    };
  }

  if (orientation === "portrait" && (isMobileUi(input, role) || role === "product_ui")) {
    return {
      orientation,
      preferred_presentation: "phone_screen",
      visual_importance: "primary",
      video_suitability: "primary_scene",
      aspect_ratio,
      safe_vertical_usage: true,
    };
  }

  if (orientation === "portrait") {
    return {
      orientation,
      preferred_presentation: "phone_screen",
      visual_importance: role === "hero_image" ? "primary" : "supporting",
      video_suitability: "screen_insert",
      aspect_ratio,
      safe_vertical_usage: true,
    };
  }

  if (role === "logo") {
    return {
      orientation,
      preferred_presentation: "end_card",
      visual_importance: "supporting",
      video_suitability: "end_card",
      aspect_ratio,
      safe_vertical_usage: true,
    };
  }

  return {
    orientation,
    preferred_presentation: "flexible",
    visual_importance:
      role && role !== "other" ? "supporting" : "decorative",
    video_suitability: "unknown",
    aspect_ratio,
    safe_vertical_usage: true,
  };
}

export function smartUsageFromAssetMetadata(
  metadata: Json,
  fallbacks: Partial<SmartUsageComputeInput> = {},
): SmartUsageMetadata {
  const record =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  const width = typeof record.width === "number" ? record.width : fallbacks.width ?? null;
  const height =
    typeof record.height === "number" ? record.height : fallbacks.height ?? null;
  return computeSmartUsageMetadata({
    width,
    height,
    mimeType:
      typeof fallbacks.mimeType === "string"
        ? fallbacks.mimeType
        : typeof record.mime_type === "string"
          ? record.mime_type
          : null,
    productRole: readProductRole(metadata) ?? fallbacks.productRole ?? null,
    ingestKind:
      (record.ingest_kind as WebsiteImageCandidateKind | undefined) ??
      fallbacks.ingestKind ??
      null,
    sourceUrl:
      typeof record.source_url === "string"
        ? record.source_url
        : (fallbacks.sourceUrl ?? null),
    filename: fallbacks.filename ?? null,
    title: fallbacks.title ?? null,
    detectedContentType:
      typeof record.detected_content_type === "string"
        ? record.detected_content_type
        : (fallbacks.detectedContentType ?? null),
    aiDescription:
      typeof record.ai_description === "string"
        ? record.ai_description
        : (fallbacks.aiDescription ?? null),
    source:
      record.source === "component_capture"
        ? "component_capture"
        : record.source === "website_ingestion"
          ? "website_ingestion"
          : (fallbacks.source ?? "upload"),
  });
}

export function mergeSmartUsageIntoMetadata(
  existing: Json,
  smart: SmartUsageMetadata,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...smart };
}

function readMetaBool(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key];
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

export function readVideoSuitability(metadata: unknown): VideoSuitability | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).video_suitability;
  const allowed: VideoSuitability[] = [
    "primary_scene",
    "screen_insert",
    "end_card",
    "branding_prop",
    "background_only",
    "avoid_fullscreen",
    "unknown",
  ];
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as VideoSuitability)
    : null;
}

export function readSafeVerticalUsage(metadata: unknown): boolean | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return readMetaBool(metadata as Record<string, unknown>, "safe_vertical_usage");
}

export function usedAsIndicatesFramedPresentation(usedAs: string): boolean {
  const u = usedAs.toLowerCase();
  const hints = [
    "screen insert",
    "screen_insert",
    "laptop",
    "monitor",
    "desktop",
    "tablet",
    "phone mockup",
    "phone_mockup",
    "mockup",
    "framed",
    "end card",
    "end_card",
    "branding",
    "overlay",
    "hero insert",
    "hero_insert",
    "insert",
    "prop",
  ];
  return hints.some((h) => u.includes(h));
}

// Worker safety: reused asset stills are fullscreen crops today — only pass
// assets that are safe for vertical fullscreen OR whose used_as asks for framing.
export function shouldIncludeAssetInVideoWorker(args: {
  metadata: unknown;
  usedAs: string | null | undefined;
}): boolean {
  const usedAs = args.usedAs?.trim() ?? "";
  if (usedAs && usedAsIndicatesFramedPresentation(usedAs)) return true;

  const suitability = readVideoSuitability(args.metadata);
  const safeVertical = readSafeVerticalUsage(args.metadata);

  if (suitability === "avoid_fullscreen") return false;
  if (safeVertical === false) return false;
  if (suitability === "branding_prop" || suitability === "background_only") {
    return false;
  }
  if (suitability === "end_card" && !usedAs) return false;

  return true;
}

export function buildSmartAssetUsageRulesBlock(): string {
  return [
    "SMART ASSET USAGE RULES (when you choose to use an asset — never mandatory):",
    "- Do not use landscape assets as full-screen vertical scenes.",
    "- If using a landscape product asset, present it inside a laptop, desktop monitor, tablet, or as a framed screen insert.",
    "- If using a portrait/mobile asset, it may be shown inside a phone.",
    "- Use logos as natural branding props or end-card elements, not as the main scene unless the concept is explicitly brand-led.",
    "- Use OG/social preview images carefully: never as full vertical scene; use only as framed insert, monitor/laptop screen, or branded reference.",
    "- Product UI/dashboard assets are preferred for solution-aware and sample content.",
    "- Sample content should show the product clearly, but in a visually appropriate way.",
    "- If an asset would look bad cropped, do not use it fullscreen.",
    "",
    "ASSET_USAGE used_as (required detail when asset_usage is non-empty):",
    '- Write used_as as a concrete placement instruction for video/editor (not a vague label).',
    '- BAD: "End-card hero image".',
    '- GOOD: "Show this landscape social preview image as a framed laptop/monitor screen in the final CTA beat; do not crop fullscreen."',
    '- GOOD: "Use logo as a small branding element on the end card, not as the main visual."',
    '- GOOD: "Use mobile UI asset inside a phone mockup during the product reveal."',
  ].join("\n");
}
