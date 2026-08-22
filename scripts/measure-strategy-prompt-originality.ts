/**
 * Offline strategy prompt size measurement for a real project (read-only Supabase).
 * No provider calls.
 *
 * Run: node --import ./scripts/register-alias.mjs scripts/measure-strategy-prompt-originality.ts
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadStrategyPlanningContext } from "@/lib/ai/planning/loadStrategyPlanningContext";
import {
  PRODUCTION_STRATEGY_SYSTEM,
  buildProductionStrategyPrompt,
} from "@/lib/ai/prompts/contentStrategyPlan";
import { readContentStrategyPlannerMaxTokens } from "@/lib/production/strategyPlannerConfig";
import {
  buildStrategyOriginalityHistoryFromInputs,
  isPackageEligibleForOriginalityHistory,
  loadStrategyOriginalityHistory,
  memoryInputFromPackageBrief,
  STRATEGY_ORIGINALITY_HISTORY_LIMIT,
} from "@/lib/content-creative-core-v2";
import type { BuildMemoryRecordInput } from "@/lib/content-creative-core-v2/memory";
import type { SupabaseClient } from "@supabase/supabase-js";

const PROJECT_ID = "163c1822-ad30-4cee-8826-dfacd9c188b9";
const PACKAGE_COUNT = 4;
const CONTEXT_LIMIT_TOKENS = 200_000;
const MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";

async function loadEligibleInputs(
  supabase: SupabaseClient,
  projectId: string,
): Promise<BuildMemoryRecordInput[]> {
  const { data: rows, error } = await supabase
    .from("content_packages")
    .select("id, status, package_brief, title, created_at, project_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(150);
  if (error) throw error;

  const packageIds = (rows ?? []).map((r) => r.id as string);
  const { data: items } = await supabase
    .from("production_run_items")
    .select("content_package_id, production_run_id, created_at")
    .in("content_package_id", packageIds)
    .order("created_at", { ascending: false });

  const latestRun = new Map<string, string>();
  for (const row of items ?? []) {
    const pkgId = row.content_package_id as string | null;
    const runId = row.production_run_id as string | null;
    if (pkgId && runId && !latestRun.has(pkgId)) latestRun.set(pkgId, runId);
  }
  const runIds = [...new Set(latestRun.values())];
  const statusByRun = new Map<string, string>();
  if (runIds.length > 0) {
    const { data: runs } = await supabase
      .from("production_runs")
      .select("id, status")
      .in("id", runIds);
    for (const r of runs ?? []) {
      statusByRun.set(r.id as string, r.status as string);
    }
  }

  const inputs: BuildMemoryRecordInput[] = [];
  for (const row of rows ?? []) {
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
      runStatus: statusByRun.get(latestRun.get(id) ?? "") ?? null,
    });
    input.projectId = projectId;
    if (isPackageEligibleForOriginalityHistory(input)) inputs.push(input);
  }
  return inputs.sort(
    (a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0),
  );
}

function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

async function main(): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const ctx = await loadStrategyPlanningContext(supabase, PROJECT_ID);
  const eligible = await loadEligibleInputs(supabase, PROJECT_ID);
  const fullSnapshot = await loadStrategyOriginalityHistory(supabase, PROJECT_ID);

  const maxTokens = readContentStrategyPlannerMaxTokens();
  const counts = [0, 10, 25, 50] as const;

  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Model: ${MODEL} (context limit ~${CONTEXT_LIMIT_TOKENS} tokens — orientační)`);
  console.log(`Eligible packages in DB (sample): ${eligible.length}`);
  console.log(
    `Loaded snapshot records: ${fullSnapshot.packageIds.length} (limit ${STRATEGY_ORIGINALITY_HISTORY_LIMIT})`,
  );
  console.log(`max_tokens (planner): ${maxTokens}\n`);

  for (const n of counts) {
    const historyBlock =
      n === 0
        ? undefined
        : buildStrategyOriginalityHistoryFromInputs(eligible.slice(0, n), {
            projectId: PROJECT_ID,
          }).promptBlock;
    const snapshot =
      n === 0
        ? null
        : buildStrategyOriginalityHistoryFromInputs(eligible.slice(0, n), {
            projectId: PROJECT_ID,
          });

    const userPrompt = buildProductionStrategyPrompt({
      project: ctx.project,
      packageCount: PACKAGE_COUNT,
      eligibleTrends: ctx.eligibleTrends,
      evergreenTopics: ctx.evergreenTopics,
      memory: ctx.memory,
      strategyOriginalityHistoryBlock: historyBlock,
      primaryPlatform: "instagram",
    });

    const systemChars = PRODUCTION_STRATEGY_SYSTEM.length;
    const userChars = userPrompt.length;
    const originalityChars = historyBlock?.length ?? 0;
    const totalChars = systemChars + userChars;
    const estTokens = estimateTokens(totalChars);
    const reserve = CONTEXT_LIMIT_TOKENS - estTokens;

    console.log(`--- history records target=${n} actual=${snapshot?.packageIds.length ?? 0} ---`);
    console.log(`  system prompt chars: ${systemChars}`);
    console.log(`  user prompt chars: ${userChars}`);
    console.log(`  originality block chars: ${originalityChars}`);
    console.log(`  total prompt chars: ${totalChars}`);
    console.log(`  orientační token count: ~${estTokens}`);
    console.log(`  max_tokens: ${maxTokens}`);
    console.log(`  approx context reserve: ~${reserve} tokens`);
    if (snapshot) {
      console.log(
        `  validator/prompt package IDs aligned: ${snapshot.packageIds.length} ids`,
      );
    }
    console.log("");
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
