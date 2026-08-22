/**
 * Deterministic redistribution of an edited voiceover across existing scenes.
 * Preserves scene_id, order, and all visual fields. No AI.
 */

import type { CreativeCoreV2Scene } from "@/lib/content-creative-core-v2/types";

export type RedistributeVoiceoverResult =
  | {
      ok: true;
      scenes: CreativeCoreV2Scene[];
      /** Approximate seconds per scene from word share (pre-TTS). */
      preliminary_durations_seconds: number[];
    }
  | {
      ok: false;
      error: string;
    };

const WORDS_PER_SECOND = 2.5;

function splitIntoUnits(voiceover: string): string[] {
  const trimmed = voiceover.trim();
  if (!trimmed) return [];
  // Prefer sentence boundaries; fall back to word groups.
  const sentences = trimmed
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length >= 2) return sentences;
  return trimmed.split(/\s+/).filter(Boolean);
}

function joinUnits(units: string[]): string {
  if (units.length === 0) return "";
  // Sentence units already have punctuation; word units need spaces.
  const looksLikeWords = units.every((u) => !/[.!?…]$/.test(u) && !/\s/.test(u));
  return looksLikeWords ? units.join(" ") : units.join(" ");
}

/**
 * Split voiceover across N existing scenes by natural units.
 * Concatenation of excerpts must equal the full voiceover (whitespace-normalized exact rebuild).
 */
export function redistributeVoiceoverAcrossScenes(args: {
  voiceover: string;
  scenes: CreativeCoreV2Scene[];
}): RedistributeVoiceoverResult {
  const voiceover = args.voiceover.trim();
  if (!voiceover) {
    return { ok: false, error: "voiceover_empty" };
  }
  const scenes = [...args.scenes].sort((a, b) => a.order - b.order);
  if (scenes.length === 0) {
    return { ok: false, error: "no_scenes" };
  }

  const units = splitIntoUnits(voiceover);
  const n = scenes.length;
  if (units.length < n) {
    // Fewer units than scenes: give first units one each; remaining scenes share last unit empty → fail
    // Instead pad by splitting words of last units.
    const words = voiceover.split(/\s+/).filter(Boolean);
    if (words.length < n) {
      return { ok: false, error: "voiceover_too_short_for_scene_count" };
    }
    return redistributeByWordShares(voiceover, words, scenes);
  }

  const shares = allocateUnitCounts(units.length, n);
  const nextScenes: CreativeCoreV2Scene[] = [];
  const durations: number[] = [];
  let cursor = 0;
  const rebuilt: string[] = [];

  for (let i = 0; i < n; i += 1) {
    const count = shares[i]!;
    const slice = units.slice(cursor, cursor + count);
    cursor += count;
    const excerpt = joinUnits(slice).trim();
    if (!excerpt) {
      return { ok: false, error: "empty_scene_excerpt" };
    }
    rebuilt.push(excerpt);
    const wordCount = excerpt.split(/\s+/).filter(Boolean).length;
    durations.push(Math.max(1, Math.round(wordCount / WORDS_PER_SECOND)));
    const prev = scenes[i]!;
    nextScenes.push({
      ...prev,
      order: i + 1,
      voiceover_excerpt: excerpt,
      // Visual / motion / emotion / sound / camera untouched.
    });
  }

  const rebuiltFull = rebuilt.join(" ").replace(/\s+/g, " ").trim();
  const expected = voiceover.replace(/\s+/g, " ").trim();
  if (rebuiltFull !== expected) {
    // Sentence join can drop exact spacing; verify coverage without duplication via word sequence.
    const rebuiltWords = rebuiltFull.split(/\s+/);
    const expectedWords = expected.split(/\s+/);
    if (rebuiltWords.join(" ") !== expectedWords.join(" ")) {
      return { ok: false, error: "voiceover_coverage_mismatch" };
    }
  }

  return {
    ok: true,
    scenes: nextScenes,
    preliminary_durations_seconds: durations,
  };
}

function allocateUnitCounts(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const rem = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

function redistributeByWordShares(
  voiceover: string,
  words: string[],
  scenes: CreativeCoreV2Scene[],
): RedistributeVoiceoverResult {
  const n = scenes.length;
  const shares = allocateUnitCounts(words.length, n);
  const nextScenes: CreativeCoreV2Scene[] = [];
  const durations: number[] = [];
  let cursor = 0;
  const rebuilt: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const count = shares[i]!;
    const slice = words.slice(cursor, cursor + count);
    cursor += count;
    const excerpt = slice.join(" ");
    rebuilt.push(excerpt);
    durations.push(Math.max(1, Math.round(count / WORDS_PER_SECOND)));
    nextScenes.push({
      ...scenes[i]!,
      order: i + 1,
      voiceover_excerpt: excerpt,
    });
  }
  if (rebuilt.join(" ") !== words.join(" ")) {
    return { ok: false, error: "voiceover_coverage_mismatch" };
  }
  if (rebuilt.join(" ") !== voiceover.replace(/\s+/g, " ").trim()) {
    return { ok: false, error: "voiceover_coverage_mismatch" };
  }
  return {
    ok: true,
    scenes: nextScenes,
    preliminary_durations_seconds: durations,
  };
}

/** True when concatenating excerpts (space-joined) covers voiceover exactly once. */
export function voiceoverCoveredExactlyOnce(
  voiceover: string,
  scenes: CreativeCoreV2Scene[],
): boolean {
  const expected = voiceover.replace(/\s+/g, " ").trim();
  const sorted = [...scenes].sort((a, b) => a.order - b.order);
  const rebuilt = sorted
    .map((s) => s.voiceover_excerpt.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return rebuilt === expected;
}
