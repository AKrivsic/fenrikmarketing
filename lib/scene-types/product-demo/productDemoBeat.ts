/**
 * Structured Product Demo beat (Sprint 4C.1 + 5.1 demo_variant + 5.3 semantics).
 * Source of truth for Product Demonstration Integrity — not prose regex.
 *
 * Universal semantics: input → product/service creates value → visible outcome.
 * Field names (`visitor_question`, `ai_answer`, …) are the current chat execution
 * of that contract; the chat renderer remains the production path for
 * conversational products. Do not invent chatbot beats for unrelated products.
 */

import { z } from "zod";
import {
  PRODUCT_DEMO_VARIANTS,
  SAFE_PRODUCT_DEMO_VARIANT,
  isProductDemoVariant,
  resolveEffectiveDemoVariant,
  type ProductDemoVariant,
} from "@/lib/scene-types/product-demo/demoVariant";

export const PRODUCT_DEMO_OUTCOME_TYPES = [
  "lead_captured",
  "booking_confirmed",
  "question_resolved",
  "contact_captured",
] as const;

export type ProductDemoOutcomeType = (typeof PRODUCT_DEMO_OUTCOME_TYPES)[number];

export { PRODUCT_DEMO_VARIANTS, type ProductDemoVariant };

/** Strip unknown demo_variant before zod so we can apply a safe PRODUCT_DEMO fallback. */
function sanitizeRawBeat(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const r = { ...(raw as Record<string, unknown>) };
  if (
    r.demo_variant !== undefined &&
    r.demo_variant !== null &&
    !isProductDemoVariant(r.demo_variant)
  ) {
    delete r.demo_variant;
  }
  return r;
}

export const productDemoBeatSchema = z.object({
  type: z.literal("product_demo"),
  actor_id: z.string().trim().min(1).max(120),
  conversation_id: z.string().trim().min(1).max(120),
  question_visible: z.literal(true),
  ai_answer_visible: z.literal(true),
  outcome_visible: z.literal(true),
  outcome_type: z.enum(PRODUCT_DEMO_OUTCOME_TYPES),
  visitor_question: z.string().trim().min(1).max(160),
  ai_answer: z.string().trim().min(1).max(200),
  outcome_label: z.string().trim().min(1).max(120),
  brand_name: z.string().trim().min(1).max(80).default("Fenrik.chat"),
  /** Sprint 5.1 — visual composition variant (optional on legacy payloads). */
  demo_variant: z.enum(PRODUCT_DEMO_VARIANTS).optional(),
});

export type ProductDemoBeat = z.infer<typeof productDemoBeatSchema>;

/** Scene payload stored on visual_scenes PRODUCT_DEMO entries. */
export const productDemoScenePayloadSchema = productDemoBeatSchema;

export type ProductDemoScenePayload = ProductDemoBeat;

export function parseProductDemoBeat(
  raw: unknown,
): { ok: true; data: ProductDemoBeat } | { ok: false; reason: string } {
  const parsed = productDemoBeatSchema.safeParse(sanitizeRawBeat(raw));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      reason: issue
        ? `${issue.path.join(".") || "beat"}: ${issue.message}`
        : "invalid product_demo beat",
    };
  }
  const data = parsed.data;
  return { ok: true, data };
}

export function parseProductDemoScenePayload(
  raw: unknown,
): { ok: true; data: ProductDemoScenePayload } | { ok: false; reason: string } {
  return parseProductDemoBeat(raw);
}

export function productDemoPlaceholderImagePrompt(sceneId: string): string {
  return `presentation:product_demo:${sceneId}`;
}

export function buildDefaultProductDemoBeat(args: {
  actorId: string;
  conversationId?: string;
  visitorQuestion?: string;
  aiAnswer?: string;
  outcomeType?: ProductDemoOutcomeType;
  brandName?: string;
  demoVariant?: ProductDemoVariant;
  narrativeText?: string | null;
  recentVariants?: readonly ProductDemoVariant[];
}): ProductDemoBeat {
  const outcomeType = args.outcomeType ?? "lead_captured";
  const outcomeLabel =
    outcomeType === "booking_confirmed"
      ? "Booking confirmed"
      : outcomeType === "question_resolved"
        ? "Question answered"
        : outcomeType === "contact_captured"
          ? "Contact saved"
          : "Lead captured";

  const resolved = resolveEffectiveDemoVariant({
    demoVariant: args.demoVariant,
    outcomeType,
    narrativeText: args.narrativeText,
    recentVariants: args.recentVariants,
  });

  return {
    type: "product_demo",
    actor_id: args.actorId.slice(0, 120) || "primary_actor",
    conversation_id:
      args.conversationId?.slice(0, 120) ||
      `conv-${Date.now().toString(36)}`,
    question_visible: true,
    ai_answer_visible: true,
    outcome_visible: true,
    outcome_type: outcomeType,
    visitor_question:
      args.visitorQuestion?.slice(0, 160) ||
      "Do you have availability tomorrow?",
    ai_answer:
      args.aiAnswer?.slice(0, 200) ||
      "Yes — we have openings tomorrow morning and afternoon. Want me to hold a slot?",
    outcome_label: outcomeLabel,
    brand_name: args.brandName?.slice(0, 80) || "Fenrik.chat",
    demo_variant: resolved.variant ?? SAFE_PRODUCT_DEMO_VARIANT,
  };
}

/** Find a PRODUCT_DEMO scene payload or package_brief.product_demo beat. */
export function extractProductDemoBeat(args: {
  visualScenes?: readonly unknown[] | null;
  productDemo?: unknown;
}): ProductDemoBeat | null {
  if (args.productDemo) {
    const parsed = parseProductDemoBeat(args.productDemo);
    if (parsed.ok) return parsed.data;
  }
  for (const s of args.visualScenes ?? []) {
    if (!s || typeof s !== "object" || Array.isArray(s)) continue;
    const r = s as Record<string, unknown>;
    if (String(r.type ?? "").toUpperCase() !== "PRODUCT_DEMO") continue;
    const parsed = parseProductDemoBeat(r.payload ?? r);
    if (parsed.ok) return parsed.data;
  }
  return null;
}
