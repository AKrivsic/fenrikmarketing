import { isPortraitLike } from "./captureSelection.ts";

export type CaptureViewport = "desktop" | "mobile";

/** Minimal fields for product profile inference (matches pooled candidates). */
export interface ProfileCandidate {
  label: string;
  roleHint: string;
  selectorHint: string;
  captureViewport: CaptureViewport;
  width: number;
  height: number;
}

const SAAS_SIGNAL_RE =
  /(?:dashboard|analytics|admin|saas|chart|table|workspace|productivity|crm|pipeline|metric|kpi|billing|report)/i;

const MOBILE_CONSUMER_SIGNAL_RE =
  /(?:phone|mockup|habit|mobile|app screen|reminder|consumer|tiktok|reels|shorts)/i;

function candidateBlob(c: ProfileCandidate): string {
  return `${c.label} ${c.roleHint} ${c.selectorHint}`.toLowerCase();
}

function isPhoneLikeCandidate(c: ProfileCandidate): boolean {
  return (
    c.roleHint === "mobile_app" ||
    isPortraitLike(c.width, c.height) ||
    /phone|mockup|app screen/i.test(c.label)
  );
}

export type ProductVisualProfile = "mobile_consumer" | "saas_desktop" | "unknown";

export function inferProductVisualProfile(
  pool: ProfileCandidate[],
): ProductVisualProfile {
  if (pool.length === 0) return "unknown";

  let saasScore = 0;
  let mobileScore = 0;

  for (const c of pool) {
    const blob = candidateBlob(c);
    if (c.roleHint === "dashboard" || SAAS_SIGNAL_RE.test(blob)) saasScore += 2;
    if (
      isPhoneLikeCandidate(c) ||
      c.roleHint === "mobile_app" ||
      MOBILE_CONSUMER_SIGNAL_RE.test(blob)
    ) {
      mobileScore += 2;
    }
    if (c.roleHint === "feature_card" && /habit|reminder|feed/i.test(blob)) {
      mobileScore += 1;
    }
    if (c.captureViewport === "desktop" && c.roleHint === "dashboard") saasScore += 2;
  }

  if (saasScore >= 4 && saasScore >= mobileScore + 2) return "saas_desktop";
  if (mobileScore >= 4 && mobileScore >= saasScore + 2) return "mobile_consumer";
  return "unknown";
}

export interface ProfileSelectionLimits {
  maxMobileInFinal: number;
  minDesktopInFinal: number;
  maxWideDesktopSections: number;
  mobileRankMultiplier: number;
  desktopDashboardMultiplier: number;
  preferMobileOnDuplicate: boolean;
}

export function selectionLimitsForProfile(
  profile: ProductVisualProfile,
): ProfileSelectionLimits {
  switch (profile) {
    case "mobile_consumer":
      return {
        maxMobileInFinal: 4,
        minDesktopInFinal: 0,
        maxWideDesktopSections: 1,
        mobileRankMultiplier: 1.38,
        desktopDashboardMultiplier: 1.15,
        preferMobileOnDuplicate: true,
      };
    case "saas_desktop":
      return {
        maxMobileInFinal: 2,
        minDesktopInFinal: 2,
        maxWideDesktopSections: 0,
        mobileRankMultiplier: 1.05,
        desktopDashboardMultiplier: 1.55,
        preferMobileOnDuplicate: false,
      };
    default:
      return {
        maxMobileInFinal: 3,
        minDesktopInFinal: 1,
        maxWideDesktopSections: 1,
        mobileRankMultiplier: 1.18,
        desktopDashboardMultiplier: 1.35,
        preferMobileOnDuplicate: true,
      };
  }
}
