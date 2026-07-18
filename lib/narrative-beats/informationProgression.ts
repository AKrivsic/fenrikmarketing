import type { NarrativeBeat } from "@/lib/narrative-beats/types";
import type {
  InformationProgressionDiagnostics,
  InformationProgressionPairWarning,
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
          "phone",
          "laptop",
          "monitor",
          "screen",
          "smartphone",
          "device",
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

/** Semantic information claims — independent of surface (phone vs laptop). */
const INFO_CLAIM_PATTERNS: Array<{ key: string; re: RegExp }> = [
  { key: "unanswered", re: /\b(unanswered|no answer|nobody.*(answer|there)|silence|silent)\b/i },
  { key: "waiting", re: /\b(wait(ing)?|staring|looking at)\b/i },
  { key: "leaving", re: /\b(leav(e|ing)|walk(ing)?\s+away|abandon|moving on)\b/i },
  { key: "missed_leads", re: /\b(missed|lost|zero leads|lead leak|opportunity)\b/i },
  { key: "busy_phones", re: /\b(phones?\s+(ring|slam)|ringing|lines?\s+full)\b/i },
  { key: "solution", re: /\b(chat(bot| interface)|assistant|answer(ing|s)?|solves?|fixed|working)\b/i },
  { key: "chaos_planning", re: /\b(whiteboard|diagrams?|no code|blank page|blueprint)\b/i },
  { key: "problem_named", re: /\b(problem|mistake|myth|belief|wrong)\b/i },
];

const SURFACE_PATTERNS: Array<{ key: string; re: RegExp }> = [
  { key: "phone", re: /\b(phone|smartphone|mobile)\b/i },
  { key: "laptop", re: /\b(laptop|desktop|monitor|computer)\b/i },
  { key: "website", re: /\b(website|webpage|browser|landing)\b/i },
  { key: "storefront", re: /\b(storefront|door|entrance|reception)\b/i },
  { key: "board", re: /\b(departure board|whiteboard|board)\b/i },
];

function claimKeys(text: string): string[] {
  return INFO_CLAIM_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.key);
}

function surfaceKey(text: string): string | null {
  for (const p of SURFACE_PATTERNS) {
    if (p.re.test(text)) return p.key;
  }
  return null;
}

