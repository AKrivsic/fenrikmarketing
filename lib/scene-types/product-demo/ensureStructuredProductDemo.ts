/**
 * Ensure a structured PRODUCT_DEMO scene exists on the package (Sprint 4C.1 + 5.1 + 5.3).
 *
 * Semantic contract (universal): input → product/service creates value → visible outcome.
 * Current renderer executes that contract as a controlled chat UI for conversational
 * products (Fenrik.chat). Injection never fabricates a chatbot demonstration when
 * the package has no existing product_demo beat (Sprint 5.3).
 */

import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import {
  extractProductDemoBeat,
  parseProductDemoBeat,
  type ProductDemoBeat,
} from "@/lib/scene-types/product-demo/productDemoBeat";
import type { ProductDemoVariant } from "@/lib/scene-types/product-demo/demoVariant";
import { resolveEffectiveDemoVariant } from "@/lib/scene-types/product-demo/demoVariant";
import { buildProductDemoChatSvg } from "@/lib/scene-types/product-demo/composeProductDemoRaster";

export const PRODUCT_DEMO_NOT_FABRICATED =
  "product_demonstration_not_fabricated" as const;

export interface EnsureStructuredProductDemoResult {
  beat: ProductDemoBeat | null;
  injected: boolean;
  replacedResolution: boolean;
  renderable: boolean;
  scenes: unknown[];
  packageBriefPatch: { product_demo: ProductDemoBeat } | null;
  reason?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isProductDemoScene(entry: unknown): boolean {
  const r = asRecord(entry);
  return String(r?.type ?? "").toUpperCase() === "PRODUCT_DEMO";
}

function isLikelyCtaScene(entry: unknown): boolean {
  const r = asRecord(entry);
  if (!r) return false;
  if (String(r.type ?? "").toUpperCase() === "CTA") return true;
  const prompt = `${r.image_prompt ?? ""} ${r.used_as ?? ""}`.toLowerCase();
  return /\b(cta|call to action|create your ai|sign up|get started)\b/.test(
    prompt,
  );
}

function isUiOnlyOrPhoneCloseup(entry: unknown): boolean {
  if (isProductDemoScene(entry)) return true;
  const r = asRecord(entry);
  if (!r) return false;
  const t = String(r.type ?? "").toUpperCase();
  if (t === "PHONE" || t === "CHECKLIST" || t === "QUOTE" || t === "STATISTIC") {
    return true;
  }
  const prompt = `${r.image_prompt ?? ""} ${r.used_as ?? ""}`.toLowerCase();
  return (
    /\b(phone close-?up|ui[- ]only|chat (thread|ui|screen)|screen only|no face|hands only)\b/.test(
      prompt,
    ) ||
    (/\b(phone|smartphone|chat|screen|ui)\b/.test(prompt) &&
      !/\b(face|portrait|smiling|professional figure|suited)\b/.test(prompt))
  );
}

/** True when beat fields are complete and the current chat raster can be built. */
export function assertProductDemoRenderable(
  beat: ProductDemoBeat,
): { ok: true } | { ok: false; reason: string } {
  const parsed = parseProductDemoBeat(beat);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  try {
    const { svg, metadata } = buildProductDemoChatSvg(parsed.data);
    if (!svg.includes(parsed.data.visitor_question.slice(0, 20))) {
      return { ok: false, reason: "input missing from product demo visual" };
    }
    if (
      !metadata.questionVisible ||
      !metadata.aiAnswerVisible ||
      !metadata.outcomeVisible
    ) {
      return {
        ok: false,
        reason: "product demo visual missing required visibility flags",
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "compose failed",
    };
  }
}

function assignVariant(
  beat: ProductDemoBeat,
  args: {
    narrativeText?: string | null;
    recentVariants?: readonly ProductDemoVariant[];
  },
): ProductDemoBeat {
  const resolved = resolveEffectiveDemoVariant({
    demoVariant: beat.demo_variant,
    outcomeType: beat.outcome_type,
    narrativeText: args.narrativeText,
    recentVariants: args.recentVariants,
  });
  return { ...beat, demo_variant: resolved.variant };
}

/**
 * Complete / normalize an existing product_demo beat (variant assignment).
 * Does not invent Fenrik.chat conversations for packages that never produced a beat.
 */
export function completeExistingProductDemoBeat(
  existing: ProductDemoBeat,
  opts?: {
    narrativeText?: string | null;
    recentVariants?: readonly ProductDemoVariant[];
  },
): ProductDemoBeat {
  return assignVariant(existing, opts ?? {});
}

/**
 * @deprecated Sprint 5.3 — do not call to fabricate demos for unknown products.
 * Prefer LLM-authored PRODUCT_DEMO scenes or completeExistingProductDemoBeat.
 * Kept for explicit Fenrik.chat test fixtures that build beats intentionally.
 */
export function buildProductDemoFromWinner(
  winner: CreativeCandidate,
  existing?: ProductDemoBeat | null,
  opts?: {
    narrativeText?: string | null;
    recentVariants?: readonly ProductDemoVariant[];
  },
): ProductDemoBeat {
  if (existing) {
    const parsed = parseProductDemoBeat(existing);
    if (parsed.ok) {
      return assignVariant(parsed.data, opts ?? {});
    }
  }
  // Intentionally not inventing booking/Fenrik defaults from winner prose.
  // Callers that need a fixture must use buildDefaultProductDemoBeat explicitly.
  throw new Error(
    `${PRODUCT_DEMO_NOT_FABRICATED}: refusing to invent a chatbot product demonstration for candidate ${winner.candidateId || "unknown"}`,
  );
}

/**
 * Ensure visual_scenes includes a PRODUCT_DEMO typed scene with a complete beat
 * when one already exists. Never fabricates a chatbot demo from scratch (5.3).
 *
 * When `force` is true and an existing beat is present, refreshes the PRODUCT_DEMO
 * scene in place (or replaces the last non-CTA resolution with that beat).
 */
export function ensureStructuredProductDemo(args: {
  visualScenes: readonly unknown[] | null | undefined;
  winner: CreativeCandidate;
  productDemo?: unknown;
  force?: boolean;
  /** Voiceover / hook / concept — used for after-hours variant mapping. */
  narrativeText?: string | null;
  /** Chronological demo variants already used in this production run. */
  recentVariants?: readonly ProductDemoVariant[];
}): EnsureStructuredProductDemoResult {
  const scenes = [...(args.visualScenes ?? [])];
  const existing = extractProductDemoBeat({
    visualScenes: scenes,
    productDemo: args.productDemo,
  });

  const variantOpts = {
    narrativeText: args.narrativeText,
    recentVariants: args.recentVariants,
  };

  if (!existing) {
    return {
      beat: null,
      injected: false,
      replacedResolution: false,
      renderable: false,
      scenes,
      packageBriefPatch: null,
      reason: PRODUCT_DEMO_NOT_FABRICATED,
    };
  }

  const beat = completeExistingProductDemoBeat(existing, variantOpts);
  const renderable = assertProductDemoRenderable(beat);
  if (!renderable.ok) {
    return {
      beat: null,
      injected: false,
      replacedResolution: false,
      renderable: false,
      scenes,
      packageBriefPatch: null,
      reason: renderable.reason,
    };
  }

  const demoScene = {
    id: "scene-product-demo",
    type: "PRODUCT_DEMO",
    payload: beat,
    role: "product_demonstration",
    narration_hint:
      "Show the product demonstration: input, product creating value, visible outcome.",
  };

  let injected = false;
  let replacedResolution = false;
  const existingIdx = scenes.findIndex(isProductDemoScene);
  if (existingIdx >= 0) {
    const prev = asRecord(scenes[existingIdx]) ?? {};
    scenes[existingIdx] = {
      ...demoScene,
      id: typeof prev.id === "string" ? prev.id : demoScene.id,
    };
  } else if (args.force && scenes.length > 0) {
    let replaceIdx = scenes.length - 1;
    for (let i = scenes.length - 1; i >= 0; i--) {
      if (!isLikelyCtaScene(scenes[i])) {
        replaceIdx = i;
        break;
      }
    }
    scenes[replaceIdx] = demoScene;
    replacedResolution = true;
    injected = true;
  } else if (!args.force) {
    let insertAt = scenes.length;
    for (let i = scenes.length - 1; i >= 0; i--) {
      if (isLikelyCtaScene(scenes[i])) {
        insertAt = i;
        break;
      }
    }
    scenes.splice(insertAt, 0, demoScene);
    injected = true;
  } else {
    return {
      beat,
      injected: false,
      replacedResolution: false,
      renderable: true,
      scenes,
      packageBriefPatch: { product_demo: beat },
      reason: "product_demo_beat_present_but_no_scene_slot",
    };
  }

  return {
    beat,
    injected,
    replacedResolution,
    renderable: true,
    scenes,
    packageBriefPatch: { product_demo: beat },
  };
}

export function isUiOnlyProductDemoScene(entry: unknown): boolean {
  return isUiOnlyOrPhoneCloseup(entry);
}
