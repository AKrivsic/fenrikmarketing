import {
  getClientProject,
  listClientProjectItems,
  listClientProjectPackages,
} from "@/lib/api/client-delivery-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signPackageSocialImageUrl } from "@/lib/content-package/socialImageAccess";
import {
  parsePackageSocialImage,
  packageSocialImageHasRenderableFile,
} from "@/lib/content-package/socialImage";
import { streamVideoFromUpstream } from "@/lib/api/client-project-media";

/**
 * Streams the shared Facebook/LinkedIn social image for a client delivery item.
 * Resolves via the linked internal content package (no denormalized columns).
 * Preview always allowed; download gated on client_projects.paid.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  const download = searchParams.get("download") === "1";

  if (!itemId) {
    return new Response("Bad request", { status: 400 });
  }

  const detail = await getClientProject(projectId);
  if (!detail) {
    return new Response("Not found", { status: 404 });
  }

  if (download && !detail.paid) {
    return new Response("Downloads unlock after payment.", { status: 403 });
  }

  const [items, packages] = await Promise.all([
    listClientProjectItems(projectId),
    listClientProjectPackages(projectId),
  ]);
  const item = items.find((i) => i.id === itemId);
  if (!item?.packageId) {
    return new Response("Not found", { status: 404 });
  }

  const deliveryPkg = packages.find((p) => p.id === item.packageId);
  const internalPackageId = deliveryPkg?.internalPackageId;
  if (!internalPackageId) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: pkgRow, error: pkgErr } = await supabase
    .from("content_packages")
    .select("package_brief")
    .eq("id", internalPackageId)
    .maybeSingle();
  if (pkgErr) {
    return new Response("Failed to resolve image", { status: 500 });
  }

  const social = parsePackageSocialImage(pkgRow?.package_brief ?? null);
  if (!packageSocialImageHasRenderableFile(social)) {
    return new Response("Not found", { status: 404 });
  }

  const upstreamUrl = await signPackageSocialImageUrl(social, 3600, supabase);
  if (!upstreamUrl) {
    return new Response("Not found", { status: 404 });
  }

  return streamVideoFromUpstream(request, upstreamUrl, {
    attachment: download,
    filename: download
      ? `${item.title || "social-image"}.png`.replace(/[^\w.\-]+/g, "_")
      : undefined,
    contentType: "image/png",
  });
}
