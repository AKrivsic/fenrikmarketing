import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { newestByContentItem } from "@/lib/api/content-shared";
import {
  mergeRunTelemetrySteps,
  type RunTelemetryView,
} from "@/lib/production-runs/aggregateRunTelemetry";
import type { ProductionRun, VideoJob } from "@/lib/supabase/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function packageGenerationTelemetry(packageBrief: unknown): unknown {
  const brief = asRecord(packageBrief);
  const pg = asRecord(brief?.presentation_generation);
  return pg?.generation_telemetry ?? null;
}

function strategyGenerationTelemetry(strategyBrief: unknown): unknown {
  const brief = asRecord(strategyBrief);
  return brief?.generation_telemetry ?? null;
}

function videoJobGenerationTelemetry(output: unknown): unknown {
  const out = asRecord(output);
  const debug = asRecord(out?.debug);
  return debug?.generation_telemetry ?? null;
}

function runWallDurationMs(run: ProductionRun): number | null {
  const terminal = run.status === "completed" || run.status === "failed";
  if (!terminal) return null;
  const end = new Date(run.updated_at).getTime();
  const start = new Date(run.created_at).getTime();
  if (!Number.isFinite(end) || !Number.isFinite(start)) return null;
  return Math.max(0, end - start);
}

/**
 * Lazy-load aggregated pipeline telemetry for one production run.
 * Selects only the JSON paths needed for steps[] — not full briefs/outputs.
 */
export async function loadProductionRunTelemetry(args: {
  projectId: string;
  productionRunId: string;
}): Promise<RunTelemetryView | null> {
  const { projectId, productionRunId } = args;
  if (!projectId || !productionRunId) return null;

  const supabase = createSupabaseAdminClient();

  const { data: runRow, error: runErr } = await supabase
    .from("production_runs")
    .select("*")
    .eq("id", productionRunId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (runErr) throw runErr;
  if (!runRow) return null;
  const run = runRow as ProductionRun;

  const [strategiesRes, itemsRes] = await Promise.all([
    supabase
      .from("content_strategies")
      .select("id, strategy_brief")
      .eq("project_id", projectId)
      .eq("strategy_brief->>production_run_id", productionRunId),
    supabase
      .from("content_items")
      .select("id, package_id")
      .eq("project_id", projectId)
      .eq("generation_metadata->>production_run_id", productionRunId)
      .is("language", null),
  ]);
  if (strategiesRes.error) throw strategiesRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const strategyDocs = ((strategiesRes.data ?? []) as Array<{
    id: string;
    strategy_brief: unknown;
  }>).map((row) => ({
    strategyId: row.id,
    generationTelemetry: strategyGenerationTelemetry(row.strategy_brief),
  }));

  const items = (itemsRes.data ?? []) as Array<{
    id: string;
    package_id: string | null;
  }>;
  const packageIds = Array.from(
    new Set(
      items
        .map((i) => i.package_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const itemIds = items.map((i) => i.id);

  let packageDocs: Array<{ packageId: string; generationTelemetry: unknown }> =
    [];
  if (packageIds.length > 0) {
    const { data: packages, error: pkgErr } = await supabase
      .from("content_packages")
      .select("id, package_brief")
      .eq("project_id", projectId)
      .in("id", packageIds);
    if (pkgErr) throw pkgErr;
    packageDocs = ((packages ?? []) as Array<{
      id: string;
      package_brief: unknown;
    }>).map((row) => ({
      packageId: row.id,
      generationTelemetry: packageGenerationTelemetry(row.package_brief),
    }));
  }

  let videoJobDocs: Array<{
    videoJobId: string;
    packageId: string | null;
    generationTelemetry: unknown;
  }> = [];
  if (itemIds.length > 0) {
    const { data: jobRows, error: jobErr } = await supabase
      .from("video_jobs")
      .select("id, content_item_id, output, created_at")
      .eq("project_id", projectId)
      .in("content_item_id", itemIds)
      .order("created_at", { ascending: false });
    if (jobErr) throw jobErr;

    const newest = newestByContentItem((jobRows ?? []) as VideoJob[]);
    const packageByItem = new Map(
      items.map((i) => [i.id, i.package_id] as const),
    );
    videoJobDocs = Array.from(newest.values())
      .filter((job): job is VideoJob & { content_item_id: string } =>
        typeof job.content_item_id === "string",
      )
      .map((job) => ({
        videoJobId: job.id,
        packageId: packageByItem.get(job.content_item_id) ?? null,
        generationTelemetry: videoJobGenerationTelemetry(job.output),
      }));
  }

  return mergeRunTelemetrySteps({
    productionRunId,
    totalRunDurationMs: runWallDurationMs(run),
    strategyDocs,
    packageDocs,
    videoJobDocs,
  });
}
