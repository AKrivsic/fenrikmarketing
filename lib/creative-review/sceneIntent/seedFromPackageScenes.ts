/**
 * Scene shell helpers for Creative Review.
 *
 * -----------------------------------------------------------------------------
 * REPLACEABLE ADAPTER
 * -----------------------------------------------------------------------------
 * Structural scene shells + technical source collection for AI Scene Intent
 * conversion. When native Scene Intent generation lands in the Creative Engine,
 * replace generateSceneCreativeIntents / this adapter boundary. Callers must
 * never persist image_prompt onto Scene Creative Intent.
 * -----------------------------------------------------------------------------
 */

import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import {
  isChecklistVisualSceneEntry,
  isCtaVisualSceneEntry,
  isPhoneVisualSceneEntry,
  isQuoteVisualSceneEntry,
  isStatisticVisualSceneEntry,
  type PackageVisualSceneEntry,
} from "@/lib/content-package/generatedVisualScene";
import type {
  CreativeReviewScene,
  SceneCreativeIntent,
  SceneIntentVisualSource,
} from "@/lib/creative-review/types";

export interface SceneIntentSeedInput {
  visualScenes: readonly PackageVisualSceneEntry[] | null | undefined;
  imagePrompts: readonly string[] | null | undefined;
}

export interface SceneIntentConversionSource {
  id: string;
  index: number;
  presentation_type: string | null;
  visual_source: SceneIntentVisualSource;
  asset_id: string | null;
  used_as: string | null;
  /**
   * Technical / payload text fed to the AI converter only.
   * Never persisted on creative_review.intent.
   */
  technical_source: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function makeIntent(args: {
  original: string;
  localized_edit: string;
  english_preview?: string | null;
  english_preview_outdated?: boolean;
  presentation_type: string | null;
  visual_source: SceneIntentVisualSource;
  asset_id?: string | null;
  used_as?: string | null;
}): SceneCreativeIntent {
  return {
    original: args.original,
    localized_edit: args.localized_edit,
    english_preview: args.english_preview ?? null,
    english_preview_outdated: args.english_preview_outdated ?? true,
    presentation_type: args.presentation_type,
    visual_source: args.visual_source,
    asset_id: args.asset_id ?? null,
    used_as: args.used_as ?? null,
  };
}

function sceneIdFor(entry: PackageVisualSceneEntry | null, index: number): string {
  if (entry) {
    const record = asRecord(entry);
    const id = nonEmpty(record?.id);
    if (id) return id;
  }
  return `scene-${index + 1}`;
}

function technicalFromChecklist(entry: PackageVisualSceneEntry): string {
  const payload = asRecord((entry as { payload?: unknown }).payload) ?? {};
  return JSON.stringify({
    type: "CHECKLIST",
    title: payload.title ?? null,
    items: payload.items ?? [],
  });
}

function technicalFromPhone(entry: PackageVisualSceneEntry): string {
  const payload = asRecord((entry as { payload?: unknown }).payload) ?? {};
  return JSON.stringify({
    type: "PHONE",
    caption: payload.caption ?? null,
    has_asset: Boolean(nonEmpty(payload.asset_id)),
    image_prompt: nonEmpty(payload.image_prompt),
  });
}

function technicalFromQuote(entry: PackageVisualSceneEntry): string {
  const payload = asRecord((entry as { payload?: unknown }).payload) ?? {};
  return JSON.stringify({
    type: "QUOTE",
    quote: payload.quote ?? null,
    attribution: payload.attribution ?? null,
  });
}

function technicalFromStatistic(entry: PackageVisualSceneEntry): string {
  const payload = asRecord((entry as { payload?: unknown }).payload) ?? {};
  return JSON.stringify({
    type: "STATISTIC",
    value: payload.value ?? null,
    unit: payload.unit ?? null,
    label: payload.label ?? null,
  });
}

function technicalFromCta(entry: PackageVisualSceneEntry): string {
  const payload = asRecord((entry as { payload?: unknown }).payload) ?? {};
  return JSON.stringify({
    type: "CTA",
    headline: payload.headline ?? null,
    subline: payload.subline ?? null,
    button_label: payload.button_label ?? null,
    has_asset: Boolean(nonEmpty(payload.asset_id)),
  });
}

function conversionSourceFromEntry(
  entry: PackageVisualSceneEntry,
  index: number,
): SceneIntentConversionSource {
  const id = sceneIdFor(entry, index);

  if (isChecklistVisualSceneEntry(entry)) {
    return {
      id,
      index,
      presentation_type: "CHECKLIST",
      visual_source: "typed_overlay",
      asset_id: null,
      used_as: null,
      technical_source: technicalFromChecklist(entry),
    };
  }
  if (isPhoneVisualSceneEntry(entry)) {
    const payload = asRecord(entry.payload) ?? {};
    const assetId = nonEmpty(payload.asset_id);
    return {
      id,
      index,
      presentation_type: "PHONE",
      visual_source: assetId ? "asset" : "generated",
      asset_id: assetId,
      used_as: assetId ? "phone_screen" : null,
      technical_source: technicalFromPhone(entry),
    };
  }
  if (isQuoteVisualSceneEntry(entry)) {
    return {
      id,
      index,
      presentation_type: "QUOTE",
      visual_source: "typed_overlay",
      asset_id: null,
      used_as: null,
      technical_source: technicalFromQuote(entry),
    };
  }
  if (isStatisticVisualSceneEntry(entry)) {
    return {
      id,
      index,
      presentation_type: "STATISTIC",
      visual_source: "typed_overlay",
      asset_id: null,
      used_as: null,
      technical_source: technicalFromStatistic(entry),
    };
  }
  if (isCtaVisualSceneEntry(entry)) {
    const payload = asRecord(entry.payload) ?? {};
    const assetId = nonEmpty(payload.asset_id);
    return {
      id,
      index,
      presentation_type: "CTA",
      visual_source: assetId ? "asset" : "typed_overlay",
      asset_id: assetId,
      used_as: assetId ? "cta_visual" : null,
      technical_source: technicalFromCta(entry),
    };
  }

  const record = asRecord(entry);
  if (record?.source === "asset") {
    const assetId = nonEmpty(record.asset_id) ?? "unknown";
    const usedAs = nonEmpty(record.used_as) ?? "product asset";
    return {
      id,
      index,
      presentation_type: "IMAGE",
      visual_source: "asset",
      asset_id: assetId,
      used_as: usedAs,
      technical_source: JSON.stringify({
        type: "ASSET",
        asset_id: assetId,
        used_as: usedAs,
      }),
    };
  }

  if (record?.source === "ai") {
    const prompt = nonEmpty(record.image_prompt) ?? "";
    return {
      id,
      index,
      presentation_type: "IMAGE",
      visual_source: "generated",
      asset_id: null,
      used_as: null,
      technical_source: prompt || JSON.stringify({ type: "IMAGE", prompt: null }),
    };
  }

  const type = nonEmpty(record?.type);
  return {
    id,
    index,
    presentation_type: type,
    visual_source: "generated",
    asset_id: null,
    used_as: null,
    technical_source: JSON.stringify({ type: type ?? "UNKNOWN", entry: record }),
  };
}

/** Collect conversion sources for AI Scene Intent generation. */
export function collectSceneIntentConversionSources(
  input: SceneIntentSeedInput,
): SceneIntentConversionSource[] {
  const visualScenes = Array.isArray(input.visualScenes)
    ? input.visualScenes
    : [];

  if (visualScenes.length > 0) {
    return visualScenes.map((entry, index) =>
      conversionSourceFromEntry(entry, index),
    );
  }

  const prompts = Array.isArray(input.imagePrompts)
    ? input.imagePrompts.filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0,
      )
    : [];

