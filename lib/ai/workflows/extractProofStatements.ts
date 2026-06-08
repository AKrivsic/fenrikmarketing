import type { Asset, Json } from "@/lib/supabase/types";
import type { TextProvider } from "@/lib/ai/types";
import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  buildExtractProofStatementsPrompt,
  EXTRACT_PROOF_STATEMENTS_SYSTEM,
} from "@/lib/ai/prompts/extractProofStatements";
import {
  extractProofStatementsSchema,
  type ExtractProofStatementsOutput,
} from "@/lib/ai/schemas/extractProofStatements";
import type { WorkflowResult } from "@/lib/ai/workflows/shared";
import { getProjectForAdmin, updateProjectForAdmin } from "@/lib/api/projects-admin";
import { deriveKnowledgeFromProject } from "@/lib/knowledge/deriveFromProject";
import {
  mergeProofStatements,
  parseProjectKnowledge,
  type ProjectKnowledge,
  type ProofStatement,
} from "@/lib/knowledge/types";

// Max proof statements stored per asset (Task 2 spec: 0–5).
const MAX_PROOF_STATEMENTS = 5;

export interface ExtractProofStatementsInput {
  assetTitle: string;
  aiDescription: string | null;
  extractedText: string | null;
  language: string;
}

export interface ExtractProofStatementsDeps {
  textProvider?: TextProvider;
}

// Pure AI step (no DB): from a trust asset's metadata it returns 0–5 validated
// proof statements. Mirrors the other workflows — it does not touch the
// database. The orchestration below wires it to persistence.
export async function runExtractProofStatements(
  input: ExtractProofStatementsInput,
  deps: ExtractProofStatementsDeps = {},
): Promise<WorkflowResult<ExtractProofStatementsOutput>> {
  const textProvider = deps.textProvider ?? getCopywritingProvider();

  const generated = await generateValidatedJson({
    textProvider,
    system: EXTRACT_PROOF_STATEMENTS_SYSTEM,
    prompt: buildExtractProofStatementsPrompt(input),
    validator: extractProofStatementsSchema,
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

// Reads a string field from the free-form assets.metadata jsonb.
function readMetadataString(metadata: Json, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export interface ProofExtractionResult {
  ok: boolean;
  // How many NEW proof statements were persisted (after dedup). 0 is valid.
  added: number;
  reason?: string;
}

// Orchestration triggered after a trust asset is analyzed (Task 3). Runs the
// extraction, then APPENDS the new statements to the project's Proof pool inside
// projects.knowledge (Task 4), deduplicating against the existing pool. Never
// overwrites or removes existing proof. NEVER throws: any failure is swallowed
// into a result so asset analysis cannot break.
export async function extractAndPersistProofStatements(
  asset: Asset,
): Promise<ProofExtractionResult> {
  try {
    return await runProofExtractionForAsset(asset);
  } catch {
    return { ok: false, added: 0, reason: "unexpected_error" };
  }
}

async function runProofExtractionForAsset(
  asset: Asset,
): Promise<ProofExtractionResult> {
  const project = await getProjectForAdmin(asset.project_id);
  if (!project) {
    return { ok: false, added: 0, reason: "project_not_found" };
  }

  const knowledgeForGuard: ProjectKnowledge =
    parseProjectKnowledge(project.knowledge) ??
    deriveKnowledgeFromProject(project);

  // Idempotent per asset: once this asset has contributed asset_statements, do
  // not call AI again (wording from the model is non-deterministic).
  if (hasProofStatementsForAsset(knowledgeForGuard, asset.id)) {
    return { ok: true, added: 0, reason: "already_extracted" };
  }

  const aiDescription = readMetadataString(asset.metadata, "ai_description");
  const extractedText = readMetadataString(asset.metadata, "extracted_text");

  // Nothing usable to extract from — skip the AI call entirely.
  if (!aiDescription && !extractedText) {
    return { ok: false, added: 0, reason: "no_source_text" };
  }

  const result = await runExtractProofStatements({
    assetTitle: asset.title,
    aiDescription,
    extractedText,
    language: project.language,
  });
  if (!result.ok) {
    return { ok: false, added: 0, reason: "generation_failed" };
  }

  const now = new Date().toISOString();
  const incoming: ProofStatement[] = result.data.statements
    .slice(0, MAX_PROOF_STATEMENTS)
    .map((s) => ({
      text: s.text.trim(),
      source_asset_id: asset.id,
      confidence: s.confidence,
      created_at: now,
    }))
    .filter((s) => s.text.length > 0);

  if (incoming.length === 0) {
    return { ok: true, added: 0, reason: "no_proof_found" };
  }

  const knowledge: ProjectKnowledge = knowledgeForGuard;

  const { merged, added } = mergeProofStatements(
    knowledge.cards.proof.asset_statements,
    knowledge.cards.proof.statements,
    incoming,
  );

  if (added === 0) {
    return { ok: true, added: 0, reason: "all_duplicates" };
  }

  knowledge.cards.proof.asset_statements = merged;
  await updateProjectForAdmin(asset.project_id, {
    knowledge: knowledge as unknown as Json,
  });

  return { ok: true, added };
}

function hasProofStatementsForAsset(
  knowledge: ProjectKnowledge,
  assetId: string,
): boolean {
  return knowledge.cards.proof.asset_statements.some(
    (statement) => statement.source_asset_id === assetId,
  );
}
