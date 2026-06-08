import type { SupabaseClient } from "@supabase/supabase-js";
import type { AntiRepetitionMemory } from "@/lib/ai/types";

// Phase 2E — how many recent entries to expose per dimension (Task 2: ~20).
export const MEMORY_LIMIT = 20;
// How many recent packages to scan. A few more than the per-dimension cap so a
// run of scenario-less or duplicate packages still yields a full memory.
const PACKAGE_SCAN_LIMIT = 60;

export const EMPTY_MEMORY: AntiRepetitionMemory = {
  hooks: [],
  topics: [],
  ctas: [],
  scenarios: [],
};

// Normalizes text for textual (non-semantic) matching/dedup: lowercase,
// collapsed whitespace, no trailing punctuation. Shared by the memory builder
// and the lightweight hook dedup (Task 5).
export function normalizeMemoryText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?"']+$/g, "")
    .trim();
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

// Reads the CTA text from a package_brief.cta value, which is { type, text }.
function readCtaText(brief: Record<string, unknown>): string | null {
  const cta = asRecord(brief.cta);
  return cta ? readString(cta.text) : null;
}

// Appends to a deduplicated, capped accumulator. Dedup is by normalized text;
// the first (most recent) original casing/wording is kept.
function pushUnique(target: string[], seen: Set<string>, value: string | null) {
  if (target.length >= MEMORY_LIMIT) return;
  if (!value) return;
  const key = normalizeMemoryText(value);
  if (!key || seen.has(key)) return;
  seen.add(key);
  target.push(value);
}

// Task 2 — assembles the Anti-Repetition Memory from EXISTING data only:
//   - hooks/CTAs/scenarios from content_packages.package_brief
//   - topics from the linked content_strategy_items.brief.topic
// No new AI layer, no new tables. Best-effort: any DB error yields an empty
// memory so generation is never blocked by the memory build.
export async function buildAntiRepetitionMemory(
  supabase: SupabaseClient,
  projectId: string,
): Promise<AntiRepetitionMemory> {
  if (!projectId) return EMPTY_MEMORY;
  try {
    const { data: pkgRows, error } = await supabase
      .from("content_packages")
      .select("id, strategy_item_id, package_brief, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(PACKAGE_SCAN_LIMIT);
    if (error || !pkgRows) return EMPTY_MEMORY;

    // Resolve topics for the scanned packages in a single query (no N+1).
    const strategyItemIds = Array.from(
      new Set(
        pkgRows
          .map((p) => p.strategy_item_id as string | null)
          .filter((id): id is string => !!id),
      ),
    );
    const topicByItemId = await loadTopics(supabase, strategyItemIds);

    const hooks: string[] = [];
    const topics: string[] = [];
    const ctas: string[] = [];
    const scenarios: string[] = [];
    const seenHooks = new Set<string>();
    const seenTopics = new Set<string>();
    const seenCtas = new Set<string>();
    const seenScenarios = new Set<string>();

    for (const row of pkgRows) {
      const brief = asRecord(row.package_brief);
      if (brief) {
        pushUnique(hooks, seenHooks, readString(brief.hook));
        pushUnique(ctas, seenCtas, readCtaText(brief));
        pushUnique(scenarios, seenScenarios, readString(brief.scenario));
      }
      const itemId = row.strategy_item_id as string | null;
      if (itemId) {
        pushUnique(topics, seenTopics, topicByItemId.get(itemId) ?? null);
      }
    }

    return { hooks, topics, ctas, scenarios };
  } catch {
    return EMPTY_MEMORY;
  }
}

async function loadTopics(
  supabase: SupabaseClient,
  strategyItemIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (strategyItemIds.length === 0) return map;
  const { data, error } = await supabase
    .from("content_strategy_items")
    .select("id, brief")
    .in("id", strategyItemIds);
  if (error || !data) return map;
  for (const row of data) {
    const brief = asRecord(row.brief);
    const topic = brief ? readString(brief.topic) : null;
    if (topic) map.set(row.id as string, topic);
  }
  return map;
}
