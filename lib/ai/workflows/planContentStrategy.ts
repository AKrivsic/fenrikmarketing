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

  const supabase = input.client ?? createSupabaseAdminClient();

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

  const persisted = await persistProductionStrategyPlan({
    supabase,
    projectId,
    productionRunId,
    goalType,
    plan,
    eligibleTrendIds: ctx.eligibleTrendIds,
    evergreenIds: ctx.evergreenIds,
    platform,
    format: coerceFormat(format, "post") as ContentFormat,
  });

  if (persisted.itemIds.length !== packageCount) {
    throw new WorkflowError(
      "invalid_input",
      `expected ${packageCount} strategy items, persisted ${persisted.itemIds.length}`,
    );
  }

  return {
    ok: true,
    data: {
      strategyId: persisted.strategyId,
      itemIds: persisted.itemIds,
    },
  };
}
