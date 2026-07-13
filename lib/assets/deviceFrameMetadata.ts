import type { Json } from "@/lib/supabase/types";
import { readProductRole } from "@/lib/assets/productRole";

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

/** Heuristic + AI text signals for embedded device/browser/card chrome in the bitmap. */
export function inferDeviceFrameFromSignals(input: {
  aiDescription?: string | null;
  detectedContentType?: string | null;
  title?: string | null;
  suggestedUsage?: string | null;
}): DeviceFrameMetadata {
  const hay = haystack([
    input.title,
    input.detectedContentType,
    input.aiDescription,
    input.suggestedUsage,
  ]);
  if (!hay.trim()) return { ...EMPTY_DEVICE_FRAME_METADATA };

  const contains_phone_frame = PHONE_FRAME_PATTERNS.some((re) => re.test(hay));
  const contains_browser_frame = BROWSER_FRAME_PATTERNS.some((re) => re.test(hay));
  const contains_laptop_frame = LAPTOP_FRAME_PATTERNS.some((re) => re.test(hay));
  const contains_card_frame = CARD_FRAME_PATTERNS.some((re) => re.test(hay));

  const contains_device_frame =
    contains_phone_frame ||
    contains_browser_frame ||
    contains_laptop_frame ||
    contains_card_frame ||
    /\balready (has|contains) (a )?(device|phone|browser|laptop) frame\b/.test(
      hay,
    ) ||
    /\bpre[- ]framed\b/.test(hay);

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
  const record =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
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
  });
  if (readProductRole(metadata) === "product_ui" && frame.contains_phone_frame) {
    frame.contains_device_frame = true;
  }
  return mergeDeviceFrameIntoMetadata(metadata, frame);
}
