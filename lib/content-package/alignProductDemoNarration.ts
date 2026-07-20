/**
 * Align voiceover (and video.script notes) with a structured PRODUCT_DEMO scene.
 *
 * When the demo visual already shows AI answering / lead capture, narration must
 * not keep describing unanswered silence or a dead contact form over that beat.
 * Deterministic — no LLM, no Product Brain / strategy changes.
 */

import { extractProductDemoBeat } from "@/lib/scene-types/product-demo/productDemoBeat";
import type { ProductDemoBeat } from "@/lib/scene-types/product-demo/productDemoBeat";

/** Problem-state language that must not narrate over a visible PRODUCT_DEMO. */
const PROBLEM_OVER_DEMO_RE =
  /\b(contact form|sitting there|quietly losing|unanswered|no (?:reply|answer|record|alert)|never saw it|waiting\.?\s*nothing)\b/i;

/** Prefer replacing these when choosing which late sentence to rewrite. */
const STRONG_PROBLEM_OVER_DEMO_RE =
  /\b(contact form|sitting there|quietly losing|unanswered|no (?:reply|answer|record|alert))\b/i;

const SOLUTION_NARRATION_RE =
  /\b(ai (?:assistant|chatbot)|assistant (?:replies|answers)|chatbot|website answers|gets? (?:a |an )?answer|reply appears|answers? (?:instantly|immediately|in real time)|lead (?:is )?captured|books?(?: a| an)?|replies with)\b/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function packageHasProductDemoScene(
  visualScenes: readonly unknown[] | null | undefined,
): boolean {
  for (const s of visualScenes ?? []) {
    const r = asRecord(s);
    if (String(r?.type ?? "").toUpperCase() === "PRODUCT_DEMO") return true;
  }
  return false;
}

