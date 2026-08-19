import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { previewTextToVideoBenchmark } from "@/lib/ai-media-benchmark/service";
import {
  TEXT_TO_VIDEO_SCENE_IDEAS,
} from "@/lib/ai-media-benchmark/textToVideoPrompt";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") ?? "";
  const sceneIdeaId = url.searchParams.get("sceneIdeaId") ?? undefined;
  const caseId = url.searchParams.get("caseId") ?? undefined;
  try {
    const preview = await previewTextToVideoBenchmark({
      projectId,
      sceneIdeaId,
      caseId,
    });
    return NextResponse.json({
      preview,
      sceneIdeas: TEXT_TO_VIDEO_SCENE_IDEAS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "preview_failed";
    const status =
      message === "project_not_found" || message === "benchmark_case_not_found"
        ? 404
        : message === "round_t_case_snapshot_conflict" ||
            message === "benchmark_shared_core_idea_mismatch"
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
