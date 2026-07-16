import type { Json, LanguageCode } from "@/lib/supabase/types";
import {
  DEFAULT_OPENAI_TTS_VOICE,
  deterministicOpenAiTtsVoice,
  isOpenAiTtsVoice,
  normalizeOpenAiTtsVoice,
  OPENAI_TTS_VOICES,
  type OpenAiTtsVoice,
} from "@/lib/voice/openaiTtsVoices";
import { parseKnowledgePresentation } from "@/lib/voice/knowledgePresentation";

/** Coarse delivery traits for pairing distinct voices (not provider SSML). */
export interface VoiceTraits {
  warmth: number;
  energy: number;
  steadiness: number;
}

/**
 * Relative traits for OpenAI TTS voices — used only to pick a contrasting
 * secondary and to score package fit. Values are relative, not absolute.
 */
export const OPENAI_TTS_VOICE_TRAITS: Record<OpenAiTtsVoice, VoiceTraits> = {
  alloy: { warmth: 5, energy: 5, steadiness: 6 },
  ash: { warmth: 4, energy: 4, steadiness: 7 },
  ballad: { warmth: 7, energy: 4, steadiness: 5 },
  coral: { warmth: 7, energy: 6, steadiness: 5 },
  echo: { warmth: 4, energy: 5, steadiness: 7 },
  fable: { warmth: 6, energy: 7, steadiness: 4 },
  onyx: { warmth: 3, energy: 5, steadiness: 8 },
  nova: { warmth: 6, energy: 7, steadiness: 5 },
  sage: { warmth: 5, energy: 4, steadiness: 7 },
  shimmer: { warmth: 8, energy: 6, steadiness: 4 },
  verse: { warmth: 5, energy: 6, steadiness: 6 },
  marin: { warmth: 7, energy: 5, steadiness: 6 },
  cedar: { warmth: 4, energy: 5, steadiness: 8 },
};

export type VoiceFamilySource =
  | "explicit"
  | "auto_family"
  | "legacy_deterministic";

export interface ProjectVoiceFamily {
  primary: OpenAiTtsVoice;
  /** Null when user picked an explicit named voice (secondary disabled). */
  secondary: OpenAiTtsVoice | null;
  source: VoiceFamilySource;
}

export interface VoicePackageSignals {
  funnelStage?: string | null;
  creativeMode?: string | null;
  topic?: string | null;
  angle?: string | null;
  visualProfile?: string | null;
  narrativeRoles?: readonly string[] | null;
  /** Recent selected voices (newest first) — soft tie-breaker only. */
  recentSelectedVoices?: readonly string[] | null;
}

