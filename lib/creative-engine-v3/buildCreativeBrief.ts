/**
 * Creative Brief — deterministic context for AI ideation.
 * Must never contain stories, Scenario Pool, Divergence templates, or example concepts.
 */

import type { AntiRepetitionMemory, FunnelStage } from "@/lib/ai/types";
import type { AssetRef } from "@/lib/ai/prompts/generateContentPackage";
import type { Project } from "@/lib/supabase/types";
import { angleLensForIndex } from "@/lib/projects/productionRun";
import {
  CREATIVE_BRIEF_VERSION,
  type CreativeBrief,
  type CreativeConceptFingerprint,
} from "@/lib/creative-engine-v3/types";
import {
  atmosphereFromPackageBrief,
  fingerprintFromPackageBrief,
  isDarkOfficeAtmosphere,
  normalizeFingerprintText,
} from "@/lib/creative-engine-v3/conceptFingerprint";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function audienceFromProject(project: Project): string | null {
  const ta = project.target_audience;
  if (typeof ta === "string" && ta.trim()) return ta.trim();
  const rec = asRecord(ta);
  if (!rec) {
    if (Array.isArray(ta)) {
      const parts = ta
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean);
      return parts.length ? parts.join("; ") : null;
    }
    return null;
  }
  if (Array.isArray(rec.segments)) {
    const parts = rec.segments
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  const label =
    (typeof rec.label === "string" && rec.label.trim()) ||
    (typeof rec.description === "string" && rec.description.trim()) ||
    null;
  return label;
}

function voiceNotesFromProject(project: Project): string | null {
  const tone = project.tone_of_voice;
  if (typeof tone === "string" && tone.trim()) return tone.trim();
  const rec = asRecord(tone);
  if (!rec) return null;
  const parts: string[] = [];
  for (const key of ["summary", "style", "notes", "description"] as const) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  }
  if (Array.isArray(rec.traits)) {
    for (const t of rec.traits) {
      if (typeof t === "string" && t.trim()) parts.push(t.trim());
    }
  }
  return parts.length ? parts.join("; ") : null;
}

function assetsSummary(assets: readonly AssetRef[]): string {
  if (assets.length === 0) {
    return "No project assets available for authentic product appearance.";
  }
  const byType = new Map<string, number>();
  let authenticUi = 0;
  for (const a of assets) {
    const t = (a.media_type || a.asset_class || "unknown").toLowerCase();
    byType.set(t, (byType.get(t) ?? 0) + 1);
    const role = `${a.product_role ?? ""} ${a.title ?? ""} ${a.suggested_usage ?? ""}`.toLowerCase();
    if (/\b(ui|screenshot|product|chat|interface)\b/.test(role)) {
      authenticUi += 1;
    }
  }
  const counts = [...byType.entries()]
    .map(([t, n]) => `${n} ${t}`)
    .join(", ");
  return `${assets.length} assets (${counts}); ~${authenticUi} likely product/UI candidates. Counts and roles only — not creative scenes.`;
}

export interface BuildCreativeBriefInput {
  project: Project;
  topic: string;
  angle?: string | null;
  funnelStage: FunnelStage;
  platform: string;
  format: string;
  ctaHint?: string | null;
  productionRunId?: string | null;
  packageIndex?: number | null;
  packageCount?: number | null;
  painPointFocus?: string | null;
  siblingAngles?: readonly string[];
  assets: readonly AssetRef[];
  ppd?: {
    presentationClass?: string | null;
    revealCeiling?: string | null;
    authenticAssetAvailable?: boolean;
  };
  memory: AntiRepetitionMemory;
  /** Structured fingerprints from recent packages (rejection only). */
  recentFingerprints?: readonly CreativeConceptFingerprint[];
  /** Recent atmosphere strings from packages. */
  recentAtmospheres?: readonly string[];
}

/**
 * Assemble Creative Brief. Assertively excludes Scenario Pool / knowledge.scenarios
 * and any Divergence template content.
 */
