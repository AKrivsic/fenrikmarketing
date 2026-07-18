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

/**
 * Tokens that cannot appear as readable content after image NO_TEXT sanitization.
 * Fidelity must not require literal labels / UI copy that diffusion cannot render.
 */
const NO_TEXT_IMPOSSIBLE_TOKENS = new Set([
  "cancelled",
  "canceled",
  "delayed",
  "boarding",
  "departed",
  "notification",
  "notifications",
  "checklist",
  "checklists",
  "caption",
  "captions",
  "subtitle",
  "subtitles",
  "headline",
  "headlines",
  "slogan",
  "slogans",
  "watermark",
  "watermarks",
  "typography",
  "font",
  "fonts",
  "letters",
  "letter",
  "words",
  "word",
  "readable",
  "label",
  "labels",
  "signage",
  "sign",
  "signs",
]);

/** Strip clauses that only assert readable text / UI copy (NO_TEXT policy). */
export function stripNoTextImpossibleClauses(text: string): string {
  return text
    .split(/[\n;,.]+/)
    .map((c) => c.trim())
    .filter((c) => {
      if (!c) return false;
      // Drop clauses that only demand readable text/labels/UI copy.
      if (
        /\b(readable\s+)?(text|words?|letters?|labels?|signs?|signage|captions?|subtitles?|typography|ui|notifications?)\b/i.test(
          c,
        ) &&
        !/\b(person|human|visitor|customer|board|counter|desk|door|phone|laptop|mascot)\b/i.test(
          c,
        )
      ) {
        return false;
      }
      return true;
    })
    .join(" ");
}

