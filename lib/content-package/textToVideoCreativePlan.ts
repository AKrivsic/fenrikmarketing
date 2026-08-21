import { z } from "zod";
import type { AntiRepetitionMemory } from "@/lib/ai/types";
import { normalizeMemoryText } from "@/lib/ai/workflows/antiRepetitionMemory";
import { composeTextToVideoProviderPrompt } from "@/lib/content-package/textToVideoProviderPrompt";
import {
  CANONICAL_VIDEO_PLAN_ORIGIN,
  SENTENCE_FALLBACK_ORIGIN,
  hasCzechVisualPrefix,
  isVisualIntentVoiceoverCopy,
} from "@/lib/content-package/canonicalVideoPlan";
import {
  creativePlanContentFingerprint,
  fingerprintText,
  hookFingerprint,
  stableSceneId,
  voiceoverRevisionId,
} from "@/lib/content-package/videoCreativeRevision";
import type { VoiceDirectionContract } from "@/lib/content-package/voiceDirectionContract";
import { readVoiceDirectionFromBrief } from "@/lib/content-package/voiceDirectionContract";

export const TEXT_TO_VIDEO_PLAN_SCHEMA_VERSION = 1 as const;
export const TEXT_TO_VIDEO_TARGET_MIN_SECONDS = 20;
export const TEXT_TO_VIDEO_TARGET_MAX_SECONDS = 28;
export const TEXT_TO_VIDEO_TARGET_MID_SECONDS = 24;

export const textToVideoPlanStatusSchema = z.enum([
  "draft",
  "approved",
  "stale",
  "repetition_blocked",
]);

export type TextToVideoPlanStatus = z.infer<typeof textToVideoPlanStatusSchema>;

export const textToVideoRepetitionResultSchema = z.object({
  status: z.enum(["not_run", "passed", "blocked"]),
  /** Normalized-text duplicate diagnostics — not semantic originality guarantees. */
  blocked_reasons: z.array(z.string()).default([]),
  checked_at: z.string().optional(),
});

export type TextToVideoRepetitionResult = z.infer<
  typeof textToVideoRepetitionResultSchema
>;

export const TEXT_TO_VIDEO_TIMING_ESTIMATED = "estimated" as const;
export const TEXT_TO_VIDEO_TIMING_MEASURED = "measured" as const;

export const textToVideoTimingStatusSchema = z.enum([
  TEXT_TO_VIDEO_TIMING_ESTIMATED,
  TEXT_TO_VIDEO_TIMING_MEASURED,
]);

export type TextToVideoTimingStatus = z.infer<
  typeof textToVideoTimingStatusSchema
>;

export const textToVideoPlanSceneSchema = z.object({
  scene_id: z.string().min(1),
  order: z.number().int().nonnegative(),
  human_meaning: z.string().min(1).max(600),
  voiceover_excerpt: z.string().max(800),
  approximate_start_seconds: z.number().nonnegative(),
  approximate_duration_seconds: z.number().positive(),
  visual_intent: z.string().min(1).max(600),
  energy_motion: z.string().max(200).optional(),
  sound_intent: z.string().max(200).optional(),
  provider_prompt: z.string().min(1).max(4000),
  /** Editor-facing visual idea; provider_prompt is derived. */
  human_visual_edit: z.string().max(600).optional(),
  /** Same as Creative Review / visual_scenes id when projected from the canonical plan. */
  canonical_scene_id: z.string().min(1).optional(),
});

export type TextToVideoPlanScene = z.infer<typeof textToVideoPlanSceneSchema>;

export const textToVideoPlanOriginSchema = z.enum([
  CANONICAL_VIDEO_PLAN_ORIGIN,
  SENTENCE_FALLBACK_ORIGIN,
]);

export type TextToVideoPlanOrigin = z.infer<typeof textToVideoPlanOriginSchema>;

