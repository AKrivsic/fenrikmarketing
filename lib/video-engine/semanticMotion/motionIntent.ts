export const MOTION_INTENTS = [
  "ATTENTION",
  "REVEAL",
  "EXPLAIN",
  "EMPHASIS",
  "HOLD",
  "CLOSE",
] as const;

export type MotionIntent = (typeof MOTION_INTENTS)[number];

export const MOTION_INTENSITIES = ["LOW", "MEDIUM"] as const;

export type MotionIntensity = (typeof MOTION_INTENSITIES)[number];

export const SEMANTIC_MOTION_VERSION = "semantic-motion@2";

export function isMotionIntent(value: string): value is MotionIntent {
  return (MOTION_INTENTS as readonly string[]).includes(value);
}

export function parseMotionIntent(value: unknown): MotionIntent | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return isMotionIntent(normalized) ? normalized : null;
}

export function parseMotionIntensity(value: unknown): MotionIntensity | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return normalized === "LOW" || normalized === "MEDIUM" ? normalized : null;
}
