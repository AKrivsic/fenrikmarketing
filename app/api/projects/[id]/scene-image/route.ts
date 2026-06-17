import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  loadVideoSceneEditorState,
} from "@/lib/ai/workflows/videoSceneEditor";

// Proxies a scene still for download (attachment). Resolves bucket/path from the
// scene editor working copy or the source job's render_spec — never accepts raw
// storage paths from the client.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: projectId } = await params;
  const { searchParams } = new URL(request.url);
  const videoJobId = searchParams.get("jobId");
  const sceneId = searchParams.get("sceneId");

  if (!videoJobId || !sceneId) {
    return new Response("Bad request", { status: 400 });
  }

  let state;
  try {
    state = await loadVideoSceneEditorState({ projectId, videoJobId });
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const scene = state.scenes.find((row) => row.id === sceneId);
  if (!scene) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(scene.image_bucket)
    .createSignedUrl(scene.image_path, 60 * 5);
  if (error || !data?.signedUrl) {
    return new Response("Artifact unavailable", { status: 502 });
  }

  const upstream = await fetch(data.signedUrl);
  if (!upstream.ok || !upstream.body) {
    return new Response("Artifact unavailable", { status: 502 });
  }

  const ext = scene.image_path.endsWith(".png") ? "png" : "jpg";
  const filename = `scene-${scene.sceneNumber}.${ext}`;
  const contentType =
    upstream.headers.get("content-type") ??
    (ext === "png" ? "image/png" : "image/jpeg");

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new Response(upstream.body, { status: 200, headers });
}
