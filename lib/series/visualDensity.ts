import type { PackageVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import {
  isCtaVisualSceneEntry,
  isTypedNonImageVisualSceneEntry,
} from "@/lib/content-package/generatedVisualScene";
import type { AssetQualityTier } from "@/lib/assets/assetIngestMetadata";
import { MAX_VIDEO_SCENE_STILLS } from "@/lib/video-engine/storyboard";

export interface VisualDensityResult {
  visual_beat_count: number;
  target_visual_beat_count: number;
  sparse_plan_adjustment: boolean;
  narrative_ai_added: number;
}

function parseDurationSeconds(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string") {
    const n = Number.parseFloat(raw.trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 24;
}

export function targetVisualBeatCount(durationSeconds: number): number {
  const d = Math.max(8, Math.min(45, durationSeconds));
  if (d <= 14) {
    return Math.max(3, Math.round(d / 4));
  }
  return Math.max(4, Math.min(8, Math.round(d / 5)));
}

function isAiImageEntry(entry: PackageVisualSceneEntry): boolean {
  if (isTypedNonImageVisualSceneEntry(entry)) return false;
  const rec = entry as unknown as Record<string, unknown>;
  return rec.source === "ai" && typeof rec.image_prompt === "string";
}

function isAssetEntry(entry: PackageVisualSceneEntry): boolean {
  const rec = entry as unknown as Record<string, unknown>;
  return rec.source === "asset" && typeof rec.asset_id === "string";
}

function assetIdOf(entry: PackageVisualSceneEntry): string | null {
  const rec = entry as unknown as Record<string, unknown>;
  return typeof rec.asset_id === "string" && rec.asset_id.trim()
    ? rec.asset_id.trim()
    : null;
}

export function countVisualBeats(entries: readonly PackageVisualSceneEntry[]): number {
  return entries.filter(
    (e) =>
      isAiImageEntry(e) ||
      isAssetEntry(e) ||
      isCtaVisualSceneEntry(e) ||
      isTypedNonImageVisualSceneEntry(e),
  ).length;
}

export function countAiImageScenes(
  entries: readonly PackageVisualSceneEntry[],
): number {
  return entries.filter((e) => isAiImageEntry(e)).length;
}

function countStillScenes(entries: readonly PackageVisualSceneEntry[]): number {
  return entries.filter((e) => isAiImageEntry(e) || isAssetEntry(e)).length;
}

/**
 * Minimum AI stills for product quality.
 * Standard shorts: always ≥4 AI. Assets enhance (4 AI + 1 asset) and must not
 * leave standard packages at 3 AI. Short clips (≤14s): min 3.
 */
export function minimumAiVisualCount(args: {
  durationSeconds: number;
  highQualityAssetReplacement?: boolean;
}): number {
  void args.highQualityAssetReplacement;
  const d = Math.max(8, Math.min(45, args.durationSeconds));
  if (d <= 14) return 3;
  return 4;
}

function splitVoiceoverSegments(voiceoverText: string, want: number): string[] {
  const sentences = voiceoverText
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length === 0) {
    return Array.from({ length: want }, (_u, i) => `Narrative beat ${i + 1}`);
  }
  if (sentences.length >= want) return sentences.slice(0, want);
  const out = [...sentences];
  while (out.length < want) {
    out.push(sentences[out.length % sentences.length]!);
  }
  return out;
}

function narrativeAiPrompt(segment: string, index: number): PackageVisualSceneEntry {
  const clean = segment.replace(/\s+/g, " ").trim().slice(0, 140);
  return {
    source: "ai",
    image_prompt:
      `Portrait 9:16 vertical photographic still for beat ${index + 1}. ` +
      `Concrete physical subject illustrating: ${clean}. ` +
      `Natural light, distinct from other beats, no readable text or logos.`,
  };
}

function isWeakAsset(
  entry: PackageVisualSceneEntry,
  qualityByAssetId?: ReadonlyMap<string, AssetQualityTier | null>,
): boolean {
  const id = assetIdOf(entry);
  if (!id) return true;
  const q = qualityByAssetId?.get(id);
  return q !== "high" && q !== "medium";
}

/**
 * Enforce visual richness: standard packages get ≥4 AI stills.
 * High-quality assets may accompany AI within the 5-still cap (enhancement).
 */
export function expandSparseVisualPlan(args: {
  visualScenes: PackageVisualSceneEntry[];
  voiceoverText: string;
  durationSeconds?: unknown;
  qualityByAssetId?: ReadonlyMap<string, AssetQualityTier | null>;
}): { scenes: PackageVisualSceneEntry[]; density: VisualDensityResult } {
  const duration = parseDurationSeconds(args.durationSeconds);
  const target = targetVisualBeatCount(duration);
  const minAi = minimumAiVisualCount({ durationSeconds: duration });

  const scenes = [...args.visualScenes];
  let aiCount = countAiImageScenes(scenes);
  let added = 0;

  if (aiCount < minAi) {
    let need = minAi - aiCount;
    let room = Math.max(0, MAX_VIDEO_SCENE_STILLS - countStillScenes(scenes));

    // Free slots by dropping weak assets before sacrificing AI richness.
    if (room < need) {
      for (let i = scenes.length - 1; i >= 0 && room < need; i--) {
        const entry = scenes[i]!;
        if (!isAssetEntry(entry)) continue;
        if (!isWeakAsset(entry, args.qualityByAssetId)) continue;
        scenes.splice(i, 1);
        room = Math.max(0, MAX_VIDEO_SCENE_STILLS - countStillScenes(scenes));
      }
    }

    // If still short on room and a single HQ asset blocks reaching 4 AI inside
    // the cap, keep the asset and add what fits (should be rare: 3 AI+1 asset
    // has room for +1 AI → 4+1).
    room = Math.max(0, MAX_VIDEO_SCENE_STILLS - countStillScenes(scenes));
    const toAdd = Math.min(need, room);
    if (toAdd > 0) {
      const segments = splitVoiceoverSegments(args.voiceoverText, toAdd);
      const insertAt = (() => {
        const ctaIdx = scenes.findIndex((e) => isCtaVisualSceneEntry(e));
        return ctaIdx >= 0 ? ctaIdx : scenes.length;
      })();
      const extras = segments
        .slice(0, toAdd)
        .map((seg, i) => narrativeAiPrompt(seg, aiCount + i));
      scenes.splice(insertAt, 0, ...extras);
      added = extras.length;
    }
  }

  const count = countVisualBeats(scenes);
  return {
    scenes,
    density: {
      visual_beat_count: count,
      target_visual_beat_count: target,
      sparse_plan_adjustment: added > 0,
      narrative_ai_added: added,
    },
  };
}
