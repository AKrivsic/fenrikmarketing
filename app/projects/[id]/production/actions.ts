"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getProjectForAdmin } from "@/lib/api/projects-admin";
import {
  AUTOMATION_WORKFLOWS,
  N8nConfigError,
  N8nRequestError,
  sendN8nWebhook,
} from "@/lib/n8n/client";
import { parseContentControls } from "@/lib/projects/contentControls";
import {
  computeProductionPlan,
  normalizeProductionConfig,
  planHasOutputs,
} from "@/lib/projects/productionRun";
import {
  cancelProductionRun,
  createProductionRun,
  getActiveProductionRun,
  reconcileProductionRun,
  seedProductionStrategyInputs,
  setProductionRunStatus,
  type ProductionRunView,
} from "@/lib/api/production-run-admin";
import { planContentStrategy } from "@/lib/ai/workflows/planContentStrategy";
import {
  isPersistableProductionPlatform,
  primaryPlatformForPlan,
  type ProductionPlan,
} from "@/lib/projects/productionRun";
import {
  readProductionPlannerMax,
  readProductionStrategyPlannerMode,
} from "@/lib/production/strategyPlannerConfig";
import {
  getFiverrPromoVideoJobStatus,
  runFiverrPromoPackageGeneration,
  formatFiverrPromoError,
  type FiverrPromoGenerationResult,
} from "@/lib/internal/fiverrPromoPackage";

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

export type StopProductionResult =
  | { ok: true }
  | { ok: false; error: string };

export type GenerateFiverrPromoResult =
  | { ok: true; data: FiverrPromoGenerationResult }
  | { ok: false; error: string };

function basePath(projectId: string): string {
  return `/projects/${projectId}/production`;
}

// Maps an n8n trigger failure to a Czech operator message (mirrors the Actions
// tab's classification). The run is still recorded — as failed.
function plannerErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) {
    return `Plánování strategie selhalo: ${err.message}`;
  }
  return "Plánování strategie selhalo.";
}

function strategyPlannerFailureMessage(result: {
  error?: string;
  validationErrors?: { path: string; message: string }[];
}): string {
  const detail = result.validationErrors?.[0]?.message;
  if (detail) {
    return `AI plán obsahu neprošel validací: ${detail}`;
  }
  return "AI plán obsahu se nepodařilo vygenerovat.";
}

async function prepareProductionStrategyInputs(args: {
  projectId: string;
  projectName: string;
  goalType: string;
  plan: ReturnType<typeof computeProductionPlan>;
  config: ReturnType<typeof normalizeProductionConfig>;
  runId: string;
}): Promise<void> {
  const mode = readProductionStrategyPlannerMode();
  if (mode === "legacy") {
    await seedProductionStrategyInputs(args);
    return;
  }

  const { plan, config, runId, projectId, goalType } = args;
  const primary = primaryPlatformForPlan(plan);
  const persistable =
    (primary && isPersistableProductionPlatform(primary) ? primary : null) ??
    config.platforms.find(isPersistableProductionPlatform);
  if (!persistable) {
    throw new Error("Chybí persistovatelná platforma pro plán.");
  }

  const isVideo = plan.activeVideoPlatforms.includes(
    persistable as ProductionPlan["activeVideoPlatforms"][number],
  );
  const format = isVideo ? "reel" : "post";

  const result = await planContentStrategy({
    mode: "production_run",
    projectId,
    productionRunId: runId,
    packageCount: plan.packageCount,
    platform: persistable,
    format,
    goalType,
  });

  if (!result.ok) {
    throw new Error(strategyPlannerFailureMessage(result));
  }
  if (result.data.itemIds.length !== plan.packageCount) {
    throw new Error(
      `Očekáváno ${plan.packageCount} položek strategie, vytvořeno ${result.data.itemIds.length}.`,
    );
  }
}

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

  let config = normalizeProductionConfig(rawConfig);
  const controls = parseContentControls(project.publishing_rules);
  if (!config.platformContentTypes) {
    config = {
      ...config,
      platformContentTypes: { ...controls.platformContentTypes },
    };
  }
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

  const plannerMax = readProductionPlannerMax();
  if (
    readProductionStrategyPlannerMode() === "ai" &&
    plan.packageCount > plannerMax
  ) {
    return {
      ok: false,
      error: `AI plánovač podporuje nejvýše ${plannerMax} packages na běh.`,
    };
  }

  const { runId } = await createProductionRun(projectId, config);

  try {
    await prepareProductionStrategyInputs({
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
    const message =
      readProductionStrategyPlannerMode() === "ai" &&
      !(err instanceof N8nConfigError) &&
      !(err instanceof N8nRequestError)
        ? plannerErrorMessage(err)
        : triggerErrorMessage(err);
    await setProductionRunStatus(runId, "failed", message);
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

export async function stopProductionRun(
  projectId: string,
  runId: string,
): Promise<StopProductionResult> {
  if (!projectId || !runId) {
    return { ok: false, error: "Chybí identifikátor projektu nebo běhu." };
  }

  const project = await getProjectForAdmin(projectId);
  if (!project) {
    return { ok: false, error: "Projekt nenalezen." };
  }

  try {
    await cancelProductionRun(runId, projectId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Běh se nepodařilo zastavit.";
    return { ok: false, error: message };
  }

  revalidatePath(basePath(projectId));
  return { ok: true };
}

async function resolveVideoCallbackUrl(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}/api/n8n/video-callback` : undefined;
}

function revalidateFiverrPromoPaths(projectId: string): void {
  revalidatePath(basePath(projectId));
  revalidatePath(`/projects/${projectId}/content-packages`);
  revalidatePath(`/projects/${projectId}/review`);
  revalidatePath(`/projects/${projectId}/videos`);
}

/** Internal admin: one Fiverr gig promo content package (new strategy item each click). */
export async function generateFiverrPromoPackage(
  projectId: string,
): Promise<GenerateFiverrPromoResult> {
  if (!projectId) {
    return { ok: false, error: "Chybí identifikátor projektu." };
  }

  const project = await getProjectForAdmin(projectId);
  if (!project) {
    return { ok: false, error: "Projekt nenalezen." };
  }

  const active = await getActiveProductionRun(projectId);
  if (active) {
    return {
      ok: false,
      error: "Production běh probíhá. Počkejte na dokončení nebo ho zastavte.",
    };
  }

  try {
    const callbackUrl = await resolveVideoCallbackUrl();
    const data = await runFiverrPromoPackageGeneration({
      projectId,
      projectName: project.name,
      goalType: project.goal_type,
      videoCallbackUrl: callbackUrl,
      dispatchVideo: true,
    });
    revalidateFiverrPromoPaths(projectId);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: formatFiverrPromoError(err) };
  }
}

export async function pollFiverrPromoVideoJob(
  projectId: string,
  videoJobId: string,
): Promise<{ status: string; mp4Url: string | null } | null> {
  return getFiverrPromoVideoJobStatus(projectId, videoJobId);
}
