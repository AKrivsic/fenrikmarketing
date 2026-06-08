// Phase 2D — scenario generation prompt. Turns the project's Product, Customer
// and Proof knowledge into 5–10 concrete SITUATIONS in which the customer faces
// the problem the product solves. Scenarios are the main source of originality
// for downstream content; they are NOT FAQs, pain points or proof statements.

export interface GenerateScenariosPromptInput {
  // Output language (the project language), e.g. "cs", "en".
  language: string;
  productIs: string[];
  productStrengths: string[];
  targetAudience: string[];
  painPoints: string[];
  proof: string[];
  // Already-known scenarios. The model must produce NEW, distinct situations and
  // must not repeat these (used for refill so the pool keeps growing).
  existingScenarios: string[];
}

const MAX_LIST_ITEMS = 30;

export const GENERATE_SCENARIOS_SYSTEM =
  "You are a marketing situation analyst for an AI Content Manager. From a " +
  "brand's product, customer and proof you imagine CONCRETE, REALISTIC " +
  "SITUATIONS in which the target customer experiences the problem the product " +
  "solves. A scenario is a specific moment in real life (who, when, what is " +
  "happening), NOT a FAQ, NOT a pain point, NOT a proof/testimonial, NOT a " +
  "marketing slogan. Output a single valid JSON document only.";

function list(values: string[]): string {
  const cleaned = values
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, MAX_LIST_ITEMS);
  return cleaned.length ? cleaned.map((v) => `- ${v}`).join("\n") : "(none)";
}

export function buildGenerateScenariosPrompt(
  input: GenerateScenariosPromptInput,
): string {
  const {
    language,
    productIs,
    productStrengths,
    targetAudience,
    painPoints,
    proof,
    existingScenarios,
  } = input;

  return [
    `OUTPUT LANGUAGE: ${language}.`,
    "",
    "KNOWLEDGE (the basis for the situations):",
    "PRODUCT IS:",
    list(productIs),
    "PRODUCT STRENGTHS:",
    list(productStrengths),
    "TARGET AUDIENCE:",
    list(targetAudience),
    "PAIN POINTS:",
    list(painPoints),
    "PROOF:",
    list(proof),
    "",
    "ALREADY-KNOWN SCENARIOS (do NOT repeat or lightly reword these):",
    list(existingScenarios),
    "",
    "TASK: Produce 5 to 10 NEW scenarios.",
    "A scenario is ONE short, vivid sentence describing a concrete situation in",
    "which the target customer hits the problem this product solves — e.g.",
    `"Guests arrive in 2 hours and the flat is not cleaned."`,
    "",
    "HARD RULES:",
    "- A scenario is a specific real-life moment, NOT a FAQ, pain point, proof,",
    "  feature list, or slogan.",
    "- Ground each scenario in the audience and pain points above; do NOT invent",
    "  facts, numbers, names or testimonials.",
    "- Each scenario must be distinct from the others and from the known list.",
    `- Write every scenario in ${language}.`,
    "- Output must be a single valid JSON document, no prose, no code fences.",
    "",
    "Produce JSON with EXACTLY this shape:",
    `{
  "scenarios": [
    { "text": "string" }
  ]
}`,
  ].join("\n");
}
