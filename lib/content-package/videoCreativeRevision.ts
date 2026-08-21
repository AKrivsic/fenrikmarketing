import { createHash } from "node:crypto";
import { normalizeMemoryText } from "@/lib/ai/workflows/antiRepetitionMemory";

export function fingerprintText(text: string): string {
  const normalized = normalizeMemoryText(text);
  if (!normalized) return "";
  return createHash("sha256").update(normalized, "utf8").digest("hex").slice(0, 24);
}

export function voiceoverRevisionId(voiceoverText: string): string {
  return fingerprintText(voiceoverText.trim());
}

export function hookFingerprint(hookText: string): string {
  return fingerprintText(hookText.trim());
}

export function stableSceneId(packageId: string, order: number): string {
  const base = `${packageId}:scene:${order}`;
  return createHash("sha256").update(base, "utf8").digest("hex").slice(0, 12);
}

/** Fingerprint of plan content excluding volatile status fields. */
export function creativePlanContentFingerprint(payload: {
  schema_version: number;
  voiceover_revision_id: string;
  hook_fingerprint: string;
  voice_direction_revision: number;
  target_duration_seconds: number;
  origin?: string;
  canonical_plan_fingerprint?: string;
  prompt_contract_version?: number;
  scenes: Array<{
    scene_id: string;
    order: number;
    human_meaning: string;
    provider_prompt: string;
  }>;
}): string {
  const canonical = JSON.stringify({
    schema_version: payload.schema_version,
    voiceover_revision_id: payload.voiceover_revision_id,
    hook_fingerprint: payload.hook_fingerprint,
    voice_direction_revision: payload.voice_direction_revision,
    target_duration_seconds: payload.target_duration_seconds,
    ...(payload.origin ? { origin: payload.origin } : {}),
    ...(payload.canonical_plan_fingerprint
      ? { canonical_plan_fingerprint: payload.canonical_plan_fingerprint }
      : {}),
    ...(typeof payload.prompt_contract_version === "number"
      ? { prompt_contract_version: payload.prompt_contract_version }
      : {}),
    scenes: payload.scenes.map((s) => ({
      scene_id: s.scene_id,
      order: s.order,
      human_meaning: normalizeMemoryText(s.human_meaning),
      provider_prompt: s.provider_prompt,
    })),
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex").slice(0, 24);
}
