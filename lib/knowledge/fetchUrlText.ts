// Minimal, dependency-free URL → plain text extraction for Knowledge Model V2.
// MVP scope (intentionally narrow):
//   - fetch a SINGLE page (no crawler, no sitemap, no external service)
//   - strip scripts/styles and all HTML tags
//   - decode a handful of common entities and collapse whitespace
//   - truncate to a token-safe length for the extraction prompt
// Anything richer (multi-page, readability heuristics) belongs to Phase 2.

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_TEXT_LENGTH = 12_000;

export interface FetchUrlTextOptions {
  timeoutMs?: number;
  maxLength?: number;
}

export class FetchUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FetchUrlError";
  }
}

export async function fetchUrlText(
  url: string,
  options: FetchUrlTextOptions = {},
): Promise<string> {
  const normalized = normalizeUrl(url);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxLength = options.maxLength ?? MAX_TEXT_LENGTH;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(normalized, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // A real UA avoids trivial bot blocks; Accept asks for HTML.
        "user-agent":
          "Mozilla/5.0 (compatible; FenrikBot/1.0; +https://fenrik.marketing)",
        accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (err) {
    throw new FetchUrlError(
      err instanceof Error && err.name === "AbortError"
        ? `Načtení URL trvalo příliš dlouho (> ${timeoutMs} ms).`
        : "URL se nepodařilo načíst.",
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new FetchUrlError(`URL vrátila stav ${response.status}.`);
  }

  const html = await response.text();
  const text = htmlToText(html).slice(0, maxLength).trim();

  if (text.length === 0) {
    throw new FetchUrlError("Z URL se nepodařilo získat žádný text.");
  }

  return text;
}

// Accepts a bare host (example.com) or a full URL and returns a valid http(s)
// URL string, or throws for anything that cannot be turned into one.
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) throw new FetchUrlError("URL je prázdná.");

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new FetchUrlError("Neplatná URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new FetchUrlError("Povolené jsou pouze http(s) URL.");
  }
  return parsed.toString();
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ");
}
