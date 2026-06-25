import type { PlatformType } from "@/lib/supabase/types";
import {
  DEFAULT_PLATFORM_CONTENT_TYPES,
  resolvePlatformTargets,
  type ContentControls,
  type ContentTypePlatform,
  type PlatformContentType,
} from "@/lib/projects/contentControls";
import {
  DEFAULT_GENERATION_MODE,
  parseGenerationMode,
  type GenerationMode,
} from "@/lib/ai/generationMode";

// ---------------------------------------------------------------------------
// Content Production V3 — Package Based Model (pure planning model, no IO).
//
// The owner sets ONE primary quantity and two modifiers, then clicks GENERATE
// CONTENT:
//
//   - packageCount        : how many content packages to produce this run.
//   - platforms           : which platforms each package publishes to.
//   - multipliers          : how many outputs each package yields per platform.
//
// The hard guarantee of this model:
//
//   1 package = 1 theme = 1 video concept = 1 storyboard = 1 video
//
// So `packageCount = 20` ALWAYS means 20 videos. The selected platforms +
// multipliers never change the number of packages/videos — they only scale the
// per-platform OUTPUT counts (caption / hashtags / CTA / formatting reuse of
// the same video):
//
//   requested_packages       = packageCount
//   requested_video_outputs  = packageCount × (# active video platforms)
//   per-platform outputs     = round(packageCount × multiplier[platform])
//
// Example: packageCount = 20, TikTok/Instagram/YouTube/LinkedIn = 1, X = 3 →
//   20 videos; TikTok 20, Instagram 20, YouTube 20, LinkedIn 20, X 60;
//   total outputs = 140.
// ---------------------------------------------------------------------------

export type ProductionPlatformKind = "video" | "text";

export interface ProductionPlatformDef {
  id: ProductionPlatformId;
  label: string;
  // True when the platform is backed by the platform_type DB enum and so the
  // pipeline produces a real content_item for it (everything except "x").
  persistable: boolean;
}

// The platforms a package can publish to (per product spec). Whether each
// surface is video or text comes from the project's platform_content_types
// (Content Controls), not from this list.
export const PRODUCTION_PLATFORMS: readonly ProductionPlatformDef[] = [
  { id: "tiktok", label: "TikTok", persistable: true },
  { id: "instagram", label: "Instagram", persistable: true },
  { id: "facebook", label: "Facebook", persistable: true },
  { id: "youtube", label: "YouTube", persistable: true },
  { id: "linkedin", label: "LinkedIn", persistable: true },
  { id: "x", label: "X", persistable: true },
  { id: "google_business", label: "Google Business", persistable: true },
] as const;

export type ProductionPlatformId =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "x"
  | "google_business";

const PLATFORM_BY_ID = new Map<string, ProductionPlatformDef>(
  PRODUCTION_PLATFORMS.map((p) => [p.id, p]),
);

// Product-default video surfaces (used when pre-filling an empty production
// panel). Per-project overrides live in platform_content_types.
export const PRODUCTION_VIDEO_PLATFORMS = PRODUCTION_PLATFORMS.filter(
  (p) => DEFAULT_PLATFORM_CONTENT_TYPES[p.id] === "video",
).map((p) => p.id);

export const PRODUCTION_TEXT_PLATFORMS = PRODUCTION_PLATFORMS.filter(
  (p) => DEFAULT_PLATFORM_CONTENT_TYPES[p.id] === "text_only",
).map((p) => p.id);

export function isProductionPlatform(
  value: string,
): value is ProductionPlatformId {
  return PLATFORM_BY_ID.has(value);
}

export function productionPlatformLabel(platform: string): string {
  return PLATFORM_BY_ID.get(platform)?.label ?? platform;
}

function mergedPlatformContentTypes(
  contentTypes?: Partial<Record<ContentTypePlatform, PlatformContentType>>,
): Record<ContentTypePlatform, PlatformContentType> {
  return {
    ...DEFAULT_PLATFORM_CONTENT_TYPES,
    ...(contentTypes ?? {}),
  };
}

function contentTypesForConfig(
  config: ProductionConfig,
): Record<ContentTypePlatform, PlatformContentType> {
  return mergedPlatformContentTypes(config.platformContentTypes);
}

// Resolves video vs text for a production platform from Content Controls.
export function resolveProductionPlatformKind(
  platform: ProductionPlatformId,
  contentTypes?: Partial<Record<ContentTypePlatform, PlatformContentType>>,
): ProductionPlatformKind {
  const type = mergedPlatformContentTypes(contentTypes)[platform];
  return type === "video" ? "video" : "text";
}

