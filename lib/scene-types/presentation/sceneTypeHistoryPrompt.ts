import type { SceneTypeProjectHistory } from "@/lib/scene-types/presentation/sceneTypeProjectHistory";

export function buildSceneTypeHistoryRestraintBlock(
  history: SceneTypeProjectHistory | null | undefined,
): string {
  const lines = [
    "SCENE TYPE RESTRAINT (project content history):",
    "- Scene Types are sparse presentation tools, not recurring templates.",
    "- IMAGE is the default and may dominate many videos in a row.",
    "- Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA for variety.",
    "- Prefer IMAGE when recent packages already used a special layout.",
    "- Voiceover and subtitles can carry CTAs without a CTA scene.",
    "- Multiple IMAGE-only videos in sequence are valid and often preferred.",
  ];

  if (!history || history.recentPackages.length === 0) {
    lines.push(
      "- No recent package history is available; still default to IMAGE unless a special type clearly improves one beat.",
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
      `- The previous package used: ${history.lastPackageSpecialTypes.join(", ")}. Avoid repeating the same special type in this package unless the beat clearly requires it.`,
    );
  }

  if (history.weeklyStrategySpecialTypes.length > 0) {
    lines.push(
      `- Other packages in this weekly strategy already used: ${history.weeklyStrategySpecialTypes.join(", ")}. Prefer IMAGE when sufficient.`,
    );
  }

  if (history.ctaUsedInRecentWindow) {
    lines.push(
      "- A dedicated CTA scene appeared in a recent video. Prefer IMAGE for the closing beat unless a visual end card is essential.",
    );
  }

  return lines.join("\n");
}
