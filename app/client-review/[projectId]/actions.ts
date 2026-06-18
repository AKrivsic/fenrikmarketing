"use server";

import { revalidatePath } from "next/cache";
import {
  addClientProjectComment,
  updateClientProjectStatus,
} from "@/lib/api/client-delivery-admin";

export type ReviewActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function approveProjectAction(projectId: string): Promise<ReviewActionResult> {
  if (!projectId) return { ok: false, error: "Missing project." };
  await updateClientProjectStatus(projectId, "approved");
  revalidatePath(`/client-review/${projectId}`);
  return { ok: true };
}

export async function requestChangesAction(projectId: string): Promise<ReviewActionResult> {
  if (!projectId) return { ok: false, error: "Missing project." };
  await updateClientProjectStatus(projectId, "revision_requested");
  revalidatePath(`/client-review/${projectId}`);
  return { ok: true };
}

export async function addItemCommentAction(formData: FormData): Promise<ReviewActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  if (!projectId || !itemId || !comment) {
    return { ok: false, error: "Comment is required." };
  }
  await addClientProjectComment({
    itemId,
    authorType: "client",
    comment,
  });
  revalidatePath(`/client-review/${projectId}`);
  return { ok: true };
}
