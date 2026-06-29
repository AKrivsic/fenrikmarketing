import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import type { ProductRole } from "@/lib/assets/productRole";
import { readProductRole } from "@/lib/assets/productRole";
import {
  computeOrientation,
  readSafeVerticalUsage,
  readVideoSuitability,
  usedAsIndicatesFramedPresentation,
  type AssetOrientation,
  type VideoSuitability,
} from "@/lib/assets/smartUsageMetadata";

/** Runtime-only hint (computed at load / job build; not a DB column). */
export const PREFERRED_VIDEO_USAGE_VALUES = [
  "fullscreen",
  "framed_screen",
  "background",
  "proof",
  "reference",
  "floating_card",
] as const;

export type PreferredVideoUsage = (typeof PREFERRED_VIDEO_USAGE_VALUES)[number];

/** Render-time usage (superset — renderer may treat framed_* alike until compositing). */
export const VIDEO_USAGE_RENDER_VALUES = [
  "fullscreen",
  "framed_screen",
  "framed_phone",
  "framed_laptop",
  "framed_monitor",
  "floating_card",
  "background",
  "proof",
  "reference",
  "comparison",
] as const;

export type VideoUsageRenderMode = (typeof VIDEO_USAGE_RENDER_VALUES)[number];

export type CaptureViewport = "mobile" | "desktop" | "tablet" | string;

function readRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

