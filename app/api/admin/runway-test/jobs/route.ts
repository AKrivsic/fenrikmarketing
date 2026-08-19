import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { listRunwayTestJobs } from "@/lib/runway-test/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");

  try {
    const jobs = await listRunwayTestJobs(projectId || undefined);
    return NextResponse.json({ jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    const status = message.startsWith("project_id_") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
