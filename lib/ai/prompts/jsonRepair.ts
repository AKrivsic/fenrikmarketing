import type { ValidationIssue } from "@/lib/ai/validateAiOutput";

// JSON repair is an OpenAI helper task (per provider rules). Given a broken /
// invalid model output plus the validation errors, it must return ONLY valid
// JSON that conforms to the originally requested shape.
export const JSON_REPAIR_SYSTEM =
  "You are a strict JSON repair function. You receive a malformed or invalid " +
  "JSON-ish text and a list of problems. Return ONLY a single corrected JSON " +
  "document. Do not add explanations, comments or code fences. Preserve all " +
  "valid content; only fix structure, missing required fields and types.";

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
