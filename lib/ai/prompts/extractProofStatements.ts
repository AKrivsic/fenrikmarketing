// Phase 2C — proof extraction prompt. Turns an analyzed trust/proof asset's
// metadata (description, extracted text, trust signal) into 0–5 concise proof
// statements that content generation can later use as marketing ammunition. The
// model must only use facts present in the asset metadata — it never invents
// numbers, names, testimonials, or outcomes.

export interface ExtractProofStatementsPromptInput {
  assetTitle: string;
  aiDescription: string | null;
  extractedText: string | null;
  // Output language (the project language), e.g. "cs", "en".
  language: string;
}

const MAX_EXTRACTED_TEXT = 4_000;

export const EXTRACT_PROOF_STATEMENTS_SYSTEM =
  "You are a marketing proof analyst. From a single trust/proof asset you " +
  "extract concrete proof statements usable as marketing ammunition " +
  "(testimonials, metrics, results, awards, certifications, guarantees). You " +
  "ONLY use facts present in the provided asset data; you never invent numbers, " +
  "names, quotes, or outcomes. Output a single valid JSON document only.";

export function buildExtractProofStatementsPrompt(
  input: ExtractProofStatementsPromptInput,
): string {
  const { assetTitle, aiDescription, extractedText, language } = input;
  const text = (extractedText ?? "").slice(0, MAX_EXTRACTED_TEXT);

  return [
    `OUTPUT LANGUAGE: ${language}.`,
    "",
    "ASSET DATA (the only source of truth — do not add anything not here):",
    `- title: ${JSON.stringify(assetTitle)}`,
    `- ai_description: ${JSON.stringify(aiDescription ?? "")}`,
    `- extracted_text: ${JSON.stringify(text)}`,
    "",
    "TASK: Produce 0 to 5 proof statements.",
    "- Each statement is ONE short, self-contained sentence stating a concrete",
    "  proof point (a result, metric, testimonial paraphrase, award, etc.).",
    "- confidence is your certainty (0..1) that this is a real, usable proof",
    "  supported by the asset data.",
    "",
    "HARD RULES:",
    "- Use ONLY information supported by the ASSET DATA. Do NOT invent facts.",
    "- If the asset carries no concrete proof, return an empty statements array.",
    "- Do not duplicate the same proof phrased differently.",
    `- Write every statement in ${language}.`,
    "- Output must be a single valid JSON document, no prose, no code fences.",
    "",
    "Produce JSON with EXACTLY this shape:",
    `{
  "statements": [
    { "text": "string", "confidence": 0.0 }
  ]
}`,
  ].join("\n");
}
