import {
  buildProjectTextExport,
  getClientProject,
  listClientProjectItems,
} from "@/lib/api/client-delivery-admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "txt";
  const itemId = searchParams.get("itemId");
  const clientFacing = searchParams.get("client") === "1";

  const detail = await getClientProject(projectId);
  if (!detail) {
    return new Response("Not found", { status: 404 });
  }

  const { client, ...project } = detail;
  const items = await listClientProjectItems(projectId);
  const scopedItems = itemId ? items.filter((i) => i.id === itemId) : items;

  if (clientFacing && !project.paid) {
    return new Response("Downloads unlock after payment.", { status: 403 });
  }

  if (format === "json") {
    const body = JSON.stringify(
      {
        project: {
          id: project.id,
          title: project.title,
          status: project.status,
          paid: project.paid,
          client: { name: client.name, email: client.email },
        },
        items: scopedItems,
      },
      null,
      2,
    );
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="content-package-${projectId}.json"`,
      },
    });
  }

  const text = buildProjectTextExport(project, scopedItems);
  const filename = itemId
    ? `video-${itemId.slice(0, 8)}.txt`
    : `content-package-${projectId}.txt`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
