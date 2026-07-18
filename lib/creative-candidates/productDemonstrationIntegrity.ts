/**
 * Sprint 4C.1 — Product Demonstration Integrity
 *
 * Structured product_demo beat is the source of truth.
 * Prose regex is secondary diagnostics only.
 */

import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import { normalizeCreativeDNA } from "@/lib/creative-candidates/creativeDNA";
import {
  extractProductDemoBeat,
  type ProductDemoBeat,
} from "@/lib/scene-types/product-demo/productDemoBeat";
import {
  assertProductDemoRenderable,
  isUiOnlyProductDemoScene,
} from "@/lib/scene-types/product-demo/ensureStructuredProductDemo";

export const PRODUCT_DEMONSTRATION_INTEGRITY_VERSION =
  "product-demonstration-integrity@2" as const;
export const PRODUCT_DEMONSTRATION_INTEGRITY_PROMPT_HEADER =
  "PRODUCT DEMONSTRATION INTEGRITY";

export type ProductDemoIntegrityViolationCode =
  | "structured_beat_missing"
  | "structured_question_missing"
  | "structured_answer_missing"
  | "structured_outcome_missing"
  | "component_capture_not_renderable"
  | "product_demo_scene_missing"
  | "ask_not_visual"
  | "answer_not_visual"
  | "answer_narration_only"
  | "result_not_visual"
  | "result_narration_only"
  | "ask_answer_disconnected"
  | "fake_success_resolution"
  | "floating_icon_replaces_interaction"
  | "landing_page_is_not_demo"
  | "primary_actor_missing"
  | "primary_actor_identity_changed"
  | "resolution_not_product_solving";

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
  /** Structured beat present (source of truth). */
  structuredBeatPresent: boolean;
  structuredBeat: ProductDemoBeat | null;
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
    if (String(r.type ?? "").toUpperCase() === "PRODUCT_DEMO") {
      const beat = extractProductDemoBeat({ visualScenes: [s] });
      if (beat) {
        fromScenes.push(
          [
            "PRODUCT_DEMO controlled chat",
            beat.visitor_question,
            beat.ai_answer,
            beat.outcome_label,
            beat.outcome_type,
          ].join(" | "),
        );
        continue;
      }
    }
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

function hasPositiveMatch(text: string, pattern: RegExp): boolean {
  const re = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 28), m.index).toLowerCase();
    if (
      /\b(no|not|without|empty|absent|never|zero|none|un)\s*$/i.test(before) ||
      /\bun-?/i.test(before.slice(-4))
    ) {
      continue;
    }
    const around = text
      .slice(Math.max(0, m.index - 12), m.index + m[0].length + 8)
      .toLowerCase();
    if (
      /\b(unanswered|no reply|no answer|empty reply|without (a )?reply|still waiting|nothing back)\b/.test(
        around,
      )
    ) {
      continue;
    }
    return true;
  }
  return false;
}

