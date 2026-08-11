"use server";

import { revalidatePath } from "next/cache";
import { getProjectForAdmin } from "@/lib/api/projects-admin";
import {
  approveCreativeReviewPackage,
  confirmCreativeReviewTranslation,
  loadCreativeReviewPage,
  saveCreativeReviewPackage,
  translateCreativeReviewPackage,
  unapproveCreativeReviewPackage,
  type CreativeReviewPageData,
  type CreativeReviewPackageView,
  type CreativeReviewWriteCode,
} from "@/lib/api/creative-review-admin";
import type { CreativeReviewPackageEdits } from "@/lib/creative-review/applyEdits";
import { resolveCreativeReviewEditorActor } from "@/lib/creative-review/actor";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import {
  continueCreativeReviewGeneration,
  type ContinueGenerationResult,
} from "@/lib/ai/workflows/continueCreativeReviewGeneration";
import { headers } from "next/headers";

export type LoadCreativeReviewActionResult =
  | { ok: true; data: CreativeReviewPageData }
  | {
      ok: false;
      error: string;
      code?:
        | "not_found"
        | "forbidden_mode"
        | "invalid_input"
        | "invalid_review";
    };

export type MutateCreativeReviewActionResult =
  | { ok: true; package: CreativeReviewPackageView }
  | {
      ok: false;
      error: string;
      code?: CreativeReviewWriteCode;
      issues?: ValidationIssue[];
      currentVersion?: number;
    };

/** @deprecated Prefer MutateCreativeReviewActionResult */
export type SaveCreativeReviewActionResult = MutateCreativeReviewActionResult;

function creativeReviewPath(projectId: string, runId: string): string {
  return `/projects/${projectId}/creative-review/${runId}`;
}

async function requireProjectEditor(
  projectId: string,
): Promise<
  | { ok: true }
  | { ok: false; result: MutateCreativeReviewActionResult }
> {
  if (!projectId) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "Chybí identifikátor projektu.",
        code: "invalid_input",
      },
    };
  }
  const project = await getProjectForAdmin(projectId);
  if (!project) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "Projekt nenalezen nebo nemáte oprávnění.",
        code: "not_found",
      },
    };
  }
  return { ok: true };
}

function revalidateCreativeReview(projectId: string, runId: string): void {
  revalidatePath(creativeReviewPath(projectId, runId));
  revalidatePath(`/projects/${projectId}/production`);
}

/** Load Manual Review Creative Review workspace for one production run. */
export async function loadCreativeReviewAction(
  projectId: string,
  runId: string,
): Promise<LoadCreativeReviewActionResult> {
  if (!projectId || !runId) {
    return { ok: false, error: "Chybí identifikátor projektu nebo běhu.", code: "invalid_input" };
  }

  const project = await getProjectForAdmin(projectId);
  if (!project) {
    return {
      ok: false,
      error: "Projekt nenalezen nebo nemáte oprávnění.",
      code: "not_found",
    };
  }

  try {
    const result = await loadCreativeReviewPage({
      projectId,
      runId,
      projectName: project.name,
    });
    if (!result.ok) {
      return { ok: false, error: result.error, code: result.code };
    }
    return { ok: true, data: result.data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Creative Review se nepodařilo načíst.";
    return { ok: false, error: message };
  }
}

/** Save allowed Creative Review edits for one package (creative_review only). */
export async function saveCreativeReviewPackageAction(
  projectId: string,
  runId: string,
  packageId: string,
  expectedVersion: number,
  edits: CreativeReviewPackageEdits,
): Promise<MutateCreativeReviewActionResult> {
  if (!projectId || !runId || !packageId) {
    return {
      ok: false,
      error: "Chybí identifikátor projektu, běhu nebo balíčku.",
      code: "invalid_input",
    };
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return {
      ok: false,
      error: "Neplatná verze balíčku.",
      code: "invalid_input",
    };
  }

  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;

  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await saveCreativeReviewPackage({
      projectId,
      runId,
      packageId,
      expectedVersion,
      edits,
      actor,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        code: result.code,
        issues: result.issues,
        currentVersion: result.currentVersion,
      };
    }
    revalidateCreativeReview(projectId, runId);
    return { ok: true, package: result.package };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Uložení Creative Review selhalo.";
    return { ok: false, error: message };
  }
}

/** Explicit Translate: localized_edit → english_preview (persisted). */
export async function translateCreativeReviewPackageAction(
  projectId: string,
  runId: string,
  packageId: string,
  expectedVersion: number,
): Promise<MutateCreativeReviewActionResult> {
  if (!projectId || !runId || !packageId) {
    return {
      ok: false,
      error: "Chybí identifikátor projektu, běhu nebo balíčku.",
      code: "invalid_input",
    };
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return {
      ok: false,
      error: "Neplatná verze balíčku.",
      code: "invalid_input",
    };
  }

  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;

  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await translateCreativeReviewPackage({
      projectId,
      runId,
      packageId,
      expectedVersion,
      actor,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        code: result.code,
        issues: result.issues,
        currentVersion: result.currentVersion,
      };
    }
    revalidateCreativeReview(projectId, runId);
    return { ok: true, package: result.package };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Překlad Creative Review selhal.";
    return { ok: false, error: message };
  }
}

