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

function splitVoiceoverChunks(voiceover: string, parts: number): string[] {
  const sentences = voiceover
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) return [];
  if (parts <= 1) return [voiceover.trim()];
  const out: string[] = [];
  const per = Math.max(1, Math.ceil(sentences.length / parts));
  for (let i = 0; i < sentences.length; i += per) {
    out.push(sentences.slice(i, i + per).join(" "));
  }
  return out.slice(0, parts);
}

function narrativePromptFromChunk(chunk: string, index: number): string {
  const excerpt = chunk.slice(0, 180).trim();
  return (
    `Portrait 9:16 vertical narrative still for beat ${index + 1}. ` +
    `Illustrate this moment clearly: ${excerpt}. ` +
    `Natural lighting, believable setting, subject centered with vertical headroom, no readable text or logos.`
  );
}

/**
 * Expands sparse AI scene plans before video job creation. Does not duplicate
 * prompts or stretch a single still — adds distinct IMAGE beats from narration.
 */
export function expandSparseVisualPlan(args: {
  visualScenes: PackageVisualSceneEntry[];
  voiceoverText: string;
  durationSeconds?: unknown;
}): { scenes: PackageVisualSceneEntry[]; density: VisualDensityResult } {
  const scenes = [...args.visualScenes];
  const duration = parseDurationSeconds(args.durationSeconds);
  const target = targetVisualBeatCount(duration);
  const before = countVisualBeats(scenes);

  const aiIndices = scenes
    .map((e, i) => (isAiImageEntry(e) ? i : -1))
    .filter((i) => i >= 0);
  const assetCount = scenes.filter(isAssetEntry).length;
  const ctaCount = scenes.filter(isCtaVisualSceneEntry).length;
  const typedCount = scenes.filter(isTypedNonImageVisualSceneEntry).length;

  const minNarrativeAi = Math.max(
    0,
    target - assetCount - ctaCount - Math.max(0, typedCount - ctaCount),
  );

  let narrativeAiAdded = 0;
  if (aiIndices.length < minNarrativeAi && duration > 14) {
    const need = minNarrativeAi - aiIndices.length;
    const chunks = splitVoiceoverChunks(args.voiceoverText, need + aiIndices.length);
    const insertBefore = (() => {
      const ctaIdx = scenes.findIndex((e) => isCtaVisualSceneEntry(e));
      if (ctaIdx >= 0) return ctaIdx;
      const assetIdx = scenes.map((e, i) => (isAssetEntry(e) ? i : -1)).find((i) => i >= 0);
      if (assetIdx !== undefined && assetIdx >= 0) return assetIdx;
      return scenes.length;
    })();

    const newEntries: PackageVisualSceneEntry[] = [];
    for (let i = 0; i < need; i++) {
      const chunk = chunks[aiIndices.length + i] ?? chunks[chunks.length - 1] ?? "";
      if (!chunk.trim()) continue;
      newEntries.push({
        source: "ai",
        image_prompt: narrativePromptFromChunk(chunk, aiIndices.length + i),
      });
      narrativeAiAdded++;
    }
    scenes.splice(insertBefore, 0, ...newEntries);
  }

  const after = countVisualBeats(scenes);
  return {
    scenes,
    density: {
      visual_beat_count: after,
      target_visual_beat_count: target,
      sparse_plan_adjustment: narrativeAiAdded > 0,
      narrative_ai_added: narrativeAiAdded,
    },
  };
}
