import type { PromptPresentationType } from "@/lib/scene-types/presentation/promptPresentationTypes";
import {
  formatPromptPresentationTypesList,
  promptAllowsChecklist,
  promptAllowsPhone,
  promptAllowsQuote,
  promptAllowsStatistic,
  promptAllowsCta,
} from "@/lib/scene-types/presentation/promptPresentationTypes";

export function buildPresentationGenerationBlock(args: {
  allowedTypes: readonly PromptPresentationType[];
}): string {
  const allowsChecklist = promptAllowsChecklist(args.allowedTypes);
  const allowsPhone = promptAllowsPhone(args.allowedTypes);
  const allowsQuote = promptAllowsQuote(args.allowedTypes);
  const allowsStatistic = promptAllowsStatistic(args.allowedTypes);
  const allowsCta = promptAllowsCta(args.allowedTypes);
  const allowedLine = formatPromptPresentationTypesList(args.allowedTypes);
  const imageOnlyPrompt =
    !allowsChecklist &&
    !allowsPhone &&
    !allowsQuote &&
    !allowsStatistic &&
    !allowsCta;

  const lines = [
    "PRESENTATION (visual beat types — narrative first, presentation second):",
    "",
    "Scene Types are sparse tools across your content calendar — not recurring templates.",
    "IMAGE is the default and may dominate many videos in a row.",
    "Do not force CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA merely for variety.",
    "",
    "Order of work:",
    "1. Write the narrative and voiceover.",
    "2. Break it into meaningful visual beats (visual_scenes).",
    "3. Choose the most natural presentation for each beat.",
    "",
    `Allowed presentation types for this project: ${allowedLine}.`,
    "",
    "IMAGE is the default presentation type.",
    "Use IMAGE when one strong visual can communicate the beat clearly.",
    "It is valid and often preferable for EVERY scene to be IMAGE.",
    "",
    "Do not alternate scene types for visual variety or pacing.",
    "There is no quota for CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA.",
  ];

  if (allowsChecklist) {
    lines.push(
      "",
      "Do not use CHECKLIST to create visual variety.",
      "",
      "Use CHECKLIST only when the narration genuinely contains 2–5 concrete items",
      "(steps, mistakes, requirements, inclusions, or actions) the viewer should",
      "read together on screen.",
      "",
      "CHECKLIST rules:",
      "- At most ONE CHECKLIST scene in the entire video.",
      "- 2–5 concise items only; each item must appear in or follow directly from the script.",
      "- Do not invent checklist items that are not supported by the narration.",
      "- Do not use CHECKLIST for broad benefits, vague marketing lines, or single sentences.",
      "- CHECKLIST is not the default hook; prefer IMAGE for opening beats unless the script is truly a list.",
      "",
      "CHECKLIST JSON shape:",
      '{ "type": "CHECKLIST", "payload": { "title": "optional short title", "items": ["item one", "item two"] } }',
    );
  }

  if (allowsPhone) {
    lines.push(
      "",
      "Use PHONE only when the narrative beat is specifically about interacting with",
      "a real mobile product interface (app, chat, mobile portal, mobile checkout,",
      "or booking flow on a phone) and showing that interface improves understanding.",
      "",
      "PHONE rules:",
      "- At most ONE PHONE scene in the entire video.",
      "- Prefer payload.asset_id from PHONE-ELIGIBLE ASSETS when one fits the beat.",
      "- Use payload.image_prompt only when no suitable approved mobile UI asset exists",
      "  and the product is genuinely mobile-capable — describe a tight mobile UI only.",
      "- Optional payload.caption (short). Provide exactly one of asset_id OR image_prompt.",
      "- Do not use PHONE for restaurant atmosphere, offices, generic websites, social",
      "  media browsing, decorative variety, or because customers own phones.",
      "- Do not invent screens, buttons, notifications, metrics, or product workflows.",
      "- PHONE selection comes after the beat is defined; every scene may remain IMAGE.",
      "",
      "PHONE JSON shape:",
      '{ "type": "PHONE", "payload": { "asset_id": "uuid from PHONE-ELIGIBLE ASSETS", "caption": "optional" } }',
      'or { "type": "PHONE", "payload": { "image_prompt": "tight mobile UI description", "caption": "optional" } }',
    );
  }

  if (allowsQuote) {
    lines.push(
      "",
      "Use QUOTE only when one APPROVED QUOTE directly supports the narrative beat",
      "and showing the customer's words improves trust or understanding.",
      "",
      "QUOTE rules:",
      "- At most ONE QUOTE scene in the entire video.",
      "- Copy quote text and attribution from APPROVED QUOTES; use the exact proof_id.",
      "- Do not invent, merge, or paraphrase testimonials.",
      "- Do not turn product benefits or marketing lines into customer quotes.",
      "- Do not use QUOTE automatically in conversion content or for visual variety.",
      "- Do not wrap normal narration in quotation marks.",
      "- If no approved quote fits the beat, keep IMAGE.",
      "",
      "QUOTE JSON shape:",
      '{ "type": "QUOTE", "payload": { "quote": "verbatim from APPROVED QUOTES", "attribution": "from APPROVED QUOTES", "proof_id": "proof-id", "context": "optional" } }',
    );
  }

  if (allowsStatistic) {
    lines.push(
      "",
      "Use STATISTIC only when one approved numerical fact directly supports the narrative beat",
      "and the number itself is the clearest part of the message.",
      "",
      "STATISTIC rules:",
      "- At most ONE STATISTIC scene in the entire video.",
      "- Use only entries from APPROVED STATISTICS; copy exact proof_id, value, unit, and label.",
      "- Do not calculate, round, extrapolate, or invent numbers from vague benefits.",
      "- Do not use STATISTIC to look more professional or because numbers exist in Product Brain.",
      "- Do not automatically use STATISTIC in Conversion or Proof content.",
      "- If no approved statistic fits the beat, keep IMAGE.",
      "- IMAGE-only videos remain valid.",
      "",
      "STATISTIC JSON shape:",
      '{ "type": "STATISTIC", "payload": { "value": "42", "unit": "%", "label": "of inquiries arrive outside business hours", "proof_id": "proof-id", "source_line": "optional" } }',
    );
  }

  if (allowsCta) {
    lines.push(
      "",
      "A dedicated CTA scene is optional. Use CTA only when a visual end card improves the final action.",
      "",
      "CTA rules:",
      "- At most ONE CTA scene in the entire video.",
      "- CTA should normally be the FINAL visual scene only.",
      "- Match headline and button to the package CTA / Project Brain default CTA — same action, no new offers.",
      "- Do not invent discounts, urgency, guarantees, free trials, pricing, or scarcity.",
      "- Do not add CTA automatically to every video or merely to vary scene types.",
      "- Voiceover and subtitles may carry the CTA without a dedicated CTA scene.",
      "- IMAGE-only videos remain valid.",
      "",
      "CTA JSON shape:",
      '{ "type": "CTA", "payload": { "headline": "Book a demo", "subline": "optional short line", "button_label": "Book now", "show_logo": true } }',
    );
  }

  if (imageOnlyPrompt) {
    lines.push(
      "",
      "This project may use IMAGE scenes only. Do not output CHECKLIST, PHONE, QUOTE, STATISTIC, CTA, or any other scene type.",
    );
  } else {
    const forbidden = [
      !allowsChecklist ? "CHECKLIST" : null,
      !allowsPhone ? "PHONE" : null,
      !allowsQuote ? "QUOTE" : null,
      !allowsStatistic ? "STATISTIC" : null,
      !allowsCta ? "CTA" : null,
    ]
      .filter(Boolean)
      .join(", ");
    if (forbidden.length > 0) {
      lines.push(
        "",
        `Do not output scene types outside the allowed list (forbidden: ${forbidden}).`,
      );
    }
  }

  lines.push(
    "",
    "IMAGE scenes keep the existing shapes:",
    '{ "source": "ai", "image_prompt": "..." }',
    'or { "source": "asset", "asset_id": "...", "used_as": "..." }.',
    "",
    "EXAMPLE A — IMAGE-only local service (restaurant / salon / cleaning):",
    "Narration describes atmosphere and one core promise — all beats stay IMAGE:",
    'visual_scenes: [ { "source": "ai", "image_prompt": "..." }, { "source": "ai", "image_prompt": "..." } ]',
    "",
  );

  if (allowsChecklist) {
    lines.push(
      "EXAMPLE B — valid CHECKLIST (script lists concrete items):",
      'Narration: "Before publishing, check the hook, confirm the CTA, and review the visual."',
      "visual_scenes:",
      '  [ { "source": "ai", "image_prompt": "..." },',
      '    { "type": "CHECKLIST", "payload": { "title": "Before publishing", "items": ["Check the hook", "Confirm the CTA", "Review the visual"] } } ]',
      "",
      "EXAMPLE C — do NOT force CHECKLIST:",
      'Narration: "We help teams work faster, stay organized, and grow revenue."',
      "Correct: all IMAGE scenes — there is no concrete list in the script.",
    );
  } else {
    lines.push(
      "EXAMPLE B — broad benefits (stay IMAGE-only):",
      'Narration: "We help teams work faster, stay organized, and grow revenue."',
      "Correct: all IMAGE scenes.",
    );
  }

  if (allowsPhone) {
    lines.push(
      "",
      "EXAMPLE D — valid PHONE (script is about the mobile product UI):",
      'Narration: "Open the app and tap New chat to reply from your phone."',
      'visual_scenes: [ { "source": "ai", "image_prompt": "..." },',
      '  { "type": "PHONE", "payload": { "asset_id": "<mobile-ui-asset-id>", "caption": "New chat" } } ]',
      "",
      "EXAMPLE E — do NOT force PHONE:",
      'Narration: "We serve fresh pasta in a cozy dining room."',
      "Correct: all IMAGE scenes — the beat is not a mobile interface.",
    );
  }

  return lines.join("\n");
}

