/**
 * Production-language spoken text for Manual Review.
 *
 * Still packages keep using voiceover.final_approved (localized editor copy).
 * Text-to-video packages must speak the current English preview — the project
 * production language — never the operator working copy.
 */

import { isEnglishPreviewCurrent } from "@/lib/creative-review/lifecycle";
import type { CreativeReview } from "@/lib/creative-review/types";

/** Current production-language voiceover, or null when translation is stale/missing. */
export function productionSpokenVoiceoverFromReview(
  review: CreativeReview,
): string | null {
  if (!review.voiceover.english_confirmed) return null;
  if (
    !isEnglishPreviewCurrent({
      english_preview: review.voiceover.english_preview,
      english_preview_outdated: review.voiceover.english_preview_outdated,
    })
  ) {
    return null;
  }
  const preview = review.voiceover.english_preview?.trim() ?? "";
  return preview.length > 0 ? preview : null;
}

/**
 * Fail closed when the operator working copy would be sent as the EN voiceover.
 * Same-language editor/project (both en) is allowed — copies may be identical.
 */
export function editorWorkingCopyMustNotBeProductionVoiceover(args: {
  localizedEdit: string;
  productionVoiceover: string;
  editorLanguage: string | null | undefined;
  projectLanguage: string | null | undefined;
}): boolean {
  const localized = args.localizedEdit.trim();
  const production = args.productionVoiceover.trim();
  if (!localized || !production) return false;
  const editor = (args.editorLanguage ?? "").trim().toLowerCase();
  const project = (args.projectLanguage ?? "").trim().toLowerCase();
  if (editor && project && editor === project) return false;
  if (editor && editor !== "en" && localized === production) return true;
  return false;
}
