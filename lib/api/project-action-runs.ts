import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AutomationWorkflow } from "@/lib/n8n/client";
import { AUTOMATION_WORKFLOWS } from "@/lib/n8n/client";

export type ProjectActionStep =
  | "trend_scan"
  | "weekly_strategy"
  | "generate_packages"
  | "publishing_planner";

export type ProjectActionRunStatus =
  | "queued"
  | "running"
  | "success"
  | "failed";

export interface ProjectActionRunRow {
  id: string;
  project_id: string;
  week_start: string;
  step: ProjectActionStep;
  status: ProjectActionRunStatus;
  started_at: string;
  finished_at: string | null;
  message: string | null;
  error: string | null;
  n8n_execution_id: string | null;
  created_at: string;
}

export interface ProjectActionRunView {
  id: string;
  projectId: string;
  weekStart: string;
  step: ProjectActionStep;
  status: ProjectActionRunStatus;
  startedAt: string;
  finishedAt: string | null;
  message: string | null;
  error: string | null;
  n8nExecutionId: string | null;
}

export const ACTION_STEP_LABEL: Record<ProjectActionStep, string> = {
  trend_scan: "Trend Scan",
  weekly_strategy: "Weekly Strategy",
  generate_packages: "Generate Packages",
  publishing_planner: "Publishing Planner",
};

export const ACTION_RUN_STATUS_LABEL: Record<
  ProjectActionRunStatus,
  "Running" | "Success" | "Failed" | "Waiting"
> = {
  queued: "Running",
  running: "Running",
  success: "Success",
  failed: "Failed",
};

export function stepForAutomationWorkflow(
  workflow: AutomationWorkflow,
): ProjectActionStep | null {
  switch (workflow) {
    case AUTOMATION_WORKFLOWS.trendScan:
      return "trend_scan";
    case AUTOMATION_WORKFLOWS.weeklyStrategy:
      return "weekly_strategy";
    case AUTOMATION_WORKFLOWS.generateContentPackage:
      return "generate_packages";
    case AUTOMATION_WORKFLOWS.publishingPlanner:
      return "publishing_planner";
    default:
      return null;
  }
}

function toView(row: ProjectActionRunRow): ProjectActionRunView {
  return {
    id: row.id,
    projectId: row.project_id,
    weekStart: row.week_start,
    step: row.step,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    message: row.message,
    error: row.error,
    n8nExecutionId: row.n8n_execution_id,
  };
}

export async function createProjectActionRun(input: {
  projectId: string;
  weekStart: string;
  step: ProjectActionStep;
}): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("project_action_runs")
    .insert({
      project_id: input.projectId,
      week_start: input.weekStart,
      step: input.step,
      status: "running",
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function failProjectActionRun(
  runId: string,
  error: string,
  message?: string | null,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error: updateErr } = await supabase
    .from("project_action_runs")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error,
      message: message ?? null,
    })
    .eq("id", runId);
  if (updateErr) throw updateErr;
}

export async function completeProjectActionRun(input: {
  runId: string;
  status: "success" | "failed";
  message?: string | null;
  error?: string | null;
  n8nExecutionId?: string | null;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("project_action_runs")
    .update({
      status: input.status,
      finished_at: new Date().toISOString(),
      message: input.message ?? null,
      error: input.error ?? null,
      ...(input.n8nExecutionId
        ? { n8n_execution_id: input.n8nExecutionId }
        : {}),
    })
    .eq("id", input.runId);
  if (error) throw error;
}

export async function getLatestProjectActionRun(
  projectId: string,
  weekStart: string,
): Promise<ProjectActionRunView | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("project_action_runs")
    .select("*")
    .eq("project_id", projectId)
    .eq("week_start", weekStart)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toView(data as ProjectActionRunRow);
}

export function actionRunStatusMessage(run: ProjectActionRunView): string {
  const step = ACTION_STEP_LABEL[run.step];
  if (run.status === "failed") {
    const detail = run.error ?? run.message ?? "Unknown error";
    return `${step} failed: ${detail}`;
  }
  if (run.status === "success") {
    return run.message ?? `${step} completed.`;
  }
  switch (run.step) {
    case "trend_scan":
      return "Scanning trends…";
    case "weekly_strategy":
      return "Generating weekly strategy…";
    case "generate_packages":
      return "Generating packages…";
    case "publishing_planner":
      return "Building publishing plan…";
    default:
      return `${step} is running…`;
  }
}

export function isActionRunActive(run: ProjectActionRunView | null): boolean {
  return run !== null && (run.status === "queued" || run.status === "running");
}

/** Best-effort completion when inline API routes finish (action_run_id forwarded from n8n). */
export async function tryCompleteActionRunFromInlineApi(
  actionRunId: string | null | undefined,
  outcome: { ok: boolean; message?: string; error?: string },
): Promise<void> {
  if (!actionRunId) return;
  try {
    await completeProjectActionRun({
      runId: actionRunId,
      status: outcome.ok ? "success" : "failed",
      message: outcome.ok ? outcome.message ?? null : null,
      error: outcome.ok ? null : (outcome.error ?? "Workflow failed"),
    });
  } catch (err) {
    console.error("[project_action_runs] inline complete failed:", err);
  }
}
