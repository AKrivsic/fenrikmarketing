import type { StoryboardBeat } from "@/lib/video-engine/storyboard";
import type { SubtitleCue } from "@/video-worker/services/subtitles";

// Subtitle Quality Sprint — phrase captions.
//
// PROBLEM (audited): captions were SENTENCE-style. The storyboard splits the
// narration into one segment per beat (3–5 beats) and the cue timeline gave each
// segment a UNIFORM slice of the audio (one cue per beat, equal beat windows).
// Because the words-per-beat are NOT uniform, a sparse beat's caption lingered
// while a dense beat's caption was rushed / cut before the phrase finished — the
// "out of sync" and "ends before the phrase finishes" feel. It also reads as a
// block of text, not a native Shorts/Reels/TikTok caption.
//
// FIX (this module, subtitle pipeline ONLY — no change to beats, video duration,
// TTS, prompts, or content):
//   1. Segment the full narration into PHRASES of 2–5 words at natural
//      boundaries (punctuation first, otherwise a ~3-word target), never a
//      single-word "karaoke" caption and never a full-sentence block.
//   2. Distribute the *measured* audio timeline across those phrases in
//      proportion to each phrase's length, so caption timing tracks the spoken
//      rhythm instead of the (equal) beat windows.
//   3. Enforce a minimum on-screen duration so a short phrase never flashes.
// The cues tile the timeline contiguously from 0 to the total, guaranteeing no
// gaps, no overlaps, and full coverage of the voiceover.

// Phrase length bounds (words). TARGET is the preferred chunk size; the splitter
// breaks earlier at punctuation and never exceeds MAX. MIN_WORDS keeps captions
// off the "one word at a time" karaoke style.
export const MIN_WORDS_PER_PHRASE = 2;
export const TARGET_WORDS_PER_PHRASE = 3;
export const MAX_WORDS_PER_PHRASE = 5;

// Phase 3 — minimum on-screen time per caption (seconds). Chosen as 1.0s:
//   - At the project's speaking rate (~2.6 words/s) a 3-word phrase is naturally
//     ~1.15s, so 1.0s is a floor that bites only on short (2-word) phrases and
//     punctuation breaks — exactly the captions that would otherwise "flash".
//   - 1.0s comfortably clears typical reading speed for a <=5-word (<=~25 char)
//     phrase, so a caption is never gone before it can be read.
// The floor is honoured by borrowing time from longer neighbouring cues; it
// never extends the total timeline (which stays equal to the audio).
export const MIN_CUE_SECONDS = 1.0;

const PHRASE_BOUNDARY_PUNCTUATION = /[,.;:!?…—–]$/;

function words(text: string): string[] {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
}

// Decides how many of the remaining words (starting at `start`) make up the next
// phrase. The default chunk is the ~3-word target; an internal punctuation break
// inside that window SHORTENS the chunk (a natural pause), but punctuation is
// never used to STRETCH a chunk past the target — otherwise a sentence's
// trailing period would swallow the whole sentence into one block. In all cases
// it avoids orphaning a single trailing word and never exceeds MAX_WORDS.
function nextPhraseLength(tokens: string[], start: number): number {
  const remaining = tokens.length - start;
  const maxLen = Math.min(MAX_WORDS_PER_PHRASE, remaining);
  // Search for an early natural pause no further than the target.
  const searchLen = Math.min(TARGET_WORDS_PER_PHRASE, maxLen);

  for (let len = MIN_WORDS_PER_PHRASE; len <= searchLen; len++) {
    const word = tokens[start + len - 1];
    if (PHRASE_BOUNDARY_PUNCTUATION.test(word)) {
      // Don't break if it would leave a lone trailing word.
      if (remaining - len === 1) continue;
      return len;
    }
  }

  let len = Math.min(TARGET_WORDS_PER_PHRASE, maxLen);
  // Avoid a single-word leftover: pull the orphan into this phrase instead.
  if (remaining - len === 1) len = Math.min(len + 1, maxLen);
  return Math.max(1, len);
}

// Splits ONE sentence into phrase captions of 2–5 words. A short sentence
// (<= TARGET words) stays a single caption rather than being forced apart.
function splitSentenceIntoPhrases(sentence: string): string[] {
  const tokens = words(sentence);
  if (tokens.length === 0) return [];
  if (tokens.length <= TARGET_WORDS_PER_PHRASE) return [tokens.join(" ")];

  const phrases: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const len = nextPhraseLength(tokens, i);
    phrases.push(tokens.slice(i, i + len).join(" "));
    i += len;
  }
  return phrases;
}

