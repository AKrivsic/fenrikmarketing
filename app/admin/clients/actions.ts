"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createClient,
  createClientFromSampleRequest,
  createClientProject,
  importInternalContentPackage,
  setClientProjectPaid,
  updateClientProjectItem,
  updateClientProjectStatus,
  type ClientProjectStatus,
} from "@/lib/api/client-delivery-admin";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const STATUSES: ClientProjectStatus[] = [
  "draft",
  "preview_sent",
  "revision_requested",
  "approved",
  "paid",
  "delivered",
];

function isStatus(value: string): value is ClientProjectStatus {
  return (STATUSES as string[]).includes(value);
}

export async function convertSampleToClient(formData: FormData): Promise<void> {
  const sampleRequestId = String(formData.get("sampleRequestId") ?? "");
  if (!sampleRequestId) return;
  const { clientId } = await createClientFromSampleRequest(sampleRequestId);
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${clientId}`);
}

export async function createClientAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name || !email) return;
  const { id } = await createClient({
    name,
    email,
    company: String(formData.get("company") ?? "").trim(),
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${id}`);
}

export async function createProjectAction(formData: FormData): Promise<void> {
  const clientId = String(formData.get("clientId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!clientId || !title) return;
  const { id } = await createClientProject(clientId, title);
  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/client-projects/${id}`);
}

export async function updateProjectStatusAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!projectId || !isStatus(status)) {
    return { ok: false, error: "Invalid status." };
  }
  await updateClientProjectStatus(projectId, status);
  revalidatePath(`/admin/client-projects/${projectId}`);
  return { ok: true };
}

export async function markProjectPaidAction(projectId: string): Promise<ActionResult> {
  if (!projectId) return { ok: false, error: "Missing project." };
  await setClientProjectPaid(projectId, true);
  revalidatePath(`/admin/client-projects/${projectId}`);
  revalidatePath(`/client-review/${projectId}`);
  return { ok: true };
}

export async function importPackageAction(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const internalPackageId = String(formData.get("internalPackageId") ?? "").trim();
  if (!projectId || !internalPackageId) {
    return { ok: false, error: "Project and internal package ID are required." };
  }
  try {
    await importInternalContentPackage(projectId, internalPackageId);
    revalidatePath(`/admin/client-projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed.";
    return { ok: false, error: message };
  }
}

export async function saveItemAction(formData: FormData): Promise<ActionResult> {
  const itemId = String(formData.get("itemId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  if (!itemId || !projectId) return { ok: false, error: "Missing item." };

  const hashtagsRaw = String(formData.get("hashtags") ?? "");
  const hashtags = hashtagsRaw
    .split(/[\s,#]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  await updateClientProjectItem(itemId, {
    title: String(formData.get("title") ?? ""),
    tikTokCaption: String(formData.get("tikTokCaption") ?? ""),
    instagramCaption: String(formData.get("instagramCaption") ?? ""),
    facebookPost: String(formData.get("facebookPost") ?? ""),
    linkedinPost: String(formData.get("linkedinPost") ?? ""),
    hashtags,
    clientNote: String(formData.get("clientNote") ?? "") || null,
    internalNote: String(formData.get("internalNote") ?? "") || null,
    videoUrl: String(formData.get("videoUrl") ?? "") || null,
  });
  revalidatePath(`/admin/client-projects/${projectId}`);
  revalidatePath(`/client-review/${projectId}`);
  return { ok: true };
}
