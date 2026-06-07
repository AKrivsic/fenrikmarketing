import type { Project } from "@/lib/supabase/types";

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
