import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import {
  isCtaVisualSceneEntry,
  type PackageVisualSceneEntry,
} from "@/lib/content-package/generatedVisualScene";
import { normalizeFunnelStage, type FunnelStage } from "@/lib/ai/types";

export interface CreativeFingerprint {
  package_id?: string | null;
  topic?: string | null;
  hook?: string | null;
  core_claim?: string | null;
  creative_mode?: string | null;
  funnel_stage?: FunnelStage | null;
  typed_cta: boolean;
  cta_composition_id?: string | null;
  scene_types: string[];
  image_motifs: string[];
  asset_ids: string[];
  opening_hint?: string | null;
  closing_hint?: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const MOTIF_PATTERNS: { motif: string; re: RegExp }[] = [
  { motif: "phone", re: /\b(phone|mobile|smartphone|iphone)\b/i },
  { motif: "laptop", re: /\b(laptop|macbook|notebook)\b/i },
  { motif: "desk", re: /\b(desk|workspace|office desk)\b/i },
  { motif: "founder", re: /\b(founder|entrepreneur|ceo)\b/i },
  { motif: "office", re: /\b(office|meeting room|conference)\b/i },
  { motif: "dashboard", re: /\b(dashboard|analytics|chart)\b/i },
  { motif: "checkout", re: /\b(checkout|register|counter|retail)\b/i },
  { motif: "product_asset", re: /\b(screenshot|ui|interface|app screen)\b/i },
];

function motifsFromText(text: string): string[] {
  const out = new Set<string>();
  for (const { motif, re } of MOTIF_PATTERNS) {
    if (re.test(text)) out.add(motif);
  }
  return [...out];
}

function readCompositionFromBrief(brief: Record<string, unknown>): string | null {
  const pg = asRecord(brief.presentation_generation);
  const fromLog =
    typeof pg?.cta_composition_id === "string"
      ? pg.cta_composition_id.trim()
      : "";
  if (fromLog) return fromLog;
  const scenes = brief.visual_scenes;
  if (!Array.isArray(scenes)) return null;
  for (const s of scenes) {
    const rec = asRecord(s);
    if (rec?.type !== "CTA") continue;
    const payload = asRecord(rec.payload);
    const comp =
      typeof payload?.composition === "string" ? payload.composition.trim() : "";
    if (comp) return comp;
  }
  return null;
}

function sceneTypesFromBrief(brief: Record<string, unknown>): string[] {
  const pg = asRecord(brief.presentation_generation);
  const finals = pg?.final_worker_scene_types;
  if (Array.isArray(finals) && finals.length > 0) {
    return finals.filter((t): t is string => typeof t === "string");
  }
  const scenes = brief.visual_scenes;
  if (!Array.isArray(scenes)) return [];
  const out: string[] = [];
  for (const s of scenes) {
    const rec = asRecord(s);
    if (!rec) continue;
    if (typeof rec.type === "string") out.push(rec.type);
    else if (rec.source === "ai" || rec.source === "asset") out.push("IMAGE");
  }
  return out;
}

function assetIdsFromVisualScenes(scenes: unknown): string[] {
  if (!Array.isArray(scenes)) return [];
  const ids = new Set<string>();
  for (const s of scenes) {
    const rec = asRecord(s);
    if (!rec) continue;
    const aid =
      typeof rec.asset_id === "string"
        ? rec.asset_id
        : typeof asRecord(rec.payload)?.asset_id === "string"
          ? (asRecord(rec.payload)!.asset_id as string)
          : null;
    if (aid) ids.add(aid);
  }
  return [...ids];
}

export function fingerprintFromPackageBrief(args: {
  packageId?: string | null;
  brief: Record<string, unknown>;
  topic?: string | null;
}): CreativeFingerprint {
  const brief = args.brief;
  const hook = typeof brief.hook === "string" ? brief.hook.trim() : null;
  const voiceover =
    typeof brief.voiceover_text === "string" ? brief.voiceover_text : "";
  const scenes = brief.visual_scenes;
  const typedCta =
    Array.isArray(scenes) &&
    (scenes as PackageVisualSceneEntry[]).some((e) => isCtaVisualSceneEntry(e));

  const promptBlob = [
    hook ?? "",
    voiceover,
    ...(Array.isArray(brief.image_prompts)
      ? (brief.image_prompts as unknown[]).filter(
          (p): p is string => typeof p === "string",
        )
      : []),
  ].join(" ");

  const openingHint = (() => {
    if (!Array.isArray(scenes) || scenes.length === 0) return null;
    const first = asRecord(scenes[0]);
    if (!first) return null;
    if (typeof first.image_prompt === "string") return first.image_prompt.slice(0, 120);
    if (typeof first.used_as === "string") return first.used_as.slice(0, 120);
    return null;
  })();

  const closingHint = (() => {
    if (!Array.isArray(scenes) || scenes.length === 0) return null;
    const last = asRecord(scenes[scenes.length - 1]);
    if (!last) return null;
    if (last.type === "CTA") return "typed_cta";
    if (typeof last.image_prompt === "string") return last.image_prompt.slice(0, 120);
    if (typeof last.used_as === "string") return last.used_as.slice(0, 120);
    return null;
  })();

  const funnelRaw =
    typeof brief.funnel_stage === "string" ? brief.funnel_stage : null;

  return {
    package_id: args.packageId ?? null,
    topic: args.topic ?? null,
    hook,
    core_claim: hook,
    creative_mode:
      typeof brief.creative_mode === "string" ? brief.creative_mode : null,
    funnel_stage: normalizeFunnelStage(funnelRaw),
    typed_cta: typedCta,
    cta_composition_id: readCompositionFromBrief(brief),
    scene_types: sceneTypesFromBrief(brief),
    image_motifs: motifsFromText(promptBlob),
    asset_ids: assetIdsFromVisualScenes(scenes),
    opening_hint: openingHint,
    closing_hint: closingHint,
  };
}

export function fingerprintFromPackageOutput(
  pkg: ContentPackageOutput,
  topic?: string | null,
): CreativeFingerprint {
  return fingerprintFromPackageBrief({
    brief: pkg as unknown as Record<string, unknown>,
    topic,
  });
}

export function compactFingerprintSummary(
  fp: CreativeFingerprint,
): Record<string, unknown> {
  return {
    hook: fp.hook,
    topic: fp.topic,
    creative_mode: fp.creative_mode,
    typed_cta: fp.typed_cta,
    cta_composition_id: fp.cta_composition_id,
    scene_types: fp.scene_types,
    motifs: fp.image_motifs,
    closing: fp.closing_hint,
  };
}
