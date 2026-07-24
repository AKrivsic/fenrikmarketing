/** Storyboard role arc helpers (extracted from retired Narrative Beats planners). */

export type NarrativeBeatRole = "HOOK" | "SETUP" | "ESCALATION" | "RESOLUTION";

export function narrativeBeatRolesForCount(count: number): NarrativeBeatRole[] {
  if (count <= 0) return [];
  if (count === 1) return ["HOOK"];
  if (count === 2) return ["HOOK", "RESOLUTION"];
  if (count === 3) return ["HOOK", "ESCALATION", "RESOLUTION"];
  return Array.from({ length: count }, (_u, i) => {
    const idx =
      count === 1 ? 0 : Math.min(3, Math.floor((i * 4) / count));
    return (["HOOK", "SETUP", "ESCALATION", "RESOLUTION"] as const)[idx]!;
  });
}

export { planBeatDurations, weightForNarrativeRole, MAX_BEAT_SHARE } from "@/lib/video-engine/beatDurations";
