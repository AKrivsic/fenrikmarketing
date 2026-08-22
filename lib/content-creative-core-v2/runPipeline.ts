/**
 * Creative Core v2 generation pipeline (flag ON only).
 * One Claude Creative Core request. No Concept / Opening / Scene Intent.
 * No social image, platform copy, or paid media in Step 2.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCopywritingProvider } from "@/lib/ai/index";
import type { Project } from "@/lib/supabase/types";
import type { WorkflowResult } from "@/lib/ai/workflows/shared";
import type { StrategyItemContext } from "@/lib/ai/workflows/packageShared";
import type { GenerationMode } from "@/lib/ai/generationMode";
import type { PackageVideoProductionMode } from "@/lib/content-package/packageVideoProductionMode";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { CreativeDirectives } from "@/lib/ai/prompts/creativeDirectives";
import type { TextCompletionResult } from "@/lib/ai/types";
import { withTelemetry } from "@/lib/ai/telemetry/withTelemetry";
import {
  buildCreativeMemory,
  CREATIVE_CORE_VALIDATION_FAILED_V2,
  createCreativeCore,
  ensureStrategyFingerprint,
  validateCreativeCore,
  computeCreativeFingerprint,
  type ContentCreativeCoreV2,
  type CreativeCorePackageKind,
} from "@/lib/content-creative-core-v2/index";
import { projectCreativeCoreToLegacyPackage } from "@/lib/content-creative-core-v2/legacyProjection";
import { CREATIVE_CORE_V2_BRIEF_KEY } from "@/lib/content-creative-core-v2/config";
import type { ContentPipelineArtifacts } from "@/lib/content-pipeline/types";
import {
  CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
  CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
} from "@/lib/content-pipeline/runContentPackage";

/** Matches ClaudeProvider default when complete() omits maxTokens — telemetry only. */
const CREATIVE_CORE_CLAUDE_DEFAULT_MAX_TOKENS = 4096;

export interface CreativeCoreV2PipelineInput {
  project: Project;
  context: StrategyItemContext;
  targetPlatforms: readonly string[];
  requireVideo: boolean;
  generationMode: GenerationMode;
  packageVideoMode?: PackageVideoProductionMode;
  directives: CreativeDirectives;
  rejectedConceptsNote?: string | null;
}

export interface CreativeCoreV2PipelineSuccess {
  package: ContentPackageOutput;
  artifacts: ContentPipelineArtifacts;
  directives: CreativeDirectives;
  creativeCore: ContentCreativeCoreV2;
  /** Step 2 must skip platform item materialization of final copy. */
  deferPlatformOutputs: true;
  deferSocialImage: true;
  deferPaidMedia: true;
}

