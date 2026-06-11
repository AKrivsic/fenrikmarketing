import { getReviewRunExport } from "@/lib/api/review-runs-admin";

// Subtitle Reliability V1 (Part F) — export a production run as a single JSON
// file (run + packages + content_items + video_jobs + voiceovers + platform
// outputs + warnings) for QA. Read-only: no mutations, no generation. Served as
// a forced download via Content-Disposition, mirroring the video-download route.

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
): Promise<Response> {
  const { runId } = await params;

  let payload;
  try {
    payload = await getReviewRunExport(runId);
  } catch {
    return new Response("Failed to assemble run export", { status: 500 });
  }

  if (!payload) {
    return new Response("Not found", { status: 404 });
  }

  const body = JSON.stringify(payload, null, 2);
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set(
    "Content-Disposition",
    `attachment; filename="production-run-${runId}.json"`,
  );
  return new Response(body, { status: 200, headers });
}
