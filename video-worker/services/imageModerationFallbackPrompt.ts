import { NO_TEXT_DIRECTIVE } from "@/video-worker/services/imagePrompt";

const RISKY_CLAUSE_PATTERNS: RegExp[] = [
  /\bfounder(s)?\b/i,
  /\bperson(s)?\b/i,
  /\bpeople\b/i,
  /\bman\b/i,
  /\bwoman\b/i,
  /\bchild\b/i,
  /\bteen\b/i,
  /\bhand(s)?\b/i,
  /\bface(s)?\b/i,
  /\bselfie\b/i,
  /\bphone\b/i,
  /\bmobile\b/i,
  /\bscreen\b/i,
  /\bnotification(s)?\b/i,
  /\bslumped\b/i,
  /\btense\b/i,
  /\bmedical\b/i,
  /\bblood\b/i,
  /\bweapon\b/i,
  /\bviolence\b/i,
  /\bsexy\b/i,
  /\bnude\b/i,
  /\bsticky note\b/i,
  /\bavatar(s)?\b/i,
  /\bprofile(s)?\b/i,
  /\bsocial media feed\b/i,
];

const NEUTRAL_SCENES = [
  "A calm modern office interior with soft window light and minimal furniture.",
  "A tidy workspace desk with a closed laptop and a plant, shot from a respectful distance.",
  "An abstract professional background with gentle gradient light and subtle depth.",
  "A bright co-working corner with empty chairs and clean lines, no people present.",
] as const;

function splitClauses(prompt: string): string[] {
  return prompt
    .split(/[\n;]+|(?<=[.!?])\s+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function clauseIsRisky(clause: string): boolean {
  return RISKY_CLAUSE_PATTERNS.some((p) => p.test(clause));
}

function pickNeutralScene(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return NEUTRAL_SCENES[hash % NEUTRAL_SCENES.length] ?? NEUTRAL_SCENES[0];
}

/**
 * Deterministic safe retry prompt after moderation rejection. No LLM call.
 * Keeps only general non-sensitive scene meaning.
 */
export function buildModerationSafeRetryPrompt(args: {
  originalPrompt: string;
  profileSuffix?: string;
}): string {
  const kept = splitClauses(args.originalPrompt.trim()).filter(
    (c) => !clauseIsRisky(c),
  );
  const gist =
    kept.length > 0
      ? kept
          .slice(0, 2)
          .join(" ")
          .replace(/\b(no readable text|vertical 9:16)[^.]*/gi, "")
          .trim()
      : "";

  const neutral = pickNeutralScene(args.originalPrompt);
  const profile = args.profileSuffix?.trim() ? ` ${args.profileSuffix.trim()}` : "";

  const base = [
    "Vertical 9:16 professional photograph.",
    neutral,
    gist.length > 20
      ? `General topic hint (abstract only): ${gist.slice(0, 160)}.`
      : "",
    "No people, no faces, no hands, no phones, no screens, no readable UI.",
    "Neutral realistic business lifestyle composition, soft natural lighting.",
    profile,
    NO_TEXT_DIRECTIVE,
  ]
    .filter(Boolean)
    .join(" ");

  return base.replace(/\s+/g, " ").trim();
}

export function promptLogPreview(prompt: string, maxLen = 140): string {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen)}…`;
}