  return prompts.map((prompt, index) => ({
    id: `scene-${index + 1}`,
    index,
    presentation_type: "IMAGE",
    visual_source: "generated" as const,
    asset_id: null,
    used_as: null,
    technical_source: prompt,
  }));
}

/**
 * Build provisional Creative Review scenes before AI conversion / translation.
 * Uses placeholder human text — replaced by generateSceneCreativeIntents.
 */
export function seedSceneIntentsForCreativeReview(
  input: SceneIntentSeedInput,
): CreativeReviewScene[] {
  const sources = collectSceneIntentConversionSources(input);
  return sources.map((source) => ({
    id: source.id,
    index: source.index,
    intent: makeIntent({
      original: "Creative intent pending.",
      localized_edit: "Creative intent pending.",
      english_preview: null,
      english_preview_outdated: true,
      presentation_type: source.presentation_type,
      visual_source: source.visual_source,
      asset_id: source.asset_id,
      used_as: source.used_as,
    }),
    director_notes: "",
  }));
}

export function seedSceneIntentsFromPackage(
  pkg: Pick<ContentPackageOutput, "visual_scenes" | "image_prompts">,
): CreativeReviewScene[] {
  return seedSceneIntentsForCreativeReview({
    visualScenes: pkg.visual_scenes,
    imagePrompts: pkg.image_prompts,
  });
}

export function collectSceneIntentConversionSourcesFromPackage(
  pkg: Pick<ContentPackageOutput, "visual_scenes" | "image_prompts">,
): SceneIntentConversionSource[] {
  return collectSceneIntentConversionSources({
    visualScenes: pkg.visual_scenes,
    imagePrompts: pkg.image_prompts,
  });
}
