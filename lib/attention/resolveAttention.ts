import { ATTENTION_CATALOG, attentionSpec } from "@/lib/attention/catalog";
import { hashString } from "@/lib/creative-identity/hash";
import { normalizeFunnelStage, type FunnelStage } from "@/lib/ai/types";
import type {
  AttentionMechanism,
  AttentionSource,
} from "@/lib/attention/types";

export interface ResolveAttentionInput {
  projectId: string;
  strategyItemId: string;
  packageIndex: number | null;
  topic: string;
  angle: string | null | undefined;
  funnelStage: string | FunnelStage;
  creativeMode: string;
  painPoints: readonly string[];
  productIs: readonly string[];
  audienceSummary?: string | null;
  recentMechanisms?: readonly string[];
  recentSfxCategories?: readonly string[];
  salt?: string | null;
  source?: AttentionSource;
}

export interface AttentionSelection {
  mechanism: AttentionMechanism;
  reasons: string[];
  scores: Record<AttentionMechanism, number>;
  source: AttentionSource;
}

function funnelKey(
  stage: string | FunnelStage,
): "awareness" | "problem_aware" | "solution_aware" | "conversion" | null {
  const n = normalizeFunnelStage(stage);
  if (!n) return null;
  return n;
}

function keywordBoost(
  mechanism: AttentionMechanism,
  blob: string,
): { score: number; reason: string | null } {
  const t = blob.toLowerCase();
  const rules: { id: AttentionMechanism; words: RegExp; reason: string }[] = [
    {
      id: "DILEMMA",
      words: /\bor\b|choose|trade[- ]?off|vs\.?|versus|either|dilemma|caught between/,
      reason: "topic_signals_choice",
    },
    {
      id: "HUMOR",
      words: /funny|absurd|joke|laugh|ridiculous|banana|ironic humor/,
      reason: "topic_signals_humor",
    },
    {
      id: "FRUSTRATION",
      words: /frustrat|overwhelm|burnout|stuck|again|never.?ending|chaos/,
      reason: "topic_signals_frustration",
    },
    {
      id: "RELIEF",
      words: /finally|relief|done|automated|off.?load|free time/,
      reason: "topic_signals_relief",
    },
    {
      id: "WISH_FULFILMENT",
      words: /dream|wish|want|freedom|enjoy life|vacation|hands.?free/,
      reason: "topic_signals_wish",
    },
    {
      id: "ROLE_REVERSAL",
      words: /automat|robot|done.?for.?you|while you|instead of you/,
      reason: "topic_signals_role_reversal",
    },
    {
      id: "PROVOCATIVE_OPINION",
      words: /stop|never|wrong|myth|nobody|unpopular|honestly/,
      reason: "topic_signals_opinion",
    },
    {
      id: "SURPRISE",
      words: /surprising|unexpected|shock|wait|plot twist/,
      reason: "topic_signals_surprise",
    },
    {
      id: "ABSURD_ASSOCIATION",
      words: /metaphor|cemetery|forgotten|banana|strange|weird/,
      reason: "topic_signals_absurd",
    },
    {
      id: "HUMAN_CONFLICT",
      words: /team|client|partner|argument|disagre|boss|customer complain/,
      reason: "topic_signals_conflict",
    },
    {
      id: "CONTRAST",
      words: /before|after|versus|vs\.?|old way|new way|two kinds/,
      reason: "topic_signals_contrast",
    },
    {
      id: "CURIOSITY_GAP",
      words: /secret|why|what if|nobody knows|hidden/,
      reason: "topic_signals_curiosity",
    },
  ];
  for (const rule of rules) {
    if (rule.id === mechanism && rule.words.test(t)) {
      return { score: 3, reason: rule.reason };
    }
  }
  return { score: 0, reason: null };
}

function recentPenalty(
  mechanism: AttentionMechanism,
  recent: readonly string[],
): number {
  if (recent.length === 0) return 0;
  let penalty = 0;
  for (let i = 0; i < Math.min(recent.length, 6); i++) {
    if (recent[i] === mechanism) {
      // Soft negative: stronger for more recent, never a hard ban.
      penalty += 4 - Math.min(i, 3);
    }
  }
  return penalty;
}

export function buildAttentionSeed(input: ResolveAttentionInput): string {
  return [
    input.projectId,
    input.strategyItemId,
    String(input.packageIndex ?? ""),
    input.topic,
    input.angle ?? "",
    String(input.funnelStage),
    input.creativeMode,
    input.salt ?? "",
    "attention-v1",
  ].join("|");
}

/**
 * Deterministic attention mechanism selection.
 * Creative mode, funnel, and attention are independent axes — funnel only
 * contributes soft affinity scores, never a fixed map.
 */
export function resolveAttentionMechanism(
  input: ResolveAttentionInput,
): AttentionSelection {
  const reasons: string[] = [];
  const source: AttentionSource =
    input.source ?? (input.salt ? "regeneration" : "deterministic_v1");
  const seed = buildAttentionSeed(input);
  const funnel = funnelKey(input.funnelStage);
  const mode = input.creativeMode.trim().toLowerCase();
  const blob = [
    input.topic,
    input.angle ?? "",
    input.audienceSummary ?? "",
    ...input.painPoints,
    ...input.productIs,
  ].join(" ");

  const scores = {} as Record<AttentionMechanism, number>;
  for (const spec of ATTENTION_CATALOG) {
    let score = 10; // base so all remain eligible
    const funnelBoost = funnel ? (spec.soft_funnel_boost[funnel] ?? 0) : 0;
    if (funnelBoost) {
      score += funnelBoost;
    }
    const modeBoost = spec.soft_mode_boost[mode] ?? 0;
    if (modeBoost) score += modeBoost;

    const kw = keywordBoost(spec.id, blob);
    score += kw.score;

    const penalty = recentPenalty(spec.id, input.recentMechanisms ?? []);
    score -= penalty;

    // Tiny deterministic jitter from seed so ties break stably without rotation.
    const tie = hashString(`${seed}::${spec.id}`) % 5;
    score += tie * 0.01;

    scores[spec.id] = score;
  }

  let best = ATTENTION_CATALOG[0]!.id;
  let bestScore = -Infinity;
  for (const spec of ATTENTION_CATALOG) {
    const s = scores[spec.id];
    if (s > bestScore) {
      bestScore = s;
      best = spec.id;
    }
  }

  const picked = attentionSpec(best);
  reasons.push(`selected:${best}`);
  reasons.push(`source:${source}`);
  if (funnel) {
    reasons.push(`funnel_soft_affinity:${funnel}:${picked.soft_funnel_boost[funnel] ?? 0}`);
  }
  reasons.push(`creative_mode_soft_affinity:${mode}:${picked.soft_mode_boost[mode] ?? 0}`);
  const kw = keywordBoost(best, blob);
  if (kw.reason) reasons.push(kw.reason);
  const penalty = recentPenalty(best, input.recentMechanisms ?? []);
  if (penalty > 0) {
    reasons.push(`recent_soft_penalty:${penalty}`);
  } else if ((input.recentMechanisms ?? []).includes(best)) {
    reasons.push("recent_seen_but_still_strongest");
  }
  reasons.push("independent_of_funnel_mapping");

  return { mechanism: best, reasons, scores, source };
}
