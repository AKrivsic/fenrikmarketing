import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import {
  assetSignalsFromRef,
  type ProjectAssetSignal,
} from "@/lib/scene-types/presentation/projectSignals";

export function phoneEligibleAssetSignals(
  refs: readonly AssetRef[],
): ProjectAssetSignal[] {
  return refs
    .map((ref) => assetSignalsFromRef(ref))
    .filter((signal) => signal.mobileUi || signal.phonePresentation);
}

export function buildPhoneEligibleAssetsPromptBlock(
  refs: readonly AssetRef[],
): string | null {
  const eligible = phoneEligibleAssetSignals(refs);
  if (eligible.length === 0) return null;

  const lines = [
    "PHONE-ELIGIBLE ASSETS (approved mobile UI — prefer these for PHONE scenes):",
    ...eligible.map(
      (a) =>
        `- id="${a.id}" title="${a.title.replace(/"/g, "'")}" (mobile UI / phone presentation)`,
    ),
    "- For PHONE scenes, use payload.asset_id with one of these ids only.",
    "- Do not invent asset ids.",
  ];
  return lines.join("\n");
}
