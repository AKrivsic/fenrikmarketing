import type { Json } from "@/lib/supabase/types";
import {
  DEFAULT_VISUAL_PROFILE,
  VISUAL_PROFILES,
  type VisualProfile,
} from "@/lib/visual-profile/visualProfile";
import type { VisualProfileProjectContext } from "@/lib/visual-profile/resolveVisualProfile";

type ProfileKeywords = Record<VisualProfile, readonly string[]>;

const PROFILE_KEYWORDS: ProfileKeywords = {
  NATURAL: [
    "human",
    "approachable",
    "local",
    "practical",
    "candid",
    "warm",
    "community",
    "relatable",
    "empathetic",
    "everyday",
    "friendly",
    "authentic",
    "confession",
    "honest",
    "personal",
    "founder",
  ],
  MINIMAL: [
    "simple",
    "clean",
    "efficient",
    "modern",
    "product-led",
    "clarity",
    "automation",
    "saas",
    "software",
    "platform",
    "streamlined",
    "minimal",
    "framework",
    "system",
    "process",
    "steps",
    "checklist",
    "workflow",
  ],
  BOLD: [
    "energetic",
    "disruptive",
    "playful",
    "high contrast",
    "fast",
    "ambitious",
    "bold",
    "dynamic",
    "startup",
    "growth",
    "prediction",
    "shock",
    "contrarian",
    "provocative",
  ],
  EDITORIAL: [
    "expertise",
    "thoughtful",
    "professional",
    "educational",
    "strategic",
    "authoritative",
    "consulting",
    "agency",
    "content",
    "marketing",
    "insight",
    "expert",
    "industry",
    "analysis",
    "perspective",
  ],
  PREMIUM: [
    "elegant",
    "refined",
    "high-end",
    "exclusive",
    "craftsmanship",
    "luxury",
    "premium",
    "bespoke",
    "upscale",
    "enterprise",
    "executive",
    "polished",
  ],
};

/**
 * Generic industry words that appear many times in Product Brain copy.
 * Cap brain hits so volume cannot alone lock a profile for an entire series.
 */
const GENERIC_INDUSTRY_KEYWORDS = new Set([
  "content",
  "marketing",
  "agency",
  "consulting",
  "saas",
  "software",
  "platform",
]);

/** Max contribution of one generic keyword from Product Brain corpus. */
const BRAIN_GENERIC_HIT_CAP = 1;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function collectBrainCorpus(ctx: VisualProfileProjectContext): string {
  const parts: string[] = [];

  if (ctx.goalType?.trim()) parts.push(ctx.goalType.trim().toLowerCase());

  const tone = ctx.toneOfVoice;
  if (typeof tone === "string") {
    parts.push(tone.trim().toLowerCase());
  } else {
    const rec = asRecord(tone);
    if (rec) {
      for (const key of ["style", "tone", "voice", "summary"]) {
        const v = rec[key];
        if (typeof v === "string" && v.trim()) parts.push(v.trim().toLowerCase());
      }
      const notes = rec.notes;
      if (Array.isArray(notes)) {
        for (const n of notes) {
          if (typeof n === "string" && n.trim()) parts.push(n.trim().toLowerCase());
        }
      }
    }
  }

  const audience = ctx.targetAudience;
  if (typeof audience === "string") {
    parts.push(audience.trim().toLowerCase());
  } else {
    const rec = asRecord(audience);
    if (rec) {
      for (const key of ["description", "summary", "primary"]) {
        const v = rec[key];
        if (typeof v === "string" && v.trim()) parts.push(v.trim().toLowerCase());
      }
      const segments = rec.segments;
      if (Array.isArray(segments)) {
        for (const seg of segments) {
          if (typeof seg === "string" && seg.trim()) {
            parts.push(seg.trim().toLowerCase());
          } else {
            const s = asRecord(seg);
            const label =
              (typeof s?.name === "string" && s.name.trim() ? s.name : null) ||
              (typeof s?.label === "string" && s.label.trim() ? s.label : null) ||
              (typeof s?.description === "string" && s.description.trim()
                ? s.description
                : null);
            if (label) parts.push(label.trim().toLowerCase());
          }
        }
      }
    }
  }

  for (const s of ctx.productStrengths ?? []) {
    if (typeof s === "string" && s.trim()) parts.push(s.trim().toLowerCase());
  }
  for (const p of ctx.productIs ?? []) {
    if (typeof p === "string" && p.trim()) parts.push(p.trim().toLowerCase());
  }

  const knowledge = asRecord(ctx.knowledge);
  const positioning = knowledge?.positioning;
  if (typeof positioning === "string" && positioning.trim()) {
    parts.push(positioning.trim().toLowerCase());
  } else if (asRecord(positioning)) {
    const pos = asRecord(positioning)!;
    for (const key of ["statement", "summary", "tagline"]) {
      const v = pos[key];
      if (typeof v === "string" && v.trim()) parts.push(v.trim().toLowerCase());
    }
  }

  return parts.join(" ");
}

