/**
 * Deterministic Fenrik product-demo chat still (Sprint 4C.1).
 * Controlled UI — not AI lifestyle art. Readable chat is intentional here.
 */

import sharp from "sharp";
import type { ProductDemoBeat } from "@/lib/scene-types/product-demo/productDemoBeat";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";

export interface ProductDemoLayoutMetadata {
  width: number;
  height: number;
  questionVisible: true;
  aiAnswerVisible: true;
  outcomeVisible: true;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
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

function bubbleBlock(
  lines: string[],
  x: number,
  y: number,
  maxW: number,
  fill: string,
  textFill: string,
  alignRight: boolean,
): { svg: string; height: number } {
  const padX = 22;
  const padY = 18;
  const lineH = 34;
  const textW = maxW - padX * 2;
  const h = padY * 2 + lines.length * lineH;
  const bx = alignRight ? x - maxW : x;
  const textAnchor = alignRight ? "end" : "start";
  const tx = alignRight ? bx + maxW - padX : bx + padX;
  const lineNodes = lines
    .map((line, i) => {
      const ly = y + padY + 26 + i * lineH;
      return `<text x="${tx}" y="${ly}" font-family="Inter, system-ui, sans-serif" font-size="26" fill="${textFill}" text-anchor="${textAnchor}">${escapeXml(line)}</text>`;
    })
    .join("");
  return {
    height: h,
    svg: `<rect x="${bx}" y="${y}" width="${maxW}" height="${h}" rx="22" fill="${fill}"/>${lineNodes}`,
  };
}

export function buildProductDemoChatSvg(beat: ProductDemoBeat): {
  svg: string;
  metadata: ProductDemoLayoutMetadata;
} {
  const width = SHORT_PROFILE.width;
  const height = SHORT_PROFILE.height;
  const phoneW = 780;
  const phoneH = 1480;
  const phoneX = Math.round((width - phoneW) / 2);
  const phoneY = 180;
  const screenX = phoneX + 36;
  const screenY = phoneY + 80;
  const screenW = phoneW - 72;
  const screenH = phoneH - 160;

  const qLines = wrapLines(beat.visitor_question, 28, 4);
  const aLines = wrapLines(beat.ai_answer, 28, 5);
  const oLines = wrapLines(beat.outcome_label, 26, 2);

  let y = screenY + 120;
  const leftX = screenX + 28;
  const rightEdge = screenX + screenW - 28;
  const bubbleMax = Math.round(screenW * 0.78);

  const q = bubbleBlock(qLines, leftX, y, bubbleMax, "#e2e8f0", "#0f172a", false);
  y += q.height + 28;
  const a = bubbleBlock(
    aLines,
    rightEdge,
    y,
    bubbleMax,
    "#2563eb",
    "#ffffff",
    true,
  );
  y += a.height + 36;
  const outcomeW = Math.min(bubbleMax + 40, screenW - 56);
  const ox = screenX + Math.round((screenW - outcomeW) / 2);
  const o = bubbleBlock(oLines, ox, y, outcomeW, "#dcfce7", "#166534", false);

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="${phoneX}" y="${phoneY}" width="${phoneW}" height="${phoneH}" rx="64" fill="#020617" stroke="#334155" stroke-width="4"/>
  <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="36" fill="#f8fafc"/>
  <rect x="${screenX}" y="${screenY}" width="${screenW}" height="88" fill="#0f172a"/>
  <text x="${screenX + screenW / 2}" y="${screenY + 56}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="600" fill="#f8fafc">${escapeXml(beat.brand_name)}</text>
  ${q.svg}
  ${a.svg}
  ${o.svg}
  <text x="${width / 2}" y="${phoneY + phoneH + 70}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="28" fill="#94a3b8">Product demonstration</text>
</svg>`;

  return {
    svg,
    metadata: {
      width,
      height,
      questionVisible: true,
      aiAnswerVisible: true,
      outcomeVisible: true,
    },
  };
}

export async function composeProductDemoRaster(
  beat: ProductDemoBeat,
): Promise<{ png: Buffer; metadata: ProductDemoLayoutMetadata }> {
  const { svg, metadata } = buildProductDemoChatSvg(beat);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { png, metadata };
}
