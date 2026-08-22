/**
 * Single Claude Creative Core v2 request builder + provider call.
 * Fingerprint is always recomputed deterministically after parse — never LLM authority.
 */

import {
  CREATIVE_CORE_V2_CONTRACT_VERSION,
  CREATIVE_CORE_V2_MEMORY_CONFIG,
} from "@/lib/content-creative-core-v2/config";
import {
  computeCreativeFingerprint,
  fingerprintFromCreativeCore,
} from "@/lib/content-creative-core-v2/fingerprint";
import { creativeMemoryPromptBlockV2 } from "@/lib/content-creative-core-v2/memory";
import { redistributeVoiceoverAcrossScenes } from "@/lib/content-creative-core-v2/redistributeVoiceover";
import {
  countVoiceoverWords,
  softClampVoiceoverWordCount,
} from "@/lib/content-creative-core-v2/softClampVoiceover";
import { validateCreativeCore } from "@/lib/content-creative-core-v2/validate";
import type {
  ContentCreativeCoreV2,
  CreativeCorePackageKind,
  CreativeCoreV2Scene,
  CreativeCoreV2ScreenPolicy,
  CreativeFingerprintV2,
  CreativeMemoryV2,
  StrategyCandidateV2,
} from "@/lib/content-creative-core-v2/types";
import { CREATIVE_CORE_V2_SCREEN_POLICIES } from "@/lib/content-creative-core-v2/types";
import { CREATIVE_CORE_VALIDATION_FAILED_V2 } from "@/lib/content-creative-core-v2/types";

export interface CreativeCoreRequestContext {
  productBrain: {
    product_name?: string | null;
    product_description?: string | null;
    audience?: string | null;
    market?: string | null;
    strengths?: string | string[] | null;
    pain_points?: string | string[] | null;
    cta?: string | null;
    brand_voice?: string | null;
  };
  strategy: StrategyCandidateV2;
  strategyItemId?: string | null;
  funnelStage?: string | null;
  platforms?: readonly string[];
  language?: string | null;
  brandContext?: string | null;
  memory: CreativeMemoryV2;
  rejectedConceptsNote?: string | null;
  packageKind: CreativeCorePackageKind;
}

export interface CreativeCoreMessages {
  system: string;
  user: string;
}

/** Bounded failure snapshot — no prompts / Product Brain. */
export interface CreativeCoreFailureDiagnostics {
  llm_fingerprint: CreativeFingerprintV2 | null;
  computed_fingerprint: CreativeFingerprintV2 | null;
  fingerprint_input_fields: {
    core_idea: string;
    hook: string;
    conflict: string;
    reveal_or_surprise: string;
    payoff: string;
    cta_intent: string;
    main_emotion: string;
    pain_point: string | null;
    scene_count: number;
    first_environment: string;
    subjects_blob_preview: string;
    visual_events_preview: string;
  };
  voiceover_word_count: number;
  voiceover_soft_clamp:
    | { applied: boolean; trimmed_words: number }
    | { failed: true; reason: string }
    | null;
  validation_errors: Array<{ path: string; message: string }>;
  provider_request_id: string | null;
}

export interface ParseCreativeCoreResult {
  ok: true;
  core: ContentCreativeCoreV2;
  rawObject: Record<string, unknown>;
  /** LLM-supplied fingerprint before deterministic overwrite (diagnostic only). */
  llmFingerprint: CreativeFingerprintV2 | null;
}

function listify(value: string | string[] | null | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join("; ");
  return String(value).trim();
}

