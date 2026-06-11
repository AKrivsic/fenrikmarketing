import type { Project } from "@/lib/supabase/types";
import type { AntiRepetitionMemory } from "@/lib/ai/types";
import { parseProjectKnowledge } from "@/lib/knowledge/types";
import { canonicalWebsiteUrl } from "@/lib/knowledge/websiteUrl";

// Serializes the relevant Project Brain fields into a compact, deterministic
// block that every prompt embeds. Keeping this in one place ensures all
// workflows share the same brand context and constraints.
export function projectBrainBlock(project: Project): string {
  return [
    "PROJECT BRAIN:",
    `- name: ${project.name}`,
    `- type: ${project.type}`,
    `- language: ${project.language}`,
    `- market_scope: ${project.market_scope}`,
    `- goal_type: ${project.goal_type}`,
    `- target_audience: ${JSON.stringify(project.target_audience)}`,
    `- tone_of_voice: ${JSON.stringify(project.tone_of_voice)}`,
    `- product_is: ${list(project.product_is)}`,
    `- product_is_not (NEVER claim these): ${list(project.product_is_not)}`,
    `- product_strengths: ${list(project.product_strengths)}`,
    `- pain_points: ${list(project.pain_points)}`,
    `- forbidden_claims (NEVER use): ${list(project.forbidden_claims)}`,
    `- platforms: ${list(project.platforms)}`,
    `- default_cta: ${project.default_cta ?? "(none)"}`,
  ].join("\n");
}

// Website URL & CTA Usage V1 — emits the WEBSITE / LINK RULES block when the
// project has a canonical website URL (projects.knowledge.source_url). The model
// gets the real URL plus strict per-platform rules so it stops inventing/omitting
// links and never leaks a URL into spoken voiceover or generated imagery. Returns
// "" when there is no URL, so prompts for URL-less projects are unchanged.
export function websiteLinkRulesBlock(project: Project): string {
  const url = canonicalWebsiteUrl(project);
  if (!url) return "";

  return [
    `WEBSITE / LINK RULES (canonical project website: ${url}):`,
    "- A real canonical website URL exists (above). Use it ONLY where the " +
      "per-platform rules below allow, and only when it genuinely helps the viewer act.",
    "- NEVER invent, guess or shorten a URL. Use the canonical URL verbatim, or no URL at all.",
    "- NEVER translate or alter the URL (host or path) — it is the same in every language.",
    "- NEVER put a URL into voiceover_text or the video script — links are not spoken.",
    "- NEVER put a URL into image_prompts, and NEVER request visible URL / website / " +
      "link / QR-code text rendered inside a generated image.",
    "- A link must never turn the piece into an ad: earn attention first, then the link " +
      "is a quiet next step — not the message.",
    "PER-PLATFORM LINK RULES:",
    "- tiktok: NO raw URL in the caption. Use DM / comment / \"link in bio\" only when it fits naturally.",
    "- instagram: NO raw URL by default. The CTA may point to \"link in bio\" or DM.",
    "- youtube: you MAY include the canonical URL in the description/caption when the " +
      "CTA is lead / conversion oriented.",
    "- linkedin: awareness / problem-aware -> usually NO URL. solution-aware / " +
      "conversion -> at most ONE canonical URL, placed at the end.",
    "- facebook: you MAY include ONE canonical URL in the caption / CTA for lead / conversion content.",
    "- google_business: NO raw URL in the text. The CTA may say visit website / call / " +
      "book; never invent a booking URL.",
    "- x: include a URL ONLY for conversion-style output, at most ONE, and not necessarily in every variant.",
  ].join("\n");
}

export function constraintsBlock(project: Project): string {
  return [
    "HARD CONSTRAINTS:",
    `- Write in the project language (${project.language}) and tone of voice.`,
    "- Never produce any forbidden_claims.",
    "- Never describe the product as anything in product_is_not.",
    "- Output must be a single valid JSON document, no prose, no code fences.",
  ].join("\n");
}

function list(values: string[]): string {
  return values.length ? values.join("; ") : "(none)";
}

