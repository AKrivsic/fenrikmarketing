import { CTA_TYPES_BY_GOAL } from "@/lib/ai/types";
import type { GoalType } from "@/lib/supabase/types";

export interface AuthoritativeCtaReference {
  /** Primary display text for alignment (package first, then project default). */
  text: string;
  /** Where the reference text came from. */
  source: "package" | "project_default";
}

export function hasUsableCtaText(text: string | null | undefined): boolean {
  const t = text?.trim() ?? "";
  if (t.length < 3) return false;
  if (!/[a-zA-Z0-9\u00C0-\u024F]/.test(t)) return false;
  return true;
}

export function resolveAuthoritativeCtaReference(args: {
  packageCtaText?: string | null;
  projectDefaultCta?: string | null;
}): AuthoritativeCtaReference | null {
  const pkg = args.packageCtaText?.trim() ?? "";
  if (hasUsableCtaText(pkg)) {
    return { text: pkg, source: "package" };
  }
  const def = args.projectDefaultCta?.trim() ?? "";
  if (hasUsableCtaText(def)) {
    return { text: def, source: "project_default" };
  }
  return null;
}

/** Whether CTA scenes may appear in prompts / ceiling (pre- or post-package). */
export function projectPermitsCtaScenes(args: {
  projectDefaultCta?: string | null;
  goalType?: string | null;
  packageCtaText?: string | null;
}): boolean {
  if (resolveAuthoritativeCtaReference(args)) return true;
  const goalType = args.goalType;
  if (goalType && goalType in CTA_TYPES_BY_GOAL) {
    return CTA_TYPES_BY_GOAL[goalType as GoalType].length > 0;
  }
  return false;
}
