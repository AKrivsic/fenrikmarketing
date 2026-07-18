/**
 * Story Integrity — selected Creative Candidate is the source of truth for the
 * entire storyboard. Later stages may not invent a new visual world.
 *
 * Deterministic validation. Failures are hard (do not silently continue).
 */

import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import { normalizeCreativeDNA } from "@/lib/creative-candidates/creativeDNA";

export const STORY_INTEGRITY_VERSION = "story-integrity@1" as const;
export const STORY_INTEGRITY_PROMPT_HEADER = "STORY INTEGRITY";

export type StoryIntegrityViolationCode =
  | "main_conflict_disappeared"
  | "product_demonstration_missing"
  | "primary_actor_changed"
  | "location_changed_without_reason"
  | "abstract_metaphor_in_middle"
  | "cta_mismatch"
  | "world_abandoned";

export interface StoryIntegrityViolation {
  code: StoryIntegrityViolationCode;
  message: string;
  sceneIndex?: number;
  evidence?: string;
}

export interface ProductDemonstrationCheck {
  present: boolean;
  askPresent: boolean;
  answerPresent: boolean;
  resultPresent: boolean;
  landingPageOnly: boolean;
  evidence: string[];
}

export interface StoryIntegrityResult {
  passed: boolean;
  version: typeof STORY_INTEGRITY_VERSION;
  allowedWorldTokens: string[];
  productDemonstration: ProductDemonstrationCheck;
  ctaMatch: {
    packageCta: string;
    voiceoverContainsCta: boolean;
    evidence: string | null;
  };
  violations: StoryIntegrityViolation[];
  summary: string;
}

/** Abstract / unrelated worlds that are banned unless the selected concept uses them. */
const FORBIDDEN_WORLD_PATTERNS: Array<{
  id: string;
  re: RegExp;
  /** Tokens that authorize this pattern when present in the selected concept. */
  allowIfConceptHas: RegExp;
}> = [
  {
    id: "fog_silhouettes",
    re: /\b(silhouette|silhouettes|ghosted|translucent (human |visitor |figure)|featureless (human|figure|humanoid))\b/i,
    allowIfConceptHas: /\b(silhouette|ghosted|translucent figure)\b/i,
  },
  {
    id: "fog_atmosphere",
    re: /\b(dense fog|foggy street|thick fog|misty alley|engulfed in (fog|mist))\b/i,
    allowIfConceptHas: /\b(fog|mist)\b/i,
  },
  {
    id: "abstract_glow_bubble",
    re: /\b(glowing (chat |speech )?bubble|floating (speech |chat )?bubble|warm glowing bubble)\b/i,
    allowIfConceptHas: /\b(chat bubble|speech bubble|reply bubble|glowing bubble)\b/i,
  },
  {
    id: "mannequin_symbolic",
    re: /\b(mannequin|clay (render|figure)|symbolic figure|abstract humanoid|featureless mannequin)\b/i,
    allowIfConceptHas: /\b(mannequin|symbolic figure)\b/i,
  },
  {
    id: "airport_boarding",
    re: /\b(airport|boarding(-| )?(ticket|pass|group)|departure board|train-station style departure|terminal gate)\b/i,
    allowIfConceptHas:
      /\b(airport|boarding|departure board|ticket queue|boarding-ticket)\b/i,
  },
  {
    id: "outer_space",
    re: /\b(outer space|galaxy|cosmos|planet orbit|zero gravity)\b/i,
    allowIfConceptHas: /\b(space|galaxy|cosmos|orbit)\b/i,
  },
  {
    id: "analytics_montage",
    re: /\b(analytics dashboard|laptop analytics|website analytics montage|generic analytics)\b/i,
    allowIfConceptHas: /\b(analytics|dashboard)\b/i,
  },
  {
    id: "random_laptop_montage",
    re: /\b(laptop (and )?coffee|co-?working montage|modern office desk with laptop)\b/i,
    allowIfConceptHas: /\b(laptop|office desk|co-?working)\b/i,
  },
];

