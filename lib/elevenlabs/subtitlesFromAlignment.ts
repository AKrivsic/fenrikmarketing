import type { ElevenLabsCharacterAlignment } from "@/lib/elevenlabs/adapter";
import { spokenCharTimingsFromAlignment } from "@/lib/elevenlabs/alignmentVoiceover";

export interface SubtitleCue {
  start_seconds: number;
  end_seconds: number;
  text: string;
}

/** Build non-overlapping cues; display text is approved voiceover only (no audio tags). */
export function subtitleCuesFromElevenAlignment(
  alignment: ElevenLabsCharacterAlignment,
  approvedVoiceover: string,
  maxCueChars = 42,
): SubtitleCue[] {
  const spoken = spokenCharTimingsFromAlignment(alignment, approvedVoiceover);
  const cues: SubtitleCue[] = [];
  let buffer = "";
  let cueStart: number | null = null;
  let cueEnd = 0;

  const flush = () => {
    const text = buffer.replace(/\s+/g, " ").trim();
    if (!text || cueStart === null) {
      buffer = "";
      cueStart = null;
      return;
    }
    cues.push({
      start_seconds: cueStart,
      end_seconds: cueEnd,
      text,
    });
    buffer = "";
    cueStart = null;
  };

  for (const item of spoken) {
    const ch = item.char;
    if (/\[(excited|confident|warm|calm|serious)\]/i.test(ch)) continue;
    if (cueStart === null) cueStart = item.start_seconds;
    cueEnd = item.end_seconds;
    buffer += ch;
    const trimmed = buffer.trim();
    if (
      trimmed.length >= maxCueChars ||
      ch === "\n" ||
      ch === "." ||
      ch === "!" ||
      ch === "?"
    ) {
      flush();
    }
  }
  flush();

  for (let i = 1; i < cues.length; i++) {
    const prev = cues[i - 1]!;
    const cur = cues[i]!;
    if (cur.start_seconds < prev.end_seconds) {
      cur.start_seconds = prev.end_seconds;
    }
  }
  return cues;
}

export function cuesToSrt(cues: SubtitleCue[]): string {
  return cues
    .map((cue, index) => {
      const start = formatSrtTime(cue.start_seconds);
      const end = formatSrtTime(cue.end_seconds);
      return `${index + 1}\n${start} --> ${end}\n${cue.text}\n`;
    })
    .join("\n");
}

function formatSrtTime(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msPart = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(msPart).padStart(3, "0")}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
