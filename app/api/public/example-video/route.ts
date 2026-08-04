import { streamVideoFromUpstream } from "@/lib/api/client-project-media";
import { STORAGE_BUCKETS, buildVideoRenderPath } from "@/lib/api/storage";
import { resolveAllowlistedIndustryExampleVideo } from "@/lib/industry-examples/allowlist";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UPSTREAM_TTL_SECONDS = 3600;

/**
 * Public industry-example MP4 proxy.
 * Only video_jobs explicitly configured on static industry-example packages
 * are serveable — arbitrary production job IDs return 404.
 */
export async function GET(request: Request): Promise<Response> {
  const jobId = new URL(request.url).searchParams.get("job");
  const allowed = resolveAllowlistedIndustryExampleVideo(jobId);
  if (!allowed) {
    return new Response("Not found", { status: 404 });
  }

  const storagePath = buildVideoRenderPath(
    allowed.projectId,
    allowed.videoJobId,
    "output.mp4",
  );

  const supabase = createSupabaseAdminClient();
  const { data: signed, error } = await supabase.storage
    .from(STORAGE_BUCKETS.videoRenders)
    .createSignedUrl(storagePath, UPSTREAM_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    return new Response("Preview unavailable", { status: 502 });
  }

  return streamVideoFromUpstream(request, signed.signedUrl, {
    attachment: false,
    cacheControl: "public, max-age=300, stale-while-revalidate=600",
  });
}
