/**
 * Deterministic Creative Core v2 validation.
 * Accepts or returns stable errors — never "improves" creative content.
 */

import {
  CREATIVE_CORE_V2_CONTRACT_VERSION,
  CREATIVE_CORE_V2_FINGERPRINT_VERSION,
  CREATIVE_CORE_V2_MEMORY_CONFIG,
} from "@/lib/content-creative-core-v2/config";
import {
  fingerprintFromCreativeCore,
  fingerprintsStructurallyEqual,
  isParaphraseText,
  normalizeCreativeText,
} from "@/lib/content-creative-core-v2/fingerprint";
import { evaluateStrategyCandidateOriginality } from "@/lib/content-creative-core-v2/strategyOriginality";
import type {
  ContentCreativeCoreV2,
  CreativeCorePackageKind,
  CreativeCoreValidationIssue,
  CreativeCoreValidationResult,
  CreativeCoreV2Scene,
  CreativeMemoryV2,
  StrategyCandidateV2,
} from "@/lib/content-creative-core-v2/types";
import { CREATIVE_CORE_V2_SCREEN_POLICIES } from "@/lib/content-creative-core-v2/types";

const FORBIDDEN_CORE_KEYS = [
  "tiktok_caption",
  "instagram_caption",
  "facebook_post",
  "linkedin_post",
  "x_post",
  "twitter_post",
  "hashtags",
  "youtube_title",
  "youtube_description",
  "youtube_metadata",
  "social_image",
  "image_prompt",
  "provider_prompt",
  "runway_prompt",
  "platform_outputs",
  "tts",
  "render_status",
  "technical_clips",
] as const;

function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function isAbstractEssay(text: string): boolean {
  const t = normalizeCreativeText(text);
  if (!t) return true;
  if (t.split(" ").length < 4) return true;
  const abstractOnly =
    /^(awareness|engagement|value proposition|brand presence|visibility|credibility)(\s|$)/.test(
      t,
    );
  return abstractOnly;
}

function validateScene(
  scene: CreativeCoreV2Scene,
  index: number,
  issues: CreativeCoreValidationIssue[],
): void {
  const base = `$.scenes[${index}]`;
  if (!scene.scene_id?.trim()) {
    issues.push({ path: `${base}.scene_id`, message: "scene_id is required" });
  }
  if (!Number.isFinite(scene.order) || scene.order < 1) {
    issues.push({ path: `${base}.order`, message: "order must be >= 1" });
  }
  if (!scene.voiceover_excerpt?.trim()) {
    issues.push({
      path: `${base}.voiceover_excerpt`,
      message: "voiceover_excerpt is required",
    });
  }
  if (isAbstractEssay(scene.visual_event) || isAbstractEssay(scene.action)) {
    issues.push({
      path: `${base}.visual_event`,
      message: "scene must describe a concrete visual event/action, not an abstract essay",
    });
  }
  if (!scene.motion_or_change?.trim()) {
    issues.push({
      path: `${base}.motion_or_change`,
      message: "each scene needs motion or visible change",
    });
  }
  if (!scene.emotion?.trim()) {
    issues.push({ path: `${base}.emotion`, message: "each scene needs emotion" });
  }
  if (
    !(CREATIVE_CORE_V2_SCREEN_POLICIES as readonly string[]).includes(
      scene.screen_policy,
    )
  ) {
    issues.push({
      path: `${base}.screen_policy`,
      message: `screen_policy must be one of ${CREATIVE_CORE_V2_SCREEN_POLICIES.join("|")}`,
    });
  }
}

function hookStartsVoiceover(hook: string, voiceover: string): boolean {
  const h = normalizeCreativeText(hook);
  const v = normalizeCreativeText(voiceover);
  if (!h || !v) return false;
  if (v.startsWith(h)) return true;
  // Allow minor punctuation drift on first sentence.
  const firstSentence = v.split(/[.!?]/)[0]?.trim() ?? "";
  return firstSentence === h || isParaphraseText(h, firstSentence);
}

function scenesCoverVoiceoverInOrder(
  voiceover: string,
  scenes: CreativeCoreV2Scene[],
): boolean {
  const vo = normalizeCreativeText(voiceover);
  let cursor = 0;
  for (const scene of scenes) {
    const excerpt = normalizeCreativeText(scene.voiceover_excerpt);
    if (!excerpt) return false;
    const idx = vo.indexOf(excerpt, cursor);
    if (idx < 0) {
      // Allow loose coverage via paraphrase of a slice near cursor.
      const window = vo.slice(cursor, cursor + Math.max(excerpt.length * 2, 40));
      if (!isParaphraseText(excerpt, window) && tokenLoose(excerpt, window) < 0.4) {
        return false;
      }
      cursor += Math.max(1, Math.floor(excerpt.length / 2));
    } else {
      cursor = idx + excerpt.length;
    }
  }
  return true;
}

function tokenLoose(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter((w) => w.length >= 4));
  const tb = new Set(b.split(" ").filter((w) => w.length >= 4));
  if (ta.size === 0 || tb.size === 0) return 0;
  let o = 0;
  for (const w of ta) if (tb.has(w)) o += 1;
  return o / Math.min(ta.size, tb.size);
}

function assertNoForbiddenKeys(
  raw: Record<string, unknown> | null,
  issues: CreativeCoreValidationIssue[],
): void {
  if (!raw) return;
  for (const key of FORBIDDEN_CORE_KEYS) {
    if (key in raw && raw[key] != null) {
      issues.push({
        path: `$.${key}`,
        message: `Creative Core must not contain platform/provider field "${key}"`,
      });
    }
  }
  if (raw.platform_outputs != null) {
    issues.push({
      path: "$.platform_outputs",
      message: "platform_outputs belong downstream, not in Creative Core",
    });
  }
}

