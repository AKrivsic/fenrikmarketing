import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { createRunwayTestJob } from "@/lib/runway-test/service";
import { VideoGenerationError } from "@/lib/ai/videoGenerationError";

export const dynamic = "force-dynamic";

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
    const job = await createRunwayTestJob({
      projectId: String(record.projectId ?? ""),
      videoJobId: String(record.videoJobId ?? ""),
      sceneId: String(record.sceneId ?? ""),
      motionPrompt: String(record.motionPrompt ?? ""),
      clientRequestId: String(record.clientRequestId ?? ""),
      confirmPaidGeneration: record.confirmPaidGeneration === true,
    });
    return NextResponse.json({ job });
  } catch (err) {
    if (err instanceof VideoGenerationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus && err.httpStatus >= 400 ? 502 : 400 },
      );
    }
    const message = err instanceof Error ? err.message : "create_failed";
    const status =
      message === "project_not_found" ||
      message === "video_job_not_found" ||
      message === "scene_not_found"
        ? 404
        : message === "video_job_project_mismatch"
          ? 403
          : message === "paid_confirmation_required" ||
              message === "motion_prompt_required" ||
              message === "motion_prompt_too_long" ||
              message.endsWith("_required") ||
              message.endsWith("_invalid")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
