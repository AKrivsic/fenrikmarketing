/**
 * Deterministic creative fingerprint + text normalization for Creative Core v2.
 * Keyword/token heuristics only — no embeddings.
 */

import { CREATIVE_CORE_V2_FINGERPRINT_VERSION } from "@/lib/content-creative-core-v2/config";
import type {
  ContentCreativeCoreV2,
  CreativeFingerprintV2,
  StrategyCandidateV2,
} from "@/lib/content-creative-core-v2/types";

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "your",
  "you",
  "their",
  "they",
  "this",
  "that",
  "from",
  "into",
  "about",
  "when",
  "before",
  "after",
  "while",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "as",
  "at",
  "by",
  "it",
  "its",
]);

export function normalizeCreativeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function significantTokens(text: string): string[] {
  const n = normalizeCreativeText(text);
  if (!n) return [];
  return n
    .split(" ")
    .filter((w) => w.length >= 4 && !STOP.has(w))
    .slice(0, 48);
}

export function tokenSet(text: string): Set<string> {
  return new Set(significantTokens(text));
}

/** Jaccard-like overlap on the smaller token set. */
export function tokenOverlapRatio(a: string, b: string): number {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const w of ta) if (tb.has(w)) overlap += 1;
  return overlap / Math.min(ta.size, tb.size);
}

export function isParaphraseText(a: string, b: string): boolean {
  const na = normalizeCreativeText(a);
  const nb = normalizeCreativeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return tokenOverlapRatio(na, nb) >= 0.55;
}

export function keyFromText(text: string, maxTokens = 8): string {
  const tokens = significantTokens(text);
  if (tokens.length === 0) return "";
  return tokens.slice(0, maxTokens).join("_");
}

