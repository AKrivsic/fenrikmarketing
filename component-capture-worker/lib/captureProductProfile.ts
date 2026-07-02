import {
  hasSaasProductSignal,
  isMobileAppLandingSignal,
  isPortraitPhoneMockup,
  isQualityDesktopUiCandidate,
  type FilterableCandidate,
} from "./captureCandidateFilters.ts";

export type CaptureViewport = "desktop" | "mobile";

export interface ProfileCandidate extends FilterableCandidate {}

export type ProductVisualProfile = "mobile_consumer" | "saas_desktop" | "unknown";

function countQualityDesktop(pool: ProfileCandidate[]): number {
  return pool.filter(isQualityDesktopUiCandidate).length;
}

export function inferProductVisualProfile(
  pool: ProfileCandidate[],
): ProductVisualProfile {
  if (pool.length === 0) return "unknown";

  const habitLandingHits = pool.filter((c) =>
    /habit of the day|other habit|habit feed|reminder cards|wellness|fitness app/i.test(
      `${c.label} ${c.selectorHint}`,
    ),
  ).length;
  if (habitLandingHits >= 2) return "mobile_consumer";

  let saasSignalWeight = 0;
  let mobileLandingWeight = 0;

  for (const c of pool) {
    if (hasSaasProductSignal(c)) saasSignalWeight += 2;
    if (c.captureViewport === "desktop" && isQualityDesktopUiCandidate(c)) {
      saasSignalWeight += 3;
    }
    if (isMobileAppLandingSignal(c)) mobileLandingWeight += 2;
    if (isPortraitPhoneMockup(c) && !hasSaasProductSignal(c)) {
      mobileLandingWeight += 1;
    }
  }

  const qualityDesktop = countQualityDesktop(pool);

  const retailProductHits = pool.filter(
    (c) =>
      c.roleHint === "feature_card" &&
      /(?:runner|slip on|shoe|sneaker|canvas cruiser|tree dasher)/i.test(c.label),
  ).length;
  if (retailProductHits >= 2 && saasSignalWeight < 10) return "unknown";

  const strongSaas =
    qualityDesktop >= 2 ||
    (qualityDesktop >= 1 && saasSignalWeight >= 8) ||
    (qualityDesktop >= 1 && saasSignalWeight >= 5 && mobileLandingWeight <= saasSignalWeight);

  if (strongSaas && saasSignalWeight >= 5) {
    const habitDominant =
      mobileLandingWeight >= 8 &&
      qualityDesktop <= 1 &&
      pool.some((c) => /habit of the day|other habit|habit feed/i.test(`${c.label} ${c.selectorHint}`));
    if (!habitDominant) return "saas_desktop";
  }

  if (
    mobileLandingWeight >= 6 &&
    qualityDesktop <= 1 &&
    saasSignalWeight < 6 &&
    pool.some((c) => /habit|wellness|fitness|reminder feed/i.test(`${c.label} ${c.selectorHint}`))
  ) {
    return "mobile_consumer";
  }

  if (mobileLandingWeight >= 5 && saasSignalWeight <= mobileLandingWeight - 2 && qualityDesktop === 0) {
    return "mobile_consumer";
  }

  if (saasSignalWeight >= 7 && qualityDesktop >= 1) return "saas_desktop";

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
        mobileRankMultiplier: 0.92,
        desktopDashboardMultiplier: 1.62,
        preferMobileOnDuplicate: false,
      };
    default:
      return {
        maxMobileInFinal: 3,
        minDesktopInFinal: 1,
        maxWideDesktopSections: 1,
        mobileRankMultiplier: 1.1,
        desktopDashboardMultiplier: 1.38,
        preferMobileOnDuplicate: true,
      };
  }
}
