"use server";

import { revalidatePath } from "next/cache";
import { getProjectForAdmin, updateProjectForAdmin } from "@/lib/api/projects-admin";
import {
  GOAL_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  MARKET_SCOPE_OPTIONS,
  PLATFORM_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from "@/lib/projects/fieldOptions";
import {
  type ContentControls,
  type FunnelMix,
  type FunnelMixPreset,
  type VideosPerWeek,
  funnelMixForPreset,
  serializeContentControls,
  validateContentControls,
} from "@/lib/projects/contentControls";
import type {
  GoalType,
  Json,
  LanguageCode,
  MarketScope,
  PlatformType,
  ProjectType,
  ProjectUpdate,
} from "@/lib/supabase/types";

export interface ProjectBrainFormValues {
  name: string;
  type: string;
  language: string;
  enabledLanguages: string[];
  marketScope: string;
  goalType: string;
  defaultCta: string;
  productIs: string;
  productIsNot: string;
  productStrengths: string;
  painPoints: string;
  forbiddenClaims: string;
  platforms: string[];
  targetAudience: string;
  toneOfVoice: string;
  publishingRules: string;
}

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Splits a textarea into a string[] — one item per non-empty trimmed line.
function parseLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// Parses a JSON object field. Returns an error string when the input is not a
// valid JSON object (arrays and primitives are rejected — columns default {}).
function parseJsonObject(
  raw: string,
): { ok: true; value: Json } | { ok: false; error: string } {
  const text = raw.trim();
  if (text.length === 0) return { ok: true, value: {} };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "Neplatný JSON." };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "JSON musí být objekt." };
  }
  return { ok: true, value: parsed as Json };
}

function inOptions<T extends string>(value: string, options: T[]): value is T {
  return (options as string[]).includes(value);
}

export async function updateProjectBrain(
  projectId: string,
  values: ProjectBrainFormValues,
): Promise<ActionResult> {
  if (!projectId) return { ok: false, error: "Chybí identifikátor projektu." };

  const fieldErrors: Record<string, string> = {};

  const name = values.name.trim();
  if (name.length === 0) fieldErrors.name = "Název je povinný.";

  if (!inOptions<ProjectType>(values.type, PROJECT_TYPE_OPTIONS)) {
    fieldErrors.type = "Neplatná hodnota.";
  }
  if (!inOptions<LanguageCode>(values.language, LANGUAGE_OPTIONS)) {
    fieldErrors.language = "Neplatná hodnota.";
  }

  // Additional variant languages: each must be a valid language_code and must
  // NOT include the primary language. Deduplicated; the primary is filtered out
  // defensively so it can never be persisted as a variant.
  const enabledLanguages: LanguageCode[] = [];
  for (const lang of values.enabledLanguages) {
    if (!inOptions<LanguageCode>(lang, LANGUAGE_OPTIONS)) {
      fieldErrors.enabledLanguages = "Neplatný jazyk.";
      continue;
    }
    if (lang === values.language) continue;
    if (!enabledLanguages.includes(lang)) enabledLanguages.push(lang);
  }
  if (!inOptions<MarketScope>(values.marketScope, MARKET_SCOPE_OPTIONS)) {
    fieldErrors.marketScope = "Neplatná hodnota.";
  }
  if (!inOptions<GoalType>(values.goalType, GOAL_TYPE_OPTIONS)) {
    fieldErrors.goalType = "Neplatná hodnota.";
  }

  const platforms: PlatformType[] = [];
  for (const platform of values.platforms) {
    if (inOptions<PlatformType>(platform, PLATFORM_OPTIONS)) {
      platforms.push(platform);
    } else {
      fieldErrors.platforms = "Neplatná platforma.";
    }
  }

  const targetAudience = parseJsonObject(values.targetAudience);
  if (!targetAudience.ok) fieldErrors.targetAudience = targetAudience.error;
  const toneOfVoice = parseJsonObject(values.toneOfVoice);
  if (!toneOfVoice.ok) fieldErrors.toneOfVoice = toneOfVoice.error;
  const publishingRules = parseJsonObject(values.publishingRules);
  if (!publishingRules.ok) fieldErrors.publishingRules = publishingRules.error;

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Zkontroluj zvýrazněná pole.", fieldErrors };
  }

  const defaultCta = values.defaultCta.trim();

  const update: ProjectUpdate = {
    name,
    type: values.type as ProjectType,
    language: values.language as LanguageCode,
    enabled_languages: enabledLanguages,
    market_scope: values.marketScope as MarketScope,
    goal_type: values.goalType as GoalType,
    default_cta: defaultCta.length > 0 ? defaultCta : null,
    product_is: parseLines(values.productIs),
    product_is_not: parseLines(values.productIsNot),
    product_strengths: parseLines(values.productStrengths),
    pain_points: parseLines(values.painPoints),
    forbidden_claims: parseLines(values.forbiddenClaims),
    platforms,
    target_audience: (targetAudience as { value: Json }).value,
    tone_of_voice: (toneOfVoice as { value: Json }).value,
    publishing_rules: (publishingRules as { value: Json }).value,
  };

  try {
    await updateProjectForAdmin(projectId, update);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Uložení se nezdařilo." };
  }
}

