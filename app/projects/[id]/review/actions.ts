"use server";

import { getProjectForAdmin } from "@/lib/api/projects-admin";
import { loadProductionRunTelemetry } from "@/lib/api/run-telemetry-admin";
import type { RunTelemetryView } from "@/lib/production-runs/aggregateRunTelemetry";

export type LoadRunTelemetryResult =
  | { ok: true; data: RunTelemetryView }
  | { ok: false; error: string };

/**
 * Lazy-load pipeline telemetry for one production run on the review page.
 */
export async function loadRunTelemetryAction(
  projectId: string,
  productionRunId: string,
): Promise<LoadRunTelemetryResult> {
  if (!projectId || !productionRunId) {
    return { ok: false, error: "Chybí identifikátor projektu nebo běhu." };
  }

  const project = await getProjectForAdmin(projectId);
  if (!project) {
    return { ok: false, error: "Projekt nenalezen." };
  }

  try {
    const data = await loadProductionRunTelemetry({
      projectId,
      productionRunId,
    });
    if (!data) {
      return { ok: false, error: "Production run nenalezen." };
    }
    return { ok: true, data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Telemetry se nepodařilo načíst.";
    return { ok: false, error: message };
  }
}
