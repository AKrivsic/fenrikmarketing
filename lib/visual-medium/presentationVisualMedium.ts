import type { Json } from "@/lib/supabase/types";
import {
  parseVisualMediumUiChoice,
  VISUAL_MEDIUM_UI_AUTO,
  type VisualMediumUiChoice,
} from "@/lib/visual-medium/visualMedium";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function visualMediumUiFromKnowledge(
  knowledge: Json | null | undefined,
): VisualMediumUiChoice {
  const root = asRecord(knowledge);
  const presentation = asRecord(root?.presentation);
  const raw = presentation?.visual_medium;
  if (typeof raw !== "string" || !raw.trim()) return VISUAL_MEDIUM_UI_AUTO;
  return parseVisualMediumUiChoice(raw) ?? VISUAL_MEDIUM_UI_AUTO;
}

export function validateVisualMediumSave(input: {
  visualMediumSelection: string;
}):
  | { ok: true; choice: VisualMediumUiChoice }
  | { ok: false; error: string } {
  const choice = parseVisualMediumUiChoice(input.visualMediumSelection.trim());
  if (!choice) {
    return { ok: false, error: "Unsupported visual medium selection." };
  }
  return { ok: true, choice };
}

export function mergeVisualMediumIntoKnowledge(
  existingKnowledge: Json,
  choice: VisualMediumUiChoice,
): Json {
  const root = asRecord(existingKnowledge) ?? {};
  const prev = asRecord(root.presentation) ?? {};
  const next: Record<string, unknown> = { ...prev };

  if (choice === VISUAL_MEDIUM_UI_AUTO) {
    delete next.visual_medium;
  } else {
    next.visual_medium = choice;
  }

  return { ...root, presentation: next as Json } as Json;
}

export const VISUAL_MEDIUM_UI_OPTIONS: readonly {
  value: VisualMediumUiChoice;
  label: string;
}[] = [
  { value: VISUAL_MEDIUM_UI_AUTO, label: "Automatic (recommended)" },
  { value: "PHOTOGRAPHIC", label: "Photographic" },
  { value: "CLEAN_ILLUSTRATION", label: "Clean Illustration" },
  { value: "SOFT_3D", label: "Soft 3D" },
  { value: "GRAPHIC_COLLAGE", label: "Graphic Collage" },
  { value: "TECHNICAL_BLUEPRINT", label: "Technical Blueprint" },
];

export type { VisualMediumUiChoice };
