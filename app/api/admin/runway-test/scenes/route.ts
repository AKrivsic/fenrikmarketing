import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { listRunwayTestScenesForProject } from "@/lib/runway-test/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "project_id_required" }, { status: 400 });
  }

  try {
    const scenes = await listRunwayTestScenesForProject(projectId);
    return NextResponse.json({ scenes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    const status =
      message === "project_not_found"
        ? 404
        : message.startsWith("project_id_")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
