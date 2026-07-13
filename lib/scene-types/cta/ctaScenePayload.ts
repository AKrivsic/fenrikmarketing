import { z } from "zod";

export const ctaScenePayloadSchema = z.object({
  headline: z.string().trim().min(1).max(80),
  subline: z.string().trim().max(120).optional(),
  button_label: z.string().trim().max(48).optional(),
  show_logo: z.boolean().optional(),
  show_button: z.boolean().optional(),
  composition: z
    .enum([
      "classic_card",
      "text_only",
      "logo_message",
      "headline_action_line",
      "minimal_statement",
      "split_asset_text",
      "asset_overlay",
      "product_screenshot_overlay",
    ])
    .optional(),
  asset_id: z.string().uuid().optional(),
});

export type CtaScenePayload = z.infer<typeof ctaScenePayloadSchema>;

export function parseCtaScenePayload(
  raw: unknown,
): { ok: true; data: CtaScenePayload } | { ok: false; reason: string } {
  const parsed = ctaScenePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      reason: issue?.message ?? "invalid cta payload",
    };
  }
  return { ok: true, data: parsed.data };
}

export function ctaPlaceholderImagePrompt(sceneId: string): string {
  return `presentation:cta:${sceneId}`;
}
