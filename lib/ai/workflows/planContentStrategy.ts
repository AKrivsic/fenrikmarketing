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
  evaluateStrategyPlanOriginality,
  formatOriginalityRetryAppend,
  originalityIssuesToValidation,
  STRATEGY_ORIGINALITY_EXHAUSTED,
} from "@/lib/content-memory/strategyOriginality";
import {
  buildCreativeMemory,
  computeCreativeFingerprint,
  evaluateStrategyCandidateOriginality,
  shouldGenerateWithCreativeCoreV2,
  STRATEGY_ORIGINALITY_EXHAUSTED_V2,
} from "@/lib/content-creative-core-v2";
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
    creativeMemory: ctx.creativeMemory,
    primaryPlatform: platform,
  });

  const expectedShape = buildProductionStrategyExpectedShape(
    packageCount,
    ctx.eligibleTrends,
    ctx.evergreenTopics,
  );

  const strategyStepName = "Content Strategy";

  const summaries = strategyPlanSummaries({
    packageCount,
    itemCount: packageCount,
    title: strategyStepName,
  });

  async function generatePlan(promptText: string) {
    return generateValidatedJson({
      textProvider: getStrategyProvider(),
      system: PRODUCTION_STRATEGY_SYSTEM,
      prompt: promptText,
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
        stepName: strategyStepName,
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
            title: strategyStepName,
          }).output_summary;
        },
      },
    });
  }

  let generated = await generatePlan(prompt);
  let originalityAudit: {
    repair_used: boolean;
    rejected_reasons: ReturnType<typeof evaluateStrategyPlanOriginality>["issues"];
  } = { repair_used: false, rejected_reasons: [] };

  const useV2 = shouldGenerateWithCreativeCoreV2();
  let v2Memory: ReturnType<typeof buildCreativeMemory> | null = null;
  if (useV2) {
    const { data: pkgRows } = await supabase
      .from("content_packages")
      .select("id, status, package_brief, title, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(60);
    v2Memory = buildCreativeMemory(
      (pkgRows ?? []).map((row) => ({
        packageId: row.id as string,
        brief:
          row.package_brief &&
          typeof row.package_brief === "object" &&
          !Array.isArray(row.package_brief)
            ? (row.package_brief as Record<string, unknown>)
            : {},
        title: typeof row.title === "string" ? row.title : null,
        createdAt: typeof row.created_at === "string" ? row.created_at : null,
        packageStatus: typeof row.status === "string" ? row.status : null,
      })),
    );
  }

  function checkPlanOriginality(
    items: Array<{
      topic: string;
      angle?: string;
      pain_point?: string;
    }>,
  ): { ok: boolean; issues: Array<{ path: string; message: string }>; raw: unknown[] } {
    if (useV2 && v2Memory) {
      const projectPains = Array.isArray(ctx.project.pain_points)
        ? ctx.project.pain_points.map(String)
        : typeof ctx.project.pain_points === "string"
          ? [ctx.project.pain_points]
          : [];
      const issues: Array<{ path: string; message: string }> = [];
      const raw: unknown[] = [];
      items.forEach((item, index) => {
        const candidate = {
          topic: item.topic,
          angle: item.angle ?? "",
          pain_point: item.pain_point ?? "",
          creative_fingerprint: computeCreativeFingerprint({
            topic: item.topic,
            angle: item.angle,
            pain_point: item.pain_point,
          }),
        };
        const result = evaluateStrategyCandidateOriginality({
          candidate,
          memory: v2Memory!,
          projectPains,
          packageCount,
        });
        if (!result.ok) {
          raw.push(...result.issues);
          for (const issue of result.issues) {
            issues.push({
              path: `$.content_plan[${index}].topic`,
              message: `${issue.reason}: ${issue.detail}`,
            });
          }
        }
      });
      return { ok: issues.length === 0, issues, raw };
    }
    const legacy = evaluateStrategyPlanOriginality({
      items: items as Parameters<typeof evaluateStrategyPlanOriginality>[0]["items"],
      memory: ctx.creativeMemory,
      project: ctx.project,
      packageCount,
    });
    return {
      ok: legacy.ok,
      issues: originalityIssuesToValidation(legacy.issues),
      raw: legacy.issues,
    };
  }

  if (generated.ok) {
    const firstCheck = checkPlanOriginality(generated.value.content_plan);
    if (!firstCheck.ok) {
      originalityAudit = {
        repair_used: true,
        rejected_reasons: firstCheck.raw as ReturnType<
          typeof evaluateStrategyPlanOriginality
        >["issues"],
      };
      const retryAppend = useV2
        ? [
            "",
            "RETRY — previous strategy repeated protected creative memory (v2).",
            "This is the ONLY repair attempt.",
            ...firstCheck.issues.map((i) => `- ${i.message}`),
          ].join("\n")
        : formatOriginalityRetryAppend(
            firstCheck.raw as ReturnType<
              typeof evaluateStrategyPlanOriginality
            >["issues"],
          );
      generated = await generatePlan(`${prompt}\n${retryAppend}`);
      if (generated.ok) {
        const secondCheck = checkPlanOriginality(generated.value.content_plan);
        if (!secondCheck.ok) {
          return {
            ok: false,
            error: "generation_failed",
            validationErrors: [
              {
                path: "$.content_plan",
                message: useV2
                  ? STRATEGY_ORIGINALITY_EXHAUSTED_V2
                  : STRATEGY_ORIGINALITY_EXHAUSTED,
              },
              ...secondCheck.issues,
            ],
            attempts: generated.attempts,
          };
        }
      }
    }
  }

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
        "Strategy Items input:\n- Content Strategy plan\n- Funnel distribution\n- Tone / diversity balance",
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
          originality_audit: originalityAudit,
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
