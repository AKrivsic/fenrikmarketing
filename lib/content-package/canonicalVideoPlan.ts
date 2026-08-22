/**
 * Canonical creative video plan — one scene set per package.
 *
 * Authority: `visual_scenes` (Claude storyboard) + `creative_review.scenes`
 * (operator localization of those same scenes, same IDs).
 *
 * `video_text_to_video_creative_plan` is a technical projection, never a
 * second creative storyboard.
 */

import { createHash } from "node:crypto";
import { normalizeMemoryText } from "@/lib/ai/workflows/antiRepetitionMemory";
import type { PackageVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import type { CreativeReviewScene } from "@/lib/creative-review/types";
import type { VisualIdentity } from "@/lib/content-pipeline/types";

export const CANONICAL_VIDEO_PLAN_ORIGIN = "canonical_storyboard" as const;
export const SENTENCE_FALLBACK_ORIGIN = "sentence_fallback" as const;

export type CanonicalVideoPlanOrigin =
  | typeof CANONICAL_VIDEO_PLAN_ORIGIN
  | typeof SENTENCE_FALLBACK_ORIGIN;

export const CZECH_VISUAL_PREFIX_OPENING = "Výrazný vizuál podporující";
export const CZECH_VISUAL_PREFIX_CLOSING = "Závěr a CTA";

const CZECH_DIACRITIC_RE = /[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/;

export interface CanonicalVideoScene {
  id: string;
  index: number;
  image_prompt: string | null;
  motion_prompt: string | null;
  voiceover_excerpt: string;
  presentation_type: string | null;
  environment?: string | null;
  camera?: string | null;
  emotion?: string | null;
  sound_intent?: string | null;
  screen_policy?: string | null;
  continuity_hints?: string | null;
  characters_action?: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function canonicalSceneIdForIndex(index: number): string {
  return `scene-${index + 1}`;
}

export function readVisualSceneId(
  entry: unknown,
  index: number,
): string {
  const record = asRecord(entry);
  return nonEmpty(record?.id) ?? canonicalSceneIdForIndex(index);
}

export function readVisualSceneImagePrompt(entry: unknown): string | null {
  const record = asRecord(entry);
  if (!record) return null;
  const payload = asRecord(record.payload);
  return (
    nonEmpty(record.image_prompt) ??
    nonEmpty(payload?.image_prompt) ??
    null
  );
}

export function readVisualSceneMotionPrompt(entry: unknown): string | null {
  const record = asRecord(entry);
  if (!record) return null;
  const payload = asRecord(record.payload);
  return (
    nonEmpty(record.motion_prompt) ??
    nonEmpty(payload?.motion_prompt) ??
    null
  );
}

export function readVisualSceneVoiceoverExcerpt(entry: unknown): string | null {
  const record = asRecord(entry);
  if (!record) return null;
  const payload = asRecord(record.payload);
  return (
    nonEmpty(record.voiceover_excerpt) ??
    nonEmpty(payload?.voiceover_excerpt) ??
    null
  );
}

export function readVisualScenesFromBrief(
  brief: Record<string, unknown> | null | undefined,
): PackageVisualSceneEntry[] {
  if (!brief) return [];
  const raw = brief.visual_scenes;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is PackageVisualSceneEntry =>
      Boolean(entry) && typeof entry === "object",
  );
}

export function extractVoiceoverExcerptsFromVideoScript(
  script: unknown,
): string[] {
  if (typeof script !== "string" || !script.trim()) return [];
  const matches = [
    ...script.matchAll(/\bVO:\s*['"]([^'"]+)['"]/g),
  ];
  return matches.map((m) => m[1]!.trim()).filter((s) => s.length > 0);
}

/**
 * Assign narration coverage across an EXISTING scene count.
 * Does not create or merge scenes. Not a creative planner.
 */
export function assignVoiceoverAcrossExistingScenes(
  voiceoverText: string,
  sceneCount: number,
): string[] {
  const count = Math.max(0, Math.floor(sceneCount));
  if (count === 0) return [];
  const words = voiceoverText.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return Array.from({ length: count }, () => "");
  const size = Math.ceil(words.length / count);
  const chunks: string[] = [];
  for (let i = 0; i < count; i++) {
    chunks.push(words.slice(i * size, (i + 1) * size).join(" "));
  }
  return chunks;
}

export function readVideoScriptFromBrief(
  brief: Record<string, unknown> | null | undefined,
): string {
  const video = asRecord(brief?.video);
  return typeof video?.script === "string" ? video.script : "";
}

export function resolveCanonicalVoiceoverExcerpts(args: {
  visualScenes: readonly unknown[];
  voiceoverText: string;
  videoScript?: string;
}): string[] {
  const n = args.visualScenes.length;
  if (n === 0) return [];
  const stored = args.visualScenes.map((entry) =>
    readVisualSceneVoiceoverExcerpt(entry),
  );
  if (stored.every((excerpt) => excerpt && excerpt.length > 0)) {
    return stored as string[];
  }
  const fromScript = extractVoiceoverExcerptsFromVideoScript(
    args.videoScript ?? "",
  );
  if (fromScript.length === n) return fromScript;
  return assignVoiceoverAcrossExistingScenes(args.voiceoverText, n);
}

export function extractCanonicalVideoScenes(args: {
  visualScenes: readonly unknown[];
  voiceoverText: string;
  videoScript?: string;
}): CanonicalVideoScene[] {
  const excerpts = resolveCanonicalVoiceoverExcerpts(args);
  return args.visualScenes.map((entry, index) => {
    const record = asRecord(entry);
    return {
      id: readVisualSceneId(entry, index),
      index,
      image_prompt: readVisualSceneImagePrompt(entry),
      motion_prompt: readVisualSceneMotionPrompt(entry),
      voiceover_excerpt: (excerpts[index] ?? "").slice(0, 800),
      presentation_type:
        nonEmpty(record?.type) ?? (record?.source ? "IMAGE" : null),
      environment: nonEmpty(record?.environment),
      camera: nonEmpty(record?.camera),
      emotion: nonEmpty(record?.emotion),
      sound_intent: nonEmpty(record?.sound_intent),
      screen_policy: nonEmpty(record?.screen_policy),
      continuity_hints: nonEmpty(record?.continuity_hints),
      characters_action: nonEmpty(record?.characters_action),
    };
  });
}

export function extractCanonicalVideoScenesFromBrief(
  brief: Record<string, unknown> | null | undefined,
): CanonicalVideoScene[] {
  const visualScenes = readVisualScenesFromBrief(brief);
  const vo =
    typeof brief?.voiceover_text === "string" ? brief.voiceover_text : "";
  return extractCanonicalVideoScenes({
    visualScenes,
    voiceoverText: vo,
    videoScript: readVideoScriptFromBrief(brief),
  });
}

export function canonicalVideoPlanFingerprint(
  scenes: readonly Pick<CanonicalVideoScene, "id" | "index" | "voiceover_excerpt" | "image_prompt" | "motion_prompt">[],
): string {
  const canonical = JSON.stringify(
    scenes.map((scene) => ({
      id: scene.id,
      index: scene.index,
      excerpt: normalizeMemoryText(scene.voiceover_excerpt),
      image: normalizeMemoryText(scene.image_prompt ?? ""),
      motion: normalizeMemoryText(scene.motion_prompt ?? ""),
    })),
  );
  return createHash("sha256").update(canonical, "utf8").digest("hex").slice(0, 24);
}

export function stampCanonicalIdsOnVisualScenes(
  visualScenes: readonly unknown[],
): unknown[] {
  return visualScenes.map((entry, index) => {
    const record = asRecord(entry);
    if (!record) return entry;
    const id = readVisualSceneId(record, index);
    const excerpt = readVisualSceneVoiceoverExcerpt(record);
    return {
      ...record,
      id,
      ...(excerpt ? { voiceover_excerpt: excerpt } : {}),
    };
  });
}

export function containsCzechDiacritics(text: string): boolean {
  return CZECH_DIACRITIC_RE.test(text);
}

export function hasCzechVisualPrefix(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith(CZECH_VISUAL_PREFIX_OPENING) ||
    trimmed.startsWith(CZECH_VISUAL_PREFIX_CLOSING)
  );
}

export function isVisualIntentVoiceoverCopy(
  visualIntent: string,
  voiceoverExcerpt: string,
): boolean {
  const visual = normalizeMemoryText(visualIntent);
  const excerpt = normalizeMemoryText(voiceoverExcerpt);
  if (!visual || !excerpt) return false;
  if (visual === excerpt) return true;
  const withoutPrefix = visual
    .replace(/^výrazný vizuál podporující[:\s]*/i, "")
    .replace(/^závěr a cta[:\s]*/i, "")
    .trim();
  return Boolean(withoutPrefix) && withoutPrefix === excerpt;
}

export function readVisualIdentityFromBrief(
  brief: Record<string, unknown> | null | undefined,
): VisualIdentity | null {
  const pg = asRecord(brief?.presentation_generation);
  const identity = asRecord(pg?.visual_identity);
  if (!identity) return null;
  const art = nonEmpty(identity.art_direction);
  const lighting = nonEmpty(identity.lighting);
  const palette = nonEmpty(identity.palette);
  const environment = nonEmpty(identity.environment);
  const camera = nonEmpty(identity.camera_style);
  const character = nonEmpty(identity.character_style);
  if (!art && !lighting && !palette && !environment) return null;
  return {
    art_direction: art ?? "",
    lighting: lighting ?? "",
    palette: palette ?? "",
    environment: environment ?? "",
    camera_style: camera ?? "",
    character_style: character ?? "",
    opening_emotion: nonEmpty(identity.opening_emotion) ?? "",
    opening_first_image: nonEmpty(identity.opening_first_image) ?? "",
  };
}

export function creativeReviewSceneByCanonicalId(
  scenes: readonly CreativeReviewScene[] | null | undefined,
  id: string,
): CreativeReviewScene | null {
  if (!scenes) return null;
  return scenes.find((scene) => scene.id === id) ?? null;
}

export function significantVoiceoverChange(
  previous: string,
  next: string,
): boolean {
  const a = normalizeMemoryText(previous);
  const b = normalizeMemoryText(next);
  if (a === b) return false;
  const aWords = a.split(/\s+/).filter(Boolean);
  const bWords = b.split(/\s+/).filter(Boolean);
  if (aWords.length === 0) return bWords.length > 0;
  const delta = Math.abs(aWords.length - bWords.length);
  if (delta >= 8) return true;
  const min = Math.min(aWords.length, bWords.length);
  let same = 0;
  for (let i = 0; i < min; i++) {
    if (aWords[i] === bWords[i]) same += 1;
  }
  return same / Math.max(aWords.length, bWords.length) < 0.7;
}
