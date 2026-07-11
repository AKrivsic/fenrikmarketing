import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssetClass } from "@/lib/ai/guardrails";
import { checkAssetModification } from "@/lib/ai/guardrails";
import {
  isChecklistVisualSceneEntry,
  isPhoneVisualSceneEntry,
  isQuoteVisualSceneEntry,
  isStatisticVisualSceneEntry,
  isCtaVisualSceneEntry,
  isTypedNonImageVisualSceneEntry,
  type PackageVisualSceneEntry,
} from "@/lib/content-package/generatedVisualScene";
import type { ContentPackageOutput, PackageAssetUsage } from "@/lib/ai/schemas/contentPackage";
import { checklistScenePayloadSchema } from "@/lib/scene-types/checklist/checklistScenePayload";
import { phoneScenePayloadSchema } from "@/lib/scene-types/phone/phoneScenePayload";
import { quoteScenePayloadSchema } from "@/lib/scene-types/quote/quoteScenePayload";
import { statisticScenePayloadSchema } from "@/lib/scene-types/statistic/statisticScenePayload";
import { ctaScenePayloadSchema } from "@/lib/scene-types/cta/ctaScenePayload";
import { generatedVisualScenesArrayValidator } from "@/lib/content-package/generatedVisualScene";
import type { ValidationIssue } from "@/lib/ai/validateAiOutput";
import {
  vEnum,
  vNonEmptyString,
  vObject,
  vOptional,
  vString,
  type Validator,
} from "@/lib/ai/validateAiOutput";
import type { Json } from "@/lib/supabase/types";
import { isAssetArchivedFromLibrary } from "@/lib/assets/libraryArchive";
import {
  assetUsageFullscreenViolation,
  isVideoUsageRenderMode,
  resolvePreferredVideoUsageFromMetadata,
  resolveVideoUsageForRender,
} from "@/lib/assets/preferredVideoUsage";
import type { Scene } from "@/lib/video-engine/schemas/sceneSchema";
import { MAX_VIDEO_SCENE_STILLS } from "@/lib/video-engine/storyboard";

export const VISUAL_SCENE_SOURCES = ["ai", "asset"] as const;
export type VisualSceneSource = (typeof VISUAL_SCENE_SOURCES)[number];

export interface VisualSceneAi {
  source: "ai";
  image_prompt: string;
}

export interface VisualSceneAsset {
  source: "asset";
  asset_id: string;
  used_as: string;
  video_usage?: string;
  modify?: string;
}

export type VisualScenePlanItem = VisualSceneAi | VisualSceneAsset;

const visualSceneAiValidator: Validator<VisualSceneAi> = vObject({
  source: vEnum(["ai"]),
  image_prompt: vNonEmptyString(),
}) as Validator<VisualSceneAi>;

const visualSceneAssetValidator: Validator<VisualSceneAsset> = vObject({
  source: vEnum(["asset"]),
  asset_id: vNonEmptyString(),
  used_as: vNonEmptyString(),
  video_usage: vOptional(vString()),
  modify: vOptional(vString()),
}) as Validator<VisualSceneAsset>;

export const visualScenePlanItemValidator: Validator<VisualScenePlanItem> = (
  value,
  path = "$",
) => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [{ path, message: "expected visual scene object" }];
  }
  const source = (value as Record<string, unknown>).source;
  if (source === "ai") return visualSceneAiValidator(value, path);
  if (source === "asset") return visualSceneAssetValidator(value, path);
  return [{ path: `${path}.source`, message: 'expected "ai" or "asset"' }];
};

export const visualScenesArrayValidator = (
  opts: { min?: number; max?: number } = {},
): Validator<VisualScenePlanItem[]> => {
  const { min = 1, max = MAX_VIDEO_SCENE_STILLS } = opts;
  return (value, path = "$") => {
    if (!Array.isArray(value)) {
      return [{ path, message: "expected array" }];
    }
    if (value.length < min) {
      return [{ path, message: `expected at least ${min} visual scene(s)` }];
    }
    if (value.length > max) {
      return [
        {
          path,
          message: `visual_scenes exceeds max ${max} scenes for one video`,
        },
      ];
    }
    return value.flatMap((entry, i) =>
      visualScenePlanItemValidator(entry, `${path}[${i}]`),
    );
  };
};

export function hasExplicitVisualScenePlan(
  pkg: Pick<ContentPackageOutput, "visual_scenes">,
): boolean {
  return Array.isArray(pkg.visual_scenes) && pkg.visual_scenes.length > 0;
}

export function collectAssetUsageFromPackage(
  pkg: ContentPackageOutput,
): PackageAssetUsage[] {
  if (hasExplicitVisualScenePlan(pkg)) {
    const usage: PackageAssetUsage[] = [];
    for (const scene of pkg.visual_scenes ?? []) {
      const entry = scene as PackageVisualSceneEntry;
      if (isTypedNonImageVisualSceneEntry(entry)) {
        continue;
      }
      if (entry.source !== "asset") continue;
      usage.push({
        asset_id: entry.asset_id,
        used_as: entry.used_as,
        modify: entry.modify,
      });
    }
    return usage;
  }
  return pkg.asset_usage ?? [];
}

