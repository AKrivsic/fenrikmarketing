/**
 * Sprint 4C — Product Demonstration Integrity
 *
 * Separate hard gate from Story Integrity (4A). Selection and platform writing
 * are untouched. This layer forces finished packages to *visually* demonstrate
 * the product: Question → Visible AI answer → Visible outcome — with one
 * continuous PRIMARY_ACTOR — instead of narration claims or lifestyle smiles.
 */

import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import { normalizeCreativeDNA } from "@/lib/creative-candidates/creativeDNA";

export const PRODUCT_DEMONSTRATION_INTEGRITY_VERSION =
  "product-demonstration-integrity@1" as const;
export const PRODUCT_DEMONSTRATION_INTEGRITY_PROMPT_HEADER =
  "PRODUCT DEMONSTRATION INTEGRITY";

export type ProductDemoIntegrityViolationCode =
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

/** Negation window: reject matches preceded by no/not/without/empty/absent/never. */
function hasPositiveMatch(text: string, pattern: RegExp): boolean {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 28), m.index).toLowerCase();
    if (
      /\b(no|not|without|empty|absent|never|zero|none|un)\s*$/i.test(before) ||
      /\bun-?/i.test(before.slice(-4))
    ) {
      continue;
    }
    // "unanswered" / "no reply bubble" / "empty reply space"
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

