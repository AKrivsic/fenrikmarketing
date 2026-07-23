import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

function itemLocalizationTelemetry(generationMetadata: unknown): unknown {
  const meta = asRecord(generationMetadata);
  return meta?.generation_telemetry ?? null;
}

function failureGenerationTelemetry(failureTelemetry: unknown): unknown {
  const ft = asRecord(failureTelemetry);
  return ft?.generation_telemetry ?? null;
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
 * Includes primary packages, language variants, all video jobs (retries),
 * and failed-attempt telemetry. Cost is summed from stored estimated_cost.
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

  const [strategiesRes, itemsRes, runItemsRes] = await Promise.all([
    supabase
      .from("content_strategies")
      .select("id, strategy_brief")
      .eq("project_id", projectId)
      .eq("strategy_brief->>production_run_id", productionRunId),
    // Primary + language variants for this run.
    supabase
      .from("content_items")
      .select("id, package_id, language, generation_metadata")
      .eq("project_id", projectId)
      .eq("generation_metadata->>production_run_id", productionRunId),
    supabase
      .from("production_run_items")
      .select("id, strategy_item_id, content_package_id, failure_telemetry")
      .eq("production_run_id", productionRunId)
      .eq("project_id", projectId),
  ]);
  if (strategiesRes.error) throw strategiesRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (runItemsRes.error) throw runItemsRes.error;

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
    language: string | null;
    generation_metadata: unknown;
  }>;

  const primaryItems = items.filter((i) => i.language == null);
  const variantItems = items.filter((i) => i.language != null);

  const packageIds = Array.from(
    new Set(
      primaryItems
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

  const localizationDocs = variantItems
    .map((row) => ({
      contentItemId: row.id,
      packageId: row.package_id,
      generationTelemetry: itemLocalizationTelemetry(row.generation_metadata),
    }))
    .filter((d) => d.generationTelemetry != null);

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
      .order("created_at", { ascending: true });
    if (jobErr) throw jobErr;

    const packageByItem = new Map(
      items.map((i) => [i.id, i.package_id] as const),
    );
    // Include ALL jobs (retries) so historical spend stays cost-visible.
    videoJobDocs = ((jobRows ?? []) as VideoJob[])
      .filter((job): job is VideoJob & { content_item_id: string } =>
        typeof job.content_item_id === "string",
      )
      .map((job) => ({
        videoJobId: job.id,
        packageId: packageByItem.get(job.content_item_id) ?? null,
        generationTelemetry: videoJobGenerationTelemetry(job.output),
      }));
  }

  const failureDocs = (
    (runItemsRes.data ?? []) as Array<{
      id: string;
      strategy_item_id: string | null;
      content_package_id: string | null;
      failure_telemetry: unknown;
    }>
  )
    .map((row) => ({
      packageId: row.content_package_id,
      strategyId: row.strategy_item_id,
      generationTelemetry: failureGenerationTelemetry(row.failure_telemetry),
    }))
    .filter((d) => d.generationTelemetry != null);

  // Also pull dedicated failure table rows (covers cases without item jsonb).
  const { data: failureRows } = await supabase
    .from("production_run_item_failure_telemetry")
    .select("strategy_item_id, generation_telemetry, estimated_cost_usd")
    .eq("production_run_id", productionRunId)
    .eq("project_id", projectId);
  for (const row of (failureRows ?? []) as Array<{
    strategy_item_id: string | null;
    generation_telemetry: unknown;
  }>) {
    if (!row.generation_telemetry) continue;
    // Avoid double-counting when the same steps were already copied onto the item.
    const already = failureDocs.some(
      (d) =>
        d.strategyId === row.strategy_item_id &&
        JSON.stringify(d.generationTelemetry) ===
          JSON.stringify(row.generation_telemetry),
    );
    if (already) continue;
    failureDocs.push({
      packageId: null,
      strategyId: row.strategy_item_id,
      generationTelemetry: row.generation_telemetry,
    });
  }

  return mergeRunTelemetrySteps({
    productionRunId,
    totalRunDurationMs: runWallDurationMs(run),
    strategyDocs,
    packageDocs,
    videoJobDocs,
    localizationDocs,
    failureDocs,
  });
}
