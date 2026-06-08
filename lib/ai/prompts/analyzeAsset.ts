import type { AssetClass } from "@/lib/ai/guardrails";
import type { MediaType } from "@/lib/supabase/types";

// Prompt for Phase 2B asset analysis. The same instruction is used for both the
// vision path (an image is attached to the message) and the text path (the file
// text is embedded below). The model never generates or edits media — it only
// describes/classifies the asset.

export interface AnalyzeAssetPromptInput {
  title: string;
  mediaType: MediaType;
  mimeType: string | null;
  // The user-selected class — provided as context only; the model proposes its
  // own suggested_asset_class and must not assume it equals this.
  assetClass: AssetClass;
  // Present for the text path (non-image, readable files). Absent for images.
  text?: string;
}

export const ANALYZE_ASSET_SYSTEM =
  "You are a marketing asset analyst. You inspect a single marketing asset and " +
  "return a concise, structured description. You never generate or edit media; " +
  "you only describe and classify what is provided. Output a single valid JSON " +
  "document only.";

export function buildAnalyzeAssetPrompt(input: AnalyzeAssetPromptInput): string {
  const { title, mediaType, mimeType, assetClass, text } = input;

  const lines: string[] = [
    "ASSET FACTS:",
    `- title: ${JSON.stringify(title)}`,
    `- media_type: ${mediaType}`,
    `- mime_type: ${mimeType ?? "(unknown)"}`,
    `- user_selected_class: ${assetClass}`,
    "",
  ];

  if (typeof text === "string") {
    lines.push(
      "FILE TEXT (analyze this content):",
      JSON.stringify(text),
      "",
    );
  } else {
    lines.push(
      "An image is attached to this message. Analyze the attached image.",
      "",
    );
  }

  lines.push(
    "TASK: Produce the following fields:",
    "- ai_description: 1–2 sentences describing the asset's content.",
    "- detected_content_type: a short label (e.g. 'product photo', 'logo',",
    "  'screenshot', 'testimonial', 'price list', 'document').",
    "- suggested_usage: one short sentence on how it could be used in content.",
    "- suggested_asset_class: one of static | editable | reference.",
    "- extracted_text: any legible text visible in the asset, else empty string.",
    "- trust_signal: true if it could serve as trust/proof material",
    "  (testimonial, review, certificate, metric, award), otherwise false.",
    "",
    "RULES:",
    "- Use only what is actually present; do not invent facts.",
    "- Keep strings short. Output must be a single valid JSON document, no prose,",
    "  no code fences.",
    "",
    "Produce JSON with EXACTLY this shape:",
    `{
  "ai_description": "string",
  "detected_content_type": "string",
  "suggested_usage": "string",
  "suggested_asset_class": "static | editable | reference",
  "extracted_text": "string",
  "trust_signal": true
}`,
  );

  return lines.join("\n");
}
