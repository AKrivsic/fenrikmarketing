import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { getTranscriptionProvider } from "@/lib/ai";
import { withTelemetry } from "@/lib/ai/telemetry";
import type { WordTimestamp } from "@/lib/ai/types";

// Word Timestamp Subtitles V1.
//
// After TTS produces the voiceover MP3, we transcribe that exact audio with
// OpenAI whisper-1 (verbose_json + word granularity) to obtain REAL per-word
// timestamps. Phrase subtitles are then aligned to the spoken audio instead of
// a proportional estimate (see phraseCaptions.buildPhraseCuesFromWords).
//
// This whole module is BEST-EFFORT and never throws: a timeout, API error,
// missing file, or empty/garbage timestamps all resolve to `null` so the caller
// falls back to the existing proportional timing. Video generation must never
// fail because subtitle alignment failed.

// ISO-639-1 codes whisper accepts for the languages this product ships in.
// "cz" is the colloquial/locale label for Czech; the ISO code is "cs".
const LANGUAGE_HINT_MAP: Record<string, string> = {
  cz: "cs",
  cs: "cs",
  en: "en",
  de: "de",
  fr: "fr",
  es: "es",
  it: "it",
};

// Normalizes a free-form language value (e.g. "cs", "CZ", "en-US", "de_DE")
// into the ISO-639-1 hint whisper expects, or undefined when unsupported (let
// whisper auto-detect). Multilingual support: CZ, EN, DE, FR, ES, IT.
export function normalizeLanguageHint(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const base = raw.trim().toLowerCase().split(/[-_]/)[0];
  if (!base) return undefined;
  return LANGUAGE_HINT_MAP[base];
}

// Validates and cleans the raw word array from a verbose_json response into a
// monotonic list of usable timestamps. Drops entries with empty text, non-finite
// or negative offsets, or end < start. Returns [] for anything unusable. Pure
// and dependency-free so it is directly unit-testable.
export function sanitizeWhisperWords(raw: unknown): WordTimestamp[] {
  if (!Array.isArray(raw)) return [];
  const out: WordTimestamp[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const word = typeof record.word === "string" ? record.word.trim() : "";
    const start =
      typeof record.start === "number" ? record.start : Number(record.start);
    const end = typeof record.end === "number" ? record.end : Number(record.end);
    if (!word) continue;
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (start < 0 || end < start) continue;
    out.push({ word, start, end });
  }
  // whisper returns words in spoken order, but sort defensively so downstream
  // alignment can rely on monotonic starts.
  out.sort((a, b) => a.start - b.start);
  return out;
}

export interface TranscribeWordTimestampsInput {
  audioPath: string;
  // Free-form language value from the job input (e.g. "cs"); optional.
  language?: unknown;
}

export interface TranscribeWordTimestampsResult {
  words: WordTimestamp[];
  // Language echoed back / detected by whisper (verbose_json `language`), when
  // present. Recorded for diagnostics (Part G); never affects the render.
  languageDetected?: string;
}

// Transcribes the audio file and returns clean word timestamps, or null on ANY
// failure (so the caller falls back to proportional timing). Never throws.
export async function transcribeWordTimestamps(
  input: TranscribeWordTimestampsInput,
): Promise<TranscribeWordTimestampsResult | null> {
  return withTelemetry(
    {
      stepName: "Whisper",
      provider: "whisper",
      model: "whisper-1",
      inputSummary: "Whisper input:\n- Voiceover audio\n- Language hint",
      outputSummary: (r) =>
        r
          ? `${r.words.length} words${r.languageDetected ? ` (${r.languageDetected})` : ""}`
          : "fallback to proportional timing",
      successFromResult: () => true,
      measureOutput: (r) =>
        r
          ? { wordCount: r.words.length, language: r.languageDetected ?? null }
          : null,
    },
    async () => {
      try {
        const audio = await readFile(input.audioPath);
        const provider = getTranscriptionProvider();
        const languageHint = normalizeLanguageHint(input.language);

        const result = await provider.transcribeWords({
          audio,
          filename: basename(input.audioPath),
          contentType: "audio/mpeg",
          ...(languageHint ? { language: languageHint } : {}),
        });

        const words = sanitizeWhisperWords(result.words);
        if (words.length === 0) {
          console.warn(
            "[video-worker] transcription returned no usable word timestamps; falling back to proportional timing",
          );
          return null;
        }
        return {
          words,
          ...(typeof result.language === "string"
            ? { languageDetected: result.language }
            : {}),
        };
      } catch (err) {
        console.warn(
          "[video-worker] word-timestamp transcription failed; falling back to proportional timing",
          JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
          }),
        );
        return null;
      }
    },
  );
}