/** Derives legacy image_prompts + asset_usage from an ordered visual plan. */
export function syncLegacyFieldsFromVisualScenes(pkg: ContentPackageOutput): void {
  if (!hasExplicitVisualScenePlan(pkg)) return;
  const plan = pkg.visual_scenes ?? [];
  pkg.image_prompts = plan
    .filter((s): s is VisualSceneAi => {
      const entry = s as PackageVisualSceneEntry;
      return !isTypedNonImageVisualSceneEntry(entry) && entry.source === "ai";
    })
    .map((s) => s.image_prompt.trim());
  pkg.asset_usage = collectAssetUsageFromPackage(pkg);
}

export function normalizeVisualScenePlan(
  pkg: ContentPackageOutput,
  logContext: Record<string, unknown> = {},
): void {
  if (!Array.isArray(pkg.visual_scenes)) return;
  const cleaned: PackageVisualSceneEntry[] = [];
  for (const entry of pkg.visual_scenes) {
    if (!entry || typeof entry !== "object") continue;

    const typed = entry as PackageVisualSceneEntry;
    if (isChecklistVisualSceneEntry(typed)) {
      const parsed = checklistScenePayloadSchema.safeParse(typed.payload);
      if (!parsed.success) continue;
      cleaned.push({
        type: "CHECKLIST",
        payload: parsed.data,
        ...(typeof typed.id === "string" && typed.id.trim()
          ? { id: typed.id.trim() }
          : {}),
      });
      continue;
    }

    if (isPhoneVisualSceneEntry(typed)) {
      const parsed = phoneScenePayloadSchema.safeParse(typed.payload);
      if (!parsed.success) continue;
      cleaned.push({
        type: "PHONE",
        payload: parsed.data,
        ...(typeof typed.id === "string" && typed.id.trim()
          ? { id: typed.id.trim() }
          : {}),
      });
      continue;
    }

    if (isQuoteVisualSceneEntry(typed)) {
      const parsed = quoteScenePayloadSchema.safeParse(typed.payload);
      if (!parsed.success) continue;
      cleaned.push({
        type: "QUOTE",
        payload: parsed.data,
        ...(typeof typed.id === "string" && typed.id.trim()
          ? { id: typed.id.trim() }
          : {}),
      });
      continue;
    }

    if (isStatisticVisualSceneEntry(typed)) {
      const parsed = statisticScenePayloadSchema.safeParse(typed.payload);
      if (!parsed.success) continue;
      cleaned.push({
        type: "STATISTIC",
        payload: parsed.data,
        ...(typeof typed.id === "string" && typed.id.trim()
          ? { id: typed.id.trim() }
          : {}),
      });
      continue;
    }

    if (isCtaVisualSceneEntry(typed)) {
      const parsed = ctaScenePayloadSchema.safeParse(typed.payload);
      if (!parsed.success) continue;
      cleaned.push({
        type: "CTA",
        payload: parsed.data,
        ...(typeof typed.id === "string" && typed.id.trim()
          ? { id: typed.id.trim() }
          : {}),
      });
      continue;
    }

    const legacy = typed as VisualScenePlanItem;
    if (legacy.source === "ai") {
      const prompt =
        typeof legacy.image_prompt === "string"
          ? legacy.image_prompt.trim()
          : "";
      if (!prompt) continue;
      cleaned.push({ source: "ai", image_prompt: prompt });
      continue;
    }
    if (legacy.source === "asset") {
      const asset_id =
        typeof legacy.asset_id === "string" ? legacy.asset_id.trim() : "";
      const used_as =
        typeof legacy.used_as === "string" ? legacy.used_as.trim() : "";
      if (!asset_id || !used_as) continue;
      cleaned.push({
        source: "asset",
        asset_id,
        used_as,
        ...(typeof legacy.video_usage === "string" && legacy.video_usage.trim()
          ? { video_usage: legacy.video_usage.trim() }
          : {}),
        ...(typeof legacy.modify === "string" ? { modify: legacy.modify } : {}),
      });
    }
  }
  if (cleaned.length > MAX_VIDEO_SCENE_STILLS) {
    console.warn(
      "[content-package] visual_scenes truncated to cap",
      JSON.stringify({
        ...logContext,
        original_count: cleaned.length,
        capped_count: MAX_VIDEO_SCENE_STILLS,
      }),
    );
  }
  pkg.visual_scenes =
    cleaned.length > 0 ? cleaned.slice(0, MAX_VIDEO_SCENE_STILLS) : undefined;
  if (hasExplicitVisualScenePlan(pkg)) {
    syncLegacyFieldsFromVisualScenes(pkg);
  }
}

