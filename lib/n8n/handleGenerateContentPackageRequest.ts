import { runGenerateContentPackage } from "@/lib/ai/workflows/generateContentPackage";
import { optionalGenerationModeFromBody } from "@/lib/ai/generationMode";
import {
  assertGenerateContentPackagePreconditions,
  isProductionRunCancelledForStrategyItem,
  MissingWeeklyStrategyError,
  missingWeeklyStrategyResponse,
} from "@/lib/ai/workflows/weeklyStrategyGate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { unauthorizedResponse, verifyN8nSecret } from "@/lib/n8n/callback";
import {
  errorResponse,
  optionalString,
  readJsonBody,
  requireString,
  workflowResponse,
} from "@/lib/ai/apiResponse";
import {
  SettlementFailedError,
  settleProductionRunItemOrThrow,
} from "@/lib/api/settleProductionRunItem";
import {
  classifyGenerationThrow,
  type GenerationTerminalFailure,
} from "@/lib/ai/workflows/generationTerminal";
import { WorkflowError } from "@/lib/ai/workflows/shared";

// Shared n8n execution shell for Generate Content Package.
//
// Extracted from app/api/n8n/generate-content-package/route.ts so the same
// auth / preconditions / settlement / response mapping can later run on a
// non-Vercel Node process. Business logic stays in runGenerateContentPackage.
//
// Flow: /api/automation/generate-content-package -> n8n (selects strategy item)
//   -> POST (Vercel route or future worker) -> this handler
//   -> AI generation + persist (content_packages = draft, ...)
//   -> n8n confirms via POST /api/n8n/content-package-callback.
export async function handleGenerateContentPackageRequest(
  request: Request,
): Promise<Response> {
  if (!verifyN8nSecret(request)) {
    return unauthorizedResponse();
  }

  let projectId: string | null = null;
  let strategyItemId: string | null = null;
  let generationBegan = false;

  try {
    const body = await readJsonBody(request);
    const supabase = createSupabaseAdminClient();
    projectId = requireString(body, "project_id");
    strategyItemId = requireString(body, "strategy_item_id");
    const weekStart = optionalString(body, "week_start");

    await assertGenerateContentPackagePreconditions(supabase, {
      projectId,
      strategyItemId,
      weekStart,
    });

    if (
      await isProductionRunCancelledForStrategyItem(
        supabase,
        projectId,
        strategyItemId,
      )
    ) {
      return Response.json({
        success: true,
        skipped: true,
        reason: "production_run_cancelled",
      });
    }

    generationBegan = true;

    const result = await runGenerateContentPackage(
      {
        projectId,
        strategyItemId,
        generationMode: optionalGenerationModeFromBody(body),
      },
      supabase,
    );

    // Sprint 4C.1 / 5.3 / 5.3.1 — settle on terminal failure; never swallow.
    if (!result.ok) {
      await settleOrRespondOperational({
        projectId,
        strategyItemId,
        failure: result,
      });
    }

    return workflowResponse(result);
  } catch (err) {
    if (err instanceof MissingWeeklyStrategyError) {
      return missingWeeklyStrategyResponse();
    }
    if (err instanceof SettlementFailedError && projectId && strategyItemId) {
      return workflowResponse(settlementFailureResponse(err));
    }
    // Sprint 5.3 — once generation began, never return 500 with a live item
    // without attempting settlement first.
    if (generationBegan && projectId && strategyItemId) {
      const failure = classifyGenerationThrow(err);
      try {
        await settleProductionRunItemOrThrow({
          projectId,
          strategyItemId,
          diagnostics: {
            error: failure.error,
            validation_errors: failure.validationErrors,
            attempts: failure.attempts,
          },
        });
        return workflowResponse(failure);
      } catch (settleErr) {
        if (settleErr instanceof SettlementFailedError) {
          return workflowResponse(
            settlementFailureResponse(settleErr, failure),
          );
        }
        return workflowResponse(
          settlementFailureResponse(
            new SettlementFailedError(
              settleErr instanceof Error
                ? settleErr.message
                : String(settleErr),
              settleErr,
            ),
            failure,
          ),
        );
      }
    }
    if (err instanceof WorkflowError) {
      return errorResponse(err);
    }
    return errorResponse(err);
  }
}

async function settleOrRespondOperational(args: {
  projectId: string;
  strategyItemId: string;
  failure: GenerationTerminalFailure | {
    ok: false;
    error: string;
    validationErrors: Array<{ path?: string; message: string }>;
    attempts: number;
  };
}): Promise<void> {
  try {
    await settleProductionRunItemOrThrow({
      projectId: args.projectId,
      strategyItemId: args.strategyItemId,
      diagnostics: {
        error: args.failure.error,
        validation_errors: args.failure.validationErrors,
        attempts: args.failure.attempts,
      },
    });
  } catch (err) {
    if (err instanceof SettlementFailedError) throw err;
    throw new SettlementFailedError(
      err instanceof Error ? err.message : String(err),
      err,
    );
  }
}

function settlementFailureResponse(
  err: SettlementFailedError,
  prior?: GenerationTerminalFailure | {
    ok: false;
    error: string;
    validationErrors: Array<{ path?: string; message: string }>;
    attempts: number;
  },
): GenerationTerminalFailure {
  const priorIssues = (prior?.validationErrors ?? []).map((issue) => ({
    path: issue.path ?? "$",
    message: issue.message,
  }));
  return {
    ok: false,
    error: "operational_failure",
    attempts: prior?.attempts ?? 1,
    validationErrors: [
      ...priorIssues,
      {
        path: "settlement",
        message: err.message,
      },
    ],
  };
}
