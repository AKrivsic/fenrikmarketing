/** Hard genericity rejection for complete creative concepts. */

export const GENERIC_CONCEPT_PATTERNS: readonly RegExp[] = [
  /\bperson\s+looking\s+at\s+(a\s+)?laptop\b/i,
  /\blooking\s+at\s+(a\s+)?(laptop|screen|monitor)\b/i,
  /\bperson\s+holding\s+(a\s+)?phone\b/i,
  /\bholding\s+(a\s+)?phone\b/i,
  /\bgeneric\s+office\s+stress\b/i,
  /\boffice\s+stress\b/i,
  /\bmeeting\s+room\b/i,
  /\bdashboard\b/i,
  /\bnotification(s)?\s+(shown|stack|pile)\b/i,
  /\bthinking\s+at\s+(a\s+)?desk\b/i,
  /\babstract\s+productivity\b/i,
  /\bbusiness\s+is\s+busy\b/i,
  /\bbusy\s+means\s+business\b/i,
  /\bcalm\s+explanatory\b/i,
  /\bB2B\s+montage\b/i,
  /\bexplainer\s+montage\b/i,
  /\bstaring\s+at\s+(a\s+)?(laptop|screen)\b/i,
  /\bmodern\s+office\s+desk\b/i,
  /\bcalm\s+desk\b/i,
  /\bperson\s+at\s+(a\s+)?desk\s+with\s+(a\s+)?laptop\b/i,
];

export const GENERIC_HOOK_OPENERS: readonly RegExp[] = [
  /^most\s+(service\s+)?business(es)?\b/i,
  /^let'?s\s+be\s+honest\b/i,
  /^in\s+today'?s\s+world\b/i,
  /^everyone\s+knows\b/i,
  /^here'?s\s+the\s+thing\b/i,
  /^did\s+you\s+know\b/i,
];

export const ESSAY_CADENCE_PATTERNS: readonly RegExp[] = [
  /\bthe\s+overlooked\s+detail\b/i,
  /\bwhat\s+this\s+really\s+means\b/i,
  /\bin\s+other\s+words\b/i,
  /\bat\s+the\s+end\s+of\s+the\s+day\b/i,
  /\bit'?s\s+important\s+to\s+(note|understand|remember)\b/i,
];

export function matchesGenericConcept(text: string): string | null {
  const t = text.trim();
  if (!t) return "empty_concept";
  // Ignore negated mentions ("not a calm desk") so scaffolds can warn against clichés.
  const cleaned = t.replace(/\bnot\s+(a\s+)?[^.\n]{0,40}\b/gi, " ");
  for (const re of GENERIC_CONCEPT_PATTERNS) {
    if (re.test(cleaned)) return re.source;
  }
  return null;
}

export function matchesGenericHookOpener(text: string): string | null {
  const t = text.trim();
  if (!t) return "empty_hook";
  for (const re of GENERIC_HOOK_OPENERS) {
    if (re.test(t)) return re.source;
  }
  return null;
}

export function matchesEssayCadence(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  for (const re of ESSAY_CADENCE_PATTERNS) {
    if (re.test(t)) return re.source;
  }
  return null;
}

/** Laptop/phone/office alone are props — reject when they ARE the concept. */
export function isPropAsConcept(candidateBlob: string): boolean {
  const t = candidateBlob.toLowerCase();
  const onlyProp =
    /\b(laptop|phone|office|desk|dashboard|meeting)\b/.test(t) &&
    !/\b(heat|heatwave|technician|customer|visitor|walk|leaving|missed|broken|cooling|robot|graveyard|banana|family|queue|overflow|after.?hours|midnight|competitor)\b/.test(
      t,
    );
  return onlyProp;
}
