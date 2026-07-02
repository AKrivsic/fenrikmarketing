import { chromium, type Browser, type Page } from "playwright";
import { getCaptureSelectionBrowserScript } from "./captureSelectionBundle.ts";
import type { ScoredCaptureCandidate } from "./captureSelection.ts";
import {
  buildSelectionDebug,
  selectFinalCaptureCandidates,
  type CaptureSelectionDebug,
  type CaptureViewport,
  type PooledCaptureCandidate,
} from "./captureRanking.ts";

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
  viewport?: CaptureViewport;
}

export const DEFAULT_CAPTURE_LIMITS: CaptureLimits = {
  maxScreenshots: 5,
  navigationTimeoutMs: 15_000,
  totalTimeoutMs: 35_000,
};

export const DESKTOP_VIEWPORT = { width: 1280, height: 900 };
export const MOBILE_VIEWPORT = { width: 390, height: 844 };

const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export type { ScoredCaptureCandidate, CaptureSelectionDebug };

async function collectCandidates(
  page: Page,
  idPrefix: string,
): Promise<ScoredCaptureCandidate[]> {
  const script = getCaptureSelectionBrowserScript();
  return page.evaluate(
    ({ code, prefix }) => {
      const run = new Function(
        "prefix",
        `${code}; return __fenrikCaptureBundle.default(prefix);`,
      ) as (prefix: string) => ScoredCaptureCandidate[];
      return run(prefix);
    },
    { code: script, prefix: idPrefix },
  );
}

function toPooled(
  rows: ScoredCaptureCandidate[],
  captureViewport: CaptureViewport,
): PooledCaptureCandidate[] {
  return rows.map((r) => ({
    captureId: r.captureId,
    selectorHint: r.selectorHint,
    label: r.label,
    roleHint: r.roleHint,
    width: r.width,
    height: r.height,
    score: r.score,
    captureViewport,
    x: r.x,
    y: r.y,
    ...(r.textSnippet ? { textSnippet: r.textSnippet } : {}),
  }));
}

async function prepareViewportPage(
  browser: Browser,
  pageUrl: string,
  viewport: { width: number; height: number },
  mobile: boolean,
  limits: CaptureLimits,
): Promise<Page> {
  const page = await browser.newPage({
    viewport,
    userAgent: mobile ? MOBILE_USER_AGENT : undefined,
    isMobile: mobile,
    hasTouch: mobile,
  });
  await page.goto(pageUrl, {
    waitUntil: "domcontentloaded",
    timeout: limits.navigationTimeoutMs,
  });
  await page.waitForTimeout(mobile ? 1000 : 800);
  return page;
}

async function screenshotCandidate(
  page: Page,
  candidate: PooledCaptureCandidate,
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
    viewport: candidate.captureViewport,
  };
}

export interface CapturePageComponentsResult {
  screenshots: CapturedComponentScreenshot[];
  debug: CaptureSelectionDebug;
}

export async function capturePageComponents(
  pageUrl: string,
  limits: CaptureLimits = DEFAULT_CAPTURE_LIMITS,
): Promise<CapturedComponentScreenshot[]> {
  const result = await capturePageComponentsWithDebug(pageUrl, limits);
  return result.screenshots;
}

export async function capturePageComponentsWithDebug(
  pageUrl: string,
  limits: CaptureLimits = DEFAULT_CAPTURE_LIMITS,
): Promise<CapturePageComponentsResult> {
  let browser: Browser | null = null;
  const started = Date.now();

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const desktopPage = await prepareViewportPage(
      browser,
      pageUrl,
      DESKTOP_VIEWPORT,
      false,
      limits,
    );
    const mobilePage = await prepareViewportPage(
      browser,
      pageUrl,
      MOBILE_VIEWPORT,
      true,
      limits,
    );

    const [desktopRows, mobileRows] = await Promise.all([
      collectCandidates(desktopPage, "d-"),
      collectCandidates(mobilePage, "m-"),
    ]);

    const pool = [
      ...toPooled(desktopRows, "desktop"),
      ...toPooled(mobileRows, "mobile"),
    ];

    const finalCandidates = selectFinalCaptureCandidates(
      pool,
      limits.maxScreenshots,
    );
    const debug = buildSelectionDebug(pool, finalCandidates);

    console.log(
      JSON.stringify({
        event: "capture_selection",
        desktopCandidates: debug.desktopCandidates,
        mobileCandidates: debug.mobileCandidates,
        selectedDesktop: debug.selectedDesktop,
        selectedMobile: debug.selectedMobile,
        productProfile: debug.productProfile,
        finalLabels: debug.finalLabels,
        ms: Date.now() - started,
      }),
    );

    const shots: CapturedComponentScreenshot[] = [];
    for (const candidate of finalCandidates) {
      if (Date.now() - started > limits.totalTimeoutMs) break;
      const page =
        candidate.captureViewport === "mobile" ? mobilePage : desktopPage;
      const shot = await screenshotCandidate(page, candidate);
      if (shot) shots.push(shot);
    }

    await desktopPage.close().catch(() => undefined);
    await mobilePage.close().catch(() => undefined);

    return { screenshots: shots, debug };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

export function roleHintFromText(text: string): string {
  const hay = text.toLowerCase();
  if (hay.includes("phone") || hay.includes("mockup") || hay.includes("mobile")) {
    return "mobile_app";
  }
  if (hay.includes("dashboard")) return "dashboard";
  if (hay.includes("pricing")) return "pricing_screenshot";
  if (hay.includes("testimonial")) return "testimonial";
  if (hay.includes("hero")) return "hero_image";
  if (hay.includes("feature") || hay.includes("card") || hay.includes("reminder")) {
    return "feature_card";
  }
  if (hay.includes("comparison")) return "feature_card";
  return "product_ui";
}