/** @deprecated Prefer resolveProductionPlatformKind with project content types. */
export function productionPlatformKind(
  platform: string,
  contentTypes?: Partial<Record<ContentTypePlatform, PlatformContentType>>,
): ProductionPlatformKind {
  if (isProductionPlatform(platform)) {
    return resolveProductionPlatformKind(platform, contentTypes);
  }
  return "text";
}

// True when a platform can produce a real content_item (everything except "x").
export function isPersistableProductionPlatform(
  platform: string,
): platform is PlatformType {
  return PLATFORM_BY_ID.get(platform)?.persistable ?? false;
}

// Recommended default multipliers (per product spec). One output per package
// for most platforms; X gets 3 (short-form cadence), Google Business 0.25.
export const DEFAULT_MULTIPLIERS: Record<ProductionPlatformId, number> = {
  tiktok: 1,
  instagram: 1,
  facebook: 1,
  youtube: 1,
  linkedin: 1,
  x: 3,
  google_business: 0.25,
};

export const PACKAGE_COUNT_MIN = 0;
export const PACKAGE_COUNT_MAX = 100;
export const MULTIPLIER_MIN = 0;
export const MULTIPLIER_MAX = 10;

import {
  DEFAULT_GENERATION_MODE,
  parseGenerationMode,
  type GenerationMode,
} from "@/lib/ai/generationMode";

// Submitted config. `platforms` is the set of active (selected) platforms;
// `multipliers` holds the per-platform output multiplier (defaults applied for
// any active platform without an explicit value).
export interface ProductionConfig {
  packageCount: number;
  platforms: ProductionPlatformId[];
  multipliers: Partial<Record<ProductionPlatformId, number>>;
  // Snapshot of publishing_rules.platform_content_types (merged with product
  // defaults on read). Stored on each production run so replays stay stable.
  platformContentTypes?: Partial<
    Record<ContentTypePlatform, PlatformContentType>
  >;
  /** Creative Engine mode for packages in this run. Defaults to production. */
  generationMode?: GenerationMode;
}

export interface ProductionPlatformOutput {
  platform: ProductionPlatformId;
  label: string;
  kind: ProductionPlatformKind;
  multiplier: number;
  // round(packageCount × multiplier).
  outputs: number;
}

export interface ProductionPlan {
  // The single primary quantity: packages requested.
  packageCount: number;
  // 1 package = 1 video. Always equal to packageCount.
  videoCount: number;
  // Active platforms with their resolved multiplier + output count.
  platformOutputs: ProductionPlatformOutput[];
  // Active video platforms (the surfaces the shared video publishes to).
  activeVideoPlatforms: ProductionPlatformId[];
  videoOutputsTotal: number;
  textOutputsTotal: number;
  totalOutputs: number;
}

function clampInt(value: unknown, min: number, max: number): number {
  const n =
    typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
  return Math.min(max, Math.max(min, n));
}

function clampMultiplier(value: unknown): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : typeof value === "string" && value.trim() !== "" && !isNaN(Number(value))
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) return 1;
  // Keep two decimals so fractional defaults like 0.25 survive a round-trip.
  const rounded = Math.round(n * 100) / 100;
  return Math.min(MULTIPLIER_MAX, Math.max(MULTIPLIER_MIN, rounded));
}

// Normalizes arbitrary (form / JSON) input into a clean config: clamped package
// count, known + de-duplicated active platforms, and a multiplier per active
// platform (explicit value when valid, otherwise the product default).
export function normalizeProductionConfig(raw: unknown): ProductionConfig {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const packageCount = clampInt(
    record.packageCount,
    PACKAGE_COUNT_MIN,
    PACKAGE_COUNT_MAX,
  );

  const platformsRaw = Array.isArray(record.platforms) ? record.platforms : [];
  const seen = new Set<ProductionPlatformId>();
  const platforms: ProductionPlatformId[] = [];
  for (const def of PRODUCTION_PLATFORMS) {
    if (platformsRaw.includes(def.id) && !seen.has(def.id)) {
      seen.add(def.id);
      platforms.push(def.id);
    }
  }

  const multipliersRaw =
    record.multipliers && typeof record.multipliers === "object"
      ? (record.multipliers as Record<string, unknown>)
      : {};
  const multipliers: ProductionConfig["multipliers"] = {};
  for (const id of platforms) {
    const provided = multipliersRaw[id];
    multipliers[id] =
      provided === undefined
        ? DEFAULT_MULTIPLIERS[id]
        : clampMultiplier(provided);
  }

  const typesRaw =
    record.platformContentTypes && typeof record.platformContentTypes === "object"
      ? (record.platformContentTypes as Record<string, unknown>)
      : null;
  let platformContentTypes: ProductionConfig["platformContentTypes"];
  if (typesRaw) {
    platformContentTypes = {};
    for (const def of PRODUCTION_PLATFORMS) {
      const raw = typesRaw[def.id];
      if (raw === "video" || raw === "text_only") {
        platformContentTypes[def.id] = raw;
      }
    }
  }

  const generationMode = parseGenerationMode(
    record.generation_mode ?? record.generationMode,
  );

  return {
    packageCount,
    platforms,
    multipliers,
    ...(platformContentTypes ? { platformContentTypes } : {}),
    ...(generationMode !== DEFAULT_GENERATION_MODE ? { generationMode } : {}),
  };
}

