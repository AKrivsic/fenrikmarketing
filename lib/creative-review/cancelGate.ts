/**
 * Client-safe Cancel Manual Review gate.
 *
 * Keep this module free of server-only imports (Supabase admin, etc.) so the
 * Creative Review workspace can import it without crashing browser bundles.
 */

import type { GenerationMode } from "@/lib/ai/generationMode";
import type { ProductionRunStatus } from "@/lib/supabase/types";

/** UI hint — Cancel Manual Review is only available while waiting. */
export function canCancelManualReview(args: {
  runStatus: ProductionRunStatus;
  generationMode: GenerationMode;
}): boolean {
  return (
    args.generationMode === "manual_review" &&
    args.runStatus === "waiting_for_creative_review"
  );
}