export function buildCreativeCoreMessages(
  ctx: CreativeCoreRequestContext,
): CreativeCoreMessages {
  const cfg = CREATIVE_CORE_V2_MEMORY_CONFIG;
  const memoryBlock = creativeMemoryPromptBlockV2(ctx.memory);
  const isVideo = ctx.packageKind === "video";

  const system = [
    "You are the sole creative author for one Fenrik Studio Content Package.",
    "Return ONE JSON object: content_creative_core_v2. No markdown fences.",
    "You own core_idea, hook, complete voiceover, and scenes (when video).",
    "There is NO later Video Concept, Opening Impact, Scene Intent, or T2V planner rewrite.",
    "Do NOT invent platform captions, hashtags, YouTube metadata, social-image prompts,",
    "Runway provider prompts, TTS settings, or render statuses.",
    "creative_fingerprint keys are optional diagnostics — the server recomputes them.",
  ].join("\n");

  const videoRules = isVideo
    ? [
        `VIDEO PACKAGE (~${cfg.targetDurationSecondsMin}–${cfg.targetDurationSecondsMax}s):`,
        `- Prefer ${cfg.videoSceneMin}–${cfg.videoSceneMax} scenes (required range).`,
        `- Voiceover ${cfg.voiceoverWordMin}–${cfg.voiceoverWordMax} words; hook is the opening of the voiceover.`,
        "- First scene MUST be a concrete scroll-stopping visual event.",
        "- Require real conflict/tension, a reveal or surprise, visible beginning→end change, and payoff.",
        "- Scenes must be visually distinct and filmable as stills OR short motion clips.",
        "- Do not rely on correctly generated readable on-screen text.",
        "- Do not literally illustrate every spoken sentence.",
        "- Do not default to a passive reaction series with no plot.",
        "- Avoid treating these as the default template (allowed only if memory does not already use them and the story truly requires them):",
        "  slow push-in; subtle nod; quiet concern; composed smile; person sitting with a phone;",
        "  person scrolling a feed; laptop as the default hero image.",
        "- Each scene needs: scene_id, order, voiceover_excerpt, visual_event, environment, subjects,",
        "  action, motion_or_change, emotion, camera_intent (scene-specific), sound_intent,",
        `  screen_policy (${CREATIVE_CORE_V2_SCREEN_POLICIES.join(" | ")}), continuity_hints.`,
      ].join("\n")
    : [
        "TEXT-ONLY PACKAGE:",
        "- Provide core_idea, hook, voiceover (main message), CTA intent, emotion, conflict, reveal, change, payoff.",
        "- scenes MUST be an empty array []. Do not invent fake video storyboards.",
      ].join("\n");

  const user = [
    "PRODUCT BRAIN:",
    `- name: ${ctx.productBrain.product_name ?? ""}`,
    `- description: ${ctx.productBrain.product_description ?? ""}`,
    `- audience: ${ctx.productBrain.audience ?? ""}`,
    `- market: ${ctx.productBrain.market ?? ""}`,
    `- strengths: ${listify(ctx.productBrain.strengths)}`,
    `- pain_points: ${listify(ctx.productBrain.pain_points)}`,
    `- cta: ${ctx.productBrain.cta ?? ""}`,
    `- brand_voice: ${ctx.productBrain.brand_voice ?? ""}`,
    ctx.brandContext?.trim() ? `- brand_context: ${ctx.brandContext.trim()}` : "",
    "",
    "STRATEGY ITEM (authority for topic/pain — invent execution here):",
    `- topic: ${ctx.strategy.topic}`,
    `- angle: ${ctx.strategy.angle}`,
    `- pain_point: ${ctx.strategy.pain_point}`,
    `- funnel_stage: ${ctx.funnelStage ?? ctx.strategy.funnel_stage ?? ""}`,
    `- strategy_item_id: ${ctx.strategyItemId ?? ""}`,
    `- language: ${ctx.language ?? "en"}`,
    `- platforms: ${(ctx.platforms ?? []).join(", ")}`,
    "",
    memoryBlock,
    ctx.rejectedConceptsNote?.trim()
      ? `REJECTED CONCEPTS (do not repeat):\n${ctx.rejectedConceptsNote.trim()}`
      : "",
    "",
    videoRules,
    "",
    "JSON SHAPE:",
    `{`,
    `  "contract_version": ${CREATIVE_CORE_V2_CONTRACT_VERSION},`,
    `  "strategy_item_id": string|null,`,
    `  "creative_fingerprint": {`,
    `    "version": "creative-fingerprint@2",`,
    `    "pain_key": string, "topic_key": string, "scenario_key": string, "pov_key": string,`,
    `    "opening_mechanism": string, "narrative_mechanism": string, "setting_key": string,`,
    `    "visual_motif_key": string, "prop_keys": string[], "emotional_arc_key": string,`,
    `    "conflict_key": string, "reveal_key": string, "payoff_key": string, "cta_mechanism": string`,
    `  },`,
    `  "core_idea": string,`,
    `  "hook": string,`,
    `  "voiceover": string,`,
    `  "main_emotion": string,`,
    `  "conflict": string,`,
    `  "reveal_or_surprise": string,`,
    `  "visible_change": string,`,
    `  "payoff": string,`,
    `  "cta_intent": string,`,
    `  "scenes": CreativeCoreScene[]`,
    `}`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { system, user };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseScreenPolicy(value: unknown): CreativeCoreV2ScreenPolicy {
  const v = readString(value);
  if ((CREATIVE_CORE_V2_SCREEN_POLICIES as readonly string[]).includes(v)) {
    return v as CreativeCoreV2ScreenPolicy;
  }
  return "no_screen";
}

function parseScene(raw: unknown, index: number): CreativeCoreV2Scene | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const scene_id = readString(rec.scene_id) || `scene_${index + 1}`;
  const order =
    typeof rec.order === "number" && Number.isFinite(rec.order)
      ? rec.order
      : index + 1;
  return {
    scene_id,
    order,
    voiceover_excerpt: readString(rec.voiceover_excerpt),
    visual_event: readString(rec.visual_event) || readString(rec.image_prompt),
    environment: readString(rec.environment),
    subjects: readString(rec.subjects) || readString(rec.characters_action),
    action: readString(rec.action) || readString(rec.characters_action),
    motion_or_change:
      readString(rec.motion_or_change) || readString(rec.motion_prompt),
    emotion: readString(rec.emotion),
    camera_intent: readString(rec.camera_intent) || readString(rec.camera),
    sound_intent: readString(rec.sound_intent),
    screen_policy: parseScreenPolicy(rec.screen_policy),
    continuity_hints: readString(rec.continuity_hints),
  };
}

function readLlmFingerprint(
  root: Record<string, unknown>,
): CreativeFingerprintV2 | null {
  const raw = asRecord(root.creative_fingerprint);
  if (!raw) return null;
  if (raw.version !== "creative-fingerprint@2") return null;
  return raw as unknown as CreativeFingerprintV2;
}

export function fingerprintInputFieldsFromCore(
  core: Pick<
    ContentCreativeCoreV2,
    | "core_idea"
    | "hook"
    | "conflict"
    | "reveal_or_surprise"
    | "payoff"
    | "cta_intent"
    | "main_emotion"
    | "scenes"
  > & { pain_point?: string | null },
): CreativeCoreFailureDiagnostics["fingerprint_input_fields"] {
  const props = core.scenes
    .flatMap((s) => [s.subjects, s.environment])
    .join(" ");
  const visual = core.scenes.map((s) => s.visual_event).join(" ");
  return {
    core_idea: core.core_idea,
    hook: core.hook,
    conflict: core.conflict,
    reveal_or_surprise: core.reveal_or_surprise,
    payoff: core.payoff,
    cta_intent: core.cta_intent,
    main_emotion: core.main_emotion,
    pain_point: core.pain_point ?? null,
    scene_count: core.scenes.length,
    first_environment: core.scenes[0]?.environment ?? "",
    subjects_blob_preview: props.slice(0, 240),
    visual_events_preview: visual.slice(0, 240),
  };
}

/**
 * Always overwrite creative_fingerprint with fingerprintFromCreativeCore.
 * LLM fingerprint is returned only for diagnostics.
 */
export function applyDeterministicCreativeFingerprint(
  core: ContentCreativeCoreV2,
  painPoint?: string | null,
): ContentCreativeCoreV2 {
  return {
    ...core,
    creative_fingerprint: fingerprintFromCreativeCore({
      ...core,
      pain_point: painPoint ?? null,
    }),
  };
}

/**
 * Soft-clamp voiceover when over max by 1–5 words; redistribute scene excerpts.
 */
export function applySoftVoiceoverClamp(args: {
  core: ContentCreativeCoreV2;
  packageKind: CreativeCorePackageKind;
}): {
  core: ContentCreativeCoreV2;
  clamp:
    | { applied: boolean; trimmed_words: number }
    | { failed: true; reason: string }
    | null;
} {
  if (args.packageKind !== "video") {
    return { core: args.core, clamp: null };
  }
  const cfg = CREATIVE_CORE_V2_MEMORY_CONFIG;
  const result = softClampVoiceoverWordCount({
    voiceover: args.core.voiceover,
    maxWords: cfg.voiceoverWordMax,
    minWords: cfg.voiceoverWordMin,
    maxOvershoot: 5,
  });
  if (!result.ok) {
    return {
      core: args.core,
      clamp: { failed: true, reason: result.reason },
    };
  }
  if (!result.applied) {
    return { core: args.core, clamp: { applied: false, trimmed_words: 0 } };
  }

  let next: ContentCreativeCoreV2 = {
    ...args.core,
    voiceover: result.voiceover,
  };

  // Keep hook aligned with voiceover opening after soft clamp.
  const firstSentence =
    result.voiceover.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean)[0] ??
    "";
  if (firstSentence) {
    next = { ...next, hook: firstSentence };
  }

  if (next.scenes.length > 0) {
    const redistributed = redistributeVoiceoverAcrossScenes({
      voiceover: next.voiceover,
      scenes: next.scenes,
    });
    if (redistributed.ok) {
      next = { ...next, scenes: redistributed.scenes };
    }
  }

  // Recompute fingerprint after VO/scene change (hook/scenes may affect opening).
  next = applyDeterministicCreativeFingerprint(next, null);

  return {
    core: next,
    clamp: { applied: true, trimmed_words: result.trimmedWords },
  };
}

