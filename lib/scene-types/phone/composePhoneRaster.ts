import sharp from "sharp";
import type { PhoneScenePayload } from "@/lib/scene-types/phone/phoneScenePayload";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";

const CANVAS_W = SHORT_PROFILE.width;
const CANVAS_H = SHORT_PROFILE.height;
const SUBTITLE_SAFE_BOTTOM = 420;

export interface PhoneLayoutMetadata {
  width: number;
  height: number;
  screenWidth: number;
  screenHeight: number;
  captionLines: number;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapCaption(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word.length > maxChars ? word.slice(0, maxChars) : word;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  return lines.slice(0, maxLines);
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

function phoneFrameSvg(
  screenX: number,
  screenY: number,
  screenW: number,
  screenH: number,
): Buffer {
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

function captionSvg(lines: string[], topY: number): Buffer {
  const fontSize = 44;
  const lineHeight = 1.35;
  const parts = lines.map(
    (line, i) =>
      `<text x="${CANVAS_W / 2}" y="${topY + i * fontSize * lineHeight}" text-anchor="middle" fill="#f8fafc" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${fontSize}" font-weight="600">${escapeXml(line)}</text>`,
  );
  const svg = `<svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
  return Buffer.from(svg);
}

export async function composePhoneRasterPng(args: {
  payload: PhoneScenePayload;
  screenPng: Buffer;
  backgroundTop?: string;
  backgroundBottom?: string;
}): Promise<{ png: Buffer; metadata: PhoneLayoutMetadata }> {
  const caption = args.payload.caption?.trim() ?? "";
  const captionLines = caption
    ? wrapCaption(caption, 28, 2)
    : [];

  const captionBlockHeight = captionLines.length * 44 * 1.35 + (captionLines.length ? 24 : 0);
  const maxScreenH = Math.round(
    CANVAS_H - SUBTITLE_SAFE_BOTTOM - captionBlockHeight - 280,
  );
  const maxScreenW = Math.round(CANVAS_W * 0.72);

  const meta = await sharp(args.screenPng).metadata();
  const assetW = meta.width ?? maxScreenW;
  const assetH = meta.height ?? maxScreenH;
  const fit = fitContain(assetW, assetH, maxScreenW, maxScreenH);

  const screenPng = await sharp(args.screenPng)
    .resize(fit.width, fit.height, { fit: "inside" })
    .png()
    .toBuffer();

  const left = Math.round((CANVAS_W - fit.width) / 2);
  const phoneBlockTop = 200;
  const top = phoneBlockTop + Math.round((maxScreenH - fit.height) / 2);

  const base = await neutralGradientBackground(
    args.backgroundTop,
    args.backgroundBottom,
  );
  const layers: sharp.OverlayOptions[] = [
    { input: screenPng, left, top },
    { input: phoneFrameSvg(left, top, fit.width, fit.height), left: 0, top: 0 },
  ];

  if (captionLines.length > 0) {
    const captionTop =
      top + fit.height + 80 + Math.round((phoneBlockTop + maxScreenH - top - fit.height) * 0.15);
    const safeCaptionTop = Math.min(
      captionTop,
      CANVAS_H - SUBTITLE_SAFE_BOTTOM - captionBlockHeight - 16,
    );
    layers.push({
      input: captionSvg(captionLines, safeCaptionTop),
      left: 0,
      top: 0,
    });
  }

  const png = await sharp(base).composite(layers).png().toBuffer();

  return {
    png,
    metadata: {
      width: CANVAS_W,
      height: CANVAS_H,
      screenWidth: fit.width,
      screenHeight: fit.height,
      captionLines: captionLines.length,
    },
  };
}
