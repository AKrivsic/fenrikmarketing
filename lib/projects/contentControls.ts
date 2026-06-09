import type {
  Json,
  LanguageCode,
  PlatformType,
  Project,
} from "@/lib/supabase/types";
import {
  REQUIRED_PACKAGE_PLATFORMS,
  type FunnelStage,
  type PackagePlatform,
} from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// Project Content Control Center — settings model.
//
// All settings persist inside the EXISTING projects.publishing_rules jsonb
// column (no DB migration). Platforms reuse projects.platforms and language
// variants reuse projects.enabled_languages. Unknown keys already present in
// publishing_rules (e.g. legacy default_hour) are preserved on save.
//
// IMPORTANT: enabled_languages are AVAILABLE VARIANT OPTIONS only. They are
// never generated during weekly strategy or content-package generation — only
// after primary content/video is approved, from the Review Queue.
// ---------------------------------------------------------------------------

export type FunnelMixPreset =
  | "balanced"
  | "growth"
  | "lead_generation"
  | "conversion_light"
  | "custom";

// Per-platform content type selection (P3). "video" = the platform's output
// should be produced as a video; "text_only" = copy only, no video.
//
// NOTE: This is a SETTING + PERSISTENCE layer only. The generation pipeline
// (weekly strategy / content package / video jobs) does not yet read this map
// — see the TODO in serializeContentControls. "x" is included per product
// spec even though it is NOT part of the platform_type DB enum, so it can only
// ever live in this jsonb config (never as projects.platforms / content_items).
export type PlatformContentType = "video" | "text_only";

export const CONTENT_TYPE_PLATFORMS = [
  "tiktok",
  "instagram",
  "facebook",
  "linkedin",
  "google_business",
  "x",
] as const;

export type ContentTypePlatform = (typeof CONTENT_TYPE_PLATFORMS)[number];

export const CONTENT_TYPE_PLATFORM_LABELS: Record<ContentTypePlatform, string> =
  {
    tiktok: "TikTok",
    instagram: "Instagram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    google_business: "Google Business",
    x: "X",
  };

// Product-mandated defaults (P3).
export const DEFAULT_PLATFORM_CONTENT_TYPES: Record<
  ContentTypePlatform,
  PlatformContentType
> = {
  tiktok: "video",
  instagram: "video",
  facebook: "video",
  linkedin: "text_only",
  google_business: "text_only",
  x: "text_only",
};

// Funnel distribution percentages keyed by canonical funnel stage. Values are
// whole percentages that should sum to ~100.
export type FunnelMix = Record<FunnelStage, number>;

export type VideosPerWeek = number | "every_package";

export interface ContentControls {
  postsPerWeek: number;
  // A concrete number, or "every_package" = produce a video for every
  // generated content package (the current default behavior).
  videosPerWeek: VideosPerWeek;
  // 0 = Monday ... 6 = Sunday (matches the publishing planner's week offset).
  publishingWeekdays: number[];
  // "HH:mm" 24h.
  publishingTime: string;
  funnelMixPreset: FunnelMixPreset;
  // Resolved mix: for a non-custom preset this mirrors the preset table; for
  // "custom" it holds the user's values.
  funnelMix: FunnelMix;
  // Per-platform content type (P3). Always a complete map (missing keys fall
  // back to DEFAULT_PLATFORM_CONTENT_TYPES on read).
  platformContentTypes: Record<ContentTypePlatform, PlatformContentType>;
}

// Built-in funnel mix presets. Conversion-light intentionally keeps a balanced
// top-of-funnel presence (never conversion-only — see guardrails).
export const FUNNEL_MIX_PRESETS: Record<
  Exclude<FunnelMixPreset, "custom">,
  FunnelMix
> = {
  balanced: {
    awareness: 30,
    problem_aware: 30,
    solution_aware: 25,
    conversion: 15,
  },
  growth: {
    awareness: 45,
    problem_aware: 30,
    solution_aware: 15,
    conversion: 10,
  },
  lead_generation: {
    awareness: 20,
    problem_aware: 30,
    solution_aware: 30,
    conversion: 20,
  },
  conversion_light: {
    awareness: 15,
    problem_aware: 25,
    solution_aware: 30,
    conversion: 30,
  },
};

export const FUNNEL_MIX_PRESET_OPTIONS: {
  value: FunnelMixPreset;
  label: string;
}[] = [
  { value: "balanced", label: "Balanced" },
  { value: "growth", label: "Growth" },
  { value: "lead_generation", label: "Lead Generation" },
  { value: "conversion_light", label: "Conversion Light" },
  { value: "custom", label: "Custom" },
];

// 0-indexed Monday-first week, matching the publishing planner day offsets.
export const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

export const POSTS_PER_WEEK_MIN = 1;
export const POSTS_PER_WEEK_MAX = 30;

