import type { SupabaseClient } from "@supabase/supabase-js";
import { readProductRole } from "@/lib/assets/productRole";
import { parseProjectKnowledge } from "@/lib/knowledge/types";
import type { Json } from "@/lib/supabase/types";
import {
  parseVisualProfile,
  type VisualProfile,
} from "@/lib/visual-profile/visualProfile";

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export interface BrandVisualProfile {
  projectId: string;
  projectName: string;
  language: string;
  market: string;
  industryHint: string | null;
  productSummary: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  environment: string;
  wardrobeStyle: string;
  lighting: string;
  cameraStyle: string;
  realismLevel: string;
  forbiddenVisualElements: string[];
  visualProfileName: VisualProfile | null;
  hasLogoAsset: boolean;
  usedColorFallback: boolean;
  usedEnvironmentFallback: boolean;
  sources: string[];
}

export interface ProjectVisualSource {
  id: string;
  name?: string | null;
  type?: string | null;
  language?: string | null;
  market_scope?: string | null;
  product_is?: readonly string[] | null;
  product_is_not?: readonly string[] | null;
  product_strengths?: readonly string[] | null;
  knowledge?: Json | null;
  assets?: Array<{ product_role?: string | null; metadata?: Json | null }>;
}

function productCardStrings(
  knowledge: Json | null | undefined,
  field: "product_is" | "product_strengths",
): readonly string[] | null {
  const parsed = parseProjectKnowledge(knowledge ?? null);
  if (!parsed) return null;
  const values = parsed.cards.product[field];
  return values.length > 0 ? values : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstNonEmpty(values: readonly string[] | null | undefined): string | null {
  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function safeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return HEX_COLOR.test(trimmed) ? trimmed : null;
}

function joinSummary(values: readonly string[] | null | undefined, max = 2): string | null {
  const parts = (values ?? []).map((v) => v.trim()).filter(Boolean).slice(0, max);
  return parts.length > 0 ? parts.join("; ") : null;
}

/**
 * Deterministic BrandVisualProfile from existing project data.
 * Missing colors or industry are not invented as a fake identity.
 */
export function buildBrandVisualProfile(project: ProjectVisualSource): BrandVisualProfile {
  const sources: string[] = [];
  const knowledge = asRecord(project.knowledge);
  const presentation = asRecord(knowledge?.presentation);
  const brand = asRecord(presentation?.brand);
  const visual = asRecord(presentation?.visual);
  const primaryColor =
    safeHex(brand?.accent_color) ??
    safeHex(visual?.accent_color) ??
    safeHex(brand?.primary_color);
  if (primaryColor) sources.push("knowledge.presentation.brand/visual color");

  const secondaryColor =
    safeHex(brand?.background_color) ??
    safeHex(visual?.background_color) ??
    safeHex(brand?.text_color);
  if (secondaryColor) sources.push("knowledge.presentation secondary color");

  const productIs =
    productCardStrings(project.knowledge ?? null, "product_is") ?? project.product_is;
  if (firstNonEmpty(productIs)) sources.push("product_is / Product Brain");

  const strengths =
    productCardStrings(project.knowledge ?? null, "product_strengths") ??
    project.product_strengths;

  const industryHint =
    firstNonEmpty(productIs) ??
    (typeof project.type === "string" && project.type.trim() ? project.type.trim() : null);
  if (industryHint && firstNonEmpty(productIs) == null && project.type) {
    sources.push("projects.type");
  }

  const usedEnvironmentFallback = !industryHint;
  const environment = industryHint
    ? `A real ${industryHint} workplace with believable tools, surfaces, and daylight typical of that field`
    : "A real professional workplace with believable tools, surfaces, and daylight";
  if (usedEnvironmentFallback) sources.push("safe industry fallback");

  const visualProfileName =
    parseVisualProfile(visual?.visual_profile) ??
    parseVisualProfile(presentation?.visual_profile);
  if (visualProfileName) sources.push("presentation visual_profile");

  const lighting =
    visualProfileName === "PREMIUM" || visualProfileName === "EDITORIAL"
      ? "Controlled natural light, clean highlights, no neon glow"
      : "Natural available light, no cinematic color grade";

  const cameraStyle =
    "Handheld-stable documentary camera, one continuous 4-second move, no whip pans";

  const wardrobeStyle = primaryColor
    ? "Professional work clothing that visibly uses the company colors in fabric, vest, or environment accents"
    : "Professional work clothing in a restrained field-appropriate palette, no invented brand uniform";

  const hasLogoAsset = (project.assets ?? []).some(
    (asset) =>
      asset.product_role === "logo" || readProductRole(asset.metadata) === "logo",
  );
  if (hasLogoAsset) sources.push("logo asset present (not rendered)");

  return {
    projectId: project.id,
    projectName: typeof project.name === "string" && project.name.trim() ? project.name.trim() : "Project",
    language: typeof project.language === "string" && project.language.trim() ? project.language.trim() : "cs",
    market:
      typeof project.market_scope === "string" && project.market_scope.trim()
        ? project.market_scope.trim()
        : "unspecified",
    industryHint,
    productSummary: joinSummary(productIs) ?? joinSummary(strengths),
    primaryColor,
    secondaryColor,
    environment,
    wardrobeStyle,
    lighting,
    cameraStyle,
    realismLevel: "photoreal documentary, not CGI commercial",
    forbiddenVisualElements: [
      "generated logos",
      "readable on-screen text",
      "watermarks",
      "specific website or app UI",
      "brand wordmarks",
    ],
    visualProfileName,
    hasLogoAsset,
    usedColorFallback: primaryColor == null,
    usedEnvironmentFallback,
    sources,
  };
}

export function formatBrandVisualProfileForPrompt(profile: BrandVisualProfile): string {
  const colorLine = profile.primaryColor
    ? `Primary color ${profile.primaryColor}${profile.secondaryColor ? `, secondary ${profile.secondaryColor}` : ""}.`
    : "No verified brand hex colors; use a restrained professional field palette, do not invent a fake brand identity.";
  return [
    `Company field: ${profile.industryHint ?? "professional services (fallback)"}.`,
    profile.productSummary ? `Product/service: ${profile.productSummary}.` : null,
    colorLine,
    `Environment: ${profile.environment}.`,
    `Wardrobe: ${profile.wardrobeStyle}.`,
    `Lighting: ${profile.lighting}.`,
    `Camera: ${profile.cameraStyle}.`,
    `Realism: ${profile.realismLevel}.`,
    `Never show: ${profile.forbiddenVisualElements.join(", ")}.`,
  ]
    .filter((line): line is string => Boolean(line))
    .join(" ");
}

export async function loadBrandVisualProfile(
  supabase: SupabaseClient,
  projectId: string,
): Promise<BrandVisualProfile> {
  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, name, type, language, market_scope, product_is, product_is_not, product_strengths, knowledge",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!project) throw new Error("project_not_found");

  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select("metadata")
    .eq("project_id", projectId);
  if (assetsError) throw assetsError;

  return buildBrandVisualProfile({
    id: project.id,
    name: project.name,
    type: project.type,
    language: project.language,
    market_scope: project.market_scope,
    product_is: project.product_is,
    product_is_not: project.product_is_not,
    product_strengths: project.product_strengths,
    knowledge: project.knowledge,
    assets: (assets ?? []).map((asset) => ({ metadata: asset.metadata as Json | null })),
  });
}
