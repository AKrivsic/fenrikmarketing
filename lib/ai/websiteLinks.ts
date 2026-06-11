import type { FunnelStage } from "@/lib/ai/types";

// Website URL & CTA Usage V1 — deterministic, conservative URL post-process.
// The WEBSITE / LINK RULES prompt block is the primary mechanism; this is a
// safety net that only appends the canonical URL on the platforms + funnel
// stages where a raw link is clearly appropriate, and only when the model did
// not already include one.
//
// Deliberately EXCLUDED: tiktok, instagram, google_business (no raw URL in
// text) and x (its "not every variant needs a URL" nuance is left to the
// prompt). Never touches voiceover_text or image_prompts.
//
// This module intentionally has NO dependency on lib/ai/workflows/* so it can be
// imported by the dependency-free check scripts (Node's strip-only type loader).
export const URL_APPEND_STAGES_BY_PLATFORM: Record<
  string,
  readonly FunnelStage[]
> = {
  youtube: ["solution_aware", "conversion"],
  linkedin: ["solution_aware", "conversion"],
  facebook: ["solution_aware", "conversion"],
};

export const URL_APPEND_CTA_TYPES: ReadonlySet<string> = new Set([
  "contact",
  "book",
  "sign_up",
  "request_quote",
  "lead",
]);

const URL_IN_TEXT_PATTERN = /(https?:\/\/|www\.)/i;

// True when the text already carries an http(s)/www URL (so appending would
// duplicate a link). Shared by the CTA and X-caption append paths.
export function textHasUrl(text: string): boolean {
  return URL_IN_TEXT_PATTERN.test(text);
}

// Appends a URL to a piece of text with a sensible separator, idempotently:
//   - returns the text unchanged when there is no URL or one already exists
//   - keeps existing terminal punctuation, otherwise joins with ". "
export function appendUrlToText(
  text: string,
  websiteUrl: string | null,
): string {
  if (!websiteUrl) return text;
  if (textHasUrl(text) || text.includes(websiteUrl)) return text;
  const trimmed = text.trimEnd();
  if (trimmed.length === 0) return websiteUrl;
  const separator = /[.!?…]$/.test(trimmed) ? " " : ". ";
  return `${trimmed}${separator}${websiteUrl}`;
}

// Returns the CTA with the canonical URL appended when ALL guards pass:
//   - a canonical website URL exists
//   - the platform allows a raw URL at this funnel stage
//   - the package CTA type is a conversion-style action
//   - the CTA does not already contain any URL (idempotent / safe to re-run)
// Otherwise returns the CTA unchanged.
export function maybeAppendWebsiteUrl(args: {
  platform: string;
  cta: string;
  funnelStage: FunnelStage;
  ctaType: string | null | undefined;
  websiteUrl: string | null;
}): string {
  const { platform, cta, funnelStage, ctaType, websiteUrl } = args;
  if (!websiteUrl) return cta;

  const stages = URL_APPEND_STAGES_BY_PLATFORM[platform];
  if (!stages || !stages.includes(funnelStage)) return cta;
  if (!ctaType || !URL_APPEND_CTA_TYPES.has(ctaType)) return cta;

  return appendUrlToText(cta, websiteUrl);
}

// ---------------------------------------------------------------------------
// X URL Distribution V1
// ---------------------------------------------------------------------------
// X is intentionally excluded from the per-CTA append above (maybeAppendWebsiteUrl)
// because not every X post should carry a link. Instead, for a BATCH of X
// variants within one package, a controlled MINORITY of captions get the
// canonical URL. The funnel stage controls how aggressive that is:
//   - conversion / solution_aware: distribute per the volume table below.
//   - awareness / problem_aware (soft stages): at most ONE link, and only when
//     there are 3+ variants (a single soft mention, never a link-heavy batch).

const X_SOFT_STAGES: ReadonlySet<FunnelStage> = new Set([
  "awareness",
  "problem_aware",
]);

// How many of `count` X variants should include the URL, given the funnel stage:
//   count <= 1            -> 0   (a single X post never gets a deterministic URL)
//   soft stage, count < 3 -> 0
//   soft stage, count >= 3-> 1   (exactly one soft mention)
//   count 2..9            -> 1
//   count >= 10           -> floor(count / 5)  ("roughly every 5th")
export function xUrlVariantCount(
  count: number,
  funnelStage: FunnelStage,
): number {
  if (!Number.isFinite(count) || count <= 1) return 0;
  const n = Math.trunc(count);

  if (X_SOFT_STAGES.has(funnelStage)) {
    return n >= 3 ? 1 : 0;
  }
  if (n <= 9) return 1;
  return Math.floor(n / 5);
}

// The 0-based X variant indices (within a batch of `count`) that should receive
// the URL. Indices are spread EVENLY across the batch (centered in each bucket)
// so two URL variants are never adjacent when the count allows it, and a single
// URL lands on a middle variant rather than the first one.
export function xUrlVariantIndices(
  count: number,
  funnelStage: FunnelStage,
): Set<number> {
  const indices = new Set<number>();
  const k = xUrlVariantCount(count, funnelStage);
  if (k <= 0) return indices;

  const n = Math.trunc(count);
  for (let i = 0; i < k; i++) {
    indices.add(Math.floor(((i + 0.5) * n) / k));
  }
  return indices;
}