const ASK_VISUAL_RE =
  /\b((send(s|ing|t)?|typ(es|ing|ed)|ask(s|ed|ing)?|compos(es|ing|ed)|submits?)\b.{0,40}\b(question|message|inquiry|booking)|question.{0,30}\b(into|to|on)\b.{0,20}\b(website|chat|phone|smartphone)|chat (thread|message|bubble).{0,30}\b(sent|sending|typed)|urgent question|visitor('s)? (question|message)|message bubble|product_demo controlled chat)\b/i;

const ANSWER_VISUAL_RE =
  /\b((ai |instant )?(reply|response) (bubble )?appears|reply bubble appears|ai (chatbot|assistant) (replies|answers|responds)|chatbot (replies|answers|responds)|website (chat )?answers|answered chat|helpful (ai )?reply|on-?brand (ai )?reply|instant (ai )?response|chat widget.{0,40}(replies|answers|responds)|ai response appears|response appears instantly|product_demo controlled chat)\b/i;

const RESULT_VISUAL_RE =
  /\b((booking|appointment|availability) (confirm(ed|s|ation)?|captured)|confirm(s|ed|ation)?.{0,20}(booking|appointment|availability)|lead (is )?captur(ed|es|ing)|name and email|contact (detail|info).{0,20}(captur|saved|left)|visitor (stays|replies|continues|books)|conversation continues|ready to book|gets? an answer|answered question|lead_captured|booking_confirmed|question_resolved|contact_captured|product_demo controlled chat)\b/i;

const NARRATION_PRODUCT_CLAIM_RE =
  /\b(fenrik\.?chat answers|answers for you|ai assistant (on your website )?answers)\b/i;

const FAKE_SUCCESS_RE =
  /\b((small |quiet(ly)? )?smile|smiling|quietly pleased|pleased expression|success pose|celebration|celebrating|relieved smile|happy expression|look of relief)\b/i;

const FLOATING_ICON_RE =
  /\b(floating (chat |speech |message )?(icon|bubble|sticker)|chat (icon|sticker) floating|notification sticker|abstract (notification|shape) suggesting|soft notification indicator|glowing (chat |speech )?bubble floating)\b/i;

const CONVERSATION_WORLD_RE =
  /\b(phone|smartphone|chat|message|reply|thread|website|screen|visitor|customer|hand|hands|product_demo)\b/i;

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

function sceneHasContinuity(scene: string, primary: PrimaryActorSpec): boolean {
  const n = normalize(scene);
  if (/\bsame (person|visitor|customer|hands|actor|phone|conversation|thread)\b/.test(n)) {
    return true;
  }
  if (/\bproduct_demo controlled chat\b/.test(n)) return true;
  const hits = primary.continuityAnchors.filter((a) => n.includes(a));
  if (hits.length >= 1 && CONVERSATION_WORLD_RE.test(scene)) return true;
  if (hits.length >= 2) return true;
  return false;
}

function sceneIntroducesConflictingIdentity(
  scene: string,
  primary: PrimaryActorSpec,
  openingScene: string,
): boolean {
  const n = normalize(scene);
  const open = normalize(openingScene);

  if (/\bproduct_demo controlled chat\b/.test(n)) return false;

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
    !primary.lockedAttributes.includes("formal_attire") &&
    /\b(navy (blue )?suit|necktie|blazer over)\b/.test(n) &&
    !/\bsame (person|visitor|customer)\b/.test(n) &&
    primary.lockedAttributes.includes("hands_focus")
  ) {
    return true;
  }

  return false;
}

/**
 * Secondary prose/semantic detector — diagnostics only when structured beat exists.
 */
export function detectSemanticProductDemonstration(args: {
  sceneTexts: readonly string[];
  voiceoverText: string;
  winner: CreativeCandidate;
  structuredBeat?: ProductDemoBeat | null;
}): SemanticProductDemonstrationCheck {
  const evidence: string[] = [];
  const narrationOnlySignals: string[] = [];
  const scenes = args.sceneTexts;
  const vo = args.voiceoverText ?? "";
  const structured = args.structuredBeat ?? null;

  if (structured) {
    evidence.push("structured_product_demo_beat");
    evidence.push(`outcome_type:${structured.outcome_type}`);
    return {
      present: true,
      askPresent: structured.question_visible === true,
      answerPresent: structured.ai_answer_visible === true,
      resultPresent: structured.outcome_visible === true,
      askSceneIndex: scenes.findIndex((s) =>
        /\bproduct_demo controlled chat\b/i.test(s),
      ),
      answerSceneIndex: scenes.findIndex((s) =>
        /\bproduct_demo controlled chat\b/i.test(s),
      ),
      resultSceneIndex: scenes.findIndex((s) =>
        /\bproduct_demo controlled chat\b/i.test(s),
      ),
      landingPageOnly: false,
      narrationOnlySignals: [],
      evidence,
      structuredBeatPresent: true,
      structuredBeat: structured,
    };
  }

  let askSceneIndex: number | null = null;
  let answerSceneIndex: number | null = null;
  let resultSceneIndex: number | null = null;

  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i] ?? "";
    if (isLandingPageScene(s)) continue;
    if (askSceneIndex == null && hasPositiveMatch(s, ASK_VISUAL_RE)) {
      askSceneIndex = i;
      evidence.push(`ask_visual:scene_${i}`);
    }
    if (answerSceneIndex == null && hasPositiveMatch(s, ANSWER_VISUAL_RE)) {
      answerSceneIndex = i;
      evidence.push(`answer_visual:scene_${i}`);
    }
    if (resultSceneIndex == null && hasPositiveMatch(s, RESULT_VISUAL_RE)) {
      resultSceneIndex = i;
      evidence.push(`result_visual:scene_${i}`);
    }
  }

  const askPresent =
    askSceneIndex != null ||
    hasPositiveMatch(args.winner.openingSituation, ASK_VISUAL_RE);
  if (askPresent && askSceneIndex == null) {
    evidence.push("ask_from_opening_situation");
  }

  if (answerSceneIndex == null) {
    if (
      hasPositiveMatch(vo, ANSWER_VISUAL_RE) ||
      NARRATION_PRODUCT_CLAIM_RE.test(vo)
    ) {
      narrationOnlySignals.push("answer_in_voiceover_only");
    }
  }
  if (resultSceneIndex == null) {
    if (hasPositiveMatch(vo, RESULT_VISUAL_RE)) {
      narrationOnlySignals.push("result_in_voiceover_only");
    }
  }

  const answerPresent = answerSceneIndex != null;
  const resultPresent = resultSceneIndex != null;

  const last = scenes[scenes.length - 1] ?? "";
  const lastIsLanding = isLandingPageScene(last);
  const landingPageOnly = lastIsLanding && !answerPresent;
  if (landingPageOnly) evidence.push("landing_page_only");

  let connected = true;
  if (askSceneIndex != null && answerSceneIndex != null) {
    const askScene = scenes[askSceneIndex] ?? "";
    const answerScene = scenes[answerSceneIndex] ?? "";
    connected =
      CONVERSATION_WORLD_RE.test(askScene) &&
      CONVERSATION_WORLD_RE.test(answerScene);
    if (connected) evidence.push("ask_answer_same_conversation_world");
  } else if (answerPresent) {
    connected = CONVERSATION_WORLD_RE.test(scenes[answerSceneIndex!] ?? "");
  }

  const present =
    askPresent &&
    answerPresent &&
    resultPresent &&
    connected &&
    !landingPageOnly &&
    narrationOnlySignals.length === 0;

  return {
    present,
    askPresent,
    answerPresent,
    resultPresent,
    askSceneIndex,
    answerSceneIndex,
    resultSceneIndex,
    landingPageOnly,
    narrationOnlySignals,
    evidence,
    structuredBeatPresent: false,
    structuredBeat: null,
  };
}

