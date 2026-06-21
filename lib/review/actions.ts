"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import {
  setContentItemPublished,
  setContentItemPublishedFromReview,
  setContentItemStatus,
  updateContentItemFields,
} from "@/lib/api/review-queue";
import { runGenerateLanguageVariantsForItem } from "@/lib/ai/workflows/generateLanguageVariants";
import {
  enqueuePackageTranslations,
  triggerTranslationProcessor,
} from "@/lib/ai/workflows/translationJobs";
import { runRegenerateLanguageVariant } from "@/lib/ai/workflows/regenerateLanguageVariant";
import { runRetryVideoJob } from "@/lib/ai/workflows/retryVideoJob";
import { WorkflowError } from "@/lib/ai/workflows/shared";
import { AUTOMATION_WORKFLOWS, sendN8nWebhook } from "@/lib/n8n/client";
import type { LanguageCode } from "@/lib/supabase/types";

// Shared review/approval Server Actions. These power BOTH the global
// /review-queue and the per-project /projects/[id]/review surfaces, so every
// action revalidates both paths off the projectId it already receives. No DB
// schema, workflow or AI changes — pure relocation + dual revalidation of the
// actions that previously lived in app/review-queue/actions.ts.

const REVIEW_QUEUE_PATH = "/review-queue";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

// Revalidates the surfaces affected by a mutation: the global queue, the owning
// project's review tab, and its Approved tab. The Approved tab is included
// because approvals move items onto it and "Generate language variants" (exposed
// there after Review UX Consolidation V1) changes both the primary's eligibility
// and the variant rows shown.
function revalidateReview(projectId: string): void {
  revalidatePath(REVIEW_QUEUE_PATH);
  revalidatePath(`/projects/${projectId}/review`);
  revalidatePath(`/projects/${projectId}/approved`);
  revalidatePath(`/projects/${projectId}/published`);
}

// Splits a free-text hashtag input into a normalized string[]. Hashtags are
// stored WITHOUT a leading "#"; separators are whitespace and/or commas.
function parseHashtags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#+/, "").trim())
    .filter((tag) => tag.length > 0);
}

export async function approveItem(
  itemId: string,
  projectId: string,
): Promise<ActionResult> {
  if (!itemId || !projectId) return fail("Chybí identifikátor položky.");
  try {
    await setContentItemStatus(itemId, projectId, "approved");
    revalidateReview(projectId);
    return { ok: true };
  } catch {
    return fail("Schválení se nezdařilo.");
  }
}

export async function rejectItem(
  itemId: string,
  projectId: string,
): Promise<ActionResult> {
  if (!itemId || !projectId) return fail("Chybí identifikátor položky.");
  try {
    await setContentItemStatus(itemId, projectId, "rejected");
    revalidateReview(projectId);
    return { ok: true };
  } catch {
    return fail("Zamítnutí se nezdařilo.");
  }
}

// Manual publish: marks ONE approved item as published after the user has
// copied its publish-ready text/video into Metricool by hand. Only the
// approved → published transition is allowed (enforced in the DB write); other
// statuses fail with a clear message. Affects only this item — never the whole
// package or sibling language variants.
export async function markContentItemPublished(
  itemId: string,
  projectId: string,
): Promise<ActionResult> {
  if (!itemId || !projectId) return fail("Chybí identifikátor položky.");
  try {
    const ok = await setContentItemPublished(itemId, projectId);
    if (!ok) {
      return fail("Publikovat lze pouze schválenou (approved) položku.");
    }
    revalidateReview(projectId);
    return { ok: true };
  } catch {
    return fail("Označení jako publikováno se nezdařilo.");
  }
}

// Solo-founder shortcut: marks ONE draft / in_review item as published in a
// single click (draft/in_review → published), skipping the explicit approve
// step. Used after a manual Metricool copy/paste. Only the draft → published and
// in_review → published transitions are allowed (enforced in the DB write);
// other statuses fail with a clear message. Affects only this item — never the
// whole package or sibling language variants.
export async function approveAndPublishContentItem(
  itemId: string,
  projectId: string,
): Promise<ActionResult> {
  if (!itemId || !projectId) return fail("Chybí identifikátor položky.");
  try {
    const ok = await setContentItemPublishedFromReview(itemId, projectId);
    if (!ok) {
      return fail("Approve & Publish lze jen z draftu nebo in review.");
    }
    revalidateReview(projectId);
    return { ok: true };
  } catch {
    return fail("Approve & Publish se nezdařilo.");
  }
}

export interface EditItemInput {
  itemId: string;
  projectId: string;
  caption: string;
  hashtags: string;
  cta: string;
}

export async function editItem(input: EditItemInput): Promise<ActionResult> {
  const { itemId, projectId } = input;
  if (!itemId || !projectId) return fail("Chybí identifikátor položky.");

  const caption = input.caption.trim();
  const cta = input.cta.trim();

  try {
    await updateContentItemFields(itemId, projectId, {
      caption: caption.length > 0 ? caption : null,
      hashtags: parseHashtags(input.hashtags),
      cta: cta.length > 0 ? cta : null,
    });
    revalidateReview(projectId);
    return { ok: true };
  } catch {
    return fail("Uložení změn se nezdařilo.");
  }
}

