import { isManualOverride } from "@/lib/assets/manualOverrides";
import { readCaptureViewport, type CaptureViewport } from "@/lib/assets/preferredVideoUsage";
import type { ProductRole } from "@/lib/assets/productRole";
import { readProductRole } from "@/lib/assets/productRole";
import {
  computeOrientation,
  type SmartUsageMetadata,
} from "@/lib/assets/smartUsageMetadata";
import { isUiScreenshotContent } from "@/lib/assets/uiScreenshotSignals";

const MOBILE_UI_MAX_WIDTH = 500;

export interface InferCaptureViewportInput {
  metadata: Record<string, unknown>;
  smart: SmartUsageMetadata;
  title?: string | null;
}

/**
 * Infers capture_viewport for manual uploads when not manually set.
 * Returns null when inference should not stamp a value.
 */
export function inferCaptureViewport(
  input: InferCaptureViewportInput,
): CaptureViewport | null {
  const { metadata, smart } = input;
  if (isManualOverride(metadata, "capture_viewport")) return null;
  if (readCaptureViewport(metadata)) return null;

  const width = typeof metadata.width === "number" ? metadata.width : null;
  const height = typeof metadata.height === "number" ? metadata.height : null;
  const orientation =
    smart.orientation === "unknown" && width && height
      ? computeOrientation(width, height)
      : smart.orientation;

  const productRole = readProductRole(metadata);
  const detected =
    typeof metadata.detected_content_type === "string"
      ? metadata.detected_content_type
      : null;
  const aiDescription =
    typeof metadata.ai_description === "string" ? metadata.ai_description : null;
  const title = input.title ?? (typeof metadata.title === "string" ? metadata.title : null);

  const ui = isUiScreenshotContent({
    productRole,
    detectedContentType: detected,
    aiDescription,
    title,
    preferredPresentation: smart.preferred_presentation,
  });
  if (!ui) return null;

  if (orientation === "landscape" || (width && height && width > height * 1.05)) {
    return "desktop";
  }

  if (
    orientation === "portrait" &&
    width &&
    height &&
    width <= MOBILE_UI_MAX_WIDTH &&
    height > width
  ) {
    return "mobile";
  }

  if (
    smart.preferred_presentation === "phone_screen" ||
    productRole === "product_ui"
  ) {
    return "mobile";
  }

  return null;
}