export interface VoiceSelectionResult {
  voice: OpenAiTtsVoice;
  primary: OpenAiTtsVoice;
  secondary: OpenAiTtsVoice | null;
  source: VoiceFamilySource | "package_primary" | "package_secondary";
  scores: { primary: number; secondary: number };
  reasons: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stableHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function traitDistance(a: VoiceTraits, b: VoiceTraits): number {
  return (
    Math.abs(a.warmth - b.warmth) +
    Math.abs(a.energy - b.energy) +
    Math.abs(a.steadiness - b.steadiness)
  );
}

function toneAudienceSeed(args: {
  toneOfVoice?: Json | null;
  targetAudience?: Json | null;
}): string {
  const parts: string[] = [];
  const tone = args.toneOfVoice;
  if (typeof tone === "string") {
    parts.push(tone.trim().toLowerCase());
  } else {
    const rec = asRecord(tone);
    if (rec) {
      const notes = rec.notes;
      if (Array.isArray(notes)) {
        for (const n of notes) {
          if (typeof n === "string" && n.trim()) parts.push(n.trim().toLowerCase());
        }
      }
      for (const key of ["style", "tone", "voice", "summary"]) {
        const v = rec[key];
        if (typeof v === "string" && v.trim()) parts.push(v.trim().toLowerCase());
      }
    }
  }
  const audience = args.targetAudience;
  if (typeof audience === "string") {
    parts.push(audience.trim().toLowerCase());
  } else {
    const rec = asRecord(audience);
    if (rec) {
      for (const key of ["description", "summary", "primary"]) {
        const v = rec[key];
        if (typeof v === "string" && v.trim()) parts.push(v.trim().toLowerCase());
      }
      const segments = rec.segments;
      if (Array.isArray(segments)) {
        for (const seg of segments) {
          if (typeof seg === "string" && seg.trim()) {
            parts.push(seg.trim().toLowerCase());
          }
        }
      }
    }
  }
  return parts.join("|");
}

/** Pick secondary as the most trait-distinct remaining voice; ties broken by seed. */
export function pickSecondaryVoice(args: {
  primary: OpenAiTtsVoice;
  seed: string;
}): OpenAiTtsVoice {
  const primaryTraits = OPENAI_TTS_VOICE_TRAITS[args.primary];
  let bestDist = -1;
  const candidates: OpenAiTtsVoice[] = [];
  for (const voice of OPENAI_TTS_VOICES) {
    if (voice === args.primary) continue;
    const dist = traitDistance(primaryTraits, OPENAI_TTS_VOICE_TRAITS[voice]);
    if (dist > bestDist) {
      bestDist = dist;
      candidates.length = 0;
      candidates.push(voice);
    } else if (dist === bestDist) {
      candidates.push(voice);
    }
  }
  if (candidates.length === 0) return DEFAULT_OPENAI_TTS_VOICE;
  const idx = stableHash(`${args.seed}|secondary`) % candidates.length;
  return candidates[idx] ?? DEFAULT_OPENAI_TTS_VOICE;
}

export function resolveProjectVoiceFamily(args: {
  projectId: string;
  language: LanguageCode | string;
  knowledge?: Json | null;
  toneOfVoice?: Json | null;
  targetAudience?: Json | null;
}): ProjectVoiceFamily {
  const presentation = parseKnowledgePresentation(args.knowledge ?? null);
  const preferred = presentation.preferred_voice?.trim().toLowerCase();

  const useAutomatic =
    !preferred ||
    preferred === "auto" ||
    presentation.voice_selection === "deterministic";

  if (!useAutomatic && preferred) {
    const primary = normalizeOpenAiTtsVoice(preferred, DEFAULT_OPENAI_TTS_VOICE);
    return {
      primary,
      secondary: null,
      source: "explicit",
    };
  }

  const primary = deterministicOpenAiTtsVoice({
    projectId: args.projectId,
    language: args.language,
  });
  const seed = [
    args.projectId,
    args.language,
    toneAudienceSeed({
      toneOfVoice: args.toneOfVoice,
      targetAudience: args.targetAudience,
    }),
  ].join("::");
  const secondary = pickSecondaryVoice({ primary, seed });

  return {
    primary,
    secondary,
    source:
      presentation.voice_selection === "deterministic"
        ? "legacy_deterministic"
        : "auto_family",
  };
}

function packageDesire(signals: VoicePackageSignals | null | undefined): {
  warmth: number;
  energy: number;
  steadiness: number;
  reasons: string[];
} {
  const desire = { warmth: 0, energy: 0, steadiness: 0 };
  const reasons: string[] = [];
  if (!signals) return { ...desire, reasons };

  const funnel = (signals.funnelStage ?? "").trim().toLowerCase();
  if (funnel.includes("conversion")) {
    desire.steadiness += 2;
    reasons.push("funnel_conversion→steadiness(+2)");
  } else if (funnel.includes("solution")) {
    desire.steadiness += 1;
    desire.energy += 1;
    reasons.push("funnel_solution→steady/energy(+1)");
  } else if (funnel.includes("problem")) {
    desire.warmth += 2;
    reasons.push("funnel_problem→warmth(+2)");
  } else if (funnel.includes("awareness")) {
    desire.warmth += 1;
    desire.energy += 1;
    reasons.push("funnel_awareness→warmth/energy(+1)");
  }

  const mode = (signals.creativeMode ?? "").trim().toLowerCase();
  switch (mode) {
    case "story":
      desire.warmth += 3;
      reasons.push("mode_story→warmth(+3)");
      break;
    case "humor":
      desire.energy += 2;
      desire.warmth += 1;
      reasons.push("mode_humor→energy/warmth");
      break;
    case "shock":
    case "contrarian":
      desire.energy += 3;
      reasons.push(`mode_${mode}→energy(+3)`);
      break;
    case "observation":
      desire.steadiness += 1;
      desire.warmth += 1;
      reasons.push("mode_observation→steady/warmth");
      break;
    case "mistake":
      desire.warmth += 2;
      desire.steadiness += 1;
      reasons.push("mode_mistake→warmth/steady");
      break;
    case "myth_buster":
      desire.steadiness += 2;
      desire.energy += 1;
      reasons.push("mode_myth_buster→steady/energy");
      break;
    case "comparison":
    case "standard":
      desire.steadiness += 2;
      reasons.push(`mode_${mode}→steadiness(+2)`);
      break;
    case "micro_case":
      desire.steadiness += 2;
      desire.warmth += 1;
      reasons.push("mode_micro_case→steady/warmth");
      break;
    default:
      break;
  }

  const profile = (signals.visualProfile ?? "").trim().toUpperCase();
  if (profile === "NATURAL") {
    desire.warmth += 2;
    reasons.push("profile_NATURAL→warmth(+2)");
  } else if (profile === "BOLD") {
    desire.energy += 2;
    reasons.push("profile_BOLD→energy(+2)");
  } else if (profile === "MINIMAL") {
    desire.steadiness += 2;
    reasons.push("profile_MINIMAL→steadiness(+2)");
  } else if (profile === "EDITORIAL") {
    desire.steadiness += 1;
    desire.warmth += 1;
    reasons.push("profile_EDITORIAL→steady/warmth");
  } else if (profile === "PREMIUM") {
    desire.steadiness += 2;
    reasons.push("profile_PREMIUM→steadiness(+2)");
  }

  const blob = `${signals.topic ?? ""} ${signals.angle ?? ""}`.toLowerCase();
  if (/\b(confession|honest|personal|vulnerable|relatable)\b/.test(blob)) {
    desire.warmth += 2;
    reasons.push("topic_warmth_cues(+2)");
  }
  if (/\b(prediction|disrupt|bold|shock|provocative)\b/.test(blob)) {
    desire.energy += 2;
    reasons.push("topic_energy_cues(+2)");
  }
  if (/\b(trust|enterprise|proof|credible|professional)\b/.test(blob)) {
    desire.steadiness += 2;
    reasons.push("topic_steadiness_cues(+2)");
  }

  const roles = signals.narrativeRoles ?? [];
  if (roles.some((r) => /cta|close|proof/i.test(r))) {
    desire.steadiness += 1;
    reasons.push("roles_close/proof→steadiness(+1)");
  }

  return { ...desire, reasons };
}

function fitScore(traits: VoiceTraits, desire: {
  warmth: number;
  energy: number;
  steadiness: number;
}): number {
  return (
    traits.warmth * desire.warmth +
    traits.energy * desire.energy +
    traits.steadiness * desire.steadiness
  );
}

const TIE_MARGIN = 4;
const RECENT_PRIMARY_HEAVY = 3;

/**
 * Choose PRIMARY or SECONDARY for this package.
 * Secondary wins only when materially stronger, or a close call with heavy primary repetition.
 */
export function selectVoiceForPackage(args: {
  family: ProjectVoiceFamily;
  packageSignals?: VoicePackageSignals | null;
}): VoiceSelectionResult {
  const { family } = args;
  const reasons: string[] = [...(args.packageSignals ? [] : ["no_package_signals"])];

  if (!family.secondary) {
    return {
      voice: family.primary,
      primary: family.primary,
      secondary: null,
      source: family.source === "explicit" ? "explicit" : "package_primary",
      scores: { primary: 1, secondary: 0 },
      reasons: [
        family.source === "explicit"
          ? "explicit_named_voice→primary_only"
          : "secondary_disabled→primary",
      ],
    };
  }

  const desire = packageDesire(args.packageSignals);
  reasons.push(...desire.reasons);

  // Primary baseline preference — secondary must earn the slot.
  let primaryScore = 10 + fitScore(OPENAI_TTS_VOICE_TRAITS[family.primary], desire);
  let secondaryScore =
    8 + fitScore(OPENAI_TTS_VOICE_TRAITS[family.secondary], desire);

  reasons.push(`fit_primary(+${primaryScore})`);
  reasons.push(`fit_secondary(+${secondaryScore})`);

  const recent = (args.packageSignals?.recentSelectedVoices ?? [])
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6);
  const primaryRecent = recent.filter((v) => v === family.primary).length;
  const secondaryRecent = recent.filter((v) => v === family.secondary).length;