// Total outputs a platform produces across the whole run. Video platforms get
// exactly ONE output per package (one shared package video reused across video
// surfaces — the multiplier does not apply). Text platforms scale by multiplier.
export function platformOutputTotal(
  kind: ProductionPlatformKind,
  packageCount: number,
  multiplier: number,
): number {
  if (kind === "video") return packageCount;
  return Math.max(0, Math.round(packageCount * multiplier));
}

// Number of outputs a SINGLE package (0-based index) produces for a platform.
// Video: always 1. Text with an integer multiplier: that constant (m=3 → 3 per
// package). Text with a fractional multiplier: distributed evenly so the
// cumulative total after k packages equals round(k × m) (m=0.25 → 0,0,0,1,…).
export function outputsForPackageIndex(
  kind: ProductionPlatformKind,
  multiplier: number,
  packageIndex: number,
): number {
  if (kind === "video") return 1;
  if (multiplier <= 0) return 0;
  const cumulativeThrough = Math.round((packageIndex + 1) * multiplier);
  const cumulativeBefore = Math.round(packageIndex * multiplier);
  return Math.max(0, cumulativeThrough - cumulativeBefore);
}

// Computes the production plan from a config. Pure.
export function computeProductionPlan(config: ProductionConfig): ProductionPlan {
  const packageCount = clampInt(
    config.packageCount,
    PACKAGE_COUNT_MIN,
    PACKAGE_COUNT_MAX,
  );
  const contentTypes = contentTypesForConfig(config);

  const platformOutputs: ProductionPlatformOutput[] = [];
  const activeVideoPlatforms: ProductionPlatformId[] = [];
  let videoOutputsTotal = 0;
  let textOutputsTotal = 0;

  // Iterate in canonical order so the UI/run always lists platforms the same.
  for (const def of PRODUCTION_PLATFORMS) {
    if (!config.platforms.includes(def.id)) continue;
    const kind = resolveProductionPlatformKind(def.id, contentTypes);
    // Video platforms are fixed at multiplier 1 (one shared video per package).
    const multiplier =
      kind === "video"
        ? 1
        : (config.multipliers[def.id] ?? DEFAULT_MULTIPLIERS[def.id]);
    const outputs = platformOutputTotal(kind, packageCount, multiplier);
    platformOutputs.push({
      platform: def.id,
      label: def.label,
      kind,
      multiplier,
      outputs,
    });
    if (kind === "video") {
      activeVideoPlatforms.push(def.id);
      videoOutputsTotal += outputs;
    } else {
      textOutputsTotal += outputs;
    }
  }

  return {
    packageCount,
    videoCount: packageCount,
    platformOutputs,
    activeVideoPlatforms,
    videoOutputsTotal,
    textOutputsTotal,
    totalOutputs: videoOutputsTotal + textOutputsTotal,
  };
}

// True when the plan would actually produce something: at least one package and
// at least one active platform.
export function planHasOutputs(plan: ProductionPlan): boolean {
  return plan.packageCount > 0 && plan.platformOutputs.length > 0;
}

// One run-item slot per PACKAGE (= one video concept). Per-platform output
// counts are derived from the plan's multipliers, so they get no slots.
export interface ProductionRunItemSlot {
  // The package's primary video platform (the surface its video maps to). The
  // first active video platform, or — for a text-only run — the first active
  // platform. Used only so the slot has a stable platform label.
  platform: ProductionPlatformId;
  contentType: "video";
  // 0-based package index (0..packageCount-1).
  index: number;
}

export function primaryPlatformForPlan(
  plan: ProductionPlan,
): ProductionPlatformId | null {
  if (plan.activeVideoPlatforms.length > 0) return plan.activeVideoPlatforms[0];
  return plan.platformOutputs[0]?.platform ?? null;
}