// De-duplicates and trims a project's pain points, dropping blanks. Shared by
// the Pain Point First block and the per-package focus assignment so both read
// the SAME normalized list.
export function normalizePainPoints(project: Project): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of project.pain_points ?? []) {
    const text = (raw ?? "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

// Pain Point First V1 — the most important content rule. The audit found that
// pain_points were just one bullet among many in PROJECT BRAIN, so topic
// selection (weekly strategy) and package generation could drift onto an
// interesting-but-minor detail (a dirty switch, a trash-can smell) as the
// PRIMARY topic. This block promotes pain_points to the primary content source:
// every package's central topic must be anchored to a real pain point, details
// may only support that story, and trends must connect to a pain point.
//
// Returns "" when the project has no pain points, so legacy projects keep the
// prompt byte-for-byte unchanged (backward compatible).
export const PAIN_POINT_FIRST_HEADER = "PAIN POINT FIRST";

export function painPointFirstBlock(project: Project): string {
  const painPoints = normalizePainPoints(project);
  if (painPoints.length === 0) return "";

  return [
    `${PAIN_POINT_FIRST_HEADER} (the PRIMARY content source — the central topic of ` +
      "EVERY content item MUST be anchored to a real customer pain point):",
    "PROJECT PAIN POINTS (anchor topics to these):",
    ...painPoints.map((p) => `- ${p}`),
    "PAIN POINT RULES:",
    "- The central topic MUST solve, expose, amplify, or dramatize one of the " +
      "pain points above. The pain point is the STORY.",
    "- Details may SUPPORT the story; details must NOT become the story. Do NOT " +
      "make a minor detail (a dirty switch, a dusty handle, a trash-can smell, a " +
      "single forgotten object) the PRIMARY topic — it can only appear as " +
      "supporting evidence inside a larger pain point.",
    "- 80/20 RULE: about 80% of items must be tied DIRECTLY to one explicit pain " +
      "point above; the other ~20% may be a supporting insight, mistake, " +
      "observation or detail — but each of those MUST still connect back to a " +
      "pain point.",
    "- TREND + PAIN POINT: trend topics are allowed, but a trend MUST connect to " +
      'a pain point. GOOD: trend "summer tourism boom" -> pain point "more guest ' +
      'turnover". BAD: trend "summer tourism boom" -> "clean trash can lid".',
    "- GOOD primary topics (examples): guest complaint, bad review, late " +
      "checkout, stress before guest arrival, no time to clean.",
    "- BAD primary topics (examples): trash can smell, dusty switch, a single " +
      "forgotten object — unless used as supporting evidence inside a larger pain " +
      "point.",
  ].join("\n");
}

// Phase 2C — exposes the project's Proof pool (from projects.knowledge) to the
// content generation prompts as OPTIONAL marketing ammunition. Combines the
// manually approved `statements` and the asset-derived `asset_statements`. The
// instruction is deliberate: proof is available, not mandatory, and must not be
// repeated across content. Returns "" when there is no proof, so callers can
// skip embedding an empty block.
const MAX_PROOF_IN_PROMPT = 12;

export function proofBlock(project: Project): string {
  const knowledge = parseProjectKnowledge(project.knowledge);
  if (!knowledge) return "";

  const texts: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const text = value.trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    texts.push(text);
  };

  for (const statement of knowledge.cards.proof.statements) push(statement);
  for (const statement of knowledge.cards.proof.asset_statements) {
    push(statement.text);
  }

  if (texts.length === 0) return "";

  return [
    "PROOF POOL (available marketing ammunition — NOT mandatory):",
    ...texts.slice(0, MAX_PROOF_IN_PROMPT).map((t) => `- ${t}`),
    "PROOF RULES:",
    "- Use a proof point ONLY when it is genuinely relevant to the topic/angle.",
    "- Proof is optional; do not force it into every piece of content.",
    "- Never repeat the same proof point across items; vary or omit it.",
    "- Never invent proof or alter the numbers/claims in the pool.",
  ].join("\n");
}

// Phase 2D — exposes the project's Scenario Pool (from projects.knowledge) to
// the content generation prompts as OPTIONAL inspiration. Scenarios are concrete
// situations the customer faces; they make content specific instead of generic.
// They are NOT mandatory and the model must ROTATE them across content rather
// than reusing the same one. Returns "" when there are no scenarios, so callers
// can skip embedding an empty block.
const MAX_SCENARIOS_IN_PROMPT = 12;

export function scenarioBlock(project: Project): string {
  const knowledge = parseProjectKnowledge(project.knowledge);
  if (!knowledge) return "";

  const texts: string[] = [];
  const seen = new Set<string>();
  for (const scenario of knowledge.scenarios) {
    const text = scenario.text.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    texts.push(text);
  }

  if (texts.length === 0) return "";

  return [
    "SCENARIO POOL (concrete customer situations — inspiration, NOT mandatory):",
    ...texts.slice(0, MAX_SCENARIOS_IN_PROMPT).map((t) => `- ${t}`),
    "SCENARIO RULES:",
    "- Scenarios are inspiration to make content specific; they are optional.",
    "- ROTATE scenarios across content; do not reuse the same one every time.",
    "- Adapt a scenario to the topic/angle; never copy it verbatim as a claim.",
    "- Never invent facts; a scenario is a situation, not a proof or guarantee.",
  ].join("\n");
}

// Phase 2E — embeds the Anti-Repetition Memory (recent hooks/topics/CTAs/
// scenarios) and an explicit NEOPAKUJ instruction. Returns "" when the memory is
// empty (brand-new project), so callers can skip an empty block.
function memorySection(label: string, values: string[]): string[] {
  if (values.length === 0) return [];
  return [`${label}:`, ...values.map((v) => `- ${v}`)];
}

export function antiRepetitionBlock(memory: AntiRepetitionMemory): string {
  const sections = [
    ...memorySection("Hooks", memory.hooks),
    ...memorySection("Topics", memory.topics),
    ...memorySection("CTAs", memory.ctas),
    ...memorySection("Scenarios", memory.scenarios),
  ];
  if (sections.length === 0) return "";

  return [
    "ANTI-REPETITION MEMORY (recently used — AVOID REPEATING these):",
    ...sections,
    "ANTI-REPETITION RULES:",
    "- Do NOT reuse any hook above; write a clearly different opening.",
    "- Do NOT reuse any CTA above verbatim; vary the wording and angle.",
    "- Do NOT repeat the topics/angles above.",
    "- Do NOT reuse the scenarios above; choose a different situation.",
    "- Only repeat something if there is a strong, specific reason to.",
  ].join("\n");
}
