import { isPortraitLike } from "./captureSelection.ts";
import {
  isCategoryNavSlide,
  isNarrowSidebarChrome,
  isOversizedSectionCapture,
  isQualityDesktopUiCandidate,
  isTextHeavyCopyBlock,
  isPortraitPhoneMockup,
  isWideMarketingGridWrapper,
} from "./captureCandidateFilters.ts";
import {
  inferProductVisualProfile,
  selectionLimitsForProfile,
  type ProductVisualProfile,
} from "./captureProductProfile.ts";

export type CaptureViewport = "desktop" | "mobile";

export interface PooledCaptureCandidate {
  captureId: string;
  selectorHint: string;
  label: string;
  roleHint: string;
  width: number;
  height: number;
  score: number;
  captureViewport: CaptureViewport;
  x: number;
  y: number;
}

export interface CaptureSelectionDebug {
  desktopCandidates: number;
  mobileCandidates: number;
  selectedDesktop: number;
  selectedMobile: number;
  finalLabels: string[];
  productProfile: ProductVisualProfile;
}

const DESKTOP_VIEWPORT_W = 1280;

export function normalizeSectionKey(label: string, roleHint: string): string {
  const l = label.toLowerCase().replace(/\s+/g, " ").trim();
  const role = roleHint.toLowerCase();
  if (l.includes("hero phone") || (role === "mobile_app" && /aspect-\[9|phone|mockup/i.test(l))) {
    return "phone_visual";
  }
  if (l.includes("app screen")) return "app_screen_visual";
  if (l.includes("reminder")) return "reminder_cards";
  if (l.includes("habit feed") || l.includes("feed")) return "habit_feed";
  if (l.includes("comparison") || l.includes("habit of the day") || l.includes("other habit")) {
    return "comparison_cards";
  }
  return `${role}:${l.slice(0, 48)}`;
}

function isWideDesktopSection(c: PooledCaptureCandidate): boolean {
  if (c.captureViewport !== "desktop") return false;
  if (isOversizedSectionCapture(c)) return true;
  if (c.width >= DESKTOP_VIEWPORT_W * 0.85 && c.height >= 520) return true;
  if (c.width >= 1100 && c.height >= 450 && c.roleHint !== "dashboard") return true;
  return false;
}

function isDesktopProductUi(c: PooledCaptureCandidate): boolean {
  if (c.captureViewport !== "desktop") return false;
  if (isWideDesktopSection(c) || isTextHeavyCopyBlock(c) || isNarrowSidebarChrome(c)) {
    return false;
  }
  return (
    isQualityDesktopUiCandidate(c) ||
    c.roleHint === "dashboard" ||
    (c.roleHint === "feature_card" &&
      c.width >= 320 &&
      /dashboard|analytics|chart|table|admin|canvas|editor|panel|graphic|bento/i.test(
        `${c.label} ${c.selectorHint}`,
      ))
  );
}

export function isPhoneLike(c: PooledCaptureCandidate): boolean {
  return isPortraitPhoneMockup(c) || (/app screen|hero phone/i.test(c.label) && c.width <= 360);
}

function isMobileOversizedWrapper(c: PooledCaptureCandidate): boolean {
  if (c.captureViewport !== "mobile") return false;
  if (isOversizedSectionCapture(c)) return true;
  if (c.selectorHint.startsWith("section.")) return true;
  if (/relative\.mt-10\.grid|mt-10\.grid\.gap-4/i.test(c.selectorHint)) return true;
  if (c.height > 520 && c.roleHint !== "mobile_app") return true;
  return false;
}

function isMobileLowValueFragment(c: PooledCaptureCandidate): boolean {
  if (c.captureViewport !== "mobile") return false;
  if (c.height >= 180 && c.width >= 250) return false;
  if (/rounded-3xl|rounded-2xl/i.test(c.selectorHint)) return false;
  return c.height < 180 || c.width < 250;
}

function isLowValueForProfile(c: PooledCaptureCandidate, profile: ProductVisualProfile): boolean {
  if (isTextHeavyCopyBlock(c) || isOversizedSectionCapture(c)) return true;
  if (isCategoryNavSlide(c)) return true;
  if (isWideMarketingGridWrapper(c)) return true;
  if (profile === "saas_desktop" && isNarrowSidebarChrome(c)) return true;
  if (profile === "saas_desktop" && c.captureViewport === "mobile") {
    if (c.roleHint === "section_screenshot") return true;
    if (!isPhoneLike(c) && c.roleHint !== "feature_card" && c.height > 450) return true;
  }
  return false;
}

function isTextHeavy(c: PooledCaptureCandidate): boolean {
  if (isTextHeavyCopyBlock(c)) return true;
  if (c.captureViewport !== "mobile") return false;
  if (isPhoneLike(c) || c.roleHint === "feature_card" || c.roleHint === "dashboard") {
    return false;
  }
  return c.height > 680 && c.width <= 400 && !isPortraitLike(c.width, c.height);
}

/** Social ranking with adaptive mobile/desktop bias from page signals. */
export function socialRankScore(
  c: PooledCaptureCandidate,
  profile: ProductVisualProfile = "unknown",
): number {
  const limits = selectionLimitsForProfile(profile);
  let rank = c.score;
  const area = c.width * c.height;
  const compact = area > 0 ? rank / Math.sqrt(area) : rank;

  rank = compact * 180;

  if (c.captureViewport === "mobile") rank *= limits.mobileRankMultiplier;
  if (isPortraitLike(c.width, c.height)) {
    rank *= profile === "saas_desktop" ? 1.02 : 1.32;
  }
  if (c.roleHint === "mobile_app") {
    if (isNarrowSidebarChrome(c)) rank *= 0.32;
    else rank *= profile === "saas_desktop" ? 0.88 : 1.28;
  }
  if (c.roleHint === "feature_card" && c.captureViewport === "mobile") {
    rank *= profile === "mobile_consumer" ? 1.18 : 1.05;
  }
  if (c.roleHint === "section_screenshot" && c.captureViewport === "mobile") {
    rank *= 0.42;
  }
  if (c.roleHint === "section_screenshot" && c.captureViewport === "desktop") {
    rank *= c.height > 750 ? 0.18 : 0.48;
  }
  if (c.roleHint === "dashboard" && c.captureViewport === "desktop") {
    rank *= limits.desktopDashboardMultiplier;
  }
  if (isDesktopProductUi(c)) {
    rank *= profile === "saas_desktop" ? 1.35 : 1.12;
  }

  if (isWideDesktopSection(c)) rank *= 0.28;
  if (c.captureViewport === "desktop" && c.width >= 1200 && !isPhoneLike(c)) rank *= 0.45;

  if (isTextHeavy(c) || isTextHeavyCopyBlock(c)) rank *= 0.22;
  if (isOversizedSectionCapture(c)) rank *= 0.12;
  if (isCategoryNavSlide(c)) rank *= 0.5;
  if (isWideMarketingGridWrapper(c)) rank *= 0.2;

  if (isMobileOversizedWrapper(c)) rank *= 0.28;
  if (isMobileLowValueFragment(c)) rank *= 0.35;
  if (
    c.captureViewport === "mobile" &&
    c.width >= 250 &&
    c.width <= 390 &&
    c.height >= 220 &&
    c.height <= 480
  ) {
    rank *= profile === "saas_desktop" ? 1.05 : 1.22;
  }

  return rank;
}

function isTinyMobileChip(c: PooledCaptureCandidate): boolean {
  return (
    c.captureViewport === "mobile" &&
    c.height <= 200 &&
    c.width <= 320 &&
    c.roleHint === "feature_card"
  );
}

function sameVisualPair(a: PooledCaptureCandidate, b: PooledCaptureCandidate): boolean {
  const chipA = isTinyMobileChip(a);
  const chipB = isTinyMobileChip(b);
  if (chipA && chipB) return true;

  if (normalizeSectionKey(a.label, a.roleHint) !== normalizeSectionKey(b.label, b.roleHint)) {
    return false;
  }
  if (isPhoneLike(a) && isPhoneLike(b)) return true;
  if (a.label === b.label) return true;
  return false;
}

function preferForSocial(
  a: PooledCaptureCandidate,
  b: PooledCaptureCandidate,
  profile: ProductVisualProfile,
): PooledCaptureCandidate {
  const limits = selectionLimitsForProfile(profile);
  const scoreA = socialRankScore(a, profile);
  const scoreB = socialRankScore(b, profile);
  if (!sameVisualPair(a, b)) {
    return scoreA >= scoreB ? a : b;
  }

  if (profile === "saas_desktop") {
    if (isDesktopProductUi(a) && !isDesktopProductUi(b)) return a;
    if (isDesktopProductUi(b) && !isDesktopProductUi(a)) return b;
    if (!limits.preferMobileOnDuplicate) return scoreA >= scoreB ? a : b;
  }

  const mobileA = a.captureViewport === "mobile";
  const mobileB = b.captureViewport === "mobile";
  const portraitA = isPortraitLike(a.width, a.height);
  const portraitB = isPortraitLike(b.width, b.height);

  if (limits.preferMobileOnDuplicate && mobileA && !mobileB && !isTextHeavy(a)) {
    if (portraitA || isPhoneLike(a)) return a;
    if (scoreA >= scoreB * 0.85) return a;
  }
  if (limits.preferMobileOnDuplicate && mobileB && !mobileA && !isTextHeavy(b)) {
    if (portraitB || isPhoneLike(b)) return b;
    if (scoreB >= scoreA * 0.85) return b;
  }

  if (isPhoneLike(a) && isPhoneLike(b)) {
    if (portraitA && !portraitB) return a;
    if (portraitB && !portraitA) return b;
  }

  return scoreA >= scoreB ? a : b;
}

export function dedupeCrossViewport(
  items: PooledCaptureCandidate[],
  profile: ProductVisualProfile,
): PooledCaptureCandidate[] {
  const sorted = [...items].sort(
    (a, b) => socialRankScore(b, profile) - socialRankScore(a, profile),
  );
  const kept: PooledCaptureCandidate[] = [];

  for (const item of sorted) {
    const dupIndex = kept.findIndex((k) => sameVisualPair(item, k));
    if (dupIndex === -1) {
      kept.push(item);
      continue;
    }
    kept[dupIndex] = preferForSocial(item, kept[dupIndex], profile);
  }

  return kept;
}

function countViewport(
  picked: PooledCaptureCandidate[],
  viewport: CaptureViewport,
): number {
  return picked.filter((p) => p.captureViewport === viewport).length;
}

export function selectFinalCaptureCandidates(
  pool: PooledCaptureCandidate[],
  maxScreenshots: number,
): PooledCaptureCandidate[] {
  const profile = inferProductVisualProfile(pool);
  const limits = selectionLimitsForProfile(profile);
  const deduped = dedupeCrossViewport(pool, profile);
  const ranked = [...deduped].sort(
    (a, b) => socialRankScore(b, profile) - socialRankScore(a, profile),
  );

  const picked: PooledCaptureCandidate[] = [];
  let wideDesktop = 0;
  let mobileCount = 0;

  const tryPick = (c: PooledCaptureCandidate): boolean => {
    if (picked.length >= maxScreenshots) return false;
    if (picked.some((p) => sameVisualPair(p, c))) return false;
    if (
      picked.some(
        (p) => p.label.toLowerCase().trim() === c.label.toLowerCase().trim(),
      )
    ) {
      return false;
    }
    if (isLowValueForProfile(c, profile)) return false;
    if (isWideDesktopSection(c) && wideDesktop >= limits.maxWideDesktopSections) {
      return false;
    }
    if (c.captureViewport === "mobile" && mobileCount >= limits.maxMobileInFinal) {
      return false;
    }
    if (isMobileOversizedWrapper(c)) return false;
    if (isMobileLowValueFragment(c)) return false;
    picked.push(c);
    if (isWideDesktopSection(c)) wideDesktop += 1;
    if (c.captureViewport === "mobile") mobileCount += 1;
    return true;
  };

  for (const c of ranked) {
    tryPick(c);
    if (picked.length >= maxScreenshots) break;
  }

  const ensureDesktop = () => {
    if (countViewport(picked, "desktop") >= limits.minDesktopInFinal) return;
    const candidate = ranked.find(
      (c) =>
        c.captureViewport === "desktop" &&
        !isLowValueForProfile(c, profile) &&
        !isWideDesktopSection(c) &&
        !picked.some((p) => sameVisualPair(p, c)) &&
        !picked.some(
          (p) => p.label.toLowerCase().trim() === c.label.toLowerCase().trim(),
        ) &&
        (isDesktopProductUi(c) || c.roleHint === "feature_card" || isPhoneLike(c)),
    );
    if (!candidate) return;

    if (picked.length < maxScreenshots) {
      tryPick(candidate);
      return;
    }

    const replaceIdx = picked.findIndex(
      (p) =>
        p.captureViewport === "mobile" &&
        (isTinyMobileChip(p) ||
          isCategoryNavSlide(p) ||
          isLowValueForProfile(p, profile) ||
          (profile === "saas_desktop" && p.roleHint === "section_screenshot")),
    );
    if (replaceIdx >= 0) {
      if (picked[replaceIdx].captureViewport === "mobile") mobileCount -= 1;
      picked[replaceIdx] = candidate;
    }
  };

  if (profile === "saas_desktop" || profile === "unknown") {
    while (
      countViewport(picked, "desktop") < limits.minDesktopInFinal &&
      picked.length > 0
    ) {
      const before = countViewport(picked, "desktop");
      ensureDesktop();
      if (countViewport(picked, "desktop") === before) break;
    }
  }

  if (profile === "mobile_consumer") {
    const qualityMobile = ranked.filter(
      (c) =>
        c.captureViewport === "mobile" &&
        (isPhoneLike(c) || isPortraitLike(c.width, c.height)) &&
        !isTextHeavy(c) &&
        !isLowValueForProfile(c, profile),
    );
    const hasSocialVisual = picked.some(
      (p) => isPhoneLike(p) || isPortraitLike(p.width, p.height),
    );
    if (qualityMobile.length > 0 && !hasSocialVisual) {
      const bestMobile = qualityMobile[0];
      if (!picked.some((p) => sameVisualPair(p, bestMobile))) {
        const replaceIdx = picked.findIndex(
          (p) => isWideDesktopSection(p) || isTinyMobileChip(p),
        );
        if (replaceIdx >= 0) {
          if (picked[replaceIdx].captureViewport === "mobile") mobileCount -= 1;
          picked[replaceIdx] = bestMobile;
          if (bestMobile.captureViewport === "mobile") mobileCount += 1;
        } else if (picked.length < maxScreenshots) {
          tryPick(bestMobile);
        }
      }
    }
  }

  return picked.slice(0, maxScreenshots);
}

export function buildSelectionDebug(
  pool: PooledCaptureCandidate[],
  final: PooledCaptureCandidate[],
): CaptureSelectionDebug {
  return {
    desktopCandidates: pool.filter((c) => c.captureViewport === "desktop").length,
    mobileCandidates: pool.filter((c) => c.captureViewport === "mobile").length,
    selectedDesktop: final.filter((c) => c.captureViewport === "desktop").length,
    selectedMobile: final.filter((c) => c.captureViewport === "mobile").length,
    finalLabels: final.map((c) => c.label),
    productProfile: inferProductVisualProfile(pool),
  };
}

export { inferProductVisualProfile, type ProductVisualProfile };
