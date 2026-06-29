import sharp from "sharp";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";

export type AssetLayoutMode =
  | "fullscreen"
  | "framed_screen"
  | "framed_phone"
  | "floating_card"
  | "background"
  | "card";

const CANVAS_W = SHORT_PROFILE.width;
const CANVAS_H = SHORT_PROFILE.height;

export function normalizeAssetLayoutMode(
  videoUsage?: string | null,
): AssetLayoutMode {
  const raw = videoUsage?.trim() ?? "";
  if (!raw) return "floating_card";
  if (raw === "fullscreen") return "fullscreen";
  if (raw === "framed_phone") return "framed_phone";
  if (raw === "floating_card") return "floating_card";
  if (raw === "background") return "background";
  if (raw === "proof" || raw === "reference") return "card";
  if (
    raw === "framed_screen" ||
    raw === "framed_laptop" ||
    raw === "framed_monitor" ||
    raw === "comparison"
  ) {
    return "framed_screen";
  }
  return "floating_card";
}

export function shouldComposeAssetLayout(videoUsage?: string | null): boolean {
  return normalizeAssetLayoutMode(videoUsage) !== "fullscreen";
}

function fitContain(
  assetW: number,
  assetH: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  const scale = Math.min(maxW / assetW, maxH / assetH, 1);
  return {
    width: Math.max(1, Math.round(assetW * scale)),
    height: Math.max(1, Math.round(assetH * scale)),
  };
}

async function blurredCoverBackground(asset: Buffer): Promise<Buffer> {
  return sharp(asset)
    .resize(CANVAS_W, CANVAS_H, { fit: "cover", position: "centre" })
    .blur(28)
    .modulate({ brightness: 0.5, saturation: 0.85 })
    .toBuffer();
}

async function neutralGradientBackground(): Promise<Buffer> {
  const svg = `<svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function browserChromeSvg(screenX: number, screenY: number, screenW: number, screenH: number): Buffer {
  const pad = 12;
  const barH = 40;
  const outerX = screenX - pad;
  const outerY = screenY - barH;
  const outerW = screenW + pad * 2;
  const outerH = screenH + barH + pad;
  const svg = `<svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${outerX}" y="${outerY}" width="${outerW}" height="${outerH}" rx="16" ry="16" fill="none" stroke="#cbd5e1" stroke-width="10"/>
    <rect x="${outerX + 6}" y="${outerY + 6}" width="${outerW - 12}" height="${barH - 8}" rx="10" ry="10" fill="#e2e8f0"/>
    <circle cx="${outerX + 24}" cy="${outerY + barH / 2}" r="5" fill="#f87171"/>
    <circle cx="${outerX + 42}" cy="${outerY + barH / 2}" r="5" fill="#fbbf24"/>
    <circle cx="${outerX + 60}" cy="${outerY + barH / 2}" r="5" fill="#4ade80"/>
  </svg>`;
  return Buffer.from(svg);
}

function phoneFrameSvg(screenX: number, screenY: number, screenW: number, screenH: number): Buffer {
  const pad = 12;
  const outerX = screenX - pad;
  const outerY = screenY - pad - 10;
  const outerW = screenW + pad * 2;
  const outerH = screenH + pad * 2 + 20;
  const svg = `<svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${outerX}" y="${outerY}" width="${outerW}" height="${outerH}" rx="40" ry="40" fill="none" stroke="#334155" stroke-width="14"/>
    <rect x="${outerX + outerW / 2 - 36}" y="${outerY + 16}" width="72" height="5" rx="2.5" fill="#475569"/>
  </svg>`;
  return Buffer.from(svg);
}

function cardShadowSvg(cardX: number, cardY: number, cardW: number, cardH: number): Buffer {
  const svg = `<svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
    </defs>
    <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="20" ry="20" fill="#ffffff" filter="url(#shadow)"/>
  </svg>`;
  return Buffer.from(svg);
}

async function resizedAsset(asset: Buffer, w: number, h: number): Promise<Buffer> {
  return sharp(asset).resize(w, h, { fit: "inside" }).png().toBuffer();
}

async function composeOnCanvas(
  base: Buffer,
  layers: sharp.OverlayOptions[],
): Promise<Buffer> {
  return sharp(base).composite(layers).png().toBuffer();
}

export interface ComposeAssetSceneInput {
  assetBytes: Buffer;
  videoUsage?: string | null;
}

/** Builds a 9:16 still for FFmpeg from a product asset and usage mode. */
export async function composeAssetSceneStill(
  input: ComposeAssetSceneInput,
): Promise<Buffer> {
  const mode = normalizeAssetLayoutMode(input.videoUsage);
  if (mode === "fullscreen") {
    return input.assetBytes;
  }

  const meta = await sharp(input.assetBytes).metadata();
  const assetW = meta.width ?? CANVAS_W;
  const assetH = meta.height ?? CANVAS_H;

  const bg =
    mode === "background" || mode === "framed_screen" || mode === "framed_phone"
      ? await blurredCoverBackground(input.assetBytes)
      : await neutralGradientBackground();

  let maxW: number;
  let maxH: number;
  let offsetY = 0;

  switch (mode) {
    case "framed_screen":
      maxW = Math.round(CANVAS_W * 0.9);
      maxH = Math.round(CANVAS_H * 0.52);
      offsetY = -Math.round(CANVAS_H * 0.04);
      break;
    case "framed_phone":
      maxW = Math.round(CANVAS_W * 0.72);
      maxH = Math.round(CANVAS_H * 0.78);
      break;
    case "background":
      maxW = Math.round(CANVAS_W * 0.86);
      maxH = Math.round(CANVAS_H * 0.58);
      break;
    case "card":
      maxW = Math.round(CANVAS_W * 0.8);
      maxH = Math.round(CANVAS_H * 0.55);
      break;
    case "floating_card":
    default:
      maxW = Math.round(CANVAS_W * 0.86);
      maxH = Math.round(CANVAS_H * 0.7);
      break;
  }

  const fit = fitContain(assetW, assetH, maxW, maxH);
  const assetPng = await resizedAsset(input.assetBytes, fit.width, fit.height);
  const left = Math.round((CANVAS_W - fit.width) / 2);
  const top = Math.round((CANVAS_H - fit.height) / 2 + offsetY);

  const layers: sharp.OverlayOptions[] = [
    { input: assetPng, left, top },
  ];

  if (mode === "framed_screen") {
    layers.push({
      input: browserChromeSvg(left, top, fit.width, fit.height),
      left: 0,
      top: 0,
    });
  } else if (mode === "framed_phone") {
    layers.push({
      input: phoneFrameSvg(left, top, fit.width, fit.height),
      left: 0,
      top: 0,
    });
  } else if (
    mode === "floating_card" ||
    mode === "card" ||
    mode === "background"
  ) {
    layers.unshift({
      input: cardShadowSvg(
        left - 8,
        top - 8,
        fit.width + 16,
        fit.height + 16,
      ),
      left: 0,
      top: 0,
    });
  }

  return composeOnCanvas(bg, layers);
}

export async function writeComposedAssetSceneFile(args: {
  assetBytes: Buffer;
  videoUsage?: string | null;
  outputPath: string;
}): Promise<void> {
  const out = await composeAssetSceneStill({
    assetBytes: args.assetBytes,
    videoUsage: args.videoUsage,
  });
  await sharp(out).png().toFile(args.outputPath);
}
