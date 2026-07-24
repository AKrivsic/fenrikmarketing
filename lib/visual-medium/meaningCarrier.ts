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
