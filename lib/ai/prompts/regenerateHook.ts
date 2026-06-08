import type { Project } from "@/lib/supabase/types";
import { constraintsBlock } from "@/lib/ai/prompts/context";

// Phase 2E — minimal prompt that produces a SINGLE fresh hook distinct from a
// list of recently used ones. Used only by the lightweight dedup (Task 5) when a
// generated package hook collides textually with a recent hook. Deliberately
// small: just enough brand context plus the duplicate + avoid list.

export interface RegenerateHookPromptInput {
  project: Project;
  topic: string;
  angle: string | null;
  // The hook that collided with a recent one (must NOT be reused).
  duplicateHook: string;
  // Recent hooks to avoid repeating.
  recentHooks: string[];
}

export const REGENERATE_HOOK_SYSTEM =
  "You are a copywriter producing a single scroll-stopping hook for a social " +
  "content package. Return ONLY a fresh hook that is clearly different from the " +
  "ones the brand has recently used. Output a single valid JSON document only.";

export function buildRegenerateHookPrompt(
  input: RegenerateHookPromptInput,
): string {
  const { project, topic, angle, duplicateHook, recentHooks } = input;
  const avoid = recentHooks.length
    ? recentHooks.map((h) => `- ${h}`).join("\n")
    : "(none)";

  return [
    constraintsBlock(project),
    "",
    `TOPIC: ${topic}`,
    `ANGLE: ${angle ?? "(none)"}`,
    "",
    `THIS HOOK IS A DUPLICATE — do NOT reuse or lightly reword it: "${duplicateHook}"`,
    "",
    "RECENTLY USED HOOKS (AVOID repeating any of these):",
    avoid,
    "",
    "TASK: Write ONE new hook for this topic that is clearly different from the",
    "duplicate and from every recently used hook above. Keep it in the project",
    "language and tone of voice.",
    "",
    "Produce JSON with EXACTLY this shape:",
    `{ "hook": "string" }`,
  ].join("\n");
}