const ASK_RE =
  /\b(ask(s|ed|ing)?|question|typed|typing|send(s|ing|t)?|message|visitor|customer|booking|availability|chat thread|contact form)\b/i;

/** Explicit AI/product answering action — not merely naming the product. */
const ANSWER_RE =
  /\b((ai )?(chatbot|assistant) (replies|answers|responds|reply|answer)|website (answers|replies|responds)|reply (bubble|appears|arrives|from)|answers? (the |their |visitor|customer|question)|chat (replies|answers|responds|widget answers)|answered (chat|question|visitor)|confirms? (availability|booking)|availability (confirmed|for tomorrow))\b/i;

const RESULT_RE =
  /\b(stays?|books?|booked|lead|leads|answered|availability confirmed|captures? (a )?lead|gets? an answer|visitor (stays|converts|books)|ready to book)\b/i;

const LANDING_PAGE_RE =
  /\b(create an ai assistant|starting at \$?\d+|yourcompany\.com|landing page|hero (section|headline)|try the preview first|no registration required|see how it works)\b/i;

const PRODUCT_UI_FRAMING_RE =
  /\b(browser (window|chrome|mockup)|laptop (mockup|screen)|product ui|framed_laptop|component-capture)\b/i;

function isLandingPageScene(text: string): boolean {
  if (LANDING_PAGE_RE.test(text)) return true;
  // Framed product UI that only shows marketing hero copy — not a chat interaction.
  if (
    PRODUCT_UI_FRAMING_RE.test(text) &&
    /\b(create an ai|starting at|hero|marketing site|landing)\b/i.test(text)
  ) {
    return true;
  }
  return false;
}

const STOP = new Set([
  "that",
  "this",
  "with",
  "from",
  "while",
  "when",
  "their",
  "them",
  "into",
  "about",
  "through",
  "without",
  "being",
  "have",
  "does",
  "must",
  "show",
  "clearly",
  "handheld",
  "urgency",
  "during",
  "peak",
  "demand",
  "overload",
  "found",
  "five",
  "unread",
  "tuesday",
  "your",
  "youre",
  "they",
  "them",
  "then",
  "than",
  "also",
  "just",
  "only",
  "even",
  "next",
  "let",
]);

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
    .filter((w) => w.length > 3 && !STOP.has(w));
}

function tokenOverlap(a: string, b: string, min = 2): boolean {
  const aw = new Set(significantTokens(a));
  let hits = 0;
  for (const w of significantTokens(b)) {
    if (aw.has(w)) hits++;
  }
  return hits >= min;
}

function voiceoverContainsPackageCta(
  voiceoverText: string,
  packageCta: string,
): { ok: boolean; evidence: string | null } {
  const cta = packageCta.trim();
  if (!cta) {
    return { ok: true, evidence: "no_package_cta" };
  }
  const vo = voiceoverText.trim();
  if (!vo) {
    return { ok: false, evidence: "voiceover_empty" };
  }

  const imperativeCta =
    /\b(create|start|try|sign up|get|build|open|join)\b/i.test(cta);
  const sentences = vo.split(/(?<=[.!?])\s+/).filter(Boolean);
  const tail = sentences.slice(-2).join(" ");

  // Require CTA action nouns/verbs — not filler like "your" / "answer" alone.
  const ctaActionKeys = significantTokens(cta).filter((w) =>
    /create|assistant|website|closed|sign|preview|fenrik|chatbot|subscribe|book|lead|start|build/.test(
      w,
    ),
  );
  const voNorm = normalize(vo);
  const tailNorm = normalize(tail);
  const voHits = ctaActionKeys.filter((w) => voNorm.includes(w));
  const tailHits = ctaActionKeys.filter((w) => tailNorm.includes(w));

  if (tailHits.length >= 2 || voHits.length >= 3) {
    return {
      ok: true,
      evidence: `cta_action_hits:${(tailHits.length >= 2 ? tailHits : voHits).join(",")}`,
    };
  }

  // Imperative package CTAs must appear in the spoken close — soft poetic endings fail.
  if (imperativeCta) {
    return {
      ok: false,
      evidence: `spoken_cta_missing_for_package_cta:${cta.slice(0, 80)}`,
    };
  }

  if (tokenOverlap(cta, tail, 3) || tokenOverlap(cta, vo, 4)) {
    return { ok: true, evidence: "token_overlap" };
  }

  return { ok: false, evidence: "weak_cta_overlap" };
}

