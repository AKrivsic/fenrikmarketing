import type { ElevenLabsWithTimestampsResponse } from "@/lib/elevenlabs/adapter";
import {
  normalizeVoiceoverForMatch,
  spokenRawFromAlignment,
} from "@/lib/elevenlabs/alignmentVoiceover";
import type { ElevenLabsCharacterAlignment } from "@/lib/elevenlabs/adapter";
import { validateElevenLabsAlignment } from "@/lib/elevenlabs/adapter";

/**
 * Prefer original alignment (matches submitted synthesis text).
 * normalized_alignment is fallback only when it still matches approved voiceover.
 */
export function selectAlignmentForApprovedVoiceover(
  response: Pick<
    ElevenLabsWithTimestampsResponse,
    "alignment" | "normalized_alignment"
  >,
  approvedVoiceover: string,
): {
  alignment: ElevenLabsCharacterAlignment;
  source: "alignment" | "normalized_alignment";
} {
  const approvedNorm = normalizeVoiceoverForMatch(approvedVoiceover);
  if (response.alignment) {
    const align = validateElevenLabsAlignment(response.alignment);
    const spokenNorm = normalizeVoiceoverForMatch(
      spokenRawFromAlignment(align),
    );
    if (spokenNorm === approvedNorm) {
      return { alignment: align, source: "alignment" };
    }
  }
  if (response.normalized_alignment) {
    const normAlign = validateElevenLabsAlignment(response.normalized_alignment);
    const spokenNorm = normalizeVoiceoverForMatch(
      spokenRawFromAlignment(normAlign),
    );
    if (spokenNorm === approvedNorm) {
      return { alignment: normAlign, source: "normalized_alignment" };
    }
    throw new Error("normalized_alignment_voiceover_mismatch");
  }
  throw new Error("alignment_missing");
}
