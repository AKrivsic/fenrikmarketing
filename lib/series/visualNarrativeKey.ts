/** Read persisted visual_narrative.key from package_brief (series memory). */
export function readVisualNarrativeKeyFromPackageBrief(
  brief: Record<string, unknown> | null | undefined,
): string | null {
  if (!brief) return null;
  const pg = brief.presentation_generation;
  if (!pg || typeof pg !== "object" || Array.isArray(pg)) return null;
  const vn = (pg as Record<string, unknown>).visual_narrative;
  if (!vn || typeof vn !== "object" || Array.isArray(vn)) return null;
  const key = (vn as Record<string, unknown>).key;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}
