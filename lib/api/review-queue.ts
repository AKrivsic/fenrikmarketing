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