  let softPreferSecondary = false;
  const margin = Math.abs(primaryScore - secondaryScore);
  if (margin <= TIE_MARGIN && primaryRecent >= RECENT_PRIMARY_HEAVY) {
    secondaryScore += 3;
    softPreferSecondary = true;
    reasons.push(
      `soft_tie_recent_primary(${primaryRecent})→secondary(+3)`,
    );
  } else if (margin <= TIE_MARGIN && secondaryRecent >= RECENT_PRIMARY_HEAVY) {
    primaryScore += 2;
    reasons.push(
      `soft_tie_recent_secondary(${secondaryRecent})→primary(+2)`,
    );
  }

  if (
    secondaryScore > primaryScore ||
    (softPreferSecondary && secondaryScore >= primaryScore)
  ) {
    return {
      voice: family.secondary,
      primary: family.primary,
      secondary: family.secondary,
      source: "package_secondary",
      scores: { primary: primaryScore, secondary: secondaryScore },
      reasons,
    };
  }

  return {
    voice: family.primary,
    primary: family.primary,
    secondary: family.secondary,
    source: "package_primary",
    scores: { primary: primaryScore, secondary: secondaryScore },
    reasons,
  };
}

export function resolveVoiceSelection(args: {
  projectId: string;
  language: LanguageCode | string;
  knowledge?: Json | null;
  toneOfVoice?: Json | null;
  targetAudience?: Json | null;
  packageSignals?: VoicePackageSignals | null;
}): VoiceSelectionResult {
  const family = resolveProjectVoiceFamily(args);
  return selectVoiceForPackage({
    family,
    packageSignals: args.packageSignals,
  });
}

export function isOpenAiTtsVoiceName(value: string): value is OpenAiTtsVoice {
  return isOpenAiTtsVoice(value);
}
