/**
 * Whether a persisted package_brief carries usable creative signal for originality history.
 * Does not require approved snapshot or publish completeness.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Valid Creative Core v2 payload (idea + spoken text; video needs scenes). */
export function briefHasValidCreativeCoreV2(
  brief: Record<string, unknown>,
): boolean {
  const core = asRecord(brief.content_creative_core_v2);
  if (!core) return false;
  const idea = readString(core.core_idea);
  const spoken =
    readString(core.voiceover) ||
    readString(core.hook) ||
    readString(asRecord(brief.t2v_canonical_creative)?.core_idea);
  if (idea.length < 8 && spoken.length < 8) return false;
  const scenes = Array.isArray(core.scenes) ? core.scenes : [];
  if (scenes.length === 0) {
    return idea.length >= 8 || spoken.length >= 8;
  }
  return scenes.some((s) => {
    const rec = asRecord(s);
    if (!rec) return false;
    return (
      readString(rec.voiceover_excerpt).length >= 4 ||
      readString(rec.visual_event).length >= 4
    );
  });
}