export function buildCreativeCoreFailureDiagnostics(args: {
  core: ContentCreativeCoreV2 | null;
  llmFingerprint: CreativeFingerprintV2 | null;
  painPoint?: string | null;
  voiceoverSoftClamp:
    | { applied: boolean; trimmed_words: number }
    | { failed: true; reason: string }
    | null;
  validationErrors: Array<{ path: string; message: string }>;
  providerRequestId?: string | null;
}): CreativeCoreFailureDiagnostics {
  const core = args.core;
  const computed = core
    ? fingerprintFromCreativeCore({
        ...core,
        pain_point: args.painPoint ?? null,
      })
    : null;
  return {
    llm_fingerprint: args.llmFingerprint,
    computed_fingerprint: computed,
    fingerprint_input_fields: core
      ? fingerprintInputFieldsFromCore({
          ...core,
          pain_point: args.painPoint ?? null,
        })
      : {
          core_idea: "",
          hook: "",
          conflict: "",
          reveal_or_surprise: "",
          payoff: "",
          cta_intent: "",
          main_emotion: "",
          pain_point: args.painPoint ?? null,
          scene_count: 0,
          first_environment: "",
          subjects_blob_preview: "",
          visual_events_preview: "",
        },
    voiceover_word_count: core ? countVoiceoverWords(core.voiceover) : 0,
    voiceover_soft_clamp: args.voiceoverSoftClamp,
    validation_errors: args.validationErrors.slice(0, 24),
    provider_request_id: args.providerRequestId ?? null,
  };
}

