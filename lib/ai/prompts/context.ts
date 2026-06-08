import type { Project } from "@/lib/supabase/types";
import type { AntiRepetitionMemory } from "@/lib/ai/types";
import { parseProjectKnowledge } from "@/lib/knowledge/types";

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
