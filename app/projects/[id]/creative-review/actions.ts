"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getProjectForAdmin } from "@/lib/api/projects-admin";
import {
  approveCreativeReviewPackage,
  loadCreativeReviewPage,
  restoreCanonicalVideoPlan,
  refreshTextToVideoVideoPlan,
  regenerateCreativeReviewT2vConcept,
  rejectCreativeReviewT2vConcept,
  saveCreativeReviewPackage,
  saveCreativeReviewTextToVideoScene,
  saveCreativeReviewTextToVideoSoundPlan,
  saveCreativeReviewVoiceDirection,
  rebuildCreativeReviewTextToVideoSceneFromCzechIntent,
  unapproveCreativeReviewPackage,
  type CreativeReviewPageData,
  type CreativeReviewPackageView,
  type CreativeReviewWriteCode,
} from "@/lib/api/creative-review-admin";
import type { CreativeReviewPackageEdits } from "@/lib/creative-review/applyEdits";
import type { VoiceDirectionStyle } from "@/lib/content-package/voiceDirectionContract";
import { resolveCreativeReviewEditorActor } from "@/lib/creative-review/actor";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import {
  continueCreativeReviewGeneration,
  type ContinueGenerationResult,
} from "@/lib/ai/workflows/continueCreativeReviewGeneration";
import {
  cancelManualReview,
  type CancelManualReviewResult,
} from "@/lib/ai/workflows/cancelManualReview";
import { triggerCreativeCoreV2DeriveProcessor } from "@/lib/content-creative-core-v2/triggerDeriveProcessor";

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
        error: "Missing project id.",
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
        error: "Project not found or you do not have access.",
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
    return {
      ok: false,
      error: "Missing project or run id.",
      code: "invalid_input",
    };
  }

  const project = await getProjectForAdmin(projectId);
  if (!project) {
    return {
      ok: false,
      error: "Project not found or you do not have access.",
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
      err instanceof Error ? err.message : "Failed to load Creative Review.";
    return { ok: false, error: message };
  }
}

/**
 * Save allowed Creative Review edits for one package.
 * Automatically refreshes English Preview when Localized changes.
 */
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
      error: "Missing project, run, or package id.",
      code: "invalid_input",
    };
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return {
      ok: false,
      error: "Invalid package version.",
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
      err instanceof Error ? err.message : "Failed to save Creative Review.";
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
      error: "Missing project, run, or package id.",
      code: "invalid_input",
    };
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return {
      ok: false,
      error: "Invalid package version.",
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
    if (result.package.creativeCoreV2Active) {
      const requestHeaders = await headers();
      const host =
        requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
      const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
      const origin = host ? `${proto}://${host}` : undefined;
      if (origin) {
        after(() =>
          triggerCreativeCoreV2DeriveProcessor(origin, {
            projectId,
            packageId,
          }),
        );
      }
    }
    return { ok: true, package: result.package };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to approve Creative Review package.";
    return { ok: false, error: message };
  }
}

/**
 * Operator "Zopakovat" — only when auto derive recovery failed (error_retry).
 * Reuses the same durable claim/idempotency path as Approve kick.
 */
export async function retryCreativeCoreV2DeriveAction(
  projectId: string,
  runId: string,
  packageId: string,
): Promise<MutateCreativeReviewActionResult> {
  if (!projectId || !runId || !packageId) {
    return {
      ok: false,
      error: "Missing project, run, or package id.",
      code: "invalid_input",
    };
  }
  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;
  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const { recoverCreativeCoreV2DeriveForPackage } = await import(
      "@/lib/content-creative-core-v2/recoverDerive"
    );
    const { startVideoFromApprovedCreativeCore } = await import(
      "@/lib/content-creative-core-v2/startVideoFromApprovedCore"
    );
    const { loadCreativeReviewPage } = await import(
      "@/lib/api/creative-review-admin"
    );
    const supabase = createSupabaseAdminClient();
    const recovered = await recoverCreativeCoreV2DeriveForPackage({
      supabase,
      projectId,
      packageId,
    });
    if (!recovered.ok) {
      return {
        ok: false,
        error: recovered.error ?? "Obnova derivace selhala.",
        code: "validation_failed",
      };
    }
    await startVideoFromApprovedCreativeCore({
      supabase,
      projectId,
      packageId,
    });
    const requestHeaders = await headers();
    const host =
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
    const origin = host ? `${proto}://${host}` : undefined;
    if (origin) {
      after(() =>
        triggerCreativeCoreV2DeriveProcessor(origin, {
          projectId,
          packageId,
        }),
      );
    }
    revalidateCreativeReview(projectId, runId);
    const project = await getProjectForAdmin(projectId);
    const runView = await loadCreativeReviewPage({
      projectId,
      runId,
      projectName: project?.name ?? "Project",
    });
    if (!runView.ok) {
      return {
        ok: false,
        error: runView.error,
        code:
          runView.code === "invalid_review"
            ? "validation_failed"
            : runView.code,
      };
    }
    const pkg = runView.data.packages.find((p) => p.packageId === packageId);
    if (!pkg) {
      return { ok: false, error: "Package not found.", code: "not_found" };
    }
    return { ok: true, package: pkg };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to retry derivation.";
    return { ok: false, error: message };
  }
}