/** Confirm Translation Result: english_confirmed + final_approved. */
export async function confirmCreativeReviewTranslationAction(
  projectId: string,
  runId: string,
  packageId: string,
  expectedVersion: number,
): Promise<MutateCreativeReviewActionResult> {
  if (!projectId || !runId || !packageId) {
    return {
      ok: false,
      error: "Chybí identifikátor projektu, běhu nebo balíčku.",
      code: "invalid_input",
    };
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return {
      ok: false,
      error: "Neplatná verze balíčku.",
      code: "invalid_input",
    };
  }

  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;

  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await confirmCreativeReviewTranslation({
      projectId,
      runId,
      packageId,
      expectedVersion,
      actor,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        code: result.code,
        issues: result.issues,
        currentVersion: result.currentVersion,
      };
    }
    revalidateCreativeReview(projectId, runId);
    return { ok: true, package: result.package };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Potvrzení překladu Creative Review selhalo.";
    return { ok: false, error: message };
  }
}

/** Approve package when server-side approval rules pass. */
export async function approveCreativeReviewPackageAction(
  projectId: string,
  runId: string,
  packageId: string,
  expectedVersion: number,
): Promise<MutateCreativeReviewActionResult> {
  if (!projectId || !runId || !packageId) {
    return {
      ok: false,
      error: "Chybí identifikátor projektu, běhu nebo balíčku.",
      code: "invalid_input",
    };
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return {
      ok: false,
      error: "Neplatná verze balíčku.",
      code: "invalid_input",
    };
  }

  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;

  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await approveCreativeReviewPackage({
      projectId,
      runId,
      packageId,
      expectedVersion,
      actor,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        code: result.code,
        issues: result.issues,
        currentVersion: result.currentVersion,
      };
    }
    revalidateCreativeReview(projectId, runId);
    return { ok: true, package: result.package };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Schválení Creative Review selhalo.";
    return { ok: false, error: message };
  }
}

/** Unapprove a previously approved package. */
export async function unapproveCreativeReviewPackageAction(
  projectId: string,
  runId: string,
  packageId: string,
  expectedVersion: number,
): Promise<MutateCreativeReviewActionResult> {
  if (!projectId || !runId || !packageId) {
    return {
      ok: false,
      error: "Chybí identifikátor projektu, běhu nebo balíčku.",
      code: "invalid_input",
    };
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return {
      ok: false,
      error: "Neplatná verze balíčku.",
      code: "invalid_input",
    };
  }

  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;

  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await unapproveCreativeReviewPackage({
      projectId,
      runId,
      packageId,
      expectedVersion,
      actor,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: result.error,
        code: result.code,
        issues: result.issues,
        currentVersion: result.currentVersion,
      };
    }
    revalidateCreativeReview(projectId, runId);
    return { ok: true, package: result.package };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Zrušení schválení Creative Review selhalo.";
    return { ok: false, error: message };
  }
}

async function resolveVideoCallbackUrl(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}/api/n8n/video-callback` : undefined;
}

export type ContinueCreativeReviewActionResult = ContinueGenerationResult;

/**
 * Continue Generation — leave waiting_for_creative_review and create/dispatch
 * video jobs using the existing production pipeline.
 */
export async function continueCreativeReviewGenerationAction(
  projectId: string,
  runId: string,
): Promise<ContinueCreativeReviewActionResult> {
  if (!projectId || !runId) {
    return {
      ok: false,
      code: "invalid_input",
      error: "Chybí identifikátor projektu nebo běhu.",
    };
  }

  const access = await requireProjectEditor(projectId);
  if (!access.ok) {
    return {
      ok: false,
      code: "not_found",
      error:
        access.result.ok === false
          ? access.result.error
          : "Projekt nenalezen nebo nemáte oprávnění.",
    };
  }

  try {
    const actor = await resolveCreativeReviewEditorActor();
    const videoCallbackUrl = await resolveVideoCallbackUrl();
    const result = await continueCreativeReviewGeneration({
      projectId,
      runId,
      actor,
      deps: { videoCallbackUrl },
    });
    if (result.ok) {
      revalidateCreativeReview(projectId, runId);
      revalidatePath(`/projects/${projectId}/videos`);
      revalidatePath(`/projects/${projectId}/review`);
    }
    return result;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Continue Generation selhalo.";
    return { ok: false, code: "job_creation_failed", error: message };
  }
}
