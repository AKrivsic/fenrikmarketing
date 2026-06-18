import {
  getClientProject,
  listClientProjectItems,
} from "@/lib/api/client-delivery-admin";
import {
  resolveClientProjectItemMp4UpstreamUrl,
  streamVideoFromUpstream,
} from "@/lib/api/client-project-media";

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

  const items = await listClientProjectItems(projectId);
  const item = items.find((i) => i.id === itemId);
  if (!item) {
    return new Response("Not found", { status: 404 });
  }

  const upstreamUrl = await resolveClientProjectItemMp4UpstreamUrl(item);
  if (!upstreamUrl) {
    return new Response("Not found", { status: 404 });
  }

  return streamVideoFromUpstream(request, upstreamUrl, {
    attachment: download,
    filename: download ? `${item.title || "video"}.mp4`.replace(/[^\w.\-]+/g, "_") : undefined,
  });
}
