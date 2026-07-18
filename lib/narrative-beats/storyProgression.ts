import type {
  StoryProgressionDiagnostics,
  StoryProgressionPairWarning,
  VisualProgressionDiagnostics,
} from "@/lib/narrative-beats/types";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 3)
    .filter(
      (w) =>
        ![
          "with",
          "from",
          "that",
          "this",
          "their",
          "into",
          "over",
          "when",
          "then",
          "scene",
          "portrait",
          "vertical",
          "photograph",
          "photorealistic",
        ].includes(w),
    );
}

function tokenOverlapRatio(a: string, b: string): number {
  const aw = new Set(significantTokens(a));
  const bw = significantTokens(b);
  if (aw.size === 0 || bw.length === 0) return 0;
  let hits = 0;
  for (const w of bw) {
    if (aw.has(w)) hits++;
  }
  return hits / Math.min(aw.size, new Set(bw).size);
}

const LOCATION_PATTERNS: Array<{ key: string; re: RegExp }> = [
  { key: "website", re: /\b(website|webpage|web page|browser|landing page|homepage)\b/i },
  { key: "office", re: /\b(office|desk|co-?working|conference room)\b/i },
  { key: "storefront", re: /\b(storefront|reception|counter|front desk|entrance)\b/i },
  { key: "airport", re: /\b(airport|departure board|boarding|gate)\b/i },
  { key: "street", re: /\b(street|sidewalk|porch|driveway)\b/i },
  { key: "phone_ui", re: /\b(phone screen|smartphone|mobile screen)\b/i },
  { key: "laptop", re: /\b(laptop|monitor|screen)\b/i },
  { key: "whiteboard", re: /\bwhiteboard\b/i },
];

const ACTION_PATTERNS: Array<{ key: string; re: RegExp }> = [
  { key: "waiting", re: /\b(wait(ing)?|staring|looking at)\b/i },
  { key: "leaving", re: /\b(leav(e|ing)|walk(ing)? away|abandon)\b/i },
  { key: "answering", re: /\b(answer(ing)?|reply(ing)?|chat(ting)?)\b/i },
  { key: "arguing", re: /\b(argu(e|ing)|debat(e|ing)|gesture)\b/i },
  { key: "typing", re: /\b(typ(e|ing)|fill(ing)? (out )?form)\b/i },
  { key: "calling", re: /\b(phone|calling|ringing)\b/i },
  { key: "showing_ui", re: /\b(dashboard|interface|blueprint|chat interface)\b/i },
];

const EMOTION_PATTERNS: Array<{ key: string; re: RegExp }> = [
  { key: "tension", re: /\b(tens(e|ion)|stress|frustrat|anxious|overwhelm)\b/i },
  { key: "resignation", re: /\b(resign|defeat|tired|flat|dropped shoulders)\b/i },
  { key: "relief", re: /\b(relief|calm|optimis|satisf|hope)\b/i },
  { key: "urgency", re: /\b(urgent|rush|slam|chaos|peak)\b/i },
];

const STAKES_PATTERNS: Array<{ key: string; re: RegExp }> = [
  { key: "loss", re: /\b(lost|missed|zero leads|walking away|competitor|silent)\b/i },
  { key: "failure", re: /\b(fail(ure|ing)?|broken|unanswered|no one|empty)\b/i },
  { key: "solution", re: /\b(fix|solved|answer(ing|s)?|assistant|working)\b/i },
];

function axisKeys(
  patterns: Array<{ key: string; re: RegExp }>,
  text: string,
): string[] {
  return patterns.filter((p) => p.re.test(text)).map((p) => p.key);
}

function primaryKey(
  patterns: Array<{ key: string; re: RegExp }>,
  text: string,
): string | null {
  return axisKeys(patterns, text)[0] ?? null;
}

function sceneTextsFromPackage(args: {
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
}): string[] {
  const fromScenes: string[] = [];
  for (const s of args.visualScenes ?? []) {
    if (s && typeof s === "object" && !Array.isArray(s)) {
      const r = s as Record<string, unknown>;
      if (typeof r.image_prompt === "string" && r.image_prompt.trim()) {
        fromScenes.push(r.image_prompt);
        continue;
      }
      if (typeof r.prompt === "string" && r.prompt.trim()) {
        fromScenes.push(r.prompt);
      }
    }
  }
  if (fromScenes.length > 0) return fromScenes;
  return (args.imagePrompts ?? []).filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
}

/**
 * Diagnostics-only: reject/warn when two consecutive scenes share nearly
 * identical semantic purpose (same location + action + state, no escalation).
 */
