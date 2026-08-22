/**
 * Auto-accept helper for Creative Core v2 (automatic generation mode).
 * Step 2: prepare only — does NOT start paid media / workers.
 */

import { buildApprovedCreativeCoreSnapshot } from "@/lib/content-creative-core-v2/approvedSnapshot";
import type { ContentCreativeCoreV2 } from "@/lib/content-creative-core-v2/types";
import type { VoiceDirectionContract } from "@/lib/content-package/voiceDirectionContract";

export const CREATIVE_CORE_V2_AUTO_ACCEPTED_KEY =
  "content_creative_core_v2_auto_accepted" as const;

/**
 * Marks the Creative Core as auto-accepted for later Step 3/4 media.
 * Does not insert video_jobs, call providers, or generate platform texts.
 */
export function autoAcceptCreativeCoreV2(args: {
  brief: Record<string, unknown>;
  core: ContentCreativeCoreV2;
  voiceDirection?: VoiceDirectionContract | null;
  acceptedAt?: string;
}): Record<string, unknown> {
  const lockedAt = args.acceptedAt ?? new Date().toISOString();
  const snapshot = buildApprovedCreativeCoreSnapshot({
    core: args.core,
    productionVoiceoverEn: args.core.voiceover,
    voiceDirection: args.voiceDirection ?? null,
    lockedAt,
  });
  return {
    ...args.brief,
    [CREATIVE_CORE_V2_AUTO_ACCEPTED_KEY]: {
      accepted_at: lockedAt,
      paid_media_started: false,
      platform_outputs_started: false,
    },
    content_creative_core_v2_approved_snapshot: snapshot,
  };
}
