import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStrategyProvider } from "@/lib/ai/index";
import { loadStrategyPlanningContext } from "@/lib/ai/planning/loadStrategyPlanningContext";
import {
  buildProductionStrategyExpectedShape,
  buildProductionStrategyPrompt,
  buildProductionStrategyRetryAppend,
  PRODUCTION_STRATEGY_SYSTEM,
} from "@/lib/ai/prompts/contentStrategyPlan";
import { contentStrategyPlanSchema } from "@/lib/ai/schemas/contentStrategyPlan";
import {
  checkContentPlanFunnelDiversity,
  checkContentPlanLength,
  checkContentPlanSources,
  checkContentStrategyPlanGuardrails,
} from "@/lib/ai/guardrails";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import { readContentStrategyPlannerMaxTokens } from "@/lib/production/strategyPlannerConfig";
import { ensureScenarioPool } from "@/lib/ai/workflows/generateScenarios";
import { persistProductionStrategyPlan } from "@/lib/ai/workflows/persistProductionStrategyPlan";
import {
  coerceFormat,
  WorkflowError,
  type WorkflowResult,
} from "@/lib/ai/workflows/shared";
import type { ContentFormat, PlatformType } from "@/lib/supabase/types";
import {
  buildGenerationTelemetryDocument,
  getTelemetryCollector,
  runWithTelemetrySession,
  strategyPlanSummaries,
  withTelemetry,
} from "@/lib/ai/telemetry";

const PRODUCTION_STRATEGY_CLAUDE_TIMEOUT_MS = 180_000;
const PRODUCTION_STRATEGY_CLAUDE_MAX_TRANSPORT_ATTEMPTS = 1;

export interface PlanContentStrategyInput {
  mode: "production_run";
  projectId: string;
  productionRunId: string;
  packageCount: number;
  platform: PlatformType;
  format: ContentFormat;
  goalType: string;
  client?: SupabaseClient;
}

export interface PlanContentStrategyData {
  strategyId: string;
  itemIds: string[];
}

export async function planContentStrategy(
  input: PlanContentStrategyInput,
): Promise<WorkflowResult<PlanContentStrategyData>> {
  if (input.mode !== "production_run") {
    throw new WorkflowError("invalid_input", "only production_run mode is supported");
  }

  const { projectId, productionRunId, packageCount, platform, format, goalType } =
    input;

  if (!projectId || !productionRunId) {
    throw new WorkflowError("invalid_input", "project_id and production_run_id are required");
  }
  if (!Number.isInteger(packageCount) || packageCount < 1) {
    throw new WorkflowError("invalid_input", "packageCount must be a positive integer");
  }

  const { result } = await runWithTelemetrySession(() =>
    planContentStrategyUnchecked({
      projectId,
      productionRunId,
      packageCount,
      platform,
      format,
      goalType,
      client: input.client,
    }),
  );
  return result;
}

async function planContentStrategyUnchecked(args: {
  projectId: string;
  productionRunId: string;
  packageCount: number;
  platform: PlatformType;
  format: ContentFormat;
  goalType: string;
  client?: PlanContentStrategyInput["client"];
}): Promise<WorkflowResult<PlanContentStrategyData>> {
  const {
    projectId,
    productionRunId,
    packageCount,
    platform,
    format,
    goalType,
  } = args;

  const supabase = args.client ?? createSupabaseAdminClient();

  await ensureScenarioPool(projectId);

  const ctx = await loadStrategyPlanningContext(supabase, projectId);

  const prompt = buildProductionStrategyPrompt({
    project: ctx.project,
    packageCount,
    eligibleTrends: ctx.eligibleTrends,
    evergreenTopics: ctx.evergreenTopics,
    memory: ctx.memory,
    primaryPlatform: platform,
  });

  const expectedShape = buildProductionStrategyExpectedShape(
    packageCount,
    ctx.eligibleTrends,
    ctx.evergreenTopics,
  );

  const summaries = strategyPlanSummaries({
    packageCount,
    itemCount: packageCount,
  });

  const generated = await generateValidatedJson({
    textProvider: getStrategyProvider(),
    system: PRODUCTION_STRATEGY_SYSTEM,
    prompt,
    validator: contentStrategyPlanSchema,
    expectedShape,
    repairGuardrailFailures: true,
    timeoutMs: PRODUCTION_STRATEGY_CLAUDE_TIMEOUT_MS,
    maxTransportAttempts: PRODUCTION_STRATEGY_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
    maxTokens: readContentStrategyPlannerMaxTokens(),
    retryPromptAppend: ({ issues }) =>
      buildProductionStrategyRetryAppend(
        issues,
        packageCount,
        ctx.eligibleTrends,
        ctx.evergreenTopics,
      ),
    guardrails: (value) => [
      ...checkContentStrategyPlanGuardrails(value),
      ...checkContentPlanLength(value, packageCount),
      ...checkContentPlanFunnelDiversity(value, packageCount),
      ...checkContentPlanSources(value, {
        trendScores: ctx.trendScores,
        allowProductBrainTopics: ctx.allowProductBrainTopics,
      }),
    ],
    telemetry: {
      stepName: "Weekly Strategy",
      inputSummary: summaries.input_summary,
      outputSummary: (result) => {
        if (!result.ok) return "failed";
        const plan = result.value as {
          content_plan?: unknown[];
          theme?: string;
        };
        return strategyPlanSummaries({
          packageCount,
          itemCount: Array.isArray(plan.content_plan)
            ? plan.content_plan.length
            : 0,
        }).output_summary;
      },
    },
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
    };
  }

  const plan = generated.value;

  const persisted = await withTelemetry(
    {
      stepName: "Strategy Items",
      provider: "deterministic",
      inputSummary:
        "Strategy Items input:\n- Weekly Strategy plan\n- Funnel distribution",
      outputSummary: (p) =>
        `${p.itemIds.length} strategy item(s) persisted`,
      measureOutput: (p) => ({
        strategyId: p.strategyId,
        itemIds: p.itemIds,
      }),
    },
    () =>
      persistProductionStrategyPlan({
        supabase,
        projectId,
        productionRunId,
        goalType,
        plan,
        eligibleTrendIds: ctx.eligibleTrendIds,
        evergreenIds: ctx.evergreenIds,
        platform,
        format: coerceFormat(format, "post") as ContentFormat,
        generationTelemetry: buildGenerationTelemetryDocument({
          legacy: {
            production_run_id: productionRunId,
            phases: [],
          },
          steps: getTelemetryCollector()?.snapshot() ?? [],
        }),
      }),
  );

  if (persisted.itemIds.length !== packageCount) {
    throw new WorkflowError(
      "invalid_input",
      `expected ${packageCount} strategy items, persisted ${persisted.itemIds.length}`,
    );
  }

  // Best-effort: refresh steps to include Strategy Items persist duration.
  try {
    const finalSteps = getTelemetryCollector()?.snapshot() ?? [];
    await supabase
      .from("content_strategies")
      .update({
        strategy_brief: {
          source: "production_run",
          production_run_id: productionRunId,
          theme: plan.theme,
          funnel_distribution: plan.funnel_distribution,
          generation_telemetry: buildGenerationTelemetryDocument({
            legacy: {
              production_run_id: productionRunId,
              phases: [],
            },
            steps: finalSteps,
          }),
        } as unknown as Record<string, unknown>,
      })
      .eq("id", persisted.strategyId)
      .eq("project_id", projectId);
  } catch {
    // non-critical
  }

  return {
    ok: true,
    data: {
      strategyId: persisted.strategyId,
      itemIds: persisted.itemIds,
    },
  };
}
