import {
  containsCzechDiacritics,
  hasCzechVisualPrefix,
  type CanonicalVideoScene,
} from "@/lib/content-package/canonicalVideoPlan";
import type { VisualIdentity } from "@/lib/content-pipeline/types";

export const T2V_PROVIDER_PROMPT_NOT_ENGLISH =
  "t2v_provider_prompt_not_english" as const;

/** Gen-4.5 `promptText` limit — JS string.length is UTF-16 code units. */
export const T2V_GEN45_PROMPT_MAX_UTF16 = 1000 as const;

export const T2V_PROVIDER_PROMPT_CONSTRAINTS =
  "No dialogue, lip-sync, subtitles, captions, logos, or readable on-screen text." as const;

/** Mechanical continuation for later technical parts of the same canonical scene. */
export const T2V_TECHNICAL_CONTINUATION_LINE =
  "Same continuous shot; next phase of the same action; same subject, wardrobe, and environment; no new story." as const;

export const T2V_TECHNICAL_CONTINUATION_PROMPT_FAILED =
  "t2v_technical_continuation_prompt_failed" as const;

export interface TextToVideoContinuityBlock {
  environment?: string;
  palette?: string;
  lighting?: string;
  art_direction?: string;
  camera_style?: string;
  character_style?: string;
}

export function utf16CodeUnits(value: string): number {
  return value.length;
}

export function continuityBlockFromVisualIdentity(
  identity: VisualIdentity | null | undefined,
): TextToVideoContinuityBlock | null {
  if (!identity) return null;
  const block: TextToVideoContinuityBlock = {};
  if (identity.environment.trim()) block.environment = identity.environment.trim();
  if (identity.palette.trim()) block.palette = identity.palette.trim();
  if (identity.lighting.trim()) block.lighting = identity.lighting.trim();
  if (identity.art_direction.trim()) {
    block.art_direction = identity.art_direction.trim();
  }
  if (identity.camera_style.trim()) block.camera_style = identity.camera_style.trim();
  if (identity.character_style.trim()) {
    block.character_style = identity.character_style.trim();
  }
  return Object.keys(block).length > 0 ? block : null;
}

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Phone/monitor chrome is not treated as essential readable type.
 * Strip requests for legible on-screen copy so they cannot contradict constraints.
 */
export function stripNonessentialReadableTextRequests(value: string): string {
  let next = value;
  next = next.replace(
    /\b(?:readable|legible|clearly visible|crisp)\s+(?:on[-\s]?screen\s+)?(?:text|type|letters|numbers|copy|ui copy)\b/gi,
    "",
  );
  next = next.replace(
    /\b(?:show|display|include|with)\s+(?:the\s+)?(?:clearly\s+)?(?:readable|legible)\s+(?:text|type|letters|numbers)\b/gi,
    "",
  );
  next = next.replace(
    /\breadable\s+(?:text|ui|letters|numbers)\s+on\s+(?:the\s+)?(?:phone|screen|monitor|display|laptop)\b/gi,
    "",
  );
  return collapseSpaces(next.replace(/[;,:]{2,}/g, " ").replace(/\s+([.,;:])/g, "$1"));
}

function similarEnough(a: string, b: string): boolean {
  const left = collapseSpaces(a).toLowerCase();
  const right = collapseSpaces(b).toLowerCase();
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const aWords = left.split(" ").filter(Boolean);
  const bWords = right.split(" ").filter(Boolean);
  if (aWords.length === 0 || bWords.length === 0) return false;
  const set = new Set(aWords);
  let overlap = 0;
  for (const word of bWords) {
    if (set.has(word)) overlap += 1;
  }
  return overlap / Math.max(aWords.length, bWords.length) >= 0.8;
}

function trimToUtf16WordBoundary(value: string, max: number): string {
  if (utf16CodeUnits(value) <= max) return value;
  if (max <= 0) return "";
  const sliced = value.slice(0, max);
  const space = sliced.lastIndexOf(" ");
  const cut = space >= Math.floor(max * 0.6) ? sliced.slice(0, space) : sliced;
  return cut.trim();
}

function joinIfFits(current: string, part: string, max: number): string {
  const next = current ? `${current} ${part}` : part;
  return utf16CodeUnits(next) <= max ? next : current;
}

