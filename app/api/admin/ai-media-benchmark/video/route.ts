import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { createVideoBenchmarkRun } from "@/lib/ai-media-benchmark/service";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";

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
    const run = await createVideoBenchmarkRun({
      projectId: String(record.projectId ?? ""),
      videoJobId: String(record.videoJobId ?? ""),
      sceneId: String(record.sceneId ?? ""),
      motionPrompt: String(record.motionPrompt ?? ""),
      modelId: String(record.modelId ?? ""),
      durationSeconds: Number(record.durationSeconds),
      ratio: typeof record.ratio === "string" ? record.ratio : undefined,
      caseId: typeof record.caseId === "string" ? record.caseId : undefined,
      clientRequestId: String(record.clientRequestId ?? ""),
      confirmPaidGeneration: record.confirmPaidGeneration === true,
      maxCostUsd: Number(record.maxCostUsd),
    });
    return NextResponse.json({ run });
  } catch (err) {
    if (err instanceof VideoGenerationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus && err.httpStatus >= 400 ? 502 : 400 },
      );
    }
    return jsonError(err);
  }
}

function jsonError(err: unknown): Response {
  const message = err instanceof Error ? err.message : "create_failed";
  const status =
    message === "scene_not_found" || message === "project_not_found"
      ? 404
      : message === "video_benchmark_disabled" ||
          message === "missing_api_key"
        ? 403
        : message === "submission_unknown"
          ? 409
          : message === "benchmark_request_input_mismatch"
            ? 409
          : 400;
  return NextResponse.json({ error: message }, { status });
}
