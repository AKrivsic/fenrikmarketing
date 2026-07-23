/**
 * Build structured RepairDelta from existing validator outputs.
 * Does NOT redesign validators — only exposes structured repair metadata.
 */

import type { CreativeCandidate } from "@/lib/creative-candidates/types";
import type { ConceptFidelityResult } from "@/lib/creative-candidates/types";
import {
  classifyFidelityFailuresForRepair,
  fidelityRepairAppendix,
} from "@/lib/creative-candidates/fidelityCheck";
import type { StoryIntegrityResult } from "@/lib/creative-candidates/storyIntegrity";
import { storyIntegrityRepairAppendix } from "@/lib/creative-candidates/storyIntegrity";
import type { ProductDemonstrationIntegrityResult } from "@/lib/creative-candidates/productDemonstrationIntegrity";
import { productDemonstrationRepairAppendix } from "@/lib/creative-candidates/productDemonstrationIntegrity";
import {
  DEFAULT_REPAIR_PRESERVE,
  REPAIR_DELTA_VERSION,
  type PreserveRule,
  type RepairDelta,
  type RepairPatchTarget,
} from "@/lib/architecture/repairDelta/types";

function scenesFromStoryIntegrity(
  integrity: StoryIntegrityResult,
): number[] {
  const idxs = new Set<number>();
  for (const v of integrity.violations) {
    if (typeof v.sceneIndex === "number" && Number.isFinite(v.sceneIndex)) {
      idxs.add(Math.trunc(v.sceneIndex));
    }
  }
  for (const v of integrity.warnings) {
    if (typeof v.sceneIndex === "number" && Number.isFinite(v.sceneIndex)) {
      idxs.add(Math.trunc(v.sceneIndex));
    }
  }
  return [...idxs].sort((a, b) => a - b);
}

function scenesFromProductDemo(
  integrity: ProductDemonstrationIntegrityResult,
): number[] {
  const idxs = new Set<number>();
  for (const v of integrity.violations) {
    if (typeof v.sceneIndex === "number" && Number.isFinite(v.sceneIndex)) {
      idxs.add(Math.trunc(v.sceneIndex));
    }
  }
  return [...idxs].sort((a, b) => a - b);
}

/** Fidelity material failures → delta (opening/scene1 + VO/hook typically). */
export function buildFidelityRepairDelta(args: {
  winner: CreativeCandidate;
  fidelity: ConceptFidelityResult;
}): RepairDelta {
  const classification = classifyFidelityFailuresForRepair(args.fidelity);
  const appendix = fidelityRepairAppendix(args.winner, args.fidelity);
  const patchTargets: RepairPatchTarget[] = [
    "hook",
    "voiceover_text",
    "video",
    "visual_scenes",
    "image_prompts",
    "subtitles",
  ];
  // Hook/opening must match Winner — preserve as pack authority, but they are
  // also patchTargets so the draft can be corrected TOWARD the winner.
  const preserve: PreserveRule[] = DEFAULT_REPAIR_PRESERVE.filter(
    (p) => p !== "hook" && p !== "opening",
  );

  return {
    version: REPAIR_DELTA_VERSION,
    validator: "concept_fidelity",
    severity: classification.material ? "material" : "deterministic",
    // Empty = all visual scenes may change; REQUIRED CHANGE still prioritizes scene 1.
    affectedScenes: [],
    affectedPlatforms: [],
    problem: classification.materialReasons.join("; ") ||
      args.fidelity.failureReasons.join("; "),
    requiredChange: appendix,
    preserve,
    failureCodes: [...args.fidelity.failureReasons],
    patchTargets,
  };
}

/** Story integrity hard failures → delta. */
export function buildStoryIntegrityRepairDelta(args: {
  winner: CreativeCandidate;
  integrity: StoryIntegrityResult;
  packageCta: string;
}): RepairDelta {
  const appendix = storyIntegrityRepairAppendix(
    args.winner,
    args.integrity,
    args.packageCta,
  );
  const hintedScenes = scenesFromStoryIntegrity(args.integrity);
  const codes = args.integrity.violations.map((v) => v.code);
  const needsCta =
    codes.includes("cta_mismatch") ||
    args.integrity.warnings.some((w) => w.code === "cta_mismatch");

  const patchTargets: RepairPatchTarget[] = [
    "voiceover_text",
    "video",
    "visual_scenes",
    "image_prompts",
    "subtitles",
  ];
  if (needsCta) patchTargets.push("cta");

  // Story integrity must keep hook/opening/world from packs unless location/actor codes.
  const preserve: PreserveRule[] = [...DEFAULT_REPAIR_PRESERVE];

  return {
    version: REPAIR_DELTA_VERSION,
    validator: "story_integrity",
    severity: "material",
    // Hint known scenes in problem text; empty affectedScenes = full visual rewrite
    // (matches legacy appendix "Regenerate visual_scenes + voiceover_text").
    affectedScenes: [],
    affectedPlatforms: [],
    problem:
      hintedScenes.length > 0
        ? `${args.integrity.summary} (hintedScenes=[${hintedScenes.join(", ")}])`
        : args.integrity.summary,
    requiredChange: appendix,
    preserve,
    failureCodes: codes,
    patchTargets,
  };
}

/** Product demonstration integrity → delta (available; wire when workflows enable). */
export function buildProductDemonstrationRepairDelta(args: {
  winner: CreativeCandidate;
  integrity: ProductDemonstrationIntegrityResult;
}): RepairDelta {
  const appendix = productDemonstrationRepairAppendix(
    args.winner,
    args.integrity,
  );
  return {
    version: REPAIR_DELTA_VERSION,
    validator: "product_demonstration_integrity",
    severity: "material",
    affectedScenes: scenesFromProductDemo(args.integrity),
    affectedPlatforms: [],
    problem: args.integrity.violations.map((v) => v.code).join("; "),
    requiredChange: appendix,
    preserve: DEFAULT_REPAIR_PRESERVE,
    failureCodes: args.integrity.violations.map((v) => v.code),
    patchTargets: ["visual_scenes", "image_prompts", "voiceover_text", "video"],
  };
}
