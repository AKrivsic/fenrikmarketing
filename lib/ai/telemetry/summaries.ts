/** Compact input/output summary builders — never dump full prompts. */

export function summarizeLines(
  title: string,
  inputs: string[],
  outputs: string[],
): { input_summary: string; output_summary: string } {
  return {
    input_summary: [title + " input:", ...inputs.map((l) => `- ${l}`)].join(
      "\n",
    ),
    output_summary: outputs.join("\n"),
  };
}

export function creativeCandidatesSummaries(args: {
  rawIdeas?: number;
  filtered?: number;
  candidates: number;
  winnerId?: string | null;
}): { input_summary: string; output_summary: string } {
  return summarizeLines(
    "Creative Candidates",
    [
      "Product Brain",
      "Strategy Item",
      "Scenario",
      "Audience",
      "Pain Points",
    ],
    [
      `${args.rawIdeas ?? "?"} raw ideas`,
      "↓",
      `${args.filtered ?? "?"} filtered`,
      "↓",
      `${args.candidates} candidates`,
      ...(args.winnerId ? [`Winner: ${args.winnerId}`] : []),
    ],
  );
}

export function narrativeBeatsSummaries(roles: string[]): {
  input_summary: string;
  output_summary: string;
} {
  return summarizeLines(
    "Narrative Beats",
    ["Selected Candidate"],
    roles.length > 0 ? roles : ["(no beats)"],
  );
}

export function presentationGenerationSummaries(): {
  input_summary: string;
  output_summary: string;
} {
  return summarizeLines(
    "Presentation Generation",
    ["Narrative Beats", "Creative Identity", "Strategy Item", "Product Brain"],
    ["Storyboard", "Voiceover", "Scenes", "CTA", "Platform Outputs"],
  );
}

export function storyIntegritySummaries(args: {
  passed: boolean;
  warningCount: number;
}): { input_summary: string; output_summary: string } {
  return summarizeLines(
    "Story Integrity",
    ["Generated package"],
    [
      args.passed ? "Passed" : "Failed",
      ...(args.warningCount > 0
        ? [`${args.warningCount} warning${args.warningCount === 1 ? "" : "s"}`]
        : []),
    ],
  );
}

export function conceptFidelitySummaries(args: {
  passed: boolean;
  passLabel?: string;
}): { input_summary: string; output_summary: string } {
  return summarizeLines(
    "Concept Fidelity",
    ["Package", "Selected Candidate"],
    [
      args.passed
        ? (args.passLabel ?? "Passed")
        : "Failed",
    ],
  );
}

export function strategyPlanSummaries(args: {
  packageCount: number;
  itemCount: number;
}): { input_summary: string; output_summary: string } {
  return summarizeLines(
    "Weekly Strategy",
    ["Product Brain", "Trends", "Evergreen Topics", "Anti-repetition Memory"],
    [
      `Theme + funnel plan`,
      "↓",
      `${args.itemCount} strategy item${args.itemCount === 1 ? "" : "s"} (requested ${args.packageCount})`,
    ],
  );
}
