import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentFormat, Project } from "@/lib/supabase/types";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";

// Thrown for non-generation failures (bad input, missing/cross-project rows).
// Routes map the `code` to an HTTP status.
export type WorkflowErrorCode =
  | "invalid_input"
  | "not_found"
  | "cross_project"
  | "unauthorized";

export class WorkflowError extends Error {
  constructor(
    public readonly code: WorkflowErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

// Standard success/failure envelope returned by every workflow. A `false`
// result always means the AI output could not be validated after repair +
// retries (generation_failed); hard errors are thrown as WorkflowError.
export type WorkflowResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: "generation_failed";
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