export function expandPlanToItemSlots(
  plan: ProductionPlan,
): ProductionRunItemSlot[] {
  const primary = primaryPlatformForPlan(plan);
  if (primary === null) return [];
  const slots: ProductionRunItemSlot[] = [];
  for (let i = 0; i < plan.packageCount; i++) {
    slots.push({ platform: primary, contentType: "video", index: i });
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Migration of existing Content Controls (platform_targets) → package model.
//
// Legacy projects stored a per-platform weekly target (publishing_rules.
// platform_targets). We map that onto the package model so the production panel
// pre-fills sensibly:
//
//   packageCount       = max video-platform target (the # of distinct videos),
//                        falling back to the max of any target / posts_per_week.
//   active platforms   = project platforms that are production platforms, plus
//                        "x" when it carried a target (it is not a PlatformType
//                        and lives only in content controls).
//   multiplier[p]      = target[p] / packageCount  (rounded to 2 decimals),
//                        falling back to the product default when no target.
// ---------------------------------------------------------------------------
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildDefaultProductionConfig(
  controls: ContentControls,
  platforms: PlatformType[],
): ProductionConfig {
  const platformContentTypes = { ...controls.platformContentTypes };
  const entries = resolvePlatformTargets(controls, platforms);
  // Sparse target map by production-platform id (content-type platforms only;
  // youtube is never a content-type platform, so it has no stored target).
  const targetById = new Map<ProductionPlatformId, number>();
  for (const entry of entries) {
    if (isProductionPlatform(entry.platform) && entry.target > 0) {
      targetById.set(entry.platform, entry.target);
    }
  }

  // packageCount = number of distinct video concepts. Prefer the max target of
  // an active video platform; otherwise the max of any target; otherwise the
  // coarse posts_per_week so a legacy project still pre-fills a sensible value.
  let videoMax = 0;
  let anyMax = 0;
  for (const [id, target] of targetById) {
    anyMax = Math.max(anyMax, target);
    if (resolveProductionPlatformKind(id, platformContentTypes) === "video") {
      videoMax = Math.max(videoMax, target);
    }
  }
  const packageCount = clampInt(
    videoMax > 0 ? videoMax : anyMax > 0 ? anyMax : controls.postsPerWeek,
    PACKAGE_COUNT_MIN,
    PACKAGE_COUNT_MAX,
  );

  // Active platforms: project platforms that are production platforms, plus any
  // production platform that carried a legacy target (covers "x").
  const activeSet = new Set<ProductionPlatformId>();
  for (const def of PRODUCTION_PLATFORMS) {
    if ((platforms as string[]).includes(def.id)) activeSet.add(def.id);
  }
  for (const id of targetById.keys()) activeSet.add(id);

  // Default selection for a project with no usable signal: the video platforms
  // (the core "video everywhere" setup) so the panel is never empty.
  if (activeSet.size === 0) {
    for (const id of PRODUCTION_VIDEO_PLATFORMS) activeSet.add(id);
  }

  const active = PRODUCTION_PLATFORMS.filter((d) => activeSet.has(d.id)).map(
    (d) => d.id,
  );

  const multipliers: ProductionConfig["multipliers"] = {};
  for (const id of active) {
    const target = targetById.get(id);
    if (target !== undefined && packageCount > 0) {
      multipliers[id] = clampMultiplier(round2(target / packageCount));
    } else {
      multipliers[id] = DEFAULT_MULTIPLIERS[id];
    }
  }

  return {
    packageCount,
    platforms: active,
    multipliers,
    platformContentTypes,
  };
}

// ---------------------------------------------------------------------------
// Run → generation plan. Turns a stored production-run config into the inputs
// the content-package generator needs: which platforms each package must
// produce (all production platforms are persistable package platforms), which
// of those are video-typed (share the one package video), and the per-platform
// multiplier used to fan out text outputs into multiple content_items.
// ---------------------------------------------------------------------------
export interface RunGenerationPlan {
  // Persistable package platforms the run selected (e.g. tiktok, x, ...).
  targetPlatforms: ProductionPlatformId[];
  // The subset that is video-typed (one shared video reused across them).
  videoPlatforms: ProductionPlatformId[];
  // Effective multiplier per active platform (video forced to 1).
  multipliers: Record<ProductionPlatformId, number>;
}

// ---------------------------------------------------------------------------
// Run Package Diversity V1 — generic ANGLE LENSES.
//
// Multiple packages in ONE production run share the same project/topic, so the
// model can drift into near-duplicates (same hook, pain point, scenario). To
// force distinct angles WITHOUT embeddings, scoring, new tables or extra AI
// calls, each package is nudged through a different generic "angle lens" picked
// deterministically from its 0-based package index. The lens is intentionally
// topic-agnostic so it applies to any project; the prompt sharpens the run's
// real topic/angle through it. Pure (no IO), so it is unit-testable.
// ---------------------------------------------------------------------------
export const PACKAGE_ANGLE_LENSES: readonly string[] = [
  "the overlooked detail most people miss",
  "a high-pressure, last-minute moment",
  "the social-judgment / reputation risk",
  "the worst-case consequence of ignoring it",
  "a recurring everyday habit or routine",
  "a surprising before-vs-after contrast",
  "the hidden time or money cost",
  "an insider / expert POV outsiders rarely hear",
];

// Deterministically maps a 0-based package index to an angle lens, cycling the
// list for runs larger than the rotation. Out-of-range / non-finite indices fall
// back to the first lens so it never throws.
export function angleLensForIndex(packageIndex: number): string {
  const n = PACKAGE_ANGLE_LENSES.length;
  if (n === 0) return "";
  const i =
    typeof packageIndex === "number" && Number.isFinite(packageIndex)
      ? Math.trunc(packageIndex)
      : 0;
  return PACKAGE_ANGLE_LENSES[((i % n) + n) % n];
}

// ---------------------------------------------------------------------------
// Pain Point First V1 — per-package pain-point focus.
//
// Every package in a run must anchor to a real pain point. To honour the 80/20
// rule WITHOUT scoring or extra AI calls, each package index is deterministically
// assigned:
//   - a primary pain point (cycled through the project's pain_points), and
//   - a MODE: "primary" for ~80% of packages (the pain point IS the topic) and
//     "supporting" for ~20% (a supporting detail/insight that still connects to
//     the assigned pain point).
//
// The split uses a fixed cadence: 1 in every 5 packages (index % 5 === 4) is a
// supporting package → exactly 20% supporting, 80% primary. Pure (no IO), so it
// is unit-testable.
// ---------------------------------------------------------------------------
export type PainPointFocusMode = "primary" | "supporting";

// 1 in SUPPORTING_EVERY packages is a "supporting detail" package (the rest are
// pain-point-primary). 5 → 20% supporting / 80% primary.
export const SUPPORTING_EVERY = 5;

export interface PainPointFocus {
  // The pain point this package must anchor to (verbatim from project.pain_points).
  painPoint: string;
  // "primary": the pain point is the central topic. "supporting": a supporting
  // detail/insight that still connects back to this pain point.
  mode: PainPointFocusMode;
}

// Deterministically assigns a pain-point focus to a 0-based package index. The
// pain point cycles through the (already-normalized) list; the mode follows the
// 80/20 cadence. Returns null when the project has no pain points so callers can
// skip the focus line (legacy / no-pain-point projects keep the prompt
// unchanged). Non-finite / negative indices fall back to index 0.
export function painPointFocusForIndex(
  painPoints: readonly string[],
  packageIndex: number,
): PainPointFocus | null {
  const n = painPoints.length;
  if (n === 0) return null;
  const i =
    typeof packageIndex === "number" && Number.isFinite(packageIndex)
      ? Math.trunc(packageIndex)
      : 0;
  const idx = ((i % n) + n) % n;
  const mode: PainPointFocusMode =
    Math.abs(i) % SUPPORTING_EVERY === SUPPORTING_EVERY - 1
      ? "supporting"
      : "primary";
  return { painPoint: painPoints[idx], mode };
}

export function resolveRunGenerationPlan(
  config: ProductionConfig,
): RunGenerationPlan {
  const contentTypes = contentTypesForConfig(config);
  const targetPlatforms: ProductionPlatformId[] = [];
  const videoPlatforms: ProductionPlatformId[] = [];
  const multipliers = {} as Record<ProductionPlatformId, number>;

  for (const def of PRODUCTION_PLATFORMS) {
    if (!config.platforms.includes(def.id)) continue;
    if (!def.persistable) continue;
    targetPlatforms.push(def.id);
    const kind = resolveProductionPlatformKind(def.id, contentTypes);
    if (kind === "video") {
      videoPlatforms.push(def.id);
      multipliers[def.id] = 1;
    } else {
      multipliers[def.id] =
        config.multipliers[def.id] ?? DEFAULT_MULTIPLIERS[def.id];
    }
  }

  return { targetPlatforms, videoPlatforms, multipliers };
}
