import type { Json, Project } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Service Mix V1 (Project Brain Improvements V1 — Part 2).
//
// PROBLEM (audited): generated content over-focuses on a single service (e.g.
// Airbnb cleaning). The Service Mix is an OPTIONAL per-project distribution
// hint — a target spread of TOPICS across the project's services, e.g.
//   Airbnb cleaning = 50, Office cleaning = 30, Recurring cleaning = 20
// (the weights must total 100). It persists inside the EXISTING
// projects.publishing_rules jsonb under `service_mix` (no DB migration), and is
// only a HINT fed into TOPIC SELECTION prompts (weekly strategy + evergreen
// topics). It is not mandatory: when empty, generation falls back to the
// current behavior, and it never affects publishing, CTAs or product facts.
// ---------------------------------------------------------------------------

export interface ServiceMixEntry {
  service: string;
  // Whole-percentage weight. A non-finite weight marks an invalid input line so
  // validation can surface a precise error (never persisted).
  weight: number;
}

export const SERVICE_MIX_TOTAL = 100;

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

// Parses the stored service_mix array from a project's publishing_rules jsonb.
// Defensive: drops malformed entries, trims service names, and only keeps
// finite, non-negative integer weights. A missing/invalid value yields [] so
// callers fall back to the current (no-mix) behavior.
export function parseServiceMix(
  publishingRules: Json | null | undefined,
): ServiceMixEntry[] {
  const raw = asRecord(publishingRules)["service_mix"];
  if (!Array.isArray(raw)) return [];

  const result: ServiceMixEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const service =
      typeof record.service === "string" ? record.service.trim() : "";
    const weightRaw = record.weight;
    const weight =
      typeof weightRaw === "number" && Number.isFinite(weightRaw)
        ? Math.trunc(weightRaw)
        : NaN;
    if (!service || Number.isNaN(weight) || weight < 0) continue;
    result.push({ service, weight });
  }
  return result;
}

// Convenience: parse the service mix straight off a project row.
export function projectServiceMix(project: Project): ServiceMixEntry[] {
  return parseServiceMix(project.publishing_rules);
}

// Parses the Project Brain textarea ("Service name = 50" — one per line; "="
// or ":" accepted, a trailing "%" tolerated) into entries. Lines that cannot be
// parsed into "name = number" keep their text with a NaN weight so validation
// can flag the exact offending line. Blank lines are ignored.
export function parseServiceMixInput(raw: string): ServiceMixEntry[] {
  const entries: ServiceMixEntry[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(.*?)\s*[=:]\s*(-?\d+)\s*%?$/);
    if (!match) {
      entries.push({ service: trimmed, weight: NaN });
      continue;
    }
    entries.push({
      service: match[1].trim(),
      weight: Number.parseInt(match[2], 10),
    });
  }
  return entries;
}

// Renders entries back into the "Service name = 50" textarea form.
export function serializeServiceMixInput(entries: ServiceMixEntry[]): string {
  return entries
    .map(
      (entry) =>
        `${entry.service} = ${Number.isFinite(entry.weight) ? entry.weight : ""}`,
    )
    .join("\n");
}

export interface ServiceMixValidationResult {
  ok: boolean;
  error?: string;
}

// Validates a parsed service mix. An EMPTY mix is valid (the field is optional →
// fallback behavior). A non-empty mix requires a service name and a valid 0–100
// integer weight on every line, and the weights must total exactly 100.
export function validateServiceMix(
  entries: ServiceMixEntry[],
): ServiceMixValidationResult {
  if (entries.length === 0) return { ok: true };

  let total = 0;
  for (const entry of entries) {
    if (!entry.service) {
      return { ok: false, error: "Každý řádek potřebuje název služby." };
    }
    if (
      !Number.isFinite(entry.weight) ||
      !Number.isInteger(entry.weight) ||
      entry.weight < 0 ||
      entry.weight > 100
    ) {
      return {
        ok: false,
        error: `Neplatná váha u „${entry.service}“ (0–100).`,
      };
    }
    total += entry.weight;
  }

  if (total !== SERVICE_MIX_TOTAL) {
    return {
      ok: false,
      error: `Součet vah musí být ${SERVICE_MIX_TOTAL} (aktuálně ${total}).`,
    };
  }
  return { ok: true };
}

// Merges a service mix back into the existing publishing_rules jsonb, preserving
// every unrelated key. An empty mix REMOVES the service_mix key entirely so the
// project cleanly reverts to the default (no-mix) behavior. Returns a new object
// and never mutates the input.
export function withServiceMix(
  publishingRules: Json | null | undefined,
  entries: ServiceMixEntry[],
): Json {
  const base = { ...asRecord(publishingRules) };
  if (entries.length === 0) {
    delete base.service_mix;
  } else {
    base.service_mix = entries.map((entry) => ({
      service: entry.service,
      weight: entry.weight,
    }));
  }
  return base as Json;
}

// Builds the SERVICE MIX prompt block — a TOPIC DISTRIBUTION HINT for topic
// selection prompts (weekly strategy + evergreen topics). Returns "" when the
// project has no service mix, so prompts for projects without one are
// byte-for-byte unchanged (backward compatible). Never affects CTA/copy.
export function serviceMixBlock(project: Project): string {
  const entries = projectServiceMix(project);
  if (entries.length === 0) return "";

  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const pct = (weight: number): string =>
    total === SERVICE_MIX_TOTAL || total <= 0
      ? `~${weight}%`
      : `~${Math.round((weight / total) * 100)}%`;

  return [
    "SERVICE MIX (OPTIONAL topic distribution hint — how to SPREAD topics " +
      "across the project's services; a guide for TOPIC SELECTION, NOT a hard " +
      "quota):",
    ...entries.map((entry) => `- ${entry.service}: ${pct(entry.weight)} of topics`),
    "SERVICE MIX RULES:",
    "- Distribute the chosen TOPICS across these services roughly in the above " +
      "proportion; do NOT over-focus on a single service.",
    "- This is an approximate TARGET across the whole plan, not a per-item rule.",
    "- It affects TOPIC SELECTION only — it never changes the CTA, the product " +
      "facts, or the publishing schedule.",
  ].join("\n");
}
