import type { PackageVisualSceneEntry } from "@/lib/content-package/generatedVisualScene";
import {
  isCtaVisualSceneEntry,
  isTypedNonImageVisualSceneEntry,
} from "@/lib/content-package/generatedVisualScene";

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

export function countVisualBeats(entries: readonly PackageVisualSceneEntry[]): number {
  return entries.filter(
    (e) =>
      isAiImageEntry(e) ||
      isAssetEntry(e) ||
      isCtaVisualSceneEntry(e) ||
      isTypedNonImageVisualSceneEntry(e),
  ).length;
}

/**
 * Previously expanded sparse plans with generic AI stills. Filler beats are
 * disabled — story quality beats scene count; target is logged for diagnostics only.
 */
export function expandSparseVisualPlan(args: {
  visualScenes: PackageVisualSceneEntry[];
  voiceoverText: string;
  durationSeconds?: unknown;
}): { scenes: PackageVisualSceneEntry[]; density: VisualDensityResult } {
  const scenes = [...args.visualScenes];
  const duration = parseDurationSeconds(args.durationSeconds);
  const target = targetVisualBeatCount(duration);
  const count = countVisualBeats(scenes);

  return {
    scenes,
    density: {
      visual_beat_count: count,
      target_visual_beat_count: target,
      sparse_plan_adjustment: false,
      narrative_ai_added: 0,
    },
  };
}