function shortContinuityWithoutCamera(
  block: TextToVideoContinuityBlock | null,
): string {
  if (!block) return "";
  const parts: string[] = [];
  if (block.environment) parts.push(block.environment);
  if (block.palette) parts.push(block.palette);
  if (block.lighting) parts.push(block.lighting);
  if (block.character_style) parts.push(block.character_style);
  if (parts.length === 0) return "";
  return `Continuity: ${parts.join("; ")}.`;
}

/**
 * True when the prompt both forbids readable type and still asks to show it.
 * The shared constraint line alone does not count as a contradiction.
 */
export function providerPromptHasContradictoryTextRules(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const forbidsReadable =
    /no readable on-screen text/.test(lower) ||
    /no generated subtitles, captions, or logos/.test(lower);
  const requiresReadable =
    /(?:show|display|include|with)\s+(?:the\s+)?(?:clearly\s+)?(?:readable|legible)\s+(?:text|type|letters|numbers)/.test(
      lower,
    ) ||
    /readable\s+(?:text|ui|letters|numbers)\s+on\s+(?:the\s+)?(?:phone|screen|monitor|display)/.test(
      lower,
    );
  return forbidsReadable && requiresReadable;
}

/**
 * Mechanical Runway prompt from approved English scene + motion + identity.
 * Fits Gen-4.5's 1000 UTF-16 limit by priority, without slicing the whole prompt first.
 */
export function composeTextToVideoProviderPrompt(args: {
  englishVisualIntent?: string;
  /** @deprecated Legacy alias — same as englishVisualIntent. */
  humanVisualIntent?: string;
  motionPrompt?: string | null;
  energyMotion?: string;
  sceneRole?: "opening" | "body" | "closing";
  continuity?: TextToVideoContinuityBlock | null;
  canonicalScene?: Pick<CanonicalVideoScene, "image_prompt"> | null;
  /** When the operator changed the plot, do not mix in the previous still/motion. */
  omitStaleVisuals?: boolean;
  /** Later technical clips of the same canonical scene — not a new storyboard. */
  technicalContinuation?: { partIndex: number; partCount: number } | null;
}): string {
  const max = T2V_GEN45_PROMPT_MAX_UTF16;
  const intent = stripNonessentialReadableTextRequests(
    (args.englishVisualIntent ?? args.humanVisualIntent ?? "").trim(),
  );
  const stillRaw = stripNonessentialReadableTextRequests(
    args.canonicalScene?.image_prompt?.trim() ?? "",
  );
  const motion = stripNonessentialReadableTextRequests(
    (args.motionPrompt ?? "").trim() || (args.energyMotion ?? "").trim(),
  );
  const omitStale = args.omitStaleVisuals === true;
  const includeStill =
    Boolean(stillRaw) && !omitStale && !similarEnough(intent, stillRaw);
  const includeMotion =
    Boolean(motion) &&
    !omitStale &&
    !similarEnough(intent, motion) &&
    !similarEnough(stillRaw, motion);

  const header = "Photoreal vertical 9:16 clip.";
  const action = intent ? `Action: ${intent}` : "";
  const motionLine = includeMotion ? `Motion: ${motion}.`.replace("..", ".") : "";
  const camera = args.continuity?.camera_style?.trim()
    ? `Camera: ${args.continuity.camera_style.trim()}.`
    : "";
  const stillLine = includeStill ? `Setting: ${stillRaw}` : "";
  const continuity = omitStale
    ? ""
    : shortContinuityWithoutCamera(args.continuity ?? null);
  const constraint = T2V_PROVIDER_PROMPT_CONSTRAINTS;
  const continuation =
    args.technicalContinuation && args.technicalContinuation.partIndex > 0
      ? T2V_TECHNICAL_CONTINUATION_LINE
      : "";

  const reservedParts = [header, continuation, constraint].filter(Boolean).join(" ");
  const reserved = utf16CodeUnits(reservedParts) + 1;
  const actionBudget = Math.max(24, max - reserved - 1);
  const actionFitted = action
    ? utf16CodeUnits(action) <= actionBudget
      ? action
      : `Action: ${trimToUtf16WordBoundary(intent, actionBudget - 8)}`
    : "";

  const suffixBudget = max - utf16CodeUnits(constraint) - 1;
  let body = header;
  if (actionFitted) body = joinIfFits(body, actionFitted, suffixBudget);
  if (continuation) {
    const withContinuation = `${body} ${continuation}`.trim();
    if (utf16CodeUnits(withContinuation) > suffixBudget) {
      throw new Error(T2V_TECHNICAL_CONTINUATION_PROMPT_FAILED);
    }
    body = withContinuation;
  }
  body = joinIfFits(body, motionLine, suffixBudget);
  body = joinIfFits(body, camera, suffixBudget);
  body = joinIfFits(body, continuity, suffixBudget);
  body = joinIfFits(body, stillLine, suffixBudget);

  let prompt = `${body} ${constraint}`.trim();
  if (utf16CodeUnits(prompt) > max) {
    const maxBody = max - utf16CodeUnits(constraint) - 1;
    prompt = `${trimToUtf16WordBoundary(body, maxBody)} ${constraint}`.trim();
  }
  if (utf16CodeUnits(prompt) > max) {
    prompt = trimToUtf16WordBoundary(prompt, max);
  }
  if (
    continuation &&
    (!prompt.includes(T2V_TECHNICAL_CONTINUATION_LINE) ||
      utf16CodeUnits(prompt) > max)
  ) {
    throw new Error(T2V_TECHNICAL_CONTINUATION_PROMPT_FAILED);
  }
  return prompt;
}

