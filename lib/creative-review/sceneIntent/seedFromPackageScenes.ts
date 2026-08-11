/**
 * Provisional Scene Creative Intent seeder.
 *
 * -----------------------------------------------------------------------------
 * REPLACEABLE ADAPTER
 * -----------------------------------------------------------------------------
 * The Creative Engine does not yet emit Scene Creative Intent natively.
 * This module derives intent from the package visual plan / typed payloads
 * (and, as a last resort, from AI still prompts) WITHOUT persisting image
 * prompts onto the Creative Review object.
 *
 * When native Scene Intent generation lands, replace the body of
 * `seedSceneIntentsForCreativeReview` (or swap this file). Callers must only
 * depend on that function and the SceneCreativeIntent / CreativeReviewScene
 * types — never on image_prompt fields.
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
  /** Legacy still prompts — used only when visual_scenes is absent. */
  imagePrompts: readonly string[] | null | undefined;
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

/**
 * Convert a raw AI still prompt into a creative-intent description.
 * Strips common camera/style boilerplate; never returns an empty string.
 */
function intentDescriptionFromStillPrompt(prompt: string): string {
  let text = prompt.trim();
  // Drop leading "Prompt:" / "Image prompt:" labels if present.
  text = text.replace(/^(image\s*)?prompt\s*:\s*/i, "");
  // Collapse whitespace.
  text = text.replace(/\s+/g, " ").trim();
  if (!text) {
    return "Visual scene — creative intent not specified.";
  }
  return text;
}

function makeIntent(args: {
  description: string;
  presentation_type: string | null;
  visual_source: SceneIntentVisualSource;
  asset_id?: string | null;
  used_as?: string | null;
}): SceneCreativeIntent {
  return {
    description: args.description,
    presentation_type: args.presentation_type,
    visual_source: args.visual_source,
    asset_id: args.asset_id ?? null,
    used_as: args.used_as ?? null,
  };
}

function intentFromAiStill(prompt: string): SceneCreativeIntent {
  return makeIntent({
    description: intentDescriptionFromStillPrompt(prompt),
    presentation_type: "IMAGE",
    visual_source: "generated",
  });
}

function intentFromAsset(args: {
  assetId: string;
  usedAs: string;
}): SceneCreativeIntent {
  const role = args.usedAs.trim() || "product asset";
  return makeIntent({
    description: `Show product asset (${role}).`,
    presentation_type: "IMAGE",
    visual_source: "asset",
    asset_id: args.assetId,
    used_as: role,
  });
}

function intentFromChecklist(entry: PackageVisualSceneEntry): SceneCreativeIntent {
  const payload = asRecord((entry as { payload?: unknown }).payload) ?? {};
  const title = nonEmpty(payload.title);
  const items = Array.isArray(payload.items)
    ? payload.items.filter((i): i is string => typeof i === "string" && i.trim().length > 0)
    : [];
  const itemPreview = items.slice(0, 3).map((i) => i.trim()).join("; ");
  const description = title
    ? itemPreview
      ? `Checklist “${title}”: ${itemPreview}`
      : `Checklist “${title}”`
    : itemPreview
      ? `Checklist: ${itemPreview}`
      : "On-screen checklist.";
  return makeIntent({
    description,
    presentation_type: "CHECKLIST",
    visual_source: "typed_overlay",
  });
}

function intentFromPhone(entry: PackageVisualSceneEntry): SceneCreativeIntent {
  const payload = asRecord((entry as { payload?: unknown }).payload) ?? {};
  const assetId = nonEmpty(payload.asset_id);
  const caption = nonEmpty(payload.caption);
  const prompt = nonEmpty(payload.image_prompt);
  if (assetId) {
    return makeIntent({
      description: caption
        ? `Phone mockup featuring product asset — ${caption}`
        : "Phone mockup featuring product asset.",
      presentation_type: "PHONE",
      visual_source: "asset",
      asset_id: assetId,
      used_as: "phone_screen",
    });
  }
  return makeIntent({
    description: caption
      ? `Phone mockup — ${caption}`
      : prompt
        ? intentDescriptionFromStillPrompt(prompt)
        : "Phone mockup scene.",
    presentation_type: "PHONE",
    visual_source: "generated",
  });
}

function intentFromQuote(entry: PackageVisualSceneEntry): SceneCreativeIntent {
  const payload = asRecord((entry as { payload?: unknown }).payload) ?? {};
  const quote = nonEmpty(payload.quote) ?? "Quote";
  const attribution = nonEmpty(payload.attribution);
  const description = attribution
    ? `Quote: “${quote}” — ${attribution}`
    : `Quote: “${quote}”`;
  return makeIntent({
    description,
    presentation_type: "QUOTE",
    visual_source: "typed_overlay",
  });
}

