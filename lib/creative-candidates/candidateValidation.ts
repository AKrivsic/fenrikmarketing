/**
 * Deterministic Creative Candidate self-check + repair (no LLM).
 */

import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import { stripCosmeticOpeningPrefixes } from "@/lib/creative-candidates/fidelityCheck";

export interface CandidateValidationResult {
  ok: boolean;
  reasons: string[];
  candidate: CreativeCandidate;
}

const LITERAL_NO_TEXT_RES: readonly RegExp[] = [
  /\b["“]seen["”]\b/i,
  /\bseen\b(?=\s+with\s+no\s+answer)/i,
  /\b["“]?Phone caller\s*#?\d+["”]?\b/i,
  /\bstuck on\s+["“]?Delayed["”]?\b/i,
  /\b["“]Delayed indefinitely["”]\b/i,
];

const LONG_TITLE_AS_PLACE =
  /\b(to|at|for)\s+The\s+[A-Z][^.]{40,}/;

/**
 * Validate + deterministically repair a candidate before prompt construction.
 */
export function validateAndRepairCandidate(
  candidate: CreativeCandidate,
  opts?: { productLabel?: string },
): CandidateValidationResult {
  const reasons: string[] = [];
  let next: CreativeCandidate = { ...candidate };

  let opening = stripCosmeticOpeningPrefixes(next.openingSituation ?? "").trim();
  let core = (next.coreIdea ?? "").trim();
  const hook = (next.hookLine ?? "").trim();

  if (!opening) {
    reasons.push("empty_opening");
    opening =
      "Close on a website visitor's hands on a contact form that is abandoned before send.";
  }
  if (!core) {
    reasons.push("empty_core_idea");
    core =
      opts?.productLabel
        ? `Unanswered website demand resolved when ${opts.productLabel} answers visitors the business cannot.`
        : "Unanswered website demand leaves real visitors with no way to follow up.";
  }

  // Replace literal NO_TEXT-hostile labels with visual intent.
  const beforeNoText = opening;
  opening = opening
    .replace(/\breply thread shows\s*["“]?seen["”]?\s*with no answer/gi, "reply thread shows a clear read-receipt indicator with no answer")
    .replace(/\b["“]seen["”]/gi, "read-receipt indicator")
    .replace(/\b["“]?Phone caller\s*#?\d+["”]?\b/gi, "phone-channel row")
    .replace(/\bstuck on\s*["“]?Delayed(?:\s+indefinitely)?["”]?/gi, "stuck on a delayed-status visual indicator")
    .replace(/\b["“]Delayed indefinitely["”]/gi, "delayed-status visual indicator")
    .replace(/\b["“]Website visitor["”]/gi, "website-visitor row");
  if (opening !== beforeNoText) {
    reasons.push("no_text_literal_repaired");
  }
  for (const re of LITERAL_NO_TEXT_RES) {
    if (re.test(opening)) {
      reasons.push("no_text_literal_remaining");
      break;
    }
  }

  if (LONG_TITLE_AS_PLACE.test(opening)) {
    reasons.push("strategy_title_as_location");
    opening = opening.replace(
      /\b(to|at|for)\s+The\s+[^.—,;]{40,}/g,
      "$1 the business",
    );
  }

  if (normalizeEq(opening) === normalizeEq(core)) {
    reasons.push("opening_equals_core");
    core = `Business idea: unanswered online demand — ${hook || "visitors leave without contact"} — solved without replacing the opening visual stakes.`;
  }

  if (!hook) {
    reasons.push("empty_hook");
  }

  next = {
    ...next,
    openingSituation: opening,
    coreIdea: core,
    hookLine: hook || next.hookLine,
  };

  const blocking = reasons.filter(
    (r) =>
      r === "empty_opening" ||
      r === "empty_core_idea" ||
      r === "no_text_literal_remaining",
  );
  // After repair, empty_opening/core should be fixed; remaining no_text is soft.
  return {
    ok: blocking.length === 0 || reasons.includes("no_text_literal_repaired"),
    reasons,
    candidate: next,
  };
}

function normalizeEq(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
