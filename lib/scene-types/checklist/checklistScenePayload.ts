import { z } from "zod";

export const CHECKLIST_ITEM_MARKER = z.enum(["check", "dot"]).optional();

export const checklistScenePayloadSchema = z.object({
  title: z.string().trim().max(80).optional(),
  items: z
    .array(z.string().trim().min(1).max(120))
    .min(2)
    .max(5),
  background_style: z.enum(["dark", "light", "brand"]).optional(),
  item_marker: CHECKLIST_ITEM_MARKER,
});

export type ChecklistScenePayload = z.infer<typeof checklistScenePayloadSchema>;

export function parseChecklistScenePayload(
  raw: unknown,
): { ok: true; data: ChecklistScenePayload } | { ok: false; reason: string } {
  const parsed = checklistScenePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      reason: issue?.message ?? "invalid checklist payload",
    };
  }
  return { ok: true, data: parsed.data };
}

export function checklistPlaceholderImagePrompt(
  sceneId: string,
  title?: string,
): string {
  const label = title?.trim() || sceneId;
  return `presentation:checklist:${label.slice(0, 60)}`;
}
