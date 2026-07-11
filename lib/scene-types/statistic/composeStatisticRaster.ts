import sharp from "sharp";
import type { StatisticScenePayload } from "@/lib/scene-types/statistic/statisticScenePayload";
import type { ChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";

export interface StatisticLayoutMetadata {
  width: number;
  height: number;
  valueFontSize: number;
  labelLines: number;
  logoPresent: boolean;
}

export interface ComposeStatisticRasterInput {
  payload: StatisticScenePayload;
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

function fontSizeForValue(value: string, unit: string): number {
  const len = `${value}${unit}`.length;
  if (len <= 4) return 160;
  if (len <= 8) return 140;
  if (len <= 12) return 120;
  return 100;
}

export function buildStatisticSvg(input: ComposeStatisticRasterInput): {
  svg: string;
  metadata: StatisticLayoutMetadata;
} {
  const { payload, tokens, logoPng } = input;
  const width = SHORT_PROFILE.width;
  const height = SHORT_PROFILE.height;
  const maxTextWidth = width - tokens.marginX * 2;
  const charsPerLine = Math.max(14, Math.floor(maxTextWidth / 22));

  const unit = (payload.unit ?? "").trim();
  const scale = tokens.textScaleMultiplier ?? 1;
  const valueFontSize = Math.round(fontSizeForValue(payload.value, unit) * scale);
  const unitFontSize = Math.round(valueFontSize * 0.45);
  const labelFontSize = Math.round(44 * scale);
  const labelLines = wrapLines(payload.label, charsPerLine, 4);
  const sourceLines = payload.source_line
    ? wrapLines(payload.source_line, charsPerLine + 4, 1)
    : [];

  const displayValue = payload.value.includes("%")
    ? payload.value.replace(/%/g, "").trim()
    : payload.value.trim();
  const displayUnit =
    payload.value.includes("%") && !unit ? "%" : unit;

  const contentTop = tokens.marginTop + (logoPng ? tokens.logoMaxHeight + 56 : 0);
  const valueBlockHeight = valueFontSize * 1.1;
  const labelBlockHeight = labelLines.length * (labelFontSize * 1.2) + 24;
  const sourceBlockHeight = sourceLines.length * 32;
  const totalContent = valueBlockHeight + labelBlockHeight + sourceBlockHeight + 48;
  const maxBottom = tokens.contentBottomY;
  let startY = Math.max(contentTop, (maxBottom - totalContent) / 2);
  if (startY + totalContent > maxBottom) {
    startY = Math.max(tokens.marginTop, maxBottom - totalContent);
  }

  const parts: string[] = [
    `<rect width="${width}" height="${height}" fill="${tokens.backgroundColor}"/>`,
  ];

  if (logoPng) {
    parts.push(
      `<image href="data:image/png;base64,${logoPng.toString("base64")}" x="${tokens.marginX}" y="${tokens.marginTop}" width="${tokens.logoMaxWidth}" height="${tokens.logoMaxHeight}" preserveAspectRatio="xMinYMin meet"/>`,
    );
  }

  const valueY = startY + valueFontSize * 0.85;
  parts.push(
    `<text x="${tokens.marginX}" y="${valueY}" fill="${tokens.accentColor}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="${valueFontSize}" font-weight="800">${escapeXml(displayValue)}</text>`,
  );

  if (displayUnit) {
    const unitX =
      tokens.marginX +
      displayValue.length * (valueFontSize * 0.52) +
      8;
    parts.push(
      `<text x="${unitX}" y="${valueY - valueFontSize * 0.15}" fill="${tokens.foregroundColor}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${unitFontSize}" font-weight="600" opacity="0.95">${escapeXml(displayUnit)}</text>`,
    );
  }

  let y = valueY + 56;
  for (const line of labelLines) {
    parts.push(
      `<text x="${tokens.marginX}" y="${y}" fill="${tokens.foregroundColor}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${labelFontSize}" font-weight="500">${escapeXml(line)}</text>`,
    );
    y += labelFontSize * 1.2;
  }

  for (const line of sourceLines) {
    parts.push(
      `<text x="${tokens.marginX}" y="${y}" fill="${tokens.foregroundColor}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28" font-weight="400" opacity="0.72">${escapeXml(line)}</text>`,
    );
    y += 32;
  }

  parts.push(
    `<rect x="0" y="${height - tokens.subtitleSafeBottomPx}" width="${width}" height="${tokens.subtitleSafeBottomPx}" fill="${tokens.backgroundColor}" opacity="0"/>`,
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;

  return {
    svg,
    metadata: {
      width,
      height,
      valueFontSize,
      labelLines: labelLines.length,
      logoPresent: Boolean(logoPng),
    },
  };
}

export async function composeStatisticRasterPng(
  input: ComposeStatisticRasterInput,
): Promise<{ png: Buffer; metadata: StatisticLayoutMetadata }> {
  const { svg, metadata } = buildStatisticSvg(input);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { png, metadata };
}
