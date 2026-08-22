/**
 * "Vytvořit úplně jiný návrh" for Creative Core v2 — one text AI Core request.
 * Atomically replaces prior Core + Manual Review seed. No paid media.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadProjectOrThrow } from "@/lib/ai/workflows/shared";
import { loadStrategyItemContext } from "@/lib/ai/workflows/packageShared";
import {
  buildCreativeSeed,
  pickCreativeDirectives,
} from "@/lib/ai/prompts/creativeDirectives";
import { FUNNEL_STAGE_LABELS } from "@/lib/ai/types";
import {
  parseContentControls,
  resolvePackagePlatforms,
  resolveVideoPackagePlatforms,
} from "@/lib/projects/contentControls";
import {
  buildManualReviewCreativeReviewFromCore,
  CREATIVE_CORE_V2_BRIEF_KEY,
  CREATIVE_CORE_V2_PROVENANCE_KEY,
  projectCreativeCoreToLegacyPackage,
  readCreativeCoreV2FromBrief,
  runCreativeCoreV2Pipeline,
} from "@/lib/content-creative-core-v2";
import { DEFAULT_GENERATION_MODE } from "@/lib/ai/generationMode";
import {
  DEFAULT_EDITOR_LANGUAGE,
  parseEditorLanguage,
} from "@/lib/admin/editorLanguage";
import type { CreativeReviewActor } from "@/lib/creative-review/types";
import { parsePackageVideoProductionMode } from "@/lib/content-package/packageVideoProductionMode";
import type { Json } from "@/lib/supabase/types";

export const CREATIVE_CORE_V2_REGENERATE_USED =
  "content_creative_core_v2_regenerate_used" as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function regenerateCreativeCoreV2Concept(args: {
  projectId: string;
  packageId: string;
  expectedVersion: number;
  actor: CreativeReviewActor;
  client?: SupabaseClient;
}): Promise<
  | { ok: true }
  | { ok: false; error: string; code?: string }
> {
  const supabase = args.client ?? createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("content_packages")
    .select("id, strategy_item_id, package_brief, title")
    .eq("id", args.packageId)
    .eq("project_id", args.projectId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return { ok: false, error: "Package not found.", code: "not_found" };

  const brief = asRecord(row.package_brief) ?? {};
  if (brief[CREATIVE_CORE_V2_REGENERATE_USED] === true) {
    return {
      ok: false,
      error: "Completely different proposal was already used once.",
      code: "validation_failed",
    };
  }
  const priorCore = readCreativeCoreV2FromBrief(brief);
  if (!priorCore) {
    return {
      ok: false,
      error: "Creative Core v2 missing.",
      code: "validation_failed",
    };
  }

  const review = asRecord(brief.creative_review);
  const version = typeof review?.version === "number" ? review.version : null;
  if (version !== args.expectedVersion) {
    return {
      ok: false,
      error: "Version conflict — reload and try again.",
      code: "version_conflict",
    };
  }

  const project = await loadProjectOrThrow(supabase, args.projectId);
  const context = await loadStrategyItemContext(
    supabase,
    args.projectId,
    row.strategy_item_id as string,
  );
  const controls = parseContentControls(project.publishing_rules);
  const targetPlatforms = resolvePackagePlatforms(project.platforms);
  const videoPlatforms = resolveVideoPackagePlatforms(
    project.platforms,
    controls.platformContentTypes,
  );
  const requireVideo = videoPlatforms.length > 0;
  const directives = pickCreativeDirectives(
    buildCreativeSeed(
      FUNNEL_STAGE_LABELS[context.funnelStage],
      context.topic,
      context.angle,
      `core-v2-regen-${args.packageId}`,
    ),
  );

  const bannedNote = [
    `Banned prior core_idea: ${priorCore.core_idea}`,
    `Banned prior hook: ${priorCore.hook}`,
    `Banned prior conflict: ${priorCore.conflict}`,
  ].join("\n");

  const created = await runCreativeCoreV2Pipeline(supabase, {
    project,
    context,
    targetPlatforms,
    requireVideo,
    generationMode: DEFAULT_GENERATION_MODE,
    packageVideoMode: parsePackageVideoProductionMode(brief.package_video_mode),
    directives,
    rejectedConceptsNote: bannedNote,
  });
  if (!created.ok) {
    return {
      ok: false,
      error: "Creative Core regeneration failed.",
      code: "generation_failed",
    };
  }

  const core = created.data.creativeCore;
  const projected = projectCreativeCoreToLegacyPackage({
    core,
    packageKind: requireVideo ? "video" : "text_only",
    funnelStage: context.funnelStage,
    targetPlatforms,
  });
  if (!projected.ok) {
    return {
      ok: false,
      error: `Legacy projection failed: ${projected.detail}`,
      code: "validation_failed",
    };
  }

  const editorLanguage = parseEditorLanguage(
    brief.editor_language,
    DEFAULT_EDITOR_LANGUAGE,
  );
  const creativeReview = await buildManualReviewCreativeReviewFromCore({
    pkg: projected.package,
    core,
    editorLanguage,
    sourceLanguage: project.language,
  });

  const nextBrief: Record<string, unknown> = {
    ...brief,
    ...asRecord(buildPackageBriefFields(projected.package, brief)),
    [CREATIVE_CORE_V2_BRIEF_KEY]: core,
    [CREATIVE_CORE_V2_PROVENANCE_KEY]: projected.provenance,
    [CREATIVE_CORE_V2_REGENERATE_USED]: true,
    creative_review: creativeReview,
    media_projections_stale: true,
    title: projected.package.title,
  };
  // Drop prior approved snapshot — new Core is unapproved.
  delete nextBrief.content_creative_core_v2_approved_snapshot;

  const { error: updateErr } = await supabase
    .from("content_packages")
    .update({
      package_brief: nextBrief as unknown as Json,
      title: projected.package.title,
    })
    .eq("id", args.packageId)
    .eq("project_id", args.projectId);
  if (updateErr) throw updateErr;

  void args.actor;
  return { ok: true };
}

function buildPackageBriefFields(
  pkg: { hook?: string; voiceover_text?: string; visual_scenes?: unknown },
  prior: Record<string, unknown>,
): Record<string, unknown> {
  return {
    hook: pkg.hook ?? prior.hook,
    voiceover_text: pkg.voiceover_text ?? prior.voiceover_text,
    visual_scenes: pkg.visual_scenes ?? prior.visual_scenes,
  };
}