// Safe defaults applied when a project has no settings yet (backwards
// compatibility with the existing demo project). videosPerWeek defaults to
// "every_package" so existing behavior — one video per package — is preserved.
export const DEFAULT_CONTENT_CONTROLS: ContentControls = {
  postsPerWeek: 5,
  videosPerWeek: "every_package",
  publishingWeekdays: [0, 1, 2, 3, 4],
  publishingTime: "09:00",
  funnelMixPreset: "balanced",
  funnelMix: { ...FUNNEL_MIX_PRESETS.balanced },
  platformContentTypes: { ...DEFAULT_PLATFORM_CONTENT_TYPES },
};

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return null;
}

// Resolves the funnel mix for a preset; "custom" returns the provided fallback.
export function funnelMixForPreset(
  preset: FunnelMixPreset,
  custom: FunnelMix,
): FunnelMix {
  if (preset === "custom") return custom;
  return { ...FUNNEL_MIX_PRESETS[preset] };
}

// Parses content controls from a project's publishing_rules jsonb. Every field
// falls back to a safe default, so a project with an empty/legacy
// publishing_rules object still yields a complete, valid ContentControls.
export function parseContentControls(
  publishingRules: Json | null | undefined,
): ContentControls {
  const rules = asRecord(publishingRules);

  // posts_per_week
  const postsRaw = readInt(rules["posts_per_week"]);
  const postsPerWeek =
    postsRaw === null
      ? DEFAULT_CONTENT_CONTROLS.postsPerWeek
      : clamp(postsRaw, POSTS_PER_WEEK_MIN, POSTS_PER_WEEK_MAX);

  // videos_per_week
  let videosPerWeek: VideosPerWeek = DEFAULT_CONTENT_CONTROLS.videosPerWeek;
  const videosRaw = rules["videos_per_week"];
  if (videosRaw === "every_package") {
    videosPerWeek = "every_package";
  } else {
    const v = readInt(videosRaw);
    if (v !== null) videosPerWeek = clamp(v, 0, postsPerWeek);
  }

  // publishing_weekdays
  let publishingWeekdays = DEFAULT_CONTENT_CONTROLS.publishingWeekdays;
  const weekdaysRaw = rules["publishing_weekdays"];
  if (Array.isArray(weekdaysRaw)) {
    const parsed = Array.from(
      new Set(
        weekdaysRaw
          .map((d) => readInt(d))
          .filter((d): d is number => d !== null && d >= 0 && d <= 6),
      ),
    ).sort((a, b) => a - b);
    if (parsed.length > 0) publishingWeekdays = parsed;
  }

  // publishing_time (prefer explicit HH:mm; fall back to legacy hour keys)
  let publishingTime = DEFAULT_CONTENT_CONTROLS.publishingTime;
  const timeRaw = rules["publishing_time"];
  if (typeof timeRaw === "string" && HHMM_RE.test(timeRaw)) {
    publishingTime = timeRaw;
  } else {
    const legacyHour = readLegacyHour(rules);
    if (legacyHour !== null) {
      publishingTime = `${String(legacyHour).padStart(2, "0")}:00`;
    }
  }

  // funnel_mix_preset + funnel_mix
  const presetRaw = rules["funnel_mix_preset"];
  const funnelMixPreset: FunnelMixPreset = isFunnelMixPreset(presetRaw)
    ? presetRaw
    : DEFAULT_CONTENT_CONTROLS.funnelMixPreset;
  const customMix = readFunnelMix(rules["funnel_mix"]) ?? {
    ...DEFAULT_CONTENT_CONTROLS.funnelMix,
  };
  const funnelMix = funnelMixForPreset(funnelMixPreset, customMix);

  const platformContentTypes = readPlatformContentTypes(
    rules["platform_content_types"],
  );

  return {
    postsPerWeek,
    videosPerWeek,
    publishingWeekdays,
    publishingTime,
    funnelMixPreset,
    funnelMix,
    platformContentTypes,
  };
}

// Merges content controls back into the existing publishing_rules jsonb so
// unrelated keys are preserved. funnel_mix is only written for the custom
// preset (built-in presets are derived on read).
export function serializeContentControls(
  controls: ContentControls,
  existing: Json | null | undefined,
): Json {
  const base = asRecord(existing);
  const next: Record<string, unknown> = {
    ...base,
    posts_per_week: controls.postsPerWeek,
    videos_per_week: controls.videosPerWeek,
    publishing_weekdays: controls.publishingWeekdays,
    publishing_time: controls.publishingTime,
    funnel_mix_preset: controls.funnelMixPreset,
  };
  if (controls.funnelMixPreset === "custom") {
    next.funnel_mix = controls.funnelMix;
  } else {
    delete next.funnel_mix;
  }
  // P3 — persist the per-platform content type map. TODO(pipeline): the
  // generation workflows (weekly strategy / content package / video jobs) do
  // not yet read platform_content_types; this is settings + persistence only.
  next.platform_content_types = { ...controls.platformContentTypes };
  return next as Json;
}