export const textToVideoSceneVoiceoverBindingSchema = z.enum([
  "confirmed",
  "needs_review",
]);

export type TextToVideoSceneVoiceoverBinding = z.infer<
  typeof textToVideoSceneVoiceoverBindingSchema
>;

export const textToVideoCreativePlanSchema = z.object({
  schema_version: z.literal(TEXT_TO_VIDEO_PLAN_SCHEMA_VERSION),
  status: textToVideoPlanStatusSchema,
  /**
   * Technical projection origin. Stored plans without this field parse as
   * sentence_fallback and cannot be approved.
   */
  origin: textToVideoPlanOriginSchema.default(SENTENCE_FALLBACK_ORIGIN),
  canonical_plan_fingerprint: z.string().min(1).optional(),
  scene_voiceover_binding: textToVideoSceneVoiceoverBindingSchema.default(
    "confirmed",
  ),
  voiceover_revision_id: z.string().min(1),
  voiceover_fingerprint: z.string().min(1),
  approved_hook: z.string().min(1).max(500),
  hook_fingerprint: z.string().min(1),
  voice_direction_revision: z.number().int().nonnegative(),
  target_duration_seconds: z.number().int().min(TEXT_TO_VIDEO_TARGET_MIN_SECONDS).max(TEXT_TO_VIDEO_TARGET_MAX_SECONDS),
  scenes: z.array(textToVideoPlanSceneSchema).min(3).max(7),
  plan_fingerprint: z.string().min(1),
  repetition: textToVideoRepetitionResultSchema,
  /** Pre-voiceover schedule only; Runway must not treat as measured truth. */
  timing_status: textToVideoTimingStatusSchema.default(
    TEXT_TO_VIDEO_TIMING_ESTIMATED,
  ),
  /** Set after ElevenLabs when timing is derived from real audio (Step 3+). */
  measured_audio_revision_id: z.string().optional().nullable(),
  /** Actual synthesized audio length — distinct from creative target_duration_seconds. */
  measured_audio_duration_seconds: z.number().positive().optional(),
  timing_measurement_source: z
    .enum(["alignment", "estimated_fallback"])
    .optional(),
  approved_at: z.string().optional(),
});

export type TextToVideoCreativePlan = z.infer<typeof textToVideoCreativePlanSchema>;

export const VIDEO_TEXT_TO_VIDEO_CREATIVE_PLAN_KEY =
  "video_text_to_video_creative_plan" as const;

export function splitVoiceoverSentences(voiceover: string): string[] {
  const trimmed = voiceover.trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(/(?<=[.!?…])\s+|\n+/u)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length > 0) return parts;
  return [trimmed];
}

export function targetSceneCount(sentenceCount: number): number {
  if (sentenceCount <= 3) return Math.max(3, sentenceCount);
  if (sentenceCount <= 5) return sentenceCount;
  if (sentenceCount <= 7) return sentenceCount;
  return 7;
}

function groupSentencesIntoScenes(
  sentences: string[],
  targetCount: number,
): string[] {
  if (sentences.length === 0) return [];
  if (sentences.length <= targetCount) return [...sentences];
  const groups: string[] = [];
  const size = Math.ceil(sentences.length / targetCount);
  for (let i = 0; i < sentences.length; i += size) {
    groups.push(sentences.slice(i, i + size).join(" "));
  }
  while (groups.length > targetCount) {
    const last = groups.pop()!;
    groups[groups.length - 1] = `${groups[groups.length - 1]!} ${last}`.trim();
  }
  return groups;
}

function sceneRole(index: number, total: number): "opening" | "body" | "closing" {
  if (index === 0) return "opening";
  if (index === total - 1) return "closing";
  return "body";
}

function defaultEnergyForRole(role: "opening" | "body" | "closing"): string {
  if (role === "opening") return "Immediate attention, bold motion";
  if (role === "closing") return "Confident forward motion toward action";
  return "Clear, steady marketing energy";
}

