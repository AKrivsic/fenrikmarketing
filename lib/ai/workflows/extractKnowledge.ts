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
import { FetchUrlError, fetchUrlText } from "@/lib/knowledge/fetchUrlText";
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

const LOG_PREFIX = "[knowledge-extraction]";

function logStart(payload: {
  project_id: string;
  project_name: string;
  source_url: string | null;
  started_at: string;
}): void {
  console.log(`${LOG_PREFIX} START`, payload);
}

function logSuccess(payload: {
  project_id: string;
  duration_ms: number;
  extracted: true;
}): void {
  console.log(`${LOG_PREFIX} SUCCESS`, payload);
}

function logFailure(payload: {
  project_id: string;
  duration_ms: number;
  extracted: false;
  reason: string;
  error?: string;
}): void {
  console.error(`${LOG_PREFIX} FAILURE`, payload);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function applyExtractionFailureMeta(
  knowledge: ProjectKnowledge,
  reason: string,
  error: string | null,
): void {
  const at = new Date().toISOString();
  knowledge.extraction_status = "failed";
  knowledge.last_extraction_reason = reason;
  knowledge.last_extraction_error = error;
  knowledge.last_extraction_at = at;
}

function applyExtractionSuccessMeta(knowledge: ProjectKnowledge): void {
  const at = new Date().toISOString();
  knowledge.extraction_status = "success";
  knowledge.last_extraction_reason = null;
  knowledge.last_extraction_error = null;
  knowledge.last_extraction_at = at;
}

async function persistKnowledge(
  projectId: string,
  knowledge: ProjectKnowledge,
): Promise<void> {
  await updateProjectForAdmin(projectId, {
    knowledge: knowledge as unknown as Json,
  });
}

async function persistExtractionFailure(
  projectId: string,
  base: ProjectKnowledge | null,
  sourceUrl: string | null,
  reason: string,
  error: string | null,
): Promise<void> {
  const knowledge =
    base ?? emptyKnowledge("proposed", "url", sourceUrl);
  if (sourceUrl && !knowledge.source_url) {
    knowledge.source_url = sourceUrl;
  }
  applyExtractionFailureMeta(knowledge, reason, error);
  await persistKnowledge(projectId, knowledge);
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

  applyExtractionSuccessMeta(knowledge);

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
  error?: string;
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

  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const project = await getProjectForAdmin(projectId);
  if (!project) {
    throw new WorkflowError("not_found", `project ${projectId} not found`);
  }

  const existing = parseProjectKnowledge(project.knowledge);
  const sourceUrl = existing?.source_url ?? null;

  logStart({
    project_id: projectId,
    project_name: project.name,
    source_url: sourceUrl,
    started_at: startedAt,
  });

  const finishFailure = async (
    reason: string,
    error: string | null,
  ): Promise<ProjectKnowledgeExtractionResult> => {
    const duration_ms = Date.now() - t0;
    try {
      await persistExtractionFailure(
        projectId,
        existing,
        sourceUrl,
        reason,
        error,
      );
    } catch (persistErr) {
      logFailure({
        project_id: projectId,
        duration_ms,
        extracted: false,
        reason: "persist_failed",
        error: errorMessage(persistErr),
      });
      throw persistErr;
    }
    logFailure({
      project_id: projectId,
      duration_ms,
      extracted: false,
      reason,
      ...(error ? { error } : {}),
    });
    return { ok: false, extracted: false, reason, ...(error ? { error } : {}) };
  };

  if (!sourceUrl) {
    return finishFailure("no_source_url", null);
  }

  let text: string;
  try {
    text = await fetchUrlText(sourceUrl);
  } catch (err) {
    const message =
      err instanceof FetchUrlError ? err.message : errorMessage(err);
    return finishFailure("fetch_failed", message);
  }

  let result: WorkflowResult<ExtractKnowledgeOutput>;
  try {
    result = await runExtractKnowledge({ project, text });
  } catch (err) {
    return finishFailure("extraction_error", errorMessage(err));
  }

  if (!result.ok) {
    const detail =
      result.validationErrors?.length &&
      result.validationErrors
        .slice(0, 3)
        .map((issue) => issue.message)
        .join("; ");
    return finishFailure("generation_failed", detail || null);
  }

  const knowledge = buildProposedKnowledge(result.data, sourceUrl);
  try {
    await persistKnowledge(projectId, knowledge);
  } catch (err) {
    const duration_ms = Date.now() - t0;
    const message = errorMessage(err);
    logFailure({
      project_id: projectId,
      duration_ms,
      extracted: false,
      reason: "persist_failed",
      error: message,
    });
    throw err;
  }

  logSuccess({
    project_id: projectId,
    duration_ms: Date.now() - t0,
    extracted: true,
  });

  return { ok: true, extracted: true };
}
