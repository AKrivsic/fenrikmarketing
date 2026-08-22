/**
 * Deterministic originality gate for strategy items and T2V concepts.
 * Max one repair; second failure stops before package persist.
 */

import { normalizePainPoints } from "@/lib/ai/prompts/context";
import { normalizeMemoryText } from "@/lib/ai/workflows/antiRepetitionMemory";
import type { ContentPlanItem } from "@/lib/ai/schemas/weeklyStrategy";
import {
  classifyPovFamily,
  classifyScenarioFamily,
  classifyVisualMotif,
  normalizePainKey,
  sameScenarioFamily,
  sameVisualMotif,
} from "@/lib/content-memory/creativeTaxonomy";
import {
  assembleProjectCreativeMemory,
  extractCreativeRecordFromBrief,
  isParaphrase,
  lastUsedPainKey,
  unusedPainPoints,
  type ProjectCreativeMemory,
  type ProjectCreativeRecord,
} from "@/lib/content-memory/projectCreativeMemory";
import type { Project } from "@/lib/supabase/types";

export const STRATEGY_ORIGINALITY_EXHAUSTED =
  "strategy_originality_exhausted" as const;

export type StrategyOriginalityReason =
  | "same_scenario_family"
  | "same_situation_different_character"
  | "paraphrased_topic_or_hook"
  | "pain_not_rotated"
  | "same_visual_motif"
  | "hook_or_pov_only_change";

export interface StrategyOriginalityIssue {
  item_index: number;
  reason: StrategyOriginalityReason;
  detail: string;
  forbidden_family?: string;
}

export interface StrategyOriginalityResult {
  ok: boolean;
  issues: StrategyOriginalityIssue[];
}

function itemText(item: Pick<ContentPlanItem, "topic" | "angle" | "pain_point">): string {
  return [item.topic, item.angle ?? "", item.pain_point ?? ""].join("\n");
}

function matchesRecordSituation(
  item: Pick<ContentPlanItem, "topic" | "angle" | "pain_point">,
  record: ProjectCreativeRecord,
): boolean {
  const family = classifyScenarioFamily(itemText(item));
  if (sameScenarioFamily(family, record.scenario_family)) return true;
  if (isParaphrase(item.topic, record.topic)) return true;
  if (record.angle && item.angle && isParaphrase(item.angle, record.angle)) {
    return true;
  }
  return false;
}

export function evaluateStrategyItemOriginality(args: {
  item: Pick<ContentPlanItem, "topic" | "angle" | "pain_point">;
  index: number;
  memory: ProjectCreativeMemory;
  projectPains: readonly string[];
  packageCount: number;
}): StrategyOriginalityIssue[] {
  const issues: StrategyOriginalityIssue[] = [];
  const text = itemText(args.item);
  const family = classifyScenarioFamily(text);
  const motif = classifyVisualMotif(text);
  const pov = classifyPovFamily(text);
  const painKey = normalizePainKey(args.item.pain_point ?? "");
  const unused = unusedPainPoints(args.projectPains, args.memory);
  const lastPain = lastUsedPainKey(args.memory);

  for (const record of args.memory.records) {
    if (sameScenarioFamily(family, record.scenario_family)) {
      issues.push({
        item_index: args.index,
        reason: "same_scenario_family",
        detail: `Repeats scenario family ${family} (prior: ${record.topic.slice(0, 80)})`,
        forbidden_family: family,
      });
    }
    if (
      matchesRecordSituation(args.item, record) &&
      pov !== record.pov_family &&
      record.pov_family !== "other" &&
      pov !== "other"
    ) {
      issues.push({
        item_index: args.index,
        reason: "same_situation_different_character",
        detail: `Different POV (${pov} vs ${record.pov_family}) in the same situation`,
        forbidden_family: family,
      });
    }
    if (isParaphrase(args.item.topic, record.topic) || isParaphrase(args.item.topic, record.hook)) {
      issues.push({
        item_index: args.index,
        reason: "paraphrased_topic_or_hook",
        detail: "Topic or hook is a paraphrase of a recent package",
      });
    }
    if (
      sameVisualMotif(motif, record.visual_motif) &&
      sameScenarioFamily(family, record.scenario_family)
    ) {
      issues.push({
        item_index: args.index,
        reason: "same_visual_motif",
        detail: `Repeats visual motif ${motif}`,
      });
    }
  }

  if (
    unused.length > 0 &&
    lastPain &&
    painKey &&
    painKey === lastPain
  ) {
    issues.push({
      item_index: args.index,
      reason: "pain_not_rotated",
      detail: `Pain point "${args.item.pain_point}" was the last used pain; unused pains exist`,
    });
  }

  const uniqueReasons = new Map<string, StrategyOriginalityIssue>();
  for (const issue of issues) {
    const key = `${issue.reason}:${issue.forbidden_family ?? ""}`;
    if (!uniqueReasons.has(key)) uniqueReasons.set(key, issue);
  }
  return [...uniqueReasons.values()];
}

