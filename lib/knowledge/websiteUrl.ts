import type { Json, Project } from "@/lib/supabase/types";
import { parseProjectKnowledge } from "@/lib/knowledge/types";

// Website URL & CTA Usage V1 — single source of truth for a project's canonical
// website URL. MVP scope: there is NO dedicated projects.website_url column; the
// canonical URL is the one captured during onboarding and stored in
// projects.knowledge.source_url. This helper centralizes reading + validating it
// so prompts and the deterministic post-process all agree on one value.

// Validates and normalizes a raw URL string:
//   - trims, returns null for empty
//   - accepts a bare host (example.com) by assuming https://
//   - PRESERVES an explicit http(s):// scheme and the full path verbatim
//   - rejects non-http(s) schemes and hosts without a dot
// Returns the usable URL string, or null when it cannot be turned into one.
export function normalizeWebsiteUrl(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname.includes(".")) return null;

  // Return withScheme (not parsed.toString()) so an explicit URL is preserved
  // byte-for-byte (no forced trailing slash / re-encoding) — only a missing
  // scheme is added for bare hosts.
  return withScheme;
}

// Reads the project's canonical website URL from projects.knowledge.source_url
// and normalizes it. Returns null when absent/blank/invalid. Robust to a
// knowledge block that has source_url but no parseable cards (falls back to a
// direct read) so a URL is never silently dropped.
export function canonicalWebsiteUrl(project: Project): string | null {
  const parsed = parseProjectKnowledge(project.knowledge);
  let raw: string | null = parsed?.source_url ?? null;

  if (!raw) {
    const knowledge = project.knowledge as Json | null | undefined;
    if (knowledge && typeof knowledge === "object" && !Array.isArray(knowledge)) {
      const value = (knowledge as Record<string, unknown>).source_url;
      raw = typeof value === "string" ? value : null;
    }
  }

  return normalizeWebsiteUrl(raw);
}