/**
 * Bounded JSON for failure telemetry `lastRaw` / candidate.
 * Includes parsed core fields + diagnostics — never the prompt.
 */
export function buildCreativeCoreFailureLastRaw(args: {
  core: ContentCreativeCoreV2 | null;
  diagnostics: CreativeCoreFailureDiagnostics;
}): string {
  const payload = {
    content_creative_core_v2: args.core
      ? {
          contract_version: args.core.contract_version,
          strategy_item_id: args.core.strategy_item_id,
          creative_fingerprint: args.core.creative_fingerprint,
          core_idea: args.core.core_idea,
          hook: args.core.hook,
          voiceover: args.core.voiceover,
          main_emotion: args.core.main_emotion,
          conflict: args.core.conflict,
          reveal_or_surprise: args.core.reveal_or_surprise,
          visible_change: args.core.visible_change,
          payoff: args.core.payoff,
          cta_intent: args.core.cta_intent,
          scenes: args.core.scenes.map((s) => ({
            scene_id: s.scene_id,
            order: s.order,
            voiceover_excerpt: s.voiceover_excerpt,
            visual_event: s.visual_event,
            environment: s.environment,
            subjects: s.subjects,
          })),
        }
      : null,
    diagnostics: args.diagnostics,
  };
  const encoded = JSON.stringify(payload);
  const maxBytes = 20_000;
  if (Buffer.byteLength(encoded, "utf8") <= maxBytes) return encoded;
  // Drop scene bodies first.
  const slim = {
    ...payload,
    content_creative_core_v2: payload.content_creative_core_v2
      ? {
          ...payload.content_creative_core_v2,
          scenes: payload.content_creative_core_v2.scenes.map((s) => ({
            scene_id: s.scene_id,
            order: s.order,
          })),
          voiceover: String(payload.content_creative_core_v2.voiceover).slice(
            0,
            800,
          ),
        }
      : null,
  };
  return JSON.stringify(slim).slice(0, maxBytes);
}

