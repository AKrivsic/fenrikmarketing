import type { ProductRole } from "@/lib/assets/productRole";
import { readProductRole } from "@/lib/assets/productRole";
import {
  readDeviceFrameMetadata,
  type DeviceFrameMetadata,
} from "@/lib/assets/deviceFrameMetadata";
import {
  computeOrientation,
  readSafeVerticalUsage,
  type AssetOrientation,
} from "@/lib/assets/smartUsageMetadata";
import { isPortraitMarketingPhoto, isUiScreenshotContent } from "@/lib/assets/uiScreenshotSignals";
import {
  applyProductUiPresentationGuard,
  isReliableProductUiAsset,
} from "@/lib/assets/productUiGuards";
import {
  isVideoUsageRenderMode,
  type VideoUsageRenderMode,
} from "@/lib/assets/preferredVideoUsage";

export const PRESENTATION_TEMPLATE_VALUES = [
  "UI_HERO",
  "DEVICE_MOCKUP",
  "DESKTOP_FRAME",
  "FLOATING_PROOF",
  "FULLSCREEN_PHOTO",
] as const;

export type PresentationTemplate = (typeof PRESENTATION_TEMPLATE_VALUES)[number];

export const PRESENTATION_TEMPLATE_LABELS: Record<PresentationTemplate, string> = {
  UI_HERO: "UI Hero (large, no extra frame)",
  DEVICE_MOCKUP: "Device mockup",
  DESKTOP_FRAME: "Desktop / browser frame",
  FLOATING_PROOF: "Floating proof card",
  FULLSCREEN_PHOTO: "Fullscreen photo",
};

/** Minimum share of canvas height the composed UI should occupy for primary product beats. */
export const MIN_EFFECTIVE_UI_HEIGHT_RATIO = 0.6;

export const SUBTITLE_SAFE_BOTTOM_PX = 420;

export const CANVAS_W = 1080;
export const CANVAS_H = 1920;

export interface ScenePresentationContext {
  usedAs?: string | null;
  imagePrompt?: string | null;
}

export interface PresentationResolveInput {
  metadata: unknown;
  title?: string | null;
  scene?: ScenePresentationContext;
  /** Explicit template request (manual stamp / locked usage mapped back). */
  requestedTemplate?: PresentationTemplate | null;
}

function readRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

function readDimensions(metadata: unknown): { width: number | null; height: number | null } {
  const record = readRecord(metadata);
  if (!record) return { width: null, height: null };
  const w = record.width;
  const h = record.height;
  return {
    width: typeof w === "number" && w > 0 ? w : null,
    height: typeof h === "number" && h > 0 ? h : null,
  };
}

function orientationFromMetadata(metadata: unknown): AssetOrientation {
  const record = readRecord(metadata);
  const raw = record?.orientation;
  if (raw === "portrait" || raw === "landscape" || raw === "square") return raw;
  const { width, height } = readDimensions(metadata);
  return computeOrientation(width, height);
}

