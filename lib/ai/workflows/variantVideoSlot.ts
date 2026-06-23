import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json, LanguageCode } from "@/lib/supabase/types";

export interface InsertVariantVideoJobArgs {
  projectId: string;
  packageId: string;
  language: LanguageCode;
  contentItemId: string;
  input: Json;
}

// Inserts a queued variant video job only when no queued/processing/completed job
// exists for the same project + package + language (see migration 021 RPC).
export async function insertVariantVideoJobIfSlotAvailable(
  supabase: SupabaseClient,
  args: InsertVariantVideoJobArgs,
): Promise<string | null> {
  const { data, error } = await supabase.rpc(
    "insert_variant_video_job_if_slot_available",
    {
      p_project_id: args.projectId,
      p_package_id: args.packageId,
      p_language: args.language,
      p_content_item_id: args.contentItemId,
      p_input: args.input,
    },
  );
  if (error) throw error;
  return typeof data === "string" ? data : null;
}
