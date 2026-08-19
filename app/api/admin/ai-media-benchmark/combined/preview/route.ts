import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { previewCombinedScene } from "@/lib/ai-media-benchmark/combinedService";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") ?? "";
  const videoRunId = url.searchParams.get("videoRunId") ?? "";
  const voiceRunId = url.searchParams.get("voiceRunId") ?? "";
  const soundRunId = url.searchParams.get("soundRunId");
  try {
    const plan = await previewCombinedScene({
      projectId,
      videoRunId,
      voiceRunId,
      soundRunId,
    });
    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "preview_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
