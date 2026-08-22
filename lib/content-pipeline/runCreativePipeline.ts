import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project } from "@/lib/supabase/types";
import type { AntiRepetitionMemory, FunnelStage } from "@/lib/ai/types";
import type { CreativeDirectives } from "@/lib/ai/prompts/creativeDirectives";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { AssetRef } from "@/lib/assets/assetRef";
import type { WorkflowResult } from "@/lib/ai/workflows/shared";
import type { StrategyItemContext } from "@/lib/ai/workflows/packageShared";
import { makePackageGuardrails } from "@/lib/ai/workflows/packageShared";
import {
  normalizeVisualScenePlan,
  syncLegacyFieldsFromVisualScenes,
} from "@/lib/content-package/visualScenePlan";
import { normalizeImagePrompts } from "@/lib/ai/workflows/packageShared";
import { withTelemetrySync } from "@/lib/ai/telemetry";
import { resolveSelectedPainPoint } from "@/lib/ai/prompts/context";
import { buildContentPipelineFingerprint } from "@/lib/content-memory/pipelineFingerprint";
import { runVideoConcept } from "@/lib/content-pipeline/runVideoConcept";
import { runOpeningImpact } from "@/lib/content-pipeline/runOpeningImpact";
import { runContentPackageGeneration } from "@/lib/content-pipeline/runContentPackage";
import { buildVisualIdentity } from "@/lib/content-pipeline/visualIdentity";
import type {
  OpeningImpact,
  ContentPipelineArtifacts,
  VideoConcept,
  VisualIdentity,
} from "@/lib/content-pipeline/types";
import type { RegenerationContext } from "@/lib/content-pipeline/regeneration";
import type { AssetClass } from "@/lib/ai/guardrails";
import type { VideoUsageRenderMode } from "@/lib/assets/preferredVideoUsage";
import type { AssetCoverageDecision } from "@/lib/assets/assetCoveragePolicy";
import type { GenerationMode } from "@/lib/ai/generationMode";
import { packageNeedsSocialImage } from "@/lib/content-package/socialImage";
import {
  PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO,
  type PackageVideoProductionMode,
} from "@/lib/content-package/packageVideoProductionMode";
import type { ProjectCreativeMemory } from "@/lib/content-memory/projectCreativeMemory";
import { loadProjectCreativeMemory } from "@/lib/content-memory/projectCreativeMemory";
import {
  deriveOpeningImpactFromT2vPackage,
  deriveVideoConceptFromT2vCanonical,
  deriveVisualIdentityFromT2vCanonical,
  firstSceneImagePrompt,
  readT2vCanonicalCreativeFromPackage,
  stampT2vCanonicalCreativeOnPackage,
  T2V_CANONICAL_CREATIVE_CONTRACT_VERSION,
} from "@/lib/content-package/t2vCanonicalCreative";

export interface CreativePipelineContext {
  project: Project;
  context: StrategyItemContext;
  assets: {
    refs: AssetRef[];
    classById: Map<string, AssetClass>;
  };
  memory: AntiRepetitionMemory;
  targetPlatforms: readonly string[];
  videoPlatforms: readonly string[];
  requireVideo: boolean;
  variantCounts?: Record<string, number>;
  packageIndex: number | null;
  packageCount: number | null;
  generationMode: GenerationMode;
  packageVideoMode?: PackageVideoProductionMode;
  creativeMemory?: ProjectCreativeMemory | null;
  t2vBannedNote?: string | null;
  assetCoverage: AssetCoverageDecision | null;
  preferredVideoUsageById?: ReadonlyMap<string, VideoUsageRenderMode>;
  directives: CreativeDirectives;
  /** When set, stages receive regeneration instruction + prior package context. */
  regeneration?: RegenerationContext | null;
}

export interface CreativePipelineSuccess {
  package: ContentPackageOutput;
  artifacts: ContentPipelineArtifacts;
  directives: CreativeDirectives;
}

