/**
 * Redacted Creative Core failure payloads — no client prose in telemetry.
 */

import { createHash } from "node:crypto";
import type { ContentCreativeCoreV2 } from "@/lib/content-creative-core-v2/types";
import type { CreativeCoreFailureDiagnostics } from "@/lib/content-creative-core-v2/createCreativeCore";
import { countVoiceoverWords } from "@/lib/content-creative-core-v2/softClampVoiceover";

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

function redactFingerprint(fp: ContentCreativeCoreV2["creative_fingerprint"] | null): unknown {
  if (!fp) return null;
  return {
    pain_key: fp.pain_key,
    scenario_key: fp.scenario_key,
    pov_key: fp.pov_key,
    opening_mechanism: fp.opening_mechanism,
    narrative_mechanism: fp.narrative_mechanism,
    setting_key: fp.setting_key,
    visual_motif_key: fp.visual_motif_key,
    conflict_key: fp.conflict_key,
    prop_keys: fp.prop_keys?.slice(0, 8),
    cta_mechanism: fp.cta_mechanism,
  };
}

export function buildRedactedCreativeCoreFailurePayload(args: {
  core: ContentCreativeCoreV2 | null;
  diagnostics: CreativeCoreFailureDiagnostics;
}): Record<string, unknown> {
  const core = args.core;
  const diag = args.diagnostics;
  const fields = diag.fingerprint_input_fields;
  return {
    content_creative_core_v2: core
      ? {
          contract_version: core.contract_version,
          strategy_item_id: core.strategy_item_id,
          creative_fingerprint: redactFingerprint(core.creative_fingerprint),
          core_idea_chars: core.core_idea.length,
          hook_chars: core.hook.length,
          voiceover_word_count: countVoiceoverWords(core.voiceover),
          voiceover_sha256: sha256(core.voiceover),
          scene_count: core.scenes.length,
          scene_ids: core.scenes.map((s) => s.scene_id),
        }
      : null,
    diagnostics: {
      llm_fingerprint: redactFingerprint(diag.llm_fingerprint),
      computed_fingerprint: redactFingerprint(diag.computed_fingerprint),
      fingerprint_input_fields: {
        core_idea_chars: fields.core_idea.length,
        hook_chars: fields.hook.length,
        conflict_chars: fields.conflict.length,
        reveal_or_surprise_chars: fields.reveal_or_surprise.length,
        payoff_chars: fields.payoff.length,
        cta_intent_chars: fields.cta_intent.length,
        main_emotion_chars: fields.main_emotion.length,
        pain_point_key: fields.pain_point ? sha256(fields.pain_point) : null,
        scene_count: fields.scene_count,
        first_environment_chars: fields.first_environment.length,
        subjects_blob_chars: fields.subjects_blob_preview.length,
        visual_events_chars: fields.visual_events_preview.length,
      },
      voiceover_word_count: diag.voiceover_word_count,
      voiceover_soft_clamp: diag.voiceover_soft_clamp,
      validation_errors: diag.validation_errors,
      provider_request_id: diag.provider_request_id ?? null,
    },
  };
}

export function buildCreativeCoreFailureLastRawRedacted(args: {
  core: ContentCreativeCoreV2 | null;
  diagnostics: CreativeCoreFailureDiagnostics;
}): string {
  const payload = buildRedactedCreativeCoreFailurePayload(args);
  const encoded = JSON.stringify(payload);
  const maxBytes = 12_000;
  if (Buffer.byteLength(encoded, "utf8") <= maxBytes) return encoded;
  return encoded.slice(0, maxBytes);
}

/** Returns true if marker substring appears anywhere in serialized failure payload. */
export function failurePayloadContainsMarker(
  payloadJson: string,
  marker: string,
): boolean {
  return payloadJson.includes(marker);
}
