import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import type { TextProvider } from "@/lib/ai/types";
import {
  isValidCreativeDNA,
  type CreativeDNA,
} from "@/lib/creative-candidates/creativeDNA";
import type { InventedCreativeConcept } from "@/lib/creative-engine-v3/types";
import { vObject, type Validator } from "@/lib/ai/validateAiOutput";

const dnaObjectValidator: Validator<CreativeDNA> = (value, path = "$") => {
  if (!isValidCreativeDNA(value)) {
    return [{ path, message: "expected valid CreativeDNA" }];
  }
  return [];
};

const repairEnvelopeValidator = vObject({
  creative_dna: dnaObjectValidator,
});

export async function repairWinnerCreativeDna(args: {
  concept: InventedCreativeConcept;
  failureReasons: readonly string[];
  productIs?: readonly string[];
  textProvider?: TextProvider;
}): Promise<{ ok: true; dna: CreativeDNA; attempts: number } | { ok: false; attempts: number }> {
  const provider = args.textProvider ?? getCopywritingProvider();
  const prompt = [
    "Repair Creative DNA for this winning invented concept.",
    "Author DNA that matches THIS concept only — do not invent a new story.",
    "immutableRules: 3–6 concept-specific rules (not generic quality advice).",
    "",
    `Failure reasons: ${args.failureReasons.join("; ") || "invalid or inconsistent DNA"}`,
    `Product: ${JSON.stringify(args.productIs ?? [])}`,
    "",
    `title: ${args.concept.title}`,
    `central_idea: ${args.concept.central_idea}`,
    `opening_two_seconds: ${args.concept.opening_two_seconds}`,
    `hook_line: ${args.concept.hook_line}`,
    `visual_world: ${args.concept.visual_world}`,
    `product_role: ${args.concept.product_role}`,
    `ending_payoff: ${args.concept.ending_payoff}`,
    `story_progression: ${args.concept.story_progression}`,
    "",
    'Return JSON: { "creative_dna": { "world", "mainCharacter", "coreConflict", "productRole", "viewerQuestion", "endingIntent", "immutableRules": [..] } }',
  ].join("\n");

  const result = await generateValidatedJson({
    textProvider: provider,
    system:
      "You repair Creative DNA for an already-invented concept. JSON only. No new concepts.",
    prompt,
    validator: repairEnvelopeValidator,
    expectedShape: '{ "creative_dna": { ... } }',
    maxAttempts: 2,
    temperature: 0.2,
    maxTokens: 2048,
    timeoutMs: 60_000,
    maxTransportAttempts: 3,
    telemetry: {
      stepName: "Creative DNA Repair",
      repair: true,
      inputSummary: `concept=${args.concept.concept_id}`,
    },
  });

  if (!result.ok) {
    return { ok: false, attempts: result.attempts };
  }
  const dna = (result.value as { creative_dna: CreativeDNA }).creative_dna;
  return { ok: true, dna, attempts: result.attempts };
}
