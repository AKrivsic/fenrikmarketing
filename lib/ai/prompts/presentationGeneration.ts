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
    "PRESENTATION (visual beat types — strongest expression wins):",
    "",
    "For each narrative beat, ask: what is the strongest way to communicate THIS idea?",
    "IMAGE is a common, valid choice when one strong visual carries the beat.",
    "Typed scenes (when allowed) are equal tools — not exceptional backups and not defaults.",
    "Select a typed scene only when it communicates the core idea materially better than a normal IMAGE.",
    "Do not use typed scenes merely for decoration, structure, or artificial variety.",
    "Do not force one typed scene per video.",
    "There is no quota for CHECKLIST, PHONE, QUOTE, STATISTIC, or CTA.",
    "",
    "Decision rubric (apply per beat):",
    "1) What idea does this beat need to land?",
    "2) Compare candidates: IMAGE (including object / process / comparison-style stills),",
    "   then any allowed typed scene (CHECKLIST, PHONE, QUOTE, STATISTIC, CTA for closes).",
    "3) Prefer the typed scene only when it is materially clearer than those IMAGE options.",
    "4) Is the required payload available and supported by the narration / Project Brain?",
    "5) Recent history (if noted) is a soft tie-breaker when two options are similarly strong —",
    "   prefer the less recently used expression. Do not rotate for variety alone.",
    "   If a typed scene is clearly stronger, keep it.",
    "If a typed scene is clearly stronger, use it. Otherwise use IMAGE.",
    "",
    "Order of work:",
    "1. Write the narrative and voiceover.",
    "2. Break it into meaningful visual beats (visual_scenes).",
    "3. Choose the strongest presentation for each beat.",
    "",
    `Allowed presentation types for this project: ${allowedLine}.`,
    "",
    "IMAGE: use when one strong visual communicates the beat clearly",
    "(including emotion, atmosphere, process motion, contrast, or narrative action).",
  ];

  if (allowsChecklist) {
    lines.push(
      "",
      "CHECKLIST restraint:",
      "A list-like script does not automatically require a CHECKLIST scene.",
      "Use CHECKLIST only when simultaneous visual scanning of the concrete items is the main value of the beat.",
      "",
      "Choose CHECKLIST only when all of these hold:",
      "- the items themselves are the main message of the beat,",
      "- the viewer benefits from seeing them together at once,",
      "- the items are concrete and short enough to scan,",
      "- the list structure matters more than emotion, atmosphere, process, contrast, or narrative action.",
      "",
      "Prefer IMAGE (object / process / comparison-style still, or story imagery) when:",
      "- the list is only supporting detail,",
      "- the beat is emotional or story-driven (e.g. \"three reasons\" told as a narrative),",
      "- the items are vague benefits,",
      "- the idea is better shown as a process unfolding,",
      "- the idea is better shown through comparison or contrast,",
      "- the topic is list-like but a checklist would feel repetitive within the series",
      "  when another expression is similarly strong.",
      "",
      "CHECKLIST remains valid for genuine scan-together beats: concrete steps, check-before,",
      "inclusions/exclusions, short parallel requirements, or prioritization the viewer must read as a set.",
      "",
      "CHECKLIST rules:",
      "- At most ONE CHECKLIST scene in the entire video.",
      "- 2–5 concise items only; each item must appear in or follow directly from the script.",
      "- Do not invent checklist items that are not supported by the narration.",
      "- Do not use CHECKLIST for broad benefits, vague marketing lines, or single sentences.",
      "- Opening beats may be CHECKLIST only when the script itself opens as a concrete scan-together list;",
      "  otherwise open with IMAGE and reserve CHECKLIST for that beat if it still wins.",
      "",
      "CHECKLIST JSON shape:",
      '{ "type": "CHECKLIST", "payload": { "title": "optional short title", "items": ["item one", "item two"] } }',
    );
  }

  if (allowsPhone) {
    lines.push(
      "",
      "PHONE — consider when the beat is about mobile workflow: social feeds, notifications,",
      "messaging, scrolling, publishing, creator or mobile-first behaviour, or a real mobile",
      "product interface — and showing a phone screen improves understanding.",
      "",
      "PHONE rules:",
      "- At most ONE PHONE scene in the entire video.",
      "- Prefer payload.asset_id from PHONE-ELIGIBLE ASSETS when one fits the beat.",
      "- Use payload.image_prompt only when no suitable approved mobile UI asset exists",
      "  and the product is genuinely mobile-capable — describe a tight mobile UI only.",
      "- Optional payload.caption (short). Provide exactly one of asset_id OR image_prompt.",
      "- Do not use PHONE for restaurant atmosphere, offices, generic desktop websites,",
      "  decorative variety, or merely because customers own phones.",
      "- Do not invent screens, buttons, notifications, metrics, or product workflows",
      "  that the narration and approved assets do not support.",
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
      "Use QUOTE when one APPROVED QUOTE directly supports the narrative beat",
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
      "Use STATISTIC when one approved numerical fact directly supports the narrative beat",
      "and the number itself is the clearest part of the message.",
      "",
      "STATISTIC rules:",
      "- At most ONE STATISTIC scene in the entire video.",
      "- Use only entries from APPROVED STATISTICS; copy exact proof_id, value, unit, and label.",
      "- Do not calculate, round, extrapolate, or invent numbers from vague benefits.",
      "- Do not use STATISTIC to look more professional or because numbers exist in Product Brain.",
      "- Do not automatically use STATISTIC in Conversion or Proof content.",
      "- If no approved statistic fits the beat, keep IMAGE.",
      "",
      "STATISTIC JSON shape:",
      '{ "type": "STATISTIC", "payload": { "value": "42", "unit": "%", "label": "of inquiries arrive outside business hours", "proof_id": "proof-id", "source_line": "optional" } }',
    );
  }

  if (allowsCta) {
    lines.push(
      "",
      "CTA — choose a typed CTA scene only when a branded end card is genuinely the strongest",
      "closing expression for this package. Do not add CTA scenes for frequency or habit.",
      "",
      "Valid closing approaches (choose the strongest for THIS close — not always a CTA card):",
      "- narrative conclusion (IMAGE still)",
      "- question or insight/payoff still (IMAGE)",
      "- product visual, asset screenshot, or logo brand close (IMAGE or asset scene)",
      "- voiceover-only fade on the last still (no new visual type required)",
      "- soft text-led close without a button",
      "- typed CTA scene when a branded card clearly beats another IMAGE for the final action",
      "",
      "CTA rules:",
      "- At most ONE CTA scene in the entire video.",
      "- CTA should normally be the FINAL visual scene only.",
      "- Match headline and button to the package CTA / Project Brain default CTA — same action, no new offers.",
      "- Put the package CTA action in headline OR subline OR button_label (at least one must paraphrase the package CTA); do not use a decorative hook-only headline with no CTA action in any field.",
      "- Prefer typed CTA only when the scene is final, the package CTA is explicit,",
      "  and a clean branded closing card communicates the action better than another IMAGE.",
      "- Do not invent discounts, urgency, guarantees, free trials, pricing, or scarcity.",
      "- Awareness and problem-aware videos often finish stronger without typed CTA.",
      "- Solution-aware and conversion videos are stronger CTA candidates when the close is truly action-led.",
      "- Voiceover and subtitles may carry the CTA without a dedicated CTA scene.",
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
    "EXAMPLE A — valid IMAGE-only organic video:",
    "Narration flows as one story with no list, mobile, or proof beat that needs a typed layout:",
    'visual_scenes: [ { "source": "ai", "image_prompt": "..." }, { "source": "ai", "image_prompt": "..." } ]',
    "",
  );

  if (allowsChecklist) {
    lines.push(
      "EXAMPLE B — valid CHECKLIST (items themselves are the beat; scan-together value):",
      'Narration: "Before publishing, check the hook, confirm the CTA, and review the visual."',
      "visual_scenes:",
      '  [ { "source": "ai", "image_prompt": "..." },',
      '    { "type": "CHECKLIST", "payload": { "title": "Before publishing", "items": ["Check the hook", "Confirm the CTA", "Review the visual"] } } ]',
      "",
      "EXAMPLE C — vague benefits (stay IMAGE):",
      'Narration: "We help teams work faster, stay organized, and grow revenue."',
      "Correct: all IMAGE scenes — not a concrete scan-together list.",
      "",
      "EXAMPLE C2 — emotional / story \"three reasons\" (prefer IMAGE):",
      'Narration: "Three reasons your feed went quiet — and each one feels personal."',
      "Correct: IMAGE scenes that carry emotion and story; do not default to CHECKLIST.",
      "",
      "EXAMPLE C3 — process-oriented list (prefer process-style IMAGE):",
      'Narration: "Ideas pile up, get stuck in review, then never reach publish."',
      "Correct: IMAGE showing the process unfolding — not a CHECKLIST of those stages.",
    );
  } else {
    lines.push(
      "EXAMPLE C — vague benefits (stay IMAGE-only):",
      'Narration: "We help teams work faster, stay organized, and grow revenue."',
      "Correct: all IMAGE scenes.",
    );
  }

  if (allowsCta) {
    lines.push(
      "",
      "EXAMPLE D — solution-aware video may end with typed CTA (optional):",
      "Final beat states a clear product action; closing card matches package CTA:",
      'visual_scenes: [ { "source": "ai", "image_prompt": "..." },',
      '  { "type": "CTA", "payload": { "headline": "Book a demo", "button_label": "Book now", "show_logo": true } } ]',
      "",
      "EXAMPLE E — invalid decorative CTA (stay IMAGE):",
      "Awareness video with soft CTA in voiceover only — no typed CTA scene needed.",
    );
  }

  if (allowsPhone) {
    lines.push(
      "",
      "EXAMPLE F — valid PHONE (script is about mobile product / publishing workflow):",
      'Narration: "Open the app and tap New chat to reply from your phone."',
      'visual_scenes: [ { "source": "ai", "image_prompt": "..." },',
      '  { "type": "PHONE", "payload": { "asset_id": "<mobile-ui-asset-id>", "caption": "New chat" } } ]',
      "",
      "EXAMPLE G — do NOT force PHONE:",
      'Narration: "We serve fresh pasta in a cozy dining room."',
      "Correct: all IMAGE scenes — the beat is not a mobile workflow or interface.",
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
