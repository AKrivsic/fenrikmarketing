import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ApprovalStatus,
  Json,
  PlatformType,
  PublishingSchedule,
} from "@/lib/supabase/types";

export interface ScheduleContentItemOptions {
  platform?: PlatformType;
  status?: ApprovalStatus;
  publishingMetadata?: Json;
}

export async function listPublishingSchedule(
  projectId: string,
): Promise<PublishingSchedule[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("publishing_schedule")
    .select("*")
    .eq("project_id", projectId)
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PublishingSchedule[];
}

// scheduledAt accepts a Date or an ISO timestamp string.
export async function scheduleContentItem(
  projectId: string,
  contentItemId: string,
  scheduledAt: string | Date,
  options: ScheduleContentItemOptions = {},
): Promise<PublishingSchedule> {
  const supabase = await createSupabaseServerClient();

  // Always verify the content item belongs to this project before scheduling,
  // even when the platform is supplied explicitly. This both rejects
  // cross-project references and lets us default the platform from the item.
  const { data: item, error: itemError } = await supabase
    .from("content_items")
    .select("platform")
    .eq("project_id", projectId)
    .eq("id", contentItemId)
    .maybeSingle();

  if (itemError) throw itemError;
  if (!item) {
    throw new Error(
      `content_items ${contentItemId} does not belong to project ${projectId} (cross-project reference rejected)`,
    );
  }

  const platform =
    options.platform ?? (item as { platform: PlatformType }).platform;

  const scheduledAtIso =
    scheduledAt instanceof Date ? scheduledAt.toISOString() : scheduledAt;

  const { data, error } = await supabase
    .from("publishing_schedule")
    .insert({
      project_id: projectId,
      content_item_id: contentItemId,
      platform,
      scheduled_at: scheduledAtIso,
      status: options.status ?? "scheduled",
      publishing_metadata: options.publishingMetadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as PublishingSchedule;
}
