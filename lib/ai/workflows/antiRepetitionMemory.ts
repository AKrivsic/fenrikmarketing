import type { SupabaseClient } from "@supabase/supabase-js";
import type { AntiRepetitionMemory } from "@/lib/ai/types";
import {
  atmosphereFromPackageBrief,
  directionFromFingerprint,
  fingerprintFromPackageBrief,
  normalizeFingerprintText,
} from "@/lib/content-memory/conceptFingerprint";
import {
  pipelineFingerprintDedupKey,
  pipelineFingerprintFromPackageBrief,
} from "@/lib/content-memory/pipelineFingerprint";
import type { ContentPipelineFingerprint } from "@/lib/content-memory/types";
import type { CreativeConceptFingerprint } from "@/lib/content-memory/types";

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
  fingerprints: [],
  atmospheres: [],
  directions: [],
  pipelineFingerprints: [],
};

export interface BuildAntiRepetitionMemoryOptions {
  /** Exclude this package (regenerate must not avoid its own prior content). */
  excludePackageId?: string | null;
}

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

/**
 * Assembles Anti-Repetition Memory from existing packages.
 * Best-effort: any DB error yields empty memory so generation is never blocked.
 */
export async function buildAntiRepetitionMemory(
  supabase: SupabaseClient,
  projectId: string,
  options: BuildAntiRepetitionMemoryOptions = {},
): Promise<AntiRepetitionMemory> {
  if (!projectId) return { ...EMPTY_MEMORY };
  const excludeId = options.excludePackageId?.trim() || null;
  try {
    const { data: pkgRows, error } = await supabase
      .from("content_packages")
      .select("id, strategy_item_id, package_brief, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(PACKAGE_SCAN_LIMIT);
    if (error || !pkgRows) return { ...EMPTY_MEMORY };

    const rows = excludeId
      ? pkgRows.filter((p) => (p.id as string) !== excludeId)
      : pkgRows;

    const strategyItemIds = Array.from(
      new Set(
        rows
          .map((p) => p.strategy_item_id as string | null)
          .filter((id): id is string => !!id),
      ),
    );
    const topicByItemId = await loadTopics(supabase, strategyItemIds);

    const hooks: string[] = [];
    const topics: string[] = [];
    const ctas: string[] = [];
    const scenarios: string[] = [];
    const fingerprints: CreativeConceptFingerprint[] = [];
    const atmospheres: string[] = [];
    const directions: string[] = [];
    const pipelineFingerprints: ContentPipelineFingerprint[] = [];
    const seenHooks = new Set<string>();
    const seenTopics = new Set<string>();
    const seenCtas = new Set<string>();
    const seenScenarios = new Set<string>();
    const seenFp = new Set<string>();
    const seenAtm = new Set<string>();
    const seenDir = new Set<string>();
    const seenPipeline = new Set<string>();

    for (const row of rows) {
      const brief = asRecord(row.package_brief);
      if (brief) {
        pushUnique(hooks, seenHooks, readString(brief.hook));
        pushUnique(ctas, seenCtas, readCtaText(brief));
        pushUnique(scenarios, seenScenarios, readString(brief.scenario));

        if (pipelineFingerprints.length < MEMORY_LIMIT) {
          const pfp = pipelineFingerprintFromPackageBrief(brief);
          if (pfp) {
            const key = pipelineFingerprintDedupKey(pfp);
            if (key && !seenPipeline.has(key)) {
              seenPipeline.add(key);
              pipelineFingerprints.push(pfp);
            }
          }
        }

        if (fingerprints.length < MEMORY_LIMIT) {
          const fp = fingerprintFromPackageBrief(brief);
          if (fp) {
            const key = normalizeFingerprintText(
              `${fp.core_premise}|${fp.visual_world}|${fp.opening_mechanism}`,
            );
            if (key && !seenFp.has(key)) {
              seenFp.add(key);
              fingerprints.push(fp);
            }
            const dir = directionFromFingerprint(fp);
            if (dir && directions.length < MEMORY_LIMIT) {
              const dkey = normalizeFingerprintText(dir);
              if (dkey && !seenDir.has(dkey)) {
                seenDir.add(dkey);
                directions.push(dir);
              }
            }
          }
        }
        if (atmospheres.length < MEMORY_LIMIT) {
          const atm = atmosphereFromPackageBrief(brief);
          if (atm) {
            const key = normalizeFingerprintText(atm);
            if (key && !seenAtm.has(key)) {
              seenAtm.add(key);
              atmospheres.push(atm);
            }
          }
        }
      }
      const itemId = row.strategy_item_id as string | null;
      if (itemId) {
        pushUnique(topics, seenTopics, topicByItemId.get(itemId) ?? null);
      }
    }

    return {
      hooks,
      topics,
      ctas,
      scenarios,
      fingerprints,
      atmospheres,
      directions,
      pipelineFingerprints,
    };
  } catch {
    return { ...EMPTY_MEMORY };
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
