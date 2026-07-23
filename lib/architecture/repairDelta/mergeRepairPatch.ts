/**
 * Merge a repaired package into the prior draft.
 * Only patchTargets (and affectedScenes / affectedPlatforms) are taken from
 * the repair output; preserved fields stay from prior / packs.
 */

import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { RepairDelta } from "@/lib/architecture/repairDelta/types";
import type { TypedDecisionPacks } from "@/lib/architecture/typedDecisionPacks";
import type { CreativeCandidate } from "@/lib/creative-candidates/types";

function clonePkg(pkg: ContentPackageOutput): ContentPackageOutput {
  return JSON.parse(JSON.stringify(pkg)) as ContentPackageOutput;
}

function mergeScenes(
  prior: ContentPackageOutput["visual_scenes"],
  repaired: ContentPackageOutput["visual_scenes"],
  affectedScenes: readonly number[],
): ContentPackageOutput["visual_scenes"] {
  if (!Array.isArray(repaired)) return prior;
  if (!Array.isArray(prior) || prior.length === 0) return repaired;
  if (affectedScenes.length === 0) return repaired;

  const out = [...prior];
  for (const idx of affectedScenes) {
    if (idx >= 0 && idx < repaired.length) {
      if (idx < out.length) out[idx] = repaired[idx]!;
      else out.push(repaired[idx]!);
    }
  }
  // If repair added scenes beyond prior length and affected set is partial,
  // keep prior length unless repair is shorter-or-equal replacement of listed idxs.
  return out;
}

function mergeImagePrompts(
  prior: ContentPackageOutput["image_prompts"],
  repaired: ContentPackageOutput["image_prompts"],
  affectedScenes: readonly number[],
): ContentPackageOutput["image_prompts"] {
  if (!Array.isArray(repaired)) return prior;
  if (!Array.isArray(prior) || prior.length === 0) return repaired;
  if (affectedScenes.length === 0) return repaired;

  const out = [...prior];
  for (const idx of affectedScenes) {
    if (idx >= 0 && idx < repaired.length && typeof repaired[idx] === "string") {
      if (idx < out.length) out[idx] = repaired[idx]!;
      else out.push(repaired[idx]!);
    }
  }
  return out;
}

function mergePlatformOutputs(
  prior: ContentPackageOutput["platform_outputs"],
  repaired: ContentPackageOutput["platform_outputs"],
  affectedPlatforms: readonly string[],
): ContentPackageOutput["platform_outputs"] {
  if (!repaired) return prior;
  if (!prior) return repaired;
  if (affectedPlatforms.length === 0) {
    // Full platform_outputs in patchTargets without specific platforms → take repaired.
    return repaired;
  }
  const out = { ...prior } as Record<string, (typeof prior)[keyof typeof prior]>;
  const repairedMap = repaired as Record<
    string,
    (typeof repaired)[keyof typeof repaired]
  >;
  for (const p of affectedPlatforms) {
    if (p in repairedMap) {
      out[p] = repairedMap[p]!;
    }
  }
  return out as ContentPackageOutput["platform_outputs"];
}

/**
 * Apply repair patch onto prior package.
 * Authoritative pack fields (hook from winner, cta.type constraints) are
 * enforced after merge by existing workflow enforcers.
 */
export function mergeRepairedPackage(args: {
  prior: ContentPackageOutput;
  repaired: ContentPackageOutput;
  delta: RepairDelta;
  decisionPacks: TypedDecisionPacks;
  winner: CreativeCandidate;
}): ContentPackageOutput {
  const { prior, repaired, delta, decisionPacks, winner } = args;
  const targets = new Set(delta.patchTargets);
  const out = clonePkg(prior);

  if (targets.has("title") && repaired.title) out.title = repaired.title;
  if (targets.has("hook") && repaired.hook) out.hook = repaired.hook;
  if (targets.has("voiceover_text") && repaired.voiceover_text) {
    out.voiceover_text = repaired.voiceover_text;
  }
  if (targets.has("subtitles") && repaired.subtitles != null) {
    out.subtitles = repaired.subtitles;
  }
  if (targets.has("video") && repaired.video) out.video = repaired.video;
  if (targets.has("cta") && repaired.cta) {
    // Preserve cta.type from prior when preserve includes ctaType.
    // Validators may still rewrite cta.text (spoken alignment).
    if (delta.preserve.includes("ctaType") && prior.cta?.type) {
      out.cta = {
        type: prior.cta.type,
        text: repaired.cta.text || prior.cta.text || "",
      };
    } else {
      out.cta = {
        type: repaired.cta.type || prior.cta?.type || "",
        text: repaired.cta.text || prior.cta?.text || "",
      };
    }
  }
  if (targets.has("hashtags") && repaired.hashtags) {
    out.hashtags = repaired.hashtags;
  }
  if (targets.has("scenario") && repaired.scenario != null) {
    out.scenario = repaired.scenario;
  }
  if (targets.has("asset_usage") && repaired.asset_usage) {
    out.asset_usage = repaired.asset_usage;
  }
  if (targets.has("visual_scenes")) {
    out.visual_scenes = mergeScenes(
      prior.visual_scenes,
      repaired.visual_scenes,
      delta.affectedScenes,
    );
  }
  if (targets.has("image_prompts")) {
    out.image_prompts = mergeImagePrompts(
      prior.image_prompts,
      repaired.image_prompts,
      delta.affectedScenes,
    );
  }
  if (targets.has("platform_outputs")) {
    out.platform_outputs = mergePlatformOutputs(
      prior.platform_outputs,
      repaired.platform_outputs,
      delta.affectedPlatforms,
    );
  }

  // Pack-authoritative hook: when preserve includes hook, force winner hookLine
  // into package hook field (VO alignment still done by enforceCandidateHook).
  if (delta.preserve.includes("hook")) {
    const authoritative = decisionPacks.hook.hookLine || winner.hookLine;
    if (authoritative) out.hook = authoritative;
  }

  // Never let funnel_stage drift.
  if (prior.funnel_stage) out.funnel_stage = prior.funnel_stage;

  return out;
}

/**
 * True when merge would keep a field from prior (not in patchTargets).
 * Used by tests / audits.
 */
export function isFieldPreservedByMerge(
  field: RepairDelta["patchTargets"][number],
  delta: RepairDelta,
): boolean {
  return !delta.patchTargets.includes(field);
}
