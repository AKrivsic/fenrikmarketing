import type {
  ImageScenePayload,
  VisualScene,
} from "@/lib/scene-types/visualScene";
import { DEFAULT_SCENE_TYPE } from "@/lib/scene-types/sceneType";
import { normalizePresentationText } from "@/lib/scene-types/presentation/textMatch";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function imagePayloadFromMedia(raw: unknown): ImageScenePayload | null {
  const media = asRecord(raw);
  if (!media) return null;
  if (media.source === "ai") {
    const image_prompt =
      typeof media.image_prompt === "string" ? media.image_prompt.trim() : "";
    if (!image_prompt) return null;
    return { media: { source: "ai", image_prompt } };
  }
  if (media.source === "asset") {
    const asset_id =
      typeof media.asset_id === "string" ? media.asset_id.trim() : "";
    const used_as = typeof media.used_as === "string" ? media.used_as.trim() : "";
    if (!asset_id || !used_as) return null;
    return {
      media: {
        source: "asset",
        asset_id,
        used_as,
        ...(typeof media.video_usage === "string"
          ? { video_usage: media.video_usage }
          : {}),
      },
    };
  }
  return null;
}

function extractExistingImagePayload(
  scene: VisualScene,
): ImageScenePayload | null {
  if (scene.type === DEFAULT_SCENE_TYPE) {
    return scene.payload as ImageScenePayload;
  }
  const payload = asRecord(scene.payload);
  if (!payload) return null;

  const fromMedia = imagePayloadFromMedia(payload.media);
  if (fromMedia) return fromMedia;

  const asset_id =
    typeof payload.asset_id === "string" ? payload.asset_id.trim() : "";
  const image_prompt =
    typeof payload.image_prompt === "string" ? payload.image_prompt.trim() : "";
  if (asset_id) {
    return {
      media: {
        source: "asset",
        asset_id,
        used_as: "Mobile product screen",
        video_usage: "framed_phone",
      },
    };
  }
  if (image_prompt) {
    return { media: { source: "ai", image_prompt } };
  }

  const screen = asRecord(payload.screen);
  if (screen?.asset_id && typeof screen.asset_id === "string") {
    const used_as =
      typeof screen.used_as === "string" && screen.used_as.trim()
        ? screen.used_as.trim()
        : "Product screen in context";
    return {
      media: {
        source: "asset",
        asset_id: screen.asset_id.trim(),
        used_as,
        video_usage:
          typeof screen.video_usage === "string"
            ? screen.video_usage
            : "framed_phone",
      },
    };
  }
  if (screen && typeof screen.image_prompt === "string") {
    const prompt = screen.image_prompt.trim();
    if (prompt) return { media: { source: "ai", image_prompt: prompt } };
  }

  return null;
}

function buildAiPromptFromNarration(args: {
  narration: string;
  scene: VisualScene;
  projectName?: string;
}): string {
  const hint = args.scene.narration_hint?.trim();
  const base = hint && hint.length > 0 ? hint : args.narration.trim();
  const cleaned = base.replace(/\s+/g, " ").slice(0, 280);
  if (cleaned.length >= 24) {
    return (
      `Realistic vertical video still illustrating: ${cleaned}. ` +
      "No readable text, logos, or watermarks in the image."
    );
  }
  const role = args.scene.role?.trim();
  const roleBit = role ? ` Scene role: ${role}.` : "";
  return (
    `Realistic professional vertical video still for a short social video.${roleBit} ` +
    "Neutral composition, no readable text, logos, or watermarks."
  );
}

export function downgradeSceneToImage(args: {
  scene: VisualScene;
  narration: string;
  projectName?: string;
}): VisualScene {
  const existing = extractExistingImagePayload(args.scene);
  const id = args.scene.id ?? "scene-1";
  if (existing) {
    return {
      ...args.scene,
      id,
      type: DEFAULT_SCENE_TYPE,
      payload: existing,
    };
  }

  const prompt = buildAiPromptFromNarration({
    narration: args.narration,
    scene: args.scene,
    projectName: args.projectName,
  });

  return {
    id,
    type: DEFAULT_SCENE_TYPE,
    payload: { media: { source: "ai", image_prompt: prompt } },
    ...(args.scene.narration_hint ? { narration_hint: args.scene.narration_hint } : {}),
    ...(args.scene.role ? { role: args.scene.role } : {}),
  };
}

export function splitVoiceoverSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const parts = normalized
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : [normalized];
}

export function narrationForScene(args: {
  voiceoverText: string;
  sceneIndex: number;
  sceneCount: number;
  narrationHint?: string;
}): string {
  if (args.narrationHint?.trim()) return args.narrationHint.trim();
  const sentences = splitVoiceoverSentences(args.voiceoverText);
  if (sentences.length >= args.sceneCount && args.sceneCount > 0) {
    const idx = Math.min(args.sceneIndex, sentences.length - 1);
    return sentences[idx] ?? args.voiceoverText;
  }
  if (args.sceneCount === 1) return args.voiceoverText;
  return args.voiceoverText;
}

export function listLikeNarration(narration: string): boolean {
  const n = normalizePresentationText(narration);
  const commaParts = narration.split(/[,;]/).filter((p) => p.trim().length > 3);
  if (commaParts.length >= 2) return true;
  if (/\b(first|second|third|fourth|step \d|steps \d|\d+\)|\d+\.)\b/i.test(n)) {
    return true;
  }
  if (/\b(and also|as well as|including|such as)\b/i.test(n)) return true;
  return false;
}
