import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { listBenchmarkRuns } from "@/lib/ai-media-benchmark/service";
import type { AiMediaBenchmarkTestType } from "@/lib/ai-media-benchmark/types";
import { AI_MEDIA_BENCHMARK_TEST_TYPES } from "@/lib/ai-media-benchmark/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const url = new URL(request.url);
  const caseId = url.searchParams.get("caseId") ?? undefined;
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const testTypeRaw = url.searchParams.get("testType");
  const testType =
    testTypeRaw &&
    (AI_MEDIA_BENCHMARK_TEST_TYPES as readonly string[]).includes(testTypeRaw)
      ? (testTypeRaw as AiMediaBenchmarkTestType)
      : undefined;
  try {
    const runs = await listBenchmarkRuns({ caseId, projectId, testType });
    return NextResponse.json({ runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
