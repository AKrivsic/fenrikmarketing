import {
  matchesEssayCadence,
  matchesGenericHookOpener,
  matchesGenericConcept,
} from "@/lib/creative-candidates/genericity";
import { extractTopicConcreteSignals } from "@/lib/creative-candidates/topicSignals";
import type {
  ConceptFidelityResult,
  CreativeCandidate,
} from "@/lib/creative-candidates/types";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 3);
}

function sharesTokens(a: string, b: string, min = 3): boolean {
  const aw = new Set(significantTokens(a));
  const bw = significantTokens(b);
  let hits = 0;
  for (const w of bw) {
    if (aw.has(w)) hits++;
  }
  return hits >= min;
}

function firstSpoken(voiceover: string): string {
  const t = voiceover.trim();
  if (!t) return "";
  const m = t.match(/^[^.!?]+[.!?]?/);
  return (m?.[0] ?? t).trim();
}

function scene1Text(args: {
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
}): string {
  const scenes = args.visualScenes ?? [];
  if (scenes.length > 0) {
    const s0 = scenes[0];
    if (s0 && typeof s0 === "object" && !Array.isArray(s0)) {
      const r = s0 as Record<string, unknown>;
      if (typeof r.image_prompt === "string") return r.image_prompt;
    }
  }
  const prompts = args.imagePrompts ?? [];
  return typeof prompts[0] === "string" ? prompts[0] : "";
}