/** Visual ask: someone typing/sending a question into chat/website/phone. */
const ASK_VISUAL_RE =
  /\b((send(s|ing|t)?|typ(es|ing|ed)|ask(s|ed|ing)?|compos(es|ing|ed)|submits?)\b.{0,40}\b(question|message|inquiry|booking)|question.{0,30}\b(into|to|on)\b.{0,20}\b(website|chat|phone|smartphone)|chat (thread|message|bubble).{0,30}\b(sent|sending|typed)|urgent question|visitor('s)? (question|message)|message bubble)\b/i;

/** Visual AI answer — explicit product reply state on screen (not "no reply"). */
const ANSWER_VISUAL_RE =
  /\b((ai |instant )?(reply|response) (bubble )?appears|reply bubble appears|ai (chatbot|assistant) (replies|answers|responds)|chatbot (replies|answers|responds)|website (chat )?answers|answered chat|helpful (ai )?reply|on-?brand (ai )?reply|instant (ai )?response|chat widget.{0,40}(replies|answers|responds)|ai response appears|response appears instantly)\b/i;

/** Visual commercial result — capture / confirm / continue (not bare "lead"). */
const RESULT_VISUAL_RE =
  /\b((booking|appointment|availability) (confirm(ed|s|ation)?|captured)|confirm(s|ed|ation)?.{0,20}(booking|appointment|availability)|lead (is )?captur(ed|es|ing)|name and email|contact (detail|info).{0,20}(captur|saved|left)|visitor (stays|replies|continues|books)|conversation continues|ready to book|gets? an answer|answered question)\b/i;

/** Narration-only crutches that must not satisfy visual demo alone. */
const NARRATION_PRODUCT_CLAIM_RE =
  /\b(fenrik\.?chat answers|answers for you|ai assistant (on your website )?answers)\b/i;

/** Fake success / non-demo resolution. */
const FAKE_SUCCESS_RE =
  /\b((small |quiet(ly)? )?smile|smiling|quietly pleased|pleased expression|success pose|celebration|celebrating|relieved smile|happy expression|look of relief)\b/i;

const FLOATING_ICON_RE =
  /\b(floating (chat |speech |message )?(icon|bubble|sticker)|chat (icon|sticker) floating|notification sticker|abstract (notification|shape) suggesting|soft notification indicator|glowing (chat |speech )?bubble floating)\b/i;

const CONVERSATION_WORLD_RE =
  /\b(phone|smartphone|chat|message|reply|thread|website|screen|visitor|customer|hand|hands)\b/i;

/**
 * Derive a locked PRIMARY_ACTOR for the package from Creative DNA / opening.
 */
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
    continuityAnchors.push(...blob.split(" ").filter((w) => w.length > 4).slice(0, 4));
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

function sceneHasContinuity(
  scene: string,
  primary: PrimaryActorSpec,
): boolean {
  const n = normalize(scene);
  if (/\bsame (person|visitor|customer|hands|actor|phone|conversation|thread)\b/.test(n)) {
    return true;
  }
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

  // New full human subject replacing hands-first openers.
  const newProfessionalFigure =
    /\b(professional figure|business-casual|suited (man|woman|figure)|man in a (suit|blazer)|woman in a (suit|blazer))\b/.test(
      n,
    ) &&
    primary.lockedAttributes.includes("hands_focus") &&
    !/\bsame (person|visitor|customer|hands)\b/.test(n) &&
    !/\b(visitor|customer).{0,20}hands\b/.test(n);

  if (newProfessionalFigure) return true;

  // Attribute conflicts vs opening (gender / formal attire / glasses suddenly appear).
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

  // Formal attire appears when opening was casual hands / no formal lock.
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
 * Semantic product demonstration — visuals only for answer/result.
 * Voiceover may support ask, but cannot alone prove answer or result.
 */
export function detectSemanticProductDemonstration(args: {
  sceneTexts: readonly string[];
  voiceoverText: string;
  winner: CreativeCandidate;
}): SemanticProductDemonstrationCheck {
  const evidence: string[] = [];
  const narrationOnlySignals: string[] = [];
  const scenes = args.sceneTexts;
  const vo = args.voiceoverText ?? "";

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
    // Opening situation may establish ask intent; still prefer a visual scene.
    evidence.push("ask_from_opening_situation");
  }

  // Narration-only answer/result are explicitly insufficient.
  if (answerSceneIndex == null) {
    if (hasPositiveMatch(vo, ANSWER_VISUAL_RE) || NARRATION_PRODUCT_CLAIM_RE.test(vo)) {
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

  // Ask and answer must share conversation world (phone/chat continuity).
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
  };
}

/**
 * Hard Product Demonstration Integrity validation (Sprint 4C).
 */
export function validateProductDemonstrationIntegrity(args: {
  winner: CreativeCandidate;
  voiceoverText: string;
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
}): ProductDemonstrationIntegrityResult {
  const violations: ProductDemoIntegrityViolation[] = [];
  const scenes = scenePromptTexts(args);
  const vo = args.voiceoverText ?? "";
  const primaryActor = derivePrimaryActor(args.winner);
  const demo = detectSemanticProductDemonstration({
    sceneTexts: scenes,
    voiceoverText: vo,
    winner: args.winner,
  });

  // --- primary actor ---
  if (scenes.length === 0) {
    violations.push({
      code: "primary_actor_missing",
      message: "No visual scenes to lock PRIMARY_ACTOR",
      evidence: primaryActor.label,
    });
  } else {
    const opening = scenes[0] ?? "";
    if (!sceneHasContinuity(opening, primaryActor)) {
      violations.push({
        code: "primary_actor_missing",
        message: `Opening scene does not establish PRIMARY_ACTOR: ${primaryActor.label}`,
        sceneIndex: 0,
        evidence: primaryActor.continuityAnchors.join(", "),
      });
    }
    for (let i = 1; i < scenes.length; i++) {
      const scene = scenes[i] ?? "";
      if (isLandingPageScene(scene)) continue;
      if (sceneIntroducesConflictingIdentity(scene, primaryActor, opening)) {
        violations.push({
          code: "primary_actor_identity_changed",
          message:
            "Scene changes PRIMARY_ACTOR identity (gender/age/face/profession) without narrative continuity",
          sceneIndex: i,
          evidence: scene.slice(0, 160),
        });
        continue;
      }
      // Phone-only UI closes are OK if conversation world continues.
      const phoneOnlyUi =
        CONVERSATION_WORLD_RE.test(scene) &&
        !/\b(professional figure|suited|blazer|furrowed brow|smiling)\b/i.test(
          scene,
        );
      if (!sceneHasContinuity(scene, primaryActor) && !phoneOnlyUi) {
        violations.push({
          code: "primary_actor_identity_changed",
          message:
            "Scene abandons PRIMARY_ACTOR / same conversation without continuity language",
          sceneIndex: i,
          evidence: scene.slice(0, 160),
        });
      }
    }
  }

  // --- visual ask / answer / result ---
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

  if (
    demo.askSceneIndex != null &&
    demo.answerSceneIndex != null &&
    !demo.evidence.includes("ask_answer_same_conversation_world")
  ) {
    violations.push({
      code: "ask_answer_disconnected",
      message:
        "Question and AI answer are not visually connected in the same conversation world",
      evidence: `ask:${demo.askSceneIndex},answer:${demo.answerSceneIndex}`,
    });
  }

  if (demo.landingPageOnly) {
    violations.push({
      code: "landing_page_is_not_demo",
      message: "Landing page / pricing hero is not a product demonstration",
      sceneIndex: scenes.length - 1,
    });
  }

  // --- fake success / floating icon / resolution ---
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
    const fakeOnly =
      FAKE_SUCCESS_RE.test(resolution) &&
      !solvesVisually;
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
    "Every video package MUST visually demonstrate the product. Narration claims are not enough.",
    "",
    "Required visual sequence across image_prompts / visual_scenes:",
    "  Question → Waiting (optional) → Visible AI answer → Visible useful result → CTA",
    "",
    "PRIMARY_ACTOR (locked for this package):",
    `  ${primary.label}`,
    `  Continuity anchors: ${primary.continuityAnchors.join(", ") || "(opening subject)"}`,
    "  The SAME person must appear throughout. Do NOT change gender, age, face, or profession.",
    "  Every image_prompt must keep this actor OR continue the same phone/conversation they started.",
    "  Forbidden: a new professional / suited figure replacing the opening subject for variety.",
    "",
    "RESOLUTION scene (final non-CTA still) MUST show the product solving the problem.",
    "ALLOWED resolution visuals:",
    "  - AI reply appears on the same chat/phone",
    "  - booking / appointment / availability confirmation",
    "  - visitor receives information / conversation continues",
    "  - lead captured (name/email affordance as blurred UI structure)",
    "NOT ALLOWED as resolution:",
    "  - generic smile / pleased expression / success pose / celebration",
    "  - floating chat icon or abstract notification sticker",
    "  - landing page / pricing hero alone",
    "  - implying success without showing the interaction",
    "",
    "IMAGE PROMPT CONTINUITY (mandatory):",
    "  - same PRIMARY_ACTOR",
    "  - same phone / chat thread when the story is handheld",
    "  - same environment OR a logically connected location already in storyProgression",
    "  - conversation PROGRESSING (sent → waiting → AI reply → result) — not a new lifestyle photo each beat",
    "",
    "UI WITHOUT GARBLED TEXT:",
    "  Show chat as structured bubbles / reply state / confirmation layout.",
    "  Prefer blurred or abstract glyph shapes that still read as ask→answer→result.",
    "  Do NOT invent readable words — but DO show the interaction structure.",
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
    `PRIMARY_ACTOR (must stay locked): ${primary.label}`,
    `Opening situation: ${winner.openingSituation}`,
    `Product connection: ${winner.productConnection}`,
    `Ending: ${winner.ending}`,
    "",
    "Regenerate visual_scenes + image_prompts so that:",
    "1. One continuous PRIMARY_ACTOR (no new face/profession swaps).",
    "2. Visual Question beat (typing/sending into chat).",
    "3. Visual AI answer on the SAME phone/conversation (reply appears).",
    "4. Visual outcome (booking confirm / lead capture / conversation continues).",
    "5. Resolution is NOT a smile, floating icon, or landing page.",
    "6. Voiceover may explain — it must NOT be the only place the answer/result exists.",
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
