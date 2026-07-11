import { z } from "zod";

export const statisticScenePayloadSchema = z.object({
  value: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(160),
  proof_id: z.string().trim().min(1).max(120),
  unit: z.string().trim().max(24).optional(),
  source_line: z.string().trim().max(80).optional(),
});

export type StatisticScenePayload = z.infer<typeof statisticScenePayloadSchema>;

export function parseStatisticScenePayload(
  raw: unknown,
):
  | { ok: true; data: StatisticScenePayload }
  | { ok: false; reason: string } {
  const parsed = statisticScenePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      reason: issue?.message ?? "invalid statistic payload",
    };
  }
  return { ok: true, data: parsed.data };
}

export function statisticPlaceholderImagePrompt(sceneId: string): string {
  return `presentation:statistic:${sceneId}`;
}
