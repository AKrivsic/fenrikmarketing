import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import {
  assertTextToVideoPlusNotImplemented,
  planTextToVideoPlus,
} from "@/lib/ai-media-benchmark/textVideoPlus";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const url = new URL(request.url);
  const winnerModelId = url.searchParams.get("winnerModelId");
  return NextResponse.json({ plan: planTextToVideoPlus({ winnerModelId }) });
}

export async function POST(): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    assertTextToVideoPlusNotImplemented();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "text_to_video_plus_not_implemented";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