function significantTokens(text: string): string[] {
  return normalize(stripNoTextImpossibleClauses(text))
    .split(" ")
    .filter((w) => w.length > 3)
    .filter((w) => !NO_TEXT_IMPOSSIBLE_TOKENS.has(w));
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

/** Structural axes — subject / setting / action — visual intent, not readable labels. */
const SUBJECT_AXIS: Array<{ key: string; re: RegExp }> = [
  { key: "mascot", re: /\bmascot\b/i },
  { key: "accountant", re: /\baccountant|bookkeep|cpa\b/i },
  { key: "suitcase", re: /\bsuitcase|luggage|passport\b/i },
  { key: "technician", re: /\btechnician\b/i },
  { key: "van", re: /\bvan\b|\btruck\b/i },
  { key: "visitor_hands", re: /\bhands\b.*\b(typ|send|form)|customer'?s hands\b/i },
  { key: "queue", re: /\bqueue|boarding|ticket\b/i },
  { key: "fish", re: /\bfish\b/i },
  { key: "departure_board", re: /\bdeparture\s+board|flight\s+board|airport\s+board\b/i },
  { key: "visitor", re: /\b(visitor|customer|traveler|passenger)\b/i },
];

const SETTING_AXIS: Array<{ key: string; re: RegExp }> = [
  { key: "parking", re: /\bparking lot|parking\b/i },
  { key: "cowork", re: /\bco-?working|bright co-working|open[- ]plan office\b/i },
  { key: "lobby", re: /\blobby|storefront|service counter\b/i },
  { key: "home_office", re: /\bhome office|practice desk|practice door\b/i },
  { key: "driveway", re: /\bdriveway\b/i },
  { key: "airplane", re: /\bairplane|mid-flight|boarding pass\b/i },
  { key: "airport", re: /\bairport|terminal|departure\s+hall|gate\s+area\b/i },
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
  // Visual intent for cancelled/delayed boards — red panels / blank rows, not literal "CANCELLED"
  {
    key: "board_failure",
    re: /\b(red\s+(panel|row|status)|blank\s+(row|panel)|all\s+(flights?\s+)?(gone|missing)|empty\s+board|scrambled\s+board|failed\s+board)\b/i,
  },
  { key: "waiting", re: /\bwait(ing)?\b/i },
  { key: "leaving", re: /\b(walk(ing)?\s+away|leav(e|ing)|abandon)\b/i },
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
 * Map opening-situation phrasing that depends on readable labels onto visual
 * intent axes that survive NO_TEXT sanitization.
 */
function visualIntentText(openingSituation: string): string {
  let t = stripNoTextImpossibleClauses(openingSituation);
  // "departure board showing CANCELLED" → treat as board_failure intent
  if (
    /\bdeparture\s+board\b/i.test(t) &&
    /\b(cancelled|canceled|delayed|red|blank|empty)\b/i.test(openingSituation)
  ) {
    t = `${t} red panel blank row failed board`;
  }
  return t;
}

/**
 * Winner core situation must appear in scene 1 with matching subject + setting/action.
 * Token overlap alone is not enough (mascot buried in a co-working opener fails).
 * Does NOT require literal readable labels removed by the image NO_TEXT policy.
 */
export function openingSituationFaithfulToScene1(
  openingSituation: string,
  scene1: string,
): { ok: boolean; reason: string | null } {
  if (!scene1.trim()) {
    return { ok: false, reason: "scene1_empty" };
  }

  const winVisual = visualIntentText(openingSituation);
  const sceneVisual = stripNoTextImpossibleClauses(scene1);

  const winSubjects = axisKeys(SUBJECT_AXIS, winVisual);
  const sceneSubjects = axisKeys(SUBJECT_AXIS, sceneVisual);
  const winSettings = axisKeys(SETTING_AXIS, winVisual);
  const winActions = axisKeys(ACTION_AXIS, winVisual);
  const sceneActions = axisKeys(ACTION_AXIS, sceneVisual);
  const scenePrimarySetting = primarySetting(sceneVisual);
  const winPrimarySetting = primarySetting(winVisual);

  // Main subject must appear in the opening frame (first ~220 chars), not only later.
  const head = sceneVisual.slice(0, Math.min(220, sceneVisual.length));
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
    // airport vs airplane are compatible for departure-board concepts
    const airportFamily = new Set(["airport", "airplane"]);
    if (
      !(
        airportFamily.has(winPrimarySetting) &&
        airportFamily.has(scenePrimarySetting)
      )
    ) {
      return {
        ok: false,
        reason: `setting_mismatch:${winPrimarySetting}_vs_${scenePrimarySetting}`,
      };
    }
  }

  if (winSettings.length > 0 && scenePrimarySetting) {
    const airportFamily = ["airport", "airplane"];
    const okFamily =
      airportFamily.includes(scenePrimarySetting) &&
      winSettings.some((s) => airportFamily.includes(s));
    if (!winSettings.includes(scenePrimarySetting) && !okFamily) {
      return {
        ok: false,
        reason: `setting_not_in_winner:${scenePrimarySetting}`,
      };
    }
  }

  const actionOverlap = winActions.filter((a) => sceneActions.includes(a));
  const subjectOverlap = winSubjects.filter((s) => sceneSubjects.includes(s));

  // board_failure on winner can be satisfied by departure_board subject still present
  // even if scene prompt only shows the board without "CANCELLED" text.
  const boardIntentOk =
    winActions.includes("board_failure") &&
    (sceneSubjects.includes("departure_board") ||
      sceneActions.includes("board_failure") ||
      /\bdeparture\s+board\b/i.test(sceneVisual));

  if (winSubjects.length > 0 && subjectOverlap.length === 0) {
    return { ok: false, reason: "subject_mismatch" };
  }

  if (
    winActions.length > 0 &&
    actionOverlap.length === 0 &&
    !boardIntentOk &&
    !sharesTokens(winVisual, sceneVisual, 5)
  ) {
    return { ok: false, reason: "action_mismatch" };
  }

  // Strong lexical overlap on the situation body (not just shared filler words)
  // — ignore NO_TEXT-impossible tokens so "CANCELLED" absence is not a failure.
  const winToks = significantTokens(winVisual).filter(
    (w) =>
      !["with", "while", "from", "that", "this", "their", "into", "over"].includes(w),
  );
  const headToks = new Set(significantTokens(head));
  const headHits = winToks.filter((w) => headToks.has(w)).length;
  if (headHits < 2 && subjectOverlap.length === 0 && !boardIntentOk) {
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
    "Image NO_TEXT policy: do NOT require readable labels, signs, or UI copy in scene 1.",
    "Match VISUAL INTENT (subject, place, action, emotion) — e.g. a departure board with red/blank rows is enough; literal 'CANCELLED' text is forbidden in images.",
  ].join("\n");
}
