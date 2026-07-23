/**
 * Focused Repair renderers — only the sections needed for the active delta.
 * Do not reassemble Presentation ownership or full creative directive essays.
 */

import type { TypedDecisionPacks } from "@/lib/architecture/typedDecisionPacks";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import type {
  PreserveRule,
  RepairDelta,
  RepairPatchTarget,
} from "@/lib/architecture/repairDelta/types";

function packPreserveLines(
  packs: TypedDecisionPacks,
  winner: CreativeCandidate,
  preserve: readonly PreserveRule[],
): string[] {
  const lines: string[] = [
    "IMMUTABLE DECISIONS (Typed Decision Packs — do NOT rewrite unless listed in patchTargets):",
  ];
  for (const rule of preserve) {
    switch (rule) {
      case "hook":
        lines.push(
          `- hook: "${packs.hook.hookLine || winner.hookLine}" (source=${packs.hook.source})`,
        );
        break;
      case "opening":
        lines.push(
          `- opening: "${packs.opening.openingSituation ?? winner.openingSituation}"`,
        );
        break;
      case "storyStructure":
        lines.push(
          `- storyStructure (MODE BEATS only): ${packs.storyStructure.beatArc}`,
        );
        break;
      case "productGrounding":
        lines.push(
          `- productGrounding: ${packs.productGrounding.projectName} / product_is=${JSON.stringify(packs.productGrounding.productIs)}`,
        );
        break;
      case "voicePersona":
        lines.push(`- voicePersona: ${packs.voice.personaName}`);
        break;
      case "voiceEmotion":
        lines.push(
          `- voiceEmotion/delivery: ${packs.voice.deliveryPromptBlock ? "delivery_arc present (keep intent)" : "none"}`,
        );
        break;
      case "characterIdentity":
        lines.push(
          `- characterIdentity: ${packs.characterConsistency.mainCharacter ?? "(from DNA)"}`,
        );
        break;
      case "visualIdentity":
        lines.push(
          `- visualIdentity world: ${packs.visualIdentity.dnaWorld ?? packs.opening.dnaWorld ?? "(DNA world)"}`,
        );
        break;
      case "assetOwnership":
        lines.push(
          `- assetOwnership: ${packs.assetPolicy.source} (do not invent new asset policy)`,
        );
        break;
      case "ctaType":
        lines.push(
          `- ctaType allowed: [${packs.cta.allowedTypes.join(", ")}] goal=${packs.cta.goalType}`,
        );
        break;
      case "platformStrategy":
        lines.push(
          `- platformStrategy: ${packs.platformAdaptation.targetPlatforms.join(", ")}`,
        );
        break;
      case "emotionalArc":
        lines.push(
          `- emotionalArc: ${packs.emotionalArc.emotionalReaction ?? winner.emotionalReaction}`,
        );
        break;
      default: {
        const _exhaustive: never = rule;
        void _exhaustive;
      }
    }
  }
  return lines;
}

export function renderPreserveBlock(
  packs: TypedDecisionPacks,
  winner: CreativeCandidate,
  delta: RepairDelta,
): string {
  return packPreserveLines(packs, winner, delta.preserve).join("\n");
}

export function renderDeltaHeader(delta: RepairDelta): string {
  return [
    `REPAIR DELTA (${delta.version}) — patch generator, NOT a second Presentation:`,
    `validator=${delta.validator} severity=${delta.severity}`,
    `failureCodes=[${delta.failureCodes.join(", ")}]`,
    `patchTargets=[${delta.patchTargets.join(", ")}]`,
    delta.affectedScenes.length > 0
      ? `affectedScenes=[${delta.affectedScenes.join(", ")}] (0-based)`
      : "affectedScenes=[] (all scenes in patchTargets may change)",
    delta.affectedPlatforms.length > 0
      ? `affectedPlatforms=[${delta.affectedPlatforms.join(", ")}]`
      : "affectedPlatforms=[] (leave platform_outputs unchanged unless cta/platform in patchTargets)",
    "",
    `PROBLEM: ${delta.problem}`,
    "",
    "REQUIRED CHANGE:",
    delta.requiredChange,
  ].join("\n");
}