function informationFingerprint(text: string): string {
  const claims = claimKeys(text);
  if (claims.length === 0) {
    return `tokens:${significantTokens(text).slice(0, 5).join("_") || "empty"}`;
  }
  return claims.slice(0, 3).sort().join("+");
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

function buildCorrectiveGuidance(
  warnings: InformationProgressionPairWarning[],
): string | null {
  if (warnings.length === 0) return null;
  const lines = [
    "INFORMATION PROGRESSION CORRECTIVE (deterministic — strengthen storyboard NOW):",
    "Consecutive beats/scenes must advance INFORMATION, not just change the camera or device.",
    "phone → laptop with the same claim (e.g. 'unanswered visitors') is STILL a failure.",
    "Required advance pattern: anomaly → problem named → cost/failure → solution.",
    "Each visual_scenes[i] must communicate a NEW fact the previous scene did not.",
    "Do NOT restate the same problem with a different prop.",
    "",
    "Detected issues:",
    ...warnings.map(
      (w) =>
        `- beats/scenes ${w.indexA + 1}→${w.indexB + 1}: ${w.reasons.join("; ")}` +
        (w.sameInformationDifferentSurface
          ? " (different surface, same information)"
          : ""),
    ),
  ];
  return lines.join("\n");
}

/**
 * Pre-LLM: consecutive narrative beats must advance information
 * (viewer_understands / informationKey), not just role labels.
 */
export function validateBeatInformationProgression(
  beats: readonly NarrativeBeat[],
): InformationProgressionDiagnostics {
  const warnings: InformationProgressionPairWarning[] = [];
  const summary: string[] = [];

  for (let i = 1; i < beats.length; i++) {
    const a = beats[i - 1]!;
    const b = beats[i]!;
    const overlap = tokenOverlapRatio(
      a.comprehension.viewer_understands,
      b.comprehension.viewer_understands,
    );
    const sameKey =
      a.informationKey.split("|")[0] === b.informationKey.split("|")[0] &&
      a.role !== "HOOK";
    // Claim stage must strictly advance along the arc
    const stageOrder = ["anomaly", "problem_named", "cost_rising", "solution_shown"];
    const stageA = a.informationKey.split("|")[0] ?? "";
    const stageB = b.informationKey.split("|")[0] ?? "";
    const idxA = stageOrder.indexOf(stageA);
    const idxB = stageOrder.indexOf(stageB);
    const noAdvance = idxA >= 0 && idxB >= 0 && idxB <= idxA;
    const sameUnderstands = overlap >= 0.65;

    if (sameKey || noAdvance || sameUnderstands) {
      const reasons: string[] = [];
      if (sameKey || noAdvance) {
        reasons.push(`information_not_advanced:${stageA}_to_${stageB}`);
      }
      if (sameUnderstands) {
        reasons.push(`same_viewer_understands:overlap=${overlap.toFixed(2)}`);
      }
      warnings.push({
        indexA: i - 1,
        indexB: i,
        informationKeyA: a.informationKey,
        informationKeyB: b.informationKey,
        overlap,
        reasons,
        sameInformationDifferentSurface: false,
      });
      summary.push(
        `beats_${a.role}_to_${b.role}_same_information:${reasons.join("|")}`,
      );
    }
  }

  return {
    version: "information-progression@1",
    passed: warnings.length === 0,
    warnings,
    summary,
    correctiveGuidance: buildCorrectiveGuidance(warnings),
  };
}

/**
 * Post-LLM / general: consecutive scenes must advance INFORMATION even when
 * surface (phone vs laptop) changes.
 */
export function validateInformationProgression(args: {
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
  /** Optional texts already extracted (beats or scenes). */
  texts?: readonly string[] | null;
}): InformationProgressionDiagnostics {
  const texts =
    args.texts && args.texts.length > 0
      ? [...args.texts]
      : sceneTextsFromPackage(args);
  const warnings: InformationProgressionPairWarning[] = [];
  const summary: string[] = [];

  for (let i = 1; i < texts.length; i++) {
    const a = texts[i - 1]!;
    const b = texts[i]!;
    const fpA = informationFingerprint(a);
    const fpB = informationFingerprint(b);
    const claimsA = claimKeys(a);
    const claimsB = claimKeys(b);
    const surfaceA = surfaceKey(a);
    const surfaceB = surfaceKey(b);
    const overlap = tokenOverlapRatio(a, b);
    const sharedClaims = claimsA.filter((c) => claimsB.includes(c));
    // Ignore shared "waiting" alone if one side escalates to leaving/solution
    const advanced =
      (claimsA.includes("waiting") && claimsB.includes("leaving")) ||
      (claimsA.includes("leaving") && claimsB.includes("solution")) ||
      (claimsA.includes("unanswered") && claimsB.includes("solution")) ||
      (claimsA.includes("missed_leads") && claimsB.includes("solution")) ||
      (claimsA.includes("problem_named") &&
        (claimsB.includes("missed_leads") || claimsB.includes("leaving")));

    const sameInformation =
      !advanced &&
      (fpA === fpB ||
        (sharedClaims.length >= 1 &&
          overlap >= 0.4 &&
          !claimsB.some((c) => !claimsA.includes(c) && c !== "waiting")) ||
        (sharedClaims.length >= 2 && !advanced));

    const sameInformationDifferentSurface =
      sameInformation &&
      Boolean(surfaceA && surfaceB && surfaceA !== surfaceB);

    if (sameInformation) {
      const reasons: string[] = [
        `same_information:${fpA}`,
        ...(sharedClaims.length > 0
          ? [`shared_claims:${sharedClaims.join("+")}`]
          : []),
        `overlap=${overlap.toFixed(2)}`,
      ];
      if (sameInformationDifferentSurface) {
        reasons.push(`surface_only_change:${surfaceA}_to_${surfaceB}`);
      }
      warnings.push({
        indexA: i - 1,
        indexB: i,
        informationKeyA: fpA,
        informationKeyB: fpB,
        overlap,
        reasons,
        sameInformationDifferentSurface,
      });
      summary.push(
        `items_${i}_and_${i + 1}_same_information:${reasons.join("|")}`,
      );
    }
  }

  return {
    version: "information-progression@1",
    passed: warnings.length === 0,
    warnings,
    summary,
    correctiveGuidance: buildCorrectiveGuidance(warnings),
  };
}
