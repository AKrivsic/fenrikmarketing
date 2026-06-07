"use server";

import { revalidatePath } from "next/cache";
import {
  setContentItemStatus,
  updateContentItemFields,
} from "@/lib/api/review-queue";
import { AUTOMATION_WORKFLOWS, sendN8nWebhook } from "@/lib/n8n/client";

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
