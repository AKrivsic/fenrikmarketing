/**
 * T2V "Vytvořit úplně jiný návrh" — one text-only creative attempt.
 * Same strategy slot. No ElevenLabs / Runway / social image.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadProjectOrThrow } from "@/lib/ai/workflows/shared";
import {
  loadAvailableAssets,
  loadStrategyItemContext,
  buildPackageBrief,
} from "@/lib/ai/workflows/packageShared";
import { buildAntiRepetitionMemory } from "@/lib/ai/workflows/antiRepetitionMemory";
import {
  buildCreativeSeed,
  pickCreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { FUNNEL_STAGE_LABELS } from "@/lib/ai/types";
import { parseContentControls, resolvePackagePlatforms, resolveVideoPackagePlatforms } from "@/lib/projects/contentControls";
import { resolvePreferredVideoUsageFromRef } from "@/lib/assets/preferredVideoUsage";
import { runCreativePipeline } from "@/lib/content-pipeline/runCreativePipeline";
import { loadProjectCreativeMemory } from "@/lib/content-memory/projectCreativeMemory";
import { extractCreativeRecord } from "@/lib/content-memory/projectCreativeMemory";
import { buildManualReviewCreativeReview } from "@/lib/creative-review/seed";
import { attachTextToVideoCreativePlanToBrief } from "@/lib/content-package/attachTextToVideoCreativePlan";
import { parsePackageVideoProductionMode } from "@/lib/content-package/packageVideoProductionMode";
import { DEFAULT_GENERATION_MODE } from "@/lib/ai/generationMode";
import type { CreativeReviewActor } from "@/lib/creative-review/types";
import { DEFAULT_EDITOR_LANGUAGE, parseEditorLanguage } from "@/lib/admin/editorLanguage";

export const T2V_CONCEPT_REGENERATE_USED = "t2v_concept_regenerate_used" as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function markBriefRejectedForCreativeMemory(
  brief: Record<string, unknown>,
  timestamp: string,
): Record<string, unknown> {
  return {
    ...brief,
    t2v_creative_rejected: true,
    t2v_creative_rejection: {
      rejected_at: timestamp,
      reason: "operator_requested_different_concept",
    },
  };
}

export function bannedNoteFromCurrentBrief(
  brief: Record<string, unknown>,
  topic: string,
  angle: string,
  pain: string,
): string {
  const record = extractCreativeRecord({
    packageId: "current",
    topic,
    angle,
    painPoint: pain,
    hook: typeof brief.hook === "string" ? brief.hook : "",
    visualText: Array.isArray(brief.visual_scenes)
      ? JSON.stringify(brief.visual_scenes)
      : "",
    explicitRejected: true,
  });
  return (
    `Do not reuse pain="${record.pain_point ?? pain}"; ` +
    `scenario family ${record.scenario_family}; visual motif ${record.visual_motif}.`
  );
}

export async function regenerateTextToVideoCreativeConcept(args: {
  projectId: string;
  packageId: string;
  expectedVersion: number;
  actor: CreativeReviewActor;
  supabase?: SupabaseClient;
  now?: () => Date;
}): Promise<
  | { ok: true; brief: Record<string, unknown> }
  | { ok: false; error: string; code: string }
> {
  const supabase = args.supabase ?? createSupabaseAdminClient();
  const timestamp = (args.now ?? (() => new Date()))().toISOString();
  const project = await loadProjectOrThrow(supabase, args.projectId);
  const { data: existing, error } = await supabase
    .from("content_packages")
    .select("id, title, strategy_item_id, package_brief, status")
    .eq("id", args.packageId)
    .eq("project_id", args.projectId)
    .maybeSingle();
  if (error) throw error;
  if (!existing) {
    return { ok: false, error: "Package not found.", code: "not_found" };
  }
  const priorBrief = asRecord(existing.package_brief);
  if (!priorBrief) {
    return { ok: false, error: "Package brief missing.", code: "invalid_input" };
  }
  if (parsePackageVideoProductionMode(priorBrief.package_video_mode) !== "text_to_video") {
    return {
      ok: false,
      error: "Regenerate concept is only for text-to-video packages.",
      code: "validation_failed",
    };
  }
  if (priorBrief[T2V_CONCEPT_REGENERATE_USED] === true) {
    return {
      ok: false,
      error: "Tento návrh už měl jeden pokus o jiný concept.",
      code: "validation_failed",
    };
  }
  const review = asRecord(priorBrief.creative_review);
  const version = typeof review?.version === "number" ? review.version : 0;
  if (version !== args.expectedVersion) {
    return {
      ok: false,
      error: "This package was modified by another editor. Refresh and try again.",
      code: "version_conflict",
    };
  }
  if (!existing.strategy_item_id) {
    return { ok: false, error: "Missing strategy item.", code: "invalid_input" };
  }

  const context = await loadStrategyItemContext(
    supabase,
    args.projectId,
    existing.strategy_item_id as string,
  );
  const assets = await loadAvailableAssets(supabase, args.projectId);
  const memory = await buildAntiRepetitionMemory(supabase, args.projectId, {
    excludePackageId: args.packageId,
  });
  const creativeMemory = await loadProjectCreativeMemory(supabase, args.projectId, {
    excludePackageId: args.packageId,
  });
  const bannedNote = bannedNoteFromCurrentBrief(
    priorBrief,
    context.topic,
    context.angle ?? "",
    context.painPoint ?? "",
  );
  const controls = parseContentControls(project.publishing_rules);
  const targetPlatforms = resolvePackagePlatforms(project.platforms);
  const videoPlatforms = resolveVideoPackagePlatforms(
    project.platforms,
    controls.platformContentTypes,
  );
  const directives = pickCreativeDirectives(
    buildCreativeSeed(
      FUNNEL_STAGE_LABELS[context.funnelStage],
      context.topic,
      context.angle,
      `t2v-regen-${args.packageId}-${timestamp}`,
    ),
  );
  const preferredVideoUsageById = new Map(
    assets.refs.map((ref) => [ref.id, resolvePreferredVideoUsageFromRef(ref)]),
  );

  let generated;
  try {
    generated = await runCreativePipeline(supabase, {
      project,
      context,
      assets,
      memory,
      targetPlatforms,
      videoPlatforms,
      requireVideo: videoPlatforms.length > 0,
      packageIndex: context.packageIndex,
      packageCount: 1,
      generationMode: DEFAULT_GENERATION_MODE,
      packageVideoMode: "text_to_video",
      assetCoverage: null,
      preferredVideoUsageById,
      directives,
      creativeMemory,
      t2vBannedNote: bannedNote,
      regeneration: {
        instruction:
          "Invent a completely different concept. Do not reuse the previous pain, scenario family, or visual motif. No media.",
        previousTitle: (existing.title as string) ?? "",
        previousPackageSummary: `${existing.title}: ${typeof priorBrief.hook === "string" ? priorBrief.hook : ""}`,
        priorVideoConcept: null,
        priorOpeningImpact: null,
        priorVisualIdentity: null,
        packageId: args.packageId,
        keepHook: false,
        keepConcept: false,
        keepWording: false,
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Regenerate failed.",
      code: "generation_failed",
    };
  }
  if (!generated.ok) {
    return {
      ok: false,
      error: "Nový návrh se nepodařilo vytvořit. Původní návrh zůstal.",
      code: "generation_failed",
    };
  }

  const pkg = generated.data.package;
  const editorLanguage = parseEditorLanguage(
    priorBrief.editor_language,
    DEFAULT_EDITOR_LANGUAGE,
  );
  const reviewSeed = await buildManualReviewCreativeReview(pkg, {
    editorLanguage,
    sourceLanguage: project.language,
    packageVideoMode: "text_to_video",
  });
  let nextBrief = buildPackageBrief(pkg, {
    creativeReview: reviewSeed,
    packageVideoMode: "text_to_video",
  }) as unknown as Record<string, unknown>;
  nextBrief = {
    ...nextBrief,
    [T2V_CONCEPT_REGENERATE_USED]: true,
    t2v_previous_concept: markBriefRejectedForCreativeMemory(priorBrief, timestamp),
    language: priorBrief.language ?? project.language,
  };
  nextBrief = await attachTextToVideoCreativePlanToBrief({
    supabase,
    projectId: args.projectId,
    packageId: args.packageId,
    brief: nextBrief,
    generationMode: DEFAULT_GENERATION_MODE,
    memory,
  });

  const { error: updErr } = await supabase
    .from("content_packages")
    .update({
      title: pkg.title,
      package_brief: nextBrief as never,
    })
    .eq("id", args.packageId)
    .eq("project_id", args.projectId);
  if (updErr) {
    return {
      ok: false,
      error: "Persist failed; original concept kept.",
      code: "validation_failed",
    };
  }
  return { ok: true, brief: nextBrief };
}

export async function rejectTextToVideoCreative(args: {
  projectId: string;
  packageId: string;
  supabase?: SupabaseClient;
  now?: () => Date;
}): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  const supabase = args.supabase ?? createSupabaseAdminClient();
  const timestamp = (args.now ?? (() => new Date()))().toISOString();
  const { data: existing, error } = await supabase
    .from("content_packages")
    .select("package_brief")
    .eq("id", args.packageId)
    .eq("project_id", args.projectId)
    .maybeSingle();
  if (error) throw error;
  if (!existing) return { ok: false, error: "Package not found.", code: "not_found" };
  const brief = asRecord(existing.package_brief);
  if (!brief) return { ok: false, error: "Brief missing.", code: "invalid_input" };
  const next = markBriefRejectedForCreativeMemory(brief, timestamp);
  const { error: updErr } = await supabase
    .from("content_packages")
    .update({ package_brief: next as never })
    .eq("id", args.packageId)
    .eq("project_id", args.projectId);
  if (updErr) {
    return { ok: false, error: "Reject persist failed.", code: "validation_failed" };
  }
  return { ok: true };
}
