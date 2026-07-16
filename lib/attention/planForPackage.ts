import type { Project } from "@/lib/supabase/types";
import type { SeriesCreativeContext } from "@/lib/series/loadSeriesCreativeContext";
import { ATTENTION_VERSION, type AttentionPlan } from "@/lib/attention/types";
import {
  buildAttentionSeed,
  resolveAttentionMechanism,
} from "@/lib/attention/resolveAttention";
import { runOriginalityPass } from "@/lib/attention/originalityPass";
import { buildOpeningContract } from "@/lib/attention/openingContract";
import { buildDeliveryArc } from "@/lib/attention/deliveryArc";
import { planSfx } from "@/lib/attention/sfxPlan";
import {
  attentionFieldsForPersistence,
  buildAttentionPromptBlock,
} from "@/lib/attention/promptBlocks";

function audienceSummary(project: Project): string {
  const ta = project.target_audience;
  if (!ta || typeof ta !== "object" || Array.isArray(ta)) return "";
  const rec = ta as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["summary", "description", "who", "persona"]) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  }
  if (Array.isArray(rec.segments)) {
    for (const s of rec.segments) {
      if (typeof s === "string" && s.trim()) parts.push(s.trim());
    }
  }
  return parts.join(" ");
}

function recentMechanismsFromSeries(
  series: SeriesCreativeContext | null | undefined,
): string[] {
  if (!series) return [];
  const out: string[] = [];
  for (const fp of series.fingerprints) {
    const m = fp.attention_mechanism;
    if (typeof m === "string" && m.trim()) out.push(m.trim());
  }
  return out;
}

function recentSfxFromSeries(
  series: SeriesCreativeContext | null | undefined,
): string[] {
  if (!series) return [];
  const out: string[] = [];
  for (const fp of series.fingerprints) {
    const c = fp.sfx_category;
    if (typeof c === "string" && c.trim()) out.push(c.trim());
  }
  return out;
}

function motifFromVisual(visual: string): string {
  const words = visual
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6);
  return words.join("_") || "opening_visual";
}

export function planAttentionForPackage(args: {
  project: Project;
  projectId: string;
  strategyItemId: string;
  packageIndex: number | null;
  topic: string;
  angle: string | null | undefined;
  funnelStage: string;
  creativeMode: string;
  series?: SeriesCreativeContext | null;
  creativeSeedSalt?: string | null;
  requireVideo: boolean;
}): {
  plan: AttentionPlan | null;
  promptBlock: string;
  persistenceFields: Record<string, unknown>;
} {
  // Attention planning informs script + visuals; still useful for text-only
  // packages (hook/voiceover), so we do not early-exit on !requireVideo.
  const recentMechanisms = recentMechanismsFromSeries(args.series);
  const recentSfx = recentSfxFromSeries(args.series);

  const selection = resolveAttentionMechanism({
    projectId: args.projectId,
    strategyItemId: args.strategyItemId,
    packageIndex: args.packageIndex,
    topic: args.topic,
    angle: args.angle,
    funnelStage: args.funnelStage,
    creativeMode: args.creativeMode,
    painPoints: args.project.pain_points ?? [],
    productIs: args.project.product_is ?? [],
    audienceSummary: audienceSummary(args.project),
    recentMechanisms,
    recentSfxCategories: recentSfx,
    salt: args.creativeSeedSalt,
    source: args.creativeSeedSalt ? "regeneration" : "deterministic_v1",
  });

  const seed = buildAttentionSeed({
    projectId: args.projectId,
    strategyItemId: args.strategyItemId,
    packageIndex: args.packageIndex,
    topic: args.topic,
    angle: args.angle,
    funnelStage: args.funnelStage,
    creativeMode: args.creativeMode,
    painPoints: args.project.pain_points ?? [],
    productIs: args.project.product_is ?? [],
    salt: args.creativeSeedSalt,
  });

  const originality = runOriginalityPass({
    mechanism: selection.mechanism,
    topic: args.topic,
    angle: args.angle,
    painPoints: args.project.pain_points ?? [],
    productIs: args.project.product_is ?? [],
    audienceSummary: audienceSummary(args.project),
    industryHint: args.project.name,
    seed,
  });

  const opening = buildOpeningContract({
    mechanism: selection.mechanism,
    originality,
    seed,
  });

  const delivery_arc = buildDeliveryArc({
    mechanism: selection.mechanism,
    openingDelivery: opening.opening_delivery,
  });

  const sfx = args.requireVideo
    ? planSfx({
        mechanism: selection.mechanism,
        openingStructure: opening.opening_structure,
        seed,
        recentSfxCategories: recentSfx,
      })
    : {
        sfx_selected: false,
        sfx_category: null,
        sfx_timing_ms: null,
        sfx_reason: "text_only_package",
        sfx_source: "omitted_no_fit" as const,
        sfx_gain: 0,
        render_supported: false,
      };

  const plan: AttentionPlan = {
    version: ATTENTION_VERSION,
    attention_mechanism: selection.mechanism,
    attention_source: selection.source,
    attention_reasons: selection.reasons,
    originality,
    opening,
    delivery_arc,
    sfx,
    opening_visual_motif: motifFromVisual(originality.selected_visual_concept),
    opening_emotional_effect: originality.selected_emotional_effect,
    opening_structure: opening.opening_structure,
  };

  return {
    plan,
    promptBlock: buildAttentionPromptBlock(plan),
    persistenceFields: attentionFieldsForPersistence(plan),
  };
}
