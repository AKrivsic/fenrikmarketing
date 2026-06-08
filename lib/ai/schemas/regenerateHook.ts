import { vNonEmptyString, vObject, type Infer } from "@/lib/ai/validateAiOutput";

// Phase 2E — output schema for the lightweight hook regeneration (Task 5). When
// a freshly generated package hook is textually identical to a recent one, only
// the hook is regenerated (never the whole package).
export const regenerateHookSchema = vObject({
  hook: vNonEmptyString(),
});

export type RegenerateHookOutput = Infer<typeof regenerateHookSchema>;
