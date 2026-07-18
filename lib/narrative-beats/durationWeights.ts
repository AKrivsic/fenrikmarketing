import type { NarrativeBeatRole } from "@/lib/narrative-beats/types";

/** Soft relative weights — Hook/Ending short, Setup/Escalation medium. */
export const NARRATIVE_DURATION_WEIGHTS: Record<NarrativeBeatRole, number> = {
  HOOK: 0.7,
  SETUP: 1.05,
  ESCALATION: 1.15,
  RESOLUTION: 0.75,
};

/** Hard safety: no beat may exceed this share of total (unless VO-justified). */
export const MAX_BEAT_SHARE = 0.35;

/** If a segment holds this share of spoken words, exceeding 35% is justified. */
export const VO_JUSTIFICATION_WORD_SHARE = 0.4;

const MODE_ROLE_WEIGHTS: Array<{ re: RegExp; weight: number }> = [
  { re: /^(hook|unexpected_fact|observation|myth|mistake|common_belief|situation|before|option_a)$/i, weight: 0.7 },
  { re: /^(setup|insight|implication|why_wrong|why_believed|why_backfires|meaning|option_b|change)$/i, weight: 1.05 },
  { re: /^(conflict|twist|escalation|unexpected_turn|punchline|tradeoffs|in_action|proof|reality|correct_approach|reveal)$/i, weight: 1.15 },
  { re: /^(resolution|cta|after|recommendation|payoff|close)$/i, weight: 0.75 },
];

export function weightForNarrativeRole(role: string): number {
  const key = role.trim().toUpperCase() as NarrativeBeatRole;
  if (key in NARRATIVE_DURATION_WEIGHTS) {
    return NARRATIVE_DURATION_WEIGHTS[key as NarrativeBeatRole];
  }
  for (const row of MODE_ROLE_WEIGHTS) {
    if (row.re.test(role.trim())) return row.weight;
  }
  return 1;
}

/**
 * Plan per-beat durations from total speech length, role importance, and
 * voiceover segment word counts. Enforces ≤35% per beat unless the segment's
 * word share justifies a longer hold.
 */
export function planBeatDurations(args: {
  totalSeconds: number;
  roles: readonly string[];
  segmentWordCounts: readonly number[];
  maxShare?: number;
  voJustificationShare?: number;
}): { durations: number[]; justifiedOverMax: boolean[] } {
  const n = args.roles.length;
  const maxShare = args.maxShare ?? MAX_BEAT_SHARE;
  const voShare = args.voJustificationShare ?? VO_JUSTIFICATION_WORD_SHARE;
  if (n === 0) return { durations: [], justifiedOverMax: [] };

  const totalWords = args.segmentWordCounts.reduce((a, b) => a + b, 0);
  const raw: number[] = [];
  for (let i = 0; i < n; i++) {
    const roleW = weightForNarrativeRole(args.roles[i] ?? "body");
    const wordW =
      totalWords > 0
        ? Math.max(0.35, (args.segmentWordCounts[i] ?? 0) / totalWords) * n
        : 1;
    raw.push(roleW * wordW);
  }
  const rawSum = raw.reduce((a, b) => a + b, 0) || 1;
  let durations = raw.map((w) => (w / rawSum) * args.totalSeconds);
  const justifiedOverMax = durations.map((d, i) => {
    const words = args.segmentWordCounts[i] ?? 0;
    const share = totalWords > 0 ? words / totalWords : 0;
    return d / args.totalSeconds > maxShare && share >= voShare;
  });

  // Cap non-justified beats at maxShare; redistribute remainder to under-cap beats.
  const caps = durations.map((d, i) =>
    justifiedOverMax[i]
      ? d
      : Math.min(d, args.totalSeconds * maxShare),
  );
  let cappedSum = caps.reduce((a, b) => a + b, 0);
  let remainder = args.totalSeconds - cappedSum;
  if (remainder > 0.001) {
    const room = caps.map((d, i) =>
      justifiedOverMax[i]
        ? 0
        : Math.max(0, args.totalSeconds * maxShare - d),
    );
    let roomSum = room.reduce((a, b) => a + b, 0);
    if (roomSum > 0) {
      durations = caps.map((d, i) => d + (room[i]! / roomSum) * remainder);
    } else {
      // Everyone at cap or justified — distribute evenly among justified / all.
      const targets = justifiedOverMax.some(Boolean)
        ? justifiedOverMax
        : durations.map(() => true);
      const count = targets.filter(Boolean).length || n;
      durations = caps.map((d, i) =>
        targets[i] ? d + remainder / count : d,
      );
    }
  } else if (remainder < -0.001) {
    // Overshot (justified beats) — scale all down proportionally.
    const scale = args.totalSeconds / cappedSum;
    durations = caps.map((d) => d * scale);
  } else {
    durations = caps;
  }

  // Final normalize to exact total (floating point hygiene).
  const sum = durations.reduce((a, b) => a + b, 0) || 1;
  durations = durations.map((d) => (d / sum) * args.totalSeconds);
  durations = durations.map((d) => Math.round(d * 100) / 100);

  // Fix rounding drift on last beat.
  const drift =
    args.totalSeconds - durations.reduce((a, b) => a + b, 0);
  if (durations.length > 0 && Math.abs(drift) >= 0.01) {
    durations[durations.length - 1] =
      Math.round((durations[durations.length - 1]! + drift) * 100) / 100;
  }

  return { durations, justifiedOverMax };
}
