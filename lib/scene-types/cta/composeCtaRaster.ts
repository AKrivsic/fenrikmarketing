import sharp from "sharp";
import type { CtaScenePayload } from "@/lib/scene-types/cta/ctaScenePayload";
import type { ChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";

export interface CtaLayoutMetadata {
  width: number;
  height: number;
  headlineLines: number;
  headlineFontSize: number;
  logoPresent: boolean;
}

export interface ComposeCtaRasterInput {
  payload: CtaScenePayload;
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

function headlineFontSize(charCount: number): number {
  if (charCount <= 18) return 72;
  if (charCount <= 36) return 64;
  if (charCount <= 56) return 56;
  return 48;
}

export function buildCtaSvg(input: ComposeCtaRasterInput): {
  svg: string;
  metadata: CtaLayoutMetadata;
} {
  const { payload, tokens, logoPng } = input;
  const showLogo = payload.show_logo !== false;
  const width = SHORT_PROFILE.width;
  const height = SHORT_PROFILE.height;
  const maxTextWidth = width - tokens.marginX * 2;
  const charsPerLine = Math.max(12, Math.floor(maxTextWidth / 26));

  const hFont = Math.round(
    headlineFontSize(payload.headline.length) * (tokens.textScaleMultiplier ?? 1),
  );
  const headlineLines = wrapLines(payload.headline, charsPerLine, 3);
  const sublineLines = payload.subline
    ? wrapLines(payload.subline, charsPerLine + 4, 2)
    : [];
  const buttonLabel = (payload.button_label ?? payload.headline).trim();
  const buttonLines = wrapLines(buttonLabel, charsPerLine, 1);

  const logoBlock = showLogo && logoPng ? tokens.logoMaxHeight + 56 : 0;
  const contentTop = tokens.marginTop + logoBlock;
  const lineH = hFont * 1.18;
  const subH = sublineLines.length * 40;
  const buttonH = 88;
  const total =
    headlineLines.length * lineH + subH + buttonH + (sublineLines.length ? 32 : 16) + 48;
  const maxBottom = tokens.contentBottomY;
  let startY = Math.max(contentTop, (maxBottom - total) / 2);
  if (startY + total > maxBottom) {
    startY = Math.max(tokens.marginTop, maxBottom - total);
  }

  const parts: string[] = [
    `<rect width="${width}" height="${height}" fill="${tokens.backgroundColor}"/>`,
  ];

  if (showLogo && logoPng) {
    parts.push(
      `<image href="data:image/png;base64,${logoPng.toString("base64")}" x="${tokens.marginX}" y="${tokens.marginTop}" width="${tokens.logoMaxWidth}" height="${tokens.logoMaxHeight}" preserveAspectRatio="xMinYMin meet"/>`,
    );
  }

  let y = startY + hFont * 0.85;
  for (const line of headlineLines) {
    parts.push(
      `<text x="${tokens.marginX}" y="${y}" fill="${tokens.foregroundColor}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="${hFont}" font-weight="700">${escapeXml(line)}</text>`,
    );
    y += lineH;
  }

  y += 16;
  for (const line of sublineLines) {
    parts.push(
      `<text x="${tokens.marginX}" y="${y}" fill="${tokens.foregroundColor}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="36" font-weight="400" opacity="0.88">${escapeXml(line)}</text>`,
    );
    y += 40;
  }

  y += 24;
  const buttonW = Math.min(maxTextWidth, Math.max(320, buttonLabel.length * 22 + 80));
  const corner = tokens.cornerRadius ?? 16;
  const accentOpacity = tokens.accentOpacity ?? 0.95;
  const buttonX = tokens.marginX;
  const buttonY = y;
  parts.push(
    `<rect x="${buttonX}" y="${buttonY}" width="${buttonW}" height="${buttonH - 16}" rx="${corner}" ry="${corner}" fill="${tokens.accentColor}" opacity="${accentOpacity}"/>`,
  );
  const btnText = buttonLines[0] ?? buttonLabel;
  parts.push(
    `<text x="${buttonX + buttonW / 2}" y="${buttonY + (buttonH - 16) / 2 + 12}" fill="${tokens.backgroundColor}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="32" font-weight="600" text-anchor="middle">${escapeXml(btnText)}</text>`,
  );

  parts.push(
    `<rect x="0" y="${height - tokens.subtitleSafeBottomPx}" width="${width}" height="${tokens.subtitleSafeBottomPx}" fill="${tokens.backgroundColor}" opacity="0"/>`,
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;

  return {
    svg,
    metadata: {
      width,
      height,
      headlineLines: headlineLines.length,
      headlineFontSize: hFont,
      logoPresent: Boolean(showLogo && logoPng),
    },
  };
}

export async function composeCtaRasterPng(
  input: ComposeCtaRasterInput,
): Promise<{ png: Buffer; metadata: CtaLayoutMetadata }> {
  const { svg, metadata } = buildCtaSvg(input);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { png, metadata };
}
