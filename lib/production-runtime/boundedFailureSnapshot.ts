/**
 * Bounded failure-output audit helpers.
 * Never store binaries, secrets, or unbounded LLM dumps.
 */

import { createHash } from "node:crypto";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";

/** Soft cap for JSONB snapshot payload (~24 KB UTF-8). */
export const FAILURE_OUTPUT_SNAPSHOT_MAX_BYTES = 24_576;

export function hashOutputRaw(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function truncateUtf8(value: string, maxBytes: number): {
  text: string;
  truncated: boolean;
} {
  if (utf8ByteLength(value) <= maxBytes) {
    return { text: value, truncated: false };
  }
  let end = Math.min(value.length, maxBytes);
  while (end > 0 && utf8ByteLength(value.slice(0, end)) > maxBytes) {
    end -= 1;
  }
  return { text: value.slice(0, end), truncated: true };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function summarizePlatformOutputs(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return typeof value;
  const out: Record<string, unknown> = {};
  for (const [platform, entry] of Object.entries(record)) {
    const e = asRecord(entry);
    if (!e) {
      out[platform] = typeof entry;
      continue;
    }
    out[platform] = {
      caption: typeof e.caption,
      cta: typeof e.cta,
      hashtags: Array.isArray(e.hashtags) ? "array" : typeof e.hashtags,
      format: typeof e.format,
      caption_variants: Array.isArray(e.caption_variants)
        ? e.caption_variants.length
        : undefined,
      title_variants: Array.isArray(e.title_variants)
        ? e.title_variants.length
        : undefined,
    };
  }
  return out;
}

/**
 * Build a compact diagnostic snapshot from the last raw candidate + issues.
 * Prioritizes visual_scenes structure and platform_outputs field types.
 */
export function buildBoundedFailureOutputSnapshot(args: {
  raw?: string | null;
  validationErrors?: readonly ValidationIssue[] | null;
  maxBytes?: number;
}): Record<string, unknown> {
  const maxBytes = args.maxBytes ?? FAILURE_OUTPUT_SNAPSHOT_MAX_BYTES;
  const validation_errors = (args.validationErrors ?? [])
    .slice(0, 24)
    .map((i) => ({ path: i.path, message: i.message }));

  let visual_scenes: unknown = null;
  let platform_outputs_types: unknown = null;
  let parsed_ok = false;
  let candidate: string | null = null;
  let truncated = false;

  const raw = args.raw?.trim() ?? "";
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      parsed_ok = true;
      const record = asRecord(parsed);
      if (record) {
        visual_scenes = record.visual_scenes ?? null;
        platform_outputs_types = summarizePlatformOutputs(
          record.platform_outputs,
        );
      }
    } catch {
      parsed_ok = false;
    }
    const budget = Math.max(
      1024,
      maxBytes -
        utf8ByteLength(
          JSON.stringify({
            validation_errors,
            visual_scenes,
            platform_outputs_types,
            parsed_ok,
          }),
        ) -
        256,
    );
    const cut = truncateUtf8(raw, budget);
    candidate = cut.text;
    truncated = cut.truncated;
  }

  const snapshot: Record<string, unknown> = {
    validation_errors,
    visual_scenes,
    platform_outputs_types,
    parsed_ok,
    candidate,
  };
  if (truncated) snapshot.truncated = true;

  // Final size guard — drop candidate first if still oversized.
  let encoded = JSON.stringify(snapshot);
  if (utf8ByteLength(encoded) > maxBytes) {
    snapshot.candidate = null;
    snapshot.truncated = true;
    encoded = JSON.stringify(snapshot);
  }
  if (utf8ByteLength(encoded) > maxBytes) {
    return {
      truncated: true,
      validation_errors: validation_errors.slice(0, 8),
      visual_scenes: Array.isArray(visual_scenes)
        ? `array:${visual_scenes.length}`
        : typeof visual_scenes,
      platform_outputs_types,
      parsed_ok,
    };
  }
  return snapshot;
}
