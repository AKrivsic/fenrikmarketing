import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentFormat, Json, Project } from "@/lib/supabase/types";
import {
  normalizeFunnelStage,
  PERSISTABLE_PACKAGE_PLATFORMS,
  type FunnelStage,
} from "@/lib/ai/types";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import { maybeAppendWebsiteUrl } from "@/lib/ai/websiteLinks";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import {
  checkAssetModification,
  checkContentPackageGuardrails,
  classifyAsset,
  type AssetClass,
} from "@/lib/ai/guardrails";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import { coerceFormat, WorkflowError } from "@/lib/ai/workflows/shared";
import { MAX_VIDEO_SCENE_STILLS } from "@/lib/video-engine/storyboard";
import { readAssetAnalysis } from "@/lib/assets/analysis";
import { readProductRole } from "@/lib/assets/productRole";
import {
  sortAvailableAssetEntries,
  type AvailableAssetEntry,
} from "@/lib/assets/sortAvailableAssetRefs";
import {
  assetCoverageGuardrailRequired,
  assetCoverageGuardrailShouldUse,
  type AssetCoverageDecision,
} from "@/lib/assets/assetCoveragePolicy";
import type { AssetQualityTier } from "@/lib/assets/assetIngestMetadata";
import {
  readSafeVerticalUsage,
  readVideoSuitability,
  shouldIncludeAssetInVideoWorker,
} from "@/lib/assets/smartUsageMetadata";

export interface StrategyItemContext {
  weeklyStrategyId: string;
  strategyItemId: string;
  funnelStage: FunnelStage;
  topic: string;
  angle: string | null;
  platform: string;
  format: ContentFormat;
  // Production Run V3 trace (present only for run-seeded items). Lets the
  // generator fan text outputs out by the run's multipliers and tag each
  // content_item with its run + package index.
  productionRunId: string | null;
  packageIndex: number | null;
}

// Loads the strategy item and derives the strategic context. The NOT NULL FK
// strategy_id guarantees a weekly_strategy_id exists -> no isolated package.
export async function loadStrategyItemContext(
  supabase: SupabaseClient,
  projectId: string,
  strategyItemId: string,
): Promise<StrategyItemContext> {
  if (!strategyItemId) {
    throw new WorkflowError("invalid_input", "strategy_item_id is required");
  }
  const { data, error } = await supabase
    .from("content_strategy_items")
    .select("id, strategy_id, platform, format, funnel_stage, brief")
    .eq("id", strategyItemId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new WorkflowError(
      "not_found",
      `strategy item ${strategyItemId} not found in project ${projectId}`,
    );
  }

  const brief = (data.brief ?? {}) as Record<string, unknown>;
  // Prefer the first-class column; fall back to the legacy brief value for
  // rows created before migration 008. Normalize to a canonical funnel stage.
  const funnelStage = normalizeFunnelStage(
    (data.funnel_stage as string | null) ?? (brief["funnel_stage"] as string | null),
  );
  if (!funnelStage) {
    throw new WorkflowError(
      "invalid_input",
      "strategy item is missing a valid funnel_stage",
    );
  }

  const productionRunId =
    typeof brief["production_run_id"] === "string"
      ? (brief["production_run_id"] as string)
      : null;
  const packageIndexRaw = brief["package_index"];
  const packageIndex =
    typeof packageIndexRaw === "number" && Number.isFinite(packageIndexRaw)
      ? Math.trunc(packageIndexRaw)
      : null;

  return {
    weeklyStrategyId: data.strategy_id as string,
    strategyItemId: data.id as string,
    funnelStage,
    topic: (brief["topic"] as string) ?? "",
    angle: (brief["angle"] as string | null) ?? null,
    platform: data.platform as string,
    format: data.format as ContentFormat,
    productionRunId,
    packageIndex,
  };
}

export interface LoadedAssets {
  refs: AssetRef[];
  classById: Map<string, AssetClass>;
}

export async function loadAvailableAssets(
  supabase: SupabaseClient,
  projectId: string,
): Promise<LoadedAssets> {
  const { data, error } = await supabase
    .from("assets")
    .select("id, title, media_type, asset_mode, metadata")
    .eq("project_id", projectId);
  if (error) throw error;

  const entries: AvailableAssetEntry[] = [];
  const classById = new Map<string, AssetClass>();
  for (const a of data ?? []) {
    const cls = classifyAsset(
      a.asset_mode as string,
      (a.metadata as Record<string, unknown> | null) ?? null,
    );
    classById.set(a.id as string, cls);
    const metadata = a.metadata as Json;
    const analysis = readAssetAnalysis(metadata);
    const trust = analysis?.trustSignal === true ? true : null;
    entries.push({
      metadata,
      ref: {
        id: a.id as string,
        title: a.title as string,
        media_type: a.media_type as string,
        asset_class: cls,
        ai_description: analysis?.aiDescription ?? null,
        detected_content_type: readMetadataString(metadata, "detected_content_type"),
        suggested_usage: analysis?.suggestedUsage ?? null,
        trust_signal: trust,
        product_role: readProductRole(metadata),
        asset_quality: readAssetQualityTier(metadata),
        orientation: readMetadataString(metadata, "orientation"),
        preferred_presentation: readMetadataString(metadata, "preferred_presentation"),
        video_suitability: readMetadataString(metadata, "video_suitability"),
        safe_vertical_usage: readSafeVerticalUsage(metadata),
        aspect_ratio: readAspectRatio(metadata),
        visual_importance: readMetadataString(metadata, "visual_importance"),
      },
    });
  }
  const refs = sortAvailableAssetEntries(entries);
  return { refs, classById };
}

function readMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readAssetQualityTier(metadata: unknown): AssetQualityTier | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).asset_quality;
  if (value === "high" || value === "medium" || value === "low") return value;
  return null;
}

function readAspectRatio(metadata: unknown): string | number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).aspect_ratio;
  if (typeof value === "string" || typeof value === "number") return value;
  return null;
}

// Combines structural content-package guardrails with asset-modification rules
// (STATIC assets must not be modified).
export function makePackageGuardrails(args: {
  project: Project;
  context: StrategyItemContext;
  classById: Map<string, AssetClass>;
  // Platform surfaces the package must produce (project.platforms resolved to
  // the package-capable subset). Defaults to the full required set.
  requiredPlatforms?: readonly string[];
  // Whether a video block is mandatory (defaults to true). False for text-only
  // packages where no selected platform requires video.
  requireVideo?: boolean;
  assetCoverage?: AssetCoverageDecision | null;
}): (pkg: ContentPackageOutput) => ValidationIssue[] {
  const {
    project,
    context,
    classById,
    requiredPlatforms,
    requireVideo,
    assetCoverage,
  } = args;
  return (pkg) => {
    const issues = checkContentPackageGuardrails(pkg, {
      project,
      weeklyStrategyId: context.weeklyStrategyId,
      strategyItemId: context.strategyItemId,
      strategyItemFunnelStage: context.funnelStage,
      requiredPlatforms,
      requireVideo,
    });

    for (const usage of pkg.asset_usage ?? []) {
      const cls = classById.get(usage.asset_id);
      if (!cls) {
        issues.push({
          path: "$.asset_usage",
          message: `asset ${usage.asset_id} not found in project`,
        });
        continue;
      }
      const wantsModification = usage.modify === "true" || usage.modify === "1";
      const assetIssue = checkAssetModification(cls, wantsModification);
      if (assetIssue) issues.push(assetIssue);
    }

    if (assetCoverage && assetCoverage.qualityAssetCount > 0) {
      const usage = pkg.asset_usage ?? [];
      if (assetCoverageGuardrailRequired(assetCoverage) && usage.length === 0) {
        issues.push({
          path: "$.asset_usage",
          message:
            "Sample mode requires at least one asset_usage when quality product assets exist.",
        });
      } else if (
        assetCoverageGuardrailShouldUse(assetCoverage) &&
        usage.length === 0
      ) {
        issues.push({
          path: "$.asset_usage",
          message:
            "This package should include asset_usage (series coverage slot); add at least one quality product asset.",
        });
      }
    }

    return issues;
  };
}

// MVP scene/image cost cap — normalizes a package's image_prompts IN PLACE so
// the persisted package_brief and the queued video job both carry the exact
// same, render-ready list: empty/whitespace prompts are dropped and the list is
// capped to MAX_VIDEO_SCENE_STILLS (1 video = ≤5 generated stills = ≤5 image
// generations). Guardrails already reject >5 before this runs; this is the
// belt-and-suspenders cap that also guarantees brief === what gets rendered.
// No-op for packages without image_prompts (e.g. text-only).
export function normalizeImagePrompts(
  pkg: ContentPackageOutput,
  logContext: Record<string, unknown> = {},
): void {
  const cleaned = (pkg.image_prompts ?? [])
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) => p.trim());
  if (cleaned.length > MAX_VIDEO_SCENE_STILLS) {
    console.warn(
      "[content-package] image_prompts truncated to cap",
      JSON.stringify({
        ...logContext,
        original_count: cleaned.length,
        capped_count: MAX_VIDEO_SCENE_STILLS,
      }),
    );
  }
  pkg.image_prompts = cleaned.slice(0, MAX_VIDEO_SCENE_STILLS);
}

// Assembles the package_brief jsonb. weekly_strategy_id, strategy_item_id and
// funnel_stage are now first-class columns on content_packages, so they no
// longer live here. The brief retains the creative payload that has no
// dedicated column: hook, voiceover_text, subtitles, cta, video, the full
// platform_outputs (incl. google_business) and asset_usage.
export function buildPackageBrief(pkg: ContentPackageOutput): Json {
  return {
    hook: pkg.hook,
    voiceover_text: pkg.voiceover_text,
    subtitles: pkg.subtitles,
    cta: pkg.cta,
    video: pkg.video,
    platform_outputs: pkg.platform_outputs,
    hashtags: pkg.hashtags ?? [],
    image_prompts: pkg.image_prompts ?? [],
    asset_usage: pkg.asset_usage ?? [],
    // Phase 2E — record the scenario used so anti-repetition memory can read it.
    scenario: pkg.scenario ?? null,
  } as unknown as Json;
}

