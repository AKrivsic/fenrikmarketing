import sharp from "sharp";
import type { QuoteScenePayload } from "@/lib/scene-types/quote/quoteScenePayload";
import type { ChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";

export interface QuoteLayoutMetadata {
  width: number;
  height: number;
  quoteLines: number;
  quoteFontSize: number;
  attributionLines: number;
  logoPresent: boolean;
}

export interface ComposeQuoteRasterInput {
  payload: QuoteScenePayload;
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

function fontSizeForQuoteLength(charCount: number): number {
  if (charCount <= 60) return 64;
  if (charCount <= 120) return 56;
  if (charCount <= 180) return 48;
  return 42;
}

export function buildQuoteSvg(input: ComposeQuoteRasterInput): {
  svg: string;
  metadata: QuoteLayoutMetadata;
} {
  const { payload, tokens, logoPng } = input;
  const width = SHORT_PROFILE.width;
  const height = SHORT_PROFILE.height;
  const maxTextWidth = width - tokens.marginX * 2;
  const charsPerLine = Math.max(16, Math.floor(maxTextWidth / 28));

  const quoteFontSize = Math.round(
    fontSizeForQuoteLength(payload.quote.length) *
      (tokens.textScaleMultiplier ?? 1),
  );
  const attrFontSize = Math.round(36 * (tokens.textScaleMultiplier ?? 1));
  const maxQuoteLines = quoteFontSize >= 56 ? 5 : 6;
  const quoteLines = wrapLines(payload.quote, charsPerLine, maxQuoteLines);
  const attrLines = wrapLines(payload.attribution, charsPerLine + 8, 2);
  const contextLines = payload.context
    ? wrapLines(payload.context, charsPerLine + 8, 1)
    : [];

  const contentTop = tokens.marginTop + (logoPng ? tokens.logoMaxHeight + 48 : 0);
  const lineHeight = quoteFontSize * 1.22;
  const quoteBlockHeight = quoteLines.length * lineHeight + 48;
  const attrBlockHeight = attrLines.length * (attrFontSize * 1.25) + 16;
  const contextBlockHeight = contextLines.length * 32;
  const totalContent =
    quoteBlockHeight + attrBlockHeight + contextBlockHeight + 40;
  const maxBottom = tokens.contentBottomY;
  let startY = contentTop;
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

  parts.push(
    `<text x="${tokens.marginX}" y="${startY}" fill="${tokens.accentColor}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="72" font-weight="700">“</text>`,
  );

  let y = startY + quoteFontSize * 0.5;
  for (const line of quoteLines) {
    parts.push(
      `<text x="${tokens.marginX + 8}" y="${y}" fill="${tokens.foregroundColor}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="${quoteFontSize}" font-weight="600">${escapeXml(line)}</text>`,
    );
    y += lineHeight;
  }

  y += 24;
  for (const line of attrLines) {
    parts.push(
      `<text x="${tokens.marginX + 8}" y="${y}" fill="${tokens.foregroundColor}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${attrFontSize}" font-weight="500" opacity="0.92">${escapeXml(line)}</text>`,
    );
    y += attrFontSize * 1.25;
  }

  for (const line of contextLines) {
    parts.push(
      `<text x="${tokens.marginX + 8}" y="${y}" fill="${tokens.foregroundColor}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28" font-weight="400" opacity="0.75">${escapeXml(line)}</text>`,
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
      quoteLines: quoteLines.length,
      quoteFontSize,
      attributionLines: attrLines.length,
      logoPresent: Boolean(logoPng),
    },
  };
}

export async function composeQuoteRasterPng(
  input: ComposeQuoteRasterInput,
): Promise<{ png: Buffer; metadata: QuoteLayoutMetadata }> {
  const { svg, metadata } = buildQuoteSvg(input);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { png, metadata };
}