/**
 * Hook is a short first beat, never the whole voiceover paragraph.
 * Prefer the first sentence over the first line so a single-line VO cannot
 * become the entire approved_hook.
 */
export function deriveHookFromVoiceover(voiceover: string): string {
  const first = splitVoiceoverSentences(voiceover)[0]?.trim() ?? "";
  if (first.length > 0) return first.slice(0, 120);
  const line = voiceover.split(/\r?\n/)[0]?.trim() ?? "";
  return line.slice(0, 120);
}

export interface BuildTextToVideoPlanArgs {
  packageId: string;
  voiceoverText: string;
  coreIdea?: string | null;
  hookOverride?: string | null;
  voiceDirection?: VoiceDirectionContract | null;
  existingScenes?: Array<{ human_visual_edit?: string; human_meaning?: string }>;
}

export function buildTextToVideoCreativePlan(
  args: BuildTextToVideoPlanArgs,
): TextToVideoCreativePlan {
  const vo = args.voiceoverText.trim();
  if (!vo) {
    throw new Error("text_to_video_plan_voiceover_required");
  }
  const hook = (args.hookOverride?.trim() || deriveHookFromVoiceover(vo)).trim();
  const voRevision = voiceoverRevisionId(vo);
  const voFingerprint = fingerprintText(vo);
  const hookFp = hookFingerprint(hook);
  const direction = args.voiceDirection ?? { style: "auto" as const, revision: 0 };
  const sentences = splitVoiceoverSentences(vo);
  const count = targetSceneCount(sentences.length);
  const grouped = groupSentencesIntoScenes(sentences, count);
  const totalDuration = TEXT_TO_VIDEO_TARGET_MID_SECONDS;
  const perScene = totalDuration / grouped.length;

  const scenes: TextToVideoPlanScene[] = grouped.map((excerpt, index) => {
    const role = sceneRole(index, grouped.length);
    const priorEdit = args.existingScenes?.[index]?.human_visual_edit?.trim();
    const priorMeaning = args.existingScenes?.[index]?.human_meaning?.trim();
    const core = args.coreIdea?.trim();
    const humanMeaning =
      priorMeaning ||
      (role === "opening"
        ? `Úvod podporující hook: ${hook}`
        : role === "closing"
          ? `Závěr a CTA: ${excerpt}`
          : core
            ? `${core} — ${excerpt}`
            : excerpt);
    const humanVisual =
      priorEdit ||
      (role === "opening"
        ? `Výrazný vizuál podporující: ${hook}`
        : humanMeaning);
    const energy = defaultEnergyForRole(role);
    const providerPrompt = composeTextToVideoProviderPrompt({
      humanVisualIntent: humanVisual,
      energyMotion: energy,
      sceneRole: role,
    });
    return {
      scene_id: stableSceneId(args.packageId, index),
      order: index,
      human_meaning: humanMeaning.slice(0, 600),
      voiceover_excerpt: excerpt.slice(0, 800),
      approximate_start_seconds: Math.round(index * perScene * 10) / 10,
      approximate_duration_seconds: Math.round(perScene * 10) / 10,
      visual_intent: humanVisual.slice(0, 600),
      energy_motion: energy,
      provider_prompt: providerPrompt,
      human_visual_edit: humanVisual.slice(0, 600),
    };
  });

  const planFp = creativePlanContentFingerprint({
    schema_version: TEXT_TO_VIDEO_PLAN_SCHEMA_VERSION,
    voiceover_revision_id: voRevision,
    hook_fingerprint: hookFp,
    voice_direction_revision: direction.revision ?? 0,
    target_duration_seconds: totalDuration,
    origin: SENTENCE_FALLBACK_ORIGIN,
    scenes: scenes.map((s) => ({
      scene_id: s.scene_id,
      order: s.order,
      human_meaning: s.human_meaning,
      provider_prompt: s.provider_prompt,
    })),
  });

  return textToVideoCreativePlanSchema.parse({
    schema_version: TEXT_TO_VIDEO_PLAN_SCHEMA_VERSION,
    status: "draft",
    origin: SENTENCE_FALLBACK_ORIGIN,
    scene_voiceover_binding: "confirmed",
    voiceover_revision_id: voRevision,
    voiceover_fingerprint: voFingerprint,
    approved_hook: hook,
    hook_fingerprint: hookFp,
    voice_direction_revision: direction.revision ?? 0,
    target_duration_seconds: totalDuration,
    scenes,
    plan_fingerprint: planFp,
    timing_status: TEXT_TO_VIDEO_TIMING_ESTIMATED,
    measured_audio_revision_id: null,
    repetition: { status: "not_run", blocked_reasons: [] },
  });
}

