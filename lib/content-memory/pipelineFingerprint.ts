/**
 * Content Pipeline fingerprint helpers — build, read, prompt injection.
 */

import {
  CONTENT_PIPELINE_FINGERPRINT_VERSION,
  type ContentPipelineFingerprint,
} from "@/lib/content-memory/types";
import { normalizeFingerprintText } from "@/lib/content-memory/conceptFingerprint";
import type {
  OpeningImpact,
  VideoConcept,
  VisualIdentity,
} from "@/lib/content-pipeline/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function compact(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function isContentPipelineFingerprint(
  value: unknown,
): value is ContentPipelineFingerprint {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (r.version !== CONTENT_PIPELINE_FINGERPRINT_VERSION) return false;
  for (const key of [
    "core_idea",
    "product_role",
    "environment",
    "attention_pattern",
    "narrative_mechanism",
    "visual_world",
  ] as const) {
    if (typeof r[key] !== "string" || !(r[key] as string).trim()) return false;
  }
  return true;
}

export function normalizeContentPipelineFingerprint(
  value: unknown,
): ContentPipelineFingerprint | null {
  return isContentPipelineFingerprint(value) ? value : null;
}

export function buildContentPipelineFingerprint(args: {
  concept: VideoConcept;
  openingImpact: OpeningImpact;
  visualIdentity: VisualIdentity;
  creativeModeId?: string | null;
}): ContentPipelineFingerprint {
  const env =
    args.visualIdentity.environment.trim() ||
    args.concept.visual_direction.environment.trim() ||
    "unspecified";
  const art =
    args.visualIdentity.art_direction.trim() ||
    args.concept.visual_direction.art_direction.trim() ||
    "";
  const mode = (args.creativeModeId ?? "").trim();
  const arc = compact(args.concept.narrative_arc, 80);
  const narrative_mechanism = mode
    ? compact(`${mode}: ${arc || args.concept.emotional_tone}`, 120)
    : compact(arc || args.concept.emotional_tone || "narrative", 120);

  return {
    version: CONTENT_PIPELINE_FINGERPRINT_VERSION,
    core_idea: compact(args.concept.core_idea, 200),
    product_role: compact(args.concept.product_role, 160),
    environment: compact(env, 120),
    attention_pattern: compact(
      args.openingImpact.attention_pattern || args.openingImpact.emotion,
      120,
    ),
    narrative_mechanism,
    visual_world: compact(art ? `${env} / ${art}` : env, 160),
  };
}

/** Read pipeline fingerprint from package_brief.presentation_generation. */
export function pipelineFingerprintFromPackageBrief(
  brief: unknown,
): ContentPipelineFingerprint | null {
  const root = asRecord(brief);
  if (!root) return null;
  const pg = asRecord(root.presentation_generation) ?? root;
  return normalizeContentPipelineFingerprint(pg?.content_pipeline_fingerprint);
}

export function pipelineFingerprintDedupKey(
  fp: ContentPipelineFingerprint,
): string {
  return normalizeFingerprintText(
    [
      fp.core_idea,
      fp.product_role,
      fp.environment,
      fp.attention_pattern,
      fp.narrative_mechanism,
      fp.visual_world,
    ].join("|"),
  );
}

/**
 * Compact rejection memory for Video Concept — avoid repeating ideas / worlds /
 * mechanisms. Soft guidance only.
 */
export function pipelineFingerprintMemoryBlock(
  fingerprints: readonly ContentPipelineFingerprint[],
): string {
  if (fingerprints.length === 0) return "";
  const lines = fingerprints.slice(0, 12).map((fp, i) => {
    return (
      `- #${i + 1}: idea="${compact(fp.core_idea, 90)}"; ` +
      `world="${compact(fp.visual_world, 70)}"; ` +
      `mechanism="${compact(fp.narrative_mechanism, 50)}"; ` +
      `product_role="${compact(fp.product_role, 50)}"; ` +
      `attention="${compact(fp.attention_pattern, 40)}"`
    );
  });
  return [
    "RECENT CONTENT PIPELINE FINGERPRINTS (avoid repeating — rejection memory only):",
    ...lines,
    "FINGERPRINT RULES (soft):",
    "- Invent a clearly different core idea — not a paraphrase of a recent idea.",
    "- Choose a different visual world / environment when recent packages feel similar.",
    "- Vary the narrative mechanism (story shape / mode of reveal) vs recent packages.",
    "- Do not copy these lines as inspiration; they are only what to avoid.",
  ].join("\n");
}

export function readStringField(value: unknown): string | null {
  return readString(value);
}
