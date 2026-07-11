import { rm } from "node:fs/promises";
import type { WordTimestamp } from "@/lib/ai/types";
import {
  generateVoiceover,
  type GenerateVoiceoverResult,
} from "@/video-worker/services/tts";
import {
  transcribeWordTimestamps,
  type TranscribeWordTimestampsResult,
} from "@/video-worker/services/wordTimestamps";

export const TTS_TAIL_VALIDATION_MAX_ATTEMPTS = 3;
const EXPECTED_TAIL_TOKEN_COUNT = 6;
const TRANSCRIPT_TAIL_LABEL_COUNT = 8;

function foldDiacritics(token: string): string {
  return token.normalize("NFD").replace(/\p{M}/gu, "");
}

function normalizeToken(token: string): string {
  return foldDiacritics(
    token.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""),
  );
}

// Comparison-only canonical forms (conservative; whitelist-style aliases).
function canonicalMatchToken(token: string): string {
  const n = normalizeToken(token);
  if (/^(fenrik|fenric)chat$/.test(n)) return "fenrikchat";
  if (n === "fenric") return "fenrik";
  if (n === "signup") return "signup";
  if (n === "inscrivezvous") return "inscrivezvous";
  return n;
}

// Whisper splits hyphenated words (e.g. FR "Inscrivez-vous" → inscrivez + vous).
// Split on whitespace and dashes so script tokens align with transcript tokens.
const TAIL_TOKEN_SPLIT = /[\s\-–—]+/;

function tailTokensFromSentence(sentence: string): string[] {
  return sentence
    .split(TAIL_TOKEN_SPLIT)
    .map(normalizeToken)
    .filter((t) => t.length > 0);
}

// When the script still yields one merged token (legacy paths), allow matching
// it to 2–3 consecutive whisper tokens (e.g. inscrivez + vous → inscrivezvous).
const MAX_TRANSCRIPT_TOKENS_PER_EXPECTED = 3;
const MAX_EXPECTED_TOKENS_PER_MATCH = 3;
const FUZZY_TOKEN_MIN_LENGTH = 8;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[] = Array.from({ length: cols }, (_, i) => i);
  for (let i = 1; i < rows; i++) {
    let prev = i;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(dist[j] + 1, prev + 1, dist[j - 1] + cost);
      dist[j - 1] = prev;
      prev = next;
    }
    dist[cols - 1] = prev;
  }
  return dist[cols - 1];
}

function tokensEquivalent(expected: string, actual: string): boolean {
  const e = canonicalMatchToken(expected);
  const a = canonicalMatchToken(actual);
  if (e === a) return true;
  if (
    e.length >= FUZZY_TOKEN_MIN_LENGTH &&
    a.length >= FUZZY_TOKEN_MIN_LENGTH
  ) {
    return levenshtein(e, a) <= 1;
  }
  return false;
}

function matchesExpectedTokenAt(
  transcript: string[],
  index: number,
  expectedToken: string,
): number {
  if (index >= transcript.length) return 0;
  if (tokensEquivalent(expectedToken, transcript[index] ?? "")) return 1;

  let concat = "";
  for (
    let parts = 1;
    parts <= MAX_TRANSCRIPT_TOKENS_PER_EXPECTED &&
    index + parts <= transcript.length;
    parts++
  ) {
    concat += transcript[index + parts - 1];
    if (tokensEquivalent(expectedToken, concat)) return parts;
    if (concat.length > expectedToken.length + 1) break;
  }
  return 0;
}

// Last sentence (or whole script) → up to EXPECTED_TAIL_TOKEN_COUNT normalized tokens.
export function extractExpectedTailTokens(
  voiceoverText: string,
  maxTokens = EXPECTED_TAIL_TOKEN_COUNT,
): string[] {
  const normalized = voiceoverText.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const lastSentence =
    sentences.length > 0 ? sentences[sentences.length - 1] : normalized;

  const tokens = tailTokensFromSentence(lastSentence);
  return tokens.slice(-Math.min(maxTokens, tokens.length));
}

export function transcriptTailLabels(
  words: WordTimestamp[],
  maxWords = TRANSCRIPT_TAIL_LABEL_COUNT,
): string[] {
  return words
    .slice(-maxWords)
    .map((w) => normalizeToken(w.word))
    .filter((t) => t.length > 0);
}

