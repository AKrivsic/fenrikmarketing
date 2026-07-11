import { z } from "zod";

export const quoteScenePayloadSchema = z.object({
  quote: z.string().trim().min(1).max(280),
  attribution: z.string().trim().min(1).max(120),
  proof_id: z.string().trim().min(1).max(120),
  context: z.string().trim().max(80).optional(),
});

export type QuoteScenePayload = z.infer<typeof quoteScenePayloadSchema>;

export function parseQuoteScenePayload(
  raw: unknown,
): { ok: true; data: QuoteScenePayload } | { ok: false; reason: string } {
  const parsed = quoteScenePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      reason: issue?.message ?? "invalid quote payload",
    };
  }
  return { ok: true, data: parsed.data };
}

export function quotePlaceholderImagePrompt(sceneId: string): string {
  return `presentation:quote:${sceneId}`;
}