/**
 * Mechanical prompt for one technical Runway part of a canonical scene.
 * Part 0 keeps the stored prompt. Later parts add a continuation line without
 * inventing plot. Fail closed instead of substituting a generic prompt.
 */
export function composeTextToVideoTechnicalPartPrompt(args: {
  basePrompt: string;
  partIndex: number;
  partCount: number;
}): string {
  const base = args.basePrompt.trim();
  if (!base) {
    throw new Error(T2V_TECHNICAL_CONTINUATION_PROMPT_FAILED);
  }
  if (args.partIndex <= 0 || args.partCount <= 1) {
    if (utf16CodeUnits(base) > T2V_GEN45_PROMPT_MAX_UTF16) {
      throw new Error("t2v_provider_prompt_too_long");
    }
    return base;
  }
  let body = base;
  if (body.endsWith(T2V_PROVIDER_PROMPT_CONSTRAINTS)) {
    body = body.slice(0, -T2V_PROVIDER_PROMPT_CONSTRAINTS.length).trim();
  }
  const continuation = T2V_TECHNICAL_CONTINUATION_LINE;
  const constraint = T2V_PROVIDER_PROMPT_CONSTRAINTS;
  const fitted = `${body} ${continuation} ${constraint}`.trim();
  if (utf16CodeUnits(fitted) <= T2V_GEN45_PROMPT_MAX_UTF16) {
    return fitted;
  }
  const reserved = utf16CodeUnits(`${continuation} ${constraint}`) + 1;
  const maxBody = T2V_GEN45_PROMPT_MAX_UTF16 - reserved;
  if (maxBody < 24) {
    throw new Error(T2V_TECHNICAL_CONTINUATION_PROMPT_FAILED);
  }
  const trimmed = trimToUtf16WordBoundary(body, maxBody);
  if (utf16CodeUnits(trimmed) < 24) {
    throw new Error(T2V_TECHNICAL_CONTINUATION_PROMPT_FAILED);
  }
  const prompt = `${trimmed} ${continuation} ${constraint}`.trim();
  if (
    utf16CodeUnits(prompt) > T2V_GEN45_PROMPT_MAX_UTF16 ||
    !prompt.includes(T2V_TECHNICAL_CONTINUATION_LINE)
  ) {
    throw new Error(T2V_TECHNICAL_CONTINUATION_PROMPT_FAILED);
  }
  return prompt;
}

export function assertProviderPromptIsEnglishProduction(prompt: string): void {
  if (containsCzechDiacritics(prompt) || hasCzechVisualPrefix(prompt)) {
    throw new Error(T2V_PROVIDER_PROMPT_NOT_ENGLISH);
  }
}
