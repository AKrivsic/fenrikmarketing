/**
 * Deterministic direction ranking when the critic is unavailable.
 * Never falls back to templates.
 */

import {
  creativeDirectionsCollide,
  normalizeFingerprintText,
  tokenOverlapCount,
} from "@/lib/creative-engine-v3/conceptFingerprint";
import { directionEqualWeightTotal } from "@/lib/creative-engine-v3/directionEvalSchema";
import {
  CREATIVE_DIRECTION_EVAL_VERSION,
  DIRECTION_SELECT_MAX,
  DIRECTION_SELECT_MIN,
  type CreativeBrief,
  type CreativeDirection,
  type CreativeDirectionEvaluationResult,
  type DirectionEvaluationEntry,
  type DirectionScoreCard,
} from "@/lib/creative-engine-v3/types";

function clamp(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

function specificity(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return clamp(3 + Math.min(5, words.length / 6) + Math.min(2, words.filter((w) => w.length > 6).length / 3));
}

function scoreDirection(
  d: CreativeDirection,
  brief: CreativeBrief,
  peers: readonly CreativeDirection[],
): DirectionScoreCard {
  const recent = brief.memory.recent_directions;
  let anti = 10;
  for (const r of recent) {
    if (creativeDirectionsCollide(d.label, r) || creativeDirectionsCollide(d.mechanism, r)) {
      anti = Math.min(anti, 2);
    } else if (tokenOverlapCount(d.label + " " + d.mechanism, r) >= 2) {
      anti = Math.min(anti, 5);
    }
  }

  let diversity = 8;
  for (const p of peers) {
    if (p.direction_id === d.direction_id) continue;
    const sim =
      tokenOverlapCount(d.mechanism, p.mechanism) +
      tokenOverlapCount(d.label, p.label);
    if (sim >= 4) diversity = Math.min(diversity, 4);
    else if (sim >= 2) diversity = Math.min(diversity, 6);
  }

  const funnelHit =
    d.why_fits.toLowerCase().includes(brief.strategy.funnel_stage) ||
    d.why_fits.length > 40
      ? 1
      : 0;

  return {
    strategy_fit: specificity(`${brief.strategy.topic} ${d.why_fits}`),
    funnel_fit: clamp(specificity(d.why_fits) + funnelHit),
    originality: clamp(anti * 0.5 + specificity(d.mechanism) * 0.5),
    diversity_vs_peers: diversity,
    anti_repetition: anti,
    concept_potential: specificity(d.mechanism + " " + d.diversity_note),
    emotional_range: specificity(d.mechanism),
    production_feasibility: 8,
  };
}

export function deterministicEvaluateDirections(args: {
  directions: readonly CreativeDirection[];
  brief: CreativeBrief;
}): CreativeDirectionEvaluationResult {
  if (args.directions.length === 0) {
    return {
      version: CREATIVE_DIRECTION_EVAL_VERSION,
      evaluations: [],
      ranking: [],
      selected_direction_ids: [],
      selection_reason: "no directions",
      source: "deterministic_fallback",
    };
  }

  const evaluations: DirectionEvaluationEntry[] = args.directions.map((d) => ({
    direction_id: d.direction_id,
    scores: scoreDirection(d, args.brief, args.directions),
    vetoes: [],
    critic_notes: "deterministic direction fallback",
  }));

  const ranked = [...evaluations].sort(
    (a, b) => directionEqualWeightTotal(b.scores) - directionEqualWeightTotal(a.scores),
  );

  // Greedy diverse shortlist: take best, then next that doesn't collide with selected.
  const selected: string[] = [];
  const byId = new Map(args.directions.map((d) => [d.direction_id, d]));
  for (const e of ranked) {
    if (selected.length >= DIRECTION_SELECT_MAX) break;
    const cand = byId.get(e.direction_id);
    if (!cand) continue;
    const collides = selected.some((id) => {
      const prev = byId.get(id);
      if (!prev) return false;
      return (
        creativeDirectionsCollide(cand.label, prev.label) ||
        creativeDirectionsCollide(cand.mechanism, prev.mechanism) ||
        normalizeFingerprintText(cand.label) ===
          normalizeFingerprintText(prev.label)
      );
    });
    if (collides && selected.length >= DIRECTION_SELECT_MIN) continue;
    if (collides && selected.length > 0) continue;
    selected.push(e.direction_id);
  }

  // Ensure minimum selection if possible
  for (const e of ranked) {
    if (selected.length >= DIRECTION_SELECT_MIN) break;
    if (!selected.includes(e.direction_id)) selected.push(e.direction_id);
  }

  return {
    version: CREATIVE_DIRECTION_EVAL_VERSION,
    evaluations,
    ranking: ranked.map((e) => e.direction_id),
    selected_direction_ids: selected.slice(0, DIRECTION_SELECT_MAX),
    selection_reason: `Deterministic equal-weight scores with diversity shortlist (${DIRECTION_SELECT_MIN}–${DIRECTION_SELECT_MAX}).`,
    source: "deterministic_fallback",
  };
}
