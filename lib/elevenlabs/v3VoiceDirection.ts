import { createHash } from "node:crypto";
import type { VoiceDirectionContract } from "@/lib/content-package/voiceDirectionContract";
import {
  VOICE_DIRECTION_STYLE_CALM_TRUSTWORTHY,
  VOICE_DIRECTION_STYLE_ENERGETIC,
  VOICE_DIRECTION_STYLE_NATURAL,
  VOICE_DIRECTION_STYLE_URGENT,
} from "@/lib/content-package/voiceDirectionContract";

/** Whitelisted Eleven v3 audio tags — not user free text. */
export const ELEVEN_V3_WHITELIST_TAGS = [
  "[excited]",
  "[confident]",
  "[warm]",
  "[calm]",
  "[serious]",
] as const;

export type ElevenV3WhitelistTag = (typeof ELEVEN_V3_WHITELIST_TAGS)[number];

export const VOICE_DIRECTION_TO_V3_TAG: Record<
  string,
  ElevenV3WhitelistTag
> = {
  energetic: "[excited]",
  urgent: "[serious]",
  natural: "[warm]",
  calm_trustworthy: "[calm]",
  auto: "[confident]",
};

const DELIVERY_KEYWORD_TO_TAG: Array<{ pattern: RegExp; tag: ElevenV3WhitelistTag }> =
  [
    { pattern: /\b(excited|energetic|enthusias)/i, tag: "[excited]" },
    { pattern: /\b(confident|assured|bold)/i, tag: "[confident]" },
    { pattern: /\b(warm|friendly|approachable)/i, tag: "[warm]" },
    { pattern: /\b(calm|trust|soothing|steady)/i, tag: "[calm]" },
    { pattern: /\b(serious|urgent|gravitas)/i, tag: "[serious]" },
  ];

export const ELEVEN_V3_DIRECTION_CONTRACT_VERSION = 1 as const;

export interface ElevenV3SynthesisInput {
  approved_voiceover_text: string;
  synthesis_text: string;
  direction_contract_version: number;
  style: string;
  voice_direction_revision: number;
  tags_used: ElevenV3WhitelistTag[];
  beat_diagnostics?: string[];
}

function stripTagsForSpeech(text: string): string {
  return text
    .replace(/\[(excited|confident|warm|calm|serious)\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tagFromDeliveryHint(delivery: string): ElevenV3WhitelistTag | null {
  for (const entry of DELIVERY_KEYWORD_TO_TAG) {
    if (entry.pattern.test(delivery)) return entry.tag;
  }
  return null;
}

function tagFromCustomInstruction(instruction: string): ElevenV3WhitelistTag | null {
  const trimmed = instruction.trim();
  if (!trimmed) return null;
  return tagFromDeliveryHint(trimmed);
}

function findBeatAnchorInVoiceover(
  approvedVoiceover: string,
  segment: string,
): number | null {
  const seg = segment.trim();
  if (!seg) return null;
  const lowerVo = approvedVoiceover.toLowerCase();
  const lowerSeg = seg.toLowerCase();
  const direct = lowerVo.indexOf(lowerSeg);
  if (direct >= 0) return direct;
  const words = lowerSeg.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const firstWord = words[0]!;
  const idx = lowerVo.indexOf(firstWord);
  return idx >= 0 ? idx : null;
}

export function buildElevenV3SynthesisText(args: {
  approvedVoiceover: string;
  direction: VoiceDirectionContract;
}): ElevenV3SynthesisInput {
  const vo = args.approvedVoiceover.trim();
  const globalTag =
    VOICE_DIRECTION_TO_V3_TAG[args.direction.style] ?? "[confident]";
  const tags_used: ElevenV3WhitelistTag[] = [globalTag];
  const beat_diagnostics: string[] = [];

  const customTag = args.direction.custom_instruction
    ? tagFromCustomInstruction(args.direction.custom_instruction)
    : null;
  if (args.direction.custom_instruction?.trim() && !customTag) {
    beat_diagnostics.push("custom_instruction_unmapped");
  }

  type Insert = { index: number; tag: ElevenV3WhitelistTag };
  const inserts: Insert[] = [];

  for (const beat of args.direction.beats ?? []) {
    const tag = tagFromDeliveryHint(beat.delivery);
    if (!tag) {
      beat_diagnostics.push(`beat_unmapped:${beat.segment}`);
      continue;
    }
    const anchor = findBeatAnchorInVoiceover(vo, beat.segment);
    if (anchor === null) {
      beat_diagnostics.push(`beat_anchor_missing:${beat.segment}`);
      continue;
    }
    inserts.push({ index: anchor, tag });
    if (!tags_used.includes(tag)) tags_used.push(tag);
  }

  inserts.sort((a, b) => b.index - a.index);
  let body = vo;
  for (const ins of inserts) {
    body = `${body.slice(0, ins.index)}${ins.tag} ${body.slice(ins.index)}`;
  }

  const stylePrefix = customTag && customTag !== globalTag ? customTag : globalTag;
  const synthesis_text = `${stylePrefix} ${body}`.trim();
  const spokenOnly = stripTagsForSpeech(synthesis_text);
  if (spokenOnly !== vo) {
    throw new Error("eleven_v3_synthesis_spoken_mismatch");
  }
  return {
    approved_voiceover_text: vo,
    synthesis_text,
    direction_contract_version: ELEVEN_V3_DIRECTION_CONTRACT_VERSION,
    style: args.direction.style,
    voice_direction_revision: args.direction.revision ?? 0,
    tags_used,
    ...(beat_diagnostics.length > 0 ? { beat_diagnostics } : {}),
  };
}

export function synthesisInputFingerprint(payload: {
  voiceover_revision_id: string;
  voice_direction_revision: number;
  synthesis_text: string;
  voice_id: string;
  model_id: string;
  output_format: string;
  direction_contract_version: number;
}): string {
  const canonical = JSON.stringify(
    canonicalSynthesisFingerprintPayload(payload),
  );
  return createHash("sha256").update(canonical, "utf8").digest("hex").slice(0, 24);
}

export function canonicalSynthesisFingerprintPayload(payload: {
  voiceover_revision_id: string;
  voice_direction_revision: number;
  synthesis_text: string;
  voice_id: string;
  model_id: string;
  output_format: string;
  direction_contract_version: number;
}): Record<string, unknown> {
  return {
    voiceover_revision_id: payload.voiceover_revision_id,
    voice_direction_revision: payload.voice_direction_revision,
    synthesis_text: payload.synthesis_text,
    voice_id: payload.voice_id,
    model_id: payload.model_id,
    output_format: payload.output_format,
    direction_contract_version: payload.direction_contract_version,
  };
}

export function storedSynthesisInputsMatch(
  stored: unknown,
  expected: Record<string, unknown>,
): boolean {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return false;
  }
  const s = stored as Record<string, unknown>;
  const keys = [
    "approved_voiceover_text",
    "synthesis_text",
    "direction_contract_version",
    "style",
    "voice_direction_revision",
    "voice_id",
    "model_id",
    "output_format",
  ] as const;
  for (const key of keys) {
    if (s[key] !== expected[key]) return false;
  }
  return true;
}