function intentFromStatistic(
  entry: PackageVisualSceneEntry,
): SceneCreativeIntent {
  const payload = asRecord((entry as { payload?: unknown }).payload) ?? {};
  const value = nonEmpty(payload.value) ?? "";
  const label = nonEmpty(payload.label) ?? "";
  const unit = nonEmpty(payload.unit);
  const valuePart = unit ? `${value}${unit}` : value;
  const description =
    valuePart && label
      ? `Statistic: ${valuePart} — ${label}`
      : valuePart
        ? `Statistic: ${valuePart}`
        : label
          ? `Statistic: ${label}`
          : "On-screen statistic.";
  return makeIntent({
    description,
    presentation_type: "STATISTIC",
    visual_source: "typed_overlay",
  });
}

function intentFromCta(entry: PackageVisualSceneEntry): SceneCreativeIntent {
  const payload = asRecord((entry as { payload?: unknown }).payload) ?? {};
  const headline = nonEmpty(payload.headline) ?? "Call to action";
  const subline = nonEmpty(payload.subline);
  const button = nonEmpty(payload.button_label);
  const parts = [headline];
  if (subline) parts.push(subline);
  if (button) parts.push(`Button: ${button}`);
  const assetId = nonEmpty(payload.asset_id);
  return makeIntent({
    description: parts.join(" — "),
    presentation_type: "CTA",
    visual_source: assetId ? "asset" : "typed_overlay",
    asset_id: assetId,
    used_as: assetId ? "cta_visual" : null,
  });
}

function intentFromVisualSceneEntry(
  entry: PackageVisualSceneEntry,
): SceneCreativeIntent {
  if (isChecklistVisualSceneEntry(entry)) return intentFromChecklist(entry);
  if (isPhoneVisualSceneEntry(entry)) return intentFromPhone(entry);
  if (isQuoteVisualSceneEntry(entry)) return intentFromQuote(entry);
  if (isStatisticVisualSceneEntry(entry)) return intentFromStatistic(entry);
  if (isCtaVisualSceneEntry(entry)) return intentFromCta(entry);

  const record = asRecord(entry);
  if (!record) {
    return makeIntent({
      description: "Visual scene — creative intent not specified.",
      presentation_type: null,
      visual_source: "generated",
    });
  }

  if (record.source === "asset") {
    const assetId = nonEmpty(record.asset_id) ?? "unknown";
    const usedAs = nonEmpty(record.used_as) ?? "product asset";
    return intentFromAsset({ assetId, usedAs });
  }

  if (record.source === "ai") {
    const prompt = nonEmpty(record.image_prompt) ?? "";
    return intentFromAiStill(prompt);
  }

  // Legacy / unknown shapes — best-effort without inventing prompts.
  const type = nonEmpty(record.type);
  return makeIntent({
    description: type
      ? `${type} scene — creative intent not specified.`
      : "Visual scene — creative intent not specified.",
    presentation_type: type,
    visual_source: "generated",
  });
}

function sceneIdFor(entry: PackageVisualSceneEntry | null, index: number): string {
  if (entry) {
    const record = asRecord(entry);
    const id = nonEmpty(record?.id);
    if (id) return id;
  }
  return `scene-${index + 1}`;
}

/**
 * Build fully initialized Creative Review scenes with Scene Creative Intent.
 * Returns [] when the package has no visual plan (e.g. text-only) — still valid.
 */
export function seedSceneIntentsForCreativeReview(
  input: SceneIntentSeedInput,
): CreativeReviewScene[] {
  const visualScenes = Array.isArray(input.visualScenes)
    ? input.visualScenes
    : [];

  if (visualScenes.length > 0) {
    return visualScenes.map((entry, index) => ({
      id: sceneIdFor(entry, index),
      index,
      intent: intentFromVisualSceneEntry(entry),
      director_notes: "",
    }));
  }

  const prompts = Array.isArray(input.imagePrompts)
    ? input.imagePrompts.filter(
        (p): p is string => typeof p === "string" && p.trim().length > 0,
      )
    : [];

  return prompts.map((prompt, index) => ({
    id: `scene-${index + 1}`,
    index,
    intent: intentFromAiStill(prompt),
    director_notes: "",
  }));
}

/** Convenience: seed from a ContentPackageOutput. */
export function seedSceneIntentsFromPackage(
  pkg: Pick<ContentPackageOutput, "visual_scenes" | "image_prompts">,
): CreativeReviewScene[] {
  return seedSceneIntentsForCreativeReview({
    visualScenes: pkg.visual_scenes,
    imagePrompts: pkg.image_prompts,
  });
}
