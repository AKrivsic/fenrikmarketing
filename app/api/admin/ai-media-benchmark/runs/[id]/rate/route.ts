import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { rateBenchmarkRun } from "@/lib/ai-media-benchmark/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const projectId = String(record.projectId ?? "");
  try {
    const run = await rateBenchmarkRun({
      runId: id,
      projectId,
      rating: record.rating,
      note: record.note,
    });
    return NextResponse.json({ run });
  } catch (err) {
    const message = err instanceof Error ? err.message : "rate_failed";
    const status = message === "benchmark_run_not_found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
