/**
 * Reject raw situations that are generic B2B stock — stricter than full-candidate check.
 * A raw situation must be a concrete scene; office/laptop/phone-as-subject fails.
 */

export const RAW_GENERIC_PATTERNS: readonly RegExp[] = [
  /\bmodern\s+office\b/i,
  /\bcorporate\s+office\b/i,
  /\bopen\s+plan\s+office\b/i,
  /\bmeeting\s+room\b/i,
  /\bconference\s+room\b/i,
  /\bboardroom\b/i,
  /\bdashboard\b/i,
  /\badmin\s+panel\b/i,
  /\bstaring\s+at\s+(a\s+)?(laptop|screen|monitor)\b/i,
  /\blooking\s+at\s+(a\s+)?(laptop|screen|monitor)\b/i,
  /\bperson\s+at\s+(a\s+)?desk\s+with\s+(a\s+)?laptop\b/i,
  /\bholding\s+(a\s+)?phone\s+to\s+(their\s+)?ear\b/i,
  /\bphone\s+pressed\s+to\s+(their\s+)?ear\b/i,
  /\bgeneric\s+(stress|business|workspace)\b/i,
  /\bcalm\s+desk\b/i,
  /\bthinking\s+at\s+(a\s+)?desk\b/i,
  /\bexplaining\s+(the\s+)?(product|solution|platform)\b/i,
  /\bexplainer\s+video\b/i,
  /\bB2B\s+montage\b/i,
  /\bbusiness\s+is\s+busy\b/i,
  /\bmost\s+businesses\b/i,
  /\bgeneric\s+productivity\b/i,
  /\bnotification\s+on\s+(a\s+)?phone\s+screen\b/i,
  /\bsticky[- ]?notes?\s+(everywhere|on\s+wall)\b/i,
];

/** Theme/message without a filmable event. */
export const RAW_THEME_NOT_SCENE: readonly RegExp[] = [
  /^\s*(the\s+)?(problem|issue|challenge)\s+is\b/i,
  /^\s*this\s+video\s+is\s+about\b/i,
  /^\s*representing\s+/i,
  /^\s*a\s+metaphor\s+for\b/i,
  /^\s*symbol(izing)?\s+/i,
];

export function rejectRawSituation(scene: string): string | null {
  const t = scene.trim();
  if (t.length < 40) return "too_short_not_concrete";
  if (t.length > 420) return "too_long_theme_like";

  for (const re of RAW_THEME_NOT_SCENE) {
    if (re.test(t)) return `theme_not_scene:${re.source}`;
  }

  const cleaned = t.replace(/\bnot\s+(an?\s+)?[^.\n]{0,50}\b/gi, " ");
  for (const re of RAW_GENERIC_PATTERNS) {
    if (re.test(cleaned)) return `raw_generic:${re.source}`;
  }

  // Laptop/phone as the ONLY subject (no action situation)
  const lower = cleaned.toLowerCase();
  const hasProp = /\b(laptop|phone|desk|office|meeting)\b/.test(lower);
  const hasSituation =
    /\b(walk|walking|argue|queue|van|truck|heat|sweat|pile|tower|competitor|doorway|street|boarding|ticket|clipboard|empty|abandon|melt|sprint|neighbor|window|ac\s|cooling|technician|visitor|customer|hands|typing|reply|chat\s+on\s+wall)\b/.test(
      lower,
    );
  if (hasProp && !hasSituation) return "prop_without_situation";

  return null;
}
