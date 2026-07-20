/** Score raw situations for scroll-stop — not product explanation fit. */

const VISUAL_ACTION_WORDS =
  /\b(sprint|argue|queue|pile|tower|melt|sweat|point|turn|walk|abandon|competitor|van|truck|clipboard|boarding|ticket|neighbor|window|empty|typing|reply|heatwave|blazing|driveway|counter|lobby|hands|closing|whisper|rival|split)\b/i;

const ABSTRACT_EXPLAIN =
  /\b(explain|solution|platform|productivity|efficiency|streamline|leverage|optimize|workflow)\b/i;

export function scoreStopScroll(scene: string, scrollStopCue: string): number {
  const blob = `${scene} ${scrollStopCue}`;
  let score = 4;

  if (VISUAL_ACTION_WORDS.test(blob)) score += 3;
  if (
    /\b(consequence|before\s+you|too\s+late|walk(?:ing)?\s+away|unanswered|rival|competitor)\b/i.test(
      blob,
    )
  ) {
    score += 1;
  }
  if (blob.length >= 80 && blob.length <= 280) score += 1;
  if (/\b(close|wide|split|cut to|outside|inside|through the glass)\b/i.test(blob)) score += 0.5;
  if (ABSTRACT_EXPLAIN.test(blob)) score -= 2;
  if (/\b(someone|person|people)\b/i.test(blob) && VISUAL_ACTION_WORDS.test(blob)) score += 1;

  return Math.min(10, Math.max(1, Math.round(score * 10) / 10));
}

export function scoreVisualDistinct(scene: string, tags: string[]): number {
  let score = 5;
  const uniqueTags = new Set(tags);
  score += Math.min(3, uniqueTags.size * 0.5);
  if (/\b(heat|van|queue|competitor|boarding|pile|neighbor|empty|melt|sweat)\b/i.test(scene)) score += 1;
  if (/\b(laptop|office|meeting|dashboard)\b/i.test(scene)) score -= 3;
  return Math.min(10, Math.max(1, Math.round(score * 10) / 10));
}

export function tokenSet(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
  return new Set(words);
}

const STOPWORDS = new Set([
  "that",
  "this",
  "with",
  "from",
  "while",
  "their",
  "there",
  "about",
  "into",
  "over",
  "under",
  "after",
  "before",
  "still",
  "only",
  "your",
  "they",
  "them",
  "were",
  "been",
  "have",
  "has",
  "when",
  "what",
  "where",
  "which",
  "would",
  "could",
  "should",
  "business",
  "website",
]);

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const w of a) {
    if (b.has(w)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
