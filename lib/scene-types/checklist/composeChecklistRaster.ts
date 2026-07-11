import sharp from "sharp";
import type { ChecklistScenePayload } from "@/lib/scene-types/checklist/checklistScenePayload";
import type { ChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";

export interface ChecklistLayoutMetadata {
  width: number;
  height: number;
  titleLines: number;
  itemLineCounts: number[];
  titleFontSize: number;
  itemFontSize: number;
  logoPresent: boolean;
}

export interface ComposeChecklistRasterInput {
  payload: ChecklistScenePayload;
  tokens: ChecklistBrandTokens;
  logoPng?: Buffer | null;
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

function fontSizesForItemCount(count: number): {
  title: number;
  item: number;
  lineHeight: number;
} {
  if (count <= 2) return { title: 56, item: 48, lineHeight: 1.35 };
  if (count === 3) return { title: 52, item: 44, lineHeight: 1.32 };
  if (count === 4) return { title: 48, item: 40, lineHeight: 1.3 };
  return { title: 44, item: 36, lineHeight: 1.28 };
}

function markerGlyph(marker: ChecklistScenePayload["item_marker"]): string {
  return marker === "dot" ? "•" : "✓";
}

export function buildChecklistSvg(input: ComposeChecklistRasterInput): {
  svg: string;
  metadata: ChecklistLayoutMetadata;
} {
  const { payload, tokens, logoPng } = input;
  const width = SHORT_PROFILE.width;
  const height = SHORT_PROFILE.height;
  const fonts = fontSizesForItemCount(payload.items.length);
  const textScale = tokens.textScaleMultiplier ?? 1;
  const titleSize = Math.round(fonts.title * textScale);
  const itemSize = Math.round(fonts.item * textScale);
  const maxTextWidth = width - tokens.marginX * 2;
  const charsPerLine = Math.max(18, Math.floor(maxTextWidth / (itemSize * 0.52)));

  const titleLines = payload.title
    ? wrapLines(payload.title, charsPerLine + 4, 3)
    : [];

  const itemBlocks: { lines: string[] }[] = [];
  for (const item of payload.items) {
    itemBlocks.push({ lines: wrapLines(item, charsPerLine, 4) });
  }

  const titleBlockHeight = titleLines.length * titleSize * fonts.lineHeight;
  const itemBlockHeight = itemBlocks.reduce(
    (sum, block) => sum + block.lines.length * itemSize * fonts.lineHeight + 28,
    0,
  );
  const logoHeight = logoPng ? tokens.logoMaxHeight + 32 : 0;
  const totalContent =
    logoHeight + (titleLines.length ? titleBlockHeight + 40 : 0) + itemBlockHeight;
  const available = tokens.contentBottomY - tokens.marginTop;
  if (totalContent > available) {
    throw new Error(
      `checklist layout overflow: content ${Math.round(totalContent)}px exceeds ${available}px`,
    );
  }

  let y = tokens.marginTop + (logoPng ? tokens.logoMaxHeight + 32 : 0);
  const parts: string[] = [];

  parts.push(
    `<rect width="${width}" height="${height}" fill="${tokens.backgroundColor}"/>`,
  );

  if (logoPng) {
    parts.push(
      `<image href="data:image/png;base64,${logoPng.toString("base64")}" x="${(width - tokens.logoMaxWidth) / 2}" y="${tokens.marginTop}" width="${tokens.logoMaxWidth}" height="${tokens.logoMaxHeight}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  const accentOpacity = tokens.accentOpacity ?? 0.95;
  const markerSize = Math.round(itemSize * (tokens.markerScale ?? 1));

  if (titleLines.length > 0) {
    for (const line of titleLines) {
      parts.push(
        `<text x="${tokens.marginX}" y="${y}" fill="${tokens.foregroundColor}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="${titleSize}" font-weight="600">${escapeXml(line)}</text>`,
      );
      y += titleSize * fonts.lineHeight;
    }
    y += 40;
  } else if (!logoPng) {
    y += 16;
  }

  const marker = markerGlyph(payload.item_marker);
  for (const block of itemBlocks) {
    for (let li = 0; li < block.lines.length; li++) {
      const line = block.lines[li]!;
      const markerX = tokens.marginX;
      const textX = tokens.marginX + (li === 0 ? 44 : 44);
      if (li === 0) {
        parts.push(
          `<text x="${markerX}" y="${y}" fill="${tokens.accentColor}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${markerSize}" font-weight="700" opacity="${accentOpacity}">${marker}</text>`,
        );
      }
      parts.push(
        `<text x="${textX}" y="${y}" fill="${tokens.foregroundColor}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="${itemSize}" font-weight="500">${escapeXml(line)}</text>`,
      );
      y += itemSize * fonts.lineHeight;
    }
    y += 28;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;

  return {
    svg,
    metadata: {
      width,
      height,
      titleLines: titleLines.length,
      itemLineCounts: itemBlocks.map((b) => b.lines.length),
      titleFontSize: titleSize,
      itemFontSize: itemSize,
      logoPresent: Boolean(logoPng),
    },
  };
}

export async function composeChecklistRasterPng(
  input: ComposeChecklistRasterInput,
): Promise<{ png: Buffer; metadata: ChecklistLayoutMetadata }> {
  const { svg, metadata } = buildChecklistSvg(input);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { png, metadata };
}
