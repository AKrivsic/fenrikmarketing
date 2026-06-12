"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  setContentItemPublished,
  setContentItemStatus,
  updateContentItemFields,
} from "@/lib/api/review-queue";
import {
  runGenerateLanguageVariants,
  runGenerateLanguageVariantsForItem,
} from "@/lib/ai/workflows/generateLanguageVariants";
import { runRegenerateLanguageVariant } from "@/lib/ai/workflows/regenerateLanguageVariant";
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

// Generates language variants for an APPROVED primary package. Calls the same
// backend workflow as POST /api/ai/generate-language-variants. Never touches
// the primary package or its primary content_items.
export async function generateLanguageVariants(
  packageId: string | null,
  projectId: string,
): Promise<ActionResult> {
  if (!projectId) return fail("Chybí identifikátor projektu.");
  if (!packageId) return fail("Položka nemá balíček pro jazykové varianty.");

  try {
    const videoCallbackUrl = await resolveVideoCallbackUrl();
    await runGenerateLanguageVariants(
      { projectId, packageId },
      { videoCallbackUrl },
    );
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