export function readTextToVideoCreativePlan(
  brief: Record<string, unknown> | null | undefined,
): TextToVideoCreativePlan | null {
  if (!brief) return null;
  const raw = brief[VIDEO_TEXT_TO_VIDEO_CREATIVE_PLAN_KEY];
  const parsed = textToVideoCreativePlanSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function serializeTextToVideoCreativePlan(
  plan: TextToVideoCreativePlan,
): Record<string, unknown> {
  return { ...plan };
}

export function markTextToVideoPlanStale(
  plan: TextToVideoCreativePlan,
): TextToVideoCreativePlan {
  return {
    ...plan,
    status: "stale",
    repetition: {
      ...plan.repetition,
      status: "not_run",
      blocked_reasons: [],
    },
  };
}

export function applyHumanVisualEditToScene(
  plan: TextToVideoCreativePlan,
  sceneId: string,
  humanVisualEdit: string,
): TextToVideoCreativePlan {
  const edit = humanVisualEdit.trim();
  if (!edit) throw new Error("text_to_video_scene_edit_empty");
  const scenes = plan.scenes.map((scene) => {
    if (scene.scene_id !== sceneId) return scene;
    const role = sceneRole(scene.order, plan.scenes.length);
    const providerPrompt = composeTextToVideoProviderPrompt({
      humanVisualIntent: edit,
      energyMotion: scene.energy_motion ?? defaultEnergyForRole(role),
      sceneRole: role,
    });
    return {
      ...scene,
      human_visual_edit: edit,
      visual_intent: edit,
      provider_prompt: providerPrompt,
    };
  });
  const next = {
    ...plan,
    status: "draft" as const,
    scenes,
    repetition: {
      status: "not_run" as const,
      blocked_reasons: [] as string[],
    },
  };
  next.plan_fingerprint = creativePlanContentFingerprint({
    schema_version: next.schema_version,
    voiceover_revision_id: next.voiceover_revision_id,
    hook_fingerprint: next.hook_fingerprint,
    voice_direction_revision: next.voice_direction_revision,
    target_duration_seconds: next.target_duration_seconds,
    origin: next.origin,
    canonical_plan_fingerprint: next.canonical_plan_fingerprint,
    scenes: next.scenes.map((s) => ({
      scene_id: s.scene_id,
      order: s.order,
      human_meaning: s.human_meaning,
      provider_prompt: s.provider_prompt,
    })),
  });
  return textToVideoCreativePlanSchema.parse(next);
}

export function approveTextToVideoCreativePlan(
  plan: TextToVideoCreativePlan,
  timestamp: string,
): TextToVideoCreativePlan {
  if (plan.status === "repetition_blocked") {
    throw new Error("text_to_video_plan_repetition_blocked");
  }
  return textToVideoCreativePlanSchema.parse({
    ...plan,
    status: "approved",
    approved_at: timestamp,
  });
}

export function voiceDirectionFromBriefOrDefault(
  brief: Record<string, unknown>,
): VoiceDirectionContract {
  return readVoiceDirectionFromBrief(brief) ?? { style: "auto", revision: 0 };
}

export interface RepetitionCheckInput {
  plan: TextToVideoCreativePlan;
  memory: AntiRepetitionMemory;
  /** Prior approved plan fingerprints in this project (from brief scan). */
  priorPlanFingerprints?: string[];
  /** Legitimate retry of same job — skip plan fingerprint collision. */
  allowSamePlanFingerprint?: boolean;
}

export const REPETITION_BLOCK_REASON_LABELS: Record<string, string> = {
  hook_duplicate_normalized_text:
    "Stejný nebo normalizovaně shodný hook jako v nedávné historii projektu (textová shoda, ne sémantická originality).",
  plan_fingerprint_duplicate:
    "Stejný fingerprint kreativního plánu jako u dříve uloženého balíčku.",
  opening_visual_motif_normalized_text_duplicate:
    "Stejný normalizovaný text úvodní vizuální představy jako v historii (textová shoda).",
};

export function checkTextToVideoRepetition(
  input: RepetitionCheckInput,
): TextToVideoRepetitionResult {
  const reasons: string[] = [];
  const hookNorm = normalizeMemoryText(input.plan.approved_hook);
  for (const prior of input.memory.hooks) {
    if (normalizeMemoryText(prior) === hookNorm && hookNorm.length >= 12) {
      reasons.push("hook_duplicate_normalized_text");
      break;
    }
  }
  if (
    !input.allowSamePlanFingerprint &&
    input.priorPlanFingerprints?.includes(input.plan.plan_fingerprint)
  ) {
    reasons.push("plan_fingerprint_duplicate");
  }
  const opening = input.plan.scenes[0];
  if (opening) {
    const motif = normalizeMemoryText(
      opening.human_visual_edit ?? opening.visual_intent,
    );
    if (motif.length >= 16) {
      for (const prior of input.memory.atmospheres ?? []) {
        if (normalizeMemoryText(prior) === motif) {
          reasons.push("opening_visual_motif_normalized_text_duplicate");
          break;
        }
      }
    }
  }
  if (reasons.length > 0) {
    return {
      status: "blocked",
      blocked_reasons: reasons,
    };
  }
  return {
    status: "passed",
    blocked_reasons: [],
  };
}

export function applyRepetitionResultToPlan(
  plan: TextToVideoCreativePlan,
  repetition: TextToVideoRepetitionResult,
  timestamp: string,
): TextToVideoCreativePlan {
  const nextStatus =
    repetition.status === "blocked" ? "repetition_blocked" : plan.status;
  return textToVideoCreativePlanSchema.parse({
    ...plan,
    status: nextStatus,
    repetition: { ...repetition, checked_at: timestamp },
  });
}

export function reevaluateTextToVideoPlanRepetition(args: {
  plan: TextToVideoCreativePlan;
  memory: AntiRepetitionMemory;
  priorPlanFingerprints?: string[];
  timestamp?: string;
}): TextToVideoCreativePlan {
  const repetition = checkTextToVideoRepetition({
    plan: args.plan,
    memory: args.memory,
    priorPlanFingerprints: args.priorPlanFingerprints,
  });
  const ts = args.timestamp ?? new Date().toISOString();
  let status = args.plan.status;
  if (repetition.status === "blocked") {
    status = "repetition_blocked";
  } else if (status === "repetition_blocked") {
    status = "draft";
  }
  return textToVideoCreativePlanSchema.parse({
    ...args.plan,
    status,
    repetition: { ...repetition, checked_at: ts },
  });
}

export class TextToVideoRepetitionBlockedError extends Error {
  readonly code = "text_to_video_repetition_blocked" as const;
  readonly reasons: string[];

  constructor(reasons: string[]) {
    super(`text_to_video_repetition_blocked:${reasons.join(",")}`);
    this.reasons = reasons;
  }
}

/**
 * Rebuild the T2V plan from production-language voiceover while keeping
 * operator visual edits by scene index. Does not approve the plan.
 */
export function rebuildTextToVideoPlanPreservingSceneEdits(args: {
  packageId: string;
  productionVoiceover: string;
  hookText?: string | null;
  voiceDirection?: VoiceDirectionContract | null;
  existingPlan?: TextToVideoCreativePlan | null;
}): TextToVideoCreativePlan {
  const hook =
    args.hookText?.trim() ||
    deriveHookFromVoiceover(args.productionVoiceover);
  return buildTextToVideoCreativePlan({
    packageId: args.packageId,
    voiceoverText: args.productionVoiceover,
    hookOverride: hook,
    voiceDirection: args.voiceDirection,
    existingScenes: args.existingPlan?.scenes.map((scene) => ({
      human_visual_edit: scene.human_visual_edit,
      human_meaning: scene.human_meaning,
    })),
  });
}

export function textToVideoPlanLockedForContinue(args: {
  plan: TextToVideoCreativePlan;
  productionVoiceover: string;
  hookText: string;
  voiceDirectionRevision: number;
}): boolean {
  if (args.plan.status !== "approved") return false;
  if (args.plan.repetition.status !== "passed") return false;
  return planMatchesApprovedSources({
    plan: args.plan,
    voiceoverText: args.productionVoiceover,
    hookText: args.hookText,
    voiceDirectionRevision: args.voiceDirectionRevision,
  });
}

export function planMatchesApprovedSources(args: {
  plan: TextToVideoCreativePlan;
  voiceoverText: string;
  hookText: string;
  voiceDirectionRevision: number;
}): boolean {
  const voRev = voiceoverRevisionId(args.voiceoverText.trim());
  if (voRev !== args.plan.voiceover_revision_id) return false;
  if (hookFingerprint(args.hookText) !== args.plan.hook_fingerprint) return false;
  if (args.voiceDirectionRevision !== args.plan.voice_direction_revision) {
    return false;
  }
  const recomputed = creativePlanContentFingerprint({
    schema_version: args.plan.schema_version,
    voiceover_revision_id: args.plan.voiceover_revision_id,
    hook_fingerprint: args.plan.hook_fingerprint,
    voice_direction_revision: args.plan.voice_direction_revision,
    target_duration_seconds: args.plan.target_duration_seconds,
    origin: args.plan.origin,
    canonical_plan_fingerprint: args.plan.canonical_plan_fingerprint,
    scenes: args.plan.scenes.map((s) => ({
      scene_id: s.scene_id,
      order: s.order,
      human_meaning: s.human_meaning,
      provider_prompt: s.provider_prompt,
    })),
  });
  return recomputed === args.plan.plan_fingerprint;
}

export function isLegacySentenceFallbackPlan(
  plan: TextToVideoCreativePlan | null | undefined,
  canonicalSceneCount?: number,
): boolean {
  if (!plan) return false;
  if (plan.origin === SENTENCE_FALLBACK_ORIGIN) return true;
  if (plan.origin !== CANONICAL_VIDEO_PLAN_ORIGIN) return true;
  const hashIds = plan.scenes.every((scene) => /^[a-f0-9]{12}$/i.test(scene.scene_id));
  if (hashIds) return true;
  const voCopies = plan.scenes.filter((scene) =>
    isVisualIntentVoiceoverCopy(
      scene.human_visual_edit ?? scene.visual_intent,
      scene.voiceover_excerpt,
    ),
  ).length;
  if (voCopies >= Math.ceil(plan.scenes.length / 2)) return true;
  if (plan.scenes.some((scene) => hasCzechVisualPrefix(scene.visual_intent))) {
    return true;
  }
  if (
    typeof canonicalSceneCount === "number" &&
    canonicalSceneCount > 0 &&
    plan.scenes.length !== canonicalSceneCount
  ) {
    return true;
  }
  return false;
}
