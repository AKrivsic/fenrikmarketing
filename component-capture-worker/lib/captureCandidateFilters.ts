import { isPortraitLike } from "./captureSelection.ts";

/** Shared heuristics for profile inference and final ranking (Node + tests). */

export interface FilterableCandidate {
  label: string;
  roleHint: string;
  selectorHint: string;
  captureViewport: "desktop" | "mobile";
  width: number;
  height: number;
}

const SAAS_SIGNAL_RE =
  /(?:dashboard|analytics|admin|saas|chart|table|canvas|editor|workspace|sidebar|billing|pipeline|metric|kpi|report|bento|productivity|crm|interface|screenshot|agents|session|panel|graphic|modular|workspace|product grid)/i;

const MOBILE_LANDING_RE =
  /(?:habit of the day|other habit|habit feed|wellness|fitness|check-in|app store|consumer|reminder cards|morning reminder)/i;

const PHONE_MOCKUP_RE = /(?:aspect-\[9|phone|mockup|app screen|hero phone)/i;

function blob(c: FilterableCandidate): string {
  return `${c.label} ${c.roleHint} ${c.selectorHint}`.toLowerCase();
}

export function hasSaasProductSignal(c: FilterableCandidate): boolean {
  if (c.roleHint === "dashboard") return true;
  const b = `${c.label} ${c.selectorHint}`.toLowerCase();
  return SAAS_SIGNAL_RE.test(b);
}

export function isPortraitPhoneMockup(c: FilterableCandidate): boolean {
  if (PHONE_MOCKUP_RE.test(`${c.selectorHint} ${c.label}`)) return true;
  if (
    c.roleHint === "mobile_app" &&
    c.width <= 330 &&
    isPortraitLike(c.width, c.height) &&
    c.height >= 400
  ) {
    return !/(?:sidebar|workspace|nav-panel)/i.test(c.selectorHint);
  }
  return false;
}

/** Desktop blocks suitable for SaaS/product video (not narrow chrome or phone frames). */
export function isQualityDesktopUiCandidate(c: FilterableCandidate): boolean {
  if (c.captureViewport !== "desktop") return false;
  if (isPortraitPhoneMockup(c)) return false;
  if (isNarrowSidebarChrome(c)) return false;

  const b = blob(c);
  if (c.roleHint === "dashboard") return c.width >= 320 && c.height >= 260;

  if (c.width >= 400 && c.height >= 280 && c.height <= 880) {
    if (c.roleHint === "section_screenshot" && c.height > 820) return false;
    if (/canvas|editor|graphic|panel|bento|inner|wrapper|conveyor|sessions|billing|modular|screenshot|carousel|illustration|hero/i.test(b)) {
      return true;
    }
    if (c.roleHint === "product_ui" && c.width >= 480 && c.height >= 320) return true;
    if (c.roleHint === "feature_card" && hasSaasProductSignal(c) && c.width >= 320 && c.height >= 380) {
      return true;
    }
  }

  if (hasSaasProductSignal(c) && c.width >= 350 && c.height >= 260 && c.height <= 850) {
    return true;
  }

  return false;
}

export function isNarrowSidebarChrome(c: FilterableCandidate): boolean {
  if (c.width > 360) return false;
  const b = blob(c);
  if (/sidebar|side-bar|nav-panel|menu-panel/i.test(b)) return c.height >= 400;
  if (c.captureViewport === "desktop" && c.width <= 340 && c.height >= 520 && !PHONE_MOCKUP_RE.test(b)) {
    return true;
  }
  return false;
}

export function isTextHeavyCopyBlock(c: FilterableCandidate): boolean {
  if (isPortraitPhoneMockup(c) || c.roleHint === "feature_card" || c.roleHint === "dashboard") {
    return false;
  }
  if (/content--columns|content\.content/i.test(c.selectorHint)) {
    return c.width >= 500 && c.height >= 350;
  }
  if (c.selectorHint.startsWith("article") && c.width >= 650 && c.height >= 350) {
    if (!/figure|canvas|graphic|bento|panel/i.test(c.selectorHint)) return true;
  }
  if (
    c.captureViewport === "desktop" &&
    c.height <= 240 &&
    c.width >= 750 &&
    /hero|title|copy|span\./i.test(c.selectorHint)
  ) {
    return true;
  }
  if (
    c.label.length >= 42 &&
    c.width >= 700 &&
    c.height >= 500 &&
    c.roleHint === "product_ui" &&
    !isPortraitLike(c.width, c.height)
  ) {
    if (!/dashboard|chart|canvas|bento|graphic|panel|screenshot|mockup|phone|visual|runner|shoe|product/i.test(blob(c))) {
      return true;
    }
  }
  return false;
}

export function isOversizedSectionCapture(c: FilterableCandidate): boolean {
  if (c.roleHint === "section_screenshot" && c.height > 900) return true;
  if (c.captureViewport === "desktop" && c.width >= 1080 && c.height > 800) {
    if (c.roleHint === "section_screenshot" || c.roleHint === "product_ui") return true;
  }
  if (
    c.captureViewport === "mobile" &&
    c.roleHint === "section_screenshot" &&
    c.height > 520 &&
    !/rounded-3xl|rounded-2xl|aspect-\[/i.test(c.selectorHint)
  ) {
    return true;
  }
  return false;
}

export function isCategoryNavSlide(c: FilterableCandidate): boolean {
  if (!/category-row|category-row-item|nav-slide|swiper-slide/i.test(c.selectorHint)) return false;
  const label = c.label.trim();
  if (label.length > 28) return false;
  return /^(new arrivals|mens|womens|women|men|sale|shop|kids|accessories|best sellers)$/i.test(label);
}

export function isWideMarketingGridWrapper(c: FilterableCandidate): boolean {
  return (
    /mt-10\.grid|relative\.mt-10\.grid|grid\.gap-4|grid\.gap-5/i.test(c.selectorHint) &&
    c.width >= 650 &&
    c.height >= 280 &&
    c.height <= 520
  );
}

export function isMobileAppLandingSignal(c: FilterableCandidate): boolean {
  const b = blob(c);
  if (MOBILE_LANDING_RE.test(b)) return true;
  if (isPortraitPhoneMockup(c) && !hasSaasProductSignal(c)) return true;
  if (c.roleHint === "feature_card" && /habit|reminder|feed|wellness|fitness/i.test(b)) return true;
  return false;
}

export { SAAS_SIGNAL_RE, MOBILE_LANDING_RE };
