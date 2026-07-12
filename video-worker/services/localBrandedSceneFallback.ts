import sharp from "sharp";
import {
  VIDEO_RASTER_HEIGHT,
  VIDEO_RASTER_WIDTH,
} from "@/lib/video-engine/videoRasterDimensions";
import type { ChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const n = Number.parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

/** Full-frame branded still with no generated text (moderation last resort). */
export async function writeLocalBrandedSceneFallbackPng(args: {
  outputPath: string;
  tokens: ChecklistBrandTokens;
}): Promise<void> {
  const w = VIDEO_RASTER_WIDTH;
  const h = VIDEO_RASTER_HEIGHT;
  const bg = args.tokens.backgroundColor;
  const accent = args.tokens.accentColor;
  const top = lighten(bg, 0.08);
  const bottom = lighten(bg, 0.22);

  const svg = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${top}"/>
      <stop offset="100%" stop-color="${bottom}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${Math.round(w * 0.5)}" cy="${Math.round(h * 0.42)}" r="${Math.round(
    w * 0.28,
  )}" fill="${accent}" opacity="0.12"/>
  <rect x="${args.tokens.marginX}" y="${args.tokens.marginTop}" width="${w - args.tokens.marginX * 2}" height="${Math.round(h * 0.35)}" rx="${args.tokens.cornerRadius ?? 24}" fill="${accent}" opacity="0.06"/>
</svg>`;

  await sharp(Buffer.from(svg))
    .resize(w, h)
    .png()
    .toFile(args.outputPath);
}
