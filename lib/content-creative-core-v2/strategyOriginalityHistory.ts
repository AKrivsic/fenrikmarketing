/**
 * Strategy Originality v2 — single rolling history snapshot for prompt + validator.
 *
 * Lifecycle (no DB migration):
 * - Include published/ready/approved/draft with usable creative signal.
 * - Explicit creative rejection stays in the window (strong recent protection, time decay).
 * - Technical cancelled/failed runs are not creative rejection; valid Core v2 still counts.
 * - Incomplete packages without valid Core or topic/pain data are excluded.
 * - Archived rows may contribute when they still carry usable signal (ancient weight via memory).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CREATIVE_CORE_V2_MEMORY_CONFIG,
  STRATEGY_ORIGINALITY_HISTORY_LIMIT,
} from "@/lib/content-creative-core-v2/config";
import {
  assembleCreativeMemory,
  memoryInputFromPackageBrief,
  type BuildMemoryRecordInput,
} from "@/lib/content-creative-core-v2/memory";
import { briefHasValidCreativeCoreV2 } from "@/lib/content-creative-core-v2/packageCreativeSignal";
import type {
  CreativeMemoryRecordV2,
  CreativeMemoryV2,
} from "@/lib/content-creative-core-v2/types";

const ELIGIBLE_PACKAGE_STATUSES = new Set([
  "draft",
  "ready",
  "approved",
  "published",
  "archived",
]);

/** DB fetch buffer before eligibility filtering (same project, newest first). */
const PACKAGE_FETCH_BUFFER = 150;

export interface StrategyOriginalityCompactSummary {
  package_id: string;
  topic: string;
  angle: string;
  pain_point: string;
  situation_conflict: string;
  funnel_stage?: string;
}

export interface StrategyOriginalityHistoryTelemetry {
  history_record_count: number;
  originality_block_chars: number;
  estimated_prompt_tokens: number;
  package_ids: string[];
  summaries_truncated: boolean;
}

export interface StrategyOriginalityHistorySnapshot {
  packageIds: string[];
  memory: CreativeMemoryV2;
  promptBlock: string;
  summariesByPackageId: ReadonlyMap<string, StrategyOriginalityCompactSummary>;
  telemetry: StrategyOriginalityHistoryTelemetry;
  nowIso: string;
}

function hasSufficientOriginalityData(input: BuildMemoryRecordInput): boolean {
  const topic = (input.centralTopic ?? "").trim();
  if (topic.length >= 10) return true;
  const pain = (input.painPoint ?? "").trim();
  const conflict = (input.conflict ?? "").trim();
  return pain.length >= 8 && conflict.length >= 8;
}

function hasUsableCreativeSignal(input: BuildMemoryRecordInput): boolean {
  const brief = input.sourceBrief ?? {};
  if (briefHasValidCreativeCoreV2(brief)) return true;
  return hasSufficientOriginalityData(input);
}

/**
 * Whether a package row should enter the rolling originality window.
 */
export function isPackageEligibleForOriginalityHistory(
  input: BuildMemoryRecordInput,
): boolean {
  const status = (input.packageStatus ?? "").trim().toLowerCase();
  if (status && !ELIGIBLE_PACKAGE_STATUSES.has(status)) {
    return false;
  }
  if (!hasUsableCreativeSignal(input)) {
    return false;
  }
  // Creative rejection, technical cancel, and failed runs remain eligible when signal exists.
  return true;
}

function compactSummaryFromRecord(
  record: CreativeMemoryRecordV2,
  funnelStage?: string,
): StrategyOriginalityCompactSummary {
  return {
    package_id: record.package_id,
    topic: record.central_topic,
    angle: record.conflict || record.reveal_or_surprise || "",
    pain_point: record.pain_point ?? "",
    situation_conflict: [record.conflict, record.reveal_or_surprise]
      .filter(Boolean)
      .join(" — "),
    ...(funnelStage ? { funnel_stage: funnelStage } : {}),
  };
}