// Splits narration text into phrase captions (2–5 words, natural boundaries).
// Sentences are segmented FIRST so a phrase never straddles a sentence boundary
// (no "...poznají. Hosté..." cross-sentence captions), then each sentence is
// chunked into phrases. Punctuation is preserved because it travels attached to
// its word.
export function splitIntoPhrases(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const source = sentences.length > 0 ? sentences : [normalized];

  const phrases: string[] = [];
  for (const sentence of source) {
    phrases.push(...splitSentenceIntoPhrases(sentence));
  }
  return phrases;
}

// Replicates the renderer's xfade timeline math so the subtitle total matches
// the video/audio total: each transition overlaps the running timeline by
// transitionSeconds. This is the master subtitle duration.
export function timelineTotalSeconds(
  beats: StoryboardBeat[],
  transitionSeconds: number,
): number {
  if (beats.length === 0) return 0;
  let cumulative = beats[0].durationSeconds;
  for (let i = 1; i < beats.length; i++) {
    const td = Math.min(transitionSeconds, beats[i].durationSeconds / 2);
    cumulative = cumulative - td + beats[i].durationSeconds;
  }
  return cumulative;
}

// Raises any sub-minimum duration up to `minCue` by borrowing proportionally
// from the cues that have slack above the minimum. The sum is preserved exactly
// (the timeline never grows). If the floor cannot be met for every cue (total is
// too short for the count) it degrades to an equal split — the best achievable.
function enforceMinDurations(
  durations: number[],
  total: number,
  minCue: number,
): number[] {
  const n = durations.length;
  if (n === 0) return [];
  if (minCue * n >= total) {
    const equal = total / n;
    return durations.map(() => equal);
  }

  const result = durations.slice();
  // One redistribution pass is mathematically sufficient (surplus over the
  // minimum strictly exceeds the deficit, since minCue*n < total); the loop is
  // a safety net against floating-point residue.
  for (let pass = 0; pass <= n; pass++) {
    let deficit = 0;
    let surplus = 0;
    for (const d of result) {
      if (d < minCue) deficit += minCue - d;
      else surplus += d - minCue;
    }
    if (deficit <= 1e-9) break;
    if (surplus <= 1e-9) {
      const equal = total / n;
      return result.map(() => equal);
    }
    const keepRatio = Math.max(0, (surplus - deficit) / surplus);
    for (let i = 0; i < n; i++) {
      if (result[i] < minCue) result[i] = minCue;
      else result[i] = minCue + (result[i] - minCue) * keepRatio;
    }
  }
  return result;
}

export interface BuildPhraseCuesInput {
  beats: StoryboardBeat[];
  transitionSeconds: number;
  minCueSeconds?: number;
}

export interface BuildPhraseCuesResult {
  cues: SubtitleCue[];
  totalSeconds: number;
}

// Builds the phrase-level subtitle cues for the whole video. The narration
// (joined across beats, in order) is segmented into phrases and the audio-master
// timeline is distributed across them in proportion to phrase length, then the
// minimum-duration floor is applied. Cues are emitted contiguously so the
// timeline has no gaps, no overlaps, and covers the entire voiceover.
export function buildPhraseCues(
  input: BuildPhraseCuesInput,
): BuildPhraseCuesResult {
  const { beats, transitionSeconds } = input;
  const minCue = input.minCueSeconds ?? MIN_CUE_SECONDS;
  const total = timelineTotalSeconds(beats, transitionSeconds);

  const fullText = beats
    .map((beat) => beat.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const phrases = splitIntoPhrases(fullText);

  if (phrases.length === 0 || total <= 0) {
    return { cues: [], totalSeconds: total };
  }

  // Weight by character length: longer phrases take longer to say than a raw
  // word count implies (it accounts for word length), tracking rhythm better.
  const weights = phrases.map((p) => Math.max(1, p.length));
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const proportional = weights.map((w) => (total * w) / weightSum);
  const durations = enforceMinDurations(proportional, total, minCue);

  const cues: SubtitleCue[] = [];
  let cursor = 0;
  for (let i = 0; i < phrases.length; i++) {
    const start = cursor;
    // Pin the last cue to the exact total so coverage is complete and free of
    // floating-point drift; intermediate cues advance by their duration.
    const end = i === phrases.length - 1 ? total : start + durations[i];
    cues.push({ startSeconds: start, endSeconds: end, text: phrases[i] });
    cursor = end;
  }

  return { cues, totalSeconds: total };
}
