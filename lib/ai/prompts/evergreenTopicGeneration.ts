import type { Project } from "@/lib/supabase/types";
import { constraintsBlock, projectBrainBlock } from "@/lib/ai/prompts/context";

export interface EvergreenGenerationPromptInput {
  project: Project;
  count: number;
  pillar?: string | null;
  existingTitles: string[];
}

export const EVERGREEN_SYSTEM =
  "You generate evergreen content topics for a project's Evergreen Library. " +
  "Topics must be timeless (not tied to a trend), aligned to the audience, " +
  "product strengths and pain points, and grouped under content pillars.";

export function buildEvergreenTopicGenerationPrompt(
  input: EvergreenGenerationPromptInput,
): string {
  const { project, count, pillar, existingTitles } = input;

  return [
    projectBrainBlock(project),
    "",
    constraintsBlock(project),
    "",
    `TARGET COUNT: ${count}`,
    pillar ? `FOCUS PILLAR: ${pillar}` : "PILLARS: derive sensible pillars.",
    "",
    "AVOID DUPLICATING THESE EXISTING TOPICS:",
    existingTitles.length ? existingTitles.map((t) => `- ${t}`).join("\n") : "(none)",
    "",
    "TASK: Return JSON with this exact shape:",
    `{
  "topics": [
    {
      "title": "string",
      "angle": "string",
      "pillar": "string",
      "keywords": ["string"],
      "audience_stage": "string"
    }
  ]
}`,
    `Return exactly ${count} topics. Output JSON only.`,
  ].join("\n");
}
