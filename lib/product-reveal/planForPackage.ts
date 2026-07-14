import type { Project } from "@/lib/supabase/types";
import type { GenerationMode } from "@/lib/ai/generationMode";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import type { VisualNarrativePlan } from "@/lib/visual-narrative/types";
import type { VisualMedium } from "@/lib/visual-medium/visualMedium";
import { resolveProductRevealPlan } from "@/lib/product-reveal/resolveProductReveal";
import {
  buildProductRevealPromptBlock,
  productRevealFieldsForPersistence,
} from "@/lib/product-reveal/promptBlocks";
import type { ProductRevealPlan } from "@/lib/product-reveal/types";

export function planProductRevealForPackage(args: {
  project: Project;
  generationMode: GenerationMode;
  assets: readonly AssetRef[];
  narrative: VisualNarrativePlan | null;
  visualMedium: VisualMedium;
  requireVideo: boolean;
}): {
  plan: ProductRevealPlan | null;
  promptBlock: string;
  persistenceFields: Record<string, unknown>;
} {
  if (!args.requireVideo) {
    return { plan: null, promptBlock: "", persistenceFields: {} };
  }

  const plan = resolveProductRevealPlan({
    project: args.project,
    generationMode: args.generationMode,
    assets: args.assets,
    narrative: args.narrative,
    visualMedium: args.visualMedium,
  });

  return {
    plan,
    promptBlock: buildProductRevealPromptBlock(plan),
    persistenceFields: productRevealFieldsForPersistence(plan),
  };
}
