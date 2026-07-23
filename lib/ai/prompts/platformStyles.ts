/**
 * Platform-native writing specs for content packages.
 * Extracted so Presentation renderers can import without circular deps.
 */

export interface PlatformStyleSpec {
  tone: string;
  structure: string;
  cta: string;
  length: string;
  /** Extra hard writing rules (Sprint 4B). Shown in the prompt when present. */
  rules?: readonly string[];
}

export const PLATFORM_STYLE_SPECS: Record<string, PlatformStyleSpec> = {
  tiktok: {
    tone: "raw, fast, punchy, curiosity-first — like a native TikTok comment caption",
    structure:
      "strongest curiosity hook in line 1 → one punch payoff → stop. Minimal storytelling.",
    cta: "implicit and casual (link in bio / watch again) — never essay CTAs",
    length: "1 short sentence preferred, max 2. Roughly ≤25 words before hashtags. 3–5 trend hashtags.",
    rules: [
      "Do NOT retell or paraphrase the full voiceover",
      "First line must create curiosity or tension — not setup/context",
      "Forbidden: long story arcs, SEO phrases, 'This video…'",
    ],
  },
  instagram: {
    tone: "emotional, human, scannable — Reels-native, not brochure",
    structure:
      "emotional hook → 1–2 SHORT paragraphs with line breaks → soft CTA",
    cta: 'save / share / "link in bio"',
    length: "2–4 short sentences total. Short paragraphs. Easy scanning. 5–10 hashtags.",
    rules: [
      "Prefer line breaks between thoughts for mobile scanning",
      "Do NOT paste the voiceover as the caption",
      "Keep emotion; cut corporate padding",
    ],
  },
  youtube: {
    tone: "native YouTube Shorts — direct curiosity, NOT a search/SEO article",
    structure:
      "first line = curiosity hook the viewer would tap; optional second line = stakes; optional third = soft CTA",
    cta: "subscribe / watch next — one short line max",
    length:
      "caption ≤ 2 short sentences (≈ ≤40 words). NEVER a 4–6 sentence SEO description.",
    rules: [
      "FORBIDDEN openers: 'This video breaks down', 'In this video', 'Watch to learn', 'If you've ever wondered', 'This Short explains'",
      "Do NOT write blog/SEO description energy — write like a Shorts caption",
      "Do NOT duplicate the voiceover essay into the description",
    ],
  },
  x: {
    tone: "terse, opinionated, hook-diverse",
    structure: "one strong claim or sharp observation — no filler, no VO retell",
    cta: "spark a reply or repost; URL only when conversion CTA requires it",
    length: "≤ 280 characters, 0–2 hashtags",
    rules: [
      "When caption_variants exist, each MUST open with a DIFFERENT hook angle",
      "Do NOT reuse the same first five words across variants",
      "Never paste voiceover sentences",
    ],
  },
  google_business: {
    tone: "factual, local, trustworthy",
    structure: "offer / update -> concrete benefit -> action",
    cta: "local action (call / visit / book)",
    length: "2–3 sentences, NO hashtags",
    rules: ["Keep factual — no viral-hook theatrics"],
  },
  linkedin: {
    tone: "professional, expert, B2B (no hype) — keep the current LinkedIn style",
    structure: "insight → context → takeaway (tight — do not expand unnecessarily)",
    cta: "invite a comment / connect / clear product CTA when conversion",
    length: "3–6 sentences, 0–3 hashtags, no decorative emoji",
    rules: [
      "Avoid unnecessary expansion and fluff paragraphs",
      "Do not turn a sharp insight into a long LinkedIn essay",
      "Do not duplicate the voiceover verbatim",
    ],
  },
  facebook: {
    tone: "friendly, community-oriented, approachable local / SMB",
    structure: "relatable hook → clear value → one next step",
    cta: "message / book / one clean link for lead or conversion content",
    length: "2–4 sentences, light emoji ok, 0–3 hashtags",
    rules: [
      "Always produce a Facebook-native post — never omit this platform",
      "Warmer and more conversational than LinkedIn; less punchy than TikTok",
      "Do not paste the voiceover",
    ],
  },
};

/** Shared Sprint 4B rules injected above per-platform specs. */
export const PLATFORM_NATIVE_WRITING_HEADER = "PLATFORM-NATIVE WRITING (Sprint 4B)";

export function buildPlatformNativeWritingRulesBlock(): string {
  return [
    `${PLATFORM_NATIVE_WRITING_HEADER}:`,
    "- Do NOT duplicate voiceover_text into any platform caption.",
    "- Every platform must feel native to that feed — rewrite facts, do not lightly reformat one master text.",
    "- TikTok = shorter + stronger first line + curiosity + punch.",
    "- Instagram = emotional + short scannable paragraphs.",
    "- YouTube Shorts = short direct curiosity metadata — NOT an SEO article.",
    "- LinkedIn = keep current professional style; avoid unnecessary expansion.",
    "- Facebook = always generate a friendly community post.",
    "- X = concise; maximize hook diversity across variants.",
  ].join("\n");
}

/** Renders per-platform style guidance for the platforms a package targets. */
export function buildPlatformStyleBlock(platforms: readonly string[]): string {
  const lines = platforms
    .map((p) => {
      const spec = PLATFORM_STYLE_SPECS[p];
      if (!spec) return null;
      const rules =
        spec.rules && spec.rules.length > 0
          ? ` rules=[${spec.rules.map((r) => `"${r}"`).join("; ")}]`
          : "";
      return (
        `- ${p}: tone=${spec.tone}; structure=${spec.structure}; ` +
        `cta=${spec.cta}; length=${spec.length}${rules}`
      );
    })
    .filter((l): l is string => l !== null);
  if (lines.length === 0) return "";
  return [
    buildPlatformNativeWritingRulesBlock(),
    "",
    "PLATFORM STYLES (make each platform's output genuinely native — NOT one " +
      "text lightly reformatted; same facts, funnel stage and CTA type, but a " +
      "platform-specific voice, structure and length):",
    ...lines,
  ].join("\n");
}
