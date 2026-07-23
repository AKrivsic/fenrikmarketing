import { ATTENTION_VERSION, type AttentionPlan } from "@/lib/attention/types";
import { attentionSpec } from "@/lib/attention/catalog";

// Owner: Attention Delivery (voice emotion / performance intent)
// Responsibility: compact delivery_arc + optional SFX for Presentation + TTS persistence.
// Opening hook ownership lives on Winner Candidate (+ Creative Directive hook archetype).
// Opening situation / originality live on Candidate + DNA — not restated here.
export const ATTENTION_PROMPT_HEADER = "ATTENTION DELIVERY";

/** @deprecated Phase 1 — legacy header; use ATTENTION_PROMPT_HEADER. */
export const ATTENTION_MECHANISM_HEADER_LEGACY = "ATTENTION MECHANISM";

/**
 * Phase 1 Prompt Cleanup — thin delivery block.
 * Preserves mechanism id (for continuity) + EMOTIONAL PERFORMANCE + optional SFX.
 * Removed from Presentation prompt (owned elsewhere): ORIGINALITY PASS, OPENING
 * CONTRACT, FULL SCRIPT QUALITY, SAFETY WITHOUT CREATIVE SANITIZATION.
 */
export function buildAttentionPromptBlock(plan: AttentionPlan): string {
  const spec = attentionSpec(plan.attention_mechanism);
  const sfx = plan.sfx;

  return [
    `${ATTENTION_PROMPT_HEADER} (${ATTENTION_VERSION}) — voice/performance intent only:`,
    `Mechanism: ${plan.attention_mechanism} (${spec.name}) — ${spec.description}`,
    "",
    "EMOTIONAL PERFORMANCE (full voiceover arc — delivery intent for spoken VO):",
    ...plan.delivery_arc.phases.map((p) => `- ${p.phase}: ${p.delivery}`),
    "",
    sfx.sfx_selected
      ? `OPTIONAL SFX: one short ${sfx.sfx_category} accent near ${sfx.sfx_timing_ms}ms (${sfx.sfx_reason}). Never mandatory; never louder than voice.`
      : "OPTIONAL SFX: none for this package (omitted when no suitable accent).",
  ].join("\n");
}

export function attentionFieldsForPersistence(
  plan: AttentionPlan,
): Record<string, unknown> {
  return {
    attention: {
      attention_mechanism: plan.attention_mechanism,
      attention_version: plan.version,
      attention_source: plan.attention_source,
      attention_reasons: plan.attention_reasons,
      originality: {
        selected_candidate_id: plan.originality.selected_candidate_id,
        selected_visual_concept: plan.originality.selected_visual_concept,
        selected_narrative_seed: plan.originality.selected_narrative_seed,
        selected_emotional_effect: plan.originality.selected_emotional_effect,
        reject_summary: plan.originality.reject_summary,
        candidates: plan.originality.candidates.map((c) => ({
          id: c.id,
          rejected: c.rejected,
          reject_reasons: c.reject_reasons,
          visual_concept: c.visual_concept,
          scores: c.scores,
        })),
      },
      opening: plan.opening,
      delivery_arc: plan.delivery_arc,
      sfx_selected: plan.sfx.sfx_selected,
      sfx_category: plan.sfx.sfx_category,
      sfx_timing_ms: plan.sfx.sfx_timing_ms,
      sfx_reason: plan.sfx.sfx_reason,
      sfx_source: plan.sfx.sfx_source,
      sfx_gain: plan.sfx.sfx_gain,
      sfx_render_supported: plan.sfx.render_supported,
      opening_visual_motif: plan.opening_visual_motif,
      opening_emotional_effect: plan.opening_emotional_effect,
      opening_structure: plan.opening_structure,
    },
  };
}

export function readAttentionFromBrief(
  brief: Record<string, unknown> | null | undefined,
): AttentionPlan["attention_mechanism"] | null {
  if (!brief) return null;
  const pg = brief.presentation_generation;
  if (!pg || typeof pg !== "object" || Array.isArray(pg)) return null;
  const att = (pg as Record<string, unknown>).attention;
  if (!att || typeof att !== "object" || Array.isArray(att)) return null;
  const m = (att as Record<string, unknown>).attention_mechanism;
  return typeof m === "string" ? (m as AttentionPlan["attention_mechanism"]) : null;
}

export function readAttentionPlanFromPackagePresentation(
  presentationGeneration: unknown,
): Record<string, unknown> | null {
  if (
    !presentationGeneration ||
    typeof presentationGeneration !== "object" ||
    Array.isArray(presentationGeneration)
  ) {
    return null;
  }
  const att = (presentationGeneration as Record<string, unknown>).attention;
  if (!att || typeof att !== "object" || Array.isArray(att)) return null;
  return att as Record<string, unknown>;
}

/** Stamp attention + SFX fields onto video_jobs.input for worker consumption. */
export function attentionFieldsForVideoJob(
  pkg: { presentation_generation?: unknown },
): Record<string, unknown> {
  const att = readAttentionPlanFromPackagePresentation(pkg.presentation_generation);
  if (!att) return {};
  const out: Record<string, unknown> = {
    attention_mechanism: att.attention_mechanism ?? null,
    attention_version: att.attention_version ?? null,
    opening_motion_intent:
      (att.opening as { first_motion_intent?: string } | undefined)
        ?.first_motion_intent ?? null,
    opening_structure: att.opening_structure ?? null,
    opening_delivery:
      (att.opening as { opening_delivery?: string } | undefined)
        ?.opening_delivery ?? null,
    delivery_arc: att.delivery_arc ?? null,
  };
  if (att.sfx_selected === true) {
    out.sfx_selected = true;
    out.sfx_category = att.sfx_category ?? null;
    out.sfx_timing_ms = att.sfx_timing_ms ?? null;
    out.sfx_reason = att.sfx_reason ?? null;
    out.sfx_source = att.sfx_source ?? null;
    out.sfx_gain = att.sfx_gain ?? 0.18;
  } else {
    out.sfx_selected = false;
  }
  return out;
}
