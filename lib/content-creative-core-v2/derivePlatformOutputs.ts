/**
 * One text AI request: approved Creative Core → all selected platform outputs.
 */

import type { ContentCreativeCoreV2 } from "@/lib/content-creative-core-v2/types";
import type { DerivedPlatformOutputV2 } from "@/lib/content-creative-core-v2/derivedOutputsTypes";
import { isPendingStep3Placeholder } from "@/lib/content-creative-core-v2/placeholderGuard";

export interface DerivePlatformOutputsContext {
  core: ContentCreativeCoreV2;
  productionVoiceoverEn: string;
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
  language: string;
  market: string;
  goalType?: string | null;
  funnelStage: string;
  platforms: readonly string[];
  requireSocialImage: boolean;
  assetNotes?: string | null;
}

export interface DerivePlatformOutputsParsed {
  platform_outputs: Record<string, DerivedPlatformOutputV2>;
  hashtags: string[];
  cta: { type: string; text: string } | null;
  social_image_creative_brief: {
    image_prompt: string;
    text_overlay?: string | null;
  } | null;
}

function listify(value: string | string[] | null | undefined): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join("; ");
  return String(value).trim();
}

export function buildDerivePlatformOutputsMessages(
  ctx: DerivePlatformOutputsContext,
): { system: string; user: string } {
  const platforms = ctx.platforms.join(", ");
  const system = [
    "You derive platform marketing copy from ONE approved Creative Core.",
    "Return a single JSON object. No markdown fences.",
    "Do NOT invent a new story, hook, voiceover, or scenes.",
    "Do NOT change the Creative Core meaning.",
    "Each platform gets a natural channel-specific variant — not a paste of the voiceover.",
    "Never output placeholder strings like [pending_step_3:...].",
    "Never include Runway prompts, clip IDs, or technical render fields.",
  ].join("\n");

  const user = [
    "## Approved Creative Core (authority)",
    `core_idea: ${ctx.core.core_idea}`,
    `hook: ${ctx.core.hook}`,
    `voiceover: ${ctx.productionVoiceoverEn}`,
    `main_emotion: ${ctx.core.main_emotion}`,
    `conflict: ${ctx.core.conflict}`,
    `reveal: ${ctx.core.reveal_or_surprise}`,
    `visible_change: ${ctx.core.visible_change}`,
    `payoff: ${ctx.core.payoff}`,
    `cta_intent: ${ctx.core.cta_intent}`,
    "",
    "## Product Brain",
    `name: ${ctx.productBrain.product_name ?? ""}`,
    `description: ${ctx.productBrain.product_description ?? ""}`,
    `audience: ${ctx.productBrain.audience ?? ""}`,
    `market: ${ctx.productBrain.market ?? ctx.market}`,
    `strengths: ${listify(ctx.productBrain.strengths)}`,
    `pain_points: ${listify(ctx.productBrain.pain_points)}`,
    `default_cta: ${ctx.productBrain.cta ?? ""}`,
    `brand_voice: ${ctx.productBrain.brand_voice ?? ""}`,
    "",
    `language: ${ctx.language}`,
    `goal: ${ctx.goalType ?? ""}`,
    `funnel_stage: ${ctx.funnelStage}`,
    `selected_platforms: ${platforms}`,
    ctx.assetNotes?.trim() ? `asset_notes: ${ctx.assetNotes.trim()}` : "",
    "",
    "## Required JSON shape",
    "{",
    '  "platform_outputs": {',
    '    "<platform>": { "caption": "...", "cta": "...|null", "hashtags": ["..."], "title": "...|null", "description": "...|null" }',
    "  },",
    '  "hashtags": ["..."],',
    '  "cta": { "type": "other", "text": "..." },',
    ctx.requireSocialImage
      ? '  "social_image_creative_brief": { "image_prompt": "...", "text_overlay": null }'
      : '  "social_image_creative_brief": null',
    "}",
    "",
    "Include ONLY the selected platforms in platform_outputs.",
    "For youtube: title + description required; caption may mirror short description.",
    "For x: keep caption short.",
    ctx.requireSocialImage
      ? "social_image_creative_brief must be a package-level 1:1 feed image idea (NOT a video scene still). Reflect core idea + brand. No readable UI text in the image."
      : "Omit social image brief (null).",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

export function parseDerivePlatformOutputsResponse(
  text: string,
  selectedPlatforms: readonly string[],
  requireSocialImage: boolean,
):
  | { ok: true; data: DerivePlatformOutputsParsed }
  | { ok: false; error: string } {
  let raw: unknown;
  try {
    const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    raw = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "invalid_root" };
  }
  const record = raw as Record<string, unknown>;
  const outputsRaw = record.platform_outputs;
  if (!outputsRaw || typeof outputsRaw !== "object" || Array.isArray(outputsRaw)) {
    return { ok: false, error: "missing_platform_outputs" };
  }

  const selected = new Set(selectedPlatforms.map((p) => p.trim().toLowerCase()));
  const platform_outputs: Record<string, DerivedPlatformOutputV2> = {};
  for (const [key, value] of Object.entries(outputsRaw as Record<string, unknown>)) {
    const platform = key.trim().toLowerCase();
    if (!selected.has(platform)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: `invalid_output:${platform}` };
    }
    const row = value as Record<string, unknown>;
    const caption = typeof row.caption === "string" ? row.caption.trim() : "";
    if (!caption || isPendingStep3Placeholder(caption)) {
      return { ok: false, error: `empty_or_placeholder_caption:${platform}` };
    }
    platform_outputs[platform] = {
      caption,
      cta: typeof row.cta === "string" ? row.cta.trim() : row.cta === null ? null : null,
      hashtags: Array.isArray(row.hashtags)
        ? row.hashtags.filter((h): h is string => typeof h === "string")
        : [],
      title: typeof row.title === "string" ? row.title.trim() : null,
      description:
        typeof row.description === "string" ? row.description.trim() : null,
    };
  }

  for (const platform of selected) {
    if (!platform_outputs[platform]) {
      return { ok: false, error: `missing_platform:${platform}` };
    }
  }

  const hashtags = Array.isArray(record.hashtags)
    ? record.hashtags.filter((h): h is string => typeof h === "string")
    : [];

  let cta: { type: string; text: string } | null = null;
  if (record.cta && typeof record.cta === "object" && !Array.isArray(record.cta)) {
    const c = record.cta as Record<string, unknown>;
    const textCta = typeof c.text === "string" ? c.text.trim() : "";
    const type = typeof c.type === "string" ? c.type.trim() : "other";
    if (textCta) cta = { type: type || "other", text: textCta };
  }

  let social_image_creative_brief: DerivePlatformOutputsParsed["social_image_creative_brief"] =
    null;
  if (requireSocialImage) {
    const brief = record.social_image_creative_brief;
    if (!brief || typeof brief !== "object" || Array.isArray(brief)) {
      return { ok: false, error: "missing_social_image_brief" };
    }
    const b = brief as Record<string, unknown>;
    const image_prompt =
      typeof b.image_prompt === "string" ? b.image_prompt.trim() : "";
    if (!image_prompt) return { ok: false, error: "empty_social_image_prompt" };
    social_image_creative_brief = {
      image_prompt,
      text_overlay:
        typeof b.text_overlay === "string" ? b.text_overlay.trim() : null,
    };
  }

  return {
    ok: true,
    data: {
      platform_outputs,
      hashtags,
      cta,
      social_image_creative_brief,
    },
  };
}

export type TextProviderLike = {
  complete: (args: {
    system: string;
    prompt: string;
  }) => Promise<{ text: string; model?: string; provider?: string }>;
};

export async function derivePlatformOutputsWithProvider(args: {
  context: DerivePlatformOutputsContext;
  textProvider: TextProviderLike;
}): Promise<
  | {
      ok: true;
      data: DerivePlatformOutputsParsed;
      provider: string | null;
      model: string | null;
    }
  | { ok: false; error: string }
> {
  const messages = buildDerivePlatformOutputsMessages(args.context);
  const completion = await args.textProvider.complete({
    system: messages.system,
    prompt: messages.user,
  });
  const parsed = parseDerivePlatformOutputsResponse(
    completion.text,
    args.context.platforms,
    args.context.requireSocialImage,
  );
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    data: parsed.data,
    provider: completion.provider ?? null,
    model: completion.model ?? null,
  };
}
