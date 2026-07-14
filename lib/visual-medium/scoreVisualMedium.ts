import type { VisualMedium } from "@/lib/visual-medium/visualMedium";
import type { MeaningCarrier } from "@/lib/visual-narrative/types";
import type { VisualProfile } from "@/lib/visual-profile/visualProfile";
import type { CreativeIdentity } from "@/lib/creative-identity/types";
import type { FunnelStage } from "@/lib/ai/types";
import type { Project } from "@/lib/supabase/types";
import { normalizePainPoints } from "@/lib/ai/prompts/context";

export interface VisualMediumScoreContext {
  project: Project;
  funnelStage: FunnelStage;
  visualProfile: VisualProfile;
  primaryCarrier: MeaningCarrier | null;
  identity: CreativeIdentity | null;
  recentMediumCounts: Record<string, number>;
}

function brainBlob(project: Project): string {
  return [
    (project.type ?? "").toLowerCase(),
    ...(project.product_is ?? []),
    ...(project.product_strengths ?? []),
    ...normalizePainPoints(project),
  ]
    .join(" ")
    .toLowerCase();
}

function scoreKeywordHits(corpus: string, keyword: string): number {
  const k = keyword.trim().toLowerCase();
  if (!k || !corpus) return 0;
  if (k.includes(" ")) return corpus.includes(k) ? 2 : 0;
  const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
  return corpus.match(re)?.length ?? 0;
}

export interface VisualMediumAutoScoreResult {
  medium: VisualMedium;
  scores: Record<VisualMedium, number>;
  reasons: string[];
}

