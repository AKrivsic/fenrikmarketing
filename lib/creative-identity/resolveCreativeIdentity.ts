import type { Project } from "@/lib/supabase/types";
import type { VisualProfile } from "@/lib/visual-profile/visualProfile";
import { pickFrom } from "@/lib/creative-identity/hash";
import { filteredCatalogForProject } from "@/lib/creative-identity/filterDimensions";
import { CREATIVE_IDENTITY_DIMENSIONS } from "@/lib/creative-identity/dimensionCatalog";
import {
  CREATIVE_IDENTITY_VERSION,
  creativeIdentityKey,
  type CreativeIdentity,
  type CreativeIdentityDimension,
} from "@/lib/creative-identity/types";

export interface ResolveCreativeIdentityInput {
  project: Project;
  visualProfile: VisualProfile;
  /** Stable per-package seed (project, strategy item, index, topic, angle, optional salt). */
  seed: string;
  /** Keys from recent packages in the series (presentation_generation.creative_identity.key). */
  recentIdentityKeys?: readonly string[];
}

const MAX_COLLISION_ATTEMPTS = 64;

function pickDimension(
  catalog: Record<CreativeIdentityDimension, { id: string; prompt: string }[]>,
  dimension: CreativeIdentityDimension,
  seed: string,
): { id: string; prompt: string } {
  return pickFrom(catalog[dimension], `${seed}:${dimension}`);
}

export function resolveCreativeIdentity(
  input: ResolveCreativeIdentityInput,
): CreativeIdentity {
  const catalog = filteredCatalogForProject({
    project: input.project,
    visualProfile: input.visualProfile,
  });
  const recent = new Set(
    (input.recentIdentityKeys ?? []).filter(
      (k): k is string => typeof k === "string" && k.trim().length > 0,
    ),
  );

  for (let attempt = 0; attempt < MAX_COLLISION_ATTEMPTS; attempt++) {
    const attemptSeed = `${input.seed}|ci|${attempt}`;
    const option_ids = {} as Record<CreativeIdentityDimension, string>;
    const prompts = {} as Record<CreativeIdentityDimension, string>;

    for (const dim of CREATIVE_IDENTITY_DIMENSIONS) {
      const picked = pickDimension(catalog, dim, attemptSeed);
      option_ids[dim] = picked.id;
      prompts[dim] = picked.prompt;
    }

    const identity: CreativeIdentity = {
      version: CREATIVE_IDENTITY_VERSION,
      environment: prompts.environment,
      mood: prompts.mood,
      lighting: prompts.lighting,
      camera: prompts.camera,
      composition: prompts.composition,
      human_presence: prompts.human_presence,
      color_feel: prompts.color_feel,
      option_ids,
      key: "",
    };
    identity.key = creativeIdentityKey(identity);

    if (!recent.has(identity.key)) {
      return identity;
    }
  }

  const fallbackSeed = `${input.seed}|ci|fallback`;
  const option_ids = {} as Record<CreativeIdentityDimension, string>;
  const prompts = {} as Record<CreativeIdentityDimension, string>;
  for (const dim of CREATIVE_IDENTITY_DIMENSIONS) {
    const picked = pickDimension(catalog, dim, fallbackSeed);
    option_ids[dim] = picked.id;
    prompts[dim] = picked.prompt;
  }
  const identity: CreativeIdentity = {
    version: CREATIVE_IDENTITY_VERSION,
    environment: prompts.environment,
    mood: prompts.mood,
    lighting: prompts.lighting,
    camera: prompts.camera,
    composition: prompts.composition,
    human_presence: prompts.human_presence,
    color_feel: prompts.color_feel,
    option_ids,
    key: "",
  };
  identity.key = creativeIdentityKey(identity);
  return identity;
}

export function buildCreativeIdentitySeed(args: {
  projectId: string;
  strategyItemId?: string | null;
  packageIndex?: number | null;
  topic: string;
  angle?: string | null;
  salt?: string | null;
}): string {
  return [
    args.projectId,
    args.strategyItemId ?? "",
    String(args.packageIndex ?? 0),
    args.topic,
    args.angle ?? "",
    args.salt ?? "",
  ].join("|");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function readCreativeIdentityFromUnknown(
  value: unknown,
): CreativeIdentity | null {
  const rec = asRecord(value);
  if (!rec || rec.version !== CREATIVE_IDENTITY_VERSION) return null;
  const dims = CREATIVE_IDENTITY_DIMENSIONS;
  for (const d of dims) {
    if (typeof rec[d] !== "string" || !rec[d].trim()) return null;
  }
  const option_ids = asRecord(rec.option_ids);
  const identity: CreativeIdentity = {
    version: CREATIVE_IDENTITY_VERSION,
    environment: rec.environment as string,
    mood: rec.mood as string,
    lighting: rec.lighting as string,
    camera: rec.camera as string,
    composition: rec.composition as string,
    human_presence: rec.human_presence as string,
    color_feel: rec.color_feel as string,
    option_ids: {} as Record<CreativeIdentityDimension, string>,
    key:
      typeof rec.key === "string" && rec.key.trim()
        ? rec.key.trim()
        : "",
  };
  for (const d of dims) {
    identity.option_ids[d] =
      typeof option_ids?.[d] === "string" ? (option_ids[d] as string) : d;
  }
  if (!identity.key) {
    identity.key = creativeIdentityKey(identity);
  }
  return identity;
}

export function readCreativeIdentityFromPackageBrief(
  brief: Record<string, unknown> | null | undefined,
): CreativeIdentity | null {
  const pg = asRecord(brief?.presentation_generation);
  return readCreativeIdentityFromUnknown(pg?.creative_identity);
}
