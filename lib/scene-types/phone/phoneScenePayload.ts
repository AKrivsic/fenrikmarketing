import { z } from "zod";

const captionSchema = z.string().trim().max(120).optional();

export const phoneScenePayloadSchema = z
  .object({
    asset_id: z.string().trim().min(1).optional(),
    image_prompt: z.string().trim().min(1).max(500).optional(),
    caption: captionSchema,
  })
  .superRefine((val, ctx) => {
    const hasAsset = Boolean(val.asset_id?.trim());
    const hasPrompt = Boolean(val.image_prompt?.trim());
    if (!hasAsset && !hasPrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "asset_id or image_prompt is required",
      });
      return;
    }
    if (hasAsset && hasPrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "provide only one of asset_id or image_prompt",
      });
    }
  });

export type PhoneScenePayload = z.infer<typeof phoneScenePayloadSchema>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Accepts canonical payload or legacy `{ screen: { asset_id | image_prompt } }`. */
export function normalizePhoneScenePayloadRaw(
  raw: unknown,
): Record<string, unknown> | null {
  const record = asRecord(raw);
  if (!record) return null;

  if (record.asset_id || record.image_prompt) {
    return record;
  }

  const screen = asRecord(record.screen);
  if (!screen) return null;

  const asset_id =
    typeof screen.asset_id === "string" ? screen.asset_id.trim() : "";
  const image_prompt =
    typeof screen.image_prompt === "string" ? screen.image_prompt.trim() : "";
  const caption =
    typeof record.caption === "string"
      ? record.caption
      : typeof screen.caption === "string"
        ? screen.caption
        : undefined;

  if (asset_id) {
    return { asset_id, ...(caption ? { caption } : {}) };
  }
  if (image_prompt) {
    return { image_prompt, ...(caption ? { caption } : {}) };
  }
  return null;
}

export function parsePhoneScenePayload(
  raw: unknown,
): { ok: true; data: PhoneScenePayload } | { ok: false; reason: string } {
  const normalized = normalizePhoneScenePayloadRaw(raw);
  const parsed = phoneScenePayloadSchema.safeParse(normalized ?? raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      reason: issue?.message ?? "invalid phone payload",
    };
  }
  return { ok: true, data: parsed.data };
}

export function phonePlaceholderImagePrompt(sceneId: string, caption?: string): string {
  const cap = caption?.trim();
  return cap
    ? `presentation:phone:${sceneId}:${cap.slice(0, 40)}`
    : `presentation:phone:${sceneId}`;
}
