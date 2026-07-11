import type { Json } from "@/lib/supabase/types";
import {
  parseVisualProfileUiChoice,
  VISUAL_PROFILE_UI_AUTO,
  type VisualProfileUiChoice,
} from "@/lib/visual-profile/visualProfile";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function visualProfileUiFromKnowledge(
  knowledge: Json | null | undefined,
): VisualProfileUiChoice {
  const root = asRecord(knowledge);
  const presentation = asRecord(root?.presentation);
  const raw = presentation?.visual_profile;
  if (typeof raw !== "string" || !raw.trim()) return VISUAL_PROFILE_UI_AUTO;
  return parseVisualProfileUiChoice(raw) ?? VISUAL_PROFILE_UI_AUTO;
}

export function validateVisualProfileSave(input: {
  visualProfileSelection: string;
}):
  | { ok: true; choice: VisualProfileUiChoice }
  | { ok: false; error: string } {
  const choice = parseVisualProfileUiChoice(input.visualProfileSelection.trim());
  if (!choice) {
    return { ok: false, error: "Unsupported visual profile selection." };
  }
  return { ok: true, choice };
}

export function mergeVisualProfileIntoKnowledge(
  existingKnowledge: Json,
  choice: VisualProfileUiChoice,
): Json {
  const root = asRecord(existingKnowledge) ?? {};
  const prev = asRecord(root.presentation) ?? {};
  const next: Record<string, unknown> = { ...prev };

  if (choice === VISUAL_PROFILE_UI_AUTO) {
    delete next.visual_profile;
  } else {
    next.visual_profile = choice;
  }

  const out = { ...root, presentation: next as Json };
  return out as Json;
}

export type { VisualProfileUiChoice };

export const VISUAL_PROFILE_UI_OPTIONS: readonly {
  value: VisualProfileUiChoice;
  label: string;
}[] = [
  { value: VISUAL_PROFILE_UI_AUTO, label: "Automatic" },
  { value: "NATURAL", label: "Natural" },
  { value: "MINIMAL", label: "Minimal" },
  { value: "BOLD", label: "Bold" },
  { value: "EDITORIAL", label: "Editorial" },
  { value: "PREMIUM", label: "Premium" },
];
