import { chromium, type Browser, type Page } from "playwright";

export interface CaptureLimits {
  maxScreenshots: number;
  navigationTimeoutMs: number;
  totalTimeoutMs: number;
}

export interface CapturedComponentScreenshot {
  label: string;
  selectorHint: string;
  roleHint: string;
  width: number;
  height: number;
  imageBase64: string;
}

export const DEFAULT_CAPTURE_LIMITS: CaptureLimits = {
  maxScreenshots: 5,
  navigationTimeoutMs: 15_000,
  totalTimeoutMs: 20_000,
};

const SKIP_CLASS_ID_RE =
  /(?:nav|navbar|menu|footer|cookie|consent|gdpr|onetrust|banner|payment|visa|mastercard|paypal|stripe|checkout-badge)/i;

const TARGET_CLASS_RE =
  /(?:hero|feature|pricing|testimonial|comparison|dashboard|mockup|phone|app-screen|product|demo|screenshot)/i;

interface DomCandidate {
  captureId: string;
  selectorHint: string;
  label: string;
  roleHint: string;
  width: number;
  height: number;
}

async function collectCandidates(page: Page): Promise<DomCandidate[]> {
  return page.evaluate(() => {
    const CAPTURE_ATTR = "data-fenrik-capture-id";
    const SKIP_TAGS = new Set(["NAV", "FOOTER", "HEADER", "SCRIPT", "STYLE", "NOSCRIPT"]);
    const skipRe =
      /(?:nav|navbar|menu|footer|cookie|consent|gdpr|onetrust|banner|payment|visa|mastercard|paypal|stripe)/i;
    const targetRe =
      /(?:hero|feature|pricing|testimonial|comparison|dashboard|mockup|phone|app|product|demo|screen)/i;

    function hint(el: Element): string {
      const id = el.id ? `#${el.id}` : "";
      const cls =
        typeof el.className === "string" && el.className.trim()
          ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
          : "";
      return `${el.tagName.toLowerCase()}${id}${cls}`;
    }

    function labelFor(el: Element): string {
      const aria = el.getAttribute("aria-label")?.trim();
      if (aria) return aria.slice(0, 80);
      const heading = el.querySelector("h1,h2,h3")?.textContent?.trim();
      if (heading) return heading.slice(0, 80);
      const cls = typeof el.className === "string" ? el.className : "";
      if (targetRe.test(cls)) return cls.match(targetRe)?.[0] ?? "Product section";
      return "Website component";
    }

    function roleFor(el: Element): string {
      const blob = `${el.className} ${el.id} ${labelFor(el)}`.toLowerCase();
      if (blob.includes("phone") || blob.includes("mockup")) return "product_ui";
      if (blob.includes("dashboard")) return "dashboard";
      if (blob.includes("pricing")) return "pricing_screenshot";
      if (blob.includes("testimonial")) return "testimonial";
      if (blob.includes("hero")) return "hero_image";
      return "product_ui";
    }

    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const minW = Math.max(220, viewportW * 0.25);
    const minH = Math.max(160, viewportH * 0.12);

    const nodes = Array.from(
      document.querySelectorAll(
        "section, article, main div, [class*='hero'], [class*='feature'], [class*='pricing'], [class*='testimonial'], [class*='dashboard'], [class*='mockup']",
      ),
    );

    const scored: Array<{
      el: Element;
      selectorHint: string;
      label: string;
      roleHint: string;
      score: number;
      width: number;
      height: number;
    }> = [];

    for (const el of nodes) {
      if (SKIP_TAGS.has(el.tagName)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < minW || rect.height < minH) continue;
      if (rect.bottom < 0 || rect.top > viewportH * 4) continue;

      const blob = `${el.tagName} ${el.className} ${el.id}`;
      if (skipRe.test(blob)) continue;

      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      const textLen = text.length;
      const imgs = el.querySelectorAll("img, picture, svg, canvas").length;
      if (textLen > 2200 && imgs === 0) continue;
      if (textLen > 5000) continue;

      let score = rect.width * rect.height;
      if (targetRe.test(blob)) score *= 1.8;
      if (imgs > 0) score *= 1.4;
      if (textLen > 1800) score *= 0.55;
      if (el.tagName === "SECTION") score *= 1.1;

      scored.push({
        el,
        selectorHint: hint(el),
        label: labelFor(el),
        roleHint: roleFor(el),
        score,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    }

    scored.sort((a, b) => b.score - a.score);

    const out: Array<{
      captureId: string;
      selectorHint: string;
      label: string;
      roleHint: string;
      score: number;
      width: number;
      height: number;
      x: number;
      y: number;
    }> = [];

    for (const item of scored) {
      const rect = item.el.getBoundingClientRect();
      const overlaps = out.some(
        (d) =>
          Math.abs(d.x - rect.x) < 40 &&
          Math.abs(d.y - rect.y) < 40 &&
          Math.abs(d.width - item.width) < 60,
      );
      if (overlaps) continue;
      const captureId = String(out.length);
      item.el.setAttribute(CAPTURE_ATTR, captureId);
      out.push({
        captureId,
        selectorHint: item.selectorHint,
        label: item.label,
        roleHint: item.roleHint,
        score: item.score,
        width: item.width,
        height: item.height,
        x: rect.x,
        y: rect.y,
      });
      if (out.length >= 12) break;
    }

    return out.map(({ x: _x, y: _y, score: _s, ...rest }) => rest);
  });
}

async function screenshotCandidate(
  page: Page,
  candidate: DomCandidate,
): Promise<CapturedComponentScreenshot | null> {
  const locator = page.locator(`[data-fenrik-capture-id="${candidate.captureId}"]`);
  const count = await locator.count();
  if (count === 0) return null;

  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 3000 });
  } catch {
    return null;
  }

  let buffer: Buffer;
  try {
    buffer = await locator.screenshot({ type: "png", timeout: 5000 });
  } catch {
    return null;
  }

  if (buffer.byteLength < 4_000 || buffer.byteLength > 2_500_000) return null;

  return {
    label: candidate.label,
    selectorHint: candidate.selectorHint,
    roleHint: candidate.roleHint,
    width: candidate.width,
    height: candidate.height,
    imageBase64: buffer.toString("base64"),
  };
}

export async function capturePageComponents(
  pageUrl: string,
  limits: CaptureLimits = DEFAULT_CAPTURE_LIMITS,
): Promise<CapturedComponentScreenshot[]> {
  let browser: Browser | null = null;
  const started = Date.now();

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });

    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: limits.navigationTimeoutMs,
    });
    await page.waitForTimeout(800);

    const candidates = await collectCandidates(page);
    const shots: CapturedComponentScreenshot[] = [];

    for (const candidate of candidates) {
      if (Date.now() - started > limits.totalTimeoutMs) break;
      if (shots.length >= limits.maxScreenshots) break;
      const shot = await screenshotCandidate(page, candidate);
      if (shot) shots.push(shot);
    }

    return shots;
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

export function roleHintFromText(text: string): string {
  const hay = text.toLowerCase();
  if (hay.includes("phone") || hay.includes("mockup") || hay.includes("mobile")) {
    return "product_ui";
  }
  if (hay.includes("dashboard")) return "dashboard";
  if (hay.includes("pricing")) return "pricing_screenshot";
  if (hay.includes("testimonial")) return "testimonial";
  if (hay.includes("hero")) return "hero_image";
  if (hay.includes("feature")) return "product_ui";
  if (hay.includes("comparison")) return "homepage_screenshot";
  return "product_ui";
}