export function sceneIntentRequestsDeviceMockup(
  usedAs?: string | null,
  imagePrompt?: string | null,
): boolean {
  const hay = [usedAs, imagePrompt].filter(Boolean).join(" ").toLowerCase();
  if (!hay.trim()) return false;
  if (/\b(do not|don't|not) (use|show).*phone mockup\b/.test(hay)) return false;
  return (
    /\binside (a )?phone\b/.test(hay) ||
    /\bshow (it )?in (a )?(phone|smartphone|device)\b/.test(hay) ||
    /\bphone mockup\b/.test(hay) ||
    /\bdevice mockup\b/.test(hay) ||
    /\bsmartphone mockup\b/.test(hay) ||
    (/\bheld in (a )?hand\b/.test(hay) && /\b(phone|mobile|app)\b/.test(hay))
  );
}

export function templateAddsPhoneChrome(template: PresentationTemplate): boolean {
  return template === "DEVICE_MOCKUP";
}

export function templateAddsBrowserOrLaptopChrome(
  template: PresentationTemplate,
): boolean {
  return template === "DESKTOP_FRAME";
}

export function templateAddsStrongCardChrome(
  template: PresentationTemplate,
): boolean {
  return template === "FLOATING_PROOF";
}

export function videoUsageImpliesPresentationTemplate(
  usage: string | null | undefined,
): PresentationTemplate | null {
  const raw = usage?.trim().toLowerCase() ?? "";
  if (raw === "ui_hero") return "UI_HERO";
  if (raw === "framed_phone") return "DEVICE_MOCKUP";
  if (
    raw === "framed_screen" ||
    raw === "framed_laptop" ||
    raw === "framed_monitor"
  ) {
    return "DESKTOP_FRAME";
  }
  if (raw === "floating_card" || raw === "proof" || raw === "reference") {
    return "FLOATING_PROOF";
  }
  if (raw === "fullscreen" || raw === "background") return "FULLSCREEN_PHOTO";
  return null;
}

export function presentationTemplateToVideoUsage(
  template: PresentationTemplate,
): VideoUsageRenderMode {
  switch (template) {
    case "UI_HERO":
      return "ui_hero";
    case "DEVICE_MOCKUP":
      return "framed_phone";
    case "DESKTOP_FRAME":
      return "framed_screen";
    case "FLOATING_PROOF":
      return "floating_card";
    case "FULLSCREEN_PHOTO":
      return "fullscreen";
    default:
      return "ui_hero";
  }
}

export function preventDoubleFraming(
  frame: DeviceFrameMetadata,
  requested: PresentationTemplate,
): { template: PresentationTemplate; guardNote?: string } {
  if (!frame.contains_device_frame) {
    return { template: requested };
  }

  const downgrade = (note: string) => ({
    template: "UI_HERO" as PresentationTemplate,
    guardNote: note,
  });

  if (requested === "DEVICE_MOCKUP" || templateAddsPhoneChrome(requested)) {
    if (frame.contains_phone_frame || frame.contains_device_frame) {
      return downgrade("Device frame already detected — using UI Hero.");
    }
  }

  if (requested === "DESKTOP_FRAME") {
    if (frame.contains_browser_frame) {
      return downgrade("Browser chrome already detected — using UI Hero.");
    }
    if (frame.contains_laptop_frame) {
      return downgrade("Laptop frame already detected — using UI Hero.");
    }
  }

  if (requested === "FLOATING_PROOF" && frame.contains_card_frame) {
    return downgrade("Card frame already detected — using UI Hero.");
  }

  if (
    (requested === "DEVICE_MOCKUP" && frame.contains_phone_frame) ||
    (requested === "DESKTOP_FRAME" &&
      (frame.contains_browser_frame || frame.contains_laptop_frame))
  ) {
    return downgrade("Device frame already detected — using UI Hero.");
  }

  return { template: requested };
}

export function fitContainInBox(
  assetW: number,
  assetH: number,
  maxW: number,
  maxH: number,
  allowUpscale: boolean,
): { width: number; height: number; scale: number } {
  const cap = allowUpscale ? 12 : 1;
  const scale = Math.min(maxW / assetW, maxH / assetH, cap);
  return {
    width: Math.max(1, Math.round(assetW * scale)),
    height: Math.max(1, Math.round(assetH * scale)),
    scale,
  };
}

export function layoutBoxForTemplate(template: PresentationTemplate): {
  maxW: number;
  maxH: number;
  allowUpscale: boolean;
  offsetY: number;
} {
  const usableH = CANVAS_H - SUBTITLE_SAFE_BOTTOM_PX;
  switch (template) {
    case "UI_HERO":
      return {
        maxW: Math.round(CANVAS_W * 0.94),
        maxH: Math.round(usableH * 0.88),
        allowUpscale: true,
        offsetY: Math.round(SUBTITLE_SAFE_BOTTOM_PX * 0.08),
      };
    case "DEVICE_MOCKUP": {
      const maxScreenH = Math.round(usableH * 0.86);
      return {
        maxW: Math.round(CANVAS_W * 0.9),
        maxH: maxScreenH,
        allowUpscale: true,
        offsetY: 120,
      };
    }
    case "DESKTOP_FRAME":
      return {
        maxW: Math.round(CANVAS_W * 0.92),
        maxH: Math.round(usableH * 0.58),
        allowUpscale: true,
        offsetY: 80,
      };
    case "FLOATING_PROOF":
      return {
        maxW: Math.round(CANVAS_W * 0.82),
        maxH: Math.round(usableH * 0.55),
        allowUpscale: true,
        offsetY: 0,
      };
    case "FULLSCREEN_PHOTO":
      return {
        maxW: CANVAS_W,
        maxH: CANVAS_H,
        allowUpscale: false,
        offsetY: 0,
      };
    default:
      return {
        maxW: Math.round(CANVAS_W * 0.94),
        maxH: Math.round(usableH * 0.88),
        allowUpscale: true,
        offsetY: 0,
      };
  }
}

export function estimateEffectiveUiHeightRatio(
  assetW: number,
  assetH: number,
  template: PresentationTemplate,
): number {
  if (template === "FULLSCREEN_PHOTO") return 1;
  const box = layoutBoxForTemplate(template);
  const fit = fitContainInBox(assetW, assetH, box.maxW, box.maxH, box.allowUpscale);
  return fit.height / CANVAS_H;
}

function pickCandidateTemplate(
  metadata: unknown,
  scene?: ScenePresentationContext,
): PresentationTemplate {
  const role = readProductRole(metadata);
  const frame = readDeviceFrameMetadata(metadata);
  const orientation = orientationFromMetadata(metadata);
  const portrait = orientation === "portrait";
  const { width, height } = readDimensions(metadata);
  const record = readRecord(metadata);
  const ui = isUiScreenshotContent({
    productRole: role,
    detectedContentType:
      typeof record?.detected_content_type === "string"
        ? record.detected_content_type
        : null,
    aiDescription:
      typeof record?.ai_description === "string" ? record.ai_description : null,
    title: typeof record?.title === "string" ? record.title : null,
    preferredPresentation:
      typeof record?.preferred_presentation === "string"
        ? record.preferred_presentation
        : null,
  });

  if (
    (role === "hero_image" || role === "founder_photo" || isPortraitMarketingPhoto({
      productRole: role,
      detectedContentType:
        typeof record?.detected_content_type === "string"
          ? record.detected_content_type
          : null,
      aiDescription:
        typeof record?.ai_description === "string" ? record.ai_description : null,
      title: typeof record?.title === "string" ? record.title : null,
    })) &&
    !isReliableProductUiAsset(metadata)
  ) {
    return "FULLSCREEN_PHOTO";
  }

  if (role === "testimonial" || role === "certificate" || role === "logo") {
    return "FLOATING_PROOF";
  }

  if (role === "decorative") {
    return "FLOATING_PROOF";
  }

  const phoneIntent = sceneIntentRequestsDeviceMockup(
    scene?.usedAs,
    scene?.imagePrompt,
  );

  if (role === "dashboard" || role === "homepage_screenshot" || role === "pricing_screenshot") {
    if (frame.contains_browser_frame || frame.contains_laptop_frame) {
      return "UI_HERO";
    }
    return role === "pricing_screenshot" ? "FLOATING_PROOF" : "DESKTOP_FRAME";
  }

  if (role === "product_ui" || ui) {
    if (frame.contains_phone_frame || frame.contains_device_frame) {
      return "UI_HERO";
    }
    if (phoneIntent && !frame.contains_phone_frame) {
      return portrait ? "DEVICE_MOCKUP" : "UI_HERO";
    }
    if (portrait) return "UI_HERO";
    if (frame.contains_browser_frame || frame.contains_laptop_frame) {
      return "UI_HERO";
    }
    return "DESKTOP_FRAME";
  }

  if (readSafeVerticalUsage(metadata) === true && portrait && !ui && !isReliableProductUiAsset(metadata)) {
    return "FULLSCREEN_PHOTO";
  }

  return "FLOATING_PROOF";
}

function applyReadabilityDowngrade(
  metadata: unknown,
  template: PresentationTemplate,
): PresentationTemplate {
  if (template !== "DEVICE_MOCKUP") return template;
  const { width, height } = readDimensions(metadata);
  if (!width || !height) return template;
  const ratio = estimateEffectiveUiHeightRatio(width, height, template);
  if (ratio < MIN_EFFECTIVE_UI_HEIGHT_RATIO) {
    return "UI_HERO";
  }
  return template;
}

export function resolvePresentationTemplate(
  input: PresentationResolveInput,
): {
  template: PresentationTemplate;
  videoUsage: VideoUsageRenderMode;
  guardNote?: string;
} {
  const frame = readDeviceFrameMetadata(input.metadata);
  let candidate =
    input.requestedTemplate ??
    (typeof readRecord(input.metadata)?.presentation_template === "string"
      ? (readRecord(input.metadata)!.presentation_template as PresentationTemplate)
      : null) ??
    pickCandidateTemplate(input.metadata, input.scene);

  const guarded = preventDoubleFraming(frame, candidate);
  candidate = guarded.template;
  candidate = applyReadabilityDowngrade(input.metadata, candidate);

  const videoUsage = presentationTemplateToVideoUsage(candidate);
  const guardedProduct = applyProductUiPresentationGuard(input.metadata, {
    template: candidate,
    videoUsage,
    guardNote: guarded.guardNote,
  });
  return {
    template: guardedProduct.template,
    videoUsage: guardedProduct.videoUsage,
    guardNote: guardedProduct.guardNote ?? guarded.guardNote,
  };
}

export function resolvePresentationFromMetadata(
  metadata: unknown,
  options: {
    title?: string | null;
    scene?: ScenePresentationContext;
    lockedVideoUsage?: string | null;
  } = {},
): {
  template: PresentationTemplate;
  videoUsage: VideoUsageRenderMode;
  guardNote?: string;
} {
  let requested: PresentationTemplate | null = null;
  if (options.lockedVideoUsage && isVideoUsageRenderMode(options.lockedVideoUsage)) {
    requested = videoUsageImpliesPresentationTemplate(options.lockedVideoUsage);
  }

  const resolved = resolvePresentationTemplate({
    metadata,
    title: options.title,
    scene: options.scene,
    requestedTemplate: requested,
  });

  if (options.lockedVideoUsage && isVideoUsageRenderMode(options.lockedVideoUsage)) {
    const frame = readDeviceFrameMetadata(metadata);
    const guarded = preventDoubleFraming(
      frame,
      videoUsageImpliesPresentationTemplate(options.lockedVideoUsage) ?? resolved.template,
    );
    const template = applyReadabilityDowngrade(metadata, guarded.template);
    const resolvedInner = {
      template,
      videoUsage: presentationTemplateToVideoUsage(template),
      guardNote: guarded.guardNote,
    };
    const guardedProduct = applyProductUiPresentationGuard(metadata, resolvedInner);
    return {
      template: guardedProduct.template,
      videoUsage: guardedProduct.videoUsage,
      guardNote: guardedProduct.guardNote,
    };
  }

  return resolved;
}

export function stampDefaultPresentationTemplate(metadata: unknown): unknown {
  const record = readRecord(metadata);
  if (!record) return metadata;
  const { template } = resolvePresentationTemplate({ metadata });
  return { ...record, presentation_template: template };
}

export function isProductUiPresentationVideoUsage(
  videoUsage?: string | null,
): boolean {
  const raw = videoUsage?.trim().toLowerCase() ?? "";
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
