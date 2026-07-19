/**
 * Deterministic Fenrik product-demo chat stills (Sprint 4C.1 + 5.1 variants).
 * Controlled UI — not AI lifestyle art. Readable chat is intentional here.
 * Semantic contract: question → AI answer → outcome (always visible).
 */

import sharp from "sharp";
import type { ProductDemoBeat } from "@/lib/scene-types/product-demo/productDemoBeat";
import {
  SAFE_PRODUCT_DEMO_VARIANT,
  isProductDemoVariant,
  type ProductDemoVariant,
} from "@/lib/scene-types/product-demo/demoVariant";
import { SHORT_PROFILE } from "@/lib/video-engine/storyboard";

export interface ProductDemoLayoutMetadata {
  width: number;
  height: number;
  questionVisible: true;
  aiAnswerVisible: true;
  outcomeVisible: true;
  demoVariant: ProductDemoVariant;
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
  fontSize = 26,
): { svg: string; height: number } {
  const padX = 22;
  const padY = 18;
  const lineH = fontSize + 8;
  const h = padY * 2 + Math.max(1, lines.length) * lineH;
  const bx = alignRight ? x - maxW : x;
  const textAnchor = alignRight ? "end" : "start";
  const tx = alignRight ? bx + maxW - padX : bx + padX;
  const lineNodes = lines
    .map((line, i) => {
      const ly = y + padY + fontSize + i * lineH;
      return `<text x="${tx}" y="${ly}" font-family="Inter, system-ui, sans-serif" font-size="${fontSize}" fill="${textFill}" text-anchor="${textAnchor}">${escapeXml(line)}</text>`;
    })
    .join("");
  return {
    height: h,
    svg: `<rect x="${bx}" y="${y}" width="${maxW}" height="${h}" rx="22" fill="${fill}"/>${lineNodes}`,
  };
}

function effectiveVariant(beat: ProductDemoBeat): ProductDemoVariant {
  return isProductDemoVariant(beat.demo_variant)
    ? beat.demo_variant
    : SAFE_PRODUCT_DEMO_VARIANT;
}

/** Classic mobile chat close-up — focused Q → A → resolved badge. */
function layoutConversationAnswer(beat: ProductDemoBeat): string {
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

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
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
  <text x="${width / 2}" y="${phoneY + phoneH + 70}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="28" fill="#94a3b8">Conversation resolved</text>
</svg>`;
}

/** Chat thread + prominent lead-captured confirmation panel. */
function layoutLeadCapture(beat: ProductDemoBeat): string {
  const width = SHORT_PROFILE.width;
  const height = SHORT_PROFILE.height;
  const panelX = 70;
  const panelY = 160;
  const panelW = width - 140;
  const panelH = 1560;

  const qLines = wrapLines(beat.visitor_question, 34, 3);
  const aLines = wrapLines(beat.ai_answer, 34, 4);
  const oLines = wrapLines(beat.outcome_label, 28, 2);

  let y = panelY + 130;
  const leftX = panelX + 40;
  const rightEdge = panelX + panelW - 40;
  const bubbleMax = Math.round(panelW * 0.72);

  const q = bubbleBlock(qLines, leftX, y, bubbleMax, "#e2e8f0", "#0f172a", false, 24);
  y += q.height + 24;
  const a = bubbleBlock(
    aLines,
    rightEdge,
    y,
    bubbleMax,
    "#1d4ed8",
    "#ffffff",
    true,
    24,
  );
  y += a.height + 48;

  const cardY = Math.max(y, panelY + panelH - 420);
  const cardH = 280;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f1f5f9"/>
  <rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="28" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
  <rect x="${panelX}" y="${panelY}" width="${panelW}" height="96" fill="#0f172a"/>
  <text x="${panelX + 48}" y="${panelY + 62}" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="600" fill="#f8fafc">${escapeXml(beat.brand_name)} · Website chat</text>
  ${q.svg}
  ${a.svg}
  <rect x="${panelX + 36}" y="${cardY}" width="${panelW - 72}" height="${cardH}" rx="24" fill="#052e16" stroke="#22c55e" stroke-width="3"/>
  <circle cx="${panelX + 100}" cy="${cardY + 90}" r="36" fill="#22c55e"/>
  <text x="${panelX + 100}" y="${cardY + 100}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="36" font-weight="700" fill="#052e16">✓</text>
  <text x="${panelX + 160}" y="${cardY + 78}" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="700" fill="#bbf7d0">New lead captured</text>
  ${oLines
    .map(
      (line, i) =>
        `<text x="${panelX + 160}" y="${cardY + 124 + i * 36}" font-family="Inter, system-ui, sans-serif" font-size="26" fill="#ecfdf5">${escapeXml(line)}</text>`,
    )
    .join("")}
  <text x="${panelX + 160}" y="${cardY + 220}" font-family="Inter, system-ui, sans-serif" font-size="22" fill="#86efac">Contact details saved automatically</text>
  <text x="${width / 2}" y="${panelY + panelH + 60}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="26" fill="#64748b">Lead capture demonstration</text>
</svg>`;
}

