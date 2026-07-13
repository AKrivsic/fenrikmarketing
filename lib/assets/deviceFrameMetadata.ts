import type { Json } from "@/lib/supabase/types";
import type { ProductRole } from "@/lib/assets/productRole";
import { readProductRole } from "@/lib/assets/productRole";
import { readCaptureViewport } from "@/lib/assets/preferredVideoUsage";
import { isReliableProductUiAsset } from "@/lib/assets/productUiGuards";
import {
  computeOrientation,
  type AssetOrientation,
} from "@/lib/assets/smartUsageMetadata";
import {
  isManualOverride,
} from "@/lib/assets/manualOverrides";

export interface DeviceFrameMetadata {
  contains_device_frame: boolean;
  contains_phone_frame: boolean;
  contains_browser_frame: boolean;
  contains_laptop_frame: boolean;
  contains_card_frame: boolean;
}

export const EMPTY_DEVICE_FRAME_METADATA: DeviceFrameMetadata = {
  contains_device_frame: false,
  contains_phone_frame: false,
  contains_browser_frame: false,
  contains_laptop_frame: false,
  contains_card_frame: false,
};

export const DEVICE_FRAME_IN_ASSET_OVERRIDE_VALUES = [
  "automatic",
  "yes",
  "no",
] as const;

export type DeviceFrameInAssetOverride =
  (typeof DEVICE_FRAME_IN_ASSET_OVERRIDE_VALUES)[number];

export const DEVICE_FRAME_IN_ASSET_OVERRIDE_FIELD = "device_frame_in_asset";

function metadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

