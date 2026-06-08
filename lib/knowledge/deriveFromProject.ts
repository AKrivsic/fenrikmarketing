import type { Json, Project } from "@/lib/supabase/types";
import { emptyKnowledge, type ProjectKnowledge } from "@/lib/knowledge/types";

// Task 8 — backward compatibility. Builds a ProjectKnowledge block from the
// existing Project Brain columns for projects created before Knowledge Model V2.
// All four cards are marked "approved" (source "manual") because the brain data
// was already curated. This is a read/display projection; it does NOT modify the
// brain columns. Proof has no brain column, so it starts empty.
export function deriveKnowledgeFromProject(project: Project): ProjectKnowledge {
  const knowledge = emptyKnowledge("approved", "manual");

  knowledge.cards.product.product_is = [...project.product_is];
  knowledge.cards.product.product_is_not = [...project.product_is_not];
  knowledge.cards.product.product_strengths = [...project.product_strengths];

  knowledge.cards.customer.target_audience = collectStrings(
    project.target_audience,
  );
  knowledge.cards.customer.pain_points = [...project.pain_points];

  knowledge.cards.voice.tone = collectStrings(project.tone_of_voice);
  knowledge.cards.voice.forbidden_claims = [...project.forbidden_claims];

  // Proof has no brain column today — leave it empty (still "approved" so the
  // existing project counts as Ready without manual work).
  knowledge.cards.proof.statements = [];

  return knowledge;
}

// Flattens all non-empty string leaves of a free-form jsonb value into a list,
// so an arbitrary target_audience / tone_of_voice object renders as editable
// lines. Best-effort and lossy by design (display only).
export function collectStrings(value: Json | null | undefined): string[] {
  const out: string[] = [];
  walk(value, out);
  return out;
}

function walk(value: Json | null | undefined, out: string[]): void {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) out.push(trimmed);
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    out.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) walk(entry, out);
    return;
  }
  for (const entry of Object.values(value)) {
    walk(entry as Json, out);
  }
}
