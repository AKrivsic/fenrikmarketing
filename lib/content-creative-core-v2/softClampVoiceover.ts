/**
 * Soft word-count clamp for Creative Core voiceover.
 * Only for small overshoots (1–maxOvershoot words). Preserves final sentence (CTA/payoff).
 * Never cuts mid-sentence: removes words immediately before the terminal punctuation of a head sentence.
 */

export type SoftClampVoiceoverResult =
  | {
      ok: true;
      voiceover: string;
      wordCount: number;
      trimmedWords: number;
      applied: boolean;
    }
  | {
      ok: false;
      reason: "overshoot_too_large" | "cannot_preserve_sentence_boundary" | "below_min_after_trim";
      wordCount: number;
      excess: number;
    };

export function countVoiceoverWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function endsWithSentencePunctuation(text: string): boolean {
  return /[.!?…]"?$/.test(text.trim());
}

/**
 * Remove `removeCount` words from just before the terminal punctuation of a sentence.
 * Example: "a b c dates." + remove 1 → "a b dates."
 */
export function trimWordsBeforeTerminalPunctuation(
  sentence: string,
  removeCount: number,
): string | null {
  const tokens = sentence.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < removeCount + 1) return null;
  const last = tokens[tokens.length - 1]!;
  if (!/[.!?…]"?$/.test(last)) return null;
  const body = tokens.slice(0, -1);
  if (body.length < removeCount) return null;
  const nextBody = body.slice(0, body.length - removeCount);
  if (nextBody.length === 0) return null;
  return `${nextBody.join(" ")} ${last}`;
}

/**
 * Trim up to `maxOvershoot` excess words without cutting mid-sentence.
 * Prefer trimming from content before the final sentence so CTA/payoff stays intact.
 */
export function softClampVoiceoverWordCount(args: {
  voiceover: string;
  maxWords: number;
  minWords: number;
  maxOvershoot?: number;
}): SoftClampVoiceoverResult {
  const maxOvershoot = args.maxOvershoot ?? 5;
  const original = args.voiceover.trim();
  const wordCount = countVoiceoverWords(original);

  if (wordCount <= args.maxWords) {
    return {
      ok: true,
      voiceover: original,
      wordCount,
      trimmedWords: 0,
      applied: false,
    };
  }

  const excess = wordCount - args.maxWords;
  if (excess > maxOvershoot) {
    return {
      ok: false,
      reason: "overshoot_too_large",
      wordCount,
      excess,
    };
  }

  const sentences = splitSentences(original);
  if (sentences.length >= 2) {
    const last = sentences[sentences.length - 1]!;
    const headParts = sentences.slice(0, -1);

    // Try trimming excess words from the last head sentence (before its period).
    for (let i = headParts.length - 1; i >= 0; i -= 1) {
      const trimmedSentence = trimWordsBeforeTerminalPunctuation(
        headParts[i]!,
        excess,
      );
      if (!trimmedSentence) continue;
      const nextHead = [
        ...headParts.slice(0, i),
        trimmedSentence,
        ...headParts.slice(i + 1),
      ];
      const rebuilt = `${nextHead.join(" ")} ${last}`.trim();
      const rebuiltCount = countVoiceoverWords(rebuilt);
      if (
        rebuiltCount >= args.minWords &&
        rebuiltCount <= args.maxWords &&
        endsWithSentencePunctuation(rebuilt) &&
        wordCount - rebuiltCount <= maxOvershoot
      ) {
        return {
          ok: true,
          voiceover: rebuilt,
          wordCount: rebuiltCount,
          trimmedWords: wordCount - rebuiltCount,
          applied: true,
        };
      }
    }
  }

  return {
    ok: false,
    reason: "cannot_preserve_sentence_boundary",
    wordCount,
    excess,
  };
}