export function renderSceneRepair(
  pkg: ContentPackageOutput,
  delta: RepairDelta,
): string | null {
  if (!delta.patchTargets.includes("visual_scenes") &&
      !delta.patchTargets.includes("image_prompts")) {
    return null;
  }
  const scenes = pkg.visual_scenes ?? [];
  const prompts = pkg.image_prompts ?? [];
  if (delta.affectedScenes.length === 0) {
    return [
      "AFFECTED VISUALS (all scenes may change — keep DNA world / actor continuity):",
      `visual_scenes count=${Array.isArray(scenes) ? scenes.length : 0}`,
      `image_prompts count=${Array.isArray(prompts) ? prompts.length : 0}`,
    ].join("\n");
  }
  const lines = [
    "AFFECTED SCENES (repair these; copy other scenes from PRIOR PACKAGE unchanged):",
  ];
  for (const idx of delta.affectedScenes) {
    const scene = Array.isArray(scenes) ? scenes[idx] : undefined;
    const prompt = Array.isArray(prompts) ? prompts[idx] : undefined;
    lines.push(`- scene[${idx}]: ${scene ? JSON.stringify(scene) : "(missing)"}`);
    if (prompt) lines.push(`  image_prompt[${idx}]: ${prompt}`);
  }
  return lines.join("\n");
}

export function renderVoiceRepair(
  pkg: ContentPackageOutput,
  delta: RepairDelta,
): string | null {
  if (
    !delta.patchTargets.includes("voiceover_text") &&
    !delta.patchTargets.includes("hook") &&
    !delta.patchTargets.includes("subtitles")
  ) {
    return null;
  }
  return [
    "VOICE / HOOK PATCH CONTEXT:",
    `prior hook: ${pkg.hook}`,
    `prior voiceover_text: ${pkg.voiceover_text}`,
    pkg.subtitles ? `prior subtitles: ${pkg.subtitles}` : null,
  ]
    .filter((l): l is string => Boolean(l))
    .join("\n");
}

export function renderCTARepair(
  pkg: ContentPackageOutput,
  delta: RepairDelta,
): string | null {
  if (!delta.patchTargets.includes("cta")) return null;
  return [
    "CTA PATCH CONTEXT (keep cta.type within allowed types from packs):",
    `prior cta: ${JSON.stringify(pkg.cta)}`,
  ].join("\n");
}

export function renderAssetRepair(
  pkg: ContentPackageOutput,
  delta: RepairDelta,
): string | null {
  if (!delta.patchTargets.includes("asset_usage")) return null;
  return [
    "ASSET PATCH CONTEXT:",
    `prior asset_usage: ${JSON.stringify(pkg.asset_usage ?? [])}`,
  ].join("\n");
}

export function renderPlatformRepair(
  pkg: ContentPackageOutput,
  delta: RepairDelta,
): string | null {
  if (
    !delta.patchTargets.includes("platform_outputs") &&
    delta.affectedPlatforms.length === 0
  ) {
    return null;
  }
  const outputs = pkg.platform_outputs ?? {};
  const keys =
    delta.affectedPlatforms.length > 0
      ? delta.affectedPlatforms
      : Object.keys(outputs);
  const excerpt: Record<string, unknown> = {};
  const outputsMap = outputs as Record<string, unknown>;
  for (const k of keys) {
    if (k in outputsMap) excerpt[k] = outputsMap[k];
  }
  return [
    "PLATFORM PATCH CONTEXT:",
    JSON.stringify(excerpt, null, 2),
  ].join("\n");
}

/** Compact prior package — full JSON so schema validation still receives a complete draft basis. */
export function renderPriorPackageBlock(pkg: ContentPackageOutput): string {
  return [
    "PRIOR PACKAGE (complete draft — copy unchanged fields verbatim):",
    JSON.stringify(pkg, null, 2),
  ].join("\n");
}

export function renderRepairTask(
  delta: RepairDelta,
  requireVideo: boolean,
): string {
  const targets = delta.patchTargets.join(", ");
  return [
    "TASK:",
    "Return ONE complete content package as JSON with the SAME schema as the prior package.",
    `Change ONLY these fields: ${targets}.`,
    "Copy every other field from PRIOR PACKAGE unchanged.",
    "Do NOT invent a new hook, opening, story structure, product facts, voice persona, character, visual world, asset policy, CTA type set, or platform strategy.",
    "Align changed fields with IMMUTABLE DECISIONS and REQUIRED CHANGE above.",
    requireVideo
      ? "Video remains mandatory — keep video + visual_scenes + image_prompts present."
      : "Text-only package — do not invent a video.",
  ].join("\n");
}

/** Select renderers based on patchTargets. */
export function selectRepairRendererIds(
  targets: readonly RepairPatchTarget[],
): readonly string[] {
  const ids: string[] = ["preserve", "delta", "prior", "task"];
  if (
    targets.includes("visual_scenes") ||
    targets.includes("image_prompts")
  ) {
    ids.push("scene");
  }
  if (
    targets.includes("voiceover_text") ||
    targets.includes("hook") ||
    targets.includes("subtitles")
  ) {
    ids.push("voice");
  }
  if (targets.includes("cta")) ids.push("cta");
  if (targets.includes("asset_usage")) ids.push("asset");
  if (targets.includes("platform_outputs")) ids.push("platform");
  return ids;
}