function scenePromptTexts(args: {
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
}): string[] {
  const fromScenes: string[] = [];
  for (const s of args.visualScenes ?? []) {
    if (!s || typeof s !== "object" || Array.isArray(s)) continue;
    const r = s as Record<string, unknown>;
    if (typeof r.image_prompt === "string" && r.image_prompt.trim()) {
      fromScenes.push(r.image_prompt);
      continue;
    }
    if (typeof r.used_as === "string" && r.used_as.trim()) {
      fromScenes.push(r.used_as);
    }
  }
  if (fromScenes.length > 0) return fromScenes;
  return (args.imagePrompts ?? []).filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
}

/**
 * Lexicon of the selected commercial world — later beats must stay inside this.
 */
export function deriveAllowedWorldTokens(winner: CreativeCandidate): string[] {
  const dna = normalizeCreativeDNA(winner.creativeDNA);
  const blob = [
    winner.openingSituation,
    winner.coreIdea,
    winner.storyProgression,
    winner.productConnection,
    winner.ending,
    winner.visualPromise,
    dna?.world,
    dna?.mainCharacter,
    dna?.coreConflict,
    dna?.productRole,
    dna?.endingIntent,
  ]
    .filter(Boolean)
    .join(" ");

  const base = new Set(significantTokens(blob));

  // Always allow product-demo vocabulary for commercial packages.
  for (const w of [
    "visitor",
    "customer",
    "website",
    "chat",
    "phone",
    "message",
    "question",
    "reply",
    "answer",
    "assistant",
    "chatbot",
    "booking",
    "lead",
    "waiting",
    "seen",
    "form",
  ]) {
    base.add(w);
  }

  return [...base].sort();
}

function conceptBlob(winner: CreativeCandidate): string {
  const dna = normalizeCreativeDNA(winner.creativeDNA);
  return [
    winner.openingSituation,
    winner.coreIdea,
    winner.storyProgression,
    winner.visualPromise,
    dna?.world ?? "",
    dna?.mainCharacter ?? "",
  ].join("\n");
}

function middleSceneIndexes(sceneCount: number): number[] {
  if (sceneCount <= 2) return [];
  // Exclude first (hook) and last (often CTA/product). Middle must stay in-world.
  const out: number[] = [];
  for (let i = 1; i < sceneCount - 1; i++) out.push(i);
  return out;
}

export function detectProductDemonstration(args: {
  sceneTexts: readonly string[];
  voiceoverText: string;
  winner: CreativeCandidate;
}): ProductDemonstrationCheck {
  const evidence: string[] = [];
  const scenes = args.sceneTexts;
  const vo = args.voiceoverText;
  const interactionScenes = scenes.filter((s) => !isLandingPageScene(s));
  const interactionVisual = interactionScenes.join("\n");

  const askPresent =
    ASK_RE.test(interactionVisual) ||
    ASK_RE.test(vo) ||
    ASK_RE.test(args.winner.openingSituation);
  if (askPresent) evidence.push("ask_signal");

  // Answer must appear as an interaction in a non-landing visual beat.
  const answerPresent = interactionScenes.some((s) => ANSWER_RE.test(s));
  if (answerPresent) evidence.push("answer_signal");

  const resultPresent =
    RESULT_RE.test(interactionVisual) ||
    RESULT_RE.test(vo) ||
    RESULT_RE.test(args.winner.ending);
  if (resultPresent) evidence.push("result_signal");

  const last = scenes[scenes.length - 1] ?? "";
  const lastIsLanding = isLandingPageScene(last);
  const landingPageOnly = lastIsLanding && !answerPresent;

  if (landingPageOnly) {
    evidence.push("landing_page_only");
  }

  const present =
    askPresent && answerPresent && resultPresent && !landingPageOnly;

  return {
    present,
    askPresent,
    answerPresent,
    resultPresent,
    landingPageOnly,
    evidence,
  };
}