/**
 * Parse model JSON into ContentCreativeCoreV2.
 * Always recomputes creative_fingerprint deterministically.
 */
export function parseCreativeCoreResponse(
  raw: unknown,
  args: {
    strategyItemId?: string | null;
    painPoint?: string | null;
  } = {},
): ParseCreativeCoreResult | { ok: false; error: string } {
  let root = asRecord(raw);
  if (!root) return { ok: false, error: "creative_core_not_object" };
  if (root.content_creative_core_v2) {
    const nested = asRecord(root.content_creative_core_v2);
    if (!nested) return { ok: false, error: "creative_core_wrapper_invalid" };
    root = nested;
  }
  if (root.contract_version !== CREATIVE_CORE_V2_CONTRACT_VERSION) {
    return { ok: false, error: "creative_core_contract_version_mismatch" };
  }

  const scenesRaw = Array.isArray(root.scenes) ? root.scenes : [];
  const scenes = scenesRaw
    .map((s, i) => parseScene(s, i))
    .filter((s): s is CreativeCoreV2Scene => s != null);

  const partial = {
    core_idea: readString(root.core_idea),
    hook: readString(root.hook),
    voiceover: readString(root.voiceover),
    main_emotion: readString(root.main_emotion),
    conflict: readString(root.conflict),
    reveal_or_surprise: readString(root.reveal_or_surprise),
    visible_change: readString(root.visible_change),
    payoff: readString(root.payoff),
    cta_intent: readString(root.cta_intent),
    scenes,
  };

  const llmFingerprint = readLlmFingerprint(root);

  let core: ContentCreativeCoreV2 = {
    contract_version: CREATIVE_CORE_V2_CONTRACT_VERSION,
    strategy_item_id:
      readString(root.strategy_item_id) || args.strategyItemId || null,
    creative_fingerprint: fingerprintFromCreativeCore({
      ...partial,
      pain_point: args.painPoint ?? null,
    }),
    ...partial,
  };

  // Belt-and-suspenders: always overwrite from the normalized object we return.
  core = applyDeterministicCreativeFingerprint(core, args.painPoint);

  return { ok: true, core, rawObject: root, llmFingerprint };
}

