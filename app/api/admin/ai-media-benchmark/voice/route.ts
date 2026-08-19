import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { createVoiceBenchmarkRun } from "@/lib/ai-media-benchmark/service";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

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
    const run = await createVoiceBenchmarkRun({
      projectId: String(record.projectId ?? ""),
      candidateId: String(record.candidateId ?? ""),
      text: String(record.text ?? ""),
      caseId: typeof record.caseId === "string" ? record.caseId : undefined,
      clientRequestId: String(record.clientRequestId ?? ""),
      confirmPaidGeneration: record.confirmPaidGeneration === true,
      maxCostUsd:
        record.maxCostUsd === undefined || record.maxCostUsd === null
          ? undefined
          : Number(record.maxCostUsd),
    });
    return NextResponse.json({ run });
  } catch (err) {
    const message = err instanceof Error ? err.message : "create_failed";
    const status =
      message === "voice_benchmark_disabled" || message === "missing_api_key"
        ? 403
        : message === "submission_unknown"
          ? 409
          : message === "benchmark_request_input_mismatch"
            ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