export function splitVoiceoverSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinSentences(parts: string[]): string {
  return parts
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Build a short spoken solution line from the structured demo beat. */
export function buildProductDemoSolutionNarration(
  beat: ProductDemoBeat | null,
): string {
  const outcome = beat?.outcome_type;
  if (outcome === "booking_confirmed") {
    return "Then the website answers — the visitor gets a reply and books.";
  }
  if (outcome === "question_resolved") {
    return "Then the website answers — the visitor gets a clear reply in the chat.";
  }
  if (outcome === "contact_captured" || outcome === "lead_captured") {
    return "Then the website answers — the visitor gets a reply and the lead is captured.";
  }
  return "Then the website answers — the visitor gets a reply while the business is closed.";
}

export function voiceoverLacksProductDemoSolution(voiceoverText: string): boolean {
  return !SOLUTION_NARRATION_RE.test(voiceoverText);
}

/**
 * True when PRODUCT_DEMO is present and VO either lacks solution language or
 * still narrates problem-state over the late (demo) portion of the script.
 */
export function voiceoverContradictsProductDemo(args: {
  voiceoverText: string;
  visualScenes?: readonly unknown[] | null;
}): boolean {
  if (!packageHasProductDemoScene(args.visualScenes)) return false;
  const vo = args.voiceoverText.trim();
  if (!vo) return false;
  if (voiceoverLacksProductDemoSolution(vo)) return true;

  const sentences = splitVoiceoverSentences(vo);
  if (sentences.length < 3) return false;
  // Latter half must not keep narrating problem-state once a demo exists,
  // even if a solution line was also inserted elsewhere.
  const start = Math.floor(sentences.length / 2);
  const late = sentences.slice(start);
  return late.some((s) => PROBLEM_OVER_DEMO_RE.test(s));
}

function scrubScriptProductDemoVoiceover(
  script: string,
  solutionLine: string,
): string {
  // Voiceover may sit on the same line as "PRODUCT DEMO" or on following lines.
  return script.replace(
    /(PRODUCT\s+DEMO[\s\S]*?Voiceover:\s*['"])([^'"]+)(['"])/gi,
    (full, pre: string, vo: string, post: string) => {
      if (PROBLEM_OVER_DEMO_RE.test(vo) && !SOLUTION_NARRATION_RE.test(vo)) {
        return `${pre}${solutionLine}${post}`;
      }
      return full;
    },
  );
}

function scrubScriptOnScreenCtaClaims(script: string): string {
  return script
    .replace(/\s*CTA text on screen\.?/gi, "")
    .replace(/\s*CTA on screen\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

export interface AlignProductDemoNarrationResult {
  voiceover_text: string;
  script: string | null;
  changed: boolean;
  reasons: string[];
}

/**
 * Ensure PRODUCT_DEMO visuals and voiceover tell the same story.
 * Also strips "CTA text on screen" script claims when no typed CTA scene exists
 * (CTA source-of-truth hygiene — see alignOnScreenCtaContract).
 */
export function alignProductDemoNarration(args: {
  voiceoverText: string;
  visualScenes?: readonly unknown[] | null;
  videoScript?: string | null;
}): AlignProductDemoNarrationResult {
  const reasons: string[] = [];
  let voiceover_text = args.voiceoverText.trim();
  let script =
    typeof args.videoScript === "string" ? args.videoScript : null;

  const hasDemo = packageHasProductDemoScene(args.visualScenes);
  const beat = extractProductDemoBeat({ visualScenes: args.visualScenes });
  const solutionLine = buildProductDemoSolutionNarration(beat);

  if (hasDemo && voiceoverContradictsProductDemo({
    voiceoverText: voiceover_text,
    visualScenes: args.visualScenes,
  })) {
    const sentences = splitVoiceoverSentences(voiceover_text);
    const start = Math.max(1, Math.floor(sentences.length / 2));

    const lateProblemIndexes = (): number[] => {
      const strong: number[] = [];
      const weak: number[] = [];
      for (let i = start; i < sentences.length; i++) {
        const s = sentences[i]!;
        if (SOLUTION_NARRATION_RE.test(s)) continue;
        if (STRONG_PROBLEM_OVER_DEMO_RE.test(s)) strong.push(i);
        else if (PROBLEM_OVER_DEMO_RE.test(s)) weak.push(i);
      }
      // Prefer last strong problem (closest to demo/close), then weak.
      return [...strong.reverse(), ...weak.reverse()];
    };

    const targets = lateProblemIndexes();
    if (targets.length > 0) {
      const primary = targets[0]!;
      sentences[primary] = solutionLine;
      // Drop remaining late problem sentences (walk descending so indexes stay valid).
      for (const j of [...targets.slice(1)].sort((a, b) => b - a)) {
        if (j === primary) continue;
        if (j < 0 || j >= sentences.length) continue;
        if (
          PROBLEM_OVER_DEMO_RE.test(sentences[j]!) &&
          !SOLUTION_NARRATION_RE.test(sentences[j]!)
        ) {
          sentences.splice(j, 1);
        }
      }
      reasons.push("replaced_problem_narration_over_product_demo");
    } else {
      if (sentences.length >= 2) {
        sentences.splice(sentences.length - 1, 0, solutionLine);
      } else {
        sentences.push(solutionLine);
      }
      reasons.push("inserted_product_demo_solution_narration");
    }

    voiceover_text = joinSentences(sentences);
  }

  if (script && hasDemo) {
    const next = scrubScriptProductDemoVoiceover(script, solutionLine);
    if (next !== script) {
      script = next;
      reasons.push("scrubbed_script_product_demo_voiceover");
    }
  }

  return {
    voiceover_text,
    script,
    changed: reasons.length > 0,
    reasons,
  };
}

/** True when visual_scenes includes a typed CTA scene. */
export function packageHasTypedCtaScene(
  visualScenes: readonly unknown[] | null | undefined,
): boolean {
  for (const s of visualScenes ?? []) {
    const r = asRecord(s);
    if (String(r?.type ?? "").toUpperCase() === "CTA") return true;
  }
  return false;
}

/**
 * Single source of truth for on-screen CTA: typed CTA scene in visual_scenes.
 * When absent, strip script claims that invent an on-screen CTA.
 */
export function alignOnScreenCtaContract(args: {
  videoScript?: string | null;
  visualScenes?: readonly unknown[] | null;
}): { script: string | null; changed: boolean; reason: string | null } {
  const script =
    typeof args.videoScript === "string" ? args.videoScript : null;
  if (!script) {
    return { script: null, changed: false, reason: null };
  }
  if (packageHasTypedCtaScene(args.visualScenes)) {
    return { script, changed: false, reason: null };
  }
  if (!/CTA\s+(text\s+)?on\s+screen/i.test(script)) {
    return { script, changed: false, reason: null };
  }
  return {
    script: scrubScriptOnScreenCtaClaims(script),
    changed: true,
    reason: "removed_onscreen_cta_claim_without_typed_cta_scene",
  };
}
