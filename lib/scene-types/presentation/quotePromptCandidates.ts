import type { ProofIndex } from "@/lib/scene-types/presentation/proofIndex";

export function buildApprovedQuotesPromptBlock(
  proof: ProofIndex,
): string | null {
  if (proof.quoteCandidates.length === 0) return null;

  const lines = [
    "APPROVED QUOTES (copy verbatim — do not invent testimonials):",
    ...proof.quoteCandidates.map((c) => {
      const ctx = c.context ? `\n  context: ${c.context}` : "";
      return [
        `- proof_id: ${c.id}`,
        `  quote: "${c.quote.replace(/"/g, "'")}"`,
        `  attribution: ${c.attribution}${ctx}`,
      ].join("\n");
    }),
    "- Use QUOTE only with an exact proof_id from this list.",
    "- Copy the quote text and attribution from the approved entry; do not merge or rewrite.",
    "- Do not turn product marketing lines into customer quotes.",
    "- If no quote naturally fits the beat, keep IMAGE.",
  ];
  return lines.join("\n");
}
