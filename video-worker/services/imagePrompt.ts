// Subtitle Reliability V1 (Part C — remove AI-generated readable text from
// images).
//
// PROBLEM (audited): generated stills contained garbled readable text — broken
// phone "notifications" ("Tukit Nessage"), clipped checklist items and giant
// clipped words. Diffusion image models cannot render reliable text, so any
// request for readable content turns into visual noise.
//
// RULE: image prompts must NEVER request readable text. Any messaging is
// delivered through subtitles and voiceover, never baked into the image. This
// module sanitizes every prompt right before the provider call:
//   1. Rewrite controlled board-writing concepts into illegible glyph language
//      (keeps marker/whiteboard storytelling without readable words).
//   2. Strip clauses that ask for readable text / UI / notifications / signs /
//      checklists / captions / typography.
//   3. Append an explicit negative instruction so the model is told, in plain
//      language, to render NO readable text of any kind.
// Pure and dependency-free so it is directly unit-testable.

// Controlled writing: keep the physical act (marker mid-stroke, unfinished
// board glyphs) while forbidding legible words. Matched case-insensitively.
const CONTROLLED_WRITING_KEEP_RE =
  /\b(partial|illegible|unfinished|half[- ]formed|mid[- ]stroke|marker (position|gesture|freeze)|letterforms?|glyphs?|suggested by the marker|whiteboard|white board)\b/i;

// Words/phrases that request readable content. Matched case-insensitively. A
// clause (comma/semicolon/period separated) containing any of these is dropped
// unless it is a controlled-writing keep clause (see above).
const TEXT_REQUEST_PATTERNS: RegExp[] = [
  /\btext\b/i,
  /\bwords?\b/i,
  /\bletters?\b/i,
  /\bwriting\b/i,
  /\bwritten\b/i,
  /\bhandwriting\b/i,
  /\btypograph(y|ic)\b/i,
  /\bfonts?\b/i,
  /\bcaptions?\b/i,
  /\bsubtitles?\b/i,
  /\btitles?\b/i,
  /\bheadlines?\b/i,
  /\bslogans?\b/i,
  /\bquotes?\b/i,
  /\blabels?\b/i,
  /\bsigns?\b/i,
  /\bsignage\b/i,
  /\bbillboards?\b/i,
  /\bposters?\b/i,
  /\bbanners?\b/i,
  /\bchecklists?\b/i,
  /\bbullet points?\b/i,
  /\b(phone )?notifications?\b/i,
  /\bnotification (bubble|popup|banner)s?\b/i,
  /\bspeech bubbles?\b/i,
  /\bui\b/i,
  /\buser interface\b/i,
  /\binterface\b/i,
  /\bscreens? showing\b/i,
  /\bwatermarks?\b/i,
  /\blogos?\b/i,
  /\bnumbers? on\b/i,
];

// The negative instruction appended to every prompt.
export const NO_TEXT_DIRECTIVE =
  "Important: do NOT render any readable text, words, letters, numbers, " +
  "captions, subtitles, signs, labels, logos, UI elements, phone notifications, " +
  "checklists or typography anywhere in the image. Purely visual scene only. " +
  "Partial unfinished board glyphs and marker mid-stroke gestures are allowed " +
  "only as illegible letterforms — never legible words.";

function splitClauses(prompt: string): string[] {
  // Split on clause boundaries while keeping the prompt human-readable. Newlines
  // and sentence/comma/semicolon punctuation are clause separators.
  return prompt
    .split(/[\n;,.]+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
}

function clauseHasQuotedReadableContent(clause: string): boolean {
  return /'[^']{2,}'|"[^"]{2,}"/.test(clause);
}

function clauseRequestsText(clause: string): boolean {
  // Always drop explicit readable-layout requests even when board language is present.
  if (
    /\b(typograph(y|ic)|fonts?|captions?|subtitles?|checklists?|billboards?|posters?|banners?|notification)/i.test(
      clause,
    )
  ) {
    return true;
  }
  // Controlled board-writing concepts survive when they do not quote specific
  // readable strings (those were rewritten earlier; any remaining quotes drop).
  if (
    CONTROLLED_WRITING_KEEP_RE.test(clause) &&
    !clauseHasQuotedReadableContent(clause) &&
    !/\breading\b/i.test(clause)
  ) {
    return false;
  }
  return TEXT_REQUEST_PATTERNS.some((pattern) => pattern.test(clause));
}

/**
 * Rewrite board-writing intent into sanitizer-safe language before clause drops.
 * Only rewrites "the word …" when a board/marker context is present so unrelated
 * typography clauses are still stripped.
 */
export function rewriteControlledWritingConcepts(prompt: string): string {
  let next = prompt;
  // Quoted readable content → illegible glyphs.
  next = next.replace(/'[^']{1,48}'|"[^"]{1,48}"/g, "illegible unfinished glyphs");
  const hasBoardContext =
    /\b(whiteboard|white board|marker|letterforms?|glyphs?|mid[- ]stroke|half[- ]formed)\b/i.test(
      next,
    );
  if (hasBoardContext) {
    next = next.replace(
      /\bthe word\b[^.!,;:]{0,48}/gi,
      "partial unfinished letterforms suggested by the marker position",
    );
  }
  // Explicit "readable" / "legible letters" → illegible.
  next = next.replace(/\b(readable|legible)\s+(words?|letters?|text)\b/gi, "illegible letterforms");
  // Keep "no readable text" affirmations as controlled keep language.
  next = next.replace(
    /\bno readable text\b[^.!,;:]{0,80}/gi,
    "illegible unfinished glyphs only — suggested by the marker gesture, not legible letters",
  );
  return next;
}

// Sanitizes one image prompt: rewrites controlled writing, drops text-requesting
// clauses, and appends the no-text directive. Never returns an empty prompt —
// if every clause was stripped, a neutral scene description is used so
// generation still proceeds.
export function sanitizeImagePrompt(prompt: string): string {
  const normalized = rewriteControlledWritingConcepts(
    (prompt ?? "").replace(/\s+/g, " ").trim(),
  );
  if (!normalized) {
    return NO_TEXT_DIRECTIVE;
  }

  const kept = splitClauses(normalized).filter(
    (clause) => !clauseRequestsText(clause),
  );

  const base =
    kept.length > 0
      ? kept.join(", ")
      : "A clean, photographic scene relevant to the topic";

  return `${base}. ${NO_TEXT_DIRECTIVE}`;
}
