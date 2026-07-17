import {
  matchesEssayCadence,
  matchesGenericHookOpener,
  matchesGenericConcept,
} from "@/lib/creative-candidates/genericity";
import { extractTopicConcreteSignals } from "@/lib/creative-candidates/generateCandidates";
import type {
  ConceptFidelityResult,
  CreativeCandidate,
} from "@/lib/creative-candidates/types";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sharesTokens(a: string, b: string, min = 3): boolean {
  const aw = new Set(normalize(a).split(" ").filter((w) => w.length > 3));
  const bw = normalize(b).split(" ").filter((w) => w.length > 3);
  let hits = 0;
  for (const w of bw) {
    if (aw.has(w)) hits++;
  }
  return hits >= min;
}

function firstSpoken(voiceover: string): string {
  const t = voiceover.trim();
  if (!t) return "";
  const m = t.match(/^[^.!?]+[.!?]?/);
  return (m?.[0] ?? t).trim();
}

function scene1Text(args: {
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
}): string {
  const scenes = args.visualScenes ?? [];
  if (scenes.length > 0) {
    const s0 = scenes[0];
    if (s0 && typeof s0 === "object" && !Array.isArray(s0)) {
      const r = s0 as Record<string, unknown>;
      if (typeof r.image_prompt === "string") return r.image_prompt;
    }
  }
  const prompts = args.imagePrompts ?? [];
  return typeof prompts[0] === "string" ? prompts[0] : "";
}

export function checkConceptFidelity(args: {
  winner: CreativeCandidate;
  hook: string;
  voiceoverText: string;
  imagePrompts?: readonly string[] | null;
  visualScenes?: readonly unknown[] | null;
  topic: string;
  angle?: string | null;
}): ConceptFidelityResult {
  const failureReasons: string[] = [];
  const scene1 = scene1Text(args);
  const spoken = firstSpoken(args.voiceoverText);
  const allVisual = [
    scene1,
    ...(args.imagePrompts ?? []),
  ].join(" \n ");

  const openingSituationVisibleInScene1 =
    sharesTokens(args.winner.openingSituation, scene1, 3) ||
    sharesTokens(args.winner.visualPromise, scene1, 2);
  if (!openingSituationVisibleInScene1) {
    failureReasons.push("opening_situation_missing_from_scene1");
  }

  const hookPreservedInFirstSpoken =
    sharesTokens(args.winner.hookLine, spoken, 3) ||
    sharesTokens(args.winner.hookLine, args.hook, 3) ||
    normalize(spoken).includes(normalize(args.winner.hookLine).slice(0, 24));
  if (!hookPreservedInFirstSpoken) {
    failureReasons.push("hook_not_preserved_in_first_spoken");
  }

  const coreIdeaRecognizable =
    sharesTokens(args.winner.coreIdea, `${args.voiceoverText} ${allVisual}`, 3);
  if (!coreIdeaRecognizable) {
    failureReasons.push("core_idea_not_recognizable");
  }

  const signals = extractTopicConcreteSignals(args.topic, args.angle);
  const topicBlob = `${args.voiceoverText} ${allVisual}`.toLowerCase();
  const productOrTopicImplied =
    signals.rawTokens.some((t) => topicBlob.includes(t.toLowerCase())) ||
    sharesTokens(args.winner.productConnection, args.voiceoverText, 2);
  if (!productOrTopicImplied) {
    failureReasons.push("product_or_topic_not_implied");
  }

  const collapsedToGenericOffice =
    Boolean(matchesGenericConcept(scene1)) ||
    (/\b(laptop|desk|office)\b/i.test(scene1) &&
      !sharesTokens(args.winner.openingSituation, scene1, 2) &&
      !/\b(heat|van|technician|argument|queue|boarding|street|competitor)\b/i.test(
        scene1,
      ));
  if (collapsedToGenericOffice) {
    failureReasons.push("storyboard_collapsed_to_generic_office");
  }

  const voiceoverEssayCadence =
    Boolean(matchesEssayCadence(args.voiceoverText)) ||
    Boolean(matchesGenericHookOpener(spoken));
  if (voiceoverEssayCadence) {
    failureReasons.push("voiceover_essay_or_generic_opener");
  }

  return {
    passed: failureReasons.length === 0,
    openingSituationVisibleInScene1,
    hookPreservedInFirstSpoken,
    coreIdeaRecognizable,
    productOrTopicImplied,
    collapsedToGenericOffice,
    voiceoverEssayCadence,
    failureReasons,
  };
}

export function fidelityRepairAppendix(
  winner: CreativeCandidate,
  fidelity: ConceptFidelityResult,
): string {
  return [
    "CREATIVE CANDIDATE FIDELITY REPAIR (mandatory — previous draft failed):",
    `Failure reasons: ${fidelity.failureReasons.join(", ")}`,
    "Regenerate hook, voiceover_text, video.script, and visual_scenes to MATCH the selected candidate exactly.",
    `SELECTED hookLine (must be first spoken): ${winner.hookLine}`,
    `SELECTED openingSituation (must be scene 1): ${winner.openingSituation}`,
    `SELECTED coreIdea: ${winner.coreIdea}`,
    `SELECTED storyProgression: ${winner.storyProgression}`,
    `SELECTED productConnection: ${winner.productConnection}`,
    `SELECTED ending: ${winner.ending}`,
    "Do NOT replace the opening with laptop/office/phone-stare imagery unless that IS the selected openingSituation.",
    "Do NOT open with 'Most businesses…' or essay cadence.",
  ].join("\n");
}
