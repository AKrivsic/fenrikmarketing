import {
  matchesEssayCadence,
  matchesGenericHookOpener,
  matchesGenericConcept,
} from "@/lib/creative-candidates/genericity";
import { extractTopicConcreteSignals } from "@/lib/creative-candidates/topicSignals";
import type {
  ConceptFidelityResult,
  CreativeCandidate,
  FidelityRuleDiagnostic,
} from "@/lib/creative-candidates/types";

/** Cosmetic prefixes that must not drive semantic matching. */
const COSMETIC_OPENING_PREFIXES = [
  /^handheld\s+urgency:\s*/i,
  /^macro\s+on:\s*/i,
  /^camera\s+holds\s+one\s+beat[^:]*:\s*/i,
];

const STYLE_BOILERPLATE_RES: readonly RegExp[] = [
  /^photorealistic\s+photographic\s+image\.?\s*/i,
  /^clean\s+flat\s+illustration[^.]{0,80}\.?\s*/i,
  /^soft\s+polished\s+3d\s+render[^.]{0,80}\.?\s*/i,
  /^portrait\s+9:16\s+vertical[^.]*\.?\s*/i,
  /^not\s+photorealistic\.?\s*/i,
  /^simplified\s+shapes[^.]{0,40}\.?\s*/i,
  /^soft\s+gradients[^.]{0,40}\.?\s*/i,
];

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

