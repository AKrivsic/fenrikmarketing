/**
 * Presentation integrity (formerly Product Demonstration Integrity).
 * PPD owns value proof; this module keeps PRIMARY_ACTOR continuity and
 * bans floating-icon fake interactions. No PRODUCT_DEMO requirements.
 */

import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import { normalizeCreativeDNA } from "@/lib/creative-candidates/creativeDNA";
import type { ProductPresentationPlan } from "@/lib/product-presentation/types";

export const PRODUCT_DEMONSTRATION_INTEGRITY_VERSION =
  "product-demonstration-integrity@3" as const;
export const PRODUCT_DEMONSTRATION_INTEGRITY_PROMPT_HEADER =
  "PRODUCT PRESENTATION INTEGRITY";

export type ProductDemoIntegrityViolationCode =
  | "floating_icon_replaces_interaction"
  | "primary_actor_missing"
  | "primary_actor_identity_changed";

export interface ProductDemoIntegrityViolation {
  code: ProductDemoIntegrityViolationCode;
  message: string;
  sceneIndex?: number;
  evidence?: string;
}

export interface PrimaryActorSpec {
  label: string;
  continuityAnchors: string[];
  lockedAttributes: string[];
}

export interface SemanticProductDemonstrationCheck {
  present: boolean;
  askPresent: boolean;
  answerPresent: boolean;
  resultPresent: boolean;
  askSceneIndex: number | null;
  answerSceneIndex: number | null;
  resultSceneIndex: number | null;
  landingPageOnly: boolean;
  narrationOnlySignals: string[];
  evidence: string[];
  structuredBeatPresent: boolean;
  structuredBeat: null;
}

