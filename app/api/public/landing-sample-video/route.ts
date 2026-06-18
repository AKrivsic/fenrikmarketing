import { resolveLandingSampleSelection } from "@/lib/api/landing-sample-resolve";
import { STORAGE_BUCKETS, buildVideoRenderPath } from "@/lib/api/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UPSTREAM_TTL_SECONDS = 3600;

export async function GET(request: Request): Promise<Response> {
  let selection;
  try {
    selection = await resolveLandingSampleSelection();
  } catch {
    return new Response("Preview unavailable", { status: 503 });
  }

  if (!selection) {
    return new Response("Not found", { status: 404 });
  }

  const storagePath = buildVideoRenderPath(
    selection.projectId,
    selection.videoJobId,
    "output.mp4",
  );

  const supabase = createSupabaseAdminClient();
  const { data: signed, error } = await supabase.storage
    .from(STORAGE_BUCKETS.videoRenders)
    .createSignedUrl(storagePath, UPSTREAM_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    return new Response("Preview unavailable", { status: 502 });
  }

  const range = request.headers.get("range");
  const upstream = await fetch(signed.signedUrl, {
    headers: range ? { Range: range } : undefined,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Preview unavailable", { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? "video/mp4");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");

  const passthrough = [
    "content-length",
    "content-range",
    "etag",
    "last-modified",
  ] as const;
  for (const name of passthrough) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