// ---------------------------------------------------------------------------
// Content Controls tab — platforms, volume, funnel mix, publishing, language
// variant options. Persists into projects.platforms, projects.enabled_languages
// and projects.publishing_rules (jsonb). No DB migration.
// ---------------------------------------------------------------------------

export interface ContentControlsFormValues {
  platforms: string[];
  enabledLanguages: string[];
  postsPerWeek: number;
  // "every_package" = a video for every generated package; "number" = a fixed
  // weekly count taken from videosPerWeek.
  videosMode: "every_package" | "number";
  videosPerWeek: number;
  publishingWeekdays: number[];
  publishingTime: string;
  funnelMixPreset: string;
  funnelMix: FunnelMix;
}

function isFunnelMixPresetValue(value: string): value is FunnelMixPreset {
  return (
    value === "balanced" ||
    value === "growth" ||
    value === "lead_generation" ||
    value === "conversion_light" ||
    value === "custom"
  );
}

export async function updateContentControls(
  projectId: string,
  values: ContentControlsFormValues,
): Promise<ActionResult> {
  if (!projectId) return { ok: false, error: "Chybí identifikátor projektu." };

  const project = await getProjectForAdmin(projectId);
  if (!project) return { ok: false, error: "Projekt nenalezen." };

  const fieldErrors: Record<string, string> = {};

  // Platforms (persisted to projects.platforms).
  const platforms: PlatformType[] = [];
  for (const platform of values.platforms) {
    if (inOptions<PlatformType>(platform, PLATFORM_OPTIONS)) {
      platforms.push(platform);
    } else {
      fieldErrors.platforms = "Neplatná platforma.";
    }
  }

  // Language variant options (persisted to projects.enabled_languages). The
  // primary language is always filtered out so it can never be a variant. These
  // are AVAILABLE options only — never auto-generated here.
  const enabledLanguages: LanguageCode[] = [];
  for (const lang of values.enabledLanguages) {
    if (!inOptions<LanguageCode>(lang, LANGUAGE_OPTIONS)) {
      fieldErrors.enabledLanguages = "Neplatný jazyk.";
      continue;
    }
    if (lang === project.language) continue;
    if (!enabledLanguages.includes(lang)) enabledLanguages.push(lang);
  }

  const preset: FunnelMixPreset = isFunnelMixPresetValue(values.funnelMixPreset)
    ? values.funnelMixPreset
    : "balanced";
  const funnelMix = funnelMixForPreset(preset, values.funnelMix);

  const videosPerWeek: VideosPerWeek =
    values.videosMode === "every_package" ? "every_package" : values.videosPerWeek;

  const controls: ContentControls = {
    postsPerWeek: values.postsPerWeek,
    videosPerWeek,
    publishingWeekdays: Array.from(new Set(values.publishingWeekdays)).sort(
      (a, b) => a - b,
    ),
    publishingTime: values.publishingTime,
    funnelMixPreset: preset,
    funnelMix,
  };

  const validation = validateContentControls(controls, platforms);
  Object.assign(fieldErrors, validation.fieldErrors);

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Zkontroluj zvýrazněná pole.", fieldErrors };
  }

  const update: ProjectUpdate = {
    platforms,
    enabled_languages: enabledLanguages,
    publishing_rules: serializeContentControls(
      controls,
      project.publishing_rules,
    ),
  };

  try {
    await updateProjectForAdmin(projectId, update);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/content-controls`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Uložení se nezdařilo." };
  }
}