function collectPackageCorpus(ctx: VisualProfileProjectContext): string {
  const pkg = ctx.packageSignals;
  if (!pkg) return "";
  const parts: string[] = [];
  if (pkg.funnelStage?.trim()) parts.push(pkg.funnelStage.trim().toLowerCase());
  if (pkg.topic?.trim()) parts.push(pkg.topic.trim().toLowerCase());
  if (pkg.angle?.trim()) parts.push(pkg.angle.trim().toLowerCase());
  if (pkg.creativeMode?.trim()) parts.push(pkg.creativeMode.trim().toLowerCase());
  if (pkg.primaryMeaningCarrier?.trim()) {
    parts.push(pkg.primaryMeaningCarrier.trim().toLowerCase());
  }
  return parts.join(" ");
}

function scoreKeywordHits(corpus: string, keyword: string): number {
  if (!keyword.trim() || !corpus) return 0;
  const k = keyword.trim().toLowerCase();
  if (k.includes(" ")) {
    return corpus.includes(k) ? 2 : 0;
  }
  const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
  const matches = corpus.match(re);
  return matches ? matches.length : 0;
}

function brainKeywordContribution(keyword: string, rawHits: number): number {
  if (rawHits <= 0) return 0;
  if (GENERIC_INDUSTRY_KEYWORDS.has(keyword.trim().toLowerCase())) {
    return Math.min(rawHits, BRAIN_GENERIC_HIT_CAP);
  }
  return rawHits;
}

function emptyScores(): Record<VisualProfile, number> {
  return Object.fromEntries(VISUAL_PROFILES.map((p) => [p, 0])) as Record<
    VisualProfile,
    number
  >;
}

function bump(
  scores: Record<VisualProfile, number>,
  reasons: string[],
  profile: VisualProfile,
  pts: number,
  reason: string,
): void {
  if (pts === 0) return;
  scores[profile] += pts;
  if (reasons.length < 14) {
    reasons.push(`${profile}:${reason}(+${pts})`);
  }
}

/** Funnel / mode / carrier bumps — package feel, not company category. */
function applyPackageSemanticBumps(
  ctx: VisualProfileProjectContext,
  scores: Record<VisualProfile, number>,
  reasons: string[],
): void {
  const pkg = ctx.packageSignals;
  if (!pkg) return;

  const funnel = (pkg.funnelStage ?? "").trim().toLowerCase();
  if (funnel === "awareness") {
    bump(scores, reasons, "NATURAL", 1, "funnel_awareness");
    bump(scores, reasons, "EDITORIAL", 1, "funnel_awareness");
  } else if (funnel === "problem_aware") {
    bump(scores, reasons, "NATURAL", 2, "funnel_problem");
    bump(scores, reasons, "EDITORIAL", 1, "funnel_problem");
  } else if (funnel === "solution_aware") {
    bump(scores, reasons, "MINIMAL", 1, "funnel_solution");
    bump(scores, reasons, "EDITORIAL", 1, "funnel_solution");
    bump(scores, reasons, "PREMIUM", 1, "funnel_solution");
  } else if (funnel === "conversion") {
    bump(scores, reasons, "MINIMAL", 1, "funnel_conversion");
    bump(scores, reasons, "PREMIUM", 1, "funnel_conversion");
    bump(scores, reasons, "BOLD", 1, "funnel_conversion");
  }

  const mode = (pkg.creativeMode ?? "").trim().toLowerCase();
  switch (mode) {
    case "story":
    case "humor":
      bump(scores, reasons, "NATURAL", 3, `mode_${mode}`);
      break;
    case "observation":
      bump(scores, reasons, "EDITORIAL", 2, "mode_observation");
      bump(scores, reasons, "NATURAL", 1, "mode_observation");
      break;
    case "shock":
    case "contrarian":
      bump(scores, reasons, "BOLD", 3, `mode_${mode}`);
      bump(scores, reasons, "EDITORIAL", 1, `mode_${mode}`);
      break;
    case "myth_buster":
      bump(scores, reasons, "EDITORIAL", 2, "mode_myth_buster");
      bump(scores, reasons, "BOLD", 1, "mode_myth_buster");
      break;
    case "mistake":
      bump(scores, reasons, "NATURAL", 2, "mode_mistake");
      bump(scores, reasons, "MINIMAL", 1, "mode_mistake");
      break;
    case "comparison":
      bump(scores, reasons, "MINIMAL", 2, "mode_comparison");
      bump(scores, reasons, "BOLD", 1, "mode_comparison");
      break;
    case "micro_case":
      bump(scores, reasons, "PREMIUM", 2, "mode_micro_case");
      bump(scores, reasons, "NATURAL", 1, "mode_micro_case");
      break;
    case "standard":
      bump(scores, reasons, "MINIMAL", 2, "mode_standard");
      break;
    default:
      break;
  }

  const carrier = (pkg.primaryMeaningCarrier ?? "").trim().toLowerCase();
  switch (carrier) {
    case "human":
      bump(scores, reasons, "NATURAL", 2, "carrier_human");
      break;
    case "place":
      bump(scores, reasons, "NATURAL", 1, "carrier_place");
      break;
    case "process":
      bump(scores, reasons, "MINIMAL", 2, "carrier_process");
      break;
    case "object":
      bump(scores, reasons, "MINIMAL", 1, "carrier_object");
      break;
    case "product":
      bump(scores, reasons, "MINIMAL", 1, "carrier_product");
      bump(scores, reasons, "PREMIUM", 1, "carrier_product");
      break;
    case "comparison":
      bump(scores, reasons, "BOLD", 2, "carrier_comparison");
      break;
    case "transformation":
      bump(scores, reasons, "BOLD", 1, "carrier_transformation");
      bump(scores, reasons, "PREMIUM", 1, "carrier_transformation");
      break;
    case "metaphor":
      bump(scores, reasons, "EDITORIAL", 2, "carrier_metaphor");
      break;
    default:
      break;
  }
}