/** Availability Q → answer → appointment confirmed card (desktop-widget feel). */
function layoutBookingConfirmation(beat: ProductDemoBeat): string {
  const width = SHORT_PROFILE.width;
  const height = SHORT_PROFILE.height;
  const widgetW = 920;
  const widgetH = 1180;
  const widgetX = Math.round((width - widgetW) / 2);
  const widgetY = 280;

  const qLines = wrapLines(beat.visitor_question, 36, 3);
  const aLines = wrapLines(beat.ai_answer, 36, 4);
  const oLines = wrapLines(beat.outcome_label, 30, 2);

  let y = widgetY + 140;
  const leftX = widgetX + 48;
  const bubbleMax = widgetW - 120;

  const q = bubbleBlock(qLines, leftX, y, bubbleMax, "#f1f5f9", "#0f172a", false, 24);
  y += q.height + 22;
  const a = bubbleBlock(
    aLines,
    leftX,
    y,
    bubbleMax,
    "#eff6ff",
    "#1e3a8a",
    false,
    24,
  );
  y += a.height + 40;

  const confirmY = Math.min(y, widgetY + widgetH - 340);

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="desk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#desk)"/>
  <rect x="${widgetX}" y="${widgetY}" width="${widgetW}" height="${widgetH}" rx="20" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
  <rect x="${widgetX}" y="${widgetY}" width="${widgetW}" height="88" fill="#1e40af"/>
  <text x="${widgetX + 48}" y="${widgetY + 56}" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="600" fill="#eff6ff">${escapeXml(beat.brand_name)} booking assistant</text>
  ${q.svg}
  ${a.svg}
  <rect x="${widgetX + 48}" y="${confirmY}" width="${widgetW - 96}" height="260" rx="18" fill="#ecfdf5" stroke="#16a34a" stroke-width="3"/>
  <rect x="${widgetX + 72}" y="${confirmY + 40}" width="72" height="72" rx="12" fill="#16a34a"/>
  <text x="${widgetX + 108}" y="${confirmY + 88}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="34" font-weight="700" fill="#ffffff">✓</text>
  <text x="${widgetX + 170}" y="${confirmY + 72}" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="700" fill="#14532d">Appointment confirmed</text>
  ${oLines
    .map(
      (line, i) =>
        `<text x="${widgetX + 170}" y="${confirmY + 118 + i * 34}" font-family="Inter, system-ui, sans-serif" font-size="24" fill="#166534">${escapeXml(line)}</text>`,
    )
    .join("")}
  <text x="${widgetX + 170}" y="${confirmY + 210}" font-family="Inter, system-ui, sans-serif" font-size="22" fill="#15803d">Slot held · visitor notified</text>
  <text x="${width / 2}" y="${widgetY + widgetH + 70}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="26" fill="#475569">Booking confirmation demonstration</text>
</svg>`;
}

/** Late-time context: unanswered → answered split with night chrome. */
function layoutAfterHoursResponse(beat: ProductDemoBeat): string {
  const width = SHORT_PROFILE.width;
  const height = SHORT_PROFILE.height;
  const midY = Math.round(height * 0.48);

  const qLines = wrapLines(beat.visitor_question, 30, 3);
  const aLines = wrapLines(beat.ai_answer, 30, 4);
  const oLines = wrapLines(beat.outcome_label, 28, 2);

  const topBubble = bubbleBlock(
    qLines,
    80,
    320,
    700,
    "#334155",
    "#f8fafc",
    false,
    24,
  );
  const bottomQ = bubbleBlock(
    qLines,
    80,
    midY + 140,
    620,
    "#e2e8f0",
    "#0f172a",
    false,
    22,
  );
  const bottomA = bubbleBlock(
    aLines,
    width - 80,
    midY + 140 + bottomQ.height + 20,
    680,
    "#2563eb",
    "#ffffff",
    true,
    22,
  );
  const outcomeY = midY + 140 + bottomQ.height + 20 + bottomA.height + 28;
  const outcome = bubbleBlock(
    oLines,
    Math.round((width - 640) / 2),
    Math.min(outcomeY, height - 220),
    640,
    "#dcfce7",
    "#166534",
    false,
    24,
  );

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#night)"/>
  <text x="80" y="140" font-family="Inter, system-ui, sans-serif" font-size="28" fill="#94a3b8">11:42 PM · After hours</text>
  <text x="80" y="200" font-family="Inter, system-ui, sans-serif" font-size="36" font-weight="700" fill="#f87171">No reply</text>
  ${topBubble.svg}
  <text x="${width - 80}" y="${midY - 40}" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="22" fill="#64748b">Visitor waits…</text>
  <line x1="60" y1="${midY}" x2="${width - 60}" y2="${midY}" stroke="#334155" stroke-width="3" stroke-dasharray="12 10"/>
  <text x="80" y="${midY + 70}" font-family="Inter, system-ui, sans-serif" font-size="28" fill="#86efac">${escapeXml(beat.brand_name)} answers instantly</text>
  ${bottomQ.svg}
  ${bottomA.svg}
  ${outcome.svg}
</svg>`;
}

