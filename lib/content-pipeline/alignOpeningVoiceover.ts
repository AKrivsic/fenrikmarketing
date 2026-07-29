/**
 * Deterministic Opening Impact ↔ voiceover_text alignment.
 *
 * Prefix comparison only — never mutates text for storage beyond the existing
 * prepend-when-missing behavior. Normalization is comparison-only so curly vs
 * straight apostrophes (U+2019 vs U+0027) do not cause a duplicate prepend.
 */

/** Normalize a string solely for opening-prefix comparison. */
export function normalizeForOpeningPrefixCompare(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface AlignOpeningVoiceoverResult {
  /** Always the Opening Impact first_spoken_sentence (trimmed) when non-empty. */
  hook: string;
  /**
   * Original voiceover when it already starts with the opening (normalized),
   * otherwise `${opening} ${voiceover}` or just `opening` when VO is empty.
   */
  voiceover_text: string;
  /** True when the opening was prepended onto voiceover_text. */
  prepended: boolean;
}

/**
 * Align hook + voiceover so Opening Impact owns the hook, without double-prepending
 * when the model already included the opening with typographic variants.
 */
export function alignOpeningVoiceover(args: {
  opening: string;
  voiceover: string | null | undefined;
}): AlignOpeningVoiceoverResult {
  const opening = args.opening.trim();
  const vo = (args.voiceover ?? "").trim();

  if (!opening) {
    return { hook: "", voiceover_text: vo, prepended: false };
  }

  const normalizedOpening = normalizeForOpeningPrefixCompare(opening);
  const normalizedVo = normalizeForOpeningPrefixCompare(vo);

  if (normalizedOpening && normalizedVo.startsWith(normalizedOpening)) {
    return { hook: opening, voiceover_text: vo, prepended: false };
  }

  if (!vo) {
    return { hook: opening, voiceover_text: opening, prepended: true };
  }

  return {
    hook: opening,
    voiceover_text: `${opening} ${vo}`.trim(),
    prepended: true,
  };
}