/** Structural axes — subject / setting / action — not raw token overlap. */
const SUBJECT_AXIS: Array<{ key: string; re: RegExp }> = [
  { key: "mascot", re: /\bmascot\b/i },
  { key: "accountant", re: /\baccountant|bookkeep|cpa\b/i },
  { key: "suitcase", re: /\bsuitcase|luggage|passport\b/i },
  { key: "technician", re: /\btechnician\b/i },
  { key: "van", re: /\bvan\b|\btruck\b/i },
  { key: "visitor_hands", re: /\bhands\b.*\b(typ|send|form)|customer'?s hands\b/i },
  { key: "queue", re: /\bqueue|boarding|ticket\b/i },
  { key: "fish", re: /\bfish\b/i },
];

const SETTING_AXIS: Array<{ key: string; re: RegExp }> = [
  { key: "parking", re: /\bparking lot|parking\b/i },
  { key: "cowork", re: /\bco-?working|bright co-working|open[- ]plan office\b/i },
  { key: "lobby", re: /\blobby|storefront|service counter\b/i },
  { key: "home_office", re: /\bhome office|practice desk|practice door\b/i },
  { key: "driveway", re: /\bdriveway\b/i },
  { key: "airplane", re: /\bairplane|mid-flight|boarding pass\b/i },
  { key: "street", re: /\bstreet|porch|sidewalk\b/i },
  { key: "yard", re: /\byard\b/i },
  { key: "roof", re: /\broof\b/i },
];

const ACTION_AXIS: Array<{ key: string; re: RegExp }> = [
  { key: "melting", re: /\bmelt(ing)?\b/i },
  { key: "waving", re: /\bwav(e|es|ing)\b/i },
  { key: "fake_typing", re: /\btyping indicator|fake typing|no message sent\b/i },
  { key: "unpacking", re: /\bunpack|drops? a suitcase|suitcase by\b/i },
  { key: "sprinting", re: /\bsprint\b/i },
  { key: "refreshing", re: /\brefresh\b/i },
  { key: "abandon_form", re: /\babandon|incomplete|zero contact\b/i },
];

function axisKeys(
  classes: Array<{ key: string; re: RegExp }>,
  text: string,
): string[] {
  return classes.filter((c) => c.re.test(text)).map((c) => c.key);
}

function primarySetting(text: string): string | null {
  // Prefer the setting that appears earliest in the prompt (framing), not a late mention.
  const head = text.slice(0, Math.min(220, text.length));
  for (const c of SETTING_AXIS) {
    if (c.re.test(head)) return c.key;
  }
  const all = axisKeys(SETTING_AXIS, text);
  return all[0] ?? null;
}

/**
 * Winner core situation must appear in scene 1 with matching subject + setting/action.
 * Token overlap alone is not enough (mascot buried in a co-working opener fails).
 */
export function openingSituationFaithfulToScene1(
  openingSituation: string,
  scene1: string,
): { ok: boolean; reason: string | null } {
  if (!scene1.trim()) {
    return { ok: false, reason: "scene1_empty" };
  }

  const winSubjects = axisKeys(SUBJECT_AXIS, openingSituation);
  const sceneSubjects = axisKeys(SUBJECT_AXIS, scene1);
  const winSettings = axisKeys(SETTING_AXIS, openingSituation);
  const winActions = axisKeys(ACTION_AXIS, openingSituation);
  const sceneActions = axisKeys(ACTION_AXIS, scene1);
  const scenePrimarySetting = primarySetting(scene1);
  const winPrimarySetting = primarySetting(openingSituation);

  // Main subject must appear in the opening frame (first ~220 chars), not only later.
  const head = scene1.slice(0, Math.min(220, scene1.length));
  if (winSubjects.length > 0) {
    const subjectInHead = winSubjects.some((s) => {
      const re = SUBJECT_AXIS.find((c) => c.key === s)?.re;
      return re ? re.test(head) : false;
    });
    if (!subjectInHead) {
      return { ok: false, reason: "main_subject_missing_from_scene1_opening_frame" };
    }
  }

  if (winPrimarySetting && scenePrimarySetting && winPrimarySetting !== scenePrimarySetting) {
    return {
      ok: false,
      reason: `setting_mismatch:${winPrimarySetting}_vs_${scenePrimarySetting}`,
    };
  }

  if (winSettings.length > 0 && scenePrimarySetting) {
    if (!winSettings.includes(scenePrimarySetting)) {
      return {
        ok: false,
        reason: `setting_not_in_winner:${scenePrimarySetting}`,
      };
    }
  }

  const actionOverlap = winActions.filter((a) => sceneActions.includes(a));
  const subjectOverlap = winSubjects.filter((s) => sceneSubjects.includes(s));

  if (winSubjects.length > 0 && subjectOverlap.length === 0) {
    return { ok: false, reason: "subject_mismatch" };
  }

  if (winActions.length > 0 && actionOverlap.length === 0 && !sharesTokens(openingSituation, scene1, 5)) {
    return { ok: false, reason: "action_mismatch" };
  }

  // Strong lexical overlap on the situation body (not just shared filler words)
  const winToks = significantTokens(openingSituation).filter(
    (w) =>
      !["with", "while", "from", "that", "this", "their", "into", "over"].includes(w),
  );
  const headToks = new Set(significantTokens(head));
  const headHits = winToks.filter((w) => headToks.has(w)).length;
  if (headHits < 2 && subjectOverlap.length === 0) {
    return { ok: false, reason: "insufficient_situation_overlap_in_opening_frame" };
  }

  return { ok: true, reason: null };
}

export function checkConceptFidelity(args: {
  winner: CreativeCandidate;
  hook: string;
  voiceoverText: string;
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
  topic: string;
  angle?: string | null;
}): ConceptFidelityResult {
  const failureReasons: string[] = [];
  const scene1 = scene1Text(args);
  const spoken = firstSpoken(args.voiceoverText);
  const allVisual = [scene1, ...(args.imagePrompts ?? [])].join(" \n ");

  const faithful = openingSituationFaithfulToScene1(
    args.winner.openingSituation,
    scene1,
  );
  const openingSituationVisibleInScene1 = faithful.ok;
  if (!openingSituationVisibleInScene1) {
    failureReasons.push(
      faithful.reason
        ? `opening_situation_missing_from_scene1:${faithful.reason}`
        : "opening_situation_missing_from_scene1",
    );
  }

  const hookPreservedInFirstSpoken =
    sharesTokens(args.winner.hookLine, spoken, 3) ||
    sharesTokens(args.winner.hookLine, args.hook, 3) ||
    normalize(spoken).includes(normalize(args.winner.hookLine).slice(0, 24));
  if (!hookPreservedInFirstSpoken) {
    failureReasons.push("hook_not_preserved_in_first_spoken");
  }

  const coreIdeaRecognizable =
    sharesTokens(args.winner.coreIdea, `${args.voiceoverText} ${allVisual}`, 3) ||
    faithful.ok;
  if (!coreIdeaRecognizable) {
    failureReasons.push("core_idea_not_recognizable");
  }

  const signals = extractTopicConcreteSignals(args.topic, args.angle);
  const topicBlob = `${args.voiceoverText} ${allVisual}`.toLowerCase();
  const productOrTopicImplied =
    signals.rawTokens.some((t) => topicBlob.includes(t.toLowerCase())) ||
    sharesTokens(args.winner.productConnection, args.voiceoverText, 2);
  if (!productOrTopicImplied) {
    failureReasons.push("product_or_topic_not_implied");
  }

  const collapsedToGenericOffice =
    Boolean(matchesGenericConcept(scene1)) ||
    (/\b(laptop|desk|office|co-?working)\b/i.test(scene1) &&
      !openingSituationFaithfulToScene1(args.winner.openingSituation, scene1).ok);
  if (collapsedToGenericOffice) {
    failureReasons.push("storyboard_collapsed_to_generic_office");
  }

  const voiceoverEssayCadence =
    Boolean(matchesEssayCadence(args.voiceoverText)) ||
    Boolean(matchesGenericHookOpener(spoken));
  if (voiceoverEssayCadence) {
    failureReasons.push("voiceover_essay_or_generic_opener");
  }

  return {
    passed: failureReasons.length === 0,
    openingSituationVisibleInScene1,
    hookPreservedInFirstSpoken,
    coreIdeaRecognizable,
    productOrTopicImplied,
    collapsedToGenericOffice,
    voiceoverEssayCadence,
    failureReasons,
  };
}

export function fidelityRepairAppendix(
  winner: CreativeCandidate,
  fidelity: ConceptFidelityResult,
): string {
  return [
    "CREATIVE CANDIDATE FIDELITY REPAIR (mandatory — previous draft failed):",
    `Failure reasons: ${fidelity.failureReasons.join(", ")}`,
    "Regenerate hook, voiceover_text, video.script, and visual_scenes to MATCH the selected candidate exactly.",
    `SELECTED hookLine (must be first spoken): ${winner.hookLine}`,
    `SELECTED openingSituation (must be scene 1 — same subject, setting, and action in the OPENING FRAME): ${winner.openingSituation}`,
    `SELECTED coreIdea: ${winner.coreIdea}`,
    `SELECTED storyProgression: ${winner.storyProgression}`,
    `SELECTED productConnection: ${winner.productConnection}`,
    `SELECTED ending: ${winner.ending}`,
    "Do NOT replace the opening with co-working / laptop / office / phone-stare imagery unless that IS the selected openingSituation.",
    "Token-overlap alone is insufficient — main subject and setting must match the winner in the first beat of scene 1.",
    "Do NOT open with 'Most businesses…' or essay cadence.",
  ].join("\n");
}