// Triggers the existing regenerate_content_package n8n workflow. Mirrors
// /api/automation/regenerate-content-package WITHOUT changing any DB status
// (approval_status / package_status have no "regenerate_requested" value).
export async function regeneratePackage(
  packageId: string | null,
  projectId: string,
): Promise<ActionResult> {
  if (!projectId) return fail("Chybí identifikátor projektu.");
  if (!packageId) return fail("Položka nemá balíček k regeneraci.");

  try {
    await sendN8nWebhook({
      workflow: AUTOMATION_WORKFLOWS.regenerateContentPackage,
      projectId,
      payload: { content_package_id: packageId },
    });
    revalidateReview(projectId);
    return { ok: true };
  } catch {
    return fail("Spuštění regenerace se nezdařilo.");
  }
}

// Derives the worker video callback URL from the incoming request headers so
// the worker reports back to the existing /api/n8n/video-callback handler.
// Returns undefined when the host is unknown (inline start is then skipped).
async function resolveVideoCallbackUrl(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}/api/n8n/video-callback` : undefined;
}

// Derives the deployment origin (scheme + host) from the incoming request so a
// server action can kick the same-deployment background processor endpoint.
async function resolveRequestOrigin(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : undefined;
}

// Generates language variants for an APPROVED primary package. ASYNC: this only
// enqueues one pending translation unit per (approved video primary, missing
// target language) and kicks the background processor, then returns in
// milliseconds. The actual Claude localization + variant video dispatch run in
// the /api/ai/process-translation-jobs worker (one unit at a time) so the click
// can never hit the 300s Vercel function limit. Never touches the primary
// package or its primary content_items; dedupe is preserved by the queue's
// unique (source item, language) index + the item-level workflow.
export async function generateLanguageVariants(
  packageId: string | null,
  projectId: string,
): Promise<ActionResult> {
  if (!projectId) return fail("Chybí identifikátor projektu.");
  if (!packageId) return fail("Položka nemá balíček pro jazykové varianty.");

  try {
    await enqueuePackageTranslations({ projectId, packageId });
    // Kick the worker after the response is sent (the endpoint replies 202 and
    // does the work in its own invocation). A missed kick is recovered on the
    // next click via the queue's stale sweep, so this is best-effort.
    const origin = await resolveRequestOrigin();
    if (origin) {
      after(() => triggerTranslationProcessor(origin));
    }
    revalidateReview(projectId);
    return { ok: true };
  } catch {
    return fail("Spuštění generování jazykových variant se nezdařilo.");
  }
}

// Generates language variants for a SINGLE approved primary content item. Used
// by the Approved tab so an approved item (e.g. TikTok) can be localized into
// all target languages independently of sibling items' statuses (a draft X item
// never blocks it). Video platforms also queue one variant video job per
// language (reusing the package render_spec); text-only platforms create only
// localized content_items. Never touches the primary item or its package.
export async function generateLanguageVariantsForItem(
  sourceContentItemId: string | null,
  projectId: string,
): Promise<ActionResult> {
  if (!projectId) return fail("Chybí identifikátor projektu.");
  if (!sourceContentItemId) return fail("Chybí identifikátor položky.");

  try {
    const videoCallbackUrl = await resolveVideoCallbackUrl();
    await runGenerateLanguageVariantsForItem(
      { projectId, sourceContentItemId },
      { videoCallbackUrl },
    );
    revalidateReview(projectId);
    return { ok: true };
  } catch {
    return fail("Spuštění generování jazykových variant se nezdařilo.");
  }
}

// Retries ONLY a failed video render/upload for one language. Creates and
// dispatches a fresh video job for the SAME content item, reusing the failed
// job's stored render input + scene stills (no text / content / image
// regeneration). Idempotent: when a queued/processing render already exists for
// the language no duplicate is created. The previous failed job is kept as
// history; the new (newer) job becomes the one the UI shows.
export async function retryVideoRender(
  videoJobId: string | null,
  projectId: string,
): Promise<ActionResult> {
  if (!projectId) return fail("Chybí identifikátor projektu.");
  if (!videoJobId) return fail("Chybí identifikátor video jobu.");

  try {
    const videoCallbackUrl = await resolveVideoCallbackUrl();
    await runRetryVideoJob({ projectId, videoJobId }, { videoCallbackUrl });
    revalidateReview(projectId);
    return { ok: true };
  } catch (err) {
    if (err instanceof WorkflowError) {
      if (err.code === "invalid_input" && err.message.includes("only 'failed'")) {
        return fail("Retry lze spustit jen u jobu ve stavu Selhalo.");
      }
      if (err.code === "not_found") {
        return fail("Video job nebyl nalezen.");
      }
    }
    return fail("Opětovné spuštění renderu videa se nezdařilo.");
  }
}

// Regenerates a SINGLE language variant. Re-localizes the approved primary
// content and overwrites ONLY the target-language variant items (back to
// draft) plus queues a fresh variant video job. Never calls the package-level
// regenerate, so the primary package and other languages are untouched.
export async function regenerateLanguageVariant(
  packageId: string | null,
  projectId: string,
  targetLanguage: LanguageCode | null,
): Promise<ActionResult> {
  if (!projectId) return fail("Chybí identifikátor projektu.");
  if (!packageId) return fail("Položka nemá balíček k regeneraci.");
  if (!targetLanguage) return fail("Varianta nemá cílový jazyk.");

  try {
    const videoCallbackUrl = await resolveVideoCallbackUrl();
    await runRegenerateLanguageVariant(
      { projectId, packageId, targetLanguage },
      { videoCallbackUrl },
    );
    revalidateReview(projectId);
    return { ok: true };
  } catch {
    return fail("Regenerace jazykové varianty se nezdařila.");
  }
}
