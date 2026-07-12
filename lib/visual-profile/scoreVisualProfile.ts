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
  ],
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function collectCorpus(ctx: VisualProfileProjectContext): string {
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

export interface VisualProfileAutoScoreResult {
  profile: VisualProfile;
  scores: Record<VisualProfile, number>;
  reasons: string[];
}

export function scoreVisualProfileAuto(
  ctx: VisualProfileProjectContext,
): VisualProfileAutoScoreResult {
  const corpus = collectCorpus(ctx);
  const scores = Object.fromEntries(
    VISUAL_PROFILES.map((p) => [p, 0]),
  ) as Record<VisualProfile, number>;
  const reasons: string[] = [];

  for (const profile of VISUAL_PROFILES) {
    for (const keyword of PROFILE_KEYWORDS[profile]) {
      const hits = scoreKeywordHits(corpus, keyword);
      if (hits > 0) {
        scores[profile] += hits;
        if (reasons.length < 8) {
          reasons.push(`${profile}:${keyword}(+${hits})`);
        }
      }
    }
  }

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
