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
//   1. Strip clauses that ask for text / UI / notifications / signs / checklists
//      / captions / typography.
//   2. Append an explicit negative instruction so the model is told, in plain
//      language, to render NO text of any kind.
// Pure and dependency-free so it is directly unit-testable.

// Words/phrases that request readable content. Matched case-insensitively. A
// clause (comma/semicolon/period separated) containing any of these is dropped.
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
  "checklists or typography anywhere in the image. Purely visual scene only.";

function splitClauses(prompt: string): string[] {
  // Split on clause boundaries while keeping the prompt human-readable. Newlines
  // and sentence/comma/semicolon punctuation are clause separators.
  return prompt
    .split(/[\n;,.]+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
}

function clauseRequestsText(clause: string): boolean {
  return TEXT_REQUEST_PATTERNS.some((pattern) => pattern.test(clause));
}

// Sanitizes one image prompt: drops text-requesting clauses and appends the
// no-text directive. Never returns an empty prompt — if every clause was
// stripped, a neutral scene description is used so generation still proceeds.
export function sanitizeImagePrompt(prompt: string): string {
  const normalized = (prompt ?? "").replace(/\s+/g, " ").trim();
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
