import sharp from "sharp";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import {
  fitContainInBox,
  layoutBoxForTemplate,
  videoUsageImpliesPresentationTemplate,
  type PresentationTemplate,
} from "@/lib/assets/presentationTemplate";
import { readDeviceFrameMetadata } from "@/lib/assets/deviceFrameMetadata";

export type AssetLayoutMode =
  | "fullscreen"
  | "ui_hero"
  | "framed_screen"
  | "framed_phone"
  | "floating_card"
  | "background"
  | "card";

const CANVAS_W = SHORT_PROFILE.width;
const CANVAS_H = SHORT_PROFILE.height;

export function videoUsageToLayoutMode(videoUsage?: string | null): AssetLayoutMode {
  const raw = videoUsage?.trim() ?? "";
  if (!raw) return "floating_card";
  if (raw === "fullscreen") return "fullscreen";
  if (raw === "ui_hero") return "ui_hero";
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

export function normalizeAssetLayoutMode(
  videoUsage?: string | null,
): AssetLayoutMode {
  return videoUsageToLayoutMode(videoUsage);
}

export function shouldComposeAssetLayout(videoUsage?: string | null): boolean {
  const raw = videoUsage?.trim() ?? "";
  if (!raw) return false;
  return normalizeAssetLayoutMode(videoUsage) !== "fullscreen";
}

async function neutralGradientBackground(
  top = "#1e293b",
  bottom = "#0f172a",
): Promise<Buffer> {
  const svg = `<svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${top}"/>
        <stop offset="100%" stop-color="${bottom}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function browserChromeSvg(
  screenX: number,
  screenY: number,
  screenW: number,
  screenH: number,
): Buffer {
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

function phoneFrameSvg(
  screenX: number,
  screenY: number,
  screenW: number,
  screenH: number,
): Buffer {
  const pad = 10;
  const outerX = screenX - pad;
  const outerY = screenY - pad - 8;
  const outerW = screenW + pad * 2;
  const outerH = screenH + pad * 2 + 16;
  const svg = `<svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${outerX}" y="${outerY}" width="${outerW}" height="${outerH}" rx="36" ry="36" fill="none" stroke="#334155" stroke-width="10"/>
    <rect x="${outerX + outerW / 2 - 32}" y="${outerY + 14}" width="64" height="4" rx="2" fill="#475569"/>
  </svg>`;
  return Buffer.from(svg);
}

function cardShadowSvg(
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
): Buffer {
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

function clampOverlayPosition(
  left: number,
  top: number,
  width: number,
  height: number,
): { left: number; top: number } {
  const maxLeft = Math.max(0, CANVAS_W - width);
  const maxTop = Math.max(0, CANVAS_H - height);
  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

async function resizedAsset(
  asset: Buffer,
  w: number,
  h: number,
): Promise<Buffer> {
  return sharp(asset)
    .resize(w, h, { fit: "inside", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
}

async function composeOnCanvas(
  base: Buffer,
  layers: sharp.OverlayOptions[],
): Promise<Buffer> {
  return sharp(base).composite(layers).png().toBuffer();
}

function templateForMode(mode: AssetLayoutMode): PresentationTemplate {
  switch (mode) {
    case "ui_hero":
      return "UI_HERO";
    case "framed_phone":
      return "DEVICE_MOCKUP";
    case "framed_screen":
      return "DESKTOP_FRAME";
    case "floating_card":
    case "card":
      return "FLOATING_PROOF";
    default:
      return "UI_HERO";
  }
}

export interface ComposeAssetSceneInput {
  assetBytes: Buffer;
  videoUsage?: string | null;
  assetMetadata?: unknown;
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

  const template = templateForMode(mode);
  const box = layoutBoxForTemplate(template);
  const fit = fitContainInBox(
    assetW,
    assetH,
    box.maxW,
    box.maxH,
    box.allowUpscale,
  );

  const frameMeta = readDeviceFrameMetadata(input.assetMetadata ?? {});
  const skipPhoneChrome =
    frameMeta.contains_phone_frame || frameMeta.contains_device_frame;
  const skipBrowserChrome =
    frameMeta.contains_browser_frame || frameMeta.contains_laptop_frame;

  const bg = await neutralGradientBackground();

  const assetPng = await resizedAsset(input.assetBytes, fit.width, fit.height);
  const centeredLeft = Math.round((CANVAS_W - fit.width) / 2);
  const centeredTop = Math.round(
    (CANVAS_H - fit.height) / 2 + box.offsetY,
  );
  const { left, top } = clampOverlayPosition(
    centeredLeft,
    centeredTop,
    fit.width,
    fit.height,
  );

  const layers: sharp.OverlayOptions[] = [{ input: assetPng, left, top }];

  if (mode === "framed_screen" && !skipBrowserChrome) {
    layers.push({
      input: browserChromeSvg(left, top, fit.width, fit.height),
      left: 0,
      top: 0,
    });
  } else if (mode === "framed_phone" && !skipPhoneChrome) {
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
    if (!frameMeta.contains_card_frame) {
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
  }

  return composeOnCanvas(bg, layers);
}

export function estimateComposedUiHeightRatio(args: {
  assetWidth: number;
  assetHeight: number;
  videoUsage?: string | null;
}): number {
  const mode = normalizeAssetLayoutMode(args.videoUsage);
  const template =
    videoUsageImpliesPresentationTemplate(args.videoUsage ?? "") ??
    templateForMode(mode);
  const box = layoutBoxForTemplate(template);
  const fit = fitContainInBox(
    args.assetWidth,
    args.assetHeight,
    box.maxW,
    box.maxH,
    box.allowUpscale,
  );
  return fit.height / CANVAS_H;
}

export async function writeComposedAssetSceneFile(args: {
  assetBytes: Buffer;
  videoUsage?: string | null;
  assetMetadata?: unknown;
  outputPath: string;
}): Promise<void> {
  const out = await composeAssetSceneStill({
    assetBytes: args.assetBytes,
    videoUsage: args.videoUsage,
    assetMetadata: args.assetMetadata,
  });
  await sharp(out).png().toFile(args.outputPath);
}
