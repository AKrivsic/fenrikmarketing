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
  CONTENT_TYPE_PLATFORMS,
  DEFAULT_PLATFORM_CONTENT_TYPES,
  isPlatformContentType,
  type ContentControls,
  type ContentTypePlatform,
  type FunnelMix,
  type FunnelMixPreset,
  type PlatformContentType,
  type VideosPerWeek,
  funnelMixForPreset,
  serializeContentControls,
  validateContentControls,
} from "@/lib/projects/contentControls";
import {
  AUTOMATION_WORKFLOWS,
  N8nConfigError,
  N8nRequestError,
  sendN8nWebhook,
} from "@/lib/n8n/client";
import {
  normalizeWebsiteUrl,
  setKnowledgeSourceUrl,
} from "@/lib/knowledge/websiteUrl";
import {
  parseServiceMixInput,
  validateServiceMix,
  withServiceMix,
} from "@/lib/projects/serviceMix";
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
  // Project Brain Improvements V1 (Part 1) — canonical website URL, persisted
  // into projects.knowledge.source_url (no DB migration).
  websiteUrl: string;
  // Project Brain Improvements V1 (Part 2) — optional service mix textarea
  // ("Service name = 50" per line), persisted into publishing_rules.service_mix.
  serviceMix: string;
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
  | { ok: true; code?: WorkflowResultCode }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      code?: WorkflowResultCode;
    };

// Machine-readable outcome of a workflow trigger, so the UI can render an exact
// message (and never just a generic failure). "accepted" is the success code.
export type WorkflowResultCode =
  | "accepted"
  | "not_configured"
  | "workflow_not_found"
  | "secret_mismatch"
  | "workflow_error"
  | "network_error"
  | "unknown_error";

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

  // Website URL (Part 1). A blank value clears the URL; a non-empty value must
  // normalize to a usable http(s) URL, otherwise it is rejected.
  const websiteUrlRaw = values.websiteUrl.trim();
  if (websiteUrlRaw.length > 0 && normalizeWebsiteUrl(websiteUrlRaw) === null) {
    fieldErrors.websiteUrl = "Neplatná URL (např. example.com).";
  }

  // Service mix (Part 2). Optional; when provided it must total 100.
  const serviceMixEntries = parseServiceMixInput(values.serviceMix);
  const serviceMixValidation = validateServiceMix(serviceMixEntries);
  if (!serviceMixValidation.ok) {
    fieldErrors.serviceMix = serviceMixValidation.error ?? "Neplatný service mix.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Zkontroluj zvýrazněná pole.", fieldErrors };
  }

  // The website URL is merged into the EXISTING knowledge jsonb (preserving
  // cards / scenarios), so load the current row first.
  const existing = await getProjectForAdmin(projectId);
  if (!existing) return { ok: false, error: "Projekt nenalezen." };

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
    // Merge the service mix into the edited publishing_rules (the dedicated
    // field is the source of truth and overrides any service_mix in the JSON).
    publishing_rules: withServiceMix(
      (publishingRules as { value: Json }).value,
      serviceMixEntries,
    ),
    // Persist the canonical website URL into knowledge.source_url (Part 1).
    knowledge: setKnowledgeSourceUrl(existing.knowledge, websiteUrlRaw),
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
  // P3 — per-platform content type. Partial/loose map from the form; sanitized
  // against CONTENT_TYPE_PLATFORMS + defaults below.
  platformContentTypes: Record<string, string>;
  // Platform Targets V2 — per-platform weekly output target. Loose map from the
  // form; sanitized to active platforms + clamped below.
  platformTargets: Record<string, number>;
}

// Sanitizes the loose form map into a complete, valid platform content type
// map (unknown platforms dropped, missing/invalid values defaulted).
function sanitizePlatformContentTypes(
  raw: Record<string, string>,
): Record<ContentTypePlatform, PlatformContentType> {
  const result: Record<ContentTypePlatform, PlatformContentType> = {
    ...DEFAULT_PLATFORM_CONTENT_TYPES,
  };
  for (const platform of CONTENT_TYPE_PLATFORMS) {
    const value = raw[platform];
    if (isPlatformContentType(value)) {
      result[platform] = value;
    }
  }
  return result;
}

