import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  loadPackageSocialImageFromBrief,
  signPackageSocialImageUrl,
} from "@/lib/content-package/socialImageAccess";
import { packageSocialImageHasRenderableFile } from "@/lib/content-package/socialImage";
import { streamVideoFromUpstream } from "@/lib/api/client-project-media";

/**
 * Internal review: preview/download the package-level FB+LI social image.
 * Auth is project-scoped via the same admin client pattern as other review media.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: projectId } = await params;
  const { searchParams } = new URL(request.url);
  const packageId = searchParams.get("packageId");
  const download = searchParams.get("download") === "1";

  if (!packageId) {
    return new Response("Bad request", { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const social = await loadPackageSocialImageFromBrief(
    supabase,
    projectId,
    packageId,
  );
  if (!packageSocialImageHasRenderableFile(social)) {
    return new Response("Not found", { status: 404 });
  }

  const upstreamUrl = await signPackageSocialImageUrl(social, 3600, supabase);
  if (!upstreamUrl) {
    return new Response("Not found", { status: 404 });
  }

  return streamVideoFromUpstream(request, upstreamUrl, {
    attachment: download,
    filename: download ? "social-image.png" : undefined,
    contentType: "image/png",
  });
}
