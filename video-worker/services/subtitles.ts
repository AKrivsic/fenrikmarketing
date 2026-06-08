import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// Video Quality V2 — Subtitle V2.
// Instead of one cue that spans (and visually "disappears" across) the whole
// clip, we emit one timed cue per beat, with important words highlighted. Cues
// inherit beat durations (2–5s) so each line stays on screen long enough to
// read, and the timing follows the visible timeline.

export interface SubtitleCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface WriteSrtFileInput {
  // Preferred (V2): one cue per beat with explicit timing.
  cues?: SubtitleCue[];
  // Fallback (legacy): a single block of text spanning the whole clip.
  subtitles?: string;
  voiceoverText: string;
  durationSeconds?: number;
}

export interface WriteSrtFileResult {
  srtPath: string;
}

const DEFAULT_DURATION_SECONDS = 10;

function workerTempDir(): string {
  return (
    process.env.VIDEO_WORKER_TEMP_DIR ?? join(process.cwd(), ".video-worker-tmp")
  );
}

function toSrtTimestamp(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const ms = Math.round((clamped - Math.floor(clamped)) * 1000);
  const whole = Math.floor(clamped);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = whole % 60;
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(ms, 3)}`;
}

// Task 4 — highlights important words by bolding them (libass renders <b> from
// SRT). We bold numbers/metrics/currency and shouted (ALL-CAPS) words, which is
// where proof and emphasis usually live. Deliberately conservative so it never
// bolds the whole line.
function emphasizeKeywords(text: string): string {
  return text
    .split(/(\s+)/)
    .map((token) => {
      if (/^\s+$/.test(token) || token.length === 0) return token;
      const isNumeric = /\d/.test(token);
      const isShout = /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]{2,}[!?.,:;]?$/.test(token);
      return isNumeric || isShout ? `<b>${token}</b>` : token;
    })
    .join("");
}

function buildCueBlock(index: number, cue: SubtitleCue): string {
  const start = toSrtTimestamp(cue.startSeconds);
  const end = toSrtTimestamp(Math.max(cue.endSeconds, cue.startSeconds + 0.5));
  const text = emphasizeKeywords(cue.text.replace(/\s+/g, " ").trim() || " ");
  return `${index}\n${start} --> ${end}\n${text}\n`;
}

// Writes the SRT file. Prefers the per-beat cues (V2); falls back to a single
// cue spanning the clip when no cues are provided (keeps the pipeline working
// for legacy inputs).
export async function writeSrtFile(
  input: WriteSrtFileInput,
): Promise<WriteSrtFileResult> {
  const dir = workerTempDir();
  await mkdir(dir, { recursive: true });
  const srtPath = join(dir, `subtitles-${randomUUID()}.srt`);

  const validCues = (input.cues ?? []).filter(
    (cue) => cue.text.trim().length > 0 && cue.endSeconds > cue.startSeconds,
  );

  let content: string;
  if (validCues.length > 0) {
    content = validCues
      .map((cue, i) => buildCueBlock(i + 1, cue))
      .join("\n");
  } else {
    const rawText = (input.subtitles ?? input.voiceoverText ?? "").trim();
    const text = rawText.length > 0 ? rawText : " ";
    const end =
      input.durationSeconds && input.durationSeconds > 0
        ? input.durationSeconds
        : DEFAULT_DURATION_SECONDS;
    content = buildCueBlock(1, { startSeconds: 0, endSeconds: end, text });
  }

  await writeFile(srtPath, content, "utf8");
  return { srtPath };
}