export function readCaptureViewport(metadata: unknown): CaptureViewport | null {
  const record = readRecord(metadata);
  if (!record) return null;
  const value = record.capture_viewport;
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readDimensions(
  metadata: unknown,
): { width: number | null; height: number | null } {
  const record = readRecord(metadata);
  if (!record) return { width: null, height: null };
  const w = record.width;
  const h = record.height;
  return {
    width: typeof w === "number" && w > 0 ? w : null,
    height: typeof h === "number" && h > 0 ? h : null,
  };
}

function isPreferredVideoUsage(value: unknown): value is PreferredVideoUsage {
  return (
    typeof value === "string" &&
    (PREFERRED_VIDEO_USAGE_VALUES as readonly string[]).includes(value)
  );
}

/** Future: component-capture worker may stamp this on metadata. */
export function readPreferredVideoUsageFromMetadata(
  metadata: unknown,
): PreferredVideoUsage | null {
  const record = readRecord(metadata);
  if (!record) return null;
  const raw = record.preferred_video_usage;
  return isPreferredVideoUsage(raw) ? raw : null;
}

function titleHaystack(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function orientationFromRef(ref: AssetRef): AssetOrientation {
  if (ref.orientation === "portrait" || ref.orientation === "landscape") {
    return ref.orientation;
  }
  if (ref.orientation === "square") return "square";
  return "unknown";
}

export interface PreferredVideoUsageInput {
  productRole: ProductRole | null;
  captureViewport: CaptureViewport | null;
  safeVerticalUsage: boolean | null;
  videoSuitability: VideoSuitability | null;
  orientation: AssetOrientation;
  width: number | null;
  height: number | null;
  title?: string | null;
  detectedContentType?: string | null;
}

export function computePreferredVideoUsage(
  input: PreferredVideoUsageInput,
): PreferredVideoUsage {
  if (input.captureViewport === "mobile") return "fullscreen";

  const portrait =
    input.orientation === "portrait" ||
    (input.width &&
      input.height &&
      computeOrientation(input.width, input.height) === "portrait");

  if (input.safeVerticalUsage === true && portrait) return "fullscreen";
  if (input.productRole === "logo") return "proof";
  if (input.productRole === "hero_image") return "background";
  if (input.productRole === "decorative") return "floating_card";

  const hay = titleHaystack([input.title, input.detectedContentType]);
  if (
    input.productRole === null &&
    (hay.includes("feature card") || hay.includes("feature_card"))
  ) {
    return "floating_card";
  }

  if (
    input.productRole === "dashboard" ||
    input.productRole === "pricing_screenshot" ||
    input.productRole === "homepage_screenshot"
  ) {
    return "framed_screen";
  }

  if (input.captureViewport === "desktop") return "framed_screen";

  if (input.productRole === "product_ui" && portrait) return "fullscreen";
  if (input.productRole === "product_ui") return "framed_screen";

  if (
    input.productRole === "testimonial" ||
    input.productRole === "certificate"
  ) {
    return "proof";
  }

  if (input.videoSuitability === "background_only") return "background";

  return "reference";
}

export function resolvePreferredVideoUsageFromMetadata(
  metadata: unknown,
  fallbacks: { title?: string | null } = {},
): PreferredVideoUsage {
  const stamped = readPreferredVideoUsageFromMetadata(metadata);
  if (stamped) return stamped;

  const record = readRecord(metadata);
  const { width, height } = readDimensions(metadata);
  const rawOrientation = record?.orientation;
  const orientation: AssetOrientation =
    rawOrientation === "portrait" ||
    rawOrientation === "landscape" ||
    rawOrientation === "square"
      ? rawOrientation
      : computeOrientation(width, height);

  return computePreferredVideoUsage({
    productRole: readProductRole(metadata),
    captureViewport: readCaptureViewport(metadata),
    safeVerticalUsage: readSafeVerticalUsage(metadata),
    videoSuitability: readVideoSuitability(metadata),
    orientation,
    width,
    height,
    title: fallbacks.title ?? (typeof record?.title === "string" ? record.title : null),
    detectedContentType:
      typeof record?.detected_content_type === "string"
        ? record.detected_content_type
        : null,
  });
}

export function resolvePreferredVideoUsageFromRef(ref: AssetRef): PreferredVideoUsage {
  if (ref.preferred_video_usage && isPreferredVideoUsage(ref.preferred_video_usage)) {
    return ref.preferred_video_usage;
  }
  return computePreferredVideoUsage({
    productRole: ref.product_role ?? null,
    captureViewport:
      typeof ref.capture_viewport === "string" ? ref.capture_viewport : null,
    safeVerticalUsage: ref.safe_vertical_usage ?? null,
    videoSuitability:
      ref.video_suitability && ref.video_suitability.length > 0
        ? (ref.video_suitability as VideoSuitability)
        : null,
    orientation: orientationFromRef(ref),
    width: null,
    height: null,
    title: ref.title,
    detectedContentType: ref.detected_content_type,
  });
}

/** True when used_as asks for a vertical fullscreen crop of the asset still. */
export function usedAsRequestsFullscreenScene(usedAs: string): boolean {
  const u = usedAs.trim().toLowerCase();
  if (!u) return false;
  if (
    u.includes("do not crop fullscreen") ||
    u.includes("don't crop fullscreen") ||
    u.includes("not fullscreen") ||
    u.includes("not full-screen") ||
    u.includes("not as fullscreen")
  ) {
    return false;
  }
  if (usedAsIndicatesFramedPresentation(usedAs)) return false;

  const hints = [
    "fullscreen",
    "full-screen",
    "full screen",
    "as the main scene",
    "main visual",
    "hero background",
    "background scene",
    "fill the frame",
    "full vertical",
  ];
  return hints.some((h) => u.includes(h));
}

export function assetUsageFullscreenViolation(
  preferred: PreferredVideoUsage,
  usedAs: string,
): boolean {
  if (preferred === "fullscreen") return false;
  return usedAsRequestsFullscreenScene(usedAs);
}

export function preferredUsagePromptHint(preferred: PreferredVideoUsage): string {
  if (preferred === "fullscreen") return "Preferred usage: fullscreen";
  if (preferred === "framed_screen") {
    return "Preferred usage: framed_screen (laptop/monitor/tablet insert — NOT fullscreen)";
  }
  if (preferred === "background") {
    return "Preferred usage: background (subtle backdrop — NOT fullscreen product crop)";
  }
  if (preferred === "floating_card") {
    return "Preferred usage: floating_card (card/insert prop — NOT fullscreen)";
  }
  if (preferred === "proof") {
    return "Preferred usage: proof (branding/trust element — NOT fullscreen)";
  }
  return "Preferred usage: reference (inspiration only — NOT fullscreen)";
}

function mapPreferredToRenderMode(
  preferred: PreferredVideoUsage,
  usedAs: string,
): VideoUsageRenderMode {
  const u = usedAs.toLowerCase();
  if (preferred === "fullscreen" && !usedAsIndicatesFramedPresentation(usedAs)) {
    return "fullscreen";
  }
  if (u.includes("phone") || u.includes("mobile mockup")) return "framed_phone";
  if (u.includes("laptop")) return "framed_laptop";
  if (u.includes("monitor") || u.includes("desktop monitor")) {
    return "framed_monitor";
  }
  if (preferred === "floating_card") return "floating_card";
  if (preferred === "background") return "background";
  if (preferred === "proof") return "proof";
  if (preferred === "reference") return "reference";
  if (usedAsIndicatesFramedPresentation(usedAs) || preferred === "framed_screen") {
    return "framed_screen";
  }
  return preferred === "fullscreen" ? "fullscreen" : "framed_screen";
}

export function resolveVideoUsageForRender(
  preferred: PreferredVideoUsage,
  usedAs: string | null | undefined,
): VideoUsageRenderMode {
  const used = usedAs?.trim() ?? "";
  if (assetUsageFullscreenViolation(preferred, used)) {
    return mapPreferredToRenderMode(preferred, used);
  }
  return mapPreferredToRenderMode(preferred, used);
}
