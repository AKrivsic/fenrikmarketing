import type { SpeechProvider } from "@/lib/ai/types";
import {
  getVoiceCandidate,
  quoteVoiceCost,
  type VoiceCandidate,
} from "@/lib/ai-media-benchmark/catalog";
import { OPENAI_BENCHMARK_TTS_INSTRUCTIONS } from "@/lib/ai-media-benchmark/types";

export interface BenchmarkVoiceResult {
  provider: string;
  model: string;
  voiceId: string;
  durationSeconds: number | null;
  estimatedCostUsd: number | null;
  estimatedCredits: number | null;
  latencyMs: number;
  audioBase64: string | null;
  error: string | null;
}

export interface BenchmarkVoiceProvider {
  synthesize(args: {
    candidate: VoiceCandidate;
    text: string;
  }): Promise<BenchmarkVoiceResult>;
}

export function createOpenAiBenchmarkVoiceProvider(
  speech: SpeechProvider,
): BenchmarkVoiceProvider {
  return {
    async synthesize({ candidate, text }) {
      const started = Date.now();
      const result = await speech.synthesize({
        text,
        model: candidate.modelId,
        voice: candidate.voiceId,
        format: "mp3",
        instructions: OPENAI_BENCHMARK_TTS_INSTRUCTIONS,
      });
      const quote = quoteVoiceCost({ candidateId: candidate.candidateId, text });
      return {
        provider: candidate.provider,
        model: candidate.modelId,
        voiceId: candidate.voiceId,
        durationSeconds: null,
        estimatedCostUsd: quote.usd,
        estimatedCredits: quote.credits,
        latencyMs: Date.now() - started,
        audioBase64: result.audioBase64,
        error: null,
      };
    },
  };
}

export function requireVoiceCandidate(candidateId: string): VoiceCandidate {
  const candidate = getVoiceCandidate(candidateId);
  if (!candidate) throw new Error("unknown_voice_candidate");
  if (candidate.status !== "testable") throw new Error("voice_candidate_unsupported");
  return candidate;
}
