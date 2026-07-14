export const VISUAL_MEDIA = [
  "PHOTOGRAPHIC",
  "CLEAN_ILLUSTRATION",
  "SOFT_3D",
  "GRAPHIC_COLLAGE",
  "TECHNICAL_BLUEPRINT",
] as const;

export type VisualMedium = (typeof VISUAL_MEDIA)[number];

export const VISUAL_MEDIUM_VERSION = "visual-medium@1";

export const VISUAL_MEDIUM_UI_AUTO = "auto";

export type VisualMediumUiChoice =
  | typeof VISUAL_MEDIUM_UI_AUTO
  | VisualMedium;

const MEDIUM_SET = new Set<string>(VISUAL_MEDIA);

export function isVisualMedium(value: string): value is VisualMedium {
  return MEDIUM_SET.has(value);
}

export function parseVisualMedium(value: unknown): VisualMedium | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return isVisualMedium(normalized) ? normalized : null;
}

export function parseVisualMediumUiChoice(
  value: unknown,
): VisualMediumUiChoice | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return VISUAL_MEDIUM_UI_AUTO;
  if (trimmed.toLowerCase() === VISUAL_MEDIUM_UI_AUTO) {
    return VISUAL_MEDIUM_UI_AUTO;
  }
  const medium = parseVisualMedium(trimmed);
  return medium ?? null;
}

export function visualMediumOverrideFromKnowledge(
  knowledge: unknown,
): VisualMediumUiChoice {
  const root =
    knowledge && typeof knowledge === "object" && !Array.isArray(knowledge)
      ? (knowledge as Record<string, unknown>)
      : null;
  const presentation =
    root?.presentation &&
    typeof root.presentation === "object" &&
    !Array.isArray(root.presentation)
      ? (root.presentation as Record<string, unknown>)
      : null;
  const raw = presentation?.visual_medium;
  if (typeof raw !== "string" || !raw.trim()) return VISUAL_MEDIUM_UI_AUTO;
  return parseVisualMediumUiChoice(raw) ?? VISUAL_MEDIUM_UI_AUTO;
}

/** Legacy packages and jobs without a stored medium. */
export const DEFAULT_VISUAL_MEDIUM: VisualMedium = "PHOTOGRAPHIC";