export function buildPresentationJsonShapeLines(args: {
  allowedTypes: readonly PromptPresentationType[];
}): string[] {
  const lines = [
    `    { "source": "ai", "image_prompt": "string" },`,
    `    { "source": "asset", "asset_id": "uuid from AVAILABLE ASSETS", "used_as": "how this beat shows the asset", "video_usage": "optional", "modify": "true|false" }`,
  ];
  if (promptAllowsChecklist(args.allowedTypes)) {
    lines.push(
      `    { "type": "CHECKLIST", "payload": { "title": "optional", "items": ["string", "string"] } }`,
    );
  }
  if (promptAllowsPhone(args.allowedTypes)) {
    lines.push(
      `    { "type": "PHONE", "payload": { "asset_id": "uuid from PHONE-ELIGIBLE ASSETS", "caption": "optional" } },`,
      `    { "type": "PHONE", "payload": { "image_prompt": "tight mobile UI only", "caption": "optional" } }`,
    );
  }
  if (promptAllowsQuote(args.allowedTypes)) {
    lines.push(
      `    { "type": "QUOTE", "payload": { "quote": "string", "attribution": "string", "proof_id": "from APPROVED QUOTES", "context": "optional" } }`,
    );
  }
  if (promptAllowsStatistic(args.allowedTypes)) {
    lines.push(
      `    { "type": "STATISTIC", "payload": { "value": "string", "unit": "optional", "label": "string", "proof_id": "from APPROVED STATISTICS", "source_line": "optional" } }`,
    );
  }
  if (promptAllowsCta(args.allowedTypes)) {
    lines.push(
      `    { "type": "CTA", "payload": { "headline": "string", "subline": "optional", "button_label": "optional", "show_logo": true } }`,
    );
  }
  return lines;
}
