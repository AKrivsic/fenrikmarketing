export const FIRST_TOUCH_STORAGE_KEY = "fenrik_first_touch_attribution_v1";

export const ATTRIBUTION_FORM_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "landing_page",
  "referrer",
] as const;

export type AttributionFormField = (typeof ATTRIBUTION_FORM_FIELDS)[number];

export type FirstTouchAttribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  landing_page: string | null;
  referrer: string | null;
};

const FIELD_MAX_LENGTH: Record<AttributionFormField, number> = {
  utm_source: 200,
  utm_medium: 200,
  utm_campaign: 200,
  utm_content: 200,
  utm_term: 200,
  fbclid: 500,
  landing_page: 2000,
  referrer: 2000,
};

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export function emptyFirstTouchAttribution(): FirstTouchAttribution {
  return {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    fbclid: null,
    landing_page: null,
    referrer: null,
  };
}

/** Sanitize untrusted attribution strings. Empty → null. */
export function sanitizeAttributionValue(
  field: AttributionFormField,
  raw: unknown,
): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(CONTROL_CHARS, "").trim();
  if (!trimmed) return null;
  const max = FIELD_MAX_LENGTH[field];
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function sanitizeFirstTouchAttribution(
  input: Partial<Record<AttributionFormField, unknown>>,
): FirstTouchAttribution {
  const out = emptyFirstTouchAttribution();
  for (const field of ATTRIBUTION_FORM_FIELDS) {
    out[field] = sanitizeAttributionValue(field, input[field]);
  }
  return out;
}

export function readAttributionFromFormData(
  formData: FormData,
): FirstTouchAttribution {
  const raw: Partial<Record<AttributionFormField, unknown>> = {};
  for (const field of ATTRIBUTION_FORM_FIELDS) {
    raw[field] = formData.get(field);
  }
  return sanitizeFirstTouchAttribution(raw);
}

export function captureFirstTouchFromLocation(input: {
  href: string;
  searchParams: URLSearchParams;
  referrer: string;
}): FirstTouchAttribution {
  return sanitizeFirstTouchAttribution({
    utm_source: input.searchParams.get("utm_source"),
    utm_medium: input.searchParams.get("utm_medium"),
    utm_campaign: input.searchParams.get("utm_campaign"),
    utm_content: input.searchParams.get("utm_content"),
    utm_term: input.searchParams.get("utm_term"),
    fbclid: input.searchParams.get("fbclid"),
    landing_page: input.href,
    referrer: input.referrer,
  });
}

export function mergeFirstTouchPreserveExisting(
  existing: FirstTouchAttribution | null,
  incoming: FirstTouchAttribution,
): FirstTouchAttribution {
  if (!existing) return incoming;
  const merged = emptyFirstTouchAttribution();
  for (const field of ATTRIBUTION_FORM_FIELDS) {
    merged[field] = existing[field] ?? incoming[field];
  }
  return merged;
}

export function parseStoredFirstTouch(raw: string | null): FirstTouchAttribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return sanitizeFirstTouchAttribution(
      parsed as Partial<Record<AttributionFormField, unknown>>,
    );
  } catch {
    return null;
  }
}

/** Browser-only: capture first-touch once into sessionStorage. Safe no-op on server. */
export function ensureFirstTouchCapturedInSession(input?: {
  href?: string;
  search?: string;
  referrer?: string;
}): FirstTouchAttribution {
  if (typeof window === "undefined") {
    return emptyFirstTouchAttribution();
  }
  try {
    const existingRaw = window.sessionStorage.getItem(FIRST_TOUCH_STORAGE_KEY);
    const existing = parseStoredFirstTouch(existingRaw);
    if (existing) return existing;

    const incoming = captureFirstTouchFromLocation({
      href: input?.href ?? window.location.href,
      searchParams: new URLSearchParams(input?.search ?? window.location.search),
      referrer: input?.referrer ?? document.referrer ?? "",
    });
    window.sessionStorage.setItem(
      FIRST_TOUCH_STORAGE_KEY,
      JSON.stringify(incoming),
    );
    return incoming;
  } catch {
    return emptyFirstTouchAttribution();
  }
}
