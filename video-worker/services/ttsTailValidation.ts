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

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
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

  const tokens = lastSentence
    .split(/\s+/)
    .map(normalizeToken)
    .filter((t) => t.length > 0);
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
  for (const token of transcript) {
    if (token === expected[ei]) {
      ei++;
      if (ei === expected.length) return true;
    }
  }
  return false;
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

  constructor(expectedTail: string[], transcriptTail: string[]) {
    super(
      "tts_tail_validation_failed: TTS output did not include expected script ending " +
        `(expected tail: ${expectedTail.join(" ")}, transcript tail: ${transcriptTail.join(" ")})`,
    );
    this.name = "TtsTailValidationError";
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
}): Promise<GenerateValidatedVoiceoverResult> {
  const expectedTail = extractExpectedTailTokens(args.text);
  const attemptLogs: TtsTailValidationAttemptLog[] = [];
  let lastTranscriptTail: string[] = [];

  for (
    let attempt = 1;
    attempt <= TTS_TAIL_VALIDATION_MAX_ATTEMPTS;
    attempt++
  ) {
    const voiceover = await generateVoiceover({ text: args.text });
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

  throw new TtsTailValidationError(expectedTail, lastTranscriptTail);
}
