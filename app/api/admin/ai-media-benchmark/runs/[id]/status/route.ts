import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { syncBenchmarkRun } from "@/lib/ai-media-benchmark/service";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

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
    const run = await syncBenchmarkRun({ runId: id, projectId });
    return NextResponse.json({ run });
  } catch (err) {
    if (err instanceof VideoGenerationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : "status_failed";
    const status =
      message === "benchmark_run_not_found"
        ? 404
        : message.endsWith("_invalid") || message.endsWith("_required")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
