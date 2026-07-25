import type { ValidationIssue } from "@/lib/ai/validateAiOutput";

// JSON repair is an OpenAI helper task (per provider rules). Given a broken /
// invalid model output plus the validation errors, it must return ONLY valid
// JSON that conforms to the originally requested shape.
export const JSON_REPAIR_SYSTEM =
  "You are a strict JSON repair function. You receive a malformed or invalid " +
  "JSON-ish text and a list of problems. Return ONLY a single corrected JSON " +
  "document. Do not add explanations, comments or code fences. Preserve all " +
  "valid creative content; only fix structure, missing required fields and types. " +
  "When EXPECTED SHAPE is provided, use only those supported shapes — do not invent " +
  "new field names or scene formats. " +
  "If platform_outputs.<platform>.caption is missing/invalid and caption_variants[0] " +
  "is a non-empty string, set caption = caption_variants[0]. Variants never replace caption. " +
  "cta may be null when allowed by EXPECTED SHAPE; when present it must be { type, text } with " +
  "non-empty text. If cta.type is invalid, change ONLY cta.type to an allowed value from EXPECTED SHAPE " +
  "(or set cta to null when optional). Never copy project.goal_type into cta.type unless allowed. " +
  "Never use empty string or the literals \"null\"/\"undefined\" as platform CTA. " +
  "If voiceover_text exceeds the word maximum, shorten it to at most 80 words (prefer 40–70): " +
  "keep the hook, main argument, and CTA when required; remove repetition; keep the same language; sync " +
  "subtitles to the shortened spoken words; do not blindly truncate mid-sentence.";

export interface JsonRepairPromptInput {
  brokenOutput: string;
  issues: ValidationIssue[];
  // The shape description from the original prompt, so the repair stays faithful.
  expectedShape?: string;
}

export function buildJsonRepairPrompt(input: JsonRepairPromptInput): string {
  const { brokenOutput, issues, expectedShape } = input;
  return [
    "Fix the following output so it becomes a single valid JSON document.",
    "Preserve valid creative content. Fix structure and field types only.",
    "Do not invent new content unless a required field is missing.",
    "Use only supported shapes from EXPECTED SHAPE when provided.",
    "If a platform has caption_variants but caption is missing or not a string, set caption = caption_variants[0].",
    "LinkedIn with variants needs caption + caption_variants; X needs caption + caption_variants + title_variants.",
    "If cta is optional and invalid, prefer cta: null or a valid soft type; if required, set a valid business { type, text }.",
    "If cta.type is outside the allowed list in EXPECTED SHAPE, change only cta.type to the closest allowed value; keep cta.text.",
    "Platform cta must not be empty string or the literals null/undefined — use omit/null or a real string.",
    "If voiceover_text is over the hard maximum, shorten to ≤80 words (prefer 40–70) while keeping hook + core argument (+ CTA when required); sync subtitles; do not invent a new marketing angle.",
    "",
    "PROBLEMS DETECTED:",
    issues.length
      ? issues.map((i) => `- ${i.path}: ${i.message}`).join("\n")
      : "- JSON.parse failed",
    expectedShape ? `\nEXPECTED SHAPE:\n${expectedShape}` : "",
    "",
    "ORIGINAL OUTPUT:",
    brokenOutput,
    "",
    "Return ONLY the corrected JSON.",
  ].join("\n");
}
