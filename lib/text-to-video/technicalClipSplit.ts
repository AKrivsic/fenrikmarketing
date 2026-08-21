/**
 * Technical Runway clip split for a single canonical scene.
 *
 * Does not create a second creative storyboard. Voiceover text, scene count,
 * and canonical IDs stay unchanged. One creative scene may become several
 * consecutive provider clips when measured (or clearly estimated) duration
 * exceeds the Gen-4.5 maximum.
 */

import type { ElevenLabsCharacterAlignment } from "@/lib/elevenlabs/adapter";
import {
  spokenCharTimingsFromAlignment,
  type SpokenCharTiming,
} from "@/lib/elevenlabs/alignmentVoiceover";
import {
  TEXT_TO_VIDEO_PRE_VOICE_SPLIT_THRESHOLD_SECONDS,
  TEXT_TO_VIDEO_RUNWAY_DURATION_MAX,
} from "@/lib/text-to-video/runwayProductionConfig";

export const T2V_SCENE_CANNOT_SPLIT = "t2v_scene_cannot_split" as const;
export const T2V_SCENE_SPLIT_INVALID = "t2v_scene_split_invalid" as const;

export class TextToVideoTechnicalClipSplitError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export interface TechnicalClipSpan {
  partIndex: number;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
}

export function technicalClipId(
  canonicalSceneId: string,
  partIndex: number,
): string {
  return `${canonicalSceneId}__part-${partIndex + 1}`;
}

export function excerptWordCount(excerpt: string): number {
  return excerpt
    .trim()
    .split(/\s+/u)
    .filter((word) => word.length > 0).length;
}

/** N words can become at most N technical clips (split only at word gaps). */
export function maxSplittableClipCount(excerpt: string): number {
  return Math.max(1, excerptWordCount(excerpt));
}

export function plannedTechnicalPartCountFromEstimate(
  durationSeconds: number,
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new TextToVideoTechnicalClipSplitError("scene_duration_invalid");
  }
  if (durationSeconds <= TEXT_TO_VIDEO_PRE_VOICE_SPLIT_THRESHOLD_SECONDS) {
    return 1;
  }
  return Math.max(
    2,
    Math.ceil(durationSeconds / TEXT_TO_VIDEO_PRE_VOICE_SPLIT_THRESHOLD_SECONDS),
  );
}

export function plannedTechnicalPartCountFromMeasured(
  durationSeconds: number,
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new TextToVideoTechnicalClipSplitError("scene_duration_invalid");
  }
  if (durationSeconds <= TEXT_TO_VIDEO_RUNWAY_DURATION_MAX) {
    return 1;
  }
  return Math.max(
    2,
    Math.ceil(durationSeconds / TEXT_TO_VIDEO_RUNWAY_DURATION_MAX),
  );
}

export function assertExcerptCanSplitIntoParts(args: {
  excerpt: string;
  partCount: number;
}): void {
  if (args.partCount <= 1) return;
  if (!args.excerpt.trim()) {
    throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_CANNOT_SPLIT);
  }
  if (maxSplittableClipCount(args.excerpt) < args.partCount) {
    throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_CANNOT_SPLIT);
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function splitDurationByWordWeights(
  durationSeconds: number,
  excerpt: string,
  partCount: number,
): TechnicalClipSpan[] {
  assertExcerptCanSplitIntoParts({ excerpt, partCount });
  const words = excerpt
    .trim()
    .split(/\s+/u)
    .filter((word) => word.length > 0);
  if (partCount === 1) {
    return [
      {
        partIndex: 0,
        startSeconds: 0,
        endSeconds: round2(durationSeconds),
        durationSeconds: round2(durationSeconds),
      },
    ];
  }
  const weights = words.map((word) => Math.max(1, word.length));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const groupSize = Math.ceil(words.length / partCount);
  const spans: TechnicalClipSpan[] = [];
  let cursor = 0;
  let wordOffset = 0;
  for (let partIndex = 0; partIndex < partCount; partIndex++) {
    const remainingParts = partCount - partIndex;
    const remainingWords = words.length - wordOffset;
    const take =
      partIndex === partCount - 1
        ? remainingWords
        : Math.max(1, Math.min(groupSize, remainingWords - (remainingParts - 1)));
    const groupWeight = weights
      .slice(wordOffset, wordOffset + take)
      .reduce((sum, weight) => sum + weight, 0);
    const share =
      partIndex === partCount - 1
        ? Math.max(0.25, durationSeconds - cursor)
        : (groupWeight / totalWeight) * durationSeconds;
    const start = cursor;
    const duration = round2(Math.max(0.25, share));
    const end = round2(start + duration);
    if (duration > TEXT_TO_VIDEO_RUNWAY_DURATION_MAX + 1e-9) {
      throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_CANNOT_SPLIT);
    }
    spans.push({
      partIndex,
      startSeconds: round2(start),
      endSeconds: end,
      durationSeconds: duration,
    });
    cursor = end;
    wordOffset += take;
  }
  const last = spans[spans.length - 1]!;
  last.endSeconds = round2(durationSeconds);
  last.durationSeconds = round2(last.endSeconds - last.startSeconds);
  if (last.durationSeconds > TEXT_TO_VIDEO_RUNWAY_DURATION_MAX + 1e-9) {
    throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_CANNOT_SPLIT);
  }
  return spans;
}

/**
 * Deterministic pre-voice split from estimated duration + excerpt words.
 * Used to fail closed before ElevenLabs and to quote conservative cost.
 */
export function splitEstimatedSceneIntoTechnicalClips(args: {
  durationSeconds: number;
  excerpt: string;
}): TechnicalClipSpan[] {
  const partCount = plannedTechnicalPartCountFromEstimate(args.durationSeconds);
  return splitDurationByWordWeights(
    args.durationSeconds,
    args.excerpt,
    partCount,
  );
}

