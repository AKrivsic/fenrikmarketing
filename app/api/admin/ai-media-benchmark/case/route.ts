/**
 * POST /api/admin/ai-media-benchmark/case
 * Create (or return existing) benchmark case for Round A I2V runs.
 * Body: { projectId, caseId?, coreIdea, motionIntent, sourceImageBucket, sourceImagePath }
 *
 * GET /api/admin/ai-media-benchmark/case?projectId=…&caseId=…
 * Load an existing benchmark case with a signed image preview URL.
 */
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { createBenchmarkCase, getBenchmarkCase } from "@/lib/ai-media-benchmark/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? "";
  const caseId = searchParams.get("caseId") ?? "";
  if (!projectId) return NextResponse.json({ error: "project_id_required" }, { status: 400 });
  if (!caseId) return NextResponse.json({ error: "case_id_required" }, { status: 400 });
  try {
    const benchmarkCase = await getBenchmarkCase(projectId, caseId);
    if (!benchmarkCase) return NextResponse.json({ benchmarkCase: null });
    return NextResponse.json({ benchmarkCase });
  } catch (err) {
    const message = err instanceof Error ? err.message : "load_failed";
    return NextResponse.json({ error: message }, { status: message.startsWith("project_id_") ? 400 : 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
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
  try {
    const benchmarkCase = await createBenchmarkCase({
      projectId: String(record.projectId ?? ""),
      caseId: typeof record.caseId === "string" ? record.caseId : undefined,
      coreIdea: String(record.coreIdea ?? ""),
      motionIntent: String(record.motionIntent ?? ""),
      sourceImageBucket: String(record.sourceImageBucket ?? ""),
      sourceImagePath: String(record.sourceImagePath ?? ""),
      sourceImageSha256: typeof record.sourceImageSha256 === "string" ? record.sourceImageSha256 : null,
      sourceImageUuid: typeof record.sourceImageUuid === "string" ? record.sourceImageUuid : null,
    });
    return NextResponse.json({ benchmarkCase });
  } catch (err) {
    const message = err instanceof Error ? err.message : "create_failed";
    const status =
      message === "benchmark_case_input_mismatch" ? 409 :
      message === "benchmark_case_conflict" ? 409 :
      message === "project_not_found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