/**
 * Hard Story Integrity check against generated package visuals + VO + CTA.
 */
export function validateStoryIntegrity(args: {
  winner: CreativeCandidate;
  voiceoverText: string;
  packageCta: string;
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
  hook?: string | null;
}): StoryIntegrityResult {
  const violations: StoryIntegrityViolation[] = [];
  const allowedWorldTokens = deriveAllowedWorldTokens(args.winner);
  const scenes = scenePromptTexts(args);
  const concept = conceptBlob(args.winner);
  const dna = normalizeCreativeDNA(args.winner.creativeDNA);
  const vo = args.voiceoverText ?? "";
  const allVisual = scenes.join("\n");
  const packageBlob = `${args.hook ?? ""}\n${vo}\n${allVisual}`;

  // --- abstract metaphors in middle beats ---
  for (const idx of middleSceneIndexes(scenes.length)) {
    const scene = scenes[idx] ?? "";
    for (const pattern of FORBIDDEN_WORLD_PATTERNS) {
      if (!pattern.re.test(scene)) continue;
      if (pattern.allowIfConceptHas.test(concept)) continue;
      // Allow glowing bubble only when the same scene stays in phone/chat/website world.
      if (
        pattern.id === "abstract_glow_bubble" &&
        /\b(phone|smartphone|chat|message|website|screen|reply thread)\b/i.test(
          scene,
        )
      ) {
        continue;
      }
      violations.push({
        code: "abstract_metaphor_in_middle",
        message: `Middle scene invents forbidden world pattern "${pattern.id}" not present in the selected concept`,
        sceneIndex: idx,
        evidence: scene.slice(0, 160),
      });
    }
  }

  // --- primary actor ---
  const actorSource =
    dna?.mainCharacter ||
    args.winner.openingSituation ||
    args.winner.coreIdea;
  const actorTokens = significantTokens(actorSource).filter((w) =>
    /hands|visitor|customer|mascot|technician|accountant|phone|chat|desk|pile|stack|neighbor|competitor|staff|boarding|fish|tank|suitcase/.test(
      w,
    ),
  );
  const actorCheck =
    actorTokens.length > 0
      ? actorTokens
      : significantTokens(actorSource).slice(0, 4);
  if (actorCheck.length > 0 && scenes.length > 0) {
    const openingHits = actorCheck.filter((t) =>
      normalize(scenes[0] ?? "").includes(t),
    );
    const anyLater = scenes
      .slice(1)
      .some((s) => actorCheck.some((t) => normalize(s).includes(t)));
    // Actor may leave the frame for a product UI close, but must not be replaced
    // by unrelated metaphorical figures in the middle.
    const middleHasActorOrProduct = middleSceneIndexes(scenes.length).every(
      (i) => {
        const s = scenes[i] ?? "";
        return (
          actorCheck.some((t) => normalize(s).includes(t)) ||
          PRODUCT_UI_FRAMING_RE.test(s) ||
          ASK_RE.test(s) ||
          ANSWER_RE.test(s) ||
          /\b(phone|smartphone|chat|website|message|reply|visitor|customer|hand)\b/i.test(
            s,
          )
        );
      },
    );
    if (openingHits.length === 0) {
      violations.push({
        code: "primary_actor_changed",
        message: "Primary actor from selected concept missing from opening scene",
        sceneIndex: 0,
        evidence: `expected one of: ${actorCheck.join(", ")}`,
      });
    } else if (!middleHasActorOrProduct && scenes.length >= 3) {
      violations.push({
        code: "primary_actor_changed",
        message:
          "Middle beats abandon the primary actor / product world for unrelated subjects",
        evidence: `actor tokens: ${actorCheck.join(", ")}`,
      });
    } else if (!anyLater && scenes.length >= 3 && !middleHasActorOrProduct) {
      violations.push({
        code: "primary_actor_changed",
        message: "Primary actor never reappears after the opening",
        evidence: actorCheck.join(", "),
      });
    }
  }

  // --- location change without reason ---
  const worldTokens = significantTokens(
    dna?.world || args.winner.openingSituation,
  ).slice(0, 10);
  for (const idx of middleSceneIndexes(scenes.length)) {
    const scene = scenes[idx] ?? "";
    const introducesForeign =
      FORBIDDEN_WORLD_PATTERNS.some(
        (p) => p.re.test(scene) && !p.allowIfConceptHas.test(concept),
      ) ||
      (/\b(airport|outer space|galaxy|co-?working montage)\b/i.test(scene) &&
        !tokenOverlap(concept, scene, 2));
    if (introducesForeign) {
      violations.push({
        code: "location_changed_without_reason",
        message:
          "Scene relocates to a setting not justified by the selected opening world",
        sceneIndex: idx,
        evidence: scene.slice(0, 140),
      });
    }
  }

  // --- main conflict ---
  const conflict = dna?.coreConflict || args.winner.coreIdea;
  const conflictPresent =
    tokenOverlap(conflict, packageBlob, 2) ||
    tokenOverlap(args.winner.openingSituation, vo, 2) ||
    ASK_RE.test(vo);
  if (!conflictPresent) {
    violations.push({
      code: "main_conflict_disappeared",
      message:
        "Selected core conflict is not recognizable in voiceover/visuals",
      evidence: conflict.slice(0, 120),
    });
  }

  // --- world abandoned overall ---
  const worldPresent =
    tokenOverlap(args.winner.openingSituation, allVisual, 2) ||
    tokenOverlap(dna?.world ?? "", allVisual, 2) ||
    worldTokens.some((t) => normalize(allVisual).includes(t));
  if (!worldPresent && scenes.length > 0) {
    violations.push({
      code: "world_abandoned",
      message: "Selected commercial world is not present across visual scenes",
      evidence: (dna?.world || args.winner.openingSituation).slice(0, 120),
    });
  }

  // --- product demonstration ---
  const productDemonstration = detectProductDemonstration({
    sceneTexts: scenes,
    voiceoverText: vo,
    winner: args.winner,
  });
  if (!productDemonstration.present) {
    const bits: string[] = [];
    if (!productDemonstration.askPresent) bits.push("missing_ask");
    if (!productDemonstration.answerPresent) bits.push("missing_ai_answer");
    if (!productDemonstration.resultPresent) bits.push("missing_result");
    if (productDemonstration.landingPageOnly) {
      bits.push("landing_page_is_not_product_demo");
    }
    violations.push({
      code: "product_demonstration_missing",
      message:
        "Package lacks an explicit product interaction (visitor asks → AI answers → result). Landing page alone is not a product demonstration.",
      evidence: bits.join(",") || productDemonstration.evidence.join(","),
    });
  }

  // --- CTA ---
  const ctaCheck = voiceoverContainsPackageCta(vo, args.packageCta);
  if (!ctaCheck.ok) {
    violations.push({
      code: "cta_mismatch",
      message:
        "Spoken close does not match package CTA — soft poetic ending is not enough when package CTA is action-oriented",
      evidence: ctaCheck.evidence ?? args.packageCta.slice(0, 100),
    });
  }

  // Deduplicate by code+sceneIndex
  const seen = new Set<string>();
  const unique = violations.filter((v) => {
    const k = `${v.code}:${v.sceneIndex ?? ""}:${v.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const passed = unique.length === 0;
  const summary = passed
    ? "story_integrity_passed"
    : unique.map((v) => v.code).join(",");

  return {
    passed,
    version: STORY_INTEGRITY_VERSION,
    allowedWorldTokens,
    productDemonstration,
    ctaMatch: {
      packageCta: args.packageCta,
      voiceoverContainsCta: ctaCheck.ok,
      evidence: ctaCheck.evidence,
    },
    violations: unique,
    summary,
  };
}

export function buildStoryIntegrityPromptBlock(
  winner: CreativeCandidate,
): string {
  const dna = normalizeCreativeDNA(winner.creativeDNA);
  const allowed = deriveAllowedWorldTokens(winner).slice(0, 40).join(", ");
  return [
    `${STORY_INTEGRITY_PROMPT_HEADER} (${STORY_INTEGRITY_VERSION}):`,
    "",
    "The selected Creative Candidate is the SOURCE OF TRUTH for every visual beat.",
    "You may improve shot craft inside this world. You may NOT invent a new world.",
    "",
    `Selected world: ${dna?.world || winner.openingSituation}`,
    `Main character: ${dna?.mainCharacter || "recurring subject of openingSituation"}`,
    `Core conflict: ${dna?.coreConflict || winner.coreIdea}`,
    `Allowed world lexicon (stay inside): ${allowed}`,
    "",
    "ALLOWED beat vocabulary (examples — only if coherent with the selected concept):",
    "phone, visitor, website, chat, waiting, AI response, booking, lead, reply, message, screen.",
    "",
    "NOT ALLOWED unless explicitly present in the selected concept:",
    "fog, floating silhouettes, abstract glowing bubbles, generic analytics,",
    "random laptop montage, airport, departure boards, outer space, symbolic/mannequin figures.",
    "",
    "Hard rules:",
    "1. Every visual_scenes[] beat must remain inside the selected world.",
    "2. Middle beats must escalate the SAME conflict — not switch to metaphor essays.",
    "3. PRODUCT DEMONSTRATION required: visitor asks → AI answers → result.",
    "   A landing page / hero screenshot alone is NOT a product demonstration.",
    "4. Closing spoken lines must match the package CTA (action CTA, not only a poetic soft close).",
    "5. Do not change the primary actor or relocate the story without a reason already in storyProgression.",
  ].join("\n");
}

export function storyIntegrityRepairAppendix(
  winner: CreativeCandidate,
  integrity: StoryIntegrityResult,
  packageCta: string,
): string {
  const dna = normalizeCreativeDNA(winner.creativeDNA);
  return [
    "STORY INTEGRITY REPAIR (mandatory — previous draft failed hard validation):",
    `Failure codes: ${integrity.violations.map((v) => v.code).join(", ")}`,
    ...integrity.violations.map(
      (v) =>
        `- ${v.code}${v.sceneIndex != null ? ` (scene ${v.sceneIndex})` : ""}: ${v.message}${v.evidence ? ` | evidence: ${v.evidence}` : ""}`,
    ),
    "",
    `SELECTED world: ${dna?.world || winner.openingSituation}`,
    `SELECTED mainCharacter: ${dna?.mainCharacter || ""}`,
    `SELECTED openingSituation (scene 1): ${winner.openingSituation}`,
    `SELECTED storyProgression: ${winner.storyProgression}`,
    `SELECTED productConnection: ${winner.productConnection}`,
    `SELECTED ending: ${winner.ending}`,
    `PACKAGE CTA (must appear in spoken close): ${packageCta}`,
    "",
    "Regenerate visual_scenes + voiceover_text so that:",
    "- No middle-beat fog/silhouettes/mannequins/airport/space metaphors unless selected.",
    "- Include an explicit product interaction: ask → AI answer → result (not landing page only).",
    "- Keep the primary actor and selected world continuous.",
    "- Spoken ending matches the package CTA.",
  ].join("\n");
}

export function storyIntegrityValidationIssues(
  integrity: StoryIntegrityResult,
): Array<{ path: string; message: string }> {
  return integrity.violations.map((v) => ({
    path: `story_integrity.${v.code}${v.sceneIndex != null ? `.scene_${v.sceneIndex}` : ""}`,
    message: v.evidence ? `${v.message} (${v.evidence})` : v.message,
  }));
}