export interface VisualProfileAutoScoreResult {
  profile: VisualProfile;
  scores: Record<VisualProfile, number>;
  reasons: string[];
}

/**
 * Visual Profile v3 — Product Brain baseline (capped generics) + package feel.
 * Deterministic. No rotation, quotas, or randomness.
 */
export function scoreVisualProfileAuto(
  ctx: VisualProfileProjectContext,
): VisualProfileAutoScoreResult {
  const brainCorpus = collectBrainCorpus(ctx);
  const packageCorpus = collectPackageCorpus(ctx);
  const scores = emptyScores();
  const reasons: string[] = [];

  for (const profile of VISUAL_PROFILES) {
    for (const keyword of PROFILE_KEYWORDS[profile]) {
      const raw = scoreKeywordHits(brainCorpus, keyword);
      const hits = brainKeywordContribution(keyword, raw);
      if (hits > 0) {
        scores[profile] += hits;
        if (reasons.length < 14) {
          const capped =
            raw > hits ? `${keyword}(+${hits},capped_from_${raw})` : `${keyword}(+${hits})`;
          reasons.push(`${profile}:brain_${capped}`);
        }
      }
    }
  }

  // Package topic/angle text — same lexicon, no generic brain-style volume cap
  // beyond natural short text length; still cap generics at 2 so one word cannot dominate.
  for (const profile of VISUAL_PROFILES) {
    for (const keyword of PROFILE_KEYWORDS[profile]) {
      const raw = scoreKeywordHits(packageCorpus, keyword);
      if (raw <= 0) continue;
      const hits = GENERIC_INDUSTRY_KEYWORDS.has(keyword)
        ? Math.min(raw, 2)
        : raw;
      if (hits > 0) {
        scores[profile] += hits;
        if (reasons.length < 14) {
          reasons.push(`${profile}:pkg_${keyword}(+${hits})`);
        }
      }
    }
  }

  applyPackageSemanticBumps(ctx, scores, reasons);

  let best: VisualProfile = DEFAULT_VISUAL_PROFILE;
  let bestScore = -1;
  for (const profile of VISUAL_PROFILES) {
    const s = scores[profile];
    if (s > bestScore) {
      bestScore = s;
      best = profile;
    }
  }

  if (bestScore <= 0) {
    return {
      profile: DEFAULT_VISUAL_PROFILE,
      scores,
      reasons: reasons.length > 0 ? reasons : ["fallback:no_signal→NATURAL"],
    };
  }

  const tied = VISUAL_PROFILES.filter((p) => scores[p] === bestScore);
  if (tied.length > 1) {
    best = tied[0] ?? DEFAULT_VISUAL_PROFILE;
    reasons.push(`tie:${tied.join("|")}→${best}`);
  }

  return { profile: best, scores, reasons };
}
