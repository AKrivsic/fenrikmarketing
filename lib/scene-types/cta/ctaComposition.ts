import type { CtaScenePayload } from "@/lib/scene-types/cta/ctaScenePayload";
import type { FunnelStage } from "@/lib/ai/types";

function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(h);
}

export const CTA_COMPOSITION_IDS = [
  "classic_card",
  "text_only",
  "logo_message",
  "headline_action_line",
  "minimal_statement",
  "split_asset_text",
  "asset_overlay",
  "product_screenshot_overlay",
] as const;

export type CtaCompositionId = (typeof CTA_COMPOSITION_IDS)[number];

export interface PickCtaCompositionInput {
  packageId?: string | null;
  payload: CtaScenePayload;
  funnelStage: FunnelStage | null;
  recentCompositionIds: readonly string[];
  hasLogoAsset: boolean;
  hasHeroAsset: boolean;
  visualProfile?: string | null;
  precedingSceneIsAsset: boolean;
}

function headlineLen(payload: CtaScenePayload): number {
  return payload.headline.trim().length;
}

export function pickCtaComposition(
  input: PickCtaCompositionInput,
): CtaCompositionId {
  if (input.payload.composition) {
    const c = input.payload.composition as CtaCompositionId;
    if ((CTA_COMPOSITION_IDS as readonly string[]).includes(c)) return c;
  }

  const avoidRecent = new Set(input.recentCompositionIds.slice(0, 4));
  const seed = [
    input.packageId ?? "pkg",
    input.funnelStage ?? "stage",
    input.visualProfile ?? "profile",
    input.payload.headline,
    input.precedingSceneIsAsset ? "after_asset" : "after_image",
  ].join("::");

  if (input.hasHeroAsset) {
    const heroPool: CtaCompositionId[] = [
      "product_screenshot_overlay",
      "asset_overlay",
      "split_asset_text",
    ];
    const filteredHero = heroPool.filter((id) => !avoidRecent.has(id));
    const heroPick = filteredHero.length > 0 ? filteredHero : heroPool;
    const idxHero = hashString(`${seed}::hero`) % heroPick.length;
    return heroPick[idxHero] ?? "product_screenshot_overlay";
  }

  const candidates: CtaCompositionId[] = [];

  if (input.hasLogoAsset) {
    candidates.push("logo_message", "classic_card");
  }

  if (headlineLen(input.payload) <= 28) {
    candidates.push("minimal_statement", "headline_action_line", "text_only");
  }

  candidates.push("classic_card", "text_only", "headline_action_line");

  const unique = [...new Set(candidates)];
  const filtered = unique.filter((id) => !avoidRecent.has(id));
  const pool = filtered.length > 0 ? filtered : unique;

  const idx = hashString(seed) % pool.length;
  return pool[idx] ?? "classic_card";
}

export function defaultShowButtonForComposition(
  composition: CtaCompositionId,
  payload: CtaScenePayload,
): boolean {
  if (payload.show_button === false) return false;
  if (payload.show_button === true) return true;
  switch (composition) {
    case "text_only":
    case "minimal_statement":
    case "logo_message":
      return false;
    case "headline_action_line":
      return false;
    default:
      return Boolean(payload.button_label?.trim());
  }
}
