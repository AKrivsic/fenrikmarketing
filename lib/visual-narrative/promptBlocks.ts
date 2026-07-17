import {
  VISUAL_NARRATIVE_VERSION,
  type VisualNarrativePlan,
} from "@/lib/visual-narrative/types";
import { dominantMotifs } from "@/lib/visual-narrative/motifMemory";
import { VISUAL_STORY_DIRECTOR_VERSION } from "@/lib/visual-narrative/visualStoryDirector";

export const VISUAL_NARRATIVE_PROMPT_HEADER = "VISUAL NARRATIVE";
export const VISUAL_STORY_DIRECTOR_PROMPT_HEADER = "VISUAL STORY DIRECTOR";

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
    `${VISUAL_STORY_DIRECTOR_PROMPT_HEADER} (${plan.director_version ?? VISUAL_STORY_DIRECTOR_VERSION}):`,
    "Think like a FILM DIRECTOR, not an illustration generator.",
    'Before every beat ask: "What is actually happening?" — THEN "What object could represent this?"',
    "Visual Story Test (opening especially): if a stranger sees the image for one second with no explanation, " +
      "will the emotional relationship to the spoken idea feel obvious? If not, reject and film a clearer situation.",
    "",
    `Storytelling mode: ${plan.storytelling_mode ?? "situation_first"}`,
    `Situation framing: ${plan.preferred_situation_framing}`,
    "Metaphor policy: immediately understandable preferred; one mental step acceptable; " +
      "anything that requires the prompt to explain is REJECTED (paper boat = visitor, closed notebook = website knowledge, " +
      "abstract card = embed code, floating symbol = idea).",
    "Originality is unexpected-but-understandable — NOT abstraction, NOT randomness, NOT unusual-for-its-own-sake.",
    "Do NOT return to corporate clichés (dashboards, calm desks, sticky notes, generic meetings) unless genuinely strongest.",
    "Do NOT invent visual riddles that look beautiful but need a caption.",
    "",
    "GOOD (situation / clear metaphor): robot doing the work; cemetery of forgotten brands; person choosing family over work; " +
      "empty restaurant; banana photographed for a post; customer walking away.",
    "BAD (abstract riddle): paper boat; random notebook; generic workshop prop collage; abstract card; floating object; " +
      "beautiful unrelated architecture.",
    "",
    `Primary meaning carrier for THIS package: ${plan.primary_meaning_carrier.toUpperCase()}`,
    `Subject focus: ${plan.subject_focus}`,
    `You may mix supporting carriers across beats: ${plan.supporting_carriers.join(", ")}`,
    "",
    "Rules:",
    "- The primary carrier guides the PACKAGE; individual beats may shift when the story requires it.",
    "- Prefer human situations and readable events over lone symbolic objects.",
    "- Laptops, phones, and desks are allowed when they are the honest best choice — they are NOT the default shortcut.",
    "- Stay believable and on-brand; grounded metaphor is welcome when instantly readable.",
    "- CREATIVE IDENTITY controls staging continuity — lighting, mood, color — within the world you choose here. " +
      "Identity is NOT permission to turn a digital product into a physical storefront or craft workshop riddle.",
    "- If Attention chose dilemma / humor / curiosity / role reversal, film a situation that expresses that mechanism — " +
      "do not replace it with a symbolic object.",
    "",
    "Product visual world (from PROJECT BRAIN — meaning, not forced scenery):",
    ...plan.product_world_hints.map((h) => `- ${h}`),
    "",
    ...motifLines,
    "",
    "Solution / payoff beats (when the story reaches the product):",
    "1. High-quality project asset in a compatible framed insert (when SMART ASSET USAGE allows)",
    "2. Product interaction in a clear use situation (still no readable UI text in AI stills)",
    "3. Meaningful product environment (where this tool is actually used)",
    "4. AI interpretation only when 1–3 cannot serve the beat — never force assets, never lower quality, never abstract cubes",
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
      storytelling_mode: plan.storytelling_mode,
      director_version: plan.director_version,
      preferred_situation_framing: plan.preferred_situation_framing,
      reject_abstract_riddles: plan.reject_abstract_riddles,
      metaphor_policy: plan.metaphor_policy,
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