export async function runCreativeCoreV2Pipeline(
  supabase: SupabaseClient,
  input: CreativeCoreV2PipelineInput,
): Promise<WorkflowResult<CreativeCoreV2PipelineSuccess>> {
  const packageKind: CreativeCorePackageKind = input.requireVideo
    ? "video"
    : "text_only";

  const { data: pkgRows } = await supabase
    .from("content_packages")
    .select("id, status, strategy_item_id, package_brief, title, created_at")
    .eq("project_id", input.project.id)
    .order("created_at", { ascending: false })
    .limit(60);

  const memory = buildCreativeMemory(
    (pkgRows ?? []).map((row) => ({
      packageId: row.id as string,
      brief:
        row.package_brief &&
        typeof row.package_brief === "object" &&
        !Array.isArray(row.package_brief)
          ? (row.package_brief as Record<string, unknown>)
          : {},
      title: typeof row.title === "string" ? row.title : null,
      createdAt: typeof row.created_at === "string" ? row.created_at : null,
      packageStatus: typeof row.status === "string" ? row.status : null,
      topic: input.context.topic,
      angle: input.context.angle,
      painPoint: input.context.painPoint,
    })),
  );

  const strategy = ensureStrategyFingerprint({
    topic: input.context.topic,
    angle: input.context.angle ?? input.context.topic,
    pain_point: input.context.painPoint ?? "",
    funnel_stage: input.context.funnelStage,
    creative_fingerprint: computeCreativeFingerprint({
      pain_point: input.context.painPoint,
      topic: input.context.topic,
      angle: input.context.angle,
    }),
  });

  const created = await createCreativeCore({
    context: {
      productBrain: {
        product_name: input.project.name,
        product_description: Array.isArray(input.project.product_is)
          ? input.project.product_is.join("; ")
          : "",
        audience: JSON.stringify(input.project.target_audience ?? {}),
        market: String(input.project.market_scope ?? ""),
        strengths: input.project.product_strengths,
        pain_points: input.project.pain_points,
        cta: input.project.default_cta,
        brand_voice: JSON.stringify(input.project.tone_of_voice ?? {}),
      },
      strategy,
      strategyItemId: input.context.strategyItemId,
      funnelStage: input.context.funnelStage,
      platforms: input.targetPlatforms,
      language: input.project.language,
      memory,
      rejectedConceptsNote: input.rejectedConceptsNote ?? null,
      packageKind,
    },
    textProvider: {
      complete: async ({ system, prompt }) => {
        const provider = getCopywritingProvider();
        // Approximate Anthropic Messages body size for telemetry (never stored).
        const requestBodyForSize = {
          model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6",
          max_tokens: CREATIVE_CORE_CLAUDE_DEFAULT_MAX_TOKENS,
          temperature: 0.7,
          system,
          messages: [{ role: "user", content: prompt }],
        };

        const result = await withTelemetry(
          {
            stepName: "Creative Core v2",
            provider: "claude",
            model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6",
            maxTokens: CREATIVE_CORE_CLAUDE_DEFAULT_MAX_TOKENS,
            responseFormat: "json",
            timeoutMs: CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
            transportAttempt: 1,
            maxTransportAttempts: CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
            // Compact — never Product Brain / full prompt text.
            inputSummary:
              "Creative Core v2 Claude call:\n- Product Brain (size only)\n- Strategy candidate\n- Creative memory",
            outputSummary: (r: TextCompletionResult) =>
              r.text ? `json_chars=${r.text.length}` : "empty",
            measureInput: requestBodyForSize,
            measureOutput: (r: TextCompletionResult) => r.text,
            retryCount: 0,
            usageFromResult: (r: TextCompletionResult) =>
              r.usage
                ? {
                    prompt_tokens: r.usage.prompt_tokens,
                    completion_tokens: r.usage.completion_tokens,
                    cached_tokens: r.usage.cached_tokens,
                    model: r.model,
                  }
                : { prompt_tokens: null, completion_tokens: null, cached_tokens: null, model: r.model },
            providerRequestIdFromResult: (r: TextCompletionResult) =>
              typeof r.requestId === "string" ? r.requestId : null,
          },
          async () =>
            provider.complete({
              system,
              prompt,
              json: true,
              timeoutMs: CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS,
              maxTransportAttempts:
                CONTENT_PACKAGE_CLAUDE_MAX_TRANSPORT_ATTEMPTS,
            }),
        );

        const requestId =
          typeof result.requestId === "string" ? result.requestId : null;
        return { text: result.text, requestId };
      },
    },
  });

  if (!created.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: (created.issues ?? [
        { path: "$.content_creative_core_v2", message: created.error },
      ]).map((i) => ({
        path: i.path,
        message: i.message,
      })),
      attempts: 1,
      ...(created.lastRaw ? { lastRaw: created.lastRaw } : {}),
    };
  }

  const validation = validateCreativeCore({
    core: created.core,
    packageKind,
    memory,
    painPoint: input.context.painPoint,
    raw: created.core as unknown as Record<string, unknown>,
  });
  if (!validation.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: validation.issues.map((i) => ({
        path: i.path,
        message: `${CREATIVE_CORE_VALIDATION_FAILED_V2}: ${i.message}`,
      })),
      attempts: 1,
    };
  }

  const projected = projectCreativeCoreToLegacyPackage({
    core: created.core,
    packageKind,
    funnelStage: input.context.funnelStage,
    targetPlatforms: input.targetPlatforms,
    provenanceExtras: {
      voiceover_soft_clamp: created.voiceoverClampProvenance,
    },
  });
  if (!projected.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: [
        {
          path: `$.${CREATIVE_CORE_V2_BRIEF_KEY}`,
          message: `${projected.error}:${projected.detail}`,
        },
      ],
      attempts: 1,
    };
  }

  const pg = projected.package.presentation_generation as
    | Record<string, unknown>
    | undefined;
  const artifacts: ContentPipelineArtifacts = {
    pipeline: "content_pipeline",
    video_concept: (pg?.video_concept ?? {}) as ContentPipelineArtifacts["video_concept"],
    opening_impact: (pg?.opening_impact ??
      {}) as ContentPipelineArtifacts["opening_impact"],
    visual_identity: (pg?.visual_identity ??
      {}) as ContentPipelineArtifacts["visual_identity"],
  };

  return {
    ok: true,
    data: {
      package: projected.package,
      artifacts,
      directives: input.directives,
      creativeCore: created.core,
      deferPlatformOutputs: true,
      deferSocialImage: true,
      deferPaidMedia: true,
    },
  };
}
