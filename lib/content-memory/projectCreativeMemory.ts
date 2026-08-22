/**
 * Structured creative memory assembled from existing Content Packages.
 * Includes published, approved, ready, rejected, cancelled, and operator-seen drafts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeMemoryText } from "@/lib/ai/workflows/antiRepetitionMemory";
import {
  classifyOpeningMechanism,
  classifyPovFamily,
  classifyPropFamily,
  classifyScenarioFamily,
  classifyVisualMotif,
  normalizePainKey,
  type T2vOpeningMechanism,
  type T2vPovFamily,
  type T2vPropFamily,
  type T2vScenarioFamily,
  type T2vVisualMotif,
} from "@/lib/content-memory/creativeTaxonomy";

export const PROJECT_CREATIVE_MEMORY_VERSION = "project-creative-memory@1" as const;

export type CreativeMemorySourceStatus =
  | "published"
  | "approved"
  | "ready"
  | "rejected"
  | "cancelled"
  | "draft";

export interface ProjectCreativeRecord {
  package_id: string;
  source_status: CreativeMemorySourceStatus;
  pain_point: string | null;
  topic: string;
  angle: string;
  hook: string;
  scenario_family: T2vScenarioFamily;
  visual_motif: T2vVisualMotif;
  pov_family: T2vPovFamily;
  opening_mechanism: T2vOpeningMechanism;
  environment: string;
  dominant_prop: T2vPropFamily;
  narrative_mechanism: string;
  primary_emotion: string;
  payoff: string;
  rejected: boolean;
}

export interface ProjectCreativeMemory {
  version: typeof PROJECT_CREATIVE_MEMORY_VERSION;
  records: ProjectCreativeRecord[];
  recent_pain_keys: string[];
  forbidden_scenario_families: T2vScenarioFamily[];
  forbidden_visual_motifs: T2vVisualMotif[];
}

export const EMPTY_PROJECT_CREATIVE_MEMORY: ProjectCreativeMemory = {
  version: PROJECT_CREATIVE_MEMORY_VERSION,
  records: [],
  recent_pain_keys: [],
  forbidden_scenario_families: [],
  forbidden_visual_motifs: [],
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sourceStatusFromRow(args: {
  packageStatus: string | null;
  runStatus: string | null;
  reviewStatus: string | null;
  reviewApproved: boolean;
  explicitRejected: boolean;
}): CreativeMemorySourceStatus {
  if (args.explicitRejected) return "rejected";
  if (args.runStatus === "cancelled") return "cancelled";
  if (args.packageStatus === "published") return "published";
  if (args.reviewApproved || args.reviewStatus === "approved") return "approved";
  if (args.reviewStatus === "ready") return "ready";
  if (args.packageStatus === "ready") return "ready";
  return "draft";
}

export function extractCreativeRecord(args: {
  packageId: string;
  packageStatus?: string | null;
  runStatus?: string | null;
  title?: string | null;
  hook?: string | null;
  topic?: string | null;
  angle?: string | null;
  painPoint?: string | null;
  coreIdea?: string | null;
  environment?: string | null;
  narrativeMechanism?: string | null;
  emotion?: string | null;
  payoff?: string | null;
  visualText?: string | null;
  reviewStatus?: string | null;
  reviewApproved?: boolean;
  explicitRejected?: boolean;
}): ProjectCreativeRecord {
  const topic = (args.topic ?? args.title ?? "").trim();
  const angle = (args.angle ?? "").trim();
  const hook = (args.hook ?? "").trim();
  const core = (args.coreIdea ?? "").trim();
  const visual = (args.visualText ?? args.environment ?? "").trim();
  const combined = [topic, angle, hook, core, visual, args.payoff ?? ""].join(
    "\n",
  );
  const explicitRejected = args.explicitRejected === true;
  const source_status = sourceStatusFromRow({
    packageStatus: args.packageStatus ?? null,
    runStatus: args.runStatus ?? null,
    reviewStatus: args.reviewStatus ?? null,
    reviewApproved: args.reviewApproved === true,
    explicitRejected,
  });
  return {
    package_id: args.packageId,
    source_status,
    pain_point: args.painPoint?.trim() || null,
    topic,
    angle,
    hook,
    scenario_family: classifyScenarioFamily(combined),
    visual_motif: classifyVisualMotif(`${visual}\n${combined}`),
    pov_family: classifyPovFamily(combined),
    opening_mechanism: classifyOpeningMechanism(hook),
    environment: (args.environment ?? "").trim(),
    dominant_prop: classifyPropFamily(`${visual}\n${combined}`),
    narrative_mechanism: (args.narrativeMechanism ?? "").trim(),
    primary_emotion: (args.emotion ?? "").trim(),
    payoff: (args.payoff ?? "").trim(),
    rejected:
      explicitRejected ||
      source_status === "rejected" ||
      source_status === "cancelled",
  };
}

export function extractCreativeRecordFromBrief(args: {
  packageId: string;
  brief: Record<string, unknown>;
  title?: string | null;
  packageStatus?: string | null;
  runStatus?: string | null;
  topic?: string | null;
  angle?: string | null;
  painPoint?: string | null;
  explicitRejected?: boolean;
}): ProjectCreativeRecord {
  const brief = args.brief;
  const pg = asRecord(brief.presentation_generation);
  const concept = asRecord(pg?.video_concept);
  const identity = asRecord(pg?.visual_identity);
  const review = asRecord(brief.creative_review);
  const t2v = asRecord(brief.t2v_canonical_creative);
  const visualScenes = Array.isArray(brief.visual_scenes)
    ? (brief.visual_scenes as unknown[])
        .map((s) => {
          const rec = asRecord(s);
          return [readString(rec?.image_prompt), readString(rec?.motion_prompt)].join(
            " ",
          );
        })
        .join(" ")
    : "";
  return extractCreativeRecord({
    packageId: args.packageId,
    packageStatus: args.packageStatus ?? null,
    runStatus: args.runStatus ?? null,
    title: args.title ?? readString(brief.hook),
    hook: readString(brief.hook),
    topic:
      args.topic ??
      (readString(t2v?.core_idea) || readString(concept?.core_idea)),
    angle: args.angle ?? "",
    painPoint:
      args.painPoint ??
      (readString(pg?.selected_pain_point) || readString(t2v?.pain_point)),
    coreIdea: readString(concept?.core_idea) || readString(t2v?.core_idea),
    environment:
      readString(identity?.environment) ||
      readString(asRecord(concept?.visual_direction)?.environment),
    emotion: readString(t2v?.primary_emotion) || readString(concept?.emotional_tone),
    payoff: readString(t2v?.payoff),
    visualText: visualScenes,
    reviewStatus: readString(review?.status),
    reviewApproved: review?.approved === true,
    explicitRejected:
      args.explicitRejected === true ||
      brief.t2v_creative_rejected === true ||
      asRecord(brief.t2v_creative_rejection) != null,
  });
}

export function assembleProjectCreativeMemory(
  records: ProjectCreativeRecord[],
): ProjectCreativeMemory {
  const recent_pain_keys: string[] = [];
  const seenPain = new Set<string>();
  const forbidden_scenario_families: T2vScenarioFamily[] = [];
  const seenScenario = new Set<T2vScenarioFamily>();
  const forbidden_visual_motifs: T2vVisualMotif[] = [];
  const seenMotif = new Set<T2vVisualMotif>();
  for (const record of records) {
    const pain = normalizePainKey(record.pain_point);
    if (pain && !seenPain.has(pain)) {
      seenPain.add(pain);
      recent_pain_keys.push(pain);
    }
    if (
      record.scenario_family !== "other" &&
      !seenScenario.has(record.scenario_family)
    ) {
      seenScenario.add(record.scenario_family);
      forbidden_scenario_families.push(record.scenario_family);
    }
    if (
      record.visual_motif !== "other" &&
      !seenMotif.has(record.visual_motif)
    ) {
      seenMotif.add(record.visual_motif);
      forbidden_visual_motifs.push(record.visual_motif);
    }
  }
  return {
    version: PROJECT_CREATIVE_MEMORY_VERSION,
    records,
    recent_pain_keys,
    forbidden_scenario_families,
    forbidden_visual_motifs,
  };
}

export function creativeMemoryPromptBlock(memory: ProjectCreativeMemory): string {
  if (memory.records.length === 0) return "";
  const lines = memory.records.slice(0, 16).map((r, i) => {
    return (
      `- #${i + 1} [${r.source_status}${r.rejected ? "/rejected" : ""}] ` +
      `pain="${r.pain_point ?? ""}"; family=${r.scenario_family}; ` +
      `motif=${r.visual_motif}; pov=${r.pov_family}; ` +
      `prop=${r.dominant_prop}; topic="${r.topic.slice(0, 90)}"`
    );
  });
  return [
    "CROSS-RUN CREATIVE MEMORY (do not repeat — includes cancelled and rejected drafts):",
    ...lines,
    "MEMORY RULES:",
    "- A different wording of the same topic is NOT a new topic.",
    "- A different character in the same situation is NOT a new story.",
    "- Changing only the hook or POV is not enough.",
    "- Do not reuse a forbidden scenario family or visual motif above.",
    "- If unused pain points exist, do not reuse the most recent pain point.",
    "- Seek an unexpected POV, concrete conflict, surprise, visual change, payoff,",
    "  and a different world / dominant prop than recent drafts.",
  ].join("\n");
}

const PACKAGE_SCAN_LIMIT = 60;

export async function loadProjectCreativeMemory(
  supabase: SupabaseClient,
  projectId: string,
  options: { excludePackageId?: string | null } = {},
): Promise<ProjectCreativeMemory> {
  if (!projectId) return { ...EMPTY_PROJECT_CREATIVE_MEMORY };
  const excludeId = options.excludePackageId?.trim() || null;
  const { data: pkgRows, error } = await supabase
    .from("content_packages")
    .select("id, status, strategy_item_id, package_brief, title, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(PACKAGE_SCAN_LIMIT);
  if (error || !pkgRows) return { ...EMPTY_PROJECT_CREATIVE_MEMORY };

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
  const topicByItem = new Map<
    string,
    { topic: string; angle: string; pain: string; runId: string }
  >();
  if (strategyItemIds.length > 0) {
    const { data: items } = await supabase
      .from("content_strategy_items")
      .select("id, brief")
      .in("id", strategyItemIds);
    for (const row of items ?? []) {
      const brief = asRecord(row.brief);
      topicByItem.set(row.id as string, {
        topic: readString(brief?.topic),
        angle: readString(brief?.angle),
        pain: readString(brief?.pain_point),
        runId: readString(brief?.production_run_id),
      });
    }
  }

  const runIds = Array.from(
    new Set(
      [...topicByItem.values()].map((v) => v.runId).filter((id) => id.length > 0),
    ),
  );
  const runStatusById = new Map<string, string>();
  if (runIds.length > 0) {
    const { data: runs } = await supabase
      .from("production_runs")
      .select("id, status")
      .in("id", runIds);
    for (const run of runs ?? []) {
      runStatusById.set(run.id as string, String(run.status ?? ""));
    }
  }

  const records: ProjectCreativeRecord[] = [];
  for (const row of rows) {
    const brief = asRecord(row.package_brief);
    const pg = asRecord(brief?.presentation_generation);
    const concept = asRecord(pg?.video_concept);
    const identity = asRecord(pg?.visual_identity);
    const review = asRecord(brief?.creative_review);
    const t2v = asRecord(brief?.t2v_canonical_creative);
    const strategy = topicByItem.get((row.strategy_item_id as string) ?? "") ?? {
      topic: "",
      angle: "",
      pain: "",
      runId: "",
    };
    const visualScenes = Array.isArray(brief?.visual_scenes)
      ? (brief?.visual_scenes as unknown[])
          .map((s) => {
            const rec = asRecord(s);
            return [readString(rec?.image_prompt), readString(rec?.motion_prompt)].join(
              " ",
            );
          })
          .join(" ")
      : "";
    records.push(
      extractCreativeRecord({
        packageId: row.id as string,
        packageStatus: readString(row.status),
        runStatus: runStatusById.get(strategy.runId) ?? null,
        title: readString(row.title),
        hook: readString(brief?.hook),
        topic: strategy.topic,
        angle: strategy.angle,
        painPoint:
          readString(pg?.selected_pain_point) ||
          strategy.pain ||
          readString(t2v?.pain_point),
        coreIdea: readString(concept?.core_idea) || readString(t2v?.core_idea),
        environment:
          readString(identity?.environment) ||
          readString(asRecord(concept?.visual_direction)?.environment),
        narrativeMechanism: readString(
          asRecord(pg?.content_pipeline_fingerprint)?.narrative_mechanism,
        ),
        emotion:
          readString(t2v?.primary_emotion) ||
          readString(concept?.emotional_tone),
        payoff: readString(t2v?.payoff),
        visualText: visualScenes,
        reviewStatus: readString(review?.status),
        reviewApproved: review?.approved === true,
        explicitRejected:
          brief?.t2v_creative_rejected === true ||
          asRecord(brief?.t2v_creative_rejection) != null,
      }),
    );
  }
  return assembleProjectCreativeMemory(records);
}

export function lastUsedPainKey(memory: ProjectCreativeMemory): string | null {
  return memory.recent_pain_keys[0] ?? null;
}

/** Pains other than the most recently used one — rotation target for packageCount=1. */
export function unusedPainPoints(
  projectPains: readonly string[],
  memory: ProjectCreativeMemory,
): string[] {
  const last = lastUsedPainKey(memory);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of projectPains) {
    const key = normalizePainKey(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (last && key === last) continue;
    out.push(raw.trim());
  }
  return out;
}

export function isParaphrase(a: string, b: string): boolean {
  const na = normalizeMemoryText(a);
  const nb = normalizeMemoryText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const tokens = (text: string) =>
    new Set(text.split(" ").filter((w) => w.length >= 4));
  const ta = tokens(na);
  const tb = tokens(nb);
  if (ta.size === 0 || tb.size === 0) return false;
  let overlap = 0;
  for (const w of ta) if (tb.has(w)) overlap += 1;
  const min = Math.min(ta.size, tb.size);
  return overlap / min >= 0.55;
}
