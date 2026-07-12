export const VISUAL_PROFILES = [
  "NATURAL",
  "MINIMAL",
  "BOLD",
  "EDITORIAL",
  "PREMIUM",
] as const;

export type VisualProfile = (typeof VISUAL_PROFILES)[number];

export const VISUAL_PROFILE_VERSION = "visual-profile@2";

export const VISUAL_PROFILE_UI_AUTO = "auto";

export type VisualProfileUiChoice =
  | typeof VISUAL_PROFILE_UI_AUTO
  | VisualProfile;

const PROFILE_SET = new Set<string>(VISUAL_PROFILES);

export function isVisualProfile(value: string): value is VisualProfile {
  return PROFILE_SET.has(value);
}

export function parseVisualProfile(value: unknown): VisualProfile | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return isVisualProfile(normalized) ? normalized : null;
}

export function parseVisualProfileUiChoice(
  value: unknown,
): VisualProfileUiChoice | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return VISUAL_PROFILE_UI_AUTO;
  if (trimmed.toLowerCase() === VISUAL_PROFILE_UI_AUTO) {
    return VISUAL_PROFILE_UI_AUTO;
  }
  const profile = parseVisualProfile(trimmed);
  return profile ?? null;
}

export function visualProfileOverrideFromKnowledge(
  knowledge: unknown,
): VisualProfileUiChoice {
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
  const raw = presentation?.visual_profile;
  if (typeof raw !== "string" || !raw.trim()) return VISUAL_PROFILE_UI_AUTO;
  return parseVisualProfileUiChoice(raw) ?? VISUAL_PROFILE_UI_AUTO;
}

export const DEFAULT_VISUAL_PROFILE: VisualProfile = "NATURAL";
