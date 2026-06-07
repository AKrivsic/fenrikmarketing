import { handleN8nCallback } from "@/lib/n8n/callback";
import { handleTrendScanCallback } from "@/lib/n8n/handlers";

export async function POST(request: Request): Promise<Response> {
  return handleN8nCallback(request, handleTrendScanCallback);
}