export function validateVisualScenePlanGuardrails(args: {
  pkg: ContentPackageOutput;
  classById: Map<string, AssetClass>;
  requireVideo?: boolean;
  preferredVideoUsageById?: ReadonlyMap<string, string>;
  archivedAssetIds?: ReadonlySet<string>;
}): ValidationIssue[] {
  if (!hasExplicitVisualScenePlan(args.pkg)) return [];
  const plan = args.pkg.visual_scenes ?? [];
  const issues: ValidationIssue[] = [];

  const structural = generatedVisualScenesArrayValidator()(plan, "$.visual_scenes");
  if (structural.length > 0) return structural;

  for (let i = 0; i < plan.length; i++) {
    const scene = plan[i] as PackageVisualSceneEntry;
    const base = `$.visual_scenes[${i}]`;
    if (isTypedNonImageVisualSceneEntry(scene)) continue;
    if (scene.source === "ai") continue;

    const cls = args.classById.get(scene.asset_id);
    if (!cls) {
      issues.push({
        path: base,
        message: `asset ${scene.asset_id} not found in project`,
      });
      continue;
    }
    if (args.archivedAssetIds?.has(scene.asset_id)) {
      issues.push({
        path: base,
        message: `asset ${scene.asset_id} is archived and cannot be used`,
      });
      continue;
    }

    const preferred =
      args.preferredVideoUsageById?.get(scene.asset_id) ?? "reference";
    const explicitUsage =
      scene.video_usage && isVideoUsageRenderMode(scene.video_usage)
        ? scene.video_usage
        : null;
    if (explicitUsage === "fullscreen" && preferred !== "fullscreen") {
      issues.push({
        path: `${base}.video_usage`,
        message: `asset ${scene.asset_id} cannot use fullscreen video_usage in vertical video`,
      });
    }
    if (
      args.requireVideo &&
      assetUsageFullscreenViolation(preferred as "reference", scene.used_as)
    ) {
      issues.push({
        path: base,
        message: `asset ${scene.asset_id} must not be used fullscreen in vertical video; use framed insert in used_as or video_usage`,
      });
    }

    const wantsModification =
      scene.modify === "true" || scene.modify === "1";
    const assetIssue = checkAssetModification(cls, wantsModification);
    if (assetIssue) {
      issues.push({ ...assetIssue, path: base });
    }
  }

  return issues;
}

const DEFAULT_SCENE_DURATION_SECONDS = 4;

export async function resolveVisualPlanToRenderScenes(
  supabase: SupabaseClient,
  projectId: string,
  plan: VisualScenePlanItem[],
): Promise<Scene[]> {
  const assetIds = plan
    .filter((s): s is VisualSceneAsset => s.source === "asset")
    .map((s) => s.asset_id);
  const assetById = new Map<
    string,
    {
      title: string;
      bucket: string;
      path: string;
      metadata: Json;
    }
  >();

  if (assetIds.length > 0) {
    const { data, error } = await supabase
      .from("assets")
      .select("id, title, storage_bucket, storage_path, metadata, media_type")
      .eq("project_id", projectId)
      .in("id", Array.from(new Set(assetIds)))
      .eq("media_type", "image");
    if (error) throw error;
    for (const row of data ?? []) {
      const bucket = row.storage_bucket as string | null;
      const path = row.storage_path as string | null;
      if (!bucket || !path) continue;
      assetById.set(row.id as string, {
        title: (row.title as string) ?? "",
        bucket,
        path,
        metadata: (row.metadata as Json) ?? {},
      });
    }
  }

  const scenes: Scene[] = [];
  for (let i = 0; i < plan.length; i++) {
    const item = plan[i];
    const id = `scene-${i + 1}`;
    if (item.source === "ai") {
      scenes.push({
        id,
        image_prompt: item.image_prompt,
        duration_seconds: DEFAULT_SCENE_DURATION_SECONDS,
      });
      continue;
    }

    const asset = assetById.get(item.asset_id);
    if (!asset) {
      throw new Error(
        `resolveVisualPlanToRenderScenes: asset ${item.asset_id} missing storage`,
      );
    }
    const preferred = resolvePreferredVideoUsageFromMetadata(asset.metadata, {
      title: asset.title,
    });
    const videoUsage =
      item.video_usage && isVideoUsageRenderMode(item.video_usage)
        ? item.video_usage
        : resolveVideoUsageForRender(preferred, item.used_as);

    scenes.push({
      id,
      image_prompt:
        item.used_as.trim().length > 0
          ? item.used_as.trim()
          : asset.title || "asset image",
      duration_seconds: DEFAULT_SCENE_DURATION_SECONDS,
      image_bucket: asset.bucket,
      image_path: asset.path,
      video_usage: videoUsage,
      asset_id: item.asset_id,
    });
  }
  return scenes;
}

export async function loadArchivedAssetIds(
  supabase: SupabaseClient,
  projectId: string,
  assetIds: string[],
): Promise<Set<string>> {
  if (assetIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("assets")
    .select("id, metadata")
    .eq("project_id", projectId)
    .in("id", assetIds);
  if (error) throw error;
  const archived = new Set<string>();
  for (const row of data ?? []) {
    if (isAssetArchivedFromLibrary(row.metadata as Json)) {
      archived.add(row.id as string);
    }
  }
  return archived;
}
