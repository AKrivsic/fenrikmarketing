import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ApprovalStatus } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Content-item review mutations (admin client, server-only).
//
// These back the shared review/approval Server Actions (lib/review/actions.ts),
// which now run from the per-project review tab. RLS is bypassed, so every write
// is manually scoped by both id AND project_id to prevent touching a content
// item outside its project.
//
// The cross-project review LISTING used to live here too; /review-queue is now a
// read-only exceptions dashboard (lib/api/review-exceptions-admin.ts), so that
// listing was removed.
// ---------------------------------------------------------------------------

// Fields the review actions are allowed to edit. Nothing else on the row changes.
export interface EditableContentItemFields {
  caption: string | null;
  hashtags: string[];
  cta: string | null;
}

export async function setContentItemStatus(
  itemId: string,
  projectId: string,
  status: ApprovalStatus,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("content_items")
    .update({ status })
    .eq("id", itemId)
    .eq("project_id", projectId);

  if (error) throw error;
}

// Manual publish transition (Metricool copy/paste flow). Atomically moves a
// SINGLE content item from `approved` to `published`. The status guard in the
// WHERE clause makes the transition idempotent and prevents publishing an item
// that is not approved (draft / in_review / rejected / already published). Only
// content_items.status changes — no schedule, no log, no package mutation.
// Returns true when a row matched (transition applied), false otherwise.
export async function setContentItemPublished(
  itemId: string,
  projectId: string,
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_items")
    .update({ status: "published" })
    .eq("id", itemId)
    .eq("project_id", projectId)
    .eq("status", "approved")
    .select("id");

  if (error) throw error;
  return (data ?? []).length > 0;
}

// Solo-founder shortcut: directly publishes a SINGLE content item straight from
// `draft` / `in_review` to `published`, skipping the explicit approve step. Used
// after a manual Metricool copy/paste when the user wants to mark the post done
// immediately. The status guard in the WHERE clause makes it idempotent and
// prevents publishing an item that is already approved / published / rejected
// (use the normal approved → published path for approved items). Only
// content_items.status changes — no schedule, no log, no package mutation.
// Returns true when a row matched (transition applied), false otherwise.
export async function setContentItemPublishedFromReview(
  itemId: string,
  projectId: string,
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_items")
    .update({ status: "published" })
    .eq("id", itemId)
    .eq("project_id", projectId)
    .in("status", ["draft", "in_review"])
    .select("id");

  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function updateContentItemFields(
  itemId: string,
  projectId: string,
  fields: EditableContentItemFields,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("content_items")
    .update({
      caption: fields.caption,
      hashtags: fields.hashtags,
      cta: fields.cta,
    })
    .eq("id", itemId)
    .eq("project_id", projectId);

  if (error) throw error;
}
