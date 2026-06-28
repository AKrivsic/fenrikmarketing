// DOM selection + scoring for component capture (runs in browser via page.evaluate).

export interface ScoredCaptureCandidate {
  captureId: string;
  selectorHint: string;
  label: string;
  roleHint: string;
  width: number;
  height: number;
  score: number;
  x: number;
  y: number;
}

const CAPTURE_ATTR = "data-fenrik-capture-id";

const SKIP_TAGS = new Set(["NAV", "FOOTER", "HEADER", "SCRIPT", "STYLE", "NOSCRIPT"]);

const skipRe =
  /(?:nav|navbar|menu|footer|cookie|consent|gdpr|onetrust|banner|payment|visa|mastercard|paypal|stripe)/i;

const targetRe =
  /(?:hero|feature|pricing|testimonial|comparison|dashboard|mockup|phone|app|product|demo|screen|mobile)/i;

const visualClassRe =
  /(?:aspect-\[|aspect-|rounded-2xl|rounded-3xl|rounded-\[|overflow-hidden|shadow|border|card|grid|mockup|phone|device|screen)/i;

const cardRe = /(?:rounded-2xl|rounded-3xl|border.*card|feature|comparison|reminder|grid)/i;

const PORTRAIT_RATIO = 1.6;
const PORTRAIT_MIN_W = 220;
const PORTRAIT_STRONG_MIN_H = 400;

export interface ElementSignals {
  tagName: string;
  className: string;
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
  textLen: number;
  imgs: number;
  buttons: number;
  visible: boolean;
}

export function portraitRatio(width: number, height: number): number {
  if (width <= 0) return 0;
  return height / width;
}

export function isPortraitLike(width: number, height: number): boolean {
  return portraitRatio(width, height) > PORTRAIT_RATIO;
}

export function minWidthForElement(
  width: number,
  height: number,
  viewportW: number,
): number {
  if (isPortraitLike(width, height)) {
    return Math.max(PORTRAIT_MIN_W, viewportW * 0.17);
  }
  return Math.max(220, viewportW * 0.25);
}

export function minHeightForViewport(viewportH: number): number {
  return Math.max(160, viewportH * 0.12);
}

export function textDensity(textLen: number, width: number, height: number): number {
  const area = width * height;
  if (area <= 0) return 0;
  return (textLen * 10) / area;
}

export function scoreElementSignals(
  s: ElementSignals,
  viewportW: number,
  viewportH: number,
  opts: { hasBetterVisualChild?: boolean; visualAreaRatio?: number } = {},
): number {
  const { width: w, height: h } = s;
  const area = w * h;
  if (area <= 0 || !s.visible) return 0;

  const blob = `${s.tagName} ${s.className} ${s.id}`;
  const pr = portraitRatio(w, h);
  const density = textDensity(s.textLen, w, h);
  const vwRatio = w / viewportW;

  // Compact visual base — weaker than raw area.
  let score = Math.sqrt(area) * 120;

  if (targetRe.test(blob)) score *= 1.45;
  if (visualClassRe.test(s.className)) score *= 1.35;
  if (cardRe.test(blob)) score *= 1.25;

  if (isPortraitLike(w, h)) {
    score *= 1.55;
    if (h >= PORTRAIT_STRONG_MIN_H) score *= 1.2;
  }

  // Mobile viewport: favor compact cards, not full sections.
  if (viewportW <= 420) {
    score *= mobileSizeMultiplier(s, viewportW);
    if (isPortraitLike(w, h) && isClearPhoneMockup(s, s.className)) score *= 1.35;
    if (cardRe.test(blob) && w < viewportW * 0.95 && h <= 480) score *= 1.25;
    if (s.tagName !== "SECTION") score *= 1.1;
  }

  if (s.imgs > 0) score *= 1 + Math.min(s.imgs, 4) * 0.12;
  if (s.buttons > 0) score *= 1.1;

  // Compact product blocks (cards, phones).
  if (w < viewportW * 0.72 && h < viewportH * 0.85 && w >= 200) {
    score *= 1.2;
  }

  // Text density — penalize wall-of-copy wrappers, not short card labels.
  if (/content--columns|content\.content/i.test(blob)) score *= 0.32;
  if (s.tagName === "ARTICLE" && s.textLen > 700 && s.imgs < 2) score *= 0.38;

  if (density > 0.035 && s.imgs === 0) score *= 0.45;
  else if (density > 0.02 && vwRatio > 0.8) score *= 0.65;
  else if (s.textLen > 1800) score *= 0.6;

  if (vwRatio > 0.85) {
    const visualShare = opts.visualAreaRatio ?? estimateVisualShare(s);
    if (visualShare < 0.28) score *= 0.5;
    else score *= 0.75;
  }

  if (s.tagName === "SECTION") {
    if (opts.hasBetterVisualChild) score *= 0.42;
    else score *= 0.88;
  }

  if (
    (s.tagName === "DIV" && vwRatio > 0.88 && s.textLen > 250) ||
    blob.includes("max-w-6xl") ||
    blob.includes("max-w-5xl")
  ) {
    if (opts.hasBetterVisualChild) score *= 0.55;
  }

  return score;
}

function estimateVisualShare(s: ElementSignals): number {
  const area = s.width * s.height;
  if (area <= 0) return 0;
  const visualEstimate = s.imgs * s.width * s.height * 0.08 + s.buttons * 2000;
  return Math.min(1, visualEstimate / area);
}

function hint(el: Element): string {
  const id = el.id ? `#${el.id}` : "";
  const cls =
    typeof el.className === "string" && el.className.trim()
      ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";
  return `${el.tagName.toLowerCase()}${id}${cls}`;
}

function isElementVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (Number(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function readSignals(el: Element): ElementSignals {
  const rect = el.getBoundingClientRect();
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  return {
    tagName: el.tagName,
    className: typeof el.className === "string" ? el.className : "",
    id: el.id ?? "",
    width: rect.width,
    height: rect.height,
    x: rect.x,
    y: rect.y,
    textLen: text.length,
    imgs: el.querySelectorAll("img, picture, svg, canvas").length,
    buttons: el.querySelectorAll("button, [role='button']").length,
    visible: isElementVisible(el),
  };
}

function cardTitleFromElement(el: Element): string | null {
  const cls = typeof el.className === "string" ? el.className : "";
  if (!/rounded-2xl|rounded-3xl|border-primary|border-border/i.test(cls)) return null;
  const heading = el.querySelector("h3,h4,h5,strong,p")?.textContent?.trim();
  if (heading && heading.length > 0 && heading.length < 55) return heading;
  return null;
}

export function labelForElement(el: Element, parentHeading?: string | null): string {
  const aria = el.getAttribute("aria-label")?.trim();
  if (aria) return aria.slice(0, 80);

  const cardTitle = cardTitleFromElement(el);
  if (cardTitle) return cardTitle.slice(0, 80);

  const ownHeading = el.querySelector(":scope > h3, :scope > h4, :scope > h2, h3, h4")
    ?.textContent?.trim();
  if (ownHeading && ownHeading.length < 60) return ownHeading.slice(0, 80);

  const cls = typeof el.className === "string" ? el.className : "";
  const rect = el.getBoundingClientRect();
  const pr = portraitRatio(rect.width, rect.height);

  if (/aspect-\[9\/19\]|aspect-\[9\/16\]/i.test(cls) || (pr > 1.75 && rect.height > 380 && rect.width <= 330)) {
    if (rect.top < window.innerHeight * 0.55) return "Hero phone mockup";
    return "App screen";
  }
  if (isClearPhoneMockup(readSignals(el), cls)) return "App screen";
  if (/comparison|vs\./i.test(`${cls} ${el.textContent ?? ""}`)) return "Comparison card";
  if (/reminder/i.test(`${cls} ${el.textContent ?? ""}`)) return "Reminder cards";
  if (/feed|habit/i.test(`${cls} ${el.textContent ?? ""}`) && cardRe.test(cls)) {
    return "Habit feed cards";
  }
  if (cardRe.test(cls)) return "Feature card";

  if (parentHeading) return parentHeading.slice(0, 80);

  const sectionHeading = el.closest("section")?.querySelector("h2,h3")?.textContent?.trim();
  if (sectionHeading && !el.matches("section")) return sectionHeading.slice(0, 80);

  const heading = el.querySelector("h1,h2,h3")?.textContent?.trim();
  if (heading) return heading.slice(0, 80);

  if (targetRe.test(cls)) return cls.match(targetRe)?.[0] ?? "Product visual";
  return "Product visual";
}

export function roleHintForElement(el: Element, label: string): string {
  const cls = typeof el.className === "string" ? el.className : "";
  const blob = `${cls} ${el.id} ${label}`.toLowerCase();
  const rect = el.getBoundingClientRect();
  const signals = readSignals(el);

  if (/sidebar|side-bar|nav-panel|menu-panel/i.test(blob) && !/mockup|aspect-\[9/i.test(cls)) {
    return signals.width <= 360 ? "dashboard" : "product_ui";
  }
  if (
    blob.includes("phone") ||
    blob.includes("mockup") ||
    /aspect-\[9/i.test(cls) ||
    isClearPhoneMockup(signals, cls)
  ) {
    return "mobile_app";
  }
  if (blob.includes("dashboard")) return "dashboard";
  if (blob.includes("pricing")) return "pricing_screenshot";
  if (blob.includes("testimonial")) return "testimonial";
  if (
    /rounded-3xl|rounded-2xl|comparison|reminder|feature card|habit of the day|other habit/i.test(
      `${blob} ${cls}`,
    )
  ) {
    return "feature_card";
  }
  if (blob.includes("hero") && el.tagName === "SECTION") return "hero_image";
  if (el.tagName === "SECTION") return "section_screenshot";
  return "product_ui";
}

function passesSizeGate(s: ElementSignals, viewportW: number, viewportH: number): boolean {
  const minW = minWidthForElement(s.width, s.height, viewportW);
  const minH = minHeightForViewport(viewportH);
  return s.width >= minW && s.height >= minH;
}

function isMostlyTextWithoutVisual(s: ElementSignals): boolean {
  if (s.imgs > 0 || s.buttons > 0) return false;
  const blob = `${s.tagName} ${s.className}`;
  if (/content--columns|content\.content/i.test(blob) && s.height >= 350 && s.width >= 500) {
    return true;
  }
  return s.textLen > 900 && textDensity(s.textLen, s.width, s.height) > 0.025;
}

function isOversizedSectionElement(s: ElementSignals, roleHint: string): boolean {
  if (roleHint === "section_screenshot" && s.height > 900) return true;
  if (s.width >= 1080 && s.height > 800 && roleHint === "section_screenshot") return true;
  return false;
}

const CHILD_QUERY =
  "figure, picture, img, canvas, [class*='aspect-'], [class*='rounded-3xl'], [class*='rounded-2xl'], [class*='overflow-hidden'], [class*='shadow'], [class*='border']";

const MOBILE_CARD_QUERY =
  "div.rounded-3xl, div.rounded-2xl, li.rounded-2xl, li[class*='rounded'], [class*='aspect-'], figure, div[class*='border-primary'], div[class*='border-border']";

function isMobileViewport(viewportW: number): boolean {
  return viewportW <= 420;
}

function isClearPhoneMockup(s: ElementSignals, className: string): boolean {
  if (/aspect-\[9\/19\]|aspect-\[9\/16\]/i.test(className)) return true;
  return (
    isPortraitLike(s.width, s.height) &&
    s.height >= 400 &&
    s.width <= 330 &&
    s.height / s.width > 1.75
  );
}

function isMobileGridOrSectionWrapper(s: ElementSignals): boolean {
  const blob = `${s.tagName} ${s.className}`;
  if (s.tagName === "SECTION") return true;
  if (/\.grid|gap-4|mt-10|relative\.mt-10/i.test(blob.replace(/\s+/g, " "))) {
    if (s.height > 420 && s.width >= 300) return true;
  }
  return false;
}

function mobileSizeMultiplier(s: ElementSignals, viewportW: number): number {
  if (!isMobileViewport(viewportW)) return 1;
  const { width: w, height: h } = s;
  let mult = 1;

  if (w >= 250 && w <= 390 && h >= 220 && h <= 480) mult *= 1.5;
  else if (h > 520 && !isClearPhoneMockup(s, s.className)) mult *= 0.32;
  else if (h > 480 && isMobileGridOrSectionWrapper(s)) mult *= 0.38;
  else if (h < 180 && w < 280) mult *= 0.42;
  else if (h < 200 && !/rounded-2xl|rounded-3xl/i.test(s.className)) mult *= 0.55;

  if (s.tagName === "SECTION") mult *= 0.22;
  if (s.tagName === "SECTION" && w >= viewportW * 0.9) mult *= 0.45;
  if (/rounded-3xl|rounded-2xl/i.test(s.className) && h >= 170 && h <= 260) mult *= 1.25;

  return mult;
}

function scoreChildForRefinement(
  signals: ElementSignals,
  viewportW: number,
  viewportH: number,
): number {
  let childScore = scoreElementSignals(signals, viewportW, viewportH);
  childScore *= mobileSizeMultiplier(signals, viewportW);
  if (/rounded-3xl|rounded-2xl/i.test(signals.className)) childScore *= 1.2;
  return childScore;
}

function findBestVisualChild(
  parent: Element,
  parentScore: number,
  viewportW: number,
  viewportH: number,
): Element | null {
  const query = isMobileViewport(viewportW) ? MOBILE_CARD_QUERY : CHILD_QUERY;
  const descendants = parent.querySelectorAll(query);
  let bestEl: Element | null = null;
  let bestScore = 0;

  for (const child of descendants) {
    if (child === parent) continue;
    const signals = readSignals(child);
    if (!signals.visible) continue;
    if (!passesSizeGate(signals, viewportW, viewportH)) continue;
    if (isMostlyTextWithoutVisual(signals)) continue;
    if (isMobileViewport(viewportW) && signals.tagName === "SECTION") continue;

    const childScore = scoreChildForRefinement(signals, viewportW, viewportH);
    if (childScore > bestScore) {
      bestScore = childScore;
      bestEl = child;
    }
  }

  if (!bestEl) return null;

  const parentSignals = readSignals(parent);
  const childSignals = readSignals(bestEl);
  const childScoreFinal = scoreChildForRefinement(childSignals, viewportW, viewportH);
  const parentPortrait = isPortraitLike(parentSignals.width, parentSignals.height);
  const childPortrait = isPortraitLike(childSignals.width, childSignals.height);
  const mobile = isMobileViewport(viewportW);

  if (mobile && parentSignals.tagName === "SECTION") return bestEl;
  if (mobile && isMobileGridOrSectionWrapper(parentSignals)) {
    if (childSignals.height <= 520 || /rounded-3xl|rounded-2xl/i.test(childSignals.className)) {
      return bestEl;
    }
  }

  const significantlyBetter =
    childScoreFinal >= parentScore * (mobile ? 0.42 : 0.72) ||
    (childPortrait && !parentPortrait && childSignals.width <= 360) ||
    (childSignals.width < parentSignals.width * 0.75 &&
      childScoreFinal >= parentScore * (mobile ? 0.38 : 0.55));

  return significantlyBetter ? bestEl : null;
}

function resolveCaptureElement(
  el: Element,
  parentScore: number,
  viewportW: number,
  viewportH: number,
): Element {
  let current = el;
  for (let pass = 0; pass < 5; pass++) {
    const refined = findBestVisualChild(current, parentScore, viewportW, viewportH);
    if (!refined || refined === current) break;
    current = refined;
    parentScore = scoreElementSignals(readSignals(current), viewportW, viewportH);
  }

  if (isMobileViewport(viewportW)) {
    const sig = readSignals(current);
    if (sig.tagName === "SECTION" || (sig.height > 520 && isMobileGridOrSectionWrapper(sig))) {
      const cards = current.querySelectorAll(MOBILE_CARD_QUERY);
      let best: Element | null = null;
      let bestScore = 0;
      for (const card of cards) {
        const cs = readSignals(card);
        if (!cs.visible || cs.height > 520) continue;
        if (cs.height < 160 && !/rounded-3xl|rounded-2xl/i.test(cs.className)) continue;
        const sc = scoreChildForRefinement(cs, viewportW, viewportH);
        if (sc > bestScore) {
          bestScore = sc;
          best = card;
        }
      }
      if (best) current = best;
    }
  }

  return current;
}

function intersectionRatio(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const minArea = Math.min(a.width * a.height, b.width * b.height);
  if (minArea <= 0) return 0;
  return inter / minArea;
}

function contains(
  outer: { x: number; y: number; width: number; height: number },
  inner: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    inner.x >= outer.x - 8 &&
    inner.y >= outer.y - 8 &&
    inner.x + inner.width <= outer.x + outer.width + 8 &&
    inner.y + inner.height <= outer.y + outer.height + 8
  );
}

export function dedupeCaptureCandidates<
  T extends {
    score: number;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  },
>(items: T[]): T[] {
  const visualPriority = (item: T) =>
    item.score / Math.sqrt(Math.max(1, item.width * item.height));

  const sorted = [...items].sort((a, b) => b.score - a.score);
  const kept: T[] = [];

  for (const item of sorted) {
    const dupIndex = kept.findIndex((k) => {
      const overlap = intersectionRatio(item, k);
      if (overlap > 0.55) return true;
      if (contains(k, item) || contains(item, k)) return true;
      const sameLabel =
        item.label === k.label &&
        Math.abs(item.x - k.x) < 80 &&
        Math.abs(item.y - k.y) < 120;
      return sameLabel;
    });

    if (dupIndex === -1) {
      kept.push(item);
      continue;
    }

    const existing = kept[dupIndex];
    const itemPriority = visualPriority(item);
    const existingPriority = visualPriority(existing);
    const nested = contains(existing, item) || contains(item, existing);

    const itemWins =
      itemPriority > existingPriority * 1.02 ||
      (nested &&
        item.width * item.height < existing.width * existing.height * 0.7 &&
        item.score >= existing.score * 0.4) ||
      item.score > existing.score * 1.08;

    if (itemWins) kept[dupIndex] = item;
  }

  return kept;
}

/**
 * Runs in the browser context (Playwright page.evaluate).
 * @param captureIdPrefix prefixes data-fenrik-capture-id (per viewport session).
 */
export function runCaptureSelectionInPage(captureIdPrefix = ""): ScoredCaptureCandidate[] {
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;

  const nodeSelectors = [
    "section",
    "article",
    "main div",
    "figure",
    "picture",
    "[class*='aspect-']",
    "[class*='hero']",
    "[class*='feature']",
    "[class*='pricing']",
    "[class*='testimonial']",
    "[class*='dashboard']",
    "[class*='mockup']",
    "[class*='rounded-3xl']",
    "[class*='rounded-2xl']",
  ].join(", ");

  const nodes = Array.from(document.querySelectorAll(nodeSelectors));

  type Internal = {
    el: Element;
    selectorHint: string;
    label: string;
    roleHint: string;
    score: number;
    width: number;
    height: number;
    x: number;
    y: number;
  };

  const scored: Internal[] = [];

  for (const el of nodes) {
    if (SKIP_TAGS.has(el.tagName)) continue;

    const signals = readSignals(el);
    if (!signals.visible) continue;
    if (!passesSizeGate(signals, viewportW, viewportH)) continue;

    const rect = el.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > viewportH * 5) continue;

    const blob = `${el.tagName} ${signals.className} ${signals.id}`;
    if (skipRe.test(blob)) continue;
    if (signals.textLen > 5000) continue;
    if (signals.textLen > 2200 && signals.imgs === 0) continue;
    if (isMostlyTextWithoutVisual(signals)) continue;

    const hasChildHint = !!el.querySelector(CHILD_QUERY);
    const parentScore = scoreElementSignals(signals, viewportW, viewportH, {
      hasBetterVisualChild: hasChildHint,
      visualAreaRatio: estimateVisualShare(signals),
    });
    if (parentScore <= 0) continue;

    let captureEl: Element = el;
    const parentHeading = el.querySelector("h1,h2,h3")?.textContent?.trim() ?? null;
    captureEl = resolveCaptureElement(el, parentScore, viewportW, viewportH);

    const capSignals = readSignals(captureEl);
    if (
      isMobileViewport(viewportW) &&
      capSignals.tagName === "SECTION" &&
      el.querySelector(MOBILE_CARD_QUERY)
    ) {
      continue;
    }
    if (
      isMobileViewport(viewportW) &&
      capSignals.height > 520 &&
      !isClearPhoneMockup(capSignals, capSignals.className)
    ) {
      continue;
    }

    const capRect = captureEl.getBoundingClientRect();
    const finalScore = scoreElementSignals(capSignals, viewportW, viewportH, {
      visualAreaRatio: estimateVisualShare(capSignals),
    });

    const label = labelForElement(
      captureEl,
      captureEl === el ? parentHeading : parentHeading,
    );
    const roleHint = roleHintForElement(captureEl, label);

    if (isOversizedSectionElement(capSignals, roleHint)) continue;
    if (
      capSignals.width >= 1080 &&
      capSignals.height > 800 &&
      roleHint === "section_screenshot" &&
      captureEl.querySelector(CHILD_QUERY)
    ) {
      continue;
    }

    scored.push({
      el: captureEl,
      selectorHint: hint(captureEl),
      label,
      roleHint,
      score: finalScore,
      width: Math.round(capRect.width),
      height: Math.round(capRect.height),
      x: capRect.x,
      y: capRect.y,
    });
  }

  const deduped = dedupeCaptureCandidates(scored);
  deduped.sort((a, b) => b.score - a.score);

  const out: ScoredCaptureCandidate[] = [];
  for (const item of deduped) {
    const captureId = `${captureIdPrefix}${out.length}`;
    item.el.setAttribute(CAPTURE_ATTR, captureId);
    out.push({
      captureId,
      selectorHint: item.selectorHint,
      label: item.label,
      roleHint: item.roleHint,
      width: item.width,
      height: item.height,
      score: item.score,
      x: item.x,
      y: item.y,
    });
    if (out.length >= 12) break;
  }

  return out;
}
