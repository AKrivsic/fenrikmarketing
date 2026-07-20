/**
 * Creative DNA — canonical immutable creative decisions for a Creative Candidate.
 *
 * Primary path: authored in the same Divergence generation pass as the candidate
 * (`authorCreativeDNA`). Source label: `"model"` (divergence-authored; no extra LLM).
 *
 * Fallback: `deriveCreativeDNA` when authored DNA is missing/malformed/inconsistent.
 * No new LLM call. No new workflow stage.
 */

import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import type { TopicConcreteSignals } from "@/lib/creative-candidates/topicSignals";
import type { CreativeIdentity } from "@/lib/creative-identity/types";

export const CREATIVE_DNA_PROMPT_HEADER = "CANONICAL CREATIVE DNA";
export const CREATIVE_DNA_PROMPT_VERSION = "creative-dna@1" as const;

/**
 * Authoring rules for Divergence generation (deterministic builder / future model schema).
 * Creative DNA is not a summary of the topic — it is a canonical specification of
 * this exact visual concept, authored with the candidate fields in the same object.
 */
export const CREATIVE_DNA_AUTHORING_INSTRUCTIONS = [
  "Creative DNA is not a summary of the topic. It is a canonical specification of this exact visual concept.",
  "Author creativeDNA in the same object as the candidate fields being created — do not invent an alternative concept.",
  "world: canonical physical/visual/symbolic world of THIS openingSituation (concrete; prevents relocation).",
  "mainCharacter: recurring person, creature, object, or visual motif — not a generic business owner; object-led concepts keep the object.",
  "coreConflict: product-relevant problem dramatized by the spectacle; connect to Product Brain pain; do not merely repeat the Strategy Item title.",
  "productRole: truthful Product Brain function/outcome — not generic success.",
  "viewerQuestion: curiosity gap after the opening; align with expectedViewerQuestion; hold when the concept requires it.",
  "endingIntent: required narrative/visual payoff that preserves product role — not emotion-only.",
  "immutableRules: 3–6 concept-specific rules whose violation would destroy this winner — never generic quality advice.",
  "Consistency: world↔openingSituation/storyProgression; mainCharacter↔recurring subject; viewerQuestion↔expectedViewerQuestion;",
  "endingIntent↔ending; productRole↔productConnection/Product Brain; DNA must not add new characters, settings, or product capabilities.",
].join("\n");

export interface CreativeDNA {
  world: string;
  mainCharacter: string;
  coreConflict: string;
  productRole: string;
  viewerQuestion: string;
  endingIntent: string;
  immutableRules: string[];
}

export type CreativeDnaSource =
  | "model"
  | "deterministic_fallback"
  | "missing";

export type CreativeDnaViolationField =
  | "world"
  | "mainCharacter"
  | "coreConflict"
  | "productRole"
  | "viewerQuestion"
  | "endingIntent"
  | "immutableRule";

export type CreativeDnaConsistencyField =
  | "world"
  | "mainCharacter"
  | "coreConflict"
  | "productRole"
  | "viewerQuestion"
  | "endingIntent"
  | "immutableRules";

export interface CreativeDnaViolation {
  field: CreativeDnaViolationField;
  message: string;
  evidence?: string;
}

export interface CreativeDnaValidationResult {
  passed: boolean;
  violations: CreativeDnaViolation[];
}

export interface CreativeDnaConsistencyViolation {
  field: CreativeDnaConsistencyField;
  message: string;
}

export interface CreativeDnaConsistencyResult {
  passed: boolean;
  violations: CreativeDnaConsistencyViolation[];
}

export interface CreativeDnaResolveResult {
  dna: CreativeDNA | undefined;
  source: CreativeDnaSource;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  consistency: CreativeDnaConsistencyResult | null;
}

export interface CreativeDnaDiagnostics {
  present: boolean;
  candidateId: string | null;
  candidateVersion: string;
  dnaPromptVersion: typeof CREATIVE_DNA_PROMPT_VERSION;
  identityEnvironmentSuppressed: boolean;
  creativeDnaSource: CreativeDnaSource;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  modelDnaConsistency: CreativeDnaConsistencyResult | null;
  /** Package-level DNA fidelity warnings (existing validator). */
  validation: CreativeDnaValidationResult | null;
}

const GENERIC_RULE_RE =
  /\b(be creative|make it engaging|good lighting|keep the product visible|use good|be engaging|make the hook|keep the video creative)\b/i;

const GENERIC_CHARACTER_RE =
  /\b(a business owner|the business owner|a generic person|someone tired|an employee)\b/i;

const EMOTION_ONLY_ENDING_RE =
  /^(end with |ends? with )?(relief|calm|happiness|joy|satisfaction|hope)\.?$/i;

