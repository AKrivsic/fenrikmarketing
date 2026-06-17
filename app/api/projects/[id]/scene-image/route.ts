import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadVideoSceneEditorState } from "@/lib/ai/workflows/videoSceneEditor";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: projectId } = await params;
  const { searchParams } = new URL(request.url);
  const videoJobId = searchParams.get("jobId");
  const sceneId = searchParams.get("sceneId");
  const versionId = searchParams.get("versionId");

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

  let imageBucket = scene.image_bucket;
  let imagePath = scene.image_path;
  if (versionId) {
    const version = scene.imageVersions.find((v) => v.versionId === versionId);
    if (!version) {
      return new Response("Not found", { status: 404 });
    }
    imageBucket = version.image_bucket;
    imagePath = version.image_path;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(imageBucket)
    .createSignedUrl(imagePath, 60 * 5);
  if (error || !data?.signedUrl) {
    return new Response("Artifact unavailable", { status: 502 });
  }

  const upstream = await fetch(data.signedUrl);
  if (!upstream.ok || !upstream.body) {
    return new Response("Artifact unavailable", { status: 502 });
  }

  const ext = imagePath.endsWith(".png") ? "png" : "jpg";
  const filename = `scene-${scene.sceneNumber}${versionId ? `-version` : ""}.${ext}`;
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