// Parses publishing_rules.platform_content_types into a complete map. Unknown
// platforms are ignored; missing ones fall back to the product defaults.
function readPlatformContentTypes(
  value: unknown,
): Record<ContentTypePlatform, PlatformContentType> {
  const result: Record<ContentTypePlatform, PlatformContentType> = {
    ...DEFAULT_PLATFORM_CONTENT_TYPES,
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return result;
  }
  const record = value as Record<string, unknown>;
  for (const platform of CONTENT_TYPE_PLATFORMS) {
    const raw = record[platform];
    if (raw === "video" || raw === "text_only") {
      result[platform] = raw;
    }
  }
  return result;
}

// True when the value is a valid PlatformContentType.
export function isPlatformContentType(
  value: unknown,
): value is PlatformContentType {
  return value === "video" || value === "text_only";
}

export interface ContentControlsValidationResult {
  ok: boolean;
  fieldErrors: Record<string, string>;
}

// Validates content controls against the product rules. Platforms are passed in
// because they live on projects.platforms (not in this model).
export function validateContentControls(
  controls: ContentControls,
  platforms: PlatformType[],
): ContentControlsValidationResult {
  const fieldErrors: Record<string, string> = {};

  if (
    !Number.isInteger(controls.postsPerWeek) ||
    controls.postsPerWeek < POSTS_PER_WEEK_MIN ||
    controls.postsPerWeek > POSTS_PER_WEEK_MAX
  ) {
    fieldErrors.postsPerWeek = `Posts per week must be ${POSTS_PER_WEEK_MIN}–${POSTS_PER_WEEK_MAX}.`;
  }

  if (controls.videosPerWeek !== "every_package") {
    const v = controls.videosPerWeek;
    if (!Number.isInteger(v) || v < 0 || v > controls.postsPerWeek) {
      fieldErrors.videosPerWeek =
        "Videos per week must be between 0 and posts per week.";
    }
  }

  if (platforms.length === 0) {
    fieldErrors.platforms = "Select at least one platform.";
  }

  if (!HHMM_RE.test(controls.publishingTime)) {
    fieldErrors.publishingTime = "Publishing time must be HH:mm (24h).";
  }

  if (controls.publishingWeekdays.length === 0) {
    fieldErrors.publishingWeekdays = "Select at least one publishing day.";
  }

  // Funnel mix must never be conversion-only.
  const mix = controls.funnelMix;
  const total =
    mix.awareness + mix.problem_aware + mix.solution_aware + mix.conversion;
  const nonConversion = total - mix.conversion;
  if (mix.conversion > 0 && nonConversion <= 0) {
    fieldErrors.funnelMix =
      "Funnel mix cannot be conversion-only — include some awareness / problem / solution.";
  }
  if (controls.funnelMixPreset === "custom" && total <= 0) {
    fieldErrors.funnelMix = "Funnel mix must add up to a positive total.";
  }

  return { ok: Object.keys(fieldErrors).length === 0, fieldErrors };
}

// ---------------------------------------------------------------------------
// Generation helpers
// ---------------------------------------------------------------------------

// Resolves which package-capable platforms a project targets: the intersection
// of projects.platforms with the package surfaces. Falls back to the full
// REQUIRED_PACKAGE_PLATFORMS set when the project selects none of them, so a
// project with no/legacy platform config keeps the current behavior.
export function resolvePackagePlatforms(
  platforms: PlatformType[],
): PackagePlatform[] {
  const selected = REQUIRED_PACKAGE_PLATFORMS.filter((p) =>
    platforms.includes(p as PlatformType),
  );
  return selected.length > 0 ? [...selected] : [...REQUIRED_PACKAGE_PLATFORMS];
}

// ---------------------------------------------------------------------------
// Current Generation Plan (P2) — a read-only, derived preview of what the
// system will produce for one weekly cycle, given the saved controls. This is
// an ESTIMATE: actual counts depend on AI output. No generation happens here.
// ---------------------------------------------------------------------------

export interface GenerationPlanPlatformOutput {
  platform: PackagePlatform;
  count: number;
  contentType: PlatformContentType;
}