export function evaluateStrategyPlanOriginality(args: {
  items: Array<Pick<ContentPlanItem, "topic" | "angle" | "pain_point">>;
  memory: ProjectCreativeMemory;
  project: Pick<Project, "pain_points">;
  packageCount: number;
}): StrategyOriginalityResult {
  const projectPains = normalizePainPoints(args.project as Project);
  const issues: StrategyOriginalityIssue[] = [];
  args.items.forEach((item, index) => {
    issues.push(
      ...evaluateStrategyItemOriginality({
        item,
        index,
        memory: args.memory,
        projectPains,
        packageCount: args.packageCount,
      }),
    );
  });
  return { ok: issues.length === 0, issues };
}

export function formatOriginalityRetryAppend(
  issues: StrategyOriginalityIssue[],
): string {
  return [
    "",
    "RETRY — the previous strategy repeated a forbidden creative family.",
    "This is the ONLY repair attempt. Invent genuinely new situations.",
    "Rejected because:",
    ...issues.map(
      (i) => `- item ${i.item_index + 1}: ${i.reason} — ${i.detail}`,
    ),
    "A different character, hook, or wording of the same silent-profile lookup is NOT new.",
    "Pick a different pain point when unused pains exist.",
    "Change the world, dominant prop, conflict, and payoff.",
  ].join("\n");
}

export function originalityIssuesToValidation(
  issues: StrategyOriginalityIssue[],
): Array<{ path: string; message: string }> {
  return issues.map((issue) => ({
    path: `$.content_plan[${issue.item_index}].topic`,
    message: `${issue.reason}: ${issue.detail}`,
  }));
}

export function candidateMatchesForbiddenFamilies(args: {
  topic: string;
  angle?: string | null;
  painPoint?: string | null;
  hook?: string | null;
  visualText?: string | null;
  memory: ProjectCreativeMemory;
}): boolean {
  const text = [args.topic, args.angle ?? "", args.painPoint ?? "", args.hook ?? "", args.visualText ?? ""].join(
    "\n",
  );
  const family = classifyScenarioFamily(text);
  const motif = classifyVisualMotif(text);
  return args.memory.records.some(
    (record) =>
      sameScenarioFamily(family, record.scenario_family) ||
      (sameVisualMotif(motif, record.visual_motif) &&
        sameScenarioFamily(family, record.scenario_family)),
  );
}

export function evaluatePackageBriefOriginality(args: {
  brief: Record<string, unknown>;
  memory: ProjectCreativeMemory;
  projectPains?: readonly string[];
}): StrategyOriginalityIssue[] {
  const candidate = extractCreativeRecordFromBrief({
    packageId: "approve-candidate",
    brief: args.brief,
  });
  const previous = asRecordFromBrief(args.brief.t2v_previous_concept);
  const extraRecords: ProjectCreativeRecord[] = [];
  if (previous) {
    extraRecords.push(
      extractCreativeRecordFromBrief({
        packageId: "previous-concept",
        brief: previous,
        explicitRejected: true,
      }),
    );
  }
  const memory: ProjectCreativeMemory =
    extraRecords.length > 0
      ? assembleProjectCreativeMemory([...args.memory.records, ...extraRecords])
      : args.memory;

  const issues: StrategyOriginalityIssue[] = [];
  for (const record of memory.records) {
    if (sameScenarioFamily(candidate.scenario_family, record.scenario_family)) {
      issues.push({
        item_index: 0,
        reason: "same_scenario_family",
        detail: `Repeats scenario family ${candidate.scenario_family}`,
        forbidden_family: candidate.scenario_family,
      });
    }
    if (
      sameVisualMotif(candidate.visual_motif, record.visual_motif) &&
      sameScenarioFamily(candidate.scenario_family, record.scenario_family)
    ) {
      issues.push({
        item_index: 0,
        reason: "same_visual_motif",
        detail: `Repeats visual motif ${candidate.visual_motif}`,
      });
    }
    if (isParaphrase(candidate.hook, record.hook) || isParaphrase(candidate.topic, record.topic)) {
      issues.push({
        item_index: 0,
        reason: "paraphrased_topic_or_hook",
        detail: "Hook or topic is a paraphrase of a recent package",
      });
    }
  }
  const unused = unusedPainPoints(args.projectPains ?? [], memory);
  const lastPain = lastUsedPainKey(memory);
  const painKey = normalizePainKey(candidate.pain_point ?? "");
  if (unused.length > 0 && lastPain && painKey && painKey === lastPain) {
    issues.push({
      item_index: 0,
      reason: "pain_not_rotated",
      detail: "Last used pain point was selected again",
    });
  }
  const unique = new Map<string, StrategyOriginalityIssue>();
  for (const issue of issues) {
    const key = `${issue.reason}:${issue.forbidden_family ?? ""}`;
    if (!unique.has(key)) unique.set(key, issue);
  }
  return [...unique.values()];
}

function asRecordFromBrief(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export { normalizeMemoryText };
