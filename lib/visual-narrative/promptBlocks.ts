import {
  VISUAL_NARRATIVE_VERSION,
  type VisualNarrativePlan,
} from "@/lib/visual-narrative/types";
import { dominantMotifs } from "@/lib/visual-narrative/motifMemory";

export const VISUAL_NARRATIVE_PROMPT_HEADER = "VISUAL NARRATIVE";

export function buildVisualNarrativePromptBlock(
  plan: VisualNarrativePlan,
): string {
  const dominant = dominantMotifs(plan.recent_motif_counts, 3);
  const motifLines =
    dominant.length > 0
      ? [
          "Recent series packages leaned heavily on these visual motifs (guidance only — NOT bans):",
          ...dominant.map(
            (m) =>
              `- ${m} (appeared ~${plan.recent_motif_counts[m] ?? 0} times in recent context)`,
          ),
          "When another subject would communicate the idea equally well, prefer variety over repeating these defaults (especially laptop-at-desk as the automatic answer).",
        ]
      : [
          "No strong motif repetition in recent series context yet — still avoid defaulting to generic founder-at-laptop unless the idea truly requires it.",
        ];

  return [
    `${VISUAL_NARRATIVE_PROMPT_HEADER} (${VISUAL_NARRATIVE_VERSION} — how meaning is carried, not lighting adjectives):`,
    "",
    "Think like a creative director, not a literal illustrator.",
    "For each beat ask: \"What image communicates this IDEA best?\" — NOT \"What image illustrates this sentence?\"",
    "",
    `Primary meaning carrier for THIS package: ${plan.primary_meaning_carrier.toUpperCase()}`,
    `Subject focus: ${plan.subject_focus}`,
    `You may mix supporting carriers across beats: ${plan.supporting_carriers.join(", ")}`,
    "",
    "Rules:",
    "- The primary carrier guides the PACKAGE; individual beats may shift when the story requires it.",
    "- Use environmental storytelling, object state changes, process residue, and grounded metaphor when they explain faster than a person at a computer.",
    "- Laptops, phones, and desks are allowed when they are the honest best choice — they are NOT the default shortcut.",
    "- Stay believable and on-brand; avoid surreal or fantasy unless the strategy angle is explicitly abstract.",
    "- CREATIVE IDENTITY (below) controls staging continuity — lighting, mood, color — within the world you choose here.",
    "",
    "Product visual world (from PROJECT BRAIN):",
    ...plan.product_world_hints.map((h) => `- ${h}`),
    "",
    ...motifLines,
    "",
    "Solution / payoff beats (when the story reaches the product):",
    "1. High-quality project asset in a compatible framed insert (when SMART ASSET USAGE allows)",
    "2. Product interaction in context (hands, device, environment — still no readable UI text in AI stills)",
    "3. Meaningful product environment (where this tool is actually used)",
    "4. AI interpretation only when 1–3 cannot serve the beat — never force assets, never lower quality",
  ].join("\n");
}

export function visualNarrativeFieldsForPersistence(
  plan: VisualNarrativePlan,
): Record<string, unknown> {
  return {
    visual_narrative: {
      version: plan.version,
      key: plan.key,
      primary_meaning_carrier: plan.primary_meaning_carrier,
      subject_focus: plan.subject_focus,
      supporting_carriers: plan.supporting_carriers,
      product_world_hints: plan.product_world_hints,
      recent_motif_counts: plan.recent_motif_counts,
    },
  };
}

export function readVisualNarrativeKeyFromPackageBrief(
  brief: Record<string, unknown> | null | undefined,
): string | null {
  if (!brief) return null;
  const pg = brief.presentation_generation;
  if (!pg || typeof pg !== "object" || Array.isArray(pg)) return null;
  const vn = (pg as Record<string, unknown>).visual_narrative;
  if (!vn || typeof vn !== "object" || Array.isArray(vn)) return null;
  const key = (vn as Record<string, unknown>).key;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}
