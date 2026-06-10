"use server";

import { revalidatePath } from "next/cache";
import { deleteProjectForAdmin } from "@/lib/api/projects-admin";

export type DeleteProjectResult =
  | { ok: true }
  | { ok: false; error: string };

// Deletes a project and refreshes the projects list. The DB cascade removes all
// related rows; storage objects are out of scope for the MVP admin.
export async function deleteProjectAction(
  projectId: string,
): Promise<DeleteProjectResult> {
  const id = projectId.trim();
  if (id.length === 0) {
    return { ok: false, error: "Chybí ID projektu." };
  }

  try {
    await deleteProjectForAdmin(id);
  } catch (err) {
    console.error("[deleteProjectAction] delete failed:", err);
    return { ok: false, error: "Smazání projektu se nezdařilo." };
  }

  revalidatePath("/projects");
  return { ok: true };
}