function truncateField(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function buildSummaryLines(
  summaries: StrategyOriginalityCompactSummary[],
  fieldMax: number,
): string[] {
  return summaries.map((s, i) => {
    const id = s.package_id.slice(0, 8);
    const parts = [
      `#${i + 1} id=${id}`,
      `topic="${truncateField(s.topic, fieldMax)}"`,
      `angle="${truncateField(s.angle, fieldMax)}"`,
      `pain="${truncateField(s.pain_point, fieldMax)}"`,
      `situation="${truncateField(s.situation_conflict, fieldMax)}"`,
    ];
    if (s.funnel_stage) {
      parts.push(`funnel=${truncateField(s.funnel_stage, 24)}`);
    }
    return `- ${parts.join("; ")}`;
  });
}

export function buildStrategyOriginalityHistoryPromptBlock(args: {
  summaries: readonly StrategyOriginalityCompactSummary[];
  limit: number;
}): { block: string; summariesTruncated: boolean; blockChars: number } {
  const header = [
    `STRATEGY ORIGINALITY HISTORY (${args.limit} most recent usable packages — you will be validated against exactly these):`,
    "Each line is a compact fingerprint. Do NOT repeat the same situation, angle, conflict mechanism, or paraphrase.",
    "General pain points may repeat only with a clearly new situation and execution.",
    "",
  ];
  const footer = [
    "",
    "ORIGINALITY RULES:",
    "- Hard fail: same situation + same angle, same conflict + same opening mechanism, clear paraphrase of a listed package.",
    "- Allowed: same broad pain with a new setting, conflict, and payoff.",
    "- Packages not listed here are outside the rolling window and must not block you.",
  ];

  const maxChars = CREATIVE_CORE_V2_MEMORY_CONFIG.strategyOriginalityPromptMaxChars;
  let fieldMax = 120;
  let summariesTruncated = false;

  for (let pass = 0; pass < 8; pass += 1) {
    const lines = buildSummaryLines([...args.summaries], fieldMax);
    const block = [...header, ...lines, ...footer].join("\n");
    if (block.length <= maxChars || fieldMax <= 24) {
      return {
        block,
        summariesTruncated: summariesTruncated || fieldMax < 120,
        blockChars: block.length,
      };
    }
    summariesTruncated = true;
    fieldMax = Math.max(24, Math.floor(fieldMax * 0.75));
  }

  const lines = buildSummaryLines([...args.summaries], 24);
  const block = [...header, ...lines, ...footer].join("\n");
  return {
    block: block.slice(0, maxChars),
    summariesTruncated: true,
    blockChars: Math.min(block.length, maxChars),
  };
}

export function buildStrategyOriginalityHistoryFromInputs(
  inputs: BuildMemoryRecordInput[],
  options: {
    nowIso?: string;
    excludePackageId?: string;
    projectId?: string;
    funnelStageByPackageId?: ReadonlyMap<string, string>;
  } = {},
): StrategyOriginalityHistorySnapshot {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const seen = new Set<string>();
  const eligible: BuildMemoryRecordInput[] = [];

  const sorted = [...inputs].sort((a, b) => {
    const da = Date.parse(a.createdAt ?? "") || 0;
    const db = Date.parse(b.createdAt ?? "") || 0;
    return db - da;
  });

  for (const input of sorted) {
    if (options.projectId && input.projectId && input.projectId !== options.projectId) {
      continue;
    }
    if (options.excludePackageId && input.packageId === options.excludePackageId) {
      continue;
    }
    if (seen.has(input.packageId)) continue;
    if (!isPackageEligibleForOriginalityHistory(input)) continue;
    seen.add(input.packageId);
    eligible.push(input);
    if (eligible.length >= STRATEGY_ORIGINALITY_HISTORY_LIMIT) break;
  }

  const memory = assembleCreativeMemory(eligible, {
    nowIso,
    recordLimit: STRATEGY_ORIGINALITY_HISTORY_LIMIT,
  });

  const packageIds = memory.records.map((r) => r.package_id);
  const summariesByPackageId = new Map<string, StrategyOriginalityCompactSummary>();
  for (const record of memory.records) {
    summariesByPackageId.set(
      record.package_id,
      compactSummaryFromRecord(
        record,
        options.funnelStageByPackageId?.get(record.package_id),
      ),
    );
  }

  const summaries = packageIds
    .map((id) => summariesByPackageId.get(id))
    .filter((s): s is StrategyOriginalityCompactSummary => Boolean(s));

  const { block, summariesTruncated, blockChars } =
    buildStrategyOriginalityHistoryPromptBlock({
      summaries,
      limit: STRATEGY_ORIGINALITY_HISTORY_LIMIT,
    });

  return {
    packageIds,
    memory,
    promptBlock: block,
    summariesByPackageId,
    telemetry: {
      history_record_count: packageIds.length,
      originality_block_chars: blockChars,
      estimated_prompt_tokens: Math.ceil(blockChars / 4),
      package_ids: [...packageIds],
      summaries_truncated: summariesTruncated,
    },
    nowIso,
  };
}

async function loadLatestRunStatusByPackageId(
  supabase: SupabaseClient,
  packageIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (packageIds.length === 0) return out;

  const { data: items, error: itemErr } = await supabase
    .from("production_run_items")
    .select("content_package_id, production_run_id, created_at")
    .in("content_package_id", packageIds)
    .order("created_at", { ascending: false });
  if (itemErr || !items?.length) return out;

  const latestRunIdByPackage = new Map<string, string>();
  for (const row of items) {
    const pkgId = row.content_package_id as string | null;
    const runId = row.production_run_id as string | null;
    if (!pkgId || !runId || latestRunIdByPackage.has(pkgId)) continue;
    latestRunIdByPackage.set(pkgId, runId);
  }

  const runIds = [...new Set(latestRunIdByPackage.values())];
  if (runIds.length === 0) return out;

  const { data: runs, error: runErr } = await supabase
    .from("production_runs")
    .select("id, status")
    .in("id", runIds);
  if (runErr || !runs) return out;

  const statusByRunId = new Map(
    runs.map((r) => [r.id as string, r.status as string]),
  );
  for (const [pkgId, runId] of latestRunIdByPackage) {
    const status = statusByRunId.get(runId);
    if (status) out.set(pkgId, status);
  }
  return out;
}

export async function loadStrategyOriginalityHistory(
  supabase: SupabaseClient,
  projectId: string,
  options: {
    excludePackageId?: string;
    nowIso?: string;
  } = {},
): Promise<StrategyOriginalityHistorySnapshot> {
  const { data: rows, error } = await supabase
    .from("content_packages")
    .select("id, status, package_brief, title, created_at, project_id")
    .eq("project_id", projectId)
    .in("status", [...ELIGIBLE_PACKAGE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(PACKAGE_FETCH_BUFFER);
  if (error) throw error;

  const packageIds = (rows ?? []).map((r) => r.id as string);
  const runStatusByPackageId = await loadLatestRunStatusByPackageId(
    supabase,
    packageIds,
  );

  const inputs: BuildMemoryRecordInput[] = [];
  for (const row of rows ?? []) {
    if ((row.project_id as string) !== projectId) continue;
    const id = row.id as string;
    const brief =
      row.package_brief &&
      typeof row.package_brief === "object" &&
      !Array.isArray(row.package_brief)
        ? (row.package_brief as Record<string, unknown>)
        : {};
    const input = memoryInputFromPackageBrief({
      packageId: id,
      brief,
      title: typeof row.title === "string" ? row.title : null,
      createdAt: typeof row.created_at === "string" ? row.created_at : null,
      packageStatus: typeof row.status === "string" ? row.status : null,
      runStatus: runStatusByPackageId.get(id) ?? null,
    });
    input.projectId = projectId;
    inputs.push(input);
  }

  return buildStrategyOriginalityHistoryFromInputs(inputs, {
    nowIso: options.nowIso,
    excludePackageId: options.excludePackageId,
    projectId,
  });
}
