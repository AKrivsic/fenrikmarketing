/**
 * Sprint 5.1 — lightweight PRODUCT_DEMO visual variants.
 * Same semantic contract (question → answer → outcome); different compositions.
 * No LLM. Deterministic mapping + optional run-level LRU rotation.
 */

import type { ProductDemoOutcomeType } from "@/lib/scene-types/product-demo/productDemoBeat";

export const PRODUCT_DEMO_VARIANTS = [
  "conversation_answer",
  "lead_capture",
  "booking_confirmation",
  "after_hours_response",
] as const;

export type ProductDemoVariant = (typeof PRODUCT_DEMO_VARIANTS)[number];

/** Explicit safe PRODUCT_DEMO fallback when variant is missing/unknown. */
export const SAFE_PRODUCT_DEMO_VARIANT: ProductDemoVariant = "conversation_answer";

const VARIANT_SET = new Set<string>(PRODUCT_DEMO_VARIANTS);

export function isProductDemoVariant(value: unknown): value is ProductDemoVariant {
  return typeof value === "string" && VARIANT_SET.has(value);
}

const AFTER_HOURS_HINT =
  /\b(after[- ]?hours|weekend|monday morning|overnight|while you(?:'|’)re away|11\s*pm|10\s*pm|offline|at night|late night)\b/i;

export function narrativeSuggestsAfterHours(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false;
  return AFTER_HOURS_HINT.test(text);
}

/** Primary variant preferred for an outcome (before rotation). */
export function primaryVariantForOutcome(
  outcomeType: ProductDemoOutcomeType,
): ProductDemoVariant {
  switch (outcomeType) {
    case "question_resolved":
      return "conversation_answer";
    case "booking_confirmed":
      return "booking_confirmation";
    case "lead_captured":
    case "contact_captured":
      return "lead_capture";
    default:
      return SAFE_PRODUCT_DEMO_VARIANT;
  }
}

/**
 * Compatible variants for an outcome (+ optional after-hours narrative).
 * Always includes at least one fully renderable variant.
 */
export function listCompatibleDemoVariants(args: {
  outcomeType: ProductDemoOutcomeType;
  narrativeText?: string | null;
}): ProductDemoVariant[] {
  const afterHours = narrativeSuggestsAfterHours(args.narrativeText);
  let list: ProductDemoVariant[];
  switch (args.outcomeType) {
    case "question_resolved":
      list = ["conversation_answer", "after_hours_response"];
      break;
    case "booking_confirmed":
      list = ["booking_confirmation", "conversation_answer", "after_hours_response"];
      break;
    case "lead_captured":
    case "contact_captured":
      list = ["lead_capture", "conversation_answer", "after_hours_response"];
      break;
    default:
      list = [SAFE_PRODUCT_DEMO_VARIANT];
  }
  if (afterHours && !list.includes("after_hours_response")) {
    list = [...list, "after_hours_response"];
  }
  if (afterHours) {
    // Prefer after_hours when narrative supports it, still keep outcome primary.
    list = [
      "after_hours_response",
      ...list.filter((v) => v !== "after_hours_response"),
    ];
  }
  return list;
}

/**
 * Pick a variant: prefer least recently used among compatible.
 * Avoids consecutive repeat when another compatible option exists.
 */
export function selectDemoVariant(args: {
  outcomeType: ProductDemoOutcomeType;
  narrativeText?: string | null;
  /** Chronological (oldest → newest) variants already used in this run. */
  recentVariants?: readonly ProductDemoVariant[];
}): ProductDemoVariant {
  const compatible = listCompatibleDemoVariants({
    outcomeType: args.outcomeType,
    narrativeText: args.narrativeText,
  });
  if (compatible.length === 1) return compatible[0]!;

  const recent = args.recentVariants ?? [];
  const last = recent.length > 0 ? recent[recent.length - 1] : null;

  const ranked = [...compatible].sort((a, b) => {
    const ia = recent.lastIndexOf(a);
    const ib = recent.lastIndexOf(b);
    // Never used (-1) sorts before used; older lastIndex preferred over recent.
    if (ia !== ib) return ia - ib;
    return compatible.indexOf(a) - compatible.indexOf(b);
  });

  let pick = ranked[0]!;
  if (last && pick === last && ranked.length > 1) {
    pick = ranked[1]!;
  }
  return pick;
}

/** Resolve effective variant from beat fields (never returns unknown). */
export function resolveEffectiveDemoVariant(args: {
  demoVariant?: unknown;
  outcomeType: ProductDemoOutcomeType;
  narrativeText?: string | null;
  recentVariants?: readonly ProductDemoVariant[];
}): {
  variant: ProductDemoVariant;
  unknownStripped: boolean;
  source: "explicit" | "selected" | "safe_fallback";
} {
  if (isProductDemoVariant(args.demoVariant)) {
    return {
      variant: args.demoVariant,
      unknownStripped: false,
      source: "explicit",
    };
  }
  const unknownStripped =
    args.demoVariant !== undefined &&
    args.demoVariant !== null &&
    args.demoVariant !== "";
  if (unknownStripped) {
    // Explicit safe PRODUCT_DEMO fallback — never lifestyle IMAGE.
    return {
      variant: primaryVariantForOutcome(args.outcomeType),
      unknownStripped: true,
      source: "safe_fallback",
    };
  }
  return {
    variant: selectDemoVariant({
      outcomeType: args.outcomeType,
      narrativeText: args.narrativeText,
      recentVariants: args.recentVariants,
    }),
    unknownStripped: false,
    source: "selected",
  };
}

/** Extract demo_variant values from package_brief.visual_scenes (oldest → newest). */
export function extractDemoVariantsFromPackageBriefs(
  briefs: readonly unknown[],
): ProductDemoVariant[] {
  const out: ProductDemoVariant[] = [];
  for (const brief of briefs) {
    if (!brief || typeof brief !== "object" || Array.isArray(brief)) continue;
    const scenes = (brief as { visual_scenes?: unknown }).visual_scenes;
    if (!Array.isArray(scenes)) continue;
    for (const scene of scenes) {
      if (!scene || typeof scene !== "object" || Array.isArray(scene)) continue;
      const r = scene as Record<string, unknown>;
      if (String(r.type ?? "").toUpperCase() !== "PRODUCT_DEMO") continue;
      const payload =
        r.payload && typeof r.payload === "object" && !Array.isArray(r.payload)
          ? (r.payload as Record<string, unknown>)
          : r;
      if (isProductDemoVariant(payload.demo_variant)) {
        out.push(payload.demo_variant);
      }
    }
  }
  return out;
}