/**
 * Production creative pipeline (Generate and Regenerate):
 * Video Concept (Claude) → Opening Impact (OpenAI) → Visual Identity (deterministic)
 * → Content Package (Claude).
 *
 * No Creative Engine evaluation, Candidate Judge, fidelity/story/PDI repairs,
 * or RepairDelta loops.
 */
export async function runCreativePipeline(
  _supabase: SupabaseClient,
  input: CreativePipelineContext,
): Promise<WorkflowResult<CreativePipelineSuccess>> {
  const {
    project,
    context,
    assets,
    memory,
    targetPlatforms,
    videoPlatforms,
    requireVideo,
    variantCounts,
    packageIndex,
    packageCount,
    directives,
    assetCoverage,
    preferredVideoUsageById,
    regeneration = null,
  } = input;

  const painPoint = resolveSelectedPainPoint({
    project,
    briefPainPoint: context.painPoint,
    topic: context.topic,
  });

  const t2v = input.packageVideoMode === PACKAGE_VIDEO_MODE_TEXT_TO_VIDEO;
  let creativeMemory = input.creativeMemory ?? null;
  if (t2v && !creativeMemory) {
    creativeMemory = await loadProjectCreativeMemory(_supabase, project.id, {
      excludePackageId: regeneration?.packageId ?? null,
    });
  }

  let concept: VideoConcept;
  let openingImpact: OpeningImpact;
  let visualIdentity: VisualIdentity;

  if (t2v) {
    concept = {
      title: context.topic,
      core_idea: context.topic,
      narrative_arc: context.angle ?? context.topic,
      emotional_tone: "to be authored in the package",
      audience_insight: context.topic,
      product_role: "",
      why_it_works: "",
      visual_direction: {
        art_direction: "",
        lighting: "",
        palette: "",
        environment: "",
        camera_style: "Scene-specific. Do not copy a global camera into every clip.",
        character_style: "",
      },
    };
    openingImpact = {
      first_image: "",
      first_spoken_sentence: "",
      emotion: "",
      pacing: "",
      attention_pattern: "",
    };
    visualIdentity = {
      art_direction: "",
      lighting: "",
      palette: "",
      environment: "",
      camera_style: "Scene-specific. Do not copy a global camera into every clip.",
      character_style: "",
      opening_emotion: "",
      opening_first_image: "",
    };
  } else {
  const conceptResult = await runVideoConcept({
    project,
    funnelStage: context.funnelStage as FunnelStage,
    topic: context.topic,
    angle: context.angle,
    platform: context.platform,
    format: context.format,
    memory,
    packageIndex,
    packageCount,
    regeneration,
    directives,
    painPoint,
  });
  if (!conceptResult.ok) {
    return {
      ok: false,
      error: conceptResult.error,
      validationErrors: conceptResult.validationErrors,
      attempts: conceptResult.attempts,
    };
  }
  concept = conceptResult.data;

  const openingResult = await runOpeningImpact({
    project,
    concept,
    topic: context.topic,
    angle: context.angle,
    memory,
    regeneration,
    directives,
    painPoint,
  });
  if (!openingResult.ok) {
    return {
      ok: false,
      error: openingResult.error,
      validationErrors: openingResult.validationErrors,
      attempts: openingResult.attempts,
    };
  }
  openingImpact = openingResult.data;

  visualIdentity = withTelemetrySync(
    {
      stepName: "Visual Identity",
      provider: "deterministic",
      inputSummary:
        "Visual Identity input:\n- Video Concept visual_direction\n- Opening Impact",
      outputSummary: (v) => `Art direction: ${v.art_direction.slice(0, 60)}`,
      measureOutput: (v) => v,
    },
    () => buildVisualIdentity({ concept, openingImpact }),
  );
  }

  const packageResult = await runContentPackageGeneration({
    promptInput: {
      project,
      funnelStage: context.funnelStage as FunnelStage,
      topic: context.topic,
      angle: context.angle,
      platform: context.platform,
      format: context.format,
      concept,
      openingImpact,
      visualIdentity,
      availableAssets: assets.refs,
      memory,
      targetPlatforms,
      requireVideo,
      videoPlatforms,
      variantCounts,
      regeneration,
      directives,
      painPoint,
      packageVideoMode: input.packageVideoMode,
      creativeMemory,
      t2vBannedNote: input.t2vBannedNote,
    },
    guardrails: makePackageGuardrails({
      project,
      context,
      classById: assets.classById,
      requiredPlatforms: targetPlatforms,
      requireVideo,
      videoPlatforms,
      requireSocialImage: packageNeedsSocialImage(targetPlatforms),
      assetCoverage,
      preferredVideoUsageById: requireVideo
        ? preferredVideoUsageById
        : undefined,
    }),
  });
  if (!packageResult.ok) {
    return {
      ok: false,
      error: packageResult.error,
      validationErrors: packageResult.validationErrors,
      attempts: packageResult.attempts,
      lastRaw: packageResult.lastRaw,
    };
  }

  const pkg = packageResult.data;
  const normalizeCtx = regeneration
    ? { workflow: "regenerate" as const, package_id: regeneration.packageId }
    : {
        workflow: "generate" as const,
        strategy_item_id: context.strategyItemId,
      };

  // Light deterministic normalize (no creative repair) so video worker gets prompts.
  if (requireVideo) {
    normalizeVisualScenePlan(pkg, normalizeCtx, {
      classById: assets.classById,
    });
    syncLegacyFieldsFromVisualScenes(pkg);
    normalizeImagePrompts(pkg, normalizeCtx);
  }

  if (t2v) {
    const canonical = readT2vCanonicalCreativeFromPackage(pkg);
    if (!canonical) {
      return {
        ok: false,
        error: "generation_failed",
        validationErrors: [
          {
            path: "$.t2v_canonical_creative",
            message: `required t2v_canonical_creative contract_version ${T2V_CANONICAL_CREATIVE_CONTRACT_VERSION}`,
          },
        ],
        attempts: 1,
      };
    }
    stampT2vCanonicalCreativeOnPackage(pkg, canonical);
    concept = deriveVideoConceptFromT2vCanonical({
      title: pkg.title,
      creative: canonical,
    });
    openingImpact = deriveOpeningImpactFromT2vPackage({
      hook: pkg.hook,
      firstImage: firstSceneImagePrompt(pkg),
      emotion: canonical.primary_emotion,
    });
    visualIdentity = deriveVisualIdentityFromT2vCanonical({
      creative: canonical,
      opening: openingImpact,
    });
  }

  const fingerprint = buildContentPipelineFingerprint({
    concept,
    openingImpact,
    visualIdentity,
    creativeModeId: directives.mode.id,
  });

  const artifacts: ContentPipelineArtifacts = {
    pipeline: "content_pipeline",
    video_concept: concept,
    opening_impact: openingImpact,
    visual_identity: visualIdentity,
  };

  pkg.presentation_generation = {
    ...(typeof pkg.presentation_generation === "object" &&
    pkg.presentation_generation &&
    !Array.isArray(pkg.presentation_generation)
      ? pkg.presentation_generation
      : {}),
    pipeline: "content_pipeline",
    video_concept: concept,
    opening_impact: openingImpact,
    visual_identity: visualIdentity,
    content_pipeline_fingerprint: fingerprint,
    creative_mode: directives.mode.id,
    ...(painPoint ? { selected_pain_point: painPoint } : {}),
    ...(regeneration
      ? {
          regenerated: true,
          regeneration_instruction: regeneration.instruction,
        }
      : {}),
  };

  withTelemetrySync(
    {
      stepName: "Platform Outputs",
      provider: "deterministic",
      inputSummary:
        "Platform Outputs input:\n- Content Package\n- Target platforms",
      outputSummary: () => {
        const po = pkg.platform_outputs;
        const keys =
          po && typeof po === "object" ? Object.keys(po as object) : [];
        return keys.length > 0
          ? `Platforms: ${keys.join(", ")}`
          : "No platform_outputs";
      },
      measureOutput: () => pkg.platform_outputs ?? null,
    },
    () => pkg.platform_outputs,
  );

  return {
    ok: true,
    data: {
      package: pkg,
      artifacts,
      directives,
    },
  };
}
