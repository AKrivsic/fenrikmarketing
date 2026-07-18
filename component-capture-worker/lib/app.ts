import express from "express";
import { chromium } from "playwright";
import {
  capturePageComponentsWithDebug,
  DEFAULT_CAPTURE_LIMITS,
  type CaptureLimits,
} from "./capturePageComponents.ts";
import { validatePublicHttpUrl } from "./urlSafety.ts";
import { isCaptureWorkerAuthorized } from "./auth.ts";
import { renderProductDemoChatPng } from "./renderProductDemoChat.ts";

const MAX_BODY_BYTES = 8_192;
const MAX_PRODUCT_DEMO_BODY_BYTES = 16_384;
const MAX_SCREENSHOTS = Math.min(
  5,
  Math.max(1, Number(process.env.COMPONENT_CAPTURE_MAX_SCREENSHOTS ?? 5)),
);

function readLimits(body: Record<string, unknown>): CaptureLimits {
  const limitsRaw = body.limits;
  const nested =
    limitsRaw && typeof limitsRaw === "object" && !Array.isArray(limitsRaw)
      ? (limitsRaw as Record<string, unknown>)
      : {};
  const maxFromBody =
    typeof nested.maxScreenshots === "number" && Number.isFinite(nested.maxScreenshots)
      ? Math.trunc(nested.maxScreenshots)
      : MAX_SCREENSHOTS;
  return {
    maxScreenshots: Math.min(5, Math.max(1, maxFromBody)),
    navigationTimeoutMs: DEFAULT_CAPTURE_LIMITS.navigationTimeoutMs,
    totalTimeoutMs: DEFAULT_CAPTURE_LIMITS.totalTimeoutMs,
  };
}

export function createComponentCaptureApp() {
  const app = express();

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post(
    "/capture-components",
    express.json({ limit: MAX_BODY_BYTES }),
    async (req, res) => {
      if (!isCaptureWorkerAuthorized(req.headers.authorization)) {
        res.status(401).json({ ok: false, error: "unauthorized" });
        return;
      }

      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        res.status(400).json({ ok: false, error: "invalid_body" });
        return;
      }

      const urlRaw = (body as Record<string, unknown>).url;
      if (typeof urlRaw !== "string") {
        res.status(400).json({ ok: false, error: "missing_url" });
        return;
      }

      const validated = validatePublicHttpUrl(urlRaw);
      if (!validated.ok) {
        res.status(400).json({ ok: false, error: validated.error });
        return;
      }

      const limits = readLimits(body as Record<string, unknown>);
      const started = Date.now();

      try {
        const { screenshots, debug } = await capturePageComponentsWithDebug(
          validated.url,
          limits,
        );
        console.log(
          JSON.stringify({
            event: "capture_components",
            url_host: new URL(validated.url).hostname,
            count: screenshots.length,
            desktopCandidates: debug.desktopCandidates,
            mobileCandidates: debug.mobileCandidates,
            selectedDesktop: debug.selectedDesktop,
            selectedMobile: debug.selectedMobile,
            productProfile: debug.productProfile,
            finalLabels: debug.finalLabels,
            ms: Date.now() - started,
          }),
        );
        res.json({ ok: true, screenshots });
      } catch (err) {
        const message = err instanceof Error ? err.message : "capture_failed";
        console.warn(
          JSON.stringify({
            event: "capture_components_failed",
            url_host: new URL(validated.url).hostname,
            error: message.slice(0, 120),
            ms: Date.now() - started,
          }),
        );
        res.json({ ok: true, screenshots: [], error: "capture_failed" });
      }
    },
  );

  // Sprint 4C.1 — controlled Fenrik product-demo chat (no customer URL scrape).
  app.post(
    "/render-product-demo-chat",
    express.json({ limit: MAX_PRODUCT_DEMO_BODY_BYTES }),
    async (req, res) => {
      if (!isCaptureWorkerAuthorized(req.headers.authorization)) {
        res.status(401).json({ ok: false, error: "unauthorized" });
        return;
      }

      const body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        res.status(400).json({ ok: false, error: "invalid_body" });
        return;
      }

      const beat =
        (body as Record<string, unknown>).beat ??
        (body as Record<string, unknown>).product_demo ??
        body;
      const started = Date.now();
      let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
      try {
        browser = await chromium.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const { png, beat: validated } = await renderProductDemoChatPng(
          browser,
          beat,
        );
        console.log(
          JSON.stringify({
            event: "render_product_demo_chat",
            outcome_type: validated.outcome_type,
            bytes: png.length,
            ms: Date.now() - started,
          }),
        );
        res.json({
          ok: true,
          png_base64: png.toString("base64"),
          beat: validated,
          width: 1080,
          height: 1920,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "render_failed";
        console.warn(
          JSON.stringify({
            event: "render_product_demo_chat_failed",
            error: message.slice(0, 160),
            ms: Date.now() - started,
          }),
        );
        res.status(422).json({ ok: false, error: "render_failed", message });
      } finally {
        if (browser) await browser.close().catch(() => undefined);
      }
    },
  );

  return app;
}
