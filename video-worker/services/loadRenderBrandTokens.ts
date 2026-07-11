import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import type { SceneRasterPrepareContext } from "@/lib/scene-types/renderers/types";
import { resolveRenderBrandTokens } from "@/lib/visual-profile/renderBrandTokens";
import { parseVisualProfile } from "@/lib/visual-profile/visualProfile";

export async function loadRenderBrandTokensForWorker(
  ctx: SceneRasterPrepareContext,
  payloadBackgroundStyle?: "dark" | "light" | "brand",
) {
  const supabase = createSupabaseAdminClient();
  const { data: projectRow } = await supabase
    .from("projects")
    .select("knowledge")
    .eq("id", ctx.projectId)
    .maybeSingle();

  const profile = ctx.visualProfile
    ? parseVisualProfile(ctx.visualProfile)
    : null;

  return resolveRenderBrandTokens({
    knowledge: (projectRow?.knowledge as Json | null | undefined) ?? null,
    visualProfile: profile,
    payloadBackgroundStyle,
  });
}
