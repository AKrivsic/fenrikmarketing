import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import type { ProductRole } from "@/lib/assets/productRole";
import { readProductRole } from "@/lib/assets/productRole";
import {
  resolvePresentationFromMetadata,
  resolvePresentationTemplate,
} from "@/lib/assets/presentationTemplate";
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
  "ui_hero",
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

function readPreferredPresentation(metadata: unknown): string | null {
  const record = readRecord(metadata);
  if (!record) return null;
  const value = record.preferred_presentation;
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

export function isVideoUsageRenderMode(value: unknown): value is VideoUsageRenderMode {
  return (
    typeof value === "string" &&
    (VIDEO_USAGE_RENDER_VALUES as readonly string[]).includes(value)
  );
}

function isPreferredVideoUsage(value: unknown): value is PreferredVideoUsage {
  return (
    typeof value === "string" &&
    (PREFERRED_VIDEO_USAGE_VALUES as readonly string[]).includes(value)
  );
}

/** Stamped manual preferred_video_usage in metadata (checked before compute). */
export function readPreferredVideoUsageFromMetadata(
  metadata: unknown,
): VideoUsageRenderMode | null {
  const record = readRecord(metadata);
  if (!record) return null;
  const raw = record.preferred_video_usage;
  if (isVideoUsageRenderMode(raw)) return raw;
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
  aiDescription?: string | null;
  preferredPresentation?: string | null;
}

/** Maps asset metadata to a render-time usage mode (manual stamp handled outside). */
export function computePreferredVideoUsage(
  input: PreferredVideoUsageInput,
): VideoUsageRenderMode {
  const metadata = {
    product_role: input.productRole,
    capture_viewport: input.captureViewport,
    safe_vertical_usage: input.safeVerticalUsage,
    video_suitability: input.videoSuitability,
    orientation: input.orientation,
    width: input.width,
    height: input.height,
    detected_content_type: input.detectedContentType,
    ai_description: input.aiDescription,
    preferred_presentation: input.preferredPresentation,
    title: input.title,
  };

  const { videoUsage } = resolvePresentationTemplate({ metadata });
  return videoUsage;
}

export function resolvePreferredVideoUsageFromMetadata(
  metadata: unknown,
  fallbacks: { title?: string | null } = {},
): VideoUsageRenderMode {
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
    aiDescription:
      typeof record?.ai_description === "string" ? record.ai_description : null,
    preferredPresentation: readPreferredPresentation(metadata),
  });
}

export function resolvePreferredVideoUsageFromRef(
  ref: AssetRef,
): VideoUsageRenderMode {
  if (
    ref.preferred_video_usage &&
    isVideoUsageRenderMode(ref.preferred_video_usage)
  ) {
    return ref.preferred_video_usage;
  }
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
    aiDescription: ref.ai_description ?? null,
    preferredPresentation:
      typeof ref.preferred_presentation === "string"
        ? ref.preferred_presentation
        : null,
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
  preferred: VideoUsageRenderMode,
  usedAs: string,
): boolean {
  if (preferred === "fullscreen") return false;
  return usedAsRequestsFullscreenScene(usedAs);
}

export function preferredUsagePromptHint(preferred: VideoUsageRenderMode): string {
  if (preferred === "fullscreen") return "Preferred usage: fullscreen";
  if (preferred === "ui_hero") {
    return "Preferred usage: ui_hero (large product UI, no extra device frame)";
  }
  if (preferred === "framed_screen") {
    return "Preferred usage: framed_screen (laptop/monitor/tablet insert — NOT fullscreen)";
  }
  if (preferred === "framed_phone") {
    return "Preferred usage: framed_phone (phone mockup — NOT fullscreen crop)";
  }
  if (preferred === "framed_laptop") {
    return "Preferred usage: framed_laptop (laptop mockup — NOT fullscreen)";
  }
  if (preferred === "framed_monitor") {
    return "Preferred usage: framed_monitor (monitor mockup — NOT fullscreen)";
  }
  if (preferred === "comparison") {
    return "Preferred usage: comparison (side-by-side or compare framing)";
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
  preferred: VideoUsageRenderMode,
  usedAs: string,
): VideoUsageRenderMode {
  if (
    preferred === "framed_phone" ||
    preferred === "framed_laptop" ||
    preferred === "framed_monitor" ||
    preferred === "comparison"
  ) {
    return preferred;
  }
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
  preferred: VideoUsageRenderMode,
  usedAs: string | null | undefined,
  options?: { metadata?: unknown; title?: string | null },
): VideoUsageRenderMode {
  if (options?.metadata) {
    const { videoUsage } = resolvePresentationFromMetadata(options.metadata, {
      title: options.title ?? null,
      scene: { usedAs: usedAs ?? undefined },
    });
    return videoUsage;
  }
  const used = usedAs?.trim() ?? "";
  if (assetUsageFullscreenViolation(preferred, used)) {
    return mapPreferredToRenderMode(preferred, used);
  }
  return mapPreferredToRenderMode(preferred, used);
}

/** Beat motion should stay static for framed product UI stills. */
export function isFramedProductVideoUsage(
  videoUsage?: string | null,
): boolean {
  const raw = videoUsage?.trim().toLowerCase() ?? "";
  if (!raw) return false;
  return (
    raw === "ui_hero" ||
    raw === "framed_phone" ||
    raw === "framed_screen" ||
    raw === "framed_laptop" ||
    raw === "framed_monitor" ||
    raw === "floating_card" ||
    raw === "comparison"
  );
}