export async function regenerateCreativeReviewT2vConceptAction(
  projectId: string,
  runId: string,
  packageId: string,
  expectedVersion: number,
): Promise<MutateCreativeReviewActionResult> {
  if (!projectId || !runId || !packageId) {
    return {
      ok: false,
      error: "Missing project, run, or package id.",
      code: "invalid_input",
    };
  }
  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;
  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await regenerateCreativeReviewT2vConcept({
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
      err instanceof Error ? err.message : "Failed to regenerate concept.";
    return { ok: false, error: message };
  }
}

export async function rejectCreativeReviewT2vConceptAction(
  projectId: string,
  runId: string,
  packageId: string,
): Promise<MutateCreativeReviewActionResult> {
  if (!projectId || !runId || !packageId) {
    return {
      ok: false,
      error: "Missing project, run, or package id.",
      code: "invalid_input",
    };
  }
  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;
  try {
    const result = await rejectCreativeReviewT2vConcept({
      projectId,
      runId,
      packageId,
    });
    if (!result.ok) {
      return { ok: false, error: result.error, code: result.code };
    }
    revalidateCreativeReview(projectId, runId);
    return { ok: true, package: result.package };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reject concept.";
    return { ok: false, error: message };
  }
}

export async function restoreCanonicalVideoPlanAction(
  projectId: string,
  runId: string,
  packageId: string,
  expectedVersion: number,
): Promise<MutateCreativeReviewActionResult> {
  if (!projectId || !runId || !packageId) {
    return {
      ok: false,
      error: "Missing project, run, or package id.",
      code: "invalid_input",
    };
  }
  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;
  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await restoreCanonicalVideoPlan({
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
      err instanceof Error ? err.message : "Failed to restore canonical video plan.";
    return { ok: false, error: message };
  }
}

export async function refreshTextToVideoVideoPlanAction(
  projectId: string,
  runId: string,
  packageId: string,
  expectedVersion: number,
): Promise<MutateCreativeReviewActionResult> {
  if (!projectId || !runId || !packageId) {
    return {
      ok: false,
      error: "Missing project, run, or package id.",
      code: "invalid_input",
    };
  }
  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;
  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await refreshTextToVideoVideoPlan({
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
      err instanceof Error ? err.message : "Failed to refresh video plan.";
    return { ok: false, error: message };
  }
}

export async function rebuildCreativeReviewTextToVideoSceneFromCzechIntentAction(
  projectId: string,
  runId: string,
  packageId: string,
  sceneId: string,
  expectedVersion: number,
): Promise<MutateCreativeReviewActionResult> {
  if (!projectId || !runId || !packageId || !sceneId) {
    return {
      ok: false,
      error: "Missing project, run, package, or scene id.",
      code: "invalid_input",
    };
  }
  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;
  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await rebuildCreativeReviewTextToVideoSceneFromCzechIntent({
      projectId,
      runId,
      packageId,
      sceneId,
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
        : "Failed to rebuild the scene from the Czech intent.";
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
      error: "Missing project, run, or package id.",
      code: "invalid_input",
    };
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return {
      ok: false,
      error: "Invalid package version.",
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
        : "Failed to unapprove Creative Review package.";
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
      error: "Missing project or run id.",
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
          : "Project not found or you do not have access.",
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
      err instanceof Error ? err.message : "Continue Generation failed.";
    return { ok: false, code: "job_creation_failed", error: message };
  }
}

export type CancelManualReviewActionResult = CancelManualReviewResult;

/**
 * Cancel Manual Review — emergency stop while waiting for creative review.
 * Preserves packages and creative_review history; does not create video jobs.
 */
export async function cancelManualReviewAction(
  projectId: string,
  runId: string,
): Promise<CancelManualReviewActionResult> {
  if (!projectId || !runId) {
    return {
      ok: false,
      code: "invalid_input",
      error: "Missing project or run id.",
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
          : "Project not found or you do not have access.",
    };
  }

  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await cancelManualReview({
      projectId,
      runId,
      actor,
    });
    if (result.ok) {
      revalidateCreativeReview(projectId, runId);
    }
    return result;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Cancel Manual Review failed.";
    return { ok: false, code: "invalid_status", error: message };
  }
}

export async function saveCreativeReviewVoiceDirectionAction(
  projectId: string,
  runId: string,
  packageId: string,
  voiceDirection: {
    style: VoiceDirectionStyle;
    custom_instruction?: string;
  },
): Promise<MutateCreativeReviewActionResult> {
  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;
  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await saveCreativeReviewVoiceDirection({
      projectId,
      runId,
      packageId,
      voiceDirection,
      actor,
    });
    if (result.ok) revalidateCreativeReview(projectId, runId);
    return result;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Save voice direction failed.",
      code: "validation_failed",
    };
  }
}

export async function saveCreativeReviewTextToVideoSceneAction(
  projectId: string,
  runId: string,
  packageId: string,
  sceneId: string,
  humanVisualEdit: string,
): Promise<MutateCreativeReviewActionResult> {
  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;
  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await saveCreativeReviewTextToVideoScene({
      projectId,
      runId,
      packageId,
      sceneId,
      humanVisualEdit,
      actor,
    });
    if (result.ok) revalidateCreativeReview(projectId, runId);
    return result;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Save scene edit failed.",
      code: "validation_failed",
    };
  }
}

export async function saveCreativeReviewTextToVideoSoundPlanAction(
  projectId: string,
  runId: string,
  packageId: string,
  sceneId: string,
  sound: {
    mode: "auto" | "none" | "custom";
    custom_effect_description?: string;
    anchor?: string;
    voice_phrase?: string;
  },
  music?: {
    mode: "auto" | "none" | "existing_asset" | "eleven_generated";
    mood?: string;
  },
): Promise<MutateCreativeReviewActionResult> {
  const access = await requireProjectEditor(projectId);
  if (!access.ok) return access.result;
  try {
    const actor = await resolveCreativeReviewEditorActor();
    const result = await saveCreativeReviewTextToVideoSoundPlan({
      projectId,
      runId,
      packageId,
      sceneId,
      sound,
      music,
      actor,
    });
    if (result.ok) revalidateCreativeReview(projectId, runId);
    return result;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Save sound plan failed.",
      code: "validation_failed",
    };
  }
}