export function classifyOpeningMechanism(hook: string): string {
  const t = hook.trim();
  if (!t) return "other";
  if (/^['"„]/.test(t) || /\bI\s+['"]/.test(t)) return "quoted_dialogue";
  if (t.includes("?")) return "direct_question";
  if (/:\s/.test(t)) return "contrast_or_definition";
  return "declarative";
}

export function classifyCtaMechanism(cta: string): string {
  const t = normalizeCreativeText(cta);
  if (!t) return "other";
  if (/(book|call|demo|meeting)/.test(t)) return "book_or_call";
  if (/(follow|subscribe)/.test(t)) return "follow";
  if (/(visit|website|url|link)/.test(t)) return "visit";
  if (/(learn|read|watch)/.test(t)) return "learn_more";
  return "other";
}

export function classifyPovKey(text: string): string {
  const t = normalizeCreativeText(text);
  if (!t) return "other";
  if (/\bhiring manager\b|\brecruiter\b/.test(t)) return "hiring_manager";
  if (/\bnew hire\b|\bfirst day\b|\bday one\b/.test(t)) return "new_hire";
  if (/\bclient\b|\bbuyer\b|\bprospect\b/.test(t)) return "potential_client";
  if (/\bfounder\b|\bowner\b|\boperator\b/.test(t)) return "founder";
  if (/\bcandidate\b|\bapplicant\b/.test(t)) return "candidate";
  if (/\bcustomer\b|\buser\b/.test(t)) return "customer";
  return "other";
}

export function classifySituationMechanism(text: string): string {
  const t = normalizeCreativeText(text);
  if (!t) return "other";

  const preCommitmentLookup =
    /\b(before|night before|prior to)\b/.test(t) &&
    /\b(interview|first day|day one|call|meeting|outreach|reply|hire)\b/.test(t) &&
    /\b(search|searches|searched|check|checks|checked|look|looked|google|research|researched|tab|profile|feed)\b/.test(
      t,
    );
  const silenceResult =
    /\b(nothing posted|no recent|months ago|weeks ago|quietly closed|silent|inactive|empty feed|sparse|abandoned|gone quiet)\b/.test(
      t,
    );
  if (preCommitmentLookup && silenceResult) {
    return "pre_commitment_presence_check";
  }
  if (preCommitmentLookup) return "pre_commitment_lookup";

  if (
    /\b(deadline|clock|running out|too slow|hours?)\b/.test(t) &&
    /\b(photo|shoot|content|post|draft)\b/.test(t)
  ) {
    return "production_friction_clock";
  }
  if (/\b(queue|empty draft|nothing drafted)\b/.test(t)) {
    return "empty_content_queue";
  }
  return "other";
}

export function classifyNarrativeMechanism(text: string): string {
  const t = normalizeCreativeText(text);
  if (!t) return "other";
  if (/\breveal\b|\bdiscover\b|\bfinds?\b|\bopens?\b/.test(t)) {
    return "discovery_reveal";
  }
  if (/\bdeadline\b|\bclock\b|\btime.?running\b/.test(t)) {
    return "time_pressure";
  }
  if (/\bbefore.?and.?after\b|\bcontrast\b|\bvs\b/.test(t)) {
    return "contrast";
  }
  if (/\bmistake\b|\bfail\b|\bwrong\b/.test(t)) return "mistake_correction";
  return "other";
}

export function emptyFingerprint(): CreativeFingerprintV2 {
  return {
    version: CREATIVE_CORE_V2_FINGERPRINT_VERSION,
    pain_key: "",
    topic_key: "",
    scenario_key: "",
    pov_key: "other",
    opening_mechanism: "other",
    narrative_mechanism: "other",
    setting_key: "",
    visual_motif_key: "",
    prop_keys: [],
    emotional_arc_key: "",
    conflict_key: "",
    reveal_key: "",
    payoff_key: "",
    cta_mechanism: "other",
  };
}

export function computeCreativeFingerprint(input: {
  pain_point?: string | null;
  topic?: string | null;
  angle?: string | null;
  hook?: string | null;
  setting?: string | null;
  props?: string | null;
  visual?: string | null;
  emotion?: string | null;
  conflict?: string | null;
  reveal?: string | null;
  payoff?: string | null;
  cta?: string | null;
  narrative?: string | null;
}): CreativeFingerprintV2 {
  const situation = [
    input.topic ?? "",
    input.angle ?? "",
    input.conflict ?? "",
    input.reveal ?? "",
  ].join(" ");
  const visualBlob = [input.setting ?? "", input.props ?? "", input.visual ?? ""].join(
    " ",
  );
  const propTokens = significantTokens(input.props ?? visualBlob).slice(0, 4);
  const situationMechanism = classifySituationMechanism(situation);
  const scenarioKey =
    situationMechanism !== "other"
      ? situationMechanism
      : keyFromText(situation, 10);
  return {
    version: CREATIVE_CORE_V2_FINGERPRINT_VERSION,
    pain_key: keyFromText(input.pain_point ?? "", 6),
    topic_key: keyFromText(input.topic ?? "", 8),
    scenario_key: scenarioKey,
    pov_key: classifyPovKey(situation),
    opening_mechanism: classifyOpeningMechanism(input.hook ?? ""),
    narrative_mechanism:
      (input.narrative ?? "").trim() ||
      classifyNarrativeMechanism(situation),
    setting_key: keyFromText(input.setting ?? "", 6),
    visual_motif_key: keyFromText(visualBlob, 8),
    prop_keys: propTokens,
    emotional_arc_key: keyFromText(input.emotion ?? "", 5),
    conflict_key: keyFromText(input.conflict ?? "", 6),
    reveal_key: keyFromText(input.reveal ?? "", 6),
    payoff_key: keyFromText(input.payoff ?? "", 6),
    cta_mechanism: classifyCtaMechanism(input.cta ?? ""),
  };
}

export function fingerprintFromStrategyCandidate(
  candidate: Pick<
    StrategyCandidateV2,
    "topic" | "angle" | "pain_point" | "creative_fingerprint"
  >,
): CreativeFingerprintV2 {
  if (candidate.creative_fingerprint?.version === CREATIVE_CORE_V2_FINGERPRINT_VERSION) {
    return candidate.creative_fingerprint;
  }
  return computeCreativeFingerprint({
    pain_point: candidate.pain_point,
    topic: candidate.topic,
    angle: candidate.angle,
  });
}

export function fingerprintFromCreativeCore(
  core: Pick<
    ContentCreativeCoreV2,
    | "core_idea"
    | "hook"
    | "main_emotion"
    | "conflict"
    | "reveal_or_surprise"
    | "payoff"
    | "cta_intent"
    | "scenes"
  > & { pain_point?: string | null },
): CreativeFingerprintV2 {
  const firstScene = core.scenes[0];
  const props = core.scenes
    .flatMap((s) => [s.subjects, s.environment])
    .join(" ");
  const visual = core.scenes.map((s) => s.visual_event).join(" ");
  return computeCreativeFingerprint({
    pain_point: core.pain_point ?? null,
    topic: core.core_idea,
    angle: core.conflict,
    hook: core.hook,
    setting: firstScene?.environment ?? "",
    props,
    visual,
    emotion: core.main_emotion,
    conflict: core.conflict,
    reveal: core.reveal_or_surprise,
    payoff: core.payoff,
    cta: core.cta_intent,
  });
}

export function fingerprintsStructurallyEqual(
  a: CreativeFingerprintV2,
  b: CreativeFingerprintV2,
): boolean {
  return (
    a.pain_key === b.pain_key &&
    a.scenario_key === b.scenario_key &&
    a.pov_key === b.pov_key &&
    a.conflict_key === b.conflict_key &&
    a.reveal_key === b.reveal_key &&
    a.payoff_key === b.payoff_key &&
    a.setting_key === b.setting_key &&
    a.visual_motif_key === b.visual_motif_key
  );
}
