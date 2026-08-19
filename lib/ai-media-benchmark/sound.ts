import {
  getSoundCandidate,
  quoteSoundCost,
  type SoundCandidate,
} from "@/lib/ai-media-benchmark/catalog";

export function requireSoundCandidate(candidateId: string): SoundCandidate {
  const candidate = getSoundCandidate(candidateId);
  if (!candidate) throw new Error("unknown_sound_candidate");
  if (candidate.status !== "testable") throw new Error("sound_candidate_unsupported");
  return candidate;
}

export function requireSoundQuote(candidateId: string, durationSeconds: number) {
  return quoteSoundCost({ candidateId, durationSeconds });
}
