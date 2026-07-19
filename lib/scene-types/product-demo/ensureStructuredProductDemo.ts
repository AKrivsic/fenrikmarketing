/**
 * Ensure a structured PRODUCT_DEMO scene exists on the package (Sprint 4C.1 + 5.1).
 * Injection is deterministic — not prose inference.
 */

import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import {
  buildDefaultProductDemoBeat,
  extractProductDemoBeat,
  parseProductDemoBeat,
  type ProductDemoBeat,
} from "@/lib/scene-types/product-demo/productDemoBeat";
import type { ProductDemoVariant } from "@/lib/scene-types/product-demo/demoVariant";
import { resolveEffectiveDemoVariant } from "@/lib/scene-types/product-demo/demoVariant";
import { buildProductDemoChatSvg } from "@/lib/scene-types/product-demo/composeProductDemoRaster";

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

/** True when beat fields are complete and SVG can be built. */
export function assertProductDemoRenderable(
  beat: ProductDemoBeat,
): { ok: true } | { ok: false; reason: string } {
  const parsed = parseProductDemoBeat(beat);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  try {
    const { svg, metadata } = buildProductDemoChatSvg(parsed.data);
    if (!svg.includes(parsed.data.visitor_question.slice(0, 20))) {
      return { ok: false, reason: "question missing from chat svg" };
    }
    if (
      !metadata.questionVisible ||
      !metadata.aiAnswerVisible ||
      !metadata.outcomeVisible
    ) {
      return { ok: false, reason: "chat visual missing required visibility flags" };
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
  const opening = winner.openingSituation || winner.coreIdea;
  const askMatch = opening.match(
    /\b((?:urgent |booking |availability )?question[^.]{0,80}|Do you have[^?]{0,60}\?)/i,
  );
  const narrative =
    opts?.narrativeText ??
    [winner.hookLine, winner.openingSituation, winner.coreIdea]
      .filter(Boolean)
      .join(" ");
  return buildDefaultProductDemoBeat({
    actorId: "primary_actor",
    conversationId: `conv-${winner.candidateId || "pkg"}`.slice(0, 120),
    visitorQuestion:
      askMatch?.[0]?.trim().slice(0, 160) ||
      "Do you have availability tomorrow?",
    aiAnswer:
      "Yes — we have openings tomorrow. I can hold a morning or afternoon slot for you.",
    outcomeType: "lead_captured",
    brandName: "Fenrik.chat",
    narrativeText: narrative,
    recentVariants: opts?.recentVariants,
  });
}

/**
 * Ensure visual_scenes includes a PRODUCT_DEMO typed scene with a complete beat.
 * When `force` is true (repair), replaces the last non-CTA scene with PRODUCT_DEMO.
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

  if (existing && !args.force) {
    const withVariant = assignVariant(existing, variantOpts);
    const renderable = assertProductDemoRenderable(withVariant);
    const existingIdx = scenes.findIndex(isProductDemoScene);
    if (existingIdx >= 0) {
      const prev = asRecord(scenes[existingIdx]) ?? {};
      scenes[existingIdx] = {
        ...prev,
        type: "PRODUCT_DEMO",
        payload: withVariant,
        id: typeof prev.id === "string" ? prev.id : "scene-product-demo",
      };
    }
    return {
      beat: withVariant,
      injected: false,
      replacedResolution: false,
      renderable: renderable.ok,
      scenes,
      packageBriefPatch: { product_demo: withVariant },
      reason: renderable.ok ? undefined : renderable.reason,
    };
  }

  const beat = buildProductDemoFromWinner(
    args.winner,
    existing
      ? { ...existing, demo_variant: undefined }
      : existing,
    variantOpts,
  );
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
    narration_hint: "Show the visitor question, Fenrik AI answer, and outcome.",
  };

  let replacedResolution = false;
  const existingIdx = scenes.findIndex(isProductDemoScene);
  if (existingIdx >= 0) {
    scenes[existingIdx] = demoScene;
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
  } else {
    let insertAt = scenes.length;
    for (let i = scenes.length - 1; i >= 0; i--) {
      if (isLikelyCtaScene(scenes[i])) {
        insertAt = i;
        break;
      }
    }
    scenes.splice(insertAt, 0, demoScene);
  }

  return {
    beat,
    injected: true,
    replacedResolution,
    renderable: true,
    scenes,
    packageBriefPatch: { product_demo: beat },
  };
}

export function isUiOnlyProductDemoScene(entry: unknown): boolean {
  return isUiOnlyOrPhoneCloseup(entry);
}
