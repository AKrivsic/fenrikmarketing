import type { PlatformType } from "@/lib/supabase/types";

// Publishing UX V1 — deterministic, read-time composition of the exact text a
// user pastes into a social network ("Copy → Paste → Publish"). Pure module:
// no DB column, no AI call. Computed from the existing content_items fields
// (caption / cta / hashtags / title) so it always reflects the latest edits.
//
// Hard rules (see acceptance criteria):
//   - hashtags get a single leading "#" (DB may store them without it)
//   - the output is the literal text to paste — NEVER any "Hashtags:" / "CTA:"
//     labels or other scaffolding
//   - X output is guaranteed <= 280 characters
//   - Google Business carries NO hashtags

export interface PublishReadyInput {
  platform: PlatformType;
  title: string | null;
  caption: string | null;
  cta: string | null;
  hashtags: string[];
}

const X_MAX_LENGTH = 280;
// On TikTok the CTA is meant to be casual/implicit; only fold an explicit CTA
// into the caption when it is short enough to read as native copy.
const TIKTOK_CTA_MAX_LENGTH = 80;

// Normalizes raw tags into a clean "#tag" list: trims, drops empties, strips
// any leading "#" then re-adds exactly one, and de-duplicates while preserving
// order. Whitespace inside a tag is removed so each token is a valid hashtag.
function normalizeHashtags(hashtags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of hashtags ?? []) {
    if (typeof raw !== "string") continue;
    const stripped = raw.trim().replace(/^#+/, "").replace(/\s+/g, "");
    if (stripped.length === 0) continue;
    const tag = `#${stripped}`;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

function hashtagLine(tags: string[]): string {
  return tags.join(" ");
}

// Joins non-empty blocks with a blank line between them. Empty / whitespace
// blocks are dropped so we never emit dangling separators.
function joinBlocks(blocks: (string | null | undefined)[]): string {
  return blocks
    .map((b) => (typeof b === "string" ? b.trim() : ""))
    .filter((b) => b.length > 0)
    .join("\n\n");
}

function ctaAlreadyInCaption(caption: string, cta: string): boolean {
  return caption.toLowerCase().includes(cta.trim().toLowerCase());
}

// Builds X copy: caption plus up to `maxTags` hashtags, but only while the
// whole thing fits in 280 chars (tries 2 → 1 → 0). As a final safety net, if
// the caption alone exceeds the limit it is hard-truncated so the contract
// (<= 280) always holds.
function buildXText(caption: string, tags: string[]): string {
  const base = caption.trim();
  const limited = tags.slice(0, 2);
  for (let count = limited.length; count >= 0; count -= 1) {
    const candidate =
      count === 0
        ? base
        : `${base}\n\n${hashtagLine(limited.slice(0, count))}`;
    if (candidate.length <= X_MAX_LENGTH) return candidate;
  }
  // Caption alone is over the limit — truncate to stay within contract.
  return base.slice(0, X_MAX_LENGTH - 1).trimEnd() + "…";
}

// Returns the exact text to paste into the given platform's primary publish
// field. For YouTube / Google Business this is the description / body only —
// the title is copied separately (see buildPublishTitle).
export function buildPublishReadyText(input: PublishReadyInput): string {
  const caption = (input.caption ?? "").trim();
  const cta = (input.cta ?? "").trim();
  const allTags = normalizeHashtags(input.hashtags);

  switch (input.platform) {
    case "tiktok": {
      const includeCta =
        cta.length > 0 &&
        cta.length <= TIKTOK_CTA_MAX_LENGTH &&
        !ctaAlreadyInCaption(caption, cta);
      return joinBlocks([
        caption,
        includeCta ? cta : null,
        allTags.length > 0 ? hashtagLine(allTags) : null,
      ]);
    }

    case "instagram":
    case "youtube": {
      return joinBlocks([
        caption,
        cta || null,
        allTags.length > 0 ? hashtagLine(allTags) : null,
      ]);
    }

    case "facebook":
    case "linkedin": {
      const tags = allTags.slice(0, 3);
      return joinBlocks([
        caption,
        cta || null,
        tags.length > 0 ? hashtagLine(tags) : null,
      ]);
    }

    case "x": {
      return buildXText(caption, allTags);
    }

    case "google_business": {
      return joinBlocks([caption, cta || null]);
    }

    // blog / email and any future platform: generic, full composition.
    default: {
      return joinBlocks([
        caption,
        cta || null,
        allTags.length > 0 ? hashtagLine(allTags) : null,
      ]);
    }
  }
}

// Platforms that publish into a discrete title field (copied on its own button
// in the UI). Other platforms fold everything into publishReadyText.
export function platformHasPublishTitle(platform: PlatformType): boolean {
  return platform === "youtube" || platform === "google_business";
}

// The standalone title to copy for title+body platforms; null otherwise.
export function buildPublishTitle(input: PublishReadyInput): string | null {
  if (!platformHasPublishTitle(input.platform)) return null;
  const title = (input.title ?? "").trim();
  return title.length > 0 ? title : null;
}
