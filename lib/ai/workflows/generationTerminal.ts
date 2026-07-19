/**
 * Sprint 5.3 — terminal failure classification for package generation.
 * Every generation attempt must settle as success or a named terminal failure.
 */

import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import { RenderProductDemoFailedError } from "@/lib/scene-types/presentation/renderFidelity";

export const GENERATION_TERMINAL_ERRORS = [
  "generation_failed",
  "render_product_demo_failed",
  "render_failed",
  "operational_failure",
] as const;

export type GenerationTerminalError = (typeof GENERATION_TERMINAL_ERRORS)[number];

export interface GenerationTerminalFailure {
  ok: false;
  error: GenerationTerminalError;
  validationErrors: ValidationIssue[];
  attempts: number;
}

/** Map a thrown error after generation began into a settled terminal failure. */
export function classifyGenerationThrow(
  err: unknown,
  attempts = 1,
): GenerationTerminalFailure {
  if (err instanceof RenderProductDemoFailedError) {
    const diagCode = err.diagnostics?.code;
    const code: GenerationTerminalError =
      diagCode === "render_fidelity_failed"
        ? "render_failed"
        : "render_product_demo_failed";
    const stage =
      typeof err.diagnostics?.stage === "string"
        ? err.diagnostics.stage
        : "render";
    return {
      ok: false,
      error: code,
      attempts,
      validationErrors: [
        {
          path: `render.${stage}`,
          message: err.message,
        },
      ],
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  if (
    /\brender_fidelity_failed\b/i.test(message) ||
    /\brender_failed\b/i.test(message)
  ) {
    return {
      ok: false,
      error: "render_failed",
      attempts,
      validationErrors: [{ path: "render", message }],
    };
  }

  return {
    ok: false,
    error: "operational_failure",
    attempts,
    validationErrors: [{ path: "$", message }],
  };
}

export function isGenerationTerminalError(
  value: unknown,
): value is GenerationTerminalError {
  return (
    typeof value === "string" &&
    (GENERATION_TERMINAL_ERRORS as readonly string[]).includes(value)
  );
}
