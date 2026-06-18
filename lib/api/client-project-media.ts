import { STORAGE_BUCKETS } from "@/lib/api/storage";
import type { ClientProjectItemRow } from "@/lib/api/client-delivery-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Short-lived signed URL for server-side streaming only (never sent to the browser as a redirect). */
const UPSTREAM_SIGN_TTL_SECONDS = 3600;

/**
 * Resolves a fetchable MP4 URL for a client delivery item. Prefers storage path;
 * falls back to legacy persisted signed URL in `video_url`.
 * TODO: backfill `video_storage_path` on older rows (re-import or admin edit).
 */
export async function resolveClientProjectItemMp4UpstreamUrl(
  item: ClientProjectItemRow,
): Promise<string | null> {
  const supabase = createSupabaseAdminClient();

  if (item.videoStoragePath) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.videoRenders)
      .createSignedUrl(item.videoStoragePath, UPSTREAM_SIGN_TTL_SECONDS);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  if (item.videoUrl) {
    return item.videoUrl;
  }

  return null;
}

export async function streamVideoFromUpstream(
  request: Request,
  upstreamUrl: string,
  options: { attachment: boolean; filename?: string },
): Promise<Response> {
  const range = request.headers.get("range");
  const upstream = await fetch(upstreamUrl, {
    headers: range ? { Range: range } : undefined,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Video unavailable", { status: 502 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") ?? "video/mp4",
  );
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, no-store");

  if (options.attachment) {
    const name = options.filename ?? "video.mp4";
    headers.set("Content-Disposition", `attachment; filename="${name}"`);
  } else {
    headers.set("Content-Disposition", "inline");
  }

  const passthrough = ["content-length", "content-range", "etag", "last-modified"] as const;
  for (const name of passthrough) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
