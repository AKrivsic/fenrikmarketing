import type { Json } from "@/lib/supabase/types";
import type { TextProvider } from "@/lib/ai/types";
import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  buildGenerateScenariosPrompt,
  GENERATE_SCENARIOS_SYSTEM,
} from "@/lib/ai/prompts/generateScenarios";
import {
  generateScenariosSchema,
  type GenerateScenariosOutput,
} from "@/lib/ai/schemas/generateScenarios";
import type { WorkflowResult } from "@/lib/ai/workflows/shared";
import { getProjectForAdmin, updateProjectForAdmin } from "@/lib/api/projects-admin";
import { deriveKnowledgeFromProject } from "@/lib/knowledge/deriveFromProject";
import {
  mergeScenarios,
  parseProjectKnowledge,
  type ProjectKnowledge,
  type Scenario,
} from "@/lib/knowledge/types";

// The Scenario Pool stays topped up to at least this many entries. Below it,
// refill kicks in (Task 4). Initial generation (Task 3) sees an empty pool.
export const MIN_SCENARIOS = 5;
// Hard cap on how many scenarios a single generation run contributes.
const MAX_SCENARIOS_PER_RUN = 10;

export interface GenerateScenariosInput {
  language: string;
  productIs: string[];
  productStrengths: string[];
  targetAudience: string[];
  painPoints: string[];
  proof: string[];
  existingScenarios: string[];
}

export interface GenerateScenariosDeps {
  textProvider?: TextProvider;
}

// Pure AI step (no DB): from the project's Product / Customer / Proof knowledge
// it returns 5–10 validated scenarios. Mirrors the other workflows — it does
// not touch the database. The orchestration below wires it to persistence.
export async function runGenerateScenarios(
  input: GenerateScenariosInput,
  deps: GenerateScenariosDeps = {},
): Promise<WorkflowResult<GenerateScenariosOutput>> {
  const textProvider = deps.textProvider ?? getCopywritingProvider();

  const generated = await generateValidatedJson({
    textProvider,
    system: GENERATE_SCENARIOS_SYSTEM,
    prompt: buildGenerateScenariosPrompt(input),
    validator: generateScenariosSchema,
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

export interface ScenarioPoolResult {
  ok: boolean;
  // How many NEW scenarios were persisted (after dedup). 0 is valid.
  added: number;
  reason?: string;
}

// Combines the project's proof knowledge into a flat list for the prompt.
function proofTexts(knowledge: ProjectKnowledge): string[] {
  const texts: string[] = [];
  for (const statement of knowledge.cards.proof.statements) texts.push(statement);
  for (const statement of knowledge.cards.proof.asset_statements) {
    texts.push(statement.text);
  }
  return texts;
}

// Task 3 + Task 4 — keeps the Scenario Pool at >= MIN_SCENARIOS. Called after
// onboarding completes (initial generation from an empty pool) and before
// content planning (refill when the pool has dropped below the minimum). It
// only ever APPENDS deduplicated scenarios; it never overwrites or removes any.
// NEVER throws: any failure is swallowed into a result so the caller (knowledge
// approval, weekly strategy) cannot break.
export async function ensureScenarioPool(
  projectId: string,
): Promise<ScenarioPoolResult> {
  try {
    return await runEnsureScenarioPool(projectId);
  } catch {
    return { ok: false, added: 0, reason: "unexpected_error" };
  }
}

async function runEnsureScenarioPool(
  projectId: string,
): Promise<ScenarioPoolResult> {
  const project = await getProjectForAdmin(projectId);
  if (!project) {
    return { ok: false, added: 0, reason: "project_not_found" };
  }

  const knowledge: ProjectKnowledge =
    parseProjectKnowledge(project.knowledge) ??
    deriveKnowledgeFromProject(project);

  // Already sufficient — no AI call (initial: pool empty; refill: pool < MIN).
  if (knowledge.scenarios.length >= MIN_SCENARIOS) {
    return { ok: true, added: 0, reason: "pool_sufficient" };
  }

  const result = await runGenerateScenarios({
    language: project.language,
    productIs: knowledge.cards.product.product_is,
    productStrengths: knowledge.cards.product.product_strengths,
    targetAudience: knowledge.cards.customer.target_audience,
    painPoints: knowledge.cards.customer.pain_points,
    proof: proofTexts(knowledge),
    existingScenarios: knowledge.scenarios.map((s) => s.text),
  });
  if (!result.ok) {
    return { ok: false, added: 0, reason: "generation_failed" };
  }

  const now = new Date().toISOString();
  const incoming: Scenario[] = result.data.scenarios
    .slice(0, MAX_SCENARIOS_PER_RUN)
    .map((s) => ({
      text: s.text.trim(),
      source: "generated" as const,
      created_at: now,
    }))
    .filter((s) => s.text.length > 0);

  if (incoming.length === 0) {
    return { ok: true, added: 0, reason: "no_scenarios_generated" };
  }

  const { merged, added } = mergeScenarios(knowledge.scenarios, incoming);
  if (added === 0) {
    return { ok: true, added: 0, reason: "all_duplicates" };
  }

  knowledge.scenarios = merged;
  await updateProjectForAdmin(projectId, {
    knowledge: knowledge as unknown as Json,
  });

  return { ok: true, added };
}
