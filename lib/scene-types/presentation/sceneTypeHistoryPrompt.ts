import type { SceneTypeProjectHistory } from "@/lib/scene-types/presentation/sceneTypeProjectHistory";

/**
 * Series memory for scene types (Scene Types v2).
 * Soft guidance only — never instructs a ban or quota.
 */
export function buildSceneTypeHistoryRestraintBlock(
  history: SceneTypeProjectHistory | null | undefined,
): string {
  const lines = [
    "SCENE TYPE MEMORY (project content history — soft signals only):",
    "- Scene Types are presentation tools chosen per beat, not recurring templates.",
    "- IMAGE remains common across a monthly series; that is normal.",
    "- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.",
    "- Recent use of a typed scene is a soft negative signal when another expression is similarly strong:",
    "  prefer the less recently used expression (especially within this production run / weekly strategy).",
    "- If a typed scene is clearly stronger for THIS beat, keep it — do not rotate for variety alone.",
    "- CHECKLIST is especially prone to over-use on list-like topics; treat recent CHECKLIST use as a soft",
    "  tie-breaker toward IMAGE / process / comparison / object stills when those are similarly strong.",
    "- Voiceover and subtitles can carry CTAs without a CTA scene.",
    "- Multiple IMAGE-only videos in sequence are valid when no typed scene is stronger.",
    "- There is no minimum or maximum count of typed scenes across the series.",
  ];

  if (!history || history.recentPackages.length === 0) {
    lines.push(
      "- No recent package history is available; still choose the strongest expression per beat (IMAGE or typed).",
    );
    return lines.join("\n");
  }

  const recentLabels = history.recentPackages
    .slice(0, 6)
    .map((p) => {
      const types =
        p.specialTypes.length > 0 ? p.specialTypes.join(", ") : "IMAGE-only";
      return types;
    })
    .filter(Boolean);

  if (recentLabels.length > 0) {
    lines.push(
      `- Recent packages for this project used these presentation patterns (newest first): ${recentLabels.join(" | ")}.`,
    );
  }

  if (history.lastPackageSpecialTypes.length > 0) {
    lines.push(
      `- The previous package used: ${history.lastPackageSpecialTypes.join(", ")}. Soft tie-breaker only — repeat only if clearly stronger for this beat.`,
    );
  }

  if (history.weeklyStrategySpecialTypes.length > 0) {
    lines.push(
      `- Other packages in this weekly strategy already used: ${history.weeklyStrategySpecialTypes.join(", ")}. Soft tie-breaker — reuse only when clearly strongest for this beat.`,
    );
  }

  const checklistRecentlyUsed =
    history.lastPackageSpecialTypes.includes("CHECKLIST") ||
    history.weeklyStrategySpecialTypes.includes("CHECKLIST") ||
    history.recentPackages.some((p) => p.specialTypes.includes("CHECKLIST"));

  if (checklistRecentlyUsed) {
    lines.push(
      "- CHECKLIST appeared recently in this series. Soft negative signal: when CHECKLIST and IMAGE",
      "  (or process / comparison / object imagery) are similarly strong, prefer the non-CHECKLIST expression.",
      "  Keep CHECKLIST when simultaneous scanning of concrete items is clearly the main value of the beat.",
    );
  }

  if (history.ctaUsedInRecentWindow) {
    lines.push(
      "- A dedicated CTA scene appeared in a recent video. Soft signal — use typed CTA again only when a branded end card is clearly the strongest close.",
    );
  }

  return lines.join("\n");
}