export interface GenerationPlan {
  // Package-capable platforms the project targets (intersection with project
  // platforms, falling back to all required package platforms).
  packagePlatforms: PackagePlatform[];
  postsPerWeek: number;
  publishingWeekdays: number[];
  publishingTime: string;
  languagesAvailable: LanguageCode[];
  // One content package per weekly post (estimate).
  expectedPackages: number;
  // Per package-platform output count (= expectedPackages each).
  perPlatformOutputs: GenerationPlanPlatformOutput[];
  // "every_package" mirrors expectedPackages; otherwise the fixed weekly count.
  expectedVideos: number;
  videosMode: VideosPerWeek;
  // Always true — the figures are realistic estimates, not guarantees.
  isEstimate: boolean;
}

// Builds the Current Generation Plan from saved controls + project platforms +
// enabled languages. Pure function (no IO).
export function computeGenerationPlan(
  controls: ContentControls,
  platforms: PlatformType[],
  enabledLanguages: LanguageCode[],
): GenerationPlan {
  const packagePlatforms = resolvePackagePlatforms(platforms);
  const expectedPackages = controls.postsPerWeek;

  const perPlatformOutputs: GenerationPlanPlatformOutput[] =
    packagePlatforms.map((platform) => ({
      platform,
      count: expectedPackages,
      // Every package platform is also a content-type platform.
      contentType:
        controls.platformContentTypes[platform as ContentTypePlatform] ??
        DEFAULT_PLATFORM_CONTENT_TYPES[platform as ContentTypePlatform],
    }));

  // A package only produces a (single, shared) video when at least one of its
  // platforms is video-typed. If every selected platform is text-only, no video
  // job is created at runtime, so the plan must report 0 videos.
  const anyVideoPlatform = perPlatformOutputs.some(
    (output) => output.contentType === "video",
  );
  const expectedVideos = !anyVideoPlatform
    ? 0
    : controls.videosPerWeek === "every_package"
      ? expectedPackages
      : controls.videosPerWeek;

  return {
    packagePlatforms,
    postsPerWeek: controls.postsPerWeek,
    publishingWeekdays: controls.publishingWeekdays,
    publishingTime: controls.publishingTime,
    languagesAvailable: enabledLanguages,
    expectedPackages,
    perPlatformOutputs,
    expectedVideos,
    videosMode: controls.videosPerWeek,
    isEstimate: true,
  };
}

// Resolves which package-capable platforms should produce VIDEO, based on the
// per-platform content type map (P3 → runtime). Only PackagePlatform values can
// require video; "x" is never a package platform. A platform defaults to its
// product default when missing from the map.
export function resolveVideoPackagePlatforms(
  platforms: PlatformType[],
  platformContentTypes: Record<ContentTypePlatform, PlatformContentType>,
): PackagePlatform[] {
  return resolvePackagePlatforms(platforms).filter((platform) => {
    const key = platform as ContentTypePlatform;
    const type =
      platformContentTypes[key] ?? DEFAULT_PLATFORM_CONTENT_TYPES[key];
    return type === "video";
  });
}

// True when at least one selected package platform requires video — i.e. a
// shared package video should be produced. When false the package is text-only
// and no video job is created.
export function packageRequiresVideo(
  platforms: PlatformType[],
  platformContentTypes: Record<ContentTypePlatform, PlatformContentType>,
): boolean {
  return (
    resolveVideoPackagePlatforms(platforms, platformContentTypes).length > 0
  );
}

// Coarse intensity label derived from posts_per_week, fed into the weekly
// strategy prompt alongside the raw number.
export function intensityLabel(postsPerWeek: number): string {
  if (postsPerWeek <= 3) return "light";
  if (postsPerWeek <= 7) return "standard";
  if (postsPerWeek <= 14) return "high";
  return "very high";
}

// Convenience: parse controls straight off a project row.
export function projectContentControls(project: Project): ContentControls {
  return parseContentControls(project.publishing_rules);
}

// ---------------------------------------------------------------------------
// internal helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isFunnelMixPreset(value: unknown): value is FunnelMixPreset {
  return (
    value === "balanced" ||
    value === "growth" ||
    value === "lead_generation" ||
    value === "conversion_light" ||
    value === "custom"
  );
}

function readFunnelMix(value: unknown): FunnelMix | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const stages: FunnelStage[] = [
    "awareness",
    "problem_aware",
    "solution_aware",
    "conversion",
  ];
  const mix: FunnelMix = {
    awareness: 0,
    problem_aware: 0,
    solution_aware: 0,
    conversion: 0,
  };
  let found = false;
  for (const stage of stages) {
    const n = readInt(record[stage]);
    if (n !== null && n >= 0) {
      mix[stage] = n;
      found = true;
    }
  }
  return found ? mix : null;
}

// Legacy hour keys used by the publishing planner before publishing_time.
function readLegacyHour(rules: Record<string, unknown>): number | null {
  for (const key of ["default_hour", "post_hour", "publish_hour"]) {
    const value = readInt(rules[key]);
    if (value !== null && value >= 0 && value <= 23) return value;
  }
  return null;
}