export type TextProviderLike = {
  complete: (args: {
    system: string;
    prompt: string;
  }) => Promise<{ text: string; requestId?: string | null }>;
};

export type CreateCreativeCoreResult =
  | { ok: true; core: ContentCreativeCoreV2; messages: CreativeCoreMessages }
  | {
      ok: false;
      error: typeof CREATIVE_CORE_VALIDATION_FAILED_V2 | string;
      issues?: Array<{ path: string; message: string }>;
      messages: CreativeCoreMessages;
      diagnostics?: CreativeCoreFailureDiagnostics;
      /** Bounded JSON for failure telemetry candidate. */
      lastRaw?: string;
    };

/**
 * Provider execution + validate. Fingerprint is always server-computed.
 */
export async function createCreativeCore(args: {
  context: CreativeCoreRequestContext;
  textProvider: TextProviderLike;
}): Promise<CreateCreativeCoreResult> {
  if (CREATIVE_CORE_V2_MEMORY_CONFIG.maxCreativeCoreAttempts !== 1) {
    // Guardrail: config must stay at one creative attempt.
  }
  const messages = buildCreativeCoreMessages(args.context);
  const result = await args.textProvider.complete({
    system: messages.system,
    prompt: messages.user,
  });
  const providerRequestId =
    typeof result.requestId === "string" ? result.requestId : null;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(result.text);
  } catch {
    return {
      ok: false,
      error: "creative_core_json_parse_failed",
      messages,
      lastRaw: JSON.stringify({
        diagnostics: {
          validation_errors: [
            { path: "$", message: "creative_core_json_parse_failed" },
          ],
          provider_request_id: providerRequestId,
        },
      }),
    };
  }

  const parsed = parseCreativeCoreResponse(parsedJson, {
    strategyItemId: args.context.strategyItemId,
    painPoint: args.context.strategy.pain_point,
  });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, messages };
  }

  const clamped = applySoftVoiceoverClamp({
    core: parsed.core,
    packageKind: args.context.packageKind,
  });
  // Re-apply fingerprint with pain after clamp (clamp may have wiped pain).
  const core = applyDeterministicCreativeFingerprint(
    clamped.core,
    args.context.strategy.pain_point,
  );

  const validation = validateCreativeCore({
    core,
    packageKind: args.context.packageKind,
    memory: args.context.memory,
    projectPains: listifyToArray(args.context.productBrain.pain_points),
    raw: parsed.rawObject,
    painPoint: args.context.strategy.pain_point,
  });
  if (!validation.ok) {
    const diagnostics = buildCreativeCoreFailureDiagnostics({
      core,
      llmFingerprint: parsed.llmFingerprint,
      painPoint: args.context.strategy.pain_point,
      voiceoverSoftClamp: clamped.clamp,
      validationErrors: validation.issues,
      providerRequestId,
    });
    return {
      ok: false,
      error: CREATIVE_CORE_VALIDATION_FAILED_V2,
      issues: validation.issues,
      messages,
      diagnostics,
      lastRaw: buildCreativeCoreFailureLastRaw({ core, diagnostics }),
    };
  }
  return { ok: true, core, messages };
}

function listifyToArray(
  value: string | string[] | null | undefined,
): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(/[;\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Helper for strategy candidates that still lack a fingerprint. */
export function ensureStrategyFingerprint(
  candidate: StrategyCandidateV2,
): StrategyCandidateV2 {
  if (candidate.creative_fingerprint?.version === "creative-fingerprint@2") {
    return candidate;
  }
  return {
    ...candidate,
    creative_fingerprint: computeCreativeFingerprint({
      pain_point: candidate.pain_point,
      topic: candidate.topic,
      angle: candidate.angle,
    }),
  };
}
