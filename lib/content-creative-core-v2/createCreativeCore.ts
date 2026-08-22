/**
 * Single Claude Creative Core v2 request builder + optional provider call.
 * Not wired into production generate/continue/workers in Step 1.
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
import { validateCreativeCore } from "@/lib/content-creative-core-v2/validate";
import type {
  ContentCreativeCoreV2,
  CreativeCorePackageKind,
  CreativeCoreV2Scene,
  CreativeCoreV2ScreenPolicy,
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

/**
 * Parse model JSON into ContentCreativeCoreV2 without mutating creative meaning.
 * Recomputes fingerprint if missing; does not rewrite hook/VO/scenes.
 */
export function parseCreativeCoreResponse(
  raw: unknown,
  args: {
    strategyItemId?: string | null;
    painPoint?: string | null;
  } = {},
): { ok: true; core: ContentCreativeCoreV2; rawObject: Record<string, unknown> } | {
  ok: false;
  error: string;
} {
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

  const fingerprint =
    asRecord(root.creative_fingerprint)?.version === "creative-fingerprint@2"
      ? (root.creative_fingerprint as ContentCreativeCoreV2["creative_fingerprint"])
      : fingerprintFromCreativeCore({
          ...partial,
          pain_point: args.painPoint ?? null,
        });

  const core: ContentCreativeCoreV2 = {
    contract_version: CREATIVE_CORE_V2_CONTRACT_VERSION,
    strategy_item_id:
      readString(root.strategy_item_id) || args.strategyItemId || null,
    creative_fingerprint: fingerprint,
    ...partial,
  };

  return { ok: true, core, rawObject: root };
}

export type TextProviderLike = {
  complete: (args: {
    system: string;
    prompt: string;
  }) => Promise<{ text: string }>;
};

/**
 * Optional provider execution. Step 1 production paths must NOT call this.
 * Offline tests use parseCreativeCoreResponse + validateCreativeCore only.
 */
export async function createCreativeCore(args: {
  context: CreativeCoreRequestContext;
  textProvider: TextProviderLike;
}): Promise<
  | { ok: true; core: ContentCreativeCoreV2; messages: CreativeCoreMessages }
  | {
      ok: false;
      error: typeof CREATIVE_CORE_VALIDATION_FAILED_V2 | string;
      issues?: Array<{ path: string; message: string }>;
      messages: CreativeCoreMessages;
    }
> {
  if (CREATIVE_CORE_V2_MEMORY_CONFIG.maxCreativeCoreAttempts !== 1) {
    // Guardrail: config must stay at one creative attempt.
  }
  const messages = buildCreativeCoreMessages(args.context);
  const result = await args.textProvider.complete({
    system: messages.system,
    prompt: messages.user,
  });
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(result.text);
  } catch {
    return {
      ok: false,
      error: "creative_core_json_parse_failed",
      messages,
    };
  }
  const parsed = parseCreativeCoreResponse(parsedJson, {
    strategyItemId: args.context.strategyItemId,
    painPoint: args.context.strategy.pain_point,
  });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, messages };
  }
  const validation = validateCreativeCore({
    core: parsed.core,
    packageKind: args.context.packageKind,
    memory: args.context.memory,
    projectPains: listifyToArray(args.context.productBrain.pain_points),
    raw: parsed.rawObject,
    painPoint: args.context.strategy.pain_point,
  });
  if (!validation.ok) {
    return {
      ok: false,
      error: CREATIVE_CORE_VALIDATION_FAILED_V2,
      issues: validation.issues,
      messages,
    };
  }
  return { ok: true, core: parsed.core, messages };
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
