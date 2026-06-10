import type { StoryboardBeat } from "@/lib/video-engine/storyboard";
import type { SubtitleCue } from "@/video-worker/services/subtitles";
import type { WordTimestamp } from "@/lib/ai/types";

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

// ===========================================================================
// Word Timestamp Subtitles V1 — REAL timing source.
//
// The phrase STYLE is unchanged (same splitIntoPhrases: 2–5 word phrases at
// natural boundaries — NOT word-by-word karaoke). Only the TIMING SOURCE
// changes: instead of distributing the timeline proportionally, each phrase's
// timing comes from the whisper word timestamps:
//   start = first word's start, end = last word's end.
// The cues are then normalized to be monotonic, gap-free and overlap-free (a
// caption holds through inter-word silence until the next phrase begins), which
// matches the contiguous guarantees of the proportional builder.
//
// This is the OPTIONAL path: buildPhraseCuesFromWords returns null whenever the
// transcript cannot be aligned confidently, and the caller falls back to
// buildPhraseCues (proportional). Video generation never depends on it.
// ===========================================================================

// Normalizes a token for matching: lowercased, punctuation stripped, diacritics
// PRESERVED (Czech/German/French/etc. letters are kept so "čistě" matches).
function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

interface TokenTime {
  start: number;
  end: number;
}

// Greedy forward aligner: walks the narration tokens and the transcript words in
// order, matching by normalized equality within a small look-ahead window so it
// tolerates the occasional whisper insertion/deletion (e.g. a number spelled out
// or a dropped filler word). Returns per-narration-token timing (or null when a
// token could not be matched).
function alignTokens(
  narrationTokens: string[],
  words: WordTimestamp[],
  window = 6,
): (TokenTime | null)[] {
  const times: (TokenTime | null)[] = new Array(narrationTokens.length).fill(
    null,
  );
  let cursor = 0;
  for (let i = 0; i < narrationTokens.length; i++) {
    const nt = normalizeToken(narrationTokens[i]);
    if (!nt) continue;
    const limit = Math.min(words.length, cursor + window);
    for (let k = cursor; k < limit; k++) {
      if (normalizeToken(words[k].word) === nt) {
        times[i] = { start: words[k].start, end: words[k].end };
        cursor = k + 1;
        break;
      }
    }
  }
  return times;
}

// Linearly interpolates the NaN holes in a monotonic series, anchoring a leading
// hole to `head` and a trailing hole to `tail`. Used to give unaligned phrases a
// plausible time so the cue track stays continuous.
function interpolateSeries(
  values: number[],
  head: number,
  tail: number,
): number[] {
  const n = values.length;
  if (n === 0) return [];
  const out = values.slice();

  let prevIdx = -1;
  let prevVal = head;
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(out[i])) {
      // Fill the gap (prevIdx, i) by linear interpolation from prevVal -> out[i].
      const span = i - prevIdx;
      for (let j = prevIdx + 1; j < i; j++) {
        out[j] = prevVal + ((out[i] - prevVal) * (j - prevIdx)) / span;
      }
      prevIdx = i;
      prevVal = out[i];
    }
  }
  // Trailing unknowns: ramp from the last known value up to `tail`.
  if (prevIdx < n - 1) {
    const span = n - prevIdx;
    for (let j = prevIdx + 1; j < n; j++) {
      out[j] = prevVal + ((tail - prevVal) * (j - prevIdx)) / span;
    }
  }
  return out;
}

export interface BuildPhraseCuesFromWordsInput {
  // The text that was actually spoken (the TTS input == what whisper heard).
  voiceoverText: string;
  // Real per-word timestamps from whisper (already sanitized).
  words: WordTimestamp[];
  // Upper bound for the cue track (typically the storyboard timeline total).
  // Cue ends are clamped to it so subtitles never run past the video.
  totalSeconds?: number;
  minCueSeconds?: number;
  // Minimum fraction of narration tokens that must align to the transcript for
  // the result to be trusted. Below it we return null (fall back to estimate).
  minMatchRatio?: number;
}

// Builds phrase cues from real word timestamps, or returns null when the audio
// could not be aligned confidently (caller then uses buildPhraseCues).
export function buildPhraseCuesFromWords(
  input: BuildPhraseCuesFromWordsInput,
): BuildPhraseCuesResult | null {
  const minCue = input.minCueSeconds ?? MIN_CUE_SECONDS;
  const minMatchRatio = input.minMatchRatio ?? 0.5;
  const transcriptWords = input.words ?? [];

  const phrases = splitIntoPhrases(input.voiceoverText);
  if (phrases.length === 0 || transcriptWords.length === 0) return null;

  // Token ranges per phrase (splitIntoPhrases preserves token order, so the
  // flattened phrase tokens are the narration token stream).
  const phraseTokens = phrases.map((p) => words(p));
  const narrationTokens = phraseTokens.flat();
  if (narrationTokens.length === 0) return null;

  const tokenTimes = alignTokens(narrationTokens, transcriptWords);
  const matched = tokenTimes.reduce((acc, t) => acc + (t ? 1 : 0), 0);
  if (matched / narrationTokens.length < minMatchRatio) return null;

  // Per-phrase raw start (first matched word start) / end (last matched word end).
  const rawStarts: number[] = [];
  const rawEnds: number[] = [];
  let idx = 0;
  for (const tokens of phraseTokens) {
    const slice = tokenTimes.slice(idx, idx + tokens.length);
    idx += tokens.length;
    const present = slice.filter((t): t is TokenTime => t !== null);
    if (present.length > 0) {
      rawStarts.push(present[0].start);
      rawEnds.push(present[present.length - 1].end);
    } else {
      rawStarts.push(NaN);
      rawEnds.push(NaN);
    }
  }

  const audioEnd = transcriptWords.reduce((m, w) => Math.max(m, w.end), 0);
  const total =
    input.totalSeconds && input.totalSeconds > 0
      ? input.totalSeconds
      : audioEnd;

  // Fill any unaligned phrases so the track is continuous.
  const starts = interpolateSeries(rawStarts, 0, total);
  const ends = interpolateSeries(rawEnds, 0, total);

  // Build cues: start = first word start (clamped monotonic), end = last word
  // end (floored to the minimum on-screen time), then bridge inter-phrase
  // silence so the track is gap-free and overlap-free.
  const cues: SubtitleCue[] = [];
  let prevEnd = 0;
  for (let i = 0; i < phrases.length; i++) {
    const start = Math.max(starts[i], prevEnd);
    const end = Math.max(ends[i], start + minCue);
    cues.push({ startSeconds: start, endSeconds: end, text: phrases[i] });
    prevEnd = end;
  }

  // Close gaps: each cue holds until the next one begins (no blank flashes),
  // which also guarantees no overlaps and strict monotonic order.
  for (let i = 0; i < cues.length - 1; i++) {
    cues[i].endSeconds = cues[i + 1].startSeconds;
  }

  // Clamp the whole track to the timeline so nothing runs past the video.
  for (const cue of cues) {
    if (cue.startSeconds > total) cue.startSeconds = total;
    if (cue.endSeconds > total) cue.endSeconds = total;
    if (cue.endSeconds <= cue.startSeconds) {
      cue.endSeconds = Math.min(total, cue.startSeconds + minCue);
    }
  }

  const last = cues[cues.length - 1];
  return { cues, totalSeconds: last.endSeconds };
}