export interface ProductDemonstrationIntegrityResult {
  passed: boolean;
  version: typeof PRODUCT_DEMONSTRATION_INTEGRITY_VERSION;
  primaryActor: PrimaryActorSpec;
  productDemonstration: SemanticProductDemonstrationCheck;
  violations: ProductDemoIntegrityViolation[];
  summary: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
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

const LANDING_PAGE_RE =
  /\b(create an ai assistant|starting at \$?\d+|yourcompany\.com|landing page|hero (section|headline)|try the preview first|no registration required|see how it works)\b/i;

function isLandingPageScene(text: string): boolean {
  return LANDING_PAGE_RE.test(text);
}

const FLOATING_ICON_RE =
  /\b(floating (chat |speech |message )?(icon|bubble|sticker)|chat (icon|sticker) floating|notification sticker|abstract (notification|shape) suggesting|soft notification indicator|glowing (chat |speech )?bubble floating)\b/i;

const CONVERSATION_WORLD_RE =
  /\b(phone|smartphone|chat|message|reply|thread|website|screen|visitor|customer|hand|hands)\b/i;

export function derivePrimaryActor(winner: CreativeCandidate): PrimaryActorSpec {
  const dna = normalizeCreativeDNA(winner.creativeDNA);
  const label = (
    dna?.mainCharacter ||
    winner.openingSituation ||
    "the recurring opening subject"
  )
    .trim()
    .replace(/\s+/g, " ");

  const blob = normalize(
    [
      dna?.mainCharacter ?? "",
      winner.openingSituation,
      winner.coreIdea,
      dna?.world ?? "",
    ].join(" "),
  );

  const continuityAnchors: string[] = [];
  for (const a of [
    "hands",
    "hand",
    "visitor",
    "customer",
    "phone",
    "smartphone",
    "chat",
    "website",
    "message",
    "owner",
    "lawyer",
    "salon",
  ]) {
    if (blob.includes(a)) continuityAnchors.push(a);
  }
  if (continuityAnchors.length === 0) {
    continuityAnchors.push(
      ...blob
        .split(" ")
        .filter((w) => w.length > 4)
        .slice(0, 4),
    );
  }

  const lockedAttributes: string[] = [];
  const attrPatterns: Array<[RegExp, string]> = [
    [/\b(man|male|he|him)\b/, "male"],
    [/\b(woman|female|she|her)\b/, "female"],
    [/\b(young|teen|elderly|older|middle[- ]aged)\b/, "age_marked"],
    [/\b(suit|blazer|necktie|tie)\b/, "formal_attire"],
    [/\b(sweater|hoodie|casual)\b/, "casual_attire"],
    [/\b(glasses|spectacles)\b/, "glasses"],
    [/\b(hands?|handheld)\b/, "hands_focus"],
  ];
  for (const [re, tag] of attrPatterns) {
    if (re.test(blob)) lockedAttributes.push(tag);
  }

  return {
    label: label.slice(0, 160),
    continuityAnchors: [...new Set(continuityAnchors)],
    lockedAttributes: [...new Set(lockedAttributes)],
  };
}

function sceneIntroducesConflictingIdentity(
  scene: string,
  primary: PrimaryActorSpec,
  openingScene: string,
): boolean {
  const n = normalize(scene);
  const open = normalize(openingScene);

  const newProfessionalFigure =
    /\b(professional figure|business-casual|suited (man|woman|figure)|man in a (suit|blazer)|woman in a (suit|blazer))\b/.test(
      n,
    ) &&
    primary.lockedAttributes.includes("hands_focus") &&
    !/\bsame (person|visitor|customer|hands)\b/.test(n) &&
    !/\b(visitor|customer).{0,20}hands\b/.test(n);

  if (newProfessionalFigure) return true;

  const conflicts: Array<[string, RegExp]> = [
    ["male", /\b(woman|female)\b/],
    ["female", /\b(man|male)\b/],
    [
      "hands_focus",
      /\b(furrowed brow|smiling (man|woman|professional)|pleased expression)\b/,
    ],
  ];
  for (const [attr, re] of conflicts) {
    if (primary.lockedAttributes.includes(attr) && re.test(n) && !re.test(open)) {
      if (!/\bsame (person|visitor|customer)\b/.test(n)) return true;
    }
  }

  if (
    primary.lockedAttributes.includes("hands_focus") &&
    /\b(furrowed brow|smiling (man|woman))\b/.test(n) &&
    !/\b(hands?|phone|smartphone|visitor|customer)\b/.test(n)
  ) {
    return true;
  }

  const hits = primary.continuityAnchors.filter((a) => n.includes(a));
  if (hits.length >= 1 && CONVERSATION_WORLD_RE.test(scene)) return false;
  if (hits.length >= 2) return false;

  if (
    /\b(man|woman|person|figure|professional|visitor|customer)\b/.test(n) &&
    !/\bsame (person|visitor|customer|hands)\b/.test(n) &&
    hits.length === 0 &&
    !CONVERSATION_WORLD_RE.test(scene)
  ) {
    return /\b(man|woman|professional figure)\b/.test(n);
  }

  return false;
}

function isUiOnlyScene(entry: unknown): boolean {
  const r = asRecord(entry);
  if (!r) return false;
  return String(r.type ?? "").toUpperCase() === "PHONE";
}

/** Diagnostic only — Story Integrity no longer hard-gates on chat demo proof. */
export function detectSemanticProductDemonstration(args: {
  sceneTexts: readonly string[];
  voiceoverText: string;
  winner: CreativeCandidate;
  structuredBeat?: null;
}): SemanticProductDemonstrationCheck {
  void args.winner;
  void args.voiceoverText;
  return {
    present: false,
    askPresent: false,
    answerPresent: false,
    resultPresent: false,
    askSceneIndex: null,
    answerSceneIndex: null,
    resultSceneIndex: null,
    landingPageOnly: args.sceneTexts.some((t) => isLandingPageScene(t)),
    narrationOnlySignals: [],
    evidence: [],
    structuredBeatPresent: false,
    structuredBeat: null,
  };
}

export function validateProductDemonstrationIntegrity(args: {
  winner: CreativeCandidate;
  voiceoverText: string;
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
  productDemo?: unknown;
  productPresentation?: ProductPresentationPlan | null;
}): ProductDemonstrationIntegrityResult {
  void args.productDemo;
  void args.productPresentation;
  const violations: ProductDemoIntegrityViolation[] = [];
  const scenes = scenePromptTexts(args);
  const primaryActor = derivePrimaryActor(args.winner);
  const demo = detectSemanticProductDemonstration({
    sceneTexts: scenes,
    voiceoverText: args.voiceoverText ?? "",
    winner: args.winner,
  });

  if (scenes.length === 0) {
    violations.push({
      code: "primary_actor_missing",
      message: "No visual scenes to lock PRIMARY_ACTOR",
      evidence: primaryActor.label,
    });
  } else {
    const opening = scenes[0] ?? "";
    const visualEntries = args.visualScenes ?? [];
    for (let i = 1; i < scenes.length; i++) {
      const scene = scenes[i] ?? "";
      const entry = visualEntries[i];
      if (isLandingPageScene(scene)) continue;
      if (entry && isUiOnlyScene(entry)) continue;

      if (sceneIntroducesConflictingIdentity(scene, primaryActor, opening)) {
        violations.push({
          code: "primary_actor_identity_changed",
          message:
            "Scene introduces a different human identity without narrative continuity",
          sceneIndex: i,
          evidence: scene.slice(0, 160),
        });
      }
    }
  }

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i] ?? "";
    if (FLOATING_ICON_RE.test(scene)) {
      violations.push({
        code: "floating_icon_replaces_interaction",
        message:
          "Floating chat icon / abstract notification sticker replaces a real product interaction",
        sceneIndex: i,
        evidence: scene.slice(0, 160),
      });
    }
  }

  const seen = new Set<string>();
  const unique = violations.filter((v) => {
    const k = `${v.code}:${v.sceneIndex ?? ""}:${v.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const passed = unique.length === 0;
  return {
    passed,
    version: PRODUCT_DEMONSTRATION_INTEGRITY_VERSION,
    primaryActor,
    productDemonstration: demo,
    violations: unique,
    summary: passed
      ? "product_demonstration_integrity_passed"
      : unique.map((v) => v.code).join(","),
  };
}

export function buildProductDemonstrationPromptBlock(
  winner: CreativeCandidate,
): string {
  const primary = derivePrimaryActor(winner);
  const dna = normalizeCreativeDNA(winner.creativeDNA);

  return [
    `${PRODUCT_DEMONSTRATION_INTEGRITY_PROMPT_HEADER} (${PRODUCT_DEMONSTRATION_INTEGRITY_VERSION}):`,
    "",
    "PRODUCT PRESENTATION (Product Presentation Decision is the authority):",
    "  Deliver visible value proof appropriate to the package — authentic product asset,",
    "  world/outcome visual, abstract mechanism, brand signal, or story without product pixels.",
    "  Do NOT invent synthetic product UI, fake dashboards, or generic chat-as-product.",
    "  Do NOT emit legacy PRODUCT_DEMO / controlled-chat scene types.",
    "  A landing page alone is not authentic product proof.",
    "",
    "PRIMARY_ACTOR (locked for person scenes):",
    `  ${primary.label}`,
    `  Continuity anchors: ${primary.continuityAnchors.join(", ") || "(opening subject)"}`,
    "  Phone close-ups and UI-only scenes do not need the actor's face.",
    "  Forbidden: introducing a different human identity without narrative reason.",
    "",
    `Selected product role: ${dna?.productRole || winner.productConnection}`,
    `Selected ending intent: ${dna?.endingIntent || winner.ending}`,
  ].join("\n");
}

export function productDemonstrationRepairAppendix(
  winner: CreativeCandidate,
  integrity: ProductDemonstrationIntegrityResult,
): string {
  const primary = integrity.primaryActor;
  return [
    "PRODUCT PRESENTATION INTEGRITY REPAIR (mandatory — previous draft failed):",
    `Failure codes: ${integrity.violations.map((v) => v.code).join(", ")}`,
    ...integrity.violations.map(
      (v) =>
        `- ${v.code}${v.sceneIndex != null ? ` (scene ${v.sceneIndex})` : ""}: ${v.message}${v.evidence ? ` | evidence: ${v.evidence}` : ""}`,
    ),
    "",
    `PRIMARY_ACTOR (must stay locked for person scenes): ${primary.label}`,
    `Opening situation: ${winner.openingSituation}`,
    "",
    "Fix identity continuity and remove floating-icon fake interactions.",
    "Value proof must follow Product Presentation Decision — no synthetic product UI.",
  ].join("\n");
}

export function productDemonstrationValidationIssues(
  integrity: ProductDemonstrationIntegrityResult,
): Array<{ path: string; message: string }> {
  return integrity.violations.map((v) => ({
    path: `product_demonstration_integrity.${v.code}${v.sceneIndex != null ? `.scene_${v.sceneIndex}` : ""}`,
    message: v.evidence ? `${v.message} (${v.evidence})` : v.message,
  }));
}
