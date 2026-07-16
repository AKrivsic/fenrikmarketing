import { ATTENTION_VERSION, type AttentionPlan } from "@/lib/attention/types";
import { attentionSpec } from "@/lib/attention/catalog";

export const ATTENTION_PROMPT_HEADER = "ATTENTION MECHANISM";

export function buildAttentionPromptBlock(plan: AttentionPlan): string {
  const spec = attentionSpec(plan.attention_mechanism);
  const o = plan.opening;
  const sfx = plan.sfx;

  return [
    `${ATTENTION_PROMPT_HEADER} (${ATTENTION_VERSION}) — separate from creative mode and funnel:`,
    `Primary attention mechanism: ${plan.attention_mechanism} (${spec.name})`,
    `- ${spec.description}`,
    `- Script: ${spec.script_guidance}`,
    `- Visual: ${spec.visual_guidance}`,
    `- Avoid: ${spec.avoid}`,
    "",
    "ORIGINALITY PASS (do not accept the first obvious idea):",
    `- Rejected paths: ${plan.originality.reject_summary.join("; ") || "(none)"}`,
    `- Selected opening concept (${plan.originality.selected_candidate_id}): ${plan.originality.selected_visual_concept}`,
    `- Narrative seed: ${plan.originality.selected_narrative_seed}`,
    "- Internally prefer unexpected-but-relevant over literal office clichés (calm desk, empty board, laptop+coffee, notebook vs paper, generic busy entrepreneur).",
    "- Unexpected must still connect back to the Product Brain / topic once the video continues.",
    "",
    "OPENING CONTRACT (0–3 seconds — one coordinated unit):",
    `- First spoken: ${o.first_spoken_guidance}`,
    `- First subtitle: ${o.first_subtitle_guidance}`,
    `- First visual: ${o.first_visual_guidance}`,
    `- Opening structure: ${o.opening_structure}; delivery: ${o.opening_delivery}; effect: ${o.emotional_effect}`,
    `- First motion intent hint: ${o.first_motion_intent} (Semantic Motion still applies; do not force LOW EXPLAIN when an attention event is required unless stillness is the interruption).`,
    `- Land the first spoken thought within ~${o.land_within_seconds[0]}–${o.land_within_seconds[1]}s.`,
    "- Stored hook and first spoken line MUST match the same thought — never dilute a strong hook into a weaker setup.",
    "",
    "FULL SCRIPT QUALITY (not only the first sentence):",
    "- Open with immediate reaction, not context.",
    "- Each beat earns the next; include a turn / escalation / contrast / reveal / punchline / payoff in the body.",
    "- End with a satisfying conclusion, not a generic summary.",
    "- Avoid long setup openers (\"most businesses...\", \"everyone says...\", \"here's what nobody tells you...\") unless the next words immediately land.",
    "- Bold / playful / ironic / provocative / absurd / warm are allowed when truthful and appropriate.",
    "- Forbidden: dishonest claims, defamation, cruelty, fake outrage, unrelated shock, generic clickbait.",
    "- CTA remains optional and funnel-aware; product need not appear in every video; awareness can succeed by being memorable.",
    "",
    "EMOTIONAL PERFORMANCE (full voiceover arc):",
    ...plan.delivery_arc.phases.map((p) => `- ${p.phase}: ${p.delivery}`),
    "",
    sfx.sfx_selected
      ? `OPTIONAL SFX: one short ${sfx.sfx_category} accent near ${sfx.sfx_timing_ms}ms (${sfx.sfx_reason}). Never mandatory; never louder than voice.`
      : "OPTIONAL SFX: none for this package (omitted when no suitable accent).",
    "",
    "SAFETY WITHOUT CREATIVE SANITIZATION:",
    "- Do not automatically soften strong opinions, adult nightlife/alcohol held by adults, frustration, black humor, exaggerated metaphor, or stylized destruction of generic objects into a bland desk scene.",
    "- Still reject illegal instructions, dangerous encouragement, hate, exploitation, minors in adult contexts, deceptive claims, real-person defamation, graphic violence, unsafe brand claims.",
    "- When adjusting a concept, preserve its mechanism and intensity — do not replace it with a notebook/office metaphor merely because it feels safer creatively.",
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
