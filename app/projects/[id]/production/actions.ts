"use server";

import { revalidatePath } from "next/cache";
import { getProjectForAdmin } from "@/lib/api/projects-admin";
import {
  AUTOMATION_WORKFLOWS,
  N8nConfigError,
  N8nRequestError,
  sendN8nWebhook,
} from "@/lib/n8n/client";
import {
  computeProductionPlan,
  normalizeProductionConfig,
  planHasOutputs,
} from "@/lib/projects/productionRun";
import {
  createProductionRun,
  getActiveProductionRun,
  reconcileProductionRun,
  seedProductionStrategyInputs,
  setProductionRunStatus,
  type ProductionRunView,
} from "@/lib/api/production-run-admin";

// Server actions for the one-button Content Production tab.
//
// startProductionRun creates the run + items, seeds the minimal strategy inputs
// the existing generator needs, then triggers the EXISTING n8n
// generate_content_package workflow (the real async pipeline). It changes no AI
// provider, video worker, n8n internals or storage. getProductionRunStatus
// reconciles real generated content back onto the run for live progress.

export type StartProductionResult =
  | { ok: true; runId: string }
  | { ok: false; error: string };

function basePath(projectId: string): string {
  return `/projects/${projectId}/production`;
}

// Maps an n8n trigger failure to a Czech operator message (mirrors the Actions
// tab's classification). The run is still recorded — as failed.
function triggerErrorMessage(err: unknown): string {
  if (err instanceof N8nConfigError) {
    return "n8n není nakonfigurováno (chybí N8N_BASE_URL / N8N_WEBHOOK_SECRET).";
  }
  if (err instanceof N8nRequestError) {
    if (err.status === undefined) {
      return "Síťová chyba: n8n nelze kontaktovat.";
    }
    if (err.status === 404) {
      return "n8n workflow generate-content-package není aktivní (404).";
    }
    if (err.status === 401 || err.status === 403) {
      return "n8n odmítl požadavek (neplatný secret – 401/403).";
    }
    return `n8n vrátil chybu (status ${err.status}).`;
  }
  return "Neočekávaná chyba při spuštění generování.";
}

export async function startProductionRun(
  projectId: string,
  rawConfig: unknown,
): Promise<StartProductionResult> {
  if (!projectId) {
    return { ok: false, error: "Chybí identifikátor projektu." };
  }

  const project = await getProjectForAdmin(projectId);
  if (!project) {
    return { ok: false, error: "Projekt nenalezen." };
  }

  const config = normalizeProductionConfig(rawConfig);
  const plan = computeProductionPlan(config);
  if (!planHasOutputs(plan)) {
    return {
      ok: false,
      error: "Nastavte počet packages > 0 a vyberte alespoň jednu platformu.",
    };
  }

  // One active run at a time so progress stays unambiguous.
  const active = await getActiveProductionRun(projectId);
  if (active) {
    return {
      ok: false,
      error: "Běh už probíhá. Počkejte na jeho dokončení.",
    };
  }

  const { runId } = await createProductionRun(projectId, config);

  try {
    // Give the existing strategy-item-driven generator something to consume.
    await seedProductionStrategyInputs({
      projectId,
      projectName: project.name,
      goalType: project.goal_type,
      plan,
      config,
      runId,
    });

    // Real trigger of the existing async pipeline. package_count is the single
    // primary quantity (1 package = 1 video); n8n generates that many packages.
    await sendN8nWebhook({
      workflow: AUTOMATION_WORKFLOWS.generateContentPackage,
      projectId,
      payload: {
        production_run_id: runId,
        package_count: plan.packageCount,
      },
    });

    await setProductionRunStatus(runId, "running");
  } catch (err) {
    await setProductionRunStatus(runId, "failed", triggerErrorMessage(err));
  }

  revalidatePath(basePath(projectId));
  // The run exists either way; the status panel reflects running vs failed.
  return { ok: true, runId };
}

// Poll target: reconcile real generated content onto the run and return the
// refreshed progress view.
export async function getProductionRunStatus(
  runId: string,
): Promise<ProductionRunView | null> {
  if (!runId) return null;
  return reconcileProductionRun(runId);
}
