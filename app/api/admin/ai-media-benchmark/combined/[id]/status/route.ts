import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { syncCombinedScene } from "@/lib/ai-media-benchmark/combinedService";

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
    const run = await syncCombinedScene({ runId: id, projectId });
    return NextResponse.json({ run });
  } catch (err) {
    const message = err instanceof Error ? err.message : "status_failed";
    const status =
      message === "combined_run_not_found"
        ? 404
        : message === "voiceover_too_long_for_scene" ||
            message === "source_output_missing" ||
            message.endsWith("_invalid") ||
            message.endsWith("_required")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
