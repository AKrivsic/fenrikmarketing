import type { Project, Json } from "@/lib/supabase/types";
import type { TextProvider } from "@/lib/ai/types";
import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  buildExtractKnowledgePrompt,
  EXTRACT_KNOWLEDGE_SYSTEM,
} from "@/lib/ai/prompts/extractKnowledge";
import {
  extractKnowledgeSchema,
  type ExtractKnowledgeOutput,
} from "@/lib/ai/schemas/extractKnowledge";
import { WorkflowError, type WorkflowResult } from "@/lib/ai/workflows/shared";
import { getProjectForAdmin, updateProjectForAdmin } from "@/lib/api/projects-admin";
import { fetchUrlText } from "@/lib/knowledge/fetchUrlText";
import {
  emptyKnowledge,
  parseProjectKnowledge,
  type ProjectKnowledge,
} from "@/lib/knowledge/types";

export interface ExtractKnowledgeInput {
  project: Project;
  text: string;
}

export interface ExtractKnowledgeDeps {
  textProvider?: TextProvider;
}

// Pure AI step (DB-agnostic): given a project + website text it returns the four
// validated knowledge cards. Mirrors localizeContentPackageForLanguage — it does
// not touch the database. The orchestration below wires it to persistence.
export async function runExtractKnowledge(
  input: ExtractKnowledgeInput,
  deps: ExtractKnowledgeDeps = {},
): Promise<WorkflowResult<ExtractKnowledgeOutput>> {
  const { project, text } = input;

  if (!text || text.trim().length === 0) {
    throw new WorkflowError("invalid_input", "website text is required");
  }

  const textProvider = deps.textProvider ?? getCopywritingProvider();

  const generated = await generateValidatedJson({
    textProvider,
    system: EXTRACT_KNOWLEDGE_SYSTEM,
    prompt: buildExtractKnowledgePrompt({ project, text }),
    validator: extractKnowledgeSchema,
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
    };
  }

  return { ok: true, data: generated.value };
}

// Builds a "proposed" ProjectKnowledge block (source "url") from the AI output.
// Empty arrays from the model are preserved; the user fills/edits before approve.
export function buildProposedKnowledge(
  output: ExtractKnowledgeOutput,
  sourceUrl: string | null,
): ProjectKnowledge {
  const knowledge = emptyKnowledge("proposed", "url", sourceUrl);
  knowledge.extracted_at = new Date().toISOString();

  knowledge.cards.product.product_is = clean(output.product.product_is);
  knowledge.cards.product.product_is_not = clean(output.product.product_is_not);
  knowledge.cards.product.product_strengths = clean(
    output.product.product_strengths,
  );
  knowledge.cards.customer.target_audience = clean(
    output.customer.target_audience,
  );
  knowledge.cards.customer.pain_points = clean(output.customer.pain_points);
  knowledge.cards.voice.tone = clean(output.voice.tone);
  knowledge.cards.voice.forbidden_claims = clean(output.voice.forbidden_claims);
  knowledge.cards.proof.statements = clean(output.proof.statements);

  return knowledge;
}

function clean(values: string[]): string[] {
  return values.map((v) => v.trim()).filter((v) => v.length > 0);
}

export interface ProjectKnowledgeExtractionResult {
  ok: boolean;
  // Whether a fresh proposal was written. False means the URL/text/AI step
  // failed and the project keeps its previous knowledge (e.g. empty proposal).
  extracted: boolean;
  reason?: string;
}

// Orchestration used by the onboarding action and POST /api/ai/extract-knowledge.
// Loads the project, reads its stored source_url, fetches the page text, runs the
// extraction and persists the proposal into projects.knowledge. Network / AI
// failures are swallowed into a result (never thrown) so the onboarding flow can
// always proceed to the Approve Cards screen; only hard errors (missing project)
// throw a WorkflowError.
export async function runProjectKnowledgeExtraction(
  projectId: string,
): Promise<ProjectKnowledgeExtractionResult> {
  if (!projectId) throw new WorkflowError("invalid_input", "project_id is required");

  const project = await getProjectForAdmin(projectId);
  if (!project) {
    throw new WorkflowError("not_found", `project ${projectId} not found`);
  }

  const existing = parseProjectKnowledge(project.knowledge);
  const sourceUrl = existing?.source_url ?? null;
  if (!sourceUrl) {
    return { ok: false, extracted: false, reason: "no_source_url" };
  }

  let text: string;
  try {
    text = await fetchUrlText(sourceUrl);
  } catch {
    return { ok: false, extracted: false, reason: "fetch_failed" };
  }

  const result = await runExtractKnowledge({ project, text });
  if (!result.ok) {
    return { ok: false, extracted: false, reason: "generation_failed" };
  }

  const knowledge = buildProposedKnowledge(result.data, sourceUrl);
  await updateProjectForAdmin(projectId, {
    knowledge: knowledge as unknown as Json,
  });

  return { ok: true, extracted: true };
}
