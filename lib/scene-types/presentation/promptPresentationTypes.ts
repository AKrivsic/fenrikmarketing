import type { Json } from "@/lib/supabase/types";
import type { Project } from "@/lib/supabase/types";
import { isSceneTypesEnabled } from "@/lib/scene-types/config";
import { deriveAllowedSceneTypes } from "@/lib/scene-types/presentation/deriveAllowedSceneTypes";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import {
  deriveProjectPresentationSignals,
  type ProjectAssetSignal,
} from "@/lib/scene-types/presentation/projectSignals";
import { resolveChecklistGenerationMode } from "@/lib/scene-types/checklistGenerationMode";
import { isChecklistPromptPermittedForProject } from "@/lib/scene-types/checklistProductionRollout";
import { projectPermitsCtaScenes } from "@/lib/scene-types/cta/ctaSourceOfTruth";

export type PromptPresentationType =
  | "IMAGE"
  | "CHECKLIST"
  | "PHONE"
  | "QUOTE"
  | "STATISTIC"
  | "CTA";

/** Scene types the content-generation prompt may mention (never the full enum). */
export function derivePromptPresentationTypes(args: {
  projectId: string;
  project: Pick<
    Project,
    "product_is" | "product_strengths" | "knowledge" | "default_cta" | "goal_type"
  >;
  assets?: readonly ProjectAssetSignal[];
}): PromptPresentationType[] {
  const sceneTypesEnabled = isSceneTypesEnabled();
  if (!sceneTypesEnabled) {
    return ["IMAGE"];
  }

  const proof = buildProofIndex(
    (args.project.knowledge as Json | null | undefined) ?? null,
  );
  const projectSignals = deriveProjectPresentationSignals({
    project: args.project,
    assets: args.assets ? [...args.assets] : [],
  });

  const ceiling = deriveAllowedSceneTypes(
    {
      knowledge: (args.project.knowledge as Json | null | undefined) ?? null,
      proof,
      projectSignals,
      projectDefaultCta: args.project.default_cta,
      goalType: args.project.goal_type,
    },
    { sceneTypesEnabled: true },
  );

  const out: PromptPresentationType[] = ["IMAGE"];
  if (
    ceiling.includes("CHECKLIST") &&
    isChecklistPromptPermittedForProject(args.projectId)
  ) {
    out.push("CHECKLIST");
  }
  if (ceiling.includes("PHONE")) {
    out.push("PHONE");
  }
  if (ceiling.includes("QUOTE")) {
    out.push("QUOTE");
  }
  if (ceiling.includes("STATISTIC")) {
    out.push("STATISTIC");
  }
  if (ceiling.includes("CTA") && projectPermitsCtaScenes({
    projectDefaultCta: args.project.default_cta,
    goalType: args.project.goal_type,
  })) {
    out.push("CTA");
  }
  return out;
}

export function formatPromptPresentationTypesList(
  types: readonly PromptPresentationType[],
): string {
  return types.join(", ");
}

export function promptAllowsChecklist(
  types: readonly PromptPresentationType[],
): boolean {
  return types.includes("CHECKLIST");
}

export function promptAllowsPhone(
  types: readonly PromptPresentationType[],
): boolean {
  return types.includes("PHONE");
}

export function promptAllowsQuote(
  types: readonly PromptPresentationType[],
): boolean {
  return types.includes("QUOTE");
}

export function promptAllowsStatistic(
  types: readonly PromptPresentationType[],
): boolean {
  return types.includes("STATISTIC");
}

export function promptAllowsCta(
  types: readonly PromptPresentationType[],
): boolean {
  return types.includes("CTA");
}

export function resolveEffectivePresentationModeForLogging(): string {
  return resolveChecklistGenerationMode();
}