export function buildCreativeBrief(input: BuildCreativeBriefInput): CreativeBrief {
  const packageIndex =
    typeof input.packageIndex === "number" && Number.isFinite(input.packageIndex)
      ? Math.trunc(input.packageIndex)
      : null;

  const fingerprints = [
    ...(input.recentFingerprints ?? input.memory.fingerprints ?? []),
  ];
  const atmospheres = [
    ...(input.recentAtmospheres ?? input.memory.atmospheres ?? []),
    ...fingerprints.map((f) => f.palette_atmosphere),
  ]
    .map((a) => a.trim())
    .filter(Boolean);

  const forbidden = new Set<string>();
  for (const a of atmospheres) {
    if (isDarkOfficeAtmosphere(a)) {
      forbidden.add("dark-office / night-office / blue-corporate default");
    }
    const key = normalizeFingerprintText(a);
    if (key) forbidden.add(key);
  }

  return {
    version: CREATIVE_BRIEF_VERSION,
    project: {
      product_is: [...(input.project.product_is ?? [])],
      product_is_not: [...(input.project.product_is_not ?? [])],
      pain_points: [...(input.project.pain_points ?? [])],
      strengths: [...(input.project.product_strengths ?? [])],
      audience: audienceFromProject(input.project),
      voice_notes: voiceNotesFromProject(input.project),
    },
    strategy: {
      topic: input.topic.trim(),
      angle: input.angle?.trim() || null,
      funnel_stage: input.funnelStage,
      platform: input.platform,
      format: input.format,
      cta_hint: input.ctaHint?.trim() || input.project.default_cta?.trim() || null,
    },
    run: {
      production_run_id: input.productionRunId ?? null,
      package_index: packageIndex,
      package_count:
        typeof input.packageCount === "number" && Number.isFinite(input.packageCount)
          ? Math.trunc(input.packageCount)
          : null,
      angle_lens:
        packageIndex !== null ? angleLensForIndex(packageIndex) : null,
      pain_point_focus: input.painPointFocus?.trim() || null,
      sibling_angles: [...(input.siblingAngles ?? [])],
    },
    assets: {
      summary: assetsSummary(input.assets),
      ppd_constraints: {
        presentation_class: input.ppd?.presentationClass ?? null,
        reveal_ceiling: input.ppd?.revealCeiling ?? null,
        authentic_asset_available: Boolean(input.ppd?.authenticAssetAvailable),
      },
    },
    memory: {
      recent_hooks: [...input.memory.hooks],
      recent_topics: [...input.memory.topics],
      recent_ctas: [...input.memory.ctas],
      recent_fingerprints: fingerprints,
      recent_directions: [
        ...(input.memory.directions ?? []),
        ...fingerprints
          .map((f) => f.creative_direction?.trim())
          .filter((d): d is string => Boolean(d)),
      ].filter((d, i, arr) => {
        const key = d.toLowerCase();
        return arr.findIndex((x) => x.toLowerCase() === key) === i;
      }),
      forbidden_atmospheres: [...forbidden],
    },
    rules: {
      must_stop_scroll_in_first_2s: true,
      forbid_generic_b2b: true,
      forbid_prewritten_banks: true,
      visual_variety_required: true,
    },
  };
}

/** Compact digest for telemetry / persistence (no stories). */
export function creativeBriefDigest(brief: CreativeBrief): CreativeBrief["strategy"] & {
  package_index: number | null;
  fingerprint_memory_count: number;
  hook_memory_count: number;
} {
  return {
    topic: brief.strategy.topic,
    angle: brief.strategy.angle,
    funnel_stage: brief.strategy.funnel_stage,
    platform: brief.strategy.platform,
    format: brief.strategy.format,
    cta_hint: brief.strategy.cta_hint,
    package_index: brief.run.package_index,
    fingerprint_memory_count: brief.memory.recent_fingerprints.length,
    hook_memory_count: brief.memory.recent_hooks.length,
  };
}

/**
 * Guard: brief must not contain Scenario Pool / Divergence markers.
 * Used by tests and optional runtime assert.
 */
export function creativeBriefContainsForbiddenCreativeBanks(
  brief: CreativeBrief,
): string[] {
  const blob = JSON.stringify(brief).toLowerCase();
  const hits: string[] = [];
  const banned = [
    "scenario pool",
    "scene_templates",
    "after hours, chats still screaming",
    "paper mountain of anonymous visits",
    "creative divergence",
    "family_builders",
    "hvac_templates",
    "web_service_templates",
    "professional_return_templates",
    "example concept:",
    "example story:",
  ];
  for (const b of banned) {
    if (blob.includes(b)) hits.push(b);
  }
  // knowledge.scenarios must never be copied in
  if ("scenarios" in (brief as unknown as Record<string, unknown>)) {
    hits.push("scenarios_field");
  }
  return hits;
}

export function collectFingerprintsFromPackageBriefs(
  briefs: readonly unknown[],
): {
  fingerprints: CreativeConceptFingerprint[];
  atmospheres: string[];
} {
  const fingerprints: CreativeConceptFingerprint[] = [];
  const atmospheres: string[] = [];
  const seen = new Set<string>();
  for (const brief of briefs) {
    const fp = fingerprintFromPackageBrief(brief);
    if (fp) {
      const key = normalizeFingerprintText(
        `${fp.core_premise}|${fp.visual_world}|${fp.opening_mechanism}`,
      );
      if (!seen.has(key)) {
        seen.add(key);
        fingerprints.push(fp);
      }
    }
    const atm = atmosphereFromPackageBrief(brief);
    if (atm) atmospheres.push(atm);
  }
  return { fingerprints, atmospheres };
}
