/**
 * Approved Creative Core snapshot — locked on Approve, never regenerated.
 */

import { CREATIVE_CORE_V2_CONTRACT_VERSION } from "@/lib/content-creative-core-v2/config";
import type { ContentCreativeCoreV2 } from "@/lib/content-creative-core-v2/types";
import type { VoiceDirectionContract } from "@/lib/content-package/voiceDirectionContract";

export const CREATIVE_CORE_V2_APPROVED_SNAPSHOT_KEY =
  "content_creative_core_v2_approved_snapshot" as const;

export interface CreativeCoreV2ApprovedSnapshot {
  locked_at: string;
  contract_version: typeof CREATIVE_CORE_V2_CONTRACT_VERSION;
  core: ContentCreativeCoreV2;
  production_voiceover_en: string;
  voice_direction: VoiceDirectionContract | null;
  translation_revisions: {
    voiceover_en_fingerprint: string | null;
    scene_en_fingerprints: Record<string, string>;
  };
  creative_fingerprint: ContentCreativeCoreV2["creative_fingerprint"];
}

export function buildApprovedCreativeCoreSnapshot(args: {
  core: ContentCreativeCoreV2;
  productionVoiceoverEn: string;
  voiceDirection: VoiceDirectionContract | null;
  lockedAt?: string;
  voiceoverEnFingerprint?: string | null;
  sceneEnFingerprints?: Record<string, string>;
}): CreativeCoreV2ApprovedSnapshot {
  return {
    locked_at: args.lockedAt ?? new Date().toISOString(),
    contract_version: CREATIVE_CORE_V2_CONTRACT_VERSION,
    core: structuredClone(args.core),
    production_voiceover_en: args.productionVoiceoverEn.trim(),
    voice_direction: args.voiceDirection
      ? structuredClone(args.voiceDirection)
      : null,
    translation_revisions: {
      voiceover_en_fingerprint: args.voiceoverEnFingerprint ?? null,
      scene_en_fingerprints: { ...(args.sceneEnFingerprints ?? {}) },
    },
    creative_fingerprint: structuredClone(args.core.creative_fingerprint),
  };
}

export function readApprovedCreativeCoreSnapshot(
  brief: Record<string, unknown> | null | undefined,
): CreativeCoreV2ApprovedSnapshot | null {
  if (!brief) return null;
  const raw = brief[CREATIVE_CORE_V2_APPROVED_SNAPSHOT_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as CreativeCoreV2ApprovedSnapshot;
}
