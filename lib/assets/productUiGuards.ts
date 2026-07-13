import { readProductRole } from "@/lib/assets/productRole";
import { readCaptureViewport, type VideoUsageRenderMode } from "@/lib/assets/preferredVideoUsage";
import {
  type PresentationTemplate,
  presentationTemplateToVideoUsage,
} from "@/lib/assets/presentationTemplate";
import { isUiScreenshotContent } from "@/lib/assets/uiScreenshotSignals";

function readRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** True when metadata indicates product / app UI (not lifestyle photography). */
export function isReliableProductUiAsset(metadata: unknown): boolean {
  const record = readRecord(metadata);
  if (!record) return false;

  const role = readProductRole(metadata);
  if (
    role === "product_ui" ||
    role === "dashboard" ||
    role === "homepage_screenshot" ||
    role === "pricing_screenshot"
  ) {
    return true;
  }

  const preferredPresentation = readString(record, "preferred_presentation");
  const captureViewport = readCaptureViewport(metadata);

  if (preferredPresentation === "phone_screen" && captureViewport === "mobile") {
    return true;
  }

  return isUiScreenshotContent({
    productRole: role,
    detectedContentType: readString(record, "detected_content_type"),
    aiDescription: readString(record, "ai_description"),
    title: readString(record, "title"),
    preferredPresentation,
  });
}

export interface ProductUiPresentationGuardResult {
  template: PresentationTemplate;
  videoUsage: VideoUsageRenderMode;
  guardNote?: string;
  coercedFromFullscreen: boolean;
}

/** Product UI must never render as fullscreen photo / Ken-Burns crop. */
export function applyProductUiPresentationGuard(
  metadata: unknown,
  resolved: {
    template: PresentationTemplate;
    videoUsage: VideoUsageRenderMode;
    guardNote?: string;
  },
): ProductUiPresentationGuardResult {
  if (!isReliableProductUiAsset(metadata)) {
    return { ...resolved, coercedFromFullscreen: false };
  }

  if (resolved.template !== "FULLSCREEN_PHOTO" && resolved.videoUsage !== "fullscreen") {
    return { ...resolved, coercedFromFullscreen: false };
  }

  const note =
    resolved.guardNote ??
    "Product UI uses UI Hero with static framing (no fullscreen Ken-Burns).";

  return {
    template: "UI_HERO",
    videoUsage: "ui_hero",
    guardNote: note,
    coercedFromFullscreen: true,
  };
}

export function coerceProductUiVideoUsage(
  videoUsage: string | null | undefined,
  metadata: unknown,
): VideoUsageRenderMode | string | null | undefined {
  if (!isReliableProductUiAsset(metadata)) return videoUsage ?? undefined;
  const raw = videoUsage?.trim().toLowerCase() ?? "";
  if (!raw || raw === "fullscreen" || raw === "background") {
    return "ui_hero";
  }
  return videoUsage;
}

export function productUiRequiresStaticMotion(metadata: unknown): boolean {
  return isReliableProductUiAsset(metadata);
}

export function presentationTemplateForProductUi(
  metadata: unknown,
  template: PresentationTemplate,
): PresentationTemplate {
  if (!isReliableProductUiAsset(metadata)) return template;
  if (template === "FULLSCREEN_PHOTO") return "UI_HERO";
  return template;
}

export function videoUsageFromProductUiTemplate(
  metadata: unknown,
  template: PresentationTemplate,
): VideoUsageRenderMode {
  const guarded = presentationTemplateForProductUi(metadata, template);
  return presentationTemplateToVideoUsage(guarded);
}
