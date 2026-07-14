export const VISUAL_NARRATIVE_VERSION = "visual-narrative@1";

/** How the package primarily communicates meaning — not a render style. */
export const MEANING_CARRIERS = [
  "human",
  "object",
  "place",
  "process",
  "product",
  "comparison",
  "transformation",
  "metaphor",
] as const;

export type MeaningCarrier = (typeof MEANING_CARRIERS)[number];

export interface VisualNarrativePlan {
  version: typeof VISUAL_NARRATIVE_VERSION;
  primary_meaning_carrier: MeaningCarrier;
  /** Concrete subject direction for the model (not a fixed prop list). */
  subject_focus: string;
  /** Secondary carriers the model may mix across beats. */
  supporting_carriers: MeaningCarrier[];
  /** Product Brain–derived world hints (prompt-only). */
  product_world_hints: string[];
  /** Dominant motifs in recent series packages (counts, for diversification). */
  recent_motif_counts: Record<string, number>;
  /** Stable fingerprint for series de-duplication. */
  key: string;
}
