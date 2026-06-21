import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CallbackValidationError,
  unauthorizedResponse,
  validationErrorResponse,
  verifyN8nSecret,
} from "@/lib/n8n/callback";
import { handlePublishingPlanCallback } from "@/lib/n8n/handlers";
import { WorkflowError } from "@/lib/ai/workflows/shared";
import {
  assertWeeklyStrategyForWeek,
  MissingWeeklyStrategyError,
  missingWeeklyStrategyResponse,
} from "@/lib/ai/workflows/weeklyStrategyGate";
import { errorResponse, optionalString, readJsonBody, requireString } from "@/lib/ai/apiResponse";
import { tryCompleteActionRunFromInlineApi } from "@/lib/api/project-action-runs";
import {
  parseContentControls,
  type ContentControls,
} from "@/lib/projects/contentControls";
import type { Json } from "@/lib/supabase/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// n8n-invoked execution endpoint for the Publishing Planner workflow.
//
// There is no pre-existing planner workflow to delegate to, so this endpoint
// performs only the minimal, schema-driven slot mapping (read publishing_rules
// + content_strategies + content_strategy_items + content_packages, compute
// publish times) and then PERSISTS by reusing the existing
// handlePublishingPlanCallback — which writes ONLY to publishing_schedule and
// already resolves content_item_id by package + platform. No persist logic is
// duplicated, no new tables, no scheduler, no AI.
//
// Multi-project: project_id comes from the payload, publishing_rules come from
// the project row. Nothing is hardcoded.
export async function POST(request: Request): Promise<Response> {
  if (!verifyN8nSecret(request)) {
    return unauthorizedResponse();
  }

  let actionRunId: string | undefined;
  try {
    const body = await readJsonBody(request);
    const projectId = requireString(body, "project_id");
    const weekStart = requireString(body, "week_start");
    actionRunId = optionalString(body, "action_run_id");
    if (!ISO_DATE.test(weekStart)) {
      throw new WorkflowError("invalid_input", "week_start must be YYYY-MM-DD");
    }

    const supabase = createSupabaseAdminClient();

    await assertWeeklyStrategyForWeek(supabase, projectId, weekStart);

    // Project + publishing_rules (also validates existence).
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, publishing_rules")
      .eq("id", projectId)
      .maybeSingle();
    if (projErr) throw projErr;
    if (!project) {
      throw new WorkflowError("not_found", `project ${projectId} not found`);
    }

    const items = await buildPlanItems(supabase, {
      projectId,
      weekStart,
      controls: parseContentControls(
        (project.publishing_rules as Json | null) ?? null,
      ),
    });

    // Reuse the existing persistence (writes only to publishing_schedule).
    await handlePublishingPlanCallback({
      project_id: projectId,
      week_start: weekStart,
      items,
    });

    await tryCompleteActionRunFromInlineApi(actionRunId, {
      ok: true,
      message: `Publishing plan created (${items.length} slots).`,
    });

    return Response.json(
      {
        ok: true,
        workflow: "publishing_planner",
        status: "queued",
        planned_items: items.length,
      },
      { status: 202 },
    );
  } catch (err) {
    await tryCompleteActionRunFromInlineApi(actionRunId, {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
    if (err instanceof MissingWeeklyStrategyError) {
      return missingWeeklyStrategyResponse();
    }
    if (err instanceof CallbackValidationError) {
      return validationErrorResponse(err.message);
    }
    return errorResponse(err);
  }
}

interface PlanItem {
  content_package_id: string;
  platform: string;
  publish_at: string;
}

// Builds the publishing plan for the week from existing rows. Each schedulable
// content_package is mapped to its strategy item's platform and a publish time
// derived from the strategy item's planned day (brief.day) constrained to the
// project's publishing weekdays + publishing time (Content Controls).
async function buildPlanItems(
  supabase: SupabaseClient,
  args: {
    projectId: string;
    weekStart: string;
    controls: ContentControls;
  },
): Promise<PlanItem[]> {
  const { projectId, weekStart, controls } = args;

  // 1. Strategies that start this week.
  const { data: strategies, error: stratErr } = await supabase
    .from("content_strategies")
    .select("id")
    .eq("project_id", projectId)
    .eq("period_start", weekStart);
  if (stratErr) throw stratErr;
  const strategyIds = (strategies ?? []).map((r) => r.id as string);
  if (strategyIds.length === 0) return [];

  // 2. Strategy items -> platform + planned day hint.
  const { data: stratItems, error: itemErr } = await supabase
    .from("content_strategy_items")
    .select("id, platform, brief")
    .eq("project_id", projectId)
    .in("strategy_id", strategyIds);
  if (itemErr) throw itemErr;
  const itemMeta = new Map<string, { platform: string; day: number | null }>();
  for (const it of stratItems ?? []) {
    itemMeta.set(it.id as string, {
      platform: it.platform as string,
      day: readDay(it.brief),
    });
  }
  const itemIds = [...itemMeta.keys()];
  if (itemIds.length === 0) return [];

  // 3. Content packages produced for those strategy items.
  const { data: packages, error: pkgErr } = await supabase
    .from("content_packages")
    .select("id, strategy_item_id")
    .eq("project_id", projectId)
    .in("strategy_item_id", itemIds);
  if (pkgErr) throw pkgErr;

  const { hour, minute } = parseTime(controls.publishingTime);
  // Constrain to the project's selected publishing weekdays (0=Mon..6=Sun).
  const weekdays =
    controls.publishingWeekdays.length > 0
      ? [...controls.publishingWeekdays].sort((a, b) => a - b)
      : [0, 1, 2, 3, 4];

  const plan: PlanItem[] = [];
  let index = 0;
  for (const pkg of packages ?? []) {
    const meta = itemMeta.get(pkg.strategy_item_id as string);
    if (!meta) continue;
    // Use the planned day when it is an allowed weekday; otherwise distribute
    // across the allowed weekdays in order.
    const dayOffset =
      meta.day !== null && weekdays.includes(meta.day)
        ? meta.day
        : weekdays[index % weekdays.length];
    plan.push({
      content_package_id: pkg.id as string,
      platform: meta.platform,
      publish_at: computePublishAt(weekStart, dayOffset, hour, minute),
    });
    index += 1;
  }
  return plan;
}

// Optional planned day hint stored by the weekly strategy in brief.day.
function readDay(brief: unknown): number | null {
  if (brief && typeof brief === "object" && !Array.isArray(brief)) {
    const value = (brief as Record<string, unknown>)["day"];
    if (typeof value === "number" && Number.isFinite(value)) {
      const n = Math.trunc(value);
      if (n >= 0 && n <= 6) return n;
      if (n >= 1 && n <= 7) return n - 1;
    }
  }
  return null;
}

// Parses an "HH:mm" publishing time into hour/minute, defaulting to 09:00.
function parseTime(time: string): { hour: number; minute: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return { hour: 9, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function computePublishAt(
  weekStart: string,
  dayOffset: number,
  hour: number,
  minute: number,
): string {
  const date = new Date(`${weekStart}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}
