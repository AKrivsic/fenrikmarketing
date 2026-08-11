/**
 * Resolve the editor actor for Creative Review mutations.
 *
 * Prefer the authenticated Supabase user when a session exists; otherwise
 * fall back to a stable editor id (MVP admin has no required session).
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreativeReviewActor } from "@/lib/creative-review/types";

const FALLBACK_EDITOR_ACTOR: CreativeReviewActor = {
  type: "user",
  id: "editor",
};

export async function resolveCreativeReviewEditorActor(): Promise<CreativeReviewActor> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      return { type: "user", id: user.id };
    }
  } catch {
    // No session / server client unavailable — MVP admin path.
  }
  return { ...FALLBACK_EDITOR_ACTOR };
}
