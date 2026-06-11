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

// Project Brain Improvements V1 (Part 1) — writes a website URL into a project's
// free-form knowledge jsonb. Only the top-level `source_url` key is set (to the
// NORMALIZED value, or null when blank/invalid); every other key (cards,
// scenarios, extracted_at, …) is preserved verbatim. Returns a NEW object and
// never mutates the input, so callers can pass it straight into a project
// update. No DB migration: this reuses the existing knowledge.source_url field.
export function setKnowledgeSourceUrl(
  knowledge: Json | null | undefined,
  rawUrl: string | null | undefined,
): Json {
  const base: Record<string, Json | undefined> =
    knowledge && typeof knowledge === "object" && !Array.isArray(knowledge)
      ? { ...(knowledge as Record<string, Json | undefined>) }
      : {};
  base.source_url = normalizeWebsiteUrl(rawUrl);
  return base as Json;
}

// Project Brain Improvements V1 (Part 4) — website URL observability. The Brain
// is "configured" when a usable canonical URL exists, otherwise "missing".
export type WebsiteUrlStatus = "configured" | "missing";

export function websiteUrlStatus(project: Project): WebsiteUrlStatus {
  return canonicalWebsiteUrl(project) ? "configured" : "missing";
}