export function normalizeFidelityText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip clauses that only assert readable text / UI copy (NO_TEXT policy). */
export function stripNoTextImpossibleClauses(text: string): string {
  return text
    .split(/[\n;,.]+/)
    .map((c) => c.trim())
    .filter((c) => {
      if (!c) return false;
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

/** Remove cosmetic camera prefixes from candidate openings before matching. */
export function stripCosmeticOpeningPrefixes(text: string): string {
  let t = text.trim();
  for (const re of COSMETIC_OPENING_PREFIXES) {
    t = t.replace(re, "");
  }
  return t.trim();
}

/**
 * Strip known visual-style boilerplate so subject/action matching is not
 * blocked by long prompt prefixes (9:16, lighting, palette, etc.).
 */
export function stripVisualStyleBoilerplate(text: string): string {
  let t = text.trim();
  for (let i = 0; i < 6; i++) {
    let changed = false;
    for (const re of STYLE_BOILERPLATE_RES) {
      const next = t.replace(re, "").trim();
      if (next !== t) {
        t = next;
        changed = true;
      }
    }
    // Drop leading comma-separated style adjectives before the first subject cue.
    const styleHead = t.match(
      /^((?:[a-z][\w-]*\s+){0,12}(?:palette|daylight|composition|headroom|mood|lighting|backdrop|tones?)[,.]?\s*)+/i,
    );
    if (styleHead && styleHead[0].length < 180) {
      const after = t.slice(styleHead[0].length).trim();
      if (after.length > 20) {
        t = after;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return t;
}

function significantTokens(text: string): string[] {
  return normalizeFidelityText(stripNoTextImpossibleClauses(text))
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
  // Narrow hands alias: human hands operating a device / form (person|customer|visitor).
  {
    key: "visitor_hands",
    re: /\b((visitor|customer|person|someone)'?s\s+)?hands\b.*\b(typ|send|sent|form|phone|smartphone|message|chat|keyboard)|((visitor|customer|person)'?s\s+hands)\b|\bhands\b.*\b(smartphone|phone|contact\s+form|messaging)\b/i,
  },
  { key: "queue", re: /\bqueue|boarding|ticket\b/i },
  { key: "fish", re: /\bfish\b/i },
  {
    key: "departure_board",
    re: /\bdeparture[\s-]+board|flight[\s-]+board|airport[\s-]+board\b/i,
  },
  { key: "visitor", re: /\b(visitor|customer|traveler|passenger|person)\b/i },
];

const SETTING_AXIS: Array<{ key: string; re: RegExp }> = [
  { key: "parking", re: /\bparking lot|parking\b/i },
  { key: "cowork", re: /\bco-?working|bright co-working|open[- ]plan office\b/i },
  { key: "lobby", re: /\blobby|storefront|service counter\b/i },
  { key: "home_office", re: /\bhome office|practice desk|practice door\b/i },
  { key: "driveway", re: /\bdriveway\b/i },
  { key: "airplane", re: /\bairplane|mid-flight|boarding pass\b/i },
  { key: "airport", re: /\bairport|terminal|departure\s+hall|gate\s+area\b/i },
  { key: "street", re: /\bstreet|porch|sidewalk|urban\s+street\b/i },
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
  { key: "abandon_form", re: /\babandon|incomplete|zero contact|contact\s+form\b/i },
  {
    key: "board_failure",
    re: /\b(red\s+(panel|row|status)|blank\s+(row|panel)|all\s+(flights?\s+)?(gone|missing)|empty\s+board|scrambled\s+board|failed\s+board|amber\s+status|frozen|stalled|unresolved)\b/i,
  },
  { key: "waiting", re: /\bwait(ing)?\b/i },
  { key: "leaving", re: /\b(walk(ing)?\s+away|leav(e|ing)|abandon)\b/i },
  {
    key: "unread_message",
    re: /\b(unanswered|no\s+reply|empty\s+waiting|read\s+receipt|seen\s+state|messaging\s+interface|chat\s+widget)\b/i,
  },
];

function axisKeys(
  classes: Array<{ key: string; re: RegExp }>,
  text: string,
): string[] {
  return classes.filter((c) => c.re.test(text)).map((c) => c.key);
}

function primarySetting(text: string): string | null {
  const head = text.slice(0, Math.min(320, text.length));
  for (const c of SETTING_AXIS) {
    if (c.re.test(head)) return c.key;
  }
  const all = axisKeys(SETTING_AXIS, text);
  return all[0] ?? null;
}

function visualIntentText(openingSituation: string): string {
  let t = stripCosmeticOpeningPrefixes(openingSituation);
  t = stripNoTextImpossibleClauses(t);
  // Map readable-label openings onto visual-intent actions.
  if (
    /\bdeparture[\s-]+board\b/i.test(t) &&
    /\b(cancelled|canceled|delayed|red|blank|empty|amber|frozen)\b/i.test(
      openingSituation,
    )
  ) {
    t = `${t} red panel blank row failed board amber status`;
  }
  if (/\b(seen|"seen"|read receipt)\b/i.test(openingSituation)) {
    t = `${t} unanswered message read receipt chat widget`;
  }
  return t;
}

/**
 * Winner core situation must appear in scene 1 with matching subject + setting/action.
 * Does NOT require literal readable labels removed by the image NO_TEXT policy.
 */
export function openingSituationFaithfulToScene1(
  openingSituation: string,
  scene1: string,
): { ok: boolean; reason: string | null; matchedAliases?: string[] } {
  if (!scene1.trim()) {
    return { ok: false, reason: "scene1_empty" };
  }

  const winVisual = visualIntentText(openingSituation);
  const sceneClean = stripVisualStyleBoilerplate(
    stripNoTextImpossibleClauses(scene1),
  );
  const matchedAliases: string[] = [];

  const winSubjects = axisKeys(SUBJECT_AXIS, winVisual);
  const sceneSubjects = axisKeys(SUBJECT_AXIS, sceneClean);
  const winSettings = axisKeys(SETTING_AXIS, winVisual);
  const winActions = axisKeys(ACTION_AXIS, winVisual);
  const sceneActions = axisKeys(ACTION_AXIS, sceneClean);
  const scenePrimarySetting = primarySetting(sceneClean);
  const winPrimarySetting = primarySetting(winVisual);

  // Subject must appear in the cleaned scene subject window (not raw style head).
  const subjectWindow = sceneClean.slice(0, Math.min(400, sceneClean.length));
  if (winSubjects.length > 0) {
    const subjectInWindow = winSubjects.some((s) => {
      const re = SUBJECT_AXIS.find((c) => c.key === s)?.re;
      const hit = re ? re.test(subjectWindow) : false;
      if (hit) matchedAliases.push(s);
      return hit;
    });
    if (!subjectInWindow) {
      // Hands family: accept person/customer/visitor hands synonymy on device.
      if (
        winSubjects.includes("visitor_hands") &&
        /\bhands\b/i.test(subjectWindow) &&
        /\b(phone|smartphone|form|keyboard|message|chat)\b/i.test(sceneClean)
      ) {
        matchedAliases.push("visitor_hands_device_alias");
      } else {
        return {
          ok: false,
          reason: "main_subject_missing_from_scene1_opening_frame",
          matchedAliases,
        };
      }
    }
  }

  if (winPrimarySetting && scenePrimarySetting && winPrimarySetting !== scenePrimarySetting) {
    const airportFamily = new Set(["airport", "airplane"]);
    if (
      !(
        airportFamily.has(winPrimarySetting) &&
        airportFamily.has(scenePrimarySetting)
      )
    ) {
      // Street vs unspecified is soft when hands/device subject matched.
      if (
        !(
          matchedAliases.some((a) => a.startsWith("visitor_hands")) &&
          (winPrimarySetting === "street" || scenePrimarySetting === "street")
        )
      ) {
        return {
          ok: false,
          reason: `setting_mismatch:${winPrimarySetting}_vs_${scenePrimarySetting}`,
          matchedAliases,
        };
      }
    }
  }

  if (winSettings.length > 0 && scenePrimarySetting) {
    const airportFamily = ["airport", "airplane"];
    const okFamily =
      airportFamily.includes(scenePrimarySetting) &&
      winSettings.some((s) => airportFamily.includes(s));
    if (!winSettings.includes(scenePrimarySetting) && !okFamily) {
      if (
        !matchedAliases.some((a) => a.startsWith("visitor_hands")) ||
        !["street", "home_office", "lobby"].includes(scenePrimarySetting)
      ) {
        // Only fail hard when scene setting actively contradicts and subject failed soft path
      }
    }
  }

  const actionOverlap = winActions.filter((a) => sceneActions.includes(a));
  const subjectOverlap = winSubjects.filter((s) => sceneSubjects.includes(s));

  const boardIntentOk =
    winActions.includes("board_failure") &&
    (sceneSubjects.includes("departure_board") ||
      sceneActions.includes("board_failure") ||
      /\bdeparture[\s-]+board\b/i.test(sceneClean));

  if (
    winSubjects.length > 0 &&
    subjectOverlap.length === 0 &&
    !matchedAliases.some((a) => a.startsWith("visitor_hands"))
  ) {
    // departure_board on winner vs scene with hyphen already covered by axis
    if (
      winSubjects.includes("departure_board") &&
      /\bdeparture[\s-]+board\b/i.test(sceneClean)
    ) {
      matchedAliases.push("departure_board_hyphen_alias");
    } else {
      return { ok: false, reason: "subject_mismatch", matchedAliases };
    }
  }

  if (
    winActions.length > 0 &&
    actionOverlap.length === 0 &&
    !boardIntentOk &&
    !sceneActions.includes("unread_message") &&
    !sharesTokens(winVisual, sceneClean, 5)
  ) {
    return { ok: false, reason: "action_mismatch", matchedAliases };
  }

  const winToks = significantTokens(winVisual).filter(
    (w) =>
      !["with", "while", "from", "that", "this", "their", "into", "over"].includes(
        w,
      ),
  );
  const headToks = new Set(significantTokens(subjectWindow));
  const headHits = winToks.filter((w) => headToks.has(w)).length;
  if (
    headHits < 2 &&
    subjectOverlap.length === 0 &&
    matchedAliases.length === 0 &&
    !boardIntentOk
  ) {
    return {
      ok: false,
      reason: "insufficient_situation_overlap_in_opening_frame",
      matchedAliases,
    };
  }

  return { ok: true, reason: null, matchedAliases };
}

/**
 * Affirmative generic-office collapse: office/desk/laptop scene that lacks the
 * winner's specific subject/action — not merely "opening match failed".
 */
export function isAffirmativeGenericOfficeCollapse(
  openingSituation: string,
  scene1: string,
): boolean {
  const scene = stripVisualStyleBoilerplate(scene1);
  const genericHit = Boolean(matchesGenericConcept(scene));
  const officey =
    /\b(laptop|desk|office|co-?working|meeting\s+room)\b/i.test(scene) &&
    !/\b(departure[\s-]+board|mascot|contact\s+form|smartphone|chat\s+widget|visitor'?s\s+hands|customer'?s\s+hands)\b/i.test(
      scene,
    );
  if (!genericHit && !officey) return false;

  const winVisual = visualIntentText(openingSituation);
  const winSubjects = axisKeys(SUBJECT_AXIS, winVisual).filter(
    (s) => s !== "visitor",
  ); // "person/customer" alone is too weak to disprove collapse
  const winActions = axisKeys(ACTION_AXIS, winVisual);
  const sceneSubjects = axisKeys(SUBJECT_AXIS, scene);
  const sceneActions = axisKeys(ACTION_AXIS, scene);
  const subjectOverlap = winSubjects.filter((s) => sceneSubjects.includes(s));
  const actionOverlap = winActions.filter((a) => sceneActions.includes(a));

  // If the candidate-specific subject/action is still present, this is not collapse.
  if (subjectOverlap.length > 0 || actionOverlap.length > 0) return false;
  if (
    winSubjects.includes("departure_board") &&
    /\bdeparture[\s-]+board\b/i.test(scene)
  ) {
    return false;
  }
  if (
    winSubjects.includes("visitor_hands") &&
    /\bhands\b/i.test(scene) &&
    /\b(phone|form|chat)\b/i.test(scene)
  ) {
    return false;
  }

  return true;
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
  const diagnostics: FidelityRuleDiagnostic[] = [];
  const scene1 = scene1Text(args);
  const spoken = firstSpoken(args.voiceoverText);
  const allVisual = [scene1, ...(args.imagePrompts ?? [])].join(" \n ");
  const openingForMatch = stripCosmeticOpeningPrefixes(
    args.winner.openingSituation,
  );

  const faithful = openingSituationFaithfulToScene1(openingForMatch, scene1);
  const openingSituationVisibleInScene1 = faithful.ok;
  diagnostics.push({
    rule: "opening_situation_visible_in_scene1",
    passed: faithful.ok,
    candidateValue: openingForMatch.slice(0, 200),
    generatedValue: stripVisualStyleBoilerplate(scene1).slice(0, 220),
    matchedAliases: faithful.matchedAliases ?? [],
    reason: faithful.reason,
  });
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
    normalizeFidelityText(spoken).includes(
      normalizeFidelityText(args.winner.hookLine).slice(0, 24),
    );
  diagnostics.push({
    rule: "hook_preserved_in_first_spoken",
    passed: hookPreservedInFirstSpoken,
    candidateValue: args.winner.hookLine.slice(0, 120),
    generatedValue: spoken.slice(0, 120),
    matchedAliases: [],
    reason: hookPreservedInFirstSpoken ? null : "hook_token_mismatch",
  });
  if (!hookPreservedInFirstSpoken) {
    failureReasons.push("hook_not_preserved_in_first_spoken");
  }

  const coreIdeaRecognizable =
    sharesTokens(args.winner.coreIdea, `${args.voiceoverText} ${allVisual}`, 3) ||
    faithful.ok;
  diagnostics.push({
    rule: "core_idea_recognizable",
    passed: coreIdeaRecognizable,
    candidateValue: args.winner.coreIdea.slice(0, 160),
    generatedValue: args.voiceoverText.slice(0, 160),
    matchedAliases: [],
    reason: coreIdeaRecognizable ? null : "core_idea_tokens_missing",
  });
  if (!coreIdeaRecognizable) {
    failureReasons.push("core_idea_not_recognizable");
  }

  const signals = extractTopicConcreteSignals(args.topic, args.angle);
  const topicBlob = `${args.voiceoverText} ${allVisual}`.toLowerCase();
  const productOrTopicImplied =
    signals.rawTokens.some((t) => topicBlob.includes(t.toLowerCase())) ||
    signals.topicAnchors.some((t) => topicBlob.includes(t.toLowerCase())) ||
    sharesTokens(args.winner.productConnection, args.voiceoverText, 2);
  diagnostics.push({
    rule: "product_or_topic_implied",
    passed: productOrTopicImplied,
    candidateValue: args.winner.productConnection.slice(0, 120),
    generatedValue: args.voiceoverText.slice(0, 120),
    matchedAliases: signals.topicAnchors.slice(0, 6),
    reason: productOrTopicImplied ? null : "topic_signals_missing",
  });
  if (!productOrTopicImplied) {
    failureReasons.push("product_or_topic_not_implied");
  }

  const collapsedToGenericOffice = isAffirmativeGenericOfficeCollapse(
    openingForMatch,
    scene1,
  );
  diagnostics.push({
    rule: "storyboard_collapsed_to_generic_office",
    passed: !collapsedToGenericOffice,
    candidateValue: openingForMatch.slice(0, 120),
    generatedValue: scene1.slice(0, 160),
    matchedAliases: [],
    reason: collapsedToGenericOffice ? "affirmative_generic_office" : null,
  });
  if (collapsedToGenericOffice) {
    failureReasons.push("storyboard_collapsed_to_generic_office");
  }

  // FID-1: opening EVENT / action meaning — not mere token overlap.
  const winActions = axisKeys(ACTION_AXIS, visualIntentText(openingForMatch));
  const sceneActions = axisKeys(
    ACTION_AXIS,
    stripVisualStyleBoilerplate(stripNoTextImpossibleClauses(scene1)),
  );
  const openingEventPreservedInScene1 =
    winActions.length === 0
      ? faithful.ok // stillness-with-meaning: subject/setting fidelity is enough
      : winActions.some((a) => sceneActions.includes(a)) || faithful.ok;
  diagnostics.push({
    rule: "opening_event_preserved_in_scene1",
    passed: openingEventPreservedInScene1,
    candidateValue: winActions.join(",") || "(no_action_axis)",
    generatedValue: sceneActions.join(",") || scene1.slice(0, 120),
    matchedAliases: winActions.filter((a) => sceneActions.includes(a)),
    reason: openingEventPreservedInScene1
      ? null
      : "opening_event_actions_missing_from_scene1",
  });
  if (!openingEventPreservedInScene1) {
    failureReasons.push("opening_event_missing_from_scene1");
  }

  const stopScrollIdeaPreserved =
    hookPreservedInFirstSpoken &&
    (openingSituationVisibleInScene1 || openingEventPreservedInScene1);
  diagnostics.push({
    rule: "stop_scroll_idea_preserved",
    passed: stopScrollIdeaPreserved,
    candidateValue: args.winner.hookLine.slice(0, 120),
    generatedValue: `${spoken.slice(0, 80)} | ${scene1.slice(0, 80)}`,
    matchedAliases: [],
    reason: stopScrollIdeaPreserved
      ? null
      : "stop_scroll_idea_diluted_or_relocated",
  });
  if (!stopScrollIdeaPreserved) {
    failureReasons.push("stop_scroll_idea_not_preserved");
  }

  const salesPitchOpening = isSalesPitchOpening(spoken);
  diagnostics.push({
    rule: "sales_pitch_opening",
    passed: !salesPitchOpening,
    candidateValue: args.winner.hookLine.slice(0, 80),
    generatedValue: spoken.slice(0, 80),
    matchedAliases: [],
    reason: salesPitchOpening ? "sales_cta_pricing_in_first_spoken" : null,
  });
  if (salesPitchOpening) {
    failureReasons.push("sales_pitch_opening");
  }

  const voiceoverEssayCadence =
    Boolean(matchesEssayCadence(args.voiceoverText)) ||
    Boolean(matchesGenericHookOpener(spoken));
  diagnostics.push({
    rule: "voiceover_essay_or_generic_opener",
    passed: !voiceoverEssayCadence,
    candidateValue: args.winner.hookLine.slice(0, 80),
    generatedValue: spoken.slice(0, 80),
    matchedAliases: [],
    reason: voiceoverEssayCadence ? "essay_or_generic_opener" : null,
  });
  if (voiceoverEssayCadence) {
    failureReasons.push("voiceover_essay_or_generic_opener");
  }

  return {
    passed: failureReasons.length === 0,
    openingSituationVisibleInScene1,
    openingEventPreservedInScene1,
    stopScrollIdeaPreserved,
    hookPreservedInFirstSpoken,
    coreIdeaRecognizable,
    productOrTopicImplied,
    collapsedToGenericOffice,
    voiceoverEssayCadence,
    salesPitchOpening,
    failureReasons,
    diagnostics,
  };
}

function isSalesPitchOpening(spoken: string): boolean {
  return /\b(buy\s+now|sign\s+up(\s+now)?|book\s+now|book\s+a\s+demo|learn\s+more|limited\s+offer|%\s*off|discount|free\s+trial|subscribe\s+today|call\s+now|click\s+(here|below)|shop\s+now|get\s+started\s+today)\b/i.test(
    spoken,
  );
}

/**
 * After deterministic fixes (hook enforce, validator normalization), decide
 * whether remaining failures still warrant a full Claude package regeneration.
 */
export function classifyFidelityFailuresForRepair(
  fidelity: ConceptFidelityResult,
): {
  material: boolean;
  materialReasons: string[];
  deterministicReasons: string[];
} {
  const materialReasons: string[] = [];
  const deterministicReasons: string[] = [];
  for (const reason of fidelity.failureReasons) {
    if (reason === "hook_not_preserved_in_first_spoken") {
      materialReasons.push(reason);
      continue;
    }
    if (
      reason.startsWith("opening_situation_missing_from_scene1:") ||
      reason === "opening_event_missing_from_scene1" ||
      reason === "stop_scroll_idea_not_preserved"
    ) {
      materialReasons.push(reason);
      continue;
    }
    if (
      reason === "storyboard_collapsed_to_generic_office" ||
      reason === "core_idea_not_recognizable" ||
      reason === "product_or_topic_not_implied" ||
      reason === "voiceover_essay_or_generic_opener" ||
      reason === "sales_pitch_opening"
    ) {
      materialReasons.push(reason);
      continue;
    }
    deterministicReasons.push(reason);
  }
  return {
    material: materialReasons.length > 0,
    materialReasons,
    deterministicReasons,
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
    `SELECTED openingSituation (must be scene 1 — same subject, setting, and action in the OPENING FRAME): ${stripCosmeticOpeningPrefixes(winner.openingSituation)}`,
    `SELECTED coreIdea: ${winner.coreIdea}`,
    `SELECTED storyProgression: ${winner.storyProgression}`,
    `SELECTED productConnection: ${winner.productConnection}`,
    `SELECTED ending: ${winner.ending}`,
    "Preserve the opening EVENT and stop-scroll idea — not a safer paraphrase.",
    "Validate visual meaning: main subject, setting, and action/stakes must match the winner in scene 1.",
    "Do NOT replace the opening with interchangeable stock staging unless that IS the selected openingSituation.",
    "Token-overlap alone is insufficient — main subject and setting must match the winner in the first beat of scene 1.",
    "Do NOT open with generic essay cadence or sales/CTA/pricing as the first spoken meaning unit.",
    "Product may appear in the opening when it is part of the hook situation; sales pitch is forbidden.",
    "Image NO_TEXT policy: do NOT require readable labels, signs, or UI copy in scene 1.",
    "Match VISUAL INTENT (subject, place, action, emotion) — visual state is enough; literal labels are forbidden in images.",
  ].join("\n");
}
