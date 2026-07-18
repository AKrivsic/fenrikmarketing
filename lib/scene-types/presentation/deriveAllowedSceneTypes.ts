import type { Json } from "@/lib/supabase/types";
import { isSceneTypesEnabled } from "@/lib/scene-types/config";
import {
  DEFAULT_SCENE_TYPE,
  isSceneType,
  SCENE_TYPES,
  type SceneType,
} from "@/lib/scene-types/sceneType";
import type { ProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import type { ProjectPresentationSignals } from "@/lib/scene-types/presentation/projectSignals";
import { projectPermitsCtaScenes } from "@/lib/scene-types/cta/ctaSourceOfTruth";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseAllowedOverride(
  knowledge: Json | null | undefined,
): SceneType[] | null {
  const root = asRecord(knowledge);
  const presentation = asRecord(root?.presentation);
  const raw = presentation?.allowed_scene_types;
  if (!Array.isArray(raw)) return null;
  const types: SceneType[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const t = entry.trim().toUpperCase();
    if (isSceneType(t)) types.push(t);
  }
  return types.length > 0 ? types : null;
}

export function ensureImageInAllowed(types: SceneType[]): SceneType[] {
  const set = new Set<SceneType>(types);
  set.add(DEFAULT_SCENE_TYPE);
  return SCENE_TYPES.filter((t) => set.has(t));
}

export interface DeriveAllowedSceneTypesInput {
  knowledge: Json | null | undefined;
  proof: ProofIndex;
  projectSignals: ProjectPresentationSignals;
  projectDefaultCta?: string | null;
  goalType?: string | null;
  packageCtaText?: string | null;
}

export function deriveAllowedSceneTypes(
  input: DeriveAllowedSceneTypesInput,
  options?: { sceneTypesEnabled?: boolean },
): SceneType[] {
  const override = parseAllowedOverride(input.knowledge);
  if (override) {
    return ensureImageInAllowed(override);
  }

  const enabled = options?.sceneTypesEnabled ?? isSceneTypesEnabled();
  if (!enabled) {
    return [DEFAULT_SCENE_TYPE];
  }

  const allowed = new Set<SceneType>([DEFAULT_SCENE_TYPE, "CHECKLIST"]);

  if (
    projectPermitsCtaScenes({
      projectDefaultCta: input.projectDefaultCta,
      goalType: input.goalType,
      packageCtaText: input.packageCtaText,
    })
  ) {
    allowed.add("CTA");
  }

  if (input.proof.hasStatisticCandidates) {
    allowed.add("STATISTIC");
  }
  if (input.proof.hasQuoteCandidates) {
    allowed.add("QUOTE");
  }
  if (input.projectSignals.mobileProductCapable) {
    allowed.add("PHONE");
  }

  // PRODUCT_DEMO is always available when scene types are on — required for
  // structured product demonstration (Sprint 4C.1).
  allowed.add("PRODUCT_DEMO");

  return SCENE_TYPES.filter((t) => allowed.has(t));
}

export function parsePresentationAllowedOverride(
  knowledge: Json | null | undefined,
): SceneType[] | null {
  return parseAllowedOverride(knowledge);
}
