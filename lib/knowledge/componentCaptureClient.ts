import { validatePublicHttpUrl } from "@/lib/knowledge/publicHttpUrl";
import { isTier1ProductRole } from "@/lib/assets/assetCoveragePolicy";
import { readProductRole } from "@/lib/assets/productRole";
import type { Json } from "@/lib/supabase/types";
import {
  COMPONENT_CAPTURE_MAX_SCREENSHOTS,
  COMPONENT_CAPTURE_TIMEOUT_MS,
  COMPONENT_CAPTURE_TARGET_SELECTORS,
  COMPONENT_CAPTURE_SKIP_PATTERNS,
} from "@/lib/knowledge/componentCaptureRules";

/** Max JSON payload from worker (base64 screenshots). */
export const COMPONENT_CAPTURE_MAX_RESPONSE_BYTES = 14 * 1024 * 1024;

/** Gate Playwright component capture — off by default so onboarding stays unchanged. */
export function isComponentCaptureEnabled(): boolean {
  return process.env.ENABLE_COMPONENT_CAPTURE === "true";
}

export type ComponentCaptureViewport = "desktop" | "mobile";

export interface ComponentCaptureScreenshotPayload {
  label: string;
  selectorHint?: string;
  width: number;
  height: number;
  roleHint?: string;
  viewport?: ComponentCaptureViewport;
  imageBase64?: string;
  signedUrl?: string;
}

export interface ComponentCaptureWorkerResponse {
  ok: boolean;
  screenshots?: ComponentCaptureScreenshotPayload[];
  error?: string;
}

export interface ComponentCaptureRequest {
  url: string;
  projectId?: string;
}

export type ComponentCaptureFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const DEFAULT_TIMEOUT_MS = COMPONENT_CAPTURE_TIMEOUT_MS;

export function assetLibraryHasTier1ProductVisual(
  rows: Array<{ metadata: Json }>,
): boolean {
  for (const row of rows) {
    if (isTier1ProductRole(readProductRole(row.metadata))) return true;
  }
  return false;
}

export function parseComponentCaptureWorkerJson(
  raw: unknown,
): ComponentCaptureWorkerResponse {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "invalid_json" };
  }
  const record = raw as Record<string, unknown>;
  if (record.ok !== true) {
    return {
      ok: false,
      error: typeof record.error === "string" ? record.error : "worker_failed",
    };
  }
  const shots = record.screenshots;
  if (!Array.isArray(shots)) {
    return { ok: true, screenshots: [] };
  }
  const screenshots: ComponentCaptureScreenshotPayload[] = [];
  for (const entry of shots) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const s = entry as Record<string, unknown>;
    const label = typeof s.label === "string" ? s.label : "Website component";
    const width = typeof s.width === "number" ? s.width : 0;
    const height = typeof s.height === "number" ? s.height : 0;
    screenshots.push({
      label,
      width,
      height,
      selectorHint:
        typeof s.selectorHint === "string" ? s.selectorHint : undefined,
      roleHint: typeof s.roleHint === "string" ? s.roleHint : undefined,
      viewport:
        s.viewport === "desktop" || s.viewport === "mobile"
          ? s.viewport
          : undefined,
      imageBase64:
        typeof s.imageBase64 === "string" ? s.imageBase64 : undefined,
      signedUrl: typeof s.signedUrl === "string" ? s.signedUrl : undefined,
    });
  }
  return { ok: true, screenshots };
}

export async function requestComponentCapture(
  body: ComponentCaptureRequest,
  deps: { fetchImpl?: ComponentCaptureFetch } = {},
): Promise<ComponentCaptureWorkerResponse> {
  if (!isComponentCaptureEnabled()) {
    return { ok: false, error: "disabled" };
  }

  const workerUrl = process.env.COMPONENT_CAPTURE_WORKER_URL?.trim();
  const token = process.env.COMPONENT_CAPTURE_SECRET?.trim();
  if (!workerUrl || !token) {
    return { ok: false, error: "not_configured" };
  }

  const validated = validatePublicHttpUrl(body.url);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetchImpl(
      `${workerUrl.replace(/\/$/, "")}/capture-components`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: validated.url,
          projectId: body.projectId,
          limits: {
            maxScreenshots: COMPONENT_CAPTURE_MAX_SCREENSHOTS,
            skipPatterns: COMPONENT_CAPTURE_SKIP_PATTERNS,
            targetHints: COMPONENT_CAPTURE_TARGET_SELECTORS,
          },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      return { ok: false, error: `worker_http_${response.status}` };
    }
    const buf = await response.arrayBuffer();
    if (buf.byteLength > COMPONENT_CAPTURE_MAX_RESPONSE_BYTES) {
      return { ok: false, error: "response_too_large" };
    }
    const json = JSON.parse(new TextDecoder().decode(buf)) as unknown;
    const parsed = parseComponentCaptureWorkerJson(json);
    return parsed.ok ? parsed : { ok: false, error: parsed.error ?? "worker_failed" };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "timeout"
        : err instanceof Error
          ? err.message
          : "fetch_failed";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
