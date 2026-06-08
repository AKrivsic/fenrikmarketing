// Centralized transport hardening for outbound HTTP calls (Sprint 3 / C3).
//
// Two small, dependency-free helpers:
//   - fetchWithTimeout: wraps fetch with an AbortController-based timeout
//   - fetchWithRetry:   adds bounded retry + exponential backoff (with jitter)
//                       for *transport* failures only (timeout, network error,
//                       429, 5xx). It never inspects or repairs response bodies,
//                       so JSON repair / validation / business-logic handling
//                       stays exactly where it already lives (callers decide
//                       what to do with a non-retryable !res.ok response).
//
// Out of scope (C4 and beyond): persistent queue, reaper, circuit breaker,
// monitoring dashboard, alerting, semantic retry, job-retry system.

// Sensible default timeouts per call class.
export const HTTP_TIMEOUT_MS = {
  // AI providers (OpenAI / Claude) — generation can be slow.
  ai: 60_000,
  // n8n / video worker — transport-only triggers and callbacks.
  worker: 30_000,
} as const;

// Max attempts per call class (1 == no retry).
export const HTTP_MAX_ATTEMPTS = {
  ai: 3,
  worker: 2,
} as const;

// HTTP statuses that represent a transient/retryable transport failure.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

// Backoff tuning: short exponential backoff with a little jitter.
const BACKOFF_BASE_MS = 300;
const BACKOFF_JITTER_MS = 200;

// Thrown when a single attempt exceeds its timeout budget.
export class HttpTimeoutError extends Error {
  readonly url: string;
  readonly timeoutMs: number;

  constructor(url: string, timeoutMs: number) {
    super(`request to ${url} timed out after ${timeoutMs} ms`);
    this.name = "HttpTimeoutError";
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

// Single fetch attempt with a hard timeout. The caller's AbortSignal (if any)
// is intentionally replaced by the timeout controller — none of our internal
// callers pass their own signal here (fetchUrlText keeps its own logic).
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new HttpTimeoutError(url, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export interface FetchWithRetryConfig {
  timeoutMs: number;
  maxAttempts: number;
  // Human-readable label used only for logging (e.g. "openai:chat").
  label: string;
}

// A thrown error is retryable when it is a timeout or a network-level failure.
// In Node/undici, fetch network errors surface as TypeError; explicit aborts
// surface as AbortError / HttpTimeoutError. Everything else (e.g. JSON parse,
// business errors thrown by callers — which happen *after* this returns) is not
// retried here.
function isRetryableTransportError(err: unknown): boolean {
  if (err instanceof HttpTimeoutError) return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  if (err instanceof TypeError) return true;
  return false;
}

function backoffDelayMs(completedAttempt: number): number {
  const base = BACKOFF_BASE_MS * 2 ** (completedAttempt - 1);
  const jitter = Math.floor(Math.random() * BACKOFF_JITTER_MS);
  return base + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// fetch + timeout + bounded retry/backoff for transport failures.
//
// Returns the Response as soon as a non-retryable status is seen (including 2xx
// and non-retryable 4xx like 400/401/403). On retryable status it retries up to
// maxAttempts and then returns the last response so the caller can throw its own
// error exactly as before. On timeout / network error it retries and, once
// attempts are exhausted, rethrows.
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: FetchWithRetryConfig,
): Promise<Response> {
  const { timeoutMs, maxAttempts, label } = config;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);

      if (RETRYABLE_STATUS.has(res.status) && attempt < maxAttempts) {
        const delay = backoffDelayMs(attempt);
        console.warn(
          `[http] ${label}: retryable status ${res.status} (attempt ${attempt}/${maxAttempts}); retrying in ${delay} ms`,
        );
        await sleep(delay);
        continue;
      }

      if (RETRYABLE_STATUS.has(res.status)) {
        console.error(
          `[http] ${label}: final failure with status ${res.status} after ${attempt} attempt(s)`,
        );
      }
      return res;
    } catch (err) {
      const retryable = isRetryableTransportError(err);

      if (err instanceof HttpTimeoutError) {
        console.warn(
          `[http] ${label}: timeout after ${timeoutMs} ms (attempt ${attempt}/${maxAttempts})`,
        );
      }

      if (retryable && attempt < maxAttempts) {
        const delay = backoffDelayMs(attempt);
        console.warn(
          `[http] ${label}: transport error (attempt ${attempt}/${maxAttempts}): ${errMessage(err)}; retrying in ${delay} ms`,
        );
        await sleep(delay);
        continue;
      }

      console.error(
        `[http] ${label}: final failure after ${attempt} attempt(s): ${errMessage(err)}`,
      );
      throw err;
    }
  }

  // Unreachable: the loop always returns or throws on the final attempt.
  throw new Error(`[http] ${label}: exhausted ${maxAttempts} attempts`);
}
