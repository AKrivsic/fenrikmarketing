import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import {
  createCombinedScene,
  listCombinedScenes,
} from "@/lib/ai-media-benchmark/combinedService";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const caseId = url.searchParams.get("caseId") ?? undefined;
  if (!projectId) {
    return NextResponse.json({ error: "project_id_required" }, { status: 400 });
  }
  try {
    const runs = await listCombinedScenes({ projectId, caseId });
    return NextResponse.json({ runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    return NextResponse.json({ error: message }, { status: 400 });
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
    const run = await createCombinedScene({
      projectId: String(record.projectId ?? ""),
      videoRunId: String(record.videoRunId ?? ""),
      voiceRunId: String(record.voiceRunId ?? ""),
      soundRunId: record.soundRunId ? String(record.soundRunId) : null,
      clientRequestId: String(record.clientRequestId ?? ""),
      caseId: typeof record.caseId === "string" ? record.caseId : undefined,
    });
    return NextResponse.json({ run });
  } catch (err) {
    const message = err instanceof Error ? err.message : "assemble_failed";
    const status =
      message === "voiceover_too_long_for_scene" ||
      message === "source_output_missing" ||
      message === "combined_request_input_mismatch" ||
      message.endsWith("_required") ||
      message.endsWith("_invalid") ||
      message.endsWith("_not_found") ||
      message.endsWith("_wrong_type") ||
      message.endsWith("_wrong_project") ||
      message.endsWith("_not_succeeded")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