export function scoreVisualMediumAuto(
  ctx: VisualMediumScoreContext,
): VisualMediumAutoScoreResult {
  const corpus = brainBlob(ctx.project);
  const scores = Object.fromEntries(
    (["PHOTOGRAPHIC", "CLEAN_ILLUSTRATION", "SOFT_3D", "GRAPHIC_COLLAGE", "TECHNICAL_BLUEPRINT"] as const).map(
      (m) => [m, 0],
    ),
  ) as Record<VisualMedium, number>;
  const reasons: string[] = [];

  const bump = (medium: VisualMedium, pts: number, reason: string) => {
    scores[medium] += pts;
    if (reasons.length < 12) reasons.push(`${medium}:${reason}(+${pts})`);
  };

  // Product / audience world
  if (/\b(dental|clinic|patient|restaurant|dining|hotel|hospitality|salon|spa)\b/.test(corpus)) {
    bump("PHOTOGRAPHIC", 4, "service_location");
  }
  if (/\b(student|teacher|campus|study|revision|education)\b/.test(corpus)) {
    bump("PHOTOGRAPHIC", 1, "education_life");
    bump("CLEAN_ILLUSTRATION", 2, "education_explain");
  }
  if (/\b(architecture|blueprint|requirements|flow|diagram|specification|planning|system)\b/.test(corpus)) {
    bump("TECHNICAL_BLUEPRINT", 3, "planning_system");
    bump("CLEAN_ILLUSTRATION", 1, "structured_idea");
  }
  if (/\b(mobile app|app store|module|platform|automation|pipeline)\b/.test(corpus)) {
    bump("SOFT_3D", 2, "digital_product");
    bump("CLEAN_ILLUSTRATION", 1, "abstract_workflow");
  }
  if (/\b(review|compare|competitor|fragment|scatter|overload)\b/.test(corpus)) {
    bump("GRAPHIC_COLLAGE", 2, "comparison_fragment");
  }

  // Visual Narrative carrier
  const carrier = ctx.primaryCarrier;
  if (carrier === "human") bump("PHOTOGRAPHIC", 3, "carrier_human");
  if (carrier === "place") bump("PHOTOGRAPHIC", 2, "carrier_place");
  if (carrier === "object" || carrier === "process") {
    bump("CLEAN_ILLUSTRATION", 2, "carrier_object_process");
    bump("TECHNICAL_BLUEPRINT", 1, "carrier_process");
  }
  if (carrier === "product" || carrier === "transformation") {
    bump("SOFT_3D", 2, "carrier_product");
    bump("CLEAN_ILLUSTRATION", 1, "carrier_transform");
  }
  if (carrier === "comparison") bump("GRAPHIC_COLLAGE", 3, "carrier_comparison");
  if (carrier === "metaphor") {
    bump("CLEAN_ILLUSTRATION", 2, "carrier_metaphor");
    bump("GRAPHIC_COLLAGE", 1, "carrier_metaphor");
  }

  // Creative Identity staging hints
  const hp = ctx.identity?.option_ids.human_presence;
  if (hp === "hands_only" || hp === "no_people") {
    bump("CLEAN_ILLUSTRATION", 2, "identity_no_face");
    bump("TECHNICAL_BLUEPRINT", 1, "identity_objects");
    scores.PHOTOGRAPHIC -= 1;
  }

  // Visual profile nudge (treatment, not medium lock)
  if (ctx.visualProfile === "BOLD") bump("GRAPHIC_COLLAGE", 1, "profile_bold");
  if (ctx.visualProfile === "MINIMAL") bump("CLEAN_ILLUSTRATION", 1, "profile_minimal");

  // SaaS alone should NOT auto-lock photographic
  const saasHits = scoreKeywordHits(corpus, "saas") + scoreKeywordHits(corpus, "software");
  if (saasHits > 0 && carrier !== "human" && carrier !== "place") {
    bump("CLEAN_ILLUSTRATION", 1, "saas_abstract");
    bump("TECHNICAL_BLUEPRINT", 1, "saas_system");
  }

  // Funnel
  if (ctx.funnelStage === "solution_aware" || ctx.funnelStage === "conversion") {
    bump("SOFT_3D", 1, "funnel_solution");
  }

  // Series medium repetition — soft penalty, not quota
  for (const [medium, count] of Object.entries(ctx.recentMediumCounts)) {
    const m = medium.toUpperCase();
    if (!isVisualMediumKey(m)) continue;
    if (count >= 3) {
      scores[m as VisualMedium] -= 2;
      if (reasons.length < 12) reasons.push(`${m}:recent_repeat(-2)`);
    } else if (count >= 2) {
      scores[m as VisualMedium] -= 1;
    }
  }

  for (const m of Object.keys(scores) as VisualMedium[]) {
    if (scores[m] < 0) scores[m] = 0;
  }

  let best: VisualMedium = "PHOTOGRAPHIC";
  let bestScore = -1;
  for (const m of Object.keys(scores) as VisualMedium[]) {
    if (scores[m] > bestScore) {
      bestScore = scores[m];
      best = m;
    }
  }

  if (bestScore <= 0) {
    return {
      medium: "PHOTOGRAPHIC",
      scores,
      reasons: reasons.length ? reasons : ["fallback:neutral→PHOTOGRAPHIC"],
    };
  }

  // Close-score diversity: if second place within 2 points and first was overused, prefer second
  const sorted = (Object.keys(scores) as VisualMedium[]).sort(
    (a, b) => scores[b] - scores[a],
  );
  const runner = sorted[1];
  if (
    runner &&
    scores[best] - scores[runner] <= 2 &&
    (ctx.recentMediumCounts[best] ?? 0) >= 2 &&
    (ctx.recentMediumCounts[runner] ?? 0) < (ctx.recentMediumCounts[best] ?? 0)
  ) {
    reasons.push(`diversity:${best}→${runner}(close_score)`);
    best = runner;
  }

  return { medium: best, scores, reasons };
}

function isVisualMediumKey(m: string): m is VisualMedium {
  return (
    m === "PHOTOGRAPHIC" ||
    m === "CLEAN_ILLUSTRATION" ||
    m === "SOFT_3D" ||
    m === "GRAPHIC_COLLAGE" ||
    m === "TECHNICAL_BLUEPRINT"
  );
}
