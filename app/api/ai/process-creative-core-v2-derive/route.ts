import { after } from "next/server";
import { unauthorizedResponse, verifyN8nSecret } from "@/lib/n8n/callback";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  recoverCreativeCoreV2DeriveForPackage,
  recoverPendingCreativeCoreV2DeriveJobs,
} from "@/lib/content-creative-core-v2/recoverDerive";
import { startVideoFromApprovedCreativeCore } from "@/lib/content-creative-core-v2/startVideoFromApprovedCore";
import { triggerCreativeCoreV2DeriveProcessor } from "@/lib/content-creative-core-v2/triggerDeriveProcessor";

/**
 * Durable-ish derive recovery endpoint.
 * Brief pending/claim is source of truth; after() is only a kick.
 * Does NOT call ElevenLabs / Runway / video FFmpeg when media flag is OFF.
 */
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  if (!verifyN8nSecret(request)) {
    return unauthorizedResponse();
  }

  let body: { projectId?: string; packageId?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const origin = new URL(request.url).origin;

  after(async () => {
    try {
      const supabase = createSupabaseAdminClient();
      if (body.projectId && body.packageId) {
        const recovered = await recoverCreativeCoreV2DeriveForPackage({
          supabase,
          projectId: body.projectId,
          packageId: body.packageId,
        });
        if (recovered.ok) {
          const video = await startVideoFromApprovedCreativeCore({
            supabase,
            projectId: body.projectId,
            packageId: body.packageId,
          });
          console.log(
            `[process-creative-core-v2-derive] ${JSON.stringify({ recovered, video })}`,
          );
        } else {
          console.log(
            `[process-creative-core-v2-derive] ${JSON.stringify(recovered)}`,
          );
        }
        return;
      }
      const drained = await recoverPendingCreativeCoreV2DeriveJobs({ supabase });
      if (drained.scanned > 0) {
        await triggerCreativeCoreV2DeriveProcessor(origin);
      }
      console.log(
        `[process-creative-core-v2-derive] ${JSON.stringify(drained)}`,
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      console.error(`[process-creative-core-v2-derive] failed: ${detail}`);
    }
  });

  return Response.json({ ok: true, accepted: true }, { status: 202 });
}
