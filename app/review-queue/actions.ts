"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  setContentItemStatus,
  updateContentItemFields,
} from "@/lib/api/review-queue";
import { runGenerateLanguageVariants } from "@/lib/ai/workflows/generateLanguageVariants";
import { runRegenerateLanguageVariant } from "@/lib/ai/workflows/regenerateLanguageVariant";
import { AUTOMATION_WORKFLOWS, sendN8nWebhook } from "@/lib/n8n/client";
import type { LanguageCode } from "@/lib/supabase/types";

const REVIEW_QUEUE_PATH = "/review-queue";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
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
    revalidatePath(REVIEW_QUEUE_PATH);
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
    revalidatePath(REVIEW_QUEUE_PATH);
    return { ok: true };
  } catch {
    return fail("Zamítnutí se nezdařilo.");
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
    revalidatePath(REVIEW_QUEUE_PATH);
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
    revalidatePath(REVIEW_QUEUE_PATH);
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
    revalidatePath(REVIEW_QUEUE_PATH);
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
    revalidatePath(REVIEW_QUEUE_PATH);
    return { ok: true };
  } catch {
    return fail("Regenerace jazykové varianty se nezdařila.");
  }
}
