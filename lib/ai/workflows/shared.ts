import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentFormat, Project } from "@/lib/supabase/types";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import type { GenerationTerminalError } from "@/lib/ai/workflows/generationTerminal";

// Thrown for non-generation failures (bad input, missing/cross-project rows).
// Routes map the `code` to an HTTP status.
export type WorkflowErrorCode =
  | "invalid_input"
  | "not_found"
  | "cross_project"
  | "unauthorized";

export class WorkflowError extends Error {
  readonly code: WorkflowErrorCode;

  constructor(code: WorkflowErrorCode, message: string) {
    super(message);
    this.name = "WorkflowError";
    this.code = code;
  }
}

// Standard success/failure envelope returned by every workflow.
// Soft content failures use generation_failed; render/ops failures use named
// terminal codes (Sprint 5.3). Precondition WorkflowErrors are still thrown.
export type WorkflowResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: GenerationTerminalError;
      validationErrors: ValidationIssue[];
      attempts: number;
    };

export async function loadProjectOrThrow(
  supabase: SupabaseClient,
  projectId: string,
): Promise<Project> {
  if (!projectId) throw new WorkflowError("invalid_input", "project_id is required");
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new WorkflowError("not_found", `project ${projectId} not found`);
  return data as Project;
}

const VALID_FORMATS: readonly ContentFormat[] = [
  "post",
  "story",
  "reel",
  "short",
  "carousel",
  "article",
  "email",
];

export function coerceFormat(
  value: unknown,
  fallback: ContentFormat,
): ContentFormat {
  return typeof value === "string" &&
    (VALID_FORMATS as readonly string[]).includes(value)
    ? (value as ContentFormat)
    : fallback;
}
