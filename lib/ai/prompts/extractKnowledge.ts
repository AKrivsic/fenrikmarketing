import type { Project } from "@/lib/supabase/types";
import { languageLabel } from "@/lib/ai/prompts/localizeContentPackage";

// Knowledge Model V2 — extraction prompt. Turns a single page of website text
// into four proposed cards (Product / Customer / Voice / Proof). The output is a
// PROPOSAL the user reviews and approves; the model must not invent facts that
// are not supported by the source text.

export interface ExtractKnowledgePromptInput {
  project: Project;
  // Plain text extracted from the project's website (see fetchUrlText).
  text: string;
}

export const EXTRACT_KNOWLEDGE_SYSTEM =
  "You are a senior brand strategist. From the text of a company's website you " +
  "extract a concise, structured brand knowledge proposal. You only use facts " +
  "supported by the provided text; you never invent products, claims, numbers, " +
  "or testimonials. Output a single valid JSON document only.";

export function buildExtractKnowledgePrompt(
  input: ExtractKnowledgePromptInput,
): string {
  const { project, text } = input;
  const targetLabel = languageLabel(project.language);

  return [
    `PROJECT: ${project.name}`,
    `OUTPUT LANGUAGE: ${targetLabel} (${project.language}).`,
    "",
    "TASK: From the WEBSITE TEXT below, propose four brand knowledge cards.",
    "Each field is a list of short, concrete bullet strings (no sentences longer",
    "than ~15 words). Keep each list focused (max ~6 items).",
    "",
    "CARDS:",
    "- product.product_is: what the product/service IS (core offering).",
    "- product.product_is_not: what it explicitly is NOT / common misconceptions.",
    "- product.product_strengths: concrete strengths / differentiators.",
    "- customer.target_audience: who it is for (segments, roles, situations).",
    "- customer.pain_points: problems the audience has that this solves.",
    "- voice.tone: tone-of-voice descriptors (e.g. friendly, expert, concise).",
    "- voice.forbidden_claims: claims that must NEVER be made (legal/over-promise).",
    "- proof.statements: trust/proof signals (testimonials, metrics, credentials,",
    "  guarantees) that are explicitly present in the text.",
    "",
    "HARD RULES:",
    "- Use ONLY information supported by the WEBSITE TEXT. Do not invent facts.",
    "- If a list has no support in the text, return an empty array for it.",
    `- Write every item in ${targetLabel}.`,
    "- Output must be a single valid JSON document, no prose, no code fences.",
    "",
    "WEBSITE TEXT:",
    JSON.stringify(text),
    "",
    "Produce JSON with EXACTLY this shape:",
    `{
  "product": {
    "product_is": ["string"],
    "product_is_not": ["string"],
    "product_strengths": ["string"]
  },
  "customer": {
    "target_audience": ["string"],
    "pain_points": ["string"]
  },
  "voice": {
    "tone": ["string"],
    "forbidden_claims": ["string"]
  },
  "proof": {
    "statements": ["string"]
  }
}`,
  ].join("\n");
}
