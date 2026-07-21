/**
 * On-screen CTA source-of-truth: typed CTA scene in visual_scenes.
 * When absent, strip script claims that invent an on-screen CTA.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function scrubScriptOnScreenCtaClaims(script: string): string {
  return script
    .replace(/\s*CTA text on screen\.?/gi, "")
    .replace(/\s*CTA on screen\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

/** True when visual_scenes includes a typed CTA scene. */
export function packageHasTypedCtaScene(
  visualScenes: readonly unknown[] | null | undefined,
): boolean {
  for (const s of visualScenes ?? []) {
    const r = asRecord(s);
    if (String(r?.type ?? "").toUpperCase() === "CTA") return true;
  }
  return false;
}

export function alignOnScreenCtaContract(args: {
  videoScript?: string | null;
  visualScenes?: readonly unknown[] | null;
}): { script: string | null; changed: boolean; reason: string | null } {
  const script =
    typeof args.videoScript === "string" ? args.videoScript : null;
  if (!script) {
    return { script: null, changed: false, reason: null };
  }
  if (packageHasTypedCtaScene(args.visualScenes)) {
    return { script, changed: false, reason: null };
  }
  if (!/CTA\s+(text\s+)?on\s+screen/i.test(script)) {
    return { script, changed: false, reason: null };
  }
  return {
    script: scrubScriptOnScreenCtaClaims(script),
    changed: true,
    reason: "removed_onscreen_cta_claim_without_typed_cta_scene",
  };
}
