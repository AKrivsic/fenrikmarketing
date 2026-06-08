import type { Project } from "@/lib/supabase/types";
import type { AntiRepetitionMemory, TextProvider } from "@/lib/ai/types";
import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  buildRegenerateHookPrompt,
  REGENERATE_HOOK_SYSTEM,
} from "@/lib/ai/prompts/regenerateHook";
import { regenerateHookSchema } from "@/lib/ai/schemas/regenerateHook";
import { normalizeMemoryText } from "@/lib/ai/workflows/antiRepetitionMemory";

// Phase 2E — textual (non-semantic) duplicate check: a hook is a duplicate when
// its normalized form exactly matches one of the recent hooks.
export function isDuplicateHook(hook: string, recentHooks: string[]): boolean {
  const key = normalizeMemoryText(hook);
  if (!key) return false;
  return recentHooks.some((h) => normalizeMemoryText(h) === key);
}

export interface EnsureUniqueHookArgs {
  hook: string;
  project: Project;
  topic: string;
  angle: string | null;
  memory: AntiRepetitionMemory;
  textProvider?: TextProvider;
}

// Task 5 — Lightweight Dedup. If the generated hook is textually identical to a
// recent one, regenerate ONLY the hook (not the whole package) and return the
// fresh hook. Pure textual matching, no semantics. NEVER throws: on any failure
// (or if the model still returns a duplicate) it falls back to the original hook
// so package persistence is never blocked.
export async function ensureUniqueHook(
  args: EnsureUniqueHookArgs,
): Promise<string> {
  const { hook, project, topic, angle, memory } = args;
  if (!isDuplicateHook(hook, memory.hooks)) return hook;

  try {
    const generated = await generateValidatedJson({
      textProvider: args.textProvider ?? getCopywritingProvider(),
      system: REGENERATE_HOOK_SYSTEM,
      prompt: buildRegenerateHookPrompt({
        project,
        topic,
        angle,
        duplicateHook: hook,
        recentHooks: memory.hooks,
      }),
      validator: regenerateHookSchema,
    });

    if (!generated.ok) return hook;
    const fresh = generated.value.hook.trim();
    // Only accept the new hook when it is non-empty AND no longer a duplicate.
    if (!fresh || isDuplicateHook(fresh, memory.hooks)) return hook;
    return fresh;
  } catch {
    return hook;
  }
}
