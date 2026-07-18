import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import type {
  DurationValidationDiagnostics,
  InformationProgressionDiagnostics,
  MetaphorClarityDiagnostic,
  NarrativeBeatPlan,
  NarrativeTimelineDebug,
  ViewerComprehension,
} from "@/lib/narrative-beats/types";

function sceneSummaries(args: {
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
}): string[] {
  const out: string[] = [];
  for (const s of args.visualScenes ?? []) {
    if (s && typeof s === "object" && !Array.isArray(s)) {
      const r = s as Record<string, unknown>;
      const p =
        typeof r.image_prompt === "string"
          ? r.image_prompt
          : typeof r.prompt === "string"
            ? r.prompt
            : "";
      if (p.trim()) out.push(clip(p, 120));
    }
  }
  if (out.length > 0) return out;
  return (args.imagePrompts ?? [])
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) => clip(p, 120));
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/**
 * Developer-friendly debug spine:
 * Creative Candidate → Narrative Beats → Viewer Comprehension →
 * Storyboard → Voiceover → Duration Plan → Timeline
 */
export function buildNarrativeTimelineDebug(args: {
  winner?: CreativeCandidate | null;
  plan?: NarrativeBeatPlan | null;
  voiceoverText?: string | null;
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
  durationPlan?: {
    roles: readonly string[];
    durationsSeconds: readonly number[];
    justifiedOverMax?: readonly boolean[];
    validation?: DurationValidationDiagnostics | null;
  } | null;
  informationProgression?: InformationProgressionDiagnostics | null;
}): NarrativeTimelineDebug {
  const plan = args.plan ?? null;
  const beats = plan?.beats ?? [];
  const comprehension: ViewerComprehension[] = beats.map(
    (b) => b.comprehension,
  );
  const scenes = sceneSummaries({
    imagePrompts: args.imagePrompts,
    visualScenes: args.visualScenes,
  });
  const vo = (args.voiceoverText ?? "").trim();
  const wordCount = vo ? vo.split(/\s+/).filter(Boolean).length : 0;

  const durationRoles = args.durationPlan?.roles ?? beats.map((b) => b.role);
  const durations = args.durationPlan?.durationsSeconds ?? [];
  const total = durations.reduce((a, b) => a + b, 0);
  const shares =
    total > 0 ? durations.map((d) => Math.round((d / total) * 1000) / 1000) : [];

  const n = Math.max(
    beats.length,
    scenes.length,
    durationRoles.length,
    durations.length,
    1,
  );

  const timeline: NarrativeTimelineDebug["timeline"] = [];
  for (let i = 0; i < n; i++) {
    const beat = beats[i] ?? null;
    const role = durationRoles[i] ?? beat?.role ?? `beat_${i + 1}`;
    const dur = typeof durations[i] === "number" ? durations[i]! : null;
    timeline.push({
      index: i,
      role,
      durationSeconds: dur,
      share: typeof shares[i] === "number" ? shares[i]! : null,
      comprehension: beat?.comprehension ?? comprehension[i] ?? null,
      informationKey: beat?.informationKey ?? null,
      sceneSummary: scenes[i] ?? null,
    });
  }

  const winner = args.winner ?? null;

  return {
    version: "narrative-timeline-debug@1",
    creative_candidate: winner
      ? {
          candidateId: winner.candidateId,
          family: winner.family,
          hookLine: winner.hookLine,
          openingSituation: winner.openingSituation,
          coreIdea: winner.coreIdea,
          storyProgression: winner.storyProgression,
          productConnection: winner.productConnection,
          ending: winner.ending,
        }
      : null,
    narrative_beats: beats.map((b) => ({
      role: b.role,
      viewerLearns: b.viewerLearns,
      whatChanged: b.whatChanged,
      whyContinue: b.whyContinue,
      informationKey: b.informationKey,
      modeBeatLabels: b.modeBeatLabels,
    })),
    viewer_comprehension: comprehension,
    storyboard:
      scenes.length > 0
        ? { sceneCount: scenes.length, sceneSummaries: scenes }
        : null,
    voiceover: vo
      ? { text: vo, wordCount }
      : null,
    duration_plan: args.durationPlan
      ? {
          roles: [...durationRoles],
          durationsSeconds: [...durations],
          shares,
          justifiedOverMax: [...(args.durationPlan.justifiedOverMax ?? [])],
          validation: args.durationPlan.validation ?? null,
        }
      : null,
    timeline,
    metaphor_clarity: (plan?.metaphorClarity as MetaphorClarityDiagnostic) ?? null,
    information_progression:
      args.informationProgression ?? plan?.informationProgression ?? null,
    corrective_guidance: plan?.correctiveGuidance ?? null,
  };
}
