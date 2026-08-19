import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/runway-test/auth";
import { publicCatalog } from "@/lib/ai-media-benchmark/catalog";
import {
  isBenchmarkSoundEnabled,
  isBenchmarkTextVideoEnabled,
  isBenchmarkVideoEnabled,
  isBenchmarkVoiceEnabled,
} from "@/lib/ai-media-benchmark/flags";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  return NextResponse.json({
    catalog: publicCatalog(),
    flags: {
      video: isBenchmarkVideoEnabled(),
      voice: isBenchmarkVoiceEnabled(),
      sound: isBenchmarkSoundEnabled(),
      textVideo: isBenchmarkTextVideoEnabled(),
    },
  });
}
