// Minimal, dependency-free schema validator. Zod is not installed in this
// project, so we provide a tiny combinator library instead of expanding
// dependencies. Each Validator<T> returns the list of issues it found; an
// empty list means the value matches the schema and can be treated as T.

import { isFunnelStageInput } from "@/lib/ai/types";

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] };

export interface Validator<T> {
  (value: unknown, path?: string): ValidationIssue[];
  // Phantom field carrying the validated type for `Infer`.
  readonly _output?: T;
}

export type Infer<V> = V extends Validator<infer T> ? T : never;

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}

// --- Primitives ----------------------------------------------------------

export const vString =
  (opts: { minLength?: number } = {}): Validator<string> =>
  (value, path = "$") => {
    if (typeof value !== "string") return [issue(path, "expected string")];
    if (opts.minLength !== undefined && value.trim().length < opts.minLength) {
      return [issue(path, `expected non-empty string (min ${opts.minLength})`)];
    }
    return [];
  };

export const vNonEmptyString = (): Validator<string> => vString({ minLength: 1 });

export const vNumber =
  (opts: { min?: number; max?: number } = {}): Validator<number> =>
  (value, path = "$") => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return [issue(path, "expected number")];
    }
    if (opts.min !== undefined && value < opts.min) {
      return [issue(path, `expected >= ${opts.min}`)];
    }
    if (opts.max !== undefined && value > opts.max) {
      return [issue(path, `expected <= ${opts.max}`)];
    }
    return [];
  };

export const vBoolean = (): Validator<boolean> => (value, path = "$") =>
  typeof value === "boolean" ? [] : [issue(path, "expected boolean")];

export const vEnum =
  <T extends string>(values: readonly T[]): Validator<T> =>
  (value, path = "$") =>
    typeof value === "string" && (values as readonly string[]).includes(value)
      ? []
      : [issue(path, `expected one of: ${values.join(", ")}`)];

// Accepts a human label or DB value for a funnel stage; the raw string is kept
// and normalized to the canonical DB value at persist time.
export const vFunnelStage = (): Validator<string> => (value, path = "$") =>
  isFunnelStageInput(value)
    ? []
    : [
        issue(
          path,
          "expected funnel stage: Awareness | Problem Aware | Solution Aware | Conversion",
        ),
      ];

// --- Combinators ---------------------------------------------------------

export const vOptional =
  <T>(inner: Validator<T>): Validator<T | undefined> =>
  (value, path = "$") =>
    value === undefined || value === null ? [] : inner(value, path);

export const vArray =
  <T>(item: Validator<T>, opts: { min?: number } = {}): Validator<T[]> =>
  (value, path = "$") => {
    if (!Array.isArray(value)) return [issue(path, "expected array")];
    if (opts.min !== undefined && value.length < opts.min) {
      return [issue(path, `expected at least ${opts.min} item(s)`)];
    }
    return value.flatMap((entry, i) => item(entry, `${path}[${i}]`));
  };

type Shape = Record<string, Validator<unknown>>;
type ObjectType<S extends Shape> = { [K in keyof S]: Infer<S[K]> };

export const vObject =
  <S extends Shape>(shape: S): Validator<ObjectType<S>> =>
  (value, path = "$") => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return [issue(path, "expected object")];
    }
    const record = value as Record<string, unknown>;
    return Object.entries(shape).flatMap(([key, validator]) =>
      validator(record[key], `${path}.${key}`),
    );
  };

// --- Entry points --------------------------------------------------------

export function validate<T>(
  validator: Validator<T>,
  value: unknown,
): ValidationResult<T> {
  const issues = validator(value, "$");
  if (issues.length === 0) return { ok: true, value: value as T };
  return { ok: false, issues };
}

export interface JsonParseResult {
  ok: boolean;
  value?: unknown;
  error?: string;
}

// Tolerant JSON extraction: many models wrap JSON in prose or ```json fences.
// We strip fences and isolate the outermost object/array before parsing.
export function safeJsonParse(text: string): JsonParseResult {
  const trimmed = text.trim();
  const candidates = [trimmed, stripCodeFence(trimmed), extractJsonSpan(trimmed)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return { ok: true, value: JSON.parse(candidate) };
    } catch {
      // try next candidate
    }
  }
  // TEMP debug — ideation_failed / "Failed to parse JSON from model output"
  console.error(
    "[safeJsonParse] TEMP raw model output before JSON parse failure",
    JSON.stringify({
      length: text.length,
      first_1000: text.slice(0, 1000),
      last_1000: text.slice(-1000),
      raw: text,
    }),
  );
  return { ok: false, error: "Failed to parse JSON from model output" };
}

function stripCodeFence(text: string): string | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : null;
}

function extractJsonSpan(text: string): string | null {
  const firstObj = text.indexOf("{");
  const firstArr = text.indexOf("[");
  const start =
    firstObj === -1
      ? firstArr
      : firstArr === -1
        ? firstObj
        : Math.min(firstObj, firstArr);
  if (start === -1) return null;
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  const end = text.lastIndexOf(close);
  if (end <= start) return null;
  return text.slice(start, end + 1);
}