// Video Quality V2 — assembles the video_jobs.input. Beyond the narration it
// now carries the hook, scenario and the image_prompts so the worker can build
// a richer storyboard, plus asset_images: durable Storage refs of the image-type
// assets the package referenced (Task 6). The worker reuses those stills (no new
// image generation). `extra` lets callers add flags (e.g. { regenerated: true }).
export async function buildVideoJobInput(
  supabase: SupabaseClient,
  projectId: string,
  pkg: ContentPackageOutput,
  extra: Record<string, unknown> = {},
): Promise<Json> {
  const assetImages = await loadAssetImages(supabase, projectId, pkg);
  return {
    concept: pkg.video.concept,
    script: pkg.video.script,
    voiceover_text: pkg.voiceover_text,
    subtitles: pkg.subtitles,
    hook: pkg.hook,
    scenario: pkg.scenario ?? null,
    cta: pkg.cta?.text ?? null,
    image_prompts: pkg.image_prompts ?? [],
    asset_images: assetImages,
    ...extra,
  } as unknown as Json;
}

// Resolves the image-type assets referenced in pkg.asset_usage to durable
// Storage references. Best-effort: any failure yields an empty list so video
// jobs are never blocked by asset resolution.
async function loadAssetImages(
  supabase: SupabaseClient,
  projectId: string,
  pkg: ContentPackageOutput,
): Promise<{ bucket: string; path: string; title: string }[]> {
  const usages = pkg.asset_usage ?? [];
  const usageIds = Array.from(
    new Set(usages.map((u) => u.asset_id).filter(Boolean)),
  );
  if (usageIds.length === 0) return [];

  const usedAsById = new Map<string, string>();
  for (const u of usages) {
    if (u.asset_id && u.used_as?.trim()) {
      usedAsById.set(u.asset_id, u.used_as.trim());
    }
  }

  const { data, error } = await supabase
    .from("assets")
    .select("id, title, media_type, storage_bucket, storage_path, metadata")
    .eq("project_id", projectId)
    .in("id", usageIds)
    .eq("media_type", "image");
  if (error || !data) return [];

  const result: { bucket: string; path: string; title: string }[] = [];
  for (const row of data) {
    const bucket = row.storage_bucket as string | null;
    const path = row.storage_path as string | null;
    if (!bucket || !path) continue;

    const metadata = (row.metadata as Json) ?? {};
    const include = shouldIncludeAssetInVideoWorker({
      metadata,
      usedAs: usedAsById.get(row.id as string),
    });
    if (!include) {
      console.warn(
        "[content-package] asset omitted from video worker (unsafe fullscreen)",
        JSON.stringify({
          asset_id: row.id,
          video_suitability: readVideoSuitability(metadata),
          safe_vertical_usage: readSafeVerticalUsage(metadata),
        }),
      );
      continue;
    }

    result.push({ bucket, path, title: (row.title as string) ?? "" });
  }
  return result;
}

export interface PersistableItem {
  platform: (typeof PERSISTABLE_PACKAGE_PLATFORMS)[number];
  format: ContentFormat;
  caption: string;
  cta: string;
  hashtags: string[];
}

// Builds the content_item rows for the persistable platforms. When
// targetPlatforms is given, only those persistable platforms are produced (so a
// project's selected platforms are respected); otherwise all persistable
// platforms are attempted (existing behavior).
export function buildPersistableItems(
  pkg: ContentPackageOutput,
  context: StrategyItemContext,
  targetPlatforms?: readonly string[],
  // Website URL & CTA Usage V1 — the project's canonical website URL. When
  // provided, the deterministic post-process may append it to the CTA on the
  // eligible platforms/stages (see maybeAppendWebsiteUrl). Defaults to null,
  // which keeps the historical behavior (no URL is ever appended).
  websiteUrl: string | null = null,
): PersistableItem[] {
  const items: PersistableItem[] = [];
  const allowed = targetPlatforms ? new Set(targetPlatforms) : null;
  for (const platform of PERSISTABLE_PACKAGE_PLATFORMS) {
    if (allowed && !allowed.has(platform)) continue;
    const output = pkg.platform_outputs[platform];
    if (!output) continue;
    items.push({
      platform,
      format: coerceFormat(output.format, context.format),
      caption: output.caption,
      cta: maybeAppendWebsiteUrl({
        platform,
        cta: output.cta,
        funnelStage: context.funnelStage,
        ctaType: pkg.cta?.type,
        websiteUrl,
      }),
      hashtags: output.hashtags ?? pkg.hashtags ?? [],
    });
  }
  return items;
}