export function buildProductDemoChatSvg(beat: ProductDemoBeat): {
  svg: string;
  metadata: ProductDemoLayoutMetadata;
} {
  const variant = effectiveVariant(beat);
  let svg: string;
  switch (variant) {
    case "lead_capture":
      svg = layoutLeadCapture(beat);
      break;
    case "booking_confirmation":
      svg = layoutBookingConfirmation(beat);
      break;
    case "after_hours_response":
      svg = layoutAfterHoursResponse(beat);
      break;
    case "conversation_answer":
    default:
      svg = layoutConversationAnswer(beat);
      break;
  }

  return {
    svg,
    metadata: {
      width: SHORT_PROFILE.width,
      height: SHORT_PROFILE.height,
      questionVisible: true,
      aiAnswerVisible: true,
      outcomeVisible: true,
      demoVariant: variant,
    },
  };
}

export async function composeProductDemoRaster(
  beat: ProductDemoBeat,
): Promise<{ png: Buffer; metadata: ProductDemoLayoutMetadata }> {
  const parsedVariant = effectiveVariant(beat);
  const { svg, metadata } = buildProductDemoChatSvg({
    ...beat,
    demo_variant: parsedVariant,
  });
  // Semantic markers must appear in the raster SVG.
  if (!svg.includes(escapeXml(beat.visitor_question.slice(0, 12)))) {
    throw new Error("product_demo raster missing visitor question");
  }
  if (!svg.includes(escapeXml(beat.ai_answer.slice(0, 12)))) {
    throw new Error("product_demo raster missing ai answer");
  }
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { png, metadata };
}