export function validateStoryProgression(args: {
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
}): StoryProgressionDiagnostics {
  const scenes = sceneTextsFromPackage(args);
  const warnings: StoryProgressionPairWarning[] = [];
  const summary: string[] = [];

  for (let i = 1; i < scenes.length; i++) {
    const a = scenes[i - 1]!;
    const b = scenes[i]!;
    const locA = primaryKey(LOCATION_PATTERNS, a);
    const locB = primaryKey(LOCATION_PATTERNS, b);
    const actA = primaryKey(ACTION_PATTERNS, a);
    const actB = primaryKey(ACTION_PATTERNS, b);
    const stakesA = axisKeys(STAKES_PATTERNS, a);
    const stakesB = axisKeys(STAKES_PATTERNS, b);

    const sameLocation = Boolean(locA && locB && locA === locB);
    const sameAction = Boolean(actA && actB && actA === actB);
    const overlap = tokenOverlapRatio(a, b);
    const sameNarrativeState = overlap >= 0.55;
    const escalated =
      stakesB.includes("failure") ||
      stakesB.includes("loss") ||
      stakesB.includes("solution") ||
      (stakesA.includes("loss") && stakesB.includes("solution")) ||
      (actA === "waiting" && actB === "leaving") ||
      (actA === "leaving" && actB === "answering");
    const noEscalation =
      sameLocation &&
      (sameAction || sameNarrativeState) &&
      !escalated;

    const reasons: string[] = [];
    if (sameLocation) reasons.push(`same_location:${locA}`);
    if (sameAction) reasons.push(`same_action:${actA}`);
    if (sameNarrativeState) {
      reasons.push(`same_narrative_state:overlap=${overlap.toFixed(2)}`);
    }
    if (noEscalation) reasons.push("no_escalation");

    if (noEscalation || (sameLocation && sameAction && sameNarrativeState)) {
      warnings.push({
        indexA: i - 1,
        indexB: i,
        reasons,
        sameLocation,
        sameAction,
        sameNarrativeState,
        noEscalation,
      });
      summary.push(
        `scenes_${i}_and_${i + 1}_near_duplicate_purpose:${reasons.join("|")}`,
      );
    }
  }

  return {
    version: "story-progression@1",
    passed: warnings.length === 0,
    warnings,
    summary,
  };
}

/**
 * Each storyboard scene must change location OR action OR information OR
 * emotion OR stakes. Diagnostics only.
 */
export function validateVisualProgression(args: {
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
}): VisualProgressionDiagnostics {
  const scenes = sceneTextsFromPackage(args);
  const warnings: VisualProgressionDiagnostics["warnings"] = [];
  const summary: string[] = [];

  for (let i = 1; i < scenes.length; i++) {
    const a = scenes[i - 1]!;
    const b = scenes[i]!;
    const locA = primaryKey(LOCATION_PATTERNS, a);
    const locB = primaryKey(LOCATION_PATTERNS, b);
    const actA = primaryKey(ACTION_PATTERNS, a);
    const actB = primaryKey(ACTION_PATTERNS, b);
    const emoA = primaryKey(EMOTION_PATTERNS, a);
    const emoB = primaryKey(EMOTION_PATTERNS, b);
    const stakesA = primaryKey(STAKES_PATTERNS, a);
    const stakesB = primaryKey(STAKES_PATTERNS, b);
    const infoChanged = tokenOverlapRatio(a, b) < 0.5;

    const changed = {
      location: Boolean(locA && locB ? locA !== locB : locA !== locB),
      action: Boolean(actA && actB ? actA !== actB : actA !== actB),
      information: infoChanged,
      emotion: Boolean(emoA && emoB ? emoA !== emoB : emoA !== emoB),
      stakes: Boolean(
        stakesA && stakesB ? stakesA !== stakesB : stakesA !== stakesB,
      ),
    };

    // If neither side has a signal on an axis, don't count that axis as "changed"
    // via undefined≠undefined — require at least one detected difference.
    if (!locA && !locB) changed.location = false;
    if (!actA && !actB) changed.action = false;
    if (!emoA && !emoB) changed.emotion = false;
    if (!stakesA && !stakesB) changed.stakes = false;

    const anyChange =
      changed.location ||
      changed.action ||
      changed.information ||
      changed.emotion ||
      changed.stakes;

    if (!anyChange) {
      const reasons = [
        "static_repetition",
        locA ? `location_stuck:${locA}` : "location_unknown",
        actA ? `action_stuck:${actA}` : "action_unknown",
      ];
      warnings.push({
        indexA: i - 1,
        indexB: i,
        changed,
        reasons,
      });
      summary.push(
        `scenes_${i}_and_${i + 1}_no_visual_progression:${reasons.join("|")}`,
      );
    }
  }

  return {
    version: "visual-progression@1",
    passed: warnings.length === 0,
    warnings,
    summary,
  };
}
