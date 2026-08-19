import type { ElevenLabsCharacterAlignment } from "@/lib/elevenlabs/adapter";

export interface SpokenCharTiming {
  char: string;
  start_seconds: number;
  end_seconds: number;
  voiceover_index: number;
}

const TAG_HEAD = /^\[(?:excited|confident|warm|calm|serious)\]/i;

export function normalizeVoiceoverForMatch(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[""„"]/g, '"')
    .trim()
    .toLowerCase();
}

function isTagAt(chars: string[], index: number): number {
  const slice = chars.slice(index).join("");
  const m = slice.match(TAG_HEAD);
  return m ? m[0].length : 0;
}

function normalizeCharForWalk(c: string): string {
  if (/\s/.test(c)) return " ";
  const q = c.replace(/[""„"]/g, '"');
  return q.toLowerCase();
}

/**
 * Maps each index in normalizeVoiceoverForMatch(approved) to an index in spokenRaw
 * (alignment characters with tags stripped).
 */
export function buildNormIndexToSpokenRawIndex(
  approvedVoiceover: string,
  spokenRaw: string,
): number[] {
  const approvedNorm = normalizeVoiceoverForMatch(approvedVoiceover);
  const spokenNorm = normalizeVoiceoverForMatch(spokenRaw);
  if (approvedNorm !== spokenNorm) {
    throw new Error("alignment_voiceover_mismatch");
  }
  const map: number[] = [];
  let si = 0;
  for (let ni = 0; ni < spokenNorm.length; ni++) {
    const normChar = spokenNorm[ni]!;
    if (normChar === " ") {
      while (si < spokenRaw.length && !/\s/.test(spokenRaw[si]!)) {
        si++;
      }
      const spaceIdx = si < spokenRaw.length ? si : Math.max(0, si - 1);
      map.push(spaceIdx);
      while (si < spokenRaw.length && /\s/.test(spokenRaw[si]!)) {
        si++;
      }
      continue;
    }
    while (si < spokenRaw.length && /\s/.test(spokenRaw[si]!)) {
      si++;
    }
    if (si >= spokenRaw.length) {
      throw new Error("alignment_norm_map_incomplete");
    }
    const rawChar = normalizeCharForWalk(spokenRaw[si]!);
    if (rawChar !== normChar) {
      throw new Error("alignment_voiceover_mismatch");
    }
    map.push(si);
    si++;
  }
  if (map.length !== approvedNorm.length) {
    throw new Error("alignment_norm_map_incomplete");
  }
  return map;
}

export function spokenRawFromAlignment(
  alignment: ElevenLabsCharacterAlignment,
): string {
  const chars = alignment.characters;
  let out = "";
  for (let i = 0; i < chars.length; ) {
    const tagLen = isTagAt(chars, i);
    if (tagLen > 0) {
      i += tagLen;
      continue;
    }
    out += chars[i]!;
    i += 1;
  }
  return out;
}

/** Map each normalized voiceover character index to ElevenLabs timings (tags excluded). */
export function spokenCharTimingsFromAlignment(
  alignment: ElevenLabsCharacterAlignment,
  approvedVoiceover: string,
): SpokenCharTiming[] {
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  if (
    chars.length !== starts.length ||
    chars.length !== ends.length ||
    chars.length === 0
  ) {
    throw new Error("alignment_length_mismatch");
  }

  const units: Array<{ char: string; start: number; end: number; rawIndex: number }> =
    [];
  for (let i = 0; i < chars.length; ) {
    const tagLen = isTagAt(chars, i);
    if (tagLen > 0) {
      i += tagLen;
      continue;
    }
    units.push({
      char: chars[i]!,
      start: starts[i]!,
      end: ends[i]!,
      rawIndex: i,
    });
    i += 1;
  }

  const spokenRaw = units.map((u) => u.char).join("");
  const spokenNorm = normalizeVoiceoverForMatch(spokenRaw);
  const approvedNorm = normalizeVoiceoverForMatch(approvedVoiceover);
  if (spokenNorm !== approvedNorm) {
    throw new Error("alignment_voiceover_mismatch");
  }

  return units.map((u, index) => ({
    char: u.char,
    start_seconds: u.start,
    end_seconds: u.end,
    voiceover_index: index,
  }));
}

export function excerptTimeRangeFromAlignment(
  alignment: ElevenLabsCharacterAlignment,
  approvedVoiceover: string,
  excerpt: string,
): { start_seconds: number; end_seconds: number } {
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  const spokenRaw = spokenRawFromAlignment(alignment);
  const approvedNorm = normalizeVoiceoverForMatch(approvedVoiceover);
  const spokenNorm = normalizeVoiceoverForMatch(spokenRaw);
  if (spokenNorm !== approvedNorm) {
    throw new Error("alignment_voiceover_mismatch");
  }
  const excerptNorm = normalizeVoiceoverForMatch(excerpt);
  if (!excerptNorm) {
    throw new Error("excerpt_empty");
  }
  const idx = approvedNorm.indexOf(excerptNorm);
  if (idx < 0) {
    throw new Error("excerpt_not_in_voiceover");
  }
  const endIdx = idx + excerptNorm.length - 1;
  const normToRaw = buildNormIndexToSpokenRawIndex(approvedVoiceover, spokenRaw);
  const startRaw = normToRaw[idx]!;
  const endRaw = normToRaw[endIdx]!;
  return {
    start_seconds: starts[startRaw]!,
    end_seconds: ends[endRaw]!,
  };
}

export function alignmentCoversFullVoiceover(
  alignment: ElevenLabsCharacterAlignment,
  approvedVoiceover: string,
  audioDurationSeconds: number,
): void {
  const spoken = spokenCharTimingsFromAlignment(alignment, approvedVoiceover);
  const last = spoken[spoken.length - 1];
  if (!last || last.end_seconds > audioDurationSeconds + 0.25) {
    throw new Error("alignment_exceeds_audio");
  }
}
