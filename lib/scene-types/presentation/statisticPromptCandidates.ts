import type { ProofIndex } from "@/lib/scene-types/presentation/proofIndex";

export function buildApprovedStatisticsPromptBlock(
  proof: ProofIndex,
): string | null {
  if (proof.statisticCandidates.length === 0) return null;

  const lines = [
    "APPROVED STATISTICS (numerical facts from approved proof only):",
    ...proof.statisticCandidates.map((c) => {
      const source = c.source_line ? `\n  source_line: ${c.source_line}` : "";
      const unitLine =
        c.unit.trim().length > 0 ? `\n  unit: ${c.unit}` : "\n  unit: (none)";
      return [
        `- proof_id: ${c.id}`,
        `  value: ${c.value}${unitLine}`,
        `  label: ${c.label}${source}`,
      ].join("\n");
    }),
    "- Use STATISTIC only with an exact proof_id from this list.",
    "- Copy value, unit, and label from the approved entry; do not merge or calculate.",
    "- Do not invent percentages or counts from marketing language.",
    "- If no candidate naturally supports the beat, keep IMAGE.",
  ];
  return lines.join("\n");
}
