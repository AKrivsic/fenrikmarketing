/**
 * Render a controlled Fenrik product-demo chat as PNG (Sprint 4C.1).
 * Uses Playwright page.setContent — does not scrape customer websites.
 */

import type { Browser } from "playwright";

const OUTCOME_TYPES = new Set([
  "lead_captured",
  "booking_confirmed",
  "question_resolved",
  "contact_captured",
]);

export interface ProductDemoChatBeat {
  type: "product_demo";
  actor_id: string;
  conversation_id: string;
  question_visible: true;
  ai_answer_visible: true;
  outcome_visible: true;
  outcome_type: string;
  visitor_question: string;
  ai_answer: string;
  outcome_label: string;
  brand_name: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseProductDemoChatBeat(
  raw: unknown,
): { ok: true; data: ProductDemoChatBeat } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "beat must be an object" };
  }
  const r = raw as Record<string, unknown>;
  const str = (k: string, max: number) => {
    const v = r[k];
    return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  };
  if (r.type !== "product_demo") {
    return { ok: false, reason: "type must be product_demo" };
  }
  const actor_id = str("actor_id", 120);
  const conversation_id = str("conversation_id", 120);
  const visitor_question = str("visitor_question", 160);
  const ai_answer = str("ai_answer", 200);
  const outcome_label = str("outcome_label", 120);
  const brand_name = str("brand_name", 80) || "Fenrik.chat";
  const outcome_type =
    typeof r.outcome_type === "string" ? r.outcome_type.trim() : "";
  if (!actor_id) return { ok: false, reason: "actor_id required" };
  if (!conversation_id) return { ok: false, reason: "conversation_id required" };
  if (!visitor_question) return { ok: false, reason: "visitor_question required" };
  if (!ai_answer) return { ok: false, reason: "ai_answer required" };
  if (!outcome_label) return { ok: false, reason: "outcome_label required" };
  if (!OUTCOME_TYPES.has(outcome_type)) {
    return { ok: false, reason: "invalid outcome_type" };
  }
  if (
    r.question_visible !== true ||
    r.ai_answer_visible !== true ||
    r.outcome_visible !== true
  ) {
    return { ok: false, reason: "visibility flags must all be true" };
  }
  return {
    ok: true,
    data: {
      type: "product_demo",
      actor_id,
      conversation_id,
      question_visible: true,
      ai_answer_visible: true,
      outcome_visible: true,
      outcome_type,
      visitor_question,
      ai_answer,
      outcome_label,
      brand_name,
    },
  };
}

export function buildProductDemoChatHtml(beat: ProductDemoChatBeat): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; width: 1080px; height: 1920px;
    font-family: Inter, system-ui, sans-serif;
    background: linear-gradient(#0f172a, #1e293b);
    display: flex; align-items: center; justify-content: center;
  }
  .phone {
    width: 780px; height: 1480px; background: #020617;
    border-radius: 64px; border: 4px solid #334155; padding: 80px 36px 80px;
  }
  .screen {
    width: 100%; height: 100%; background: #f8fafc; border-radius: 36px;
    overflow: hidden; display: flex; flex-direction: column;
  }
  .header {
    background: #0f172a; color: #f8fafc; text-align: center;
    padding: 28px 16px; font-size: 30px; font-weight: 600;
  }
  .thread { flex: 1; padding: 28px; display: flex; flex-direction: column; gap: 28px; }
  .bubble {
    max-width: 78%; padding: 18px 22px; border-radius: 22px;
    font-size: 26px; line-height: 1.3; white-space: pre-wrap;
  }
  .q { align-self: flex-start; background: #e2e8f0; color: #0f172a; }
  .a { align-self: flex-end; background: #2563eb; color: #fff; }
  .o {
    align-self: center; background: #dcfce7; color: #166534;
    max-width: 88%; text-align: center; font-weight: 600;
  }
  .caption {
    position: absolute; bottom: 80px; left: 0; right: 0;
    text-align: center; color: #94a3b8; font-size: 28px;
  }
  .wrap { position: relative; width: 1080px; height: 1920px;
    display: flex; align-items: center; justify-content: center; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="phone">
      <div class="screen">
        <div class="header">${escapeHtml(beat.brand_name)}</div>
        <div class="thread">
          <div class="bubble q" data-role="question">${escapeHtml(beat.visitor_question)}</div>
          <div class="bubble a" data-role="ai-answer">${escapeHtml(beat.ai_answer)}</div>
          <div class="bubble o" data-role="outcome">${escapeHtml(beat.outcome_label)}</div>
        </div>
      </div>
    </div>
    <div class="caption">Product demonstration</div>
  </div>
</body>
</html>`;
}

export async function renderProductDemoChatPng(
  browser: Browser,
  rawBeat: unknown,
): Promise<{ png: Buffer; beat: ProductDemoChatBeat }> {
  const parsed = parseProductDemoChatBeat(rawBeat);
  if (!parsed.ok) throw new Error(parsed.reason);

  const html = buildProductDemoChatHtml(parsed.data);
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
  });
  try {
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const empty = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll(".bubble"));
      return nodes.some((n) => !(n.textContent || "").trim());
    });
    if (empty) throw new Error("empty chat bubbles are not permitted");
    const png = Buffer.from(await page.screenshot({ type: "png" }));
    return { png, beat: parsed.data };
  } finally {
    await page.close();
  }
}