function isSentenceEndChar(char: string): boolean {
  return /[.!?…]/u.test(char);
}

function isWordEnd(timings: SpokenCharTiming[], index: number): boolean {
  const current = timings[index];
  if (!current || /\s/u.test(current.char)) return false;
  const next = timings[index + 1];
  if (!next) return true;
  return /\s/u.test(next.char) || isSentenceEndChar(current.char);
}

function lastNaturalBoundarySeconds(args: {
  timings: SpokenCharTiming[];
  afterSeconds: number;
  windowEndSeconds: number;
}): number | null {
  let lastWord: number | null = null;
  let lastSentence: number | null = null;
  for (let i = 0; i < args.timings.length; i++) {
    const unit = args.timings[i]!;
    if (unit.end_seconds <= args.afterSeconds + 0.25) continue;
    if (unit.end_seconds > args.windowEndSeconds + 1e-9) break;
    if (isWordEnd(args.timings, i)) {
      lastWord = unit.end_seconds;
    }
    if (isSentenceEndChar(unit.char)) {
      lastSentence = unit.end_seconds;
    }
  }
  return lastSentence ?? lastWord;
}

function timingsCoveringRange(
  timings: SpokenCharTiming[],
  startSeconds: number,
  endSeconds: number,
): SpokenCharTiming[] {
  return timings.filter(
    (unit) =>
      unit.end_seconds > startSeconds - 1e-6 &&
      unit.start_seconds < endSeconds + 1e-6,
  );
}

function assertExactCoverage(
  spans: TechnicalClipSpan[],
  startSeconds: number,
  endSeconds: number,
): void {
  if (spans.length === 0) {
    throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_SPLIT_INVALID);
  }
  if (Math.abs(spans[0]!.startSeconds - startSeconds) > 0.011) {
    throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_SPLIT_INVALID);
  }
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!;
    if (span.durationSeconds > TEXT_TO_VIDEO_RUNWAY_DURATION_MAX + 1e-9) {
      throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_SPLIT_INVALID);
    }
    if (span.durationSeconds < 0.25) {
      throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_SPLIT_INVALID);
    }
    if (i > 0) {
      const prev = spans[i - 1]!;
      if (Math.abs(span.startSeconds - prev.endSeconds) > 0.011) {
        throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_SPLIT_INVALID);
      }
    }
  }
  const last = spans[spans.length - 1]!;
  if (Math.abs(last.endSeconds - endSeconds) > 0.011) {
    throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_SPLIT_INVALID);
  }
}

/**
 * Split a measured scene at word/sentence boundaries from ElevenLabs alignment.
 * Coverage is exact: no gap, no overlap, order preserved.
 */
export function splitMeasuredSceneIntoTechnicalClips(args: {
  startSeconds: number;
  durationSeconds: number;
  excerpt: string;
  alignment: ElevenLabsCharacterAlignment;
  approvedVoiceover: string;
}): TechnicalClipSpan[] {
  const start = round2(args.startSeconds);
  const duration = round2(args.durationSeconds);
  const end = round2(start + duration);
  const partCount = plannedTechnicalPartCountFromMeasured(duration);
  assertExcerptCanSplitIntoParts({ excerpt: args.excerpt, partCount });
  if (partCount === 1) {
    const single = [
      {
        partIndex: 0,
        startSeconds: start,
        endSeconds: end,
        durationSeconds: duration,
      },
    ];
    assertExactCoverage(single, start, end);
    return single;
  }

  let timings: SpokenCharTiming[];
  try {
    timings = timingsCoveringRange(
      spokenCharTimingsFromAlignment(args.alignment, args.approvedVoiceover),
      start,
      end,
    );
  } catch {
    throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_SPLIT_INVALID);
  }
  if (timings.length === 0) {
    throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_SPLIT_INVALID);
  }

  const spans: TechnicalClipSpan[] = [];
  let clipStart = start;
  while (clipStart < end - 0.011) {
    const remaining = end - clipStart;
    if (remaining <= TEXT_TO_VIDEO_RUNWAY_DURATION_MAX + 1e-9) {
      spans.push({
        partIndex: spans.length,
        startSeconds: round2(clipStart),
        endSeconds: end,
        durationSeconds: round2(end - clipStart),
      });
      break;
    }
    const windowEnd = clipStart + TEXT_TO_VIDEO_RUNWAY_DURATION_MAX;
    const boundary = lastNaturalBoundarySeconds({
      timings,
      afterSeconds: clipStart,
      windowEndSeconds: windowEnd,
    });
    if (boundary == null || boundary <= clipStart + 0.25) {
      throw new TextToVideoTechnicalClipSplitError(T2V_SCENE_SPLIT_INVALID);
    }
    const clipEnd = round2(Math.min(boundary, windowEnd));
    spans.push({
      partIndex: spans.length,
      startSeconds: round2(clipStart),
      endSeconds: clipEnd,
      durationSeconds: round2(clipEnd - clipStart),
    });
    clipStart = clipEnd;
  }

  const last = spans[spans.length - 1];
  if (last && last.durationSeconds < 0.25 && spans.length > 1) {
    const prev = spans[spans.length - 2]!;
    const merged = round2(end - prev.startSeconds);
    if (merged <= TEXT_TO_VIDEO_RUNWAY_DURATION_MAX + 1e-9) {
      prev.endSeconds = end;
      prev.durationSeconds = merged;
      spans.pop();
    }
  }

  assertExactCoverage(spans, start, end);
  return spans;
}

export function conservativeInflatedDurationSeconds(
  estimatedDurationSeconds: number,
  slack: number,
): number {
  return estimatedDurationSeconds * slack;
}
