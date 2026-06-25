// Rules for the future Playwright component-capture worker (Part 7).
// Fenrik sends these hints in the POST body; the worker implements selection.

export const COMPONENT_CAPTURE_MAX_SCREENSHOTS = 5;
export const COMPONENT_CAPTURE_TIMEOUT_MS = 20_000;

/** Sections the worker should prefer capturing. */
export const COMPONENT_CAPTURE_TARGET_SELECTORS = [
  "phone mockup",
  "app screen",
  "dashboard",
  "feature card",
  "pricing card",
  "comparison section",
  "testimonial card",
  "hero product visual",
] as const;

/** Regions / content types the worker must skip. */
export const COMPONENT_CAPTURE_SKIP_PATTERNS = [
  "navbar",
  "footer",
  "cookie banner",
  "pure text section",
  "tiny icon",
  "payment badge",
] as const;
