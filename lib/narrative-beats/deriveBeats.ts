import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import { validateBeatInformationProgression } from "@/lib/narrative-beats/informationProgression";
import {
  evaluateMetaphorClarity,
} from "@/lib/narrative-beats/metaphorClarity";
import {
  deriveViewerComprehension,
  informationKeyForBeat,
} from "@/lib/narrative-beats/viewerComprehension";
import type {
  NarrativeBeat,
  NarrativeBeatPlan,
  NarrativeBeatRole,
} from "@/lib/narrative-beats/types";
import { NARRATIVE_BEAT_VERSION } from "@/lib/narrative-beats/types";

function clip(s: string, max = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function splitProgression(storyProgression: string): [string, string] {
  const raw = storyProgression.replace(/\s+/g, " ").trim();
  if (!raw) return ["", ""];
  const arrowParts = raw
    .split(/\s*(?:→|->|⇒|then|;)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (arrowParts.length >= 2) {
    const mid = Math.ceil(arrowParts.length / 2);
    return [
      arrowParts.slice(0, mid).join(" → "),
      arrowParts.slice(mid).join(" → "),
    ];
  }
  const words = raw.split(" ");
  if (words.length < 8) return [raw, raw];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

/**
 * Map creative-mode beat labels onto HOOK → SETUP → ESCALATION → RESOLUTION.
 * Preserves mode vocabulary while giving every package a shared story spine.
 */
export function mapModeBeatsToRoles(
  modeBeats: readonly string[],
): Record<NarrativeBeatRole, string[]> {
  const labels = modeBeats.map((b) => b.trim()).filter(Boolean);
  const out: Record<NarrativeBeatRole, string[]> = {
    HOOK: [],
    SETUP: [],
    ESCALATION: [],
    RESOLUTION: [],
  };
  if (labels.length === 0) {
    return {
      HOOK: ["hook"],
      SETUP: ["setup"],
      ESCALATION: ["escalation"],
      RESOLUTION: ["resolution"],
    };
  }
  if (labels.length === 1) {
    out.HOOK = [labels[0]!];
    out.RESOLUTION = [labels[0]!];
    return out;
  }
  if (labels.length === 2) {
    out.HOOK = [labels[0]!];
    out.SETUP = [labels[0]!];
    out.ESCALATION = [labels[1]!];
    out.RESOLUTION = [labels[1]!];
    return out;
  }
  if (labels.length === 3) {
    out.HOOK = [labels[0]!];
    out.SETUP = [labels[1]!];
    out.ESCALATION = [labels[1]!];
    out.RESOLUTION = [labels[2]!];
    return out;
  }
  out.HOOK = [labels[0]!];
  out.RESOLUTION = [labels[labels.length - 1]!];
  const middle = labels.slice(1, -1);
  const splitAt = Math.max(1, Math.ceil(middle.length / 2));
  out.SETUP = middle.slice(0, splitAt);
  out.ESCALATION = middle.slice(splitAt);
  if (out.ESCALATION.length === 0) {
    out.ESCALATION = [out.SETUP[out.SETUP.length - 1]!];
  }
  return out;
}

function stateFingerprint(beat: Pick<NarrativeBeat, "viewerLearns" | "whatChanged">): string {
  return `${beat.viewerLearns} ${beat.whatChanged}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantTokens(text: string): Set<string> {
  return new Set(
    text
      .split(" ")
      .filter((w) => w.length > 3)
      .filter(
        (w) =>
          !["with", "from", "that", "this", "their", "into", "over", "when", "then"].includes(
            w,
          ),
      ),
  );
}

function nearlyIdenticalState(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const aw = significantTokens(a);
  const bw = significantTokens(b);
  if (aw.size === 0 || bw.size === 0) return false;
  let hits = 0;
  for (const w of bw) {
    if (aw.has(w)) hits++;
  }
  const denom = Math.min(aw.size, bw.size);
  return denom > 0 && hits / denom >= 0.75;
}

function attachComprehension(
  beat: Omit<NarrativeBeat, "comprehension" | "informationKey">,
  winner: CreativeCandidate,
): NarrativeBeat {
  const comprehension = deriveViewerComprehension({
    role: beat.role,
    winner,
    viewerLearns: beat.viewerLearns,
  });
  return {
    ...beat,
    comprehension,
    informationKey: informationKeyForBeat({
      role: beat.role,
      comprehension,
      viewerLearns: beat.viewerLearns,
    }),
  };
}

function mergeGuidance(...parts: Array<string | null | undefined>): string | null {
  const kept = parts.map((p) => (p ?? "").trim()).filter(Boolean);
  if (kept.length === 0) return null;
  return kept.join("\n\n");
}

/**
 * Derive HOOK → SETUP → ESCALATION → RESOLUTION from the winning candidate
 * and the active creative-mode beat labels. Pure / deterministic.
 * Includes viewer comprehension + pre-LLM corrective guidance when needed.
 */
export function deriveNarrativeBeats(args: {
  winner: CreativeCandidate;
  modeBeats?: readonly string[];
  topic?: string | null;
  angle?: string | null;
  painPoints?: readonly string[];
  productIs?: readonly string[];
}): NarrativeBeatPlan {
  const w = args.winner;
  const modeMap = mapModeBeatsToRoles(args.modeBeats ?? []);
  const [setupProgression, escalateProgression] = splitProgression(
    w.storyProgression,
  );

  let beats: NarrativeBeat[] = [
    attachComprehension(
      {
        role: "HOOK",
        viewerLearns: clip(w.openingSituation || w.hookLine),
        whatChanged: "",
        whyContinue: clip(
          w.expectedViewerQuestion ||
            `What happens after: ${w.hookLine}`,
        ),
        sourceFields: ["openingSituation", "hookLine", "expectedViewerQuestion"],
        modeBeatLabels: modeMap.HOOK,
      },
      w,
    ),
    attachComprehension(
      {
        role: "SETUP",
        viewerLearns: clip(
          setupProgression || w.coreIdea || w.visualPromise,
        ),
        whatChanged: clip(
          `From cold open to the established problem world (${w.emotionalReaction || "tension"}).`,
        ),
        whyContinue: clip(
          `Stakes become clear — ${w.coreIdea || "the cost of inaction"}.`,
        ),
        sourceFields: ["storyProgression", "coreIdea", "emotionalReaction"],
        modeBeatLabels: modeMap.SETUP,
      },
      w,
    ),
    attachComprehension(
      {
        role: "ESCALATION",
        viewerLearns: clip(
          escalateProgression ||
            w.visualPromise ||
            `Consequence of: ${w.coreIdea}`,
        ),
        whatChanged: clip(
          "Failure / consequence deepens — not a restatement of the setup.",
        ),
        whyContinue: clip(
          `Viewer needs the fix: ${w.productConnection || w.ending}`,
        ),
        sourceFields: ["storyProgression", "visualPromise", "productConnection"],
        modeBeatLabels: modeMap.ESCALATION,
      },
      w,
    ),
    attachComprehension(
      {
        role: "RESOLUTION",
        viewerLearns: clip(w.productConnection || w.ending),
        whatChanged: clip(
          `Problem turns into solution / outcome: ${w.ending || w.productConnection}`,
        ),
        whyContinue: clip(w.ending || "Satisfying close + next step."),
        sourceFields: ["productConnection", "ending"],
        modeBeatLabels: modeMap.RESOLUTION,
      },
      w,
    ),
  ];

  const progressionWarnings: string[] = [];
  for (let i = 1; i < beats.length; i++) {
    const prev = beats[i - 1]!;
    const cur = beats[i]!;
    if (
      nearlyIdenticalState(
        stateFingerprint(prev),
        stateFingerprint(cur),
      )
    ) {
      progressionWarnings.push(
        `consecutive_same_state:${prev.role}_to_${cur.role}`,
      );
      let patched = cur;
      if (cur.role === "ESCALATION") {
        patched = attachComprehension(
          {
            ...cur,
            viewerLearns: clip(
              `Consequence: ${w.visualPromise || w.storyProgression}. Not the same frame as setup.`,
            ),
            whatChanged:
              "Escalation must show failure or rising cost — new information only.",
          },
          w,
        );
      } else if (cur.role === "RESOLUTION") {
        patched = attachComprehension(
          {
            ...cur,
            viewerLearns: clip(
              `Solution beat: ${w.productConnection}. Distinct from the problem state.`,
            ),
            whatChanged:
              "Resolution must change the narrative state from problem to fix.",
          },
          w,
        );
      } else if (cur.role === "SETUP") {
        patched = attachComprehension(
          {
            ...cur,
            viewerLearns: clip(
              `Context after the hook: ${w.coreIdea}. New information beyond the opening image.`,
            ),
          },
          w,
        );
      }
      beats = beats.map((b, idx) => (idx === i ? patched : b));
    }
  }

  const informationProgression = validateBeatInformationProgression(beats);
  if (!informationProgression.passed) {
    for (const wln of informationProgression.summary) {
      if (!progressionWarnings.includes(wln)) progressionWarnings.push(wln);
    }
  }

  const metaphorClarity = evaluateMetaphorClarity({
    openingSituation: w.openingSituation,
    hookLine: w.hookLine,
    coreIdea: w.coreIdea,
    productConnection: w.productConnection,
    topic: args.topic,
    angle: args.angle,
    painPoints: args.painPoints,
    productIs: args.productIs,
  });

  // Pre-LLM validator escalation: warnings → corrective guidance in the prompt.
  const stateGuidance =
    progressionWarnings.length > 0
      ? [
          "STORY STATE CORRECTIVE (deterministic — apply before writing scenes):",
          `Issues: ${progressionWarnings.join(", ")}`,
          "Every consecutive beat must communicate NEW information.",
          "Never repeat the same claim with a different camera/device.",
          "Advance: HOOK anomaly → SETUP problem named → ESCALATION cost → RESOLUTION solution.",
        ].join("\n")
      : null;

  const correctiveGuidance = mergeGuidance(
    informationProgression.correctiveGuidance,
    stateGuidance,
    metaphorClarity.guidance,
  );

  return {
    version: NARRATIVE_BEAT_VERSION,
    beats,
    progressionWarnings,
    informationProgression,
    metaphorClarity,
    correctiveGuidance,
  };
}

export function narrativeBeatRolesForCount(count: number): NarrativeBeatRole[] {
  if (count <= 0) return [];
  if (count === 1) return ["HOOK"];
  if (count === 2) return ["HOOK", "RESOLUTION"];
  if (count === 3) return ["HOOK", "ESCALATION", "RESOLUTION"];
  return Array.from({ length: count }, (_u, i) => {
    const idx =
      count === 1
        ? 0
        : Math.min(3, Math.floor((i * 4) / count));
    return (["HOOK", "SETUP", "ESCALATION", "RESOLUTION"] as const)[idx]!;
  });
}
