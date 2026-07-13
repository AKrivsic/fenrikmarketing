import sharp from "sharp";
import type { CtaScenePayload } from "@/lib/scene-types/cta/ctaScenePayload";
import type { ChecklistBrandTokens } from "@/lib/scene-types/checklist/brandTokens";
import {
  defaultShowButtonForComposition,
  type CtaCompositionId,
} from "@/lib/scene-types/cta/ctaComposition";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";

export interface CtaLayoutMetadata {
  width: number;
  height: number;
  headlineLines: number;
  headlineFontSize: number;
  logoPresent: boolean;
  composition: CtaCompositionId;
}

export interface ComposeCtaRasterInput {
  payload: CtaScenePayload;
  tokens: ChecklistBrandTokens;
  logoPng?: Buffer | null;
  heroPng?: Buffer | null;
  composition?: CtaCompositionId;
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

function subtitleSafeFooter(
  parts: string[],
  width: number,
  height: number,
  tokens: ChecklistBrandTokens,
): void {
  parts.push(
    `<rect x="0" y="${height - tokens.subtitleSafeBottomPx}" width="${width}" height="${tokens.subtitleSafeBottomPx}" fill="${tokens.backgroundColor}" opacity="0"/>`,
  );
}

function drawTextBlock(args: {
  parts: string[];
  x: number;
  y: number;
  lines: string[];
  fontSize: number;
  weight: number;
  fill: string;
  opacity?: number;
  lineHeight?: number;
}): number {
  const lh = args.lineHeight ?? args.fontSize * 1.18;
  let y = args.y + args.fontSize * 0.85;
  for (const line of args.lines) {
    args.parts.push(
      `<text x="${args.x}" y="${y}" fill="${args.fill}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="${args.fontSize}" font-weight="${args.weight}"${args.opacity !== undefined ? ` opacity="${args.opacity}"` : ""}>${escapeXml(line)}</text>`,
    );
    y += lh;
  }
  return y;
}

function drawButton(args: {
  parts: string[];
  tokens: ChecklistBrandTokens;
  x: number;
  y: number;
  maxWidth: number;
  label: string;
}): void {
  const buttonH = 72;
  const buttonW = Math.min(args.maxWidth, Math.max(280, args.label.length * 20 + 72));
  const corner = args.tokens.cornerRadius ?? 16;
  const accentOpacity = args.tokens.accentOpacity ?? 0.95;
  args.parts.push(
    `<rect x="${args.x}" y="${args.y}" width="${buttonW}" height="${buttonH}" rx="${corner}" ry="${corner}" fill="${args.tokens.accentColor}" opacity="${accentOpacity}"/>`,
  );
  args.parts.push(
    `<text x="${args.x + buttonW / 2}" y="${args.y + buttonH / 2 + 10}" fill="${args.tokens.backgroundColor}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="30" font-weight="600" text-anchor="middle">${escapeXml(args.label)}</text>`,
  );
}

export function buildCtaSvg(input: ComposeCtaRasterInput): {
  svg: string;
  metadata: CtaLayoutMetadata;
} {
  const composition: CtaCompositionId =
    input.composition ?? input.payload.composition ?? "classic_card";
  const { payload, tokens, logoPng, heroPng } = input;
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
  const showLogo = payload.show_logo !== false && Boolean(logoPng);
  const showButton = defaultShowButtonForComposition(composition, payload);
  const buttonLabel = (payload.button_label ?? "").trim();

  const parts: string[] = [
    `<rect width="${width}" height="${height}" fill="${tokens.backgroundColor}"/>`,
  ];

  if (
    (composition === "product_screenshot_overlay" ||
      composition === "asset_overlay" ||
      composition === "split_asset_text") &&
    heroPng
  ) {
    const heroH =
      composition === "split_asset_text" ? Math.floor(height * 0.48) : height;
    const heroW = width - tokens.marginX * 2;
    const heroX = tokens.marginX;
    const heroY =
      composition === "split_asset_text" ? tokens.marginTop : tokens.marginTop;
    parts.push(
      `<image href="data:image/png;base64,${heroPng.toString("base64")}" x="${heroX}" y="${heroY}" width="${heroW}" height="${heroH}" preserveAspectRatio="xMidYMid meet" opacity="${composition === "asset_overlay" ? "0.35" : "1"}"/>`,
    );
    if (composition === "asset_overlay") {
      parts.push(
        `<rect x="0" y="0" width="${width}" height="${height}" fill="${tokens.backgroundColor}" opacity="0.55"/>`,
      );
    }
  }

  let textX = tokens.marginX;
  let startY = tokens.marginTop + (showLogo ? tokens.logoMaxHeight + 40 : 0);

  if (composition === "split_asset_text" && heroPng) {
    startY = Math.floor(height * 0.5);
  } else if (composition === "minimal_statement" || composition === "text_only") {
    startY = Math.floor((tokens.contentBottomY - tokens.marginTop) / 2);
  }

  if (showLogo && logoPng && composition !== "product_screenshot_overlay") {
    parts.push(
      `<image href="data:image/png;base64,${logoPng.toString("base64")}" x="${tokens.marginX}" y="${tokens.marginTop}" width="${tokens.logoMaxWidth}" height="${tokens.logoMaxHeight}" preserveAspectRatio="xMinYMin meet"/>`,
    );
  }

  let y = drawTextBlock({
    parts,
    x: textX,
    y: startY,
    lines: headlineLines,
    fontSize: hFont,
    weight: 700,
    fill: tokens.foregroundColor,
  });

  if (sublineLines.length > 0) {
    y = drawTextBlock({
      parts,
      x: textX,
      y: y + 8,
      lines: sublineLines,
      fontSize: 36,
      weight: 400,
      fill: tokens.foregroundColor,
      opacity: 0.88,
      lineHeight: 40,
    });
  }

  if (composition === "headline_action_line" && buttonLabel) {
    drawTextBlock({
      parts,
      x: textX,
      y: y + 12,
      lines: [buttonLabel],
      fontSize: 32,
      weight: 600,
      fill: tokens.accentColor,
      lineHeight: 38,
    });
  } else if (showButton && buttonLabel) {
    drawButton({
      parts,
      tokens,
      x: textX,
      y: y + 24,
      maxWidth: maxTextWidth,
      label: buttonLabel,
    });
  }

  subtitleSafeFooter(parts, width, height, tokens);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;

  return {
    svg,
    metadata: {
      width,
      height,
      headlineLines: headlineLines.length,
      headlineFontSize: hFont,
      logoPresent: showLogo,
      composition,
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
