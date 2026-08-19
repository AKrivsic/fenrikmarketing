import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { syncRunwayTestJobStatus } from "@/lib/runway-test/service";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "project_id_required" }, { status: 400 });
  }

  try {
    const job = await syncRunwayTestJobStatus({
      testJobId: id,
      projectId,
    });
    return NextResponse.json({ job });
  } catch (err) {
    if (err instanceof VideoGenerationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : "status_failed";
    const status =
      message === "test_job_not_found"
        ? 404
        : message.endsWith("_invalid") || message.endsWith("_required")
          ? 400
          : message === "download_failed" ||
              message === "download_http_failed" ||
              message === "download_not_video" ||
              message === "download_too_large" ||
              message === "upload_failed"
            ? 502
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
