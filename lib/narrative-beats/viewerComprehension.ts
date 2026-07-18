import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import type {
  NarrativeBeatRole,
  ViewerComprehension,
} from "@/lib/narrative-beats/types";

function clip(s: string, max = 140): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function firstClause(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const m = t.match(/^[^.!?;:—–-]+/);
  return (m?.[0] ?? t).trim();
}

/**
 * Deterministic viewer-comprehension model per beat.
 * Answers: what do they understand / ask / expect after this beat?
 */
export function deriveViewerComprehension(args: {
  role: NarrativeBeatRole;
  winner: CreativeCandidate;
  viewerLearns: string;
}): ViewerComprehension {
  const w = args.winner;
  const learns = firstClause(args.viewerLearns) || firstClause(w.coreIdea);

  switch (args.role) {
    case "HOOK":
      return {
        viewer_understands: clip(
          learns
            ? `Something unusual is happening: ${learns}`
            : "Something unusual is happening.",
        ),
        viewer_question: clip(
          w.expectedViewerQuestion || "Why is this happening?",
        ),
        viewer_expectation: "The explanation is coming.",
      };
    case "SETUP":
      return {
        viewer_understands: clip(
          w.coreIdea
            ? `The problem is: ${w.coreIdea}`
            : learns
              ? `The problem is about ${learns}`
              : "The problem is named.",
        ),
        viewer_question: "Why is this happening / what does it cost?",
        viewer_expectation: "Someone should solve this — or stakes will rise.",
      };
    case "ESCALATION":
      return {
        viewer_understands: clip(
          learns
            ? `The business is losing opportunities: ${learns}`
            : "The business is losing opportunities.",
        ),
        viewer_question: "Can this be fixed?",
        viewer_expectation: "Show the solution.",
      };
    case "RESOLUTION":
      return {
        viewer_understands: clip(
          w.productConnection
            ? `The product solves this: ${w.productConnection}`
            : learns
              ? `The product solves this: ${learns}`
              : "The product solves this problem automatically.",
        ),
        viewer_question: "none",
        viewer_expectation: "Finished.",
      };
  }
}

/**
 * Compact semantic information key for progression checks.
 * Same key across beats/scenes = information has not advanced.
 */
export function informationKeyForBeat(args: {
  role: NarrativeBeatRole;
  comprehension: ViewerComprehension;
  viewerLearns: string;
}): string {
  const claim =
    args.role === "HOOK"
      ? "anomaly"
      : args.role === "SETUP"
        ? "problem_named"
        : args.role === "ESCALATION"
          ? "cost_rising"
          : "solution_shown";
  const q =
    args.comprehension.viewer_question === "none"
      ? "closed"
      : "open";
  return `${claim}|${q}|${slugTokens(args.viewerLearns, 4)}`;
}

function slugTokens(text: string, n: number): string {
  const toks = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
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
          "about",
        ].includes(w),
    )
    .slice(0, n);
  return toks.join("_") || "generic";
}