// Sanitizes the loose form target map into a clean map keyed by ACTIVE
// content-type platforms only. Inactive/unsupported platforms (incl. "x") are
// dropped so they are never persisted as targets. Values clamped to 0–100.
function sanitizePlatformTargets(
  raw: Record<string, number> | undefined,
  platforms: PlatformType[],
): Record<ContentTypePlatform, number> {
  const result = {} as Record<ContentTypePlatform, number>;
  const activeSet = new Set(platforms as string[]);
  for (const platform of CONTENT_TYPE_PLATFORMS) {
    if (!activeSet.has(platform)) continue;
    const value = raw?.[platform];
    if (typeof value === "number" && Number.isFinite(value)) {
      result[platform] = Math.min(100, Math.max(0, Math.trunc(value)));
    }
  }
  return result;
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
    platformContentTypes: sanitizePlatformContentTypes(
      values.platformContentTypes ?? {},
    ),
    platformTargets: sanitizePlatformTargets(values.platformTargets, platforms),
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

// ---------------------------------------------------------------------------
// Project Actions (P1) — manual workflow triggers.
//
// These reuse the EXISTING n8n trigger mechanism (the same sendN8nWebhook +
// AUTOMATION_WORKFLOWS that /api/automation/* route handlers use). No new
// workflow, endpoint, or business logic is introduced — this is the UI control
// surface for triggers that already existed. Each trigger is fire-and-forget:
// n8n runs the workflow and reports back via the existing callbacks, so we can
// only confirm the request was QUEUED, not its eventual result.
// ---------------------------------------------------------------------------

// Current week's Monday as YYYY-MM-DD (UTC), matching the planner's week model.
function currentWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sun ... 6 = Sat
  const offsetToMonday = (day + 6) % 7;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - offsetToMonday);
  return monday.toISOString().slice(0, 10);
}

// Maps a thrown n8n error to a precise, user-facing result. We never collapse
// every failure into one generic string — the user must be able to tell a
// missing-config from a 404 from a network error.
function classifyWorkflowError(
  workflow: string,
  err: unknown,
): { ok: false; error: string; code: WorkflowResultCode } {
  if (err instanceof N8nConfigError) {
    return {
      ok: false,
      code: "not_configured",
      error: "n8n není nakonfigurováno (chybí N8N_BASE_URL / N8N_WEBHOOK_SECRET).",
    };
  }

  if (err instanceof N8nRequestError) {
    const status = err.status;
    if (status === undefined) {
      return {
        ok: false,
        code: "network_error",
        error: "Síťová chyba: n8n nelze kontaktovat.",
      };
    }
    if (status === 404) {
      return {
        ok: false,
        code: "workflow_not_found",
        error:
          "n8n workflow není aktivní (404). Aktivujte workflow v n8n (production webhook).",
      };
    }
    if (status === 401 || status === 403) {
      return {
        ok: false,
        code: "secret_mismatch",
        error: "n8n odmítl požadavek (neplatný secret – 401/403).",
      };
    }
    return {
      ok: false,
      code: "workflow_error",
      error: `n8n vrátil chybu (status ${status}).`,
    };
  }

  // Defensive: anything we did not anticipate. Surface it, do not hide it.
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[actions] workflow=${workflow} unexpected_error: ${detail}`);
  return {
    ok: false,
    code: "unknown_error",
    error: "Neočekávaná chyba při spuštění workflow.",
  };
}

async function triggerWorkflow(
  projectId: string,
  workflow: (typeof AUTOMATION_WORKFLOWS)[keyof typeof AUTOMATION_WORKFLOWS],
  payload?: Record<string, unknown>,
): Promise<ActionResult> {
  if (!projectId)
    return {
      ok: false,
      code: "unknown_error",
      error: "Chybí identifikátor projektu.",
    };

  const project = await getProjectForAdmin(projectId);
  if (!project)
    return {
      ok: false,
      code: "unknown_error",
      error: "Projekt nenalezen.",
    };

  try {
    await sendN8nWebhook({ workflow, projectId, payload });
    revalidatePath(`/projects/${projectId}/actions`);
    return { ok: true, code: "accepted" };
  } catch (err) {
    return classifyWorkflowError(workflow, err);
  }
}

export async function runTrendScan(projectId: string): Promise<ActionResult> {
  return triggerWorkflow(projectId, AUTOMATION_WORKFLOWS.trendScan);
}

export async function runWeeklyStrategy(
  projectId: string,
): Promise<ActionResult> {
  return triggerWorkflow(projectId, AUTOMATION_WORKFLOWS.weeklyStrategy, {
    week_start: currentWeekStart(),
  });
}

export async function runGenerateContentPackages(
  projectId: string,
): Promise<ActionResult> {
  return triggerWorkflow(
    projectId,
    AUTOMATION_WORKFLOWS.generateContentPackage,
  );
}

export async function runPublishingPlanner(
  projectId: string,
): Promise<ActionResult> {
  return triggerWorkflow(projectId, AUTOMATION_WORKFLOWS.publishingPlanner, {
    week_start: currentWeekStart(),
  });
}