/**
 * Hard Product Demonstration Integrity (Sprint 4C.1 — structured-first).
 */
export function validateProductDemonstrationIntegrity(args: {
  winner: CreativeCandidate;
  voiceoverText: string;
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
  productDemo?: unknown;
}): ProductDemonstrationIntegrityResult {
  const violations: ProductDemoIntegrityViolation[] = [];
  const scenes = scenePromptTexts(args);
  const vo = args.voiceoverText ?? "";
  const primaryActor = derivePrimaryActor(args.winner);

  const structuredBeat = extractProductDemoBeat({
    visualScenes: args.visualScenes,
    productDemo: args.productDemo,
  });

  const demo = detectSemanticProductDemonstration({
    sceneTexts: scenes,
    voiceoverText: vo,
    winner: args.winner,
    structuredBeat,
  });

  // --- structured source of truth ---
  if (!structuredBeat) {
    violations.push({
      code: "structured_beat_missing",
      message:
        "Missing structured product_demo beat (type, conversation_id, question/answer/outcome visibility)",
    });
  } else {
    if (structuredBeat.question_visible !== true || !structuredBeat.visitor_question) {
      violations.push({
        code: "structured_question_missing",
        message: "Structured product_demo missing visible visitor question",
      });
    }
    if (structuredBeat.ai_answer_visible !== true || !structuredBeat.ai_answer) {
      violations.push({
        code: "structured_answer_missing",
        message: "Structured product_demo missing visible AI answer",
      });
    }
    if (structuredBeat.outcome_visible !== true || !structuredBeat.outcome_type) {
      violations.push({
        code: "structured_outcome_missing",
        message: "Structured product_demo missing visible outcome",
      });
    }

    const renderable = assertProductDemoRenderable(structuredBeat);
    if (!renderable.ok) {
      violations.push({
        code: "component_capture_not_renderable",
        message: `Product demo chat visual cannot be rendered: ${renderable.reason}`,
        evidence: renderable.reason,
      });
    }

    const hasDemoScene = (args.visualScenes ?? []).some((s) => {
      const r = asRecord(s);
      return String(r?.type ?? "").toUpperCase() === "PRODUCT_DEMO";
    });
    if (!hasDemoScene) {
      violations.push({
        code: "product_demo_scene_missing",
        message: "Final storyboard must include a PRODUCT_DEMO scene",
      });
    }
  }

  // --- PRIMARY_ACTOR: fail only on conflicting human identity ---
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
      // Phone close-ups / UI-only / PRODUCT_DEMO do not need the actor's face.
      if (entry && isUiOnlyProductDemoScene(entry)) continue;
      if (/\bproduct_demo controlled chat\b/i.test(scene)) continue;

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

  // --- secondary prose bans (still hard when present) ---
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i] ?? "";
    if (/\bproduct_demo controlled chat\b/i.test(scene)) continue;
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

  // When structured beat is absent, keep prose diagnostics as failures.
  if (!structuredBeat) {
    if (!demo.askPresent) {
      violations.push({
        code: "ask_not_visual",
        message:
          "Missing visual Question beat (visitor typing/sending a question into chat/website)",
      });
    }
    if (!demo.answerPresent) {
      const narrationOnly = demo.narrationOnlySignals.includes(
        "answer_in_voiceover_only",
      );
      violations.push({
        code: narrationOnly ? "answer_narration_only" : "answer_not_visual",
        message: narrationOnly
          ? "AI answer exists only in narration — not in any visual scene"
          : "Missing visual AI answer beat (reply appearing on the same chat/phone)",
        evidence: demo.evidence.join(","),
      });
    }
    if (!demo.resultPresent) {
      const narrationOnly = demo.narrationOnlySignals.includes(
        "result_in_voiceover_only",
      );
      violations.push({
        code: narrationOnly ? "result_narration_only" : "result_not_visual",
        message: narrationOnly
          ? "Outcome exists only in narration — not in any visual scene"
          : "Missing visual outcome (booking/lead capture/continued conversation)",
        evidence: demo.evidence.join(","),
      });
    }
    if (demo.landingPageOnly) {
      violations.push({
        code: "landing_page_is_not_demo",
        message: "Landing page / pricing hero is not a product demonstration",
        sceneIndex: scenes.length - 1,
      });
    }

    const resolutionIdx =
      scenes.length === 0
        ? -1
        : (() => {
            for (let i = scenes.length - 1; i >= 0; i--) {
              if (!isLandingPageScene(scenes[i] ?? "")) return i;
            }
            return scenes.length - 1;
          })();

    if (resolutionIdx >= 0) {
      const resolution = scenes[resolutionIdx] ?? "";
      const solvesVisually =
        hasPositiveMatch(resolution, ANSWER_VISUAL_RE) ||
        hasPositiveMatch(resolution, RESULT_VISUAL_RE);
      const fakeOnly = FAKE_SUCCESS_RE.test(resolution) && !solvesVisually;
      if (fakeOnly) {
        violations.push({
          code: "fake_success_resolution",
          message:
            "Resolution is a smile / success pose without showing the product solving the problem",
          sceneIndex: resolutionIdx,
          evidence: resolution.slice(0, 160),
        });
      }
      if (!solvesVisually) {
        violations.push({
          code: "resolution_not_product_solving",
          message:
            "Resolution scene must show the product solving the problem (AI reply, booking confirmation, lead captured, conversation continues)",
          sceneIndex: resolutionIdx,
          evidence: resolution.slice(0, 160),
        });
      }
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
    "Every video package MUST include a structured product demonstration.",
    "",
    "REQUIRED structured beat (source of truth — not prose):",
    "  type: product_demo",
    "  actor_id: primary_actor",
    "  conversation_id: stable id for this thread",
    "  question_visible: true",
    "  ai_answer_visible: true",
    "  outcome_visible: true",
    "  outcome_type: lead_captured | booking_confirmed | question_resolved | contact_captured",
    "  visitor_question / ai_answer / outcome_label: concrete strings",
    "",
    "Include one visual_scenes entry:",
    '  { "type": "PRODUCT_DEMO", "payload": { ...product_demo fields } }',
    "The PRODUCT_DEMO scene is rendered as a controlled Fenrik chat UI",
    "(component-capture / deterministic raster) — do NOT invent empty bubbles,",
    "floating chat icons, smile-only results, logo-only, or landing-page-only demos.",
    "",
    "PRIMARY_ACTOR (locked for person scenes):",
    `  ${primary.label}`,
    `  Continuity anchors: ${primary.continuityAnchors.join(", ") || "(opening subject)"}`,
    "  Phone close-ups and UI-only PRODUCT_DEMO scenes do not need the actor's face.",
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
    "PRODUCT DEMONSTRATION INTEGRITY REPAIR (mandatory — previous draft failed):",
    `Failure codes: ${integrity.violations.map((v) => v.code).join(", ")}`,
    ...integrity.violations.map(
      (v) =>
        `- ${v.code}${v.sceneIndex != null ? ` (scene ${v.sceneIndex})` : ""}: ${v.message}${v.evidence ? ` | evidence: ${v.evidence}` : ""}`,
    ),
    "",
    `PRIMARY_ACTOR (must stay locked for person scenes): ${primary.label}`,
    `Opening situation: ${winner.openingSituation}`,
    "",
    "Replace the failing resolution with ONE complete PRODUCT_DEMO scene:",
    "  structured product_demo beat + controlled chat visual (question, AI answer, outcome).",
    "Do not rely on prose alone. Do not use smile / floating icon / landing page as the demo.",
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