function trimSentence(s: string, max = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function firstClause(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  const m = t.match(/^[^.;]+/);
  return (m?.[0] ?? t).trim();
}

function significantKeywords(text: string): string[] {
  const stop = new Set([
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
    "communicate",
    "replace",
    "relocate",
    "primary",
    "story",
    "generic",
    "different",
    "marketing",
    "problem",
    "success",
    "mood",
    "what",
    "happens",
    "person",
    "next",
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w));
}

function tokenOverlap(a: string, b: string, minHits = 1): boolean {
  const aw = new Set(significantKeywords(a));
  let hits = 0;
  for (const w of significantKeywords(b)) {
    if (aw.has(w)) hits++;
  }
  return hits >= minHits;
}

/** Infer a short main-character label from opening / core idea (fallback heuristics). */
export function inferMainCharacter(blob: string): string {
  const t = blob.toLowerCase();
  if (/\bfish tank|aquarium\b/.test(t)) {
    return "A fish tank whose bowls dramatize answered vs unanswered demand";
  }
  if (/\bmascot\b/.test(t)) return "An exhausted person in a full mascot costume";
  if (/\btechnician\b/.test(t)) return "A field technician under operational pressure";
  if (/\baccountant|bookkeep|cpa\b/.test(t)) {
    return "An accountant returning to unanswered demand";
  }
  if (/\bhands\b/.test(t) && /\b(typ|send|form|visitor|customer)\b/.test(t)) {
    return "A website visitor's hands sending an urgent question";
  }
  if (/\bteammates|two .+ (workers|staff)|mid-argument\b/.test(t)) {
    return "Staff mid-argument under demand pressure";
  }
  if (/\bboarding|ticket queue|paper tickets|boarding pass\b/.test(t)) {
    return "Phone callers queued with absurd boarding tickets";
  }
  if (/\b(pile|tower|mountain|stack)\b/.test(t) && /\b(job|folder|slip|demand)\b/.test(t)) {
    return "A growing physical pile of unanswered demand";
  }
  if (/\bneighbor|street|porch\b/.test(t)) {
    return "Neighbors observing visible demand and silent replies";
  }
  if (/\bcompetitor|rival\b/.test(t)) {
    return "A competitor already claiming the job";
  }
  if (/\bempty (front )?desk|half-abandoned|blinking\b/.test(t)) {
    return "An empty desk while the digital channel still works";
  }
  return "The primary recurring visual motif in the opening situation";
}

/** Infer a short world/setting label (fallback heuristics). */
export function inferWorld(
  opening: string,
  signals: TopicConcreteSignals,
): string {
  const t = opening.toLowerCase();
  if (/\bfish tank|aquarium\b/.test(t)) {
    return "A waiting-room fish tank that turns lead channels into living bowls";
  }
  if (/\bparking lot\b/.test(t)) {
    return "A sun-baked parking lot outside a small business";
  }
  if (/\bdriveway\b/.test(t)) return "A residential driveway during a lost-job moment";
  if (/\bvan\b/.test(t) || /\byard\b/.test(t)) {
    return trimSentence(`A service yard / van moment: ${signals.settingCue}`, 120);
  }
  if (/\bstreet|porch|sidewalk\b/.test(t)) {
    return "A residential street where demand is publicly visible";
  }
  if (/\blobby|service counter|boarding\b/.test(t)) {
    const industry = signals.industryCue.replace(/^\s+/, "");
    const article = /^[aeiou]/i.test(industry) ? "An" : "A";
    return trimSentence(`${article} ${industry} lobby / service counter`, 120);
  }
  if (/\bhome office|practice desk|suitcase|vacation\b/.test(t)) {
    return "A home office / practice desk after time away";
  }
  if (/\broof\b/.test(t)) return "A rooftop / exterior heat-stress worksite";
  if (/\bkitchen|host stand\b/.test(t)) return "A kitchen pass / host stand during rush";
  if (/\bclinic|waiting room|reception\b/.test(t)) {
    return "A clinic reception / waiting room";
  }
  const clause = firstClause(opening);
  if (clause.length >= 12) return trimSentence(clause, 140);
  return trimSentence(signals.settingCue, 120);
}

function deriveImmutableRules(args: {
  world: string;
  mainCharacter: string;
  coreConflict: string;
  productRole: string;
  opening: string;
  visualPromise: string;
}): string[] {
  const rules: string[] = [];
  const opening = args.opening.toLowerCase();
  const world = args.world.toLowerCase();
  const character = args.mainCharacter.toLowerCase();

  // Always lock to the authored world / opening event (industry-agnostic).
  rules.push(
    `Do not relocate the primary story away from: ${trimSentence(args.world, 90)}`,
  );
  rules.push(
    "Do not replace the opening event with a low-information empty environment of the same theme",
  );

  if (/\bmascot\b/.test(opening) || /\bmascot\b/.test(character)) {
    rules.push("Do not replace the mascot as the main visual subject");
  } else if (!/primary recurring visual motif/i.test(args.mainCharacter)) {
    rules.push(
      `Do not replace the main character: ${trimSentence(args.mainCharacter, 90)}`,
    );
  }

  if (
    /no generic office|no .*laptop montage|laptop montage/i.test(args.visualPromise)
  ) {
    rules.push("Do not turn the middle into a generic device analytics montage");
  }

  rules.push(
    `Do not replace the core conflict (${trimSentence(args.coreConflict, 80)}) with a different marketing problem`,
  );
  rules.push(
    "Do not resolve the story only with a happy expression; show that the problem state changes",
  );
  rules.push(
    `Do not reduce the product to a generic success mood; show or clearly communicate: ${trimSentence(args.productRole, 90)}`,
  );

  return rules.slice(0, 7);
}

/**
 * Author Creative DNA from the exact candidate fields being created in the same
 * Divergence generation pass. Does not invent an alternate concept.
 */
export function authorCreativeDNA(
  candidate: Omit<CreativeCandidate, "creativeDNA" | "creativeDnaSource">,
  ctx: {
    signals: TopicConcreteSignals;
    product: string;
    pain: string;
  },
): CreativeDNA {
  const opening = candidate.openingSituation;
  const blob = `${opening} ${candidate.coreIdea} ${candidate.hookLine}`;

  // world: concrete opening world from the event — not a generic industry set
  const eventClause = firstClause(opening);
  const world = trimSentence(
    eventClause.length >= 12
      ? eventClause
      : inferWorld(opening, ctx.signals),
    140,
  );

  const mainCharacter = authorMainCharacter(blob, opening);

  const coreConflict = trimSentence(
    buildCoreConflict(candidate, ctx.pain),
    160,
  );

  const productRole = trimSentence(
    candidate.productConnection ||
      `${ctx.product} answers visitor questions while humans cannot`,
    160,
  );

  const viewerQuestion = trimSentence(
    candidate.expectedViewerQuestion ||
      `What happens next in: ${firstClause(opening)}?`,
    160,
  );

  const endingIntent = trimSentence(
    authorEndingIntent(candidate.ending, productRole, ctx.product),
    180,
  );

  const immutableRules = deriveImmutableRules({
    world,
    mainCharacter,
    coreConflict,
    productRole,
    opening,
    visualPromise: candidate.visualPromise,
  });

  return {
    world,
    mainCharacter,
    coreConflict,
    productRole,
    viewerQuestion,
    endingIntent,
    immutableRules,
  };
}

function authorMainCharacter(blob: string, opening: string): string {
  const t = blob.toLowerCase();
  // Object-led / non-human first — never flatten to "business owner"
  if (/\bfish tank|aquarium\b/.test(t)) {
    if (/website leads|phone leads|unanswered|question/i.test(blob)) {
      return "A fish tank slowly sorting answered vs unanswered customer demand";
    }
    return "A fish tank as the recurring visual metaphor for lead channels";
  }
  if (/\b(pile|tower|mountain|stack)\b/.test(t) && /\b(job|folder|slip|paper|demand)\b/.test(t)) {
    return "A growing physical pile of unanswered demand beside the service van";
  }
  if (/\bboarding pass|boarding-ticket|paper tickets|boarding-group\b/.test(t)) {
    return "An absurd boarding-ticket queue for phone callers (website line empty)";
  }
  if (/\btyping indicator|fake typing|chat widget\b/.test(t) && /\bmascot\b/.test(t)) {
    return "An exhausted person in a full mascot costume";
  }
  if (/\bmascot\b/.test(t)) {
    return "An exhausted person in a full mascot costume";
  }
  if (/\bhands\b/.test(t) && /\b(typ|send|form|visitor|customer)\b/.test(t)) {
    return "A website visitor's hands sending an urgent question";
  }
  if (/\bempty (front )?desk|half-abandoned\b/.test(t)) {
    return "An empty desk / wall screen while the digital receptionist works alone";
  }
  if (/\bcompetitor|rival van|signed clipboard\b/.test(t)) {
    return "A competitor already claiming the job on the driveway";
  }
  if (/\bwindows open|AC blasting|open window\b/.test(t)) {
    return "A home wasting cool air — metaphor for a silent website";
  }
  if (/\bteammates|mid-argument|two .+ (workers|staff)\b/.test(t)) {
    return "Staff mid-argument under operational demand pressure";
  }
  if (/\bneighbor|street|porch\b/.test(t)) {
    return "Neighbors witnessing visible demand and silent online replies";
  }
  if (/\btechnician\b/.test(t)) {
    return "A field technician sprinting between jobs while online demand piles up";
  }
  if (/\baccountant|suitcase|passport|pto\b/.test(t)) {
    return "An accountant confronting missed leads after time away";
  }
  if (/\bpatient\b/.test(t)) {
    return "A patient waiting for a reply that never comes";
  }
  // Last resort: concrete noun phrase from opening, never "business owner"
  const clause = firstClause(opening);
  if (clause.length >= 8) {
    return trimSentence(`The recurring subject of: ${clause}`, 120);
  }
  return "The primary recurring visual motif in the opening situation";
}

function buildCoreConflict(
  candidate: Omit<CreativeCandidate, "creativeDNA" | "creativeDnaSource">,
  pain: string,
): string {
  const openingBit = firstClause(candidate.openingSituation);
  const painBit = pain.trim() || "unanswered website demand";
  // Spectacle + product pain — not Strategy Item title alone
  if (openingBit.toLowerCase().includes(painBit.toLowerCase().slice(0, 12))) {
    return openingBit;
  }
  return `${painBit}, dramatized as: ${openingBit}`;
}

function authorEndingIntent(
  ending: string,
  productRole: string,
  product: string,
): string {
  const e = ending.trim();
  if (!e) {
    return `Show that visitors receive a real answer via ${product} while the opening world remains`;
  }
  if (EMOTION_ONLY_ENDING_RE.test(e)) {
    return `Show visitors receiving a real answer (${productRole}) — not only ${e.replace(/\.$/, "")}`;
  }
  if (/\banswer|repli|respond|chatbot|visitor\b/i.test(e)) {
    return e.endsWith(".") ? e : `${e}.`;
  }
  return `Show that ${e.replace(/\.$/, "")} — with ${product} clearly answering visitors`;
}

/**
 * Derive Creative DNA heuristically (fallback only).
 * Kept for historical candidates, malformed authored DNA, and legacy paths.
 */
export function deriveCreativeDNA(
  candidate: Omit<CreativeCandidate, "creativeDNA" | "creativeDnaSource">,
  ctx: {
    signals: TopicConcreteSignals;
    product: string;
    pain: string;
  },
): CreativeDNA {
  const blob = `${candidate.openingSituation} ${candidate.coreIdea}`;
  const world = inferWorld(candidate.openingSituation, ctx.signals);
  const mainCharacter = inferMainCharacter(blob);
  const coreConflict = trimSentence(
    candidate.coreIdea.includes(ctx.pain)
      ? candidate.coreIdea
      : `${ctx.pain} dramatized as: ${firstClause(candidate.coreIdea)}`,
    160,
  );
  const productRole = trimSentence(
    candidate.productConnection ||
      `${ctx.product} answers visitor questions while humans cannot`,
    160,
  );
  const viewerQuestion = trimSentence(
    candidate.expectedViewerQuestion ||
      `What happens next in: ${firstClause(candidate.openingSituation)}?`,
    160,
  );
  const endingIntent = trimSentence(
    candidate.ending ||
      `Show that the next visitor gets an answer via ${ctx.product}`,
    160,
  );
  const immutableRules = deriveImmutableRules({
    world,
    mainCharacter,
    coreConflict,
    productRole,
    opening: candidate.openingSituation,
    visualPromise: candidate.visualPromise,
  });

  return {
    world,
    mainCharacter,
    coreConflict,
    productRole,
    viewerQuestion,
    endingIntent,
    immutableRules,
  };
}

export function isValidCreativeDNA(value: unknown): value is CreativeDNA {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  const strings = [
    "world",
    "mainCharacter",
    "coreConflict",
    "productRole",
    "viewerQuestion",
    "endingIntent",
  ] as const;
  for (const k of strings) {
    if (typeof r[k] !== "string" || !(r[k] as string).trim()) return false;
  }
  if (!Array.isArray(r.immutableRules) || r.immutableRules.length === 0) {
    return false;
  }
  if (!r.immutableRules.every((x) => typeof x === "string" && x.trim())) {
    return false;
  }
  const rules = r.immutableRules as string[];
  if (rules.length < 3 || rules.length > 8) return false;
  if (rules.every((rule) => GENERIC_RULE_RE.test(rule))) return false;
  // Reject overly generic world / character at shape level when clearly boilerplate
  if (/^a business environment\.?$/i.test((r.world as string).trim())) return false;
  if (/^a business owner\.?$/i.test((r.mainCharacter as string).trim())) return false;
  return true;
}

export function normalizeCreativeDNA(value: unknown): CreativeDNA | undefined {
  return isValidCreativeDNA(value) ? value : undefined;
}

/**
 * Candidate ↔ DNA consistency (deterministic). Used before accepting authored DNA.
 */
export function validateCandidateDnaConsistency(
  candidate: Omit<CreativeCandidate, "creativeDNA" | "creativeDnaSource">,
  dna: CreativeDNA,
  opts?: { productIs?: readonly string[] },
): CreativeDnaConsistencyResult {
  const violations: CreativeDnaConsistencyViolation[] = [];

  const minLen = (s: string, n: number) => s.trim().length >= n;
  if (!minLen(dna.world, 12)) {
    violations.push({ field: "world", message: "world too short / not concrete" });
  }
  if (!minLen(dna.mainCharacter, 8)) {
    violations.push({
      field: "mainCharacter",
      message: "mainCharacter too short",
    });
  }
  if (!minLen(dna.coreConflict, 12)) {
    violations.push({ field: "coreConflict", message: "coreConflict too short" });
  }
  if (!minLen(dna.productRole, 12)) {
    violations.push({ field: "productRole", message: "productRole too short" });
  }
  if (!minLen(dna.viewerQuestion, 8)) {
    violations.push({
      field: "viewerQuestion",
      message: "viewerQuestion too short",
    });
  }
  if (!minLen(dna.endingIntent, 12)) {
    violations.push({ field: "endingIntent", message: "endingIntent too short" });
  }

  if (/^a business environment/i.test(dna.world.trim())) {
    violations.push({
      field: "world",
      message: "world is a generic business environment",
    });
  }

  // world must relate to opening / progression
  const settingBlob = `${candidate.openingSituation} ${candidate.storyProgression}`;
  if (
    !tokenOverlap(dna.world, settingBlob, 1) &&
    !tokenOverlap(dna.world, candidate.openingSituation, 1)
  ) {
    // Allow inferWorld paraphrases for parking lot / fish tank
    const opening = candidate.openingSituation.toLowerCase();
    const world = dna.world.toLowerCase();
    const ok =
      (/\bparking lot\b/.test(opening) && /\bparking lot\b/.test(world)) ||
      (/\bfish tank|aquarium\b/.test(opening) && /\bfish tank|aquarium|bowl\b/.test(world)) ||
      (/\bdriveway\b/.test(opening) && /\bdriveway\b/.test(world));
    if (!ok) {
      violations.push({
        field: "world",
        message: "world does not match openingSituation / storyProgression",
      });
    }
  }

  // Co-working DNA on parking-lot candidate
  if (
    /\bparking lot\b/i.test(candidate.openingSituation) &&
    /\bco-?working|modern office\b/i.test(dna.world)
  ) {
    violations.push({
      field: "world",
      message: "parking-lot candidate cannot have co-working DNA world",
    });
  }

  // mainCharacter overlap with opening / progression
  if (GENERIC_CHARACTER_RE.test(dna.mainCharacter)) {
    violations.push({
      field: "mainCharacter",
      message: "mainCharacter is a generic person label (e.g. business owner)",
    });
  }
  const charBlob = `${candidate.openingSituation} ${candidate.coreIdea} ${candidate.hookLine}`;
  if (!tokenOverlap(dna.mainCharacter, charBlob, 1)) {
    const mc = dna.mainCharacter.toLowerCase();
    const open = charBlob.toLowerCase();
    const motifOk =
      (/\bmascot\b/.test(mc) && /\bmascot\b/.test(open)) ||
      (/\bfish\b/.test(mc) && /\bfish|aquarium|tank\b/.test(open)) ||
      (/\bpile|stack|tower\b/.test(mc) && /\bpile|stack|tower|folder\b/.test(open));
    if (!motifOk) {
      violations.push({
        field: "mainCharacter",
        message: "mainCharacter terms do not overlap candidate opening/progression",
      });
    }
  }

  // Object-led: fish tank candidate must not become generic human-only character
  if (
    /\bfish tank|aquarium\b/i.test(candidate.openingSituation) &&
    !/\bfish|tank|aquarium|bowl\b/i.test(dna.mainCharacter)
  ) {
    violations.push({
      field: "mainCharacter",
      message: "object-led fish-tank concept flattened to non-tank character",
    });
  }

  // viewerQuestion ↔ expectedViewerQuestion
  if (
    candidate.expectedViewerQuestion &&
    !tokenOverlap(dna.viewerQuestion, candidate.expectedViewerQuestion, 1) &&
    dna.viewerQuestion.toLowerCase() !==
      candidate.expectedViewerQuestion.toLowerCase()
  ) {
    violations.push({
      field: "viewerQuestion",
      message: "viewerQuestion incompatible with expectedViewerQuestion",
    });
  }

  // endingIntent ↔ ending; reject emotion-only
  if (EMOTION_ONLY_ENDING_RE.test(dna.endingIntent.trim())) {
    violations.push({
      field: "endingIntent",
      message: "endingIntent is emotion-only (e.g. relief) without payoff",
    });
  }
  if (
    candidate.ending &&
    /\banswer|visitor|reply\b/i.test(candidate.ending) &&
    !/\banswer|visitor|reply|respond|chatbot|product\b/i.test(dna.endingIntent)
  ) {
    violations.push({
      field: "endingIntent",
      message: "endingIntent does not concretize candidate ending payoff",
    });
  }
  if (
    candidate.ending &&
    !tokenOverlap(dna.endingIntent, candidate.ending, 1) &&
    !/\banswer|visitor\b/i.test(dna.endingIntent)
  ) {
    violations.push({
      field: "endingIntent",
      message: "endingIntent does not overlap candidate ending",
    });
  }

  // productRole ↔ productConnection / Product Brain
  if (
    candidate.productConnection &&
    !tokenOverlap(dna.productRole, candidate.productConnection, 1)
  ) {
    violations.push({
      field: "productRole",
      message: "productRole does not match productConnection",
    });
  }
  if (/\bimproves the business|makes (it|everything) better|boosts? sales\b/i.test(dna.productRole)) {
    violations.push({
      field: "productRole",
      message: "productRole is generic success language",
    });
  }

  // Invented product capabilities (simple Product Brain check)
  const productBlob = [
    candidate.productConnection,
    ...(opts?.productIs ?? []),
  ]
    .join(" ")
    .toLowerCase();
  if (
    /\b(crm|payroll|inventory|shipping|pos system)\b/i.test(dna.productRole) &&
    !/\b(crm|payroll|inventory|shipping|pos)\b/i.test(productBlob)
  ) {
    violations.push({
      field: "productRole",
      message: "productRole invents unsupported product functionality",
    });
  }

  // immutableRules: count, non-generic, must not forbid required opening elements
  if (dna.immutableRules.length < 3 || dna.immutableRules.length > 6) {
    // allow up to 6 preferred; soft-fail only if <3 or >6 for authored
    if (dna.immutableRules.length < 3) {
      violations.push({
        field: "immutableRules",
        message: "immutableRules must contain at least 3 concept-specific rules",
      });
    }
  }
  if (dna.immutableRules.every((r) => GENERIC_RULE_RE.test(r))) {
    violations.push({
      field: "immutableRules",
      message: "immutableRules are generic creative-quality boilerplate",
    });
  }
  const rulesBlob = dna.immutableRules.join(" ").toLowerCase();
  // Rules must not prohibit mascot if opening requires mascot
  if (
    /\bmascot\b/i.test(candidate.openingSituation) &&
    /\bdo not (use|show|include).*mascot\b/i.test(rulesBlob)
  ) {
    violations.push({
      field: "immutableRules",
      message: "immutableRules prohibit the mascot required by the candidate",
    });
  }
  // Prefer concept-specific nouns in at least one rule
  const conceptNouns = significantKeywords(
    `${candidate.openingSituation} ${dna.world} ${dna.mainCharacter}`,
  ).slice(0, 8);
  const hasConceptNoun = dna.immutableRules.some((rule) =>
    conceptNouns.some((n) => rule.toLowerCase().includes(n)),
  );
  if (!hasConceptNoun && conceptNouns.length > 0) {
    violations.push({
      field: "immutableRules",
      message: "immutableRules lack concept-specific nouns from the candidate",
    });
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Resolve DNA with correct precedence:
 * normalized authored DNA (if consistent) → deterministic fallback → missing.
 * Never overwrites valid authored DNA with deriveCreativeDNA.
 */
export function resolveCandidateCreativeDNA(args: {
  candidate: Omit<CreativeCandidate, "creativeDNA" | "creativeDnaSource">;
  authoredDna?: unknown;
  ctx: {
    signals: TopicConcreteSignals;
    product: string;
    pain: string;
    productIs?: readonly string[];
  };
}): CreativeDnaResolveResult {
  const normalized = normalizeCreativeDNA(args.authoredDna);
  if (normalized) {
    const consistency = validateCandidateDnaConsistency(
      args.candidate,
      normalized,
      { productIs: args.ctx.productIs },
    );
    if (consistency.passed) {
      return {
        dna: normalized,
        source: "model",
        fallbackUsed: false,
        fallbackReason: null,
        consistency,
      };
    }
    const fallback = deriveCreativeDNA(args.candidate, args.ctx);
    return {
      dna: fallback,
      source: "deterministic_fallback",
      fallbackUsed: true,
      fallbackReason: `authored_dna_inconsistent:${consistency.violations
        .map((v) => v.field)
        .join(",")}`,
      consistency,
    };
  }

  if (args.authoredDna != null) {
    const fallback = deriveCreativeDNA(args.candidate, args.ctx);
    return {
      dna: fallback,
      source: "deterministic_fallback",
      fallbackUsed: true,
      fallbackReason: "authored_dna_malformed",
      consistency: null,
    };
  }

  const fallback = deriveCreativeDNA(args.candidate, args.ctx);
  return {
    dna: fallback,
    source: "deterministic_fallback",
    fallbackUsed: true,
    fallbackReason: "authored_dna_missing",
    consistency: null,
  };
}

/**
 * Attach DNA onto a candidate without overwriting valid authored DNA.
 */
export function withCreativeDNA(
  candidate: CreativeCandidate,
  ctx: {
    signals: TopicConcreteSignals;
    product: string;
    pain: string;
    productIs?: readonly string[];
  },
): CreativeCandidate {
  const { creativeDNA: existing, creativeDnaSource: _src, ...rest } = candidate;
  const resolved = resolveCandidateCreativeDNA({
    candidate: rest,
    authoredDna: existing,
    ctx,
  });
  return {
    ...candidate,
    creativeDNA: resolved.dna,
    creativeDnaSource: resolved.source,
  };
}

/** Indoor / office Identity environments that conflict with outdoor / non-office DNA worlds. */
const IDENTITY_INDOOR_OFFICE_RE =
  /\b(co-?working|home office|studio-like|café|cafe|kitchen with everyday|retail floor|maker workbench)\b/i;

const DNA_OUTDOOR_OR_NON_OFFICE_RE =
  /\b(parking lot|driveway|street|porch|sidewalk|yard|van|roof|lobby|service counter|boarding|heat|exterior|fish tank)\b/i;

export function identityEnvironmentConflictsWithDna(
  identityEnvironment: string,
  dna: CreativeDNA,
): boolean {
  const env = identityEnvironment.toLowerCase();
  const world = dna.world.toLowerCase();
  const rulesBlob = dna.immutableRules.join(" ").toLowerCase();

  if (
    /\b(office|co-?working)\b/.test(rulesBlob) &&
    /\b(do not relocate|do not .*office|generic office)\b/.test(rulesBlob) &&
    /\b(co-?working|office|studio|café|cafe)\b/.test(env)
  ) {
    return true;
  }

  if (DNA_OUTDOOR_OR_NON_OFFICE_RE.test(world) && IDENTITY_INDOOR_OFFICE_RE.test(env)) {
    if (/\b(office|desk|nook|studio)\b/.test(world)) return false;
    return true;
  }

  if (/\bparking lot\b/.test(world) && /\bco-?working|office|studio\b/.test(env)) {
    return true;
  }

  return false;
}

export function buildCreativeDnaPromptBlock(dna: CreativeDNA): string {
  const rules = dna.immutableRules.map((r) => `- ${r}`).join("\n");
  return [
    `${CREATIVE_DNA_PROMPT_HEADER} (${CREATIVE_DNA_PROMPT_VERSION}):`,
    "",
    "The Creative Divergence stage has already made the core creative decisions below.",
    "These decisions are FINAL and define the identity of this content package.",
    "",
    "You are an execution and production layer. Do not reinterpret, relocate, replace or simplify these decisions.",
    "",
    "You MAY improve:",
    "- exact wording",
    "- pacing",
    "- dialogue",
    "- shot details",
    "- camera angle",
    "- composition",
    "- transitions",
    "- supporting visual details",
    "- platform-specific copy",
    "",
    "You MUST preserve:",
    "- canonical world",
    "- main character",
    "- core conflict",
    "- product role",
    "- viewer question",
    "- ending intent",
    "- immutable rules",
    "",
    "When another prompt section conflicts with Creative DNA:",
    "- Creative DNA controls WHAT happens, WHERE the canonical story happens, WHO carries it, WHY the viewer keeps watching and HOW the product resolves the conflict.",
    "- Creative Identity may control visual treatment only: lighting, camera, composition, texture, palette and photographic style.",
    "- Strategy Item controls the marketing truth and topic, but must be expressed through the Creative DNA story rather than replacing it with exposition.",
    "- Product Reveal may improve the clarity of the payoff, but must not replace the specified ending intent.",
    "- Visual Narrative may expand execution, but must not replace the world, conflict, viewer question or progression.",
    "",
    `world: ${dna.world}`,
    `mainCharacter: ${dna.mainCharacter}`,
    `coreConflict: ${dna.coreConflict}`,
    `productRole: ${dna.productRole}`,
    `viewerQuestion: ${dna.viewerQuestion}`,
    `endingIntent: ${dna.endingIntent}`,
    "immutableRules:",
    rules,
  ].join("\n");
}

export function neutralizeIdentityEnvironmentForDna(
  identity: CreativeIdentity,
  dna: CreativeDNA,
): { identity: CreativeIdentity; suppressed: boolean } {
  // Attention First / ID-1: when DNA world exists, Identity NEVER keeps a
  // separate place environment — treatment only inside dna.world.
  return {
    suppressed: true,
    identity: {
      ...identity,
      environment: `Apply visual treatment inside the canonical Creative DNA world: ${dna.world}`,
    },
  };
}

/**
 * When a Creative Candidate openingSituation is present without DNA, lock
 * Identity environment to treatment-inside-opening-world (never invent a place).
 */
export function neutralizeIdentityEnvironmentForOpening(
  identity: CreativeIdentity,
  openingSituation: string,
): { identity: CreativeIdentity; suppressed: boolean } {
  const world = openingSituation.replace(/\s+/g, " ").trim().slice(0, 220);
  if (!world) return { identity, suppressed: false };
  return {
    suppressed: true,
    identity: {
      ...identity,
      environment: `Apply visual treatment inside the opening situation world: ${world}`,
    },
  };
}

function packageBlob(args: {
  hook?: string | null;
  voiceoverText?: string | null;
  concept?: string | null;
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
}): string {
  const parts: string[] = [];
  if (args.hook) parts.push(args.hook);
  if (args.voiceoverText) parts.push(args.voiceoverText);
  if (args.concept) parts.push(args.concept);
  for (const p of args.imagePrompts ?? []) {
    if (typeof p === "string") parts.push(p);
  }
  for (const s of args.visualScenes ?? []) {
    if (s && typeof s === "object" && !Array.isArray(s)) {
      const r = s as Record<string, unknown>;
      if (typeof r.image_prompt === "string") parts.push(r.image_prompt);
      if (typeof r.narration === "string") parts.push(r.narration);
    }
  }
  return parts.join("\n");
}

function lastBeatText(args: {
  voiceoverText?: string | null;
  imagePrompts?: readonly string[] | null;
}): string {
  const prompts = (args.imagePrompts ?? []).filter((p) => typeof p === "string");
  const lastPrompt = prompts.length > 0 ? prompts[prompts.length - 1]! : "";
  const vo = (args.voiceoverText ?? "").trim();
  const sentences = vo.split(/(?<=[.!?])\s+/).filter(Boolean);
  const lastVo = sentences.length > 0 ? sentences[sentences.length - 1]! : vo;
  return `${lastPrompt}\n${lastVo}`;
}

/**
 * Lightweight deterministic DNA validator against a generated package — warnings only.
 */
export function validateCreativeDnaAgainstPackage(
  dna: CreativeDNA,
  pkg: {
    hook?: string | null;
    voiceoverText?: string | null;
    concept?: string | null;
    imagePrompts?: readonly string[] | null;
    visualScenes?: readonly unknown[] | null;
  },
): CreativeDnaValidationResult {
  const violations: CreativeDnaViolation[] = [];
  const blob = packageBlob(pkg).toLowerCase();
  const vo = (pkg.voiceoverText ?? "").toLowerCase();
  const endingBeat = lastBeatText(pkg).toLowerCase();

  const charKeys = significantKeywords(dna.mainCharacter).filter((w) =>
    /mascot|technician|accountant|visitor|neighbor|competitor|hands|staff|teammate|costume|fish|tank|pile|stack|boarding/.test(
      w,
    ),
  );
  const charFallback = significantKeywords(dna.mainCharacter).slice(0, 3);
  const charCheck = charKeys.length > 0 ? charKeys : charFallback;
  if (charCheck.length > 0) {
    const hits = charCheck.filter((w) => blob.includes(w));
    if (hits.length === 0) {
      violations.push({
        field: "mainCharacter",
        message: "Main character keywords missing from concept/script/image prompts",
        evidence: `expected one of: ${charCheck.join(", ")}`,
      });
    }
  }

  for (const rule of dna.immutableRules) {
    const lower = rule.toLowerCase();
    if (!/\bdo not (relocate|replace|use|turn)\b/.test(lower)) continue;

    if (
      /\b(office|co-?working)\b/.test(lower) &&
      /\b(relocate|do not)\b/.test(lower)
    ) {
      if (/\b(co-?working|open[- ]plan office|modern office desk)\b/.test(blob)) {
        violations.push({
          field: "immutableRule",
          message: "Package introduces a forbidden office/co-working relocation",
          evidence: rule,
        });
      }
    }

    if (/\blaptop analytics montage\b/.test(lower) || /\banalytics montage\b/.test(lower)) {
      const promptBlob = (pkg.imagePrompts ?? []).join("\n").toLowerCase();
      if (
        /\b(analytics dashboard|laptop analytics|dashboard on a monitor)\b/.test(promptBlob) &&
        /\b(co-?working|office desk|modern office)\b/.test(promptBlob)
      ) {
        violations.push({
          field: "immutableRule",
          message: "Middle beats resemble a laptop analytics montage forbidden by DNA",
          evidence: rule,
        });
      }
    }

    if (/\bmascot\b/.test(lower) && /\breplace\b/.test(lower)) {
      if (!/\bmascot\b/.test(blob)) {
        violations.push({
          field: "immutableRule",
          message: "Mascot required by immutable rule is missing",
          evidence: rule,
        });
      }
    }
  }

  const roleKeys = significantKeywords(dna.productRole).filter((w) =>
    /answer|chatbot|visitor|assistant|product|reply|respond|online|website|question/.test(
      w,
    ),
  );
  const payoffText = `${vo}\n${endingBeat}`;
  if (roleKeys.length > 0) {
    const hits = roleKeys.filter((w) => payoffText.includes(w));
    if (hits.length === 0) {
      violations.push({
        field: "productRole",
        message: "Product role not represented in voiceover/script/ending",
        evidence: `expected signals like: ${roleKeys.slice(0, 5).join(", ")}`,
      });
    }
  }

  const intent = dna.endingIntent.toLowerCase();
  if (/\banswer|visitor|reply|respond\b/.test(intent)) {
    const hasAnswerSignal =
      /\b(answer|repli|respond|chatbot|visitor gets|gets an answer)\b/.test(payoffText);
    const calmOfficeOnly =
      /\b(leans? back|laptop closed|calm resolution|chair)\b/.test(endingBeat) &&
      !hasAnswerSignal;
    if (calmOfficeOnly) {
      violations.push({
        field: "endingIntent",
        message:
          "Final beat looks incompatible with endingIntent (calm office without answer payoff)",
        evidence: dna.endingIntent,
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