// True when every expected tail token appears in order in the whisper transcript.
export function validateScriptTailInTranscript(
  voiceoverText: string,
  words: WordTimestamp[],
): boolean {
  const expected = extractExpectedTailTokens(voiceoverText);
  if (expected.length === 0) return true;
  if (words.length === 0) return false;

  const transcript = words
    .map((w) => normalizeToken(w.word))
    .filter((t) => t.length > 0);

  let ei = 0;
  let ti = 0;
  while (ti < transcript.length && ei < expected.length) {
    let matched = false;
    const maxWidth = Math.min(
      MAX_EXPECTED_TOKENS_PER_MATCH,
      expected.length - ei,
    );
    for (let width = maxWidth; width >= 1; width--) {
      const expectedSlice = expected.slice(ei, ei + width).join("");
      const consumed = matchesExpectedTokenAt(transcript, ti, expectedSlice);
      if (consumed > 0) {
        ei += width;
        ti += consumed;
        matched = true;
        break;
      }
    }
    if (!matched) ti++;
  }
  return ei === expected.length;
}

export interface TtsTailValidationAttemptLog {
  attempt: number;
  pass: boolean;
  durationSeconds?: number;
  expected_tail: string[];
  transcript_tail: string[];
}

export interface TtsTailValidationMeta {
  tts_validation_attempts: number;
  tts_tail_validation_passed: boolean;
  tts_tail_expected: string[];
  tts_tail_transcript: string[];
  tts_tail_retry_used: boolean;
  tts_validation_log?: TtsTailValidationAttemptLog[];
}

export class TtsTailValidationError extends Error {
  readonly code = "tts_tail_validation_failed";
  readonly meta: TtsTailValidationMeta;

  constructor(
    expectedTail: string[],
    transcriptTail: string[],
    meta: TtsTailValidationMeta,
  ) {
    super(
      "tts_tail_validation_failed: TTS output did not include expected script ending " +
        `(expected tail: ${expectedTail.join(" ")}, transcript tail: ${transcriptTail.join(" ")})`,
    );
    this.name = "TtsTailValidationError";
    this.meta = meta;
  }
}

export interface GenerateValidatedVoiceoverResult {
  voiceover: GenerateVoiceoverResult;
  transcription: TranscribeWordTimestampsResult;
  meta: TtsTailValidationMeta;
}

// Generates voiceover audio and verifies (via whisper) that the script tail was
// spoken. Retries TTS up to TTS_TAIL_VALIDATION_MAX_ATTEMPTS; throws on failure.
export async function generateValidatedVoiceover(args: {
  text: string;
  language?: unknown;
  voice?: string;
  instructions?: string;
}): Promise<GenerateValidatedVoiceoverResult> {
  const expectedTail = extractExpectedTailTokens(args.text);
  const attemptLogs: TtsTailValidationAttemptLog[] = [];
  let lastTranscriptTail: string[] = [];

  for (
    let attempt = 1;
    attempt <= TTS_TAIL_VALIDATION_MAX_ATTEMPTS;
    attempt++
  ) {
    const voiceover = await generateVoiceover({
      text: args.text,
      ...(args.voice ? { voice: args.voice } : {}),
      ...(args.instructions ? { instructions: args.instructions } : {}),
    });
    const transcription = await transcribeWordTimestamps({
      audioPath: voiceover.audioPath,
      language: args.language,
    });

    lastTranscriptTail = transcription
      ? transcriptTailLabels(transcription.words)
      : [];
    const pass =
      transcription !== null &&
      validateScriptTailInTranscript(args.text, transcription.words);

    const log: TtsTailValidationAttemptLog = {
      attempt,
      pass,
      durationSeconds: voiceover.durationSeconds,
      expected_tail: expectedTail,
      transcript_tail: lastTranscriptTail,
    };
    attemptLogs.push(log);

    console.log(
      "[video-worker] tts tail validation",
      JSON.stringify(log),
    );

    if (pass && transcription) {
      return {
        voiceover,
        transcription,
        meta: {
          tts_validation_attempts: attempt,
          tts_tail_validation_passed: true,
          tts_tail_expected: expectedTail,
          tts_tail_transcript: lastTranscriptTail,
          tts_tail_retry_used: attempt > 1,
          tts_validation_log: attemptLogs,
        },
      };
    }

    await rm(voiceover.audioPath, { force: true }).catch(() => undefined);
  }

  throw new TtsTailValidationError(expectedTail, lastTranscriptTail, {
    tts_validation_attempts: TTS_TAIL_VALIDATION_MAX_ATTEMPTS,
    tts_tail_validation_passed: false,
    tts_tail_expected: expectedTail,
    tts_tail_transcript: lastTranscriptTail,
    tts_tail_retry_used: attemptLogs.length > 1,
    tts_validation_log: attemptLogs,
  });
}