export function validateCreativeCore(args: {
  core: ContentCreativeCoreV2;
  packageKind: CreativeCorePackageKind;
  memory?: CreativeMemoryV2 | null;
  projectPains?: readonly string[];
  /** Optional raw object to catch forbidden sibling keys. */
  raw?: Record<string, unknown> | null;
  /** Pain point from strategy (for fingerprint / memory checks). */
  painPoint?: string | null;
}): CreativeCoreValidationResult {
  const cfg = CREATIVE_CORE_V2_MEMORY_CONFIG;
  const issues: CreativeCoreValidationIssue[] = [];
  const { core, packageKind } = args;

  if (core.contract_version !== CREATIVE_CORE_V2_CONTRACT_VERSION) {
    issues.push({
      path: "$.contract_version",
      message: `expected contract_version ${CREATIVE_CORE_V2_CONTRACT_VERSION}`,
    });
  }

  assertNoForbiddenKeys(args.raw ?? null, issues);

  for (const field of [
    "core_idea",
    "hook",
    "voiceover",
    "main_emotion",
    "conflict",
    "reveal_or_surprise",
    "visible_change",
    "payoff",
    "cta_intent",
  ] as const) {
    if (!core[field]?.trim()) {
      issues.push({ path: `$.${field}`, message: `${field} is required` });
    }
  }

  if (!core.creative_fingerprint) {
    issues.push({
      path: "$.creative_fingerprint",
      message: "creative_fingerprint is required",
    });
  } else if (
    core.creative_fingerprint.version !== CREATIVE_CORE_V2_FINGERPRINT_VERSION
  ) {
    issues.push({
      path: "$.creative_fingerprint.version",
      message: `expected ${CREATIVE_CORE_V2_FINGERPRINT_VERSION}`,
    });
  } else {
    const expected = fingerprintFromCreativeCore({
      ...core,
      pain_point: args.painPoint ?? null,
    });
    if (!fingerprintsStructurallyEqual(core.creative_fingerprint, expected)) {
      // Allow exact match on recomputed structural keys; if hook/core differ wildly, fail.
      const softOk =
        core.creative_fingerprint.topic_key === expected.topic_key &&
        core.creative_fingerprint.conflict_key === expected.conflict_key;
      if (!softOk) {
        issues.push({
          path: "$.creative_fingerprint",
          message: "creative_fingerprint does not match the creative core content",
        });
      }
    }
  }

  if (!hookStartsVoiceover(core.hook, core.voiceover)) {
    issues.push({
      path: "$.hook",
      message: "hook must be the start / first sentence of voiceover",
    });
  }

  const words = wordCount(core.voiceover);
  if (packageKind === "video") {
    if (words < cfg.voiceoverWordMin || words > cfg.voiceoverWordMax) {
      issues.push({
        path: "$.voiceover",
        message: `voiceover must be ${cfg.voiceoverWordMin}–${cfg.voiceoverWordMax} words (got ${words})`,
      });
    }
    if (
      core.scenes.length < cfg.videoSceneMin ||
      core.scenes.length > cfg.videoSceneMax
    ) {
      issues.push({
        path: "$.scenes",
        message: `video package requires ${cfg.videoSceneMin}–${cfg.videoSceneMax} scenes (got ${core.scenes.length})`,
      });
    }
  } else if (core.scenes.length > 0) {
    issues.push({
      path: "$.scenes",
      message: "text_only Creative Core must not invent video scenes",
    });
  }

  const ids = new Set<string>();
  const orders = new Set<number>();
  core.scenes.forEach((scene, index) => {
    validateScene(scene, index, issues);
    if (scene.scene_id) {
      if (ids.has(scene.scene_id)) {
        issues.push({
          path: `$.scenes[${index}].scene_id`,
          message: `duplicate scene_id ${scene.scene_id}`,
        });
      }
      ids.add(scene.scene_id);
    }
    if (orders.has(scene.order)) {
      issues.push({
        path: `$.scenes[${index}].order`,
        message: `duplicate order ${scene.order}`,
      });
    }
    orders.add(scene.order);
  });

  if (packageKind === "video" && core.scenes.length > 0) {
    const sorted = [...core.scenes].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i].order !== i + 1) {
        issues.push({
          path: "$.scenes",
          message: "scene order must be contiguous starting at 1",
        });
        break;
      }
    }
    if (!scenesCoverVoiceoverInOrder(core.voiceover, sorted)) {
      issues.push({
        path: "$.scenes",
        message: "scenes must cover voiceover excerpts in order",
      });
    }
  }

  if (args.memory) {
    const candidate: StrategyCandidateV2 = {
      topic: core.core_idea,
      angle: core.conflict,
      pain_point: args.painPoint ?? "",
      creative_fingerprint: fingerprintFromCreativeCore({
        ...core,
        pain_point: args.painPoint ?? null,
      }),
    };
    const originality = evaluateStrategyCandidateOriginality({
      candidate,
      memory: args.memory,
      projectPains: args.projectPains ?? [],
      packageCount: 1,
    });
    if (!originality.ok) {
      for (const issue of originality.issues) {
        issues.push({
          path: "$.creative_fingerprint",
          message: `hard creative memory conflict: ${issue.reason} — ${issue.detail}`,
        });
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