function haystack(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

const PHONE_FRAME_PATTERNS = [
  /\bphone mockup\b/,
  /\bsmartphone frame\b/,
  /\bdevice frame\b/,
  /\bdevice mockup\b/,
  /\bmobile mockup\b/,
  /\bshown inside a phone\b/,
  /\bscreen shown inside a phone\b/,
  /\bin a phone frame\b/,
  /\bphone bezel\b/,
  /\bblack phone\b/,
  /\biphone frame\b/,
  /\bandroid phone frame\b/,
  /\bhand holding (a )?phone\b/,
  /\bdisplayed (on|in) (a )?smartphone\b/,
  /\bsmartphone\b/,
  /\bmobile app\b.*\b(screen|device|phone)\b/,
  /\b(phone|device) (screen|frame|bezel)\b/,
  /\bbezels?\b/,
  /\bvisible bezels\b/,
];

const BROWSER_FRAME_PATTERNS = [
  /\bbrowser window\b/,
  /\bbrowser chrome\b/,
  /\bbrowser frame\b/,
  /\baddress bar\b/,
  /\btab bar\b/,
  /\bwindow chrome\b/,
  /\btraffic lights\b/,
  /\bred yellow green dots\b/,
  /\bsafari window\b/,
  /\bchrome browser\b/,
];

const LAPTOP_FRAME_PATTERNS = [
  /\blaptop mockup\b/,
  /\blaptop frame\b/,
  /\bmacbook mockup\b/,
  /\bnotebook mockup\b/,
  /\bcomputer mockup\b/,
  /\bon a laptop\b/,
  /\blaptop screen\b/,
];

const CARD_FRAME_PATTERNS = [
  /\bfloating card\b/,
  /\bcard mockup\b/,
  /\bframed card\b/,
  /\bmarketing card\b/,
  /\bpromo card with (a )?border\b/,
  /\bdevice already framed\b/,
];

function readDimensions(metadata: unknown): {
  width: number | null;
  height: number | null;
  orientation: AssetOrientation;
} {
  const record = metadataRecord(metadata);
  if (!record) {
    return { width: null, height: null, orientation: "unknown" };
  }
  const w = record.width;
  const h = record.height;
  const width = typeof w === "number" && w > 0 ? w : null;
  const height = typeof h === "number" && h > 0 ? h : null;
  const raw = record.orientation;
  const orientation: AssetOrientation =
    raw === "portrait" || raw === "landscape" || raw === "square"
      ? raw
      : computeOrientation(width, height);
  return { width, height, orientation };
}

/** Portrait product UI with phone-like aspect often includes bezels in the bitmap. */
export function inferStructuralPhoneFrame(metadata: unknown): boolean {
  if (!isReliableProductUiAsset(metadata)) return false;
  const { width, height, orientation } = readDimensions(metadata);
  if (orientation !== "portrait" || !width || !height) return false;
  const aspect = height / width;
  if (aspect < 1.65 || aspect > 2.45) return false;
  if (width < 220 || width > 520) return false;
  const capture = readCaptureViewport(metadata);
  const record = metadataRecord(metadata);
  const preferred =
    typeof record?.preferred_presentation === "string"
      ? record.preferred_presentation
      : null;
  if (capture === "mobile" || preferred === "phone_screen") return true;
  const role = readProductRole(metadata);
  return role === "product_ui";
}

export function readDeviceFrameInAssetOverride(
  metadata: unknown,
): DeviceFrameInAssetOverride {
  const record = metadataRecord(metadata);
  if (!record) return "automatic";
  const raw = record.device_frame_in_asset;
  if (raw === "yes" || raw === "no" || raw === "automatic") return raw;
  return "automatic";
}

function frameFromManualOverride(metadata: unknown): DeviceFrameMetadata | null {
  const mode = readDeviceFrameInAssetOverride(metadata);
  if (mode === "automatic") return null;
  if (mode === "no") {
    return { ...EMPTY_DEVICE_FRAME_METADATA };
  }
  const capture = readCaptureViewport(metadata);
  const portrait =
    readDimensions(metadata).orientation === "portrait" || capture === "mobile";
  const contains_phone_frame = portrait;
  return {
    contains_device_frame: true,
    contains_phone_frame,
    contains_browser_frame: false,
    contains_laptop_frame: false,
    contains_card_frame: false,
  };
}

/** Heuristic + AI text signals for embedded device/browser/card chrome in the bitmap. */
export function inferDeviceFrameFromSignals(input: {
  aiDescription?: string | null;
  detectedContentType?: string | null;
  title?: string | null;
  suggestedUsage?: string | null;
  productRole?: ProductRole | null;
  captureViewport?: string | null;
  preferredPresentation?: string | null;
  width?: number | null;
  height?: number | null;
}): DeviceFrameMetadata {
  const hay = haystack([
    input.title,
    input.detectedContentType,
    input.aiDescription,
    input.suggestedUsage,
  ]);

  const textPhone =
    hay.trim().length > 0 && PHONE_FRAME_PATTERNS.some((re) => re.test(hay));
  const contains_browser_frame =
    hay.trim().length > 0 && BROWSER_FRAME_PATTERNS.some((re) => re.test(hay));
  const contains_laptop_frame =
    hay.trim().length > 0 && LAPTOP_FRAME_PATTERNS.some((re) => re.test(hay));
  const contains_card_frame =
    hay.trim().length > 0 && CARD_FRAME_PATTERNS.some((re) => re.test(hay));

  const uiPhoneSignals =
    input.productRole === "product_ui" &&
    (input.captureViewport === "mobile" ||
      input.preferredPresentation === "phone_screen") &&
    (/\b(phone|mobile|smartphone|device|screen|app)\b/.test(hay) ||
      (input.detectedContentType?.toLowerCase().includes("screenshot") ?? false));

  let contains_phone_frame = textPhone || uiPhoneSignals;

  const structural =
    input.width && input.height
      ? inferStructuralPhoneFrame({
          product_role: input.productRole,
          capture_viewport: input.captureViewport,
          preferred_presentation: input.preferredPresentation,
          width: input.width,
          height: input.height,
          orientation:
            input.height > input.width ? "portrait" : "landscape",
        })
      : false;

  if (structural) contains_phone_frame = true;

  const contains_device_frame =
    contains_phone_frame ||
    contains_browser_frame ||
    contains_laptop_frame ||
    contains_card_frame ||
    (hay.trim().length > 0 &&
      (/\balready (has|contains) (a )?(device|phone|browser|laptop) frame\b/.test(
        hay,
      ) ||
        /\bpre[- ]framed\b/.test(hay)));

  return {
    contains_device_frame,
    contains_phone_frame,
    contains_browser_frame,
    contains_laptop_frame,
    contains_card_frame,
  };
}

function readBool(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

export function readDeviceFrameMetadata(metadata: unknown): DeviceFrameMetadata {
  const manual = frameFromManualOverride(metadata);
  if (manual) return manual;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { ...EMPTY_DEVICE_FRAME_METADATA };
  }
  const record = metadata as Record<string, unknown>;
  const fromFields: DeviceFrameMetadata = {
    contains_device_frame: readBool(record, "contains_device_frame"),
    contains_phone_frame: readBool(record, "contains_phone_frame"),
    contains_browser_frame: readBool(record, "contains_browser_frame"),
    contains_laptop_frame: readBool(record, "contains_laptop_frame"),
    contains_card_frame: readBool(record, "contains_card_frame"),
  };
  if (fromFields.contains_device_frame || fromFields.contains_phone_frame) {
    return {
      ...fromFields,
      contains_device_frame:
        fromFields.contains_device_frame ||
        fromFields.contains_phone_frame ||
        fromFields.contains_browser_frame ||
        fromFields.contains_laptop_frame ||
        fromFields.contains_card_frame,
    };
  }

  const dims = readDimensions(metadata);
  const inferred = inferDeviceFrameFromSignals({
    aiDescription:
      typeof record.ai_description === "string" ? record.ai_description : null,
    detectedContentType:
      typeof record.detected_content_type === "string"
        ? record.detected_content_type
        : null,
    title: typeof record.title === "string" ? record.title : null,
    suggestedUsage:
      typeof record.suggested_usage === "string" ? record.suggested_usage : null,
    productRole: readProductRole(metadata),
    captureViewport: readCaptureViewport(metadata),
    preferredPresentation:
      typeof record.preferred_presentation === "string"
        ? record.preferred_presentation
        : null,
    width: dims.width,
    height: dims.height,
  });

  return inferred;
}

export function mergeDeviceFrameIntoMetadata(
  metadata: Json,
  frame: DeviceFrameMetadata,
): Json {
  const record =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  return {
    ...record,
    contains_device_frame: frame.contains_device_frame,
    contains_phone_frame: frame.contains_phone_frame,
    contains_browser_frame: frame.contains_browser_frame,
    contains_laptop_frame: frame.contains_laptop_frame,
    contains_card_frame: frame.contains_card_frame,
  } as Json;
}

export function enrichMetadataWithDeviceFrameDetection(
  metadata: Json,
  title?: string | null,
): Json {
  if (isManualOverride(metadata, DEVICE_FRAME_IN_ASSET_OVERRIDE_FIELD)) {
    const manual = frameFromManualOverride(metadata);
    if (manual) {
      return mergeDeviceFrameIntoMetadata(metadata, manual);
    }
  }

  const record =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  const dims = readDimensions(metadata);
  const frame = inferDeviceFrameFromSignals({
    aiDescription:
      typeof record.ai_description === "string" ? record.ai_description : null,
    detectedContentType:
      typeof record.detected_content_type === "string"
        ? record.detected_content_type
        : null,
    title: title ?? (typeof record.title === "string" ? record.title : null),
    suggestedUsage:
      typeof record.suggested_usage === "string" ? record.suggested_usage : null,
    productRole: readProductRole(metadata),
    captureViewport: readCaptureViewport(metadata),
    preferredPresentation:
      typeof record.preferred_presentation === "string"
        ? record.preferred_presentation
        : null,
    width: dims.width,
    height: dims.height,
  });
  if (readProductRole(metadata) === "product_ui" && frame.contains_phone_frame) {
    frame.contains_device_frame = true;
  }
  return mergeDeviceFrameIntoMetadata(metadata, frame);
}
