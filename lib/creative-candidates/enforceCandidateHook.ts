/**
 * Deterministic enforcement of the selected Creative Candidate hookLine onto
 * the package hook + first spoken voiceover line — no LLM.
 */

export interface EnforceCandidateHookResult {
  hook: string;
  voiceover_text: string;
  changed: boolean;
  reason: string;
}

/**
 * Force package hook to winner.hookLine and ensure voiceover opens with it.
 * Preserves the remainder of the voiceover; avoids duplicating the hook.
 */
export function enforceCandidateHook(args: {
  hookLine: string;
  hook: string;
  voiceoverText: string;
}): EnforceCandidateHookResult {
  const hookLine = (args.hookLine ?? "").trim();
  if (!hookLine) {
    return {
      hook: (args.hook ?? "").trim(),
      voiceover_text: (args.voiceoverText ?? "").trim(),
      changed: false,
      reason: "empty_hook_line",
    };
  }

  const canonical = canonicalizeHook(hookLine);
  const voiceover = (args.voiceoverText ?? "").trim();

  if (!voiceover) {
    return {
      hook: canonical,
      voiceover_text: canonical,
      changed:
        normalizeHook(args.hook) !== normalizeHook(canonical) ||
        !args.voiceoverText?.trim(),
      reason: "hook_applied_empty_voiceover",
    };
  }

  const voNorm = normalizeHook(voiceover);
  const canonNorm = normalizeHook(canonical);

  // Already opens with the canonical hook (allow punctuation/casing drift).
  if (voNorm.startsWith(canonNorm)) {
    const hookChanged = normalizeHook(args.hook) !== canonNorm;
    return {
      hook: canonical,
      voiceover_text: voiceover,
      changed: hookChanged,
      reason: hookChanged ? "hook_field_synced" : "already_enforced",
    };
  }

  // Strip a leading duplicated/near-duplicate opening sentence, then prepend.
  const opening = firstSpokenUnit(voiceover);
  let rest = voiceover;
  if (opening) {
    const openingNorm = normalizeHook(opening);
    // Drop the old opening when it is a different first thought (or a partial
    // / repeated copy of the canonical hook).
    if (
      openingNorm !== canonNorm &&
      !openingNorm.startsWith(canonNorm) &&
      !canonNorm.startsWith(openingNorm.slice(0, Math.min(24, openingNorm.length)))
    ) {
      rest = voiceover.slice(opening.length).replace(/^\s*[,;:—-]?\s*/, "");
    } else if (
      openingNorm.startsWith(canonNorm) ||
      canonNorm.startsWith(openingNorm)
    ) {
      // Near-match opening — replace with canonical phrasing, keep rest.
      rest = voiceover.slice(opening.length).replace(/^\s*[,;:—-]?\s*/, "");
    }
  }

  // Avoid "Hook. Hook. rest" if rest still starts with the same hook.
  if (normalizeHook(rest).startsWith(canonNorm)) {
    rest = stripLeadingHook(rest, canonical);
  }

  const rebuilt = rest
    ? `${canonical}${canonical.endsWith(".") || canonical.endsWith("!") || canonical.endsWith("?") ? " " : ". "}${rest}`
        .replace(/\s+/g, " ")
        .trim()
    : canonical;

  return {
    hook: canonical,
    voiceover_text: rebuilt,
    changed: true,
    reason: "hook_enforced_on_voiceover",
  };
}

function canonicalizeHook(hook: string): string {
  const t = hook.trim().replace(/\s+/g, " ");
  if (!t) return t;
  // Ensure terminal punctuation for spoken delivery consistency.
  if (/[.!?]$/.test(t)) return t;
  return `${t}.`;
}

function stripLeadingHook(text: string, hook: string): string {
  const vo = text.trim();
  const opening = firstSpokenUnit(vo);
  if (!opening) return vo;
  if (normalizeHook(opening).startsWith(normalizeHook(hook))) {
    return vo.slice(opening.length).replace(/^\s*[,;:—-]?\s*/, "");
  }
  return vo;
}

function firstSpokenUnit(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  if (m?.[1] && m[1].split(/\s+/).length <= 20) return m[1].trim();
  const words = trimmed.split(/\s+/);
  return words.slice(0, 14).join(" ");
}

export function normalizeHook(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D"']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
