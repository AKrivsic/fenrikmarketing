import type { WebsiteImageCandidate } from "@/lib/knowledge/extractWebsiteImageCandidates";

const TRACKING_HINTS = [
  "pixel",
  "tracking",
  "analytics",
  "doubleclick",
  "facebook.com/tr",
  "google-analytics",
  "spacer",
  "1x1",
  "transparent.gif",
  "clear.gif",
];

const JUNK_FILENAME_HINTS = [
  "loader",
  "loading",
  "placeholder",
  "spinner",
  "sprite",
  "arrow",
  "chevron",
  "caret",
  "emoji",
  "icon-social",
  "social-icon",
  "facebook",
  "twitter",
  "linkedin",
  "instagram",
  "youtube",
  "tiktok",
  "flag-",
  "/flags/",
  "favicon-16",
  "favicon-32",
];

const TINY_ICON_HINTS = ["icon", "ico", "favicon"];

const COOKIE_CONSENT_HINTS = [
  "cookie",
  "consent",
  "onetrust",
  "gdpr",
  "privacy",
  "cmp",
  "trustarc",
  "cookielaw",
  "usercentrics",
  "cookiebot",
];

const PAYMENT_BADGE_HINTS = [
  "visa",
  "mastercard",
  "paypal",
  "stripe",
  "apple-pay",
  "google-pay",
  "payment",
  "accepted-cards",
  "security-badge",
  "ssl-badge",
  "trusted-site",
  "mcafee",
  "norton",
];

export type RejectReason =
  | "tracking_url"
  | "junk_filename"
  | "tiny_icon_url"
  | "data_url"
  | "cookie_consent"
  | "payment_badge"
  | "post_too_small"
  | "post_1x1"
  | "post_dimension_unknown_small";

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return decodeURIComponent(path.split("/").pop() ?? "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function isTrackingOrJunkUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return true;
  return TRACKING_HINTS.some((h) => lower.includes(h));
}

function candidateHaystack(
  candidate: WebsiteImageCandidate,
  title?: string | null,
): string {
  const file = filenameFromUrl(candidate.url);
  return `${file} ${candidate.alt ?? ""} ${title ?? ""} ${candidate.url}`.toLowerCase();
}

function matchesAnyHint(haystack: string, hints: readonly string[]): boolean {
  return hints.some((h) => haystack.includes(h));
}

// Pre-download rejection (HTML-derived candidates only).
export function rejectWebsiteImageCandidate(
  candidate: WebsiteImageCandidate,
  options?: { title?: string | null },
): RejectReason | null {
  if (isTrackingOrJunkUrl(candidate.url)) {
    return candidate.url.toLowerCase().startsWith("data:")
      ? "data_url"
      : "tracking_url";
  }

  const haystack = candidateHaystack(candidate, options?.title);

  if (matchesAnyHint(haystack, COOKIE_CONSENT_HINTS)) {
    return "cookie_consent";
  }
  if (matchesAnyHint(haystack, PAYMENT_BADGE_HINTS)) {
    return "payment_badge";
  }

  const file = filenameFromUrl(candidate.url);

  if (JUNK_FILENAME_HINTS.some((h) => haystack.includes(h))) {
    return "junk_filename";
  }

  // Very small decorative icons in page body (keep explicit favicon / og paths).
  if (
    candidate.kind === "img" &&
    TINY_ICON_HINTS.some((h) => file.includes(h)) &&
    !haystack.includes("logo")
  ) {
    return "tiny_icon_url";
  }

  return null;
}

export function readImageDimensions(
  bytes: Uint8Array,
  mimeType: string,
): { width: number; height: number } | null {
  const mime = mimeType.toLowerCase();
  if (mime.includes("png") && bytes.byteLength >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    if (width > 0 && height > 0) return { width, height };
  }
  if (mime.includes("gif") && bytes.byteLength >= 10) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint16(6, true);
    const height = view.getUint16(8, true);
    if (width > 0 && height > 0) return { width, height };
  }
  if (mime.includes("jpeg") || mime.includes("jpg")) {
    return readJpegDimensions(bytes);
  }
  return null;
}

function readJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      if (width > 0 && height > 0) return { width, height };
      return null;
    }
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (len < 2) break;
    i += 2 + len;
  }
  return null;
}

// Post-download rejection (size / dimensions).
export function rejectDownloadedImage(args: {
  bytes: Uint8Array;
  mimeType: string;
  candidate: WebsiteImageCandidate;
}): RejectReason | null {
  const { bytes, mimeType, candidate } = args;
  const mime = mimeType.toLowerCase();
  if (mime.includes("svg")) {
    if (bytes.byteLength < 50) return "post_too_small";
    return null;
  }

  if (bytes.byteLength < 400) {
    return "post_too_small";
  }

  const dims = readImageDimensions(bytes, mimeType);
  if (dims) {
    if (dims.width <= 1 && dims.height <= 1) return "post_1x1";
    if (
      candidate.kind === "img" &&
      dims.width <= 32 &&
      dims.height <= 32 &&
      !`${candidate.alt ?? ""}`.toLowerCase().includes("logo")
    ) {
      return "post_1x1";
    }
  } else if (bytes.byteLength < 1_200 && candidate.kind === "img") {
    return "post_dimension_unknown_small";
  }

  return null;
}
