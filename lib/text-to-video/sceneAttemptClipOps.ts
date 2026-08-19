import type { SupabaseClient } from "@supabase/supabase-js";

export async function markTextToVideoClipValidationFailed(
  supabase: SupabaseClient,
  attemptId: string,
  reason: string,
): Promise<void> {
  await supabase
    .from("scene_video_generation_attempts")
    .update({
      status: "failed",
      failure_code: "needs_review",
      error_message: reason.slice(0, 1000),
      completed_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("generation_mode", "text_to_video")
    .eq("status", "succeeded");
}

export async function downloadSceneVideoAttemptClip(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error("clip_download_failed");
  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}
