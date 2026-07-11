"use server";

import { revalidatePath } from "next/cache";
import { runProjectKnowledgeExtraction } from "@/lib/ai/workflows/extractKnowledge";
import { getProjectForAdmin, updateProjectForAdmin } from "@/lib/api/projects-admin";
import { compileCardToBrain } from "@/lib/knowledge/compile";
import { deriveKnowledgeFromProject } from "@/lib/knowledge/deriveFromProject";
import { ensureScenarioPool } from "@/lib/ai/workflows/generateScenarios";
import {
  CARD_FIELDS,
  isKnowledgeReady,
  KNOWLEDGE_CARD_KEYS,
  parseProjectKnowledge,
  type KnowledgeCardKey,
  type ProjectKnowledge,
} from "@/lib/knowledge/types";
import type { Json, ProjectUpdate } from "@/lib/supabase/types";
import {
  mergePresentationIntoKnowledge,
  validatePresentationSave,
} from "@/lib/voice/presentationSettings";
import {
  mergeVisualProfileIntoKnowledge,
  validateVisualProfileSave,
} from "@/lib/visual-profile/presentationVisualProfile";

export type KnowledgeActionResult =
  | { ok: true; ready: boolean }
  | { ok: false; error: string };

export type RegenerateKnowledgeResult =
  | { ok: true }
  | { ok: false; error: string; reason?: string };

function fail(error: string): KnowledgeActionResult {
  return { ok: false, error };
}

function isCardKey(value: string): value is KnowledgeCardKey {
  return (KNOWLEDGE_CARD_KEYS as readonly string[]).includes(value);
}

// Splits a textarea into a string[] — one trimmed item per non-empty line.
function parseLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// Loads the project's knowledge, deriving it from the brain columns when the
// jsonb block is still empty (legacy projects). Always returns a full object.
async function loadKnowledge(
  projectId: string,
): Promise<ProjectKnowledge | null> {
  const project = await getProjectForAdmin(projectId);
  if (!project) return null;
  return parseProjectKnowledge(project.knowledge) ?? deriveKnowledgeFromProject(project);
}

// Edit: overwrites the editable fields of a single card and resets it to
// "proposed" (an edited card must be re-approved before it counts as Ready and
// is recompiled into the brain). Does NOT touch the brain columns.
export async function updateKnowledgeCard(
  projectId: string,
  cardKey: string,
  rawFields: Record<string, string>,
): Promise<KnowledgeActionResult> {
  if (!projectId) return fail("Chybí identifikátor projektu.");
  if (!isCardKey(cardKey)) return fail("Neplatná karta.");

  const knowledge = await loadKnowledge(projectId);
  if (!knowledge) return fail("Projekt nebyl nalezen.");

  const card = knowledge.cards[cardKey] as unknown as Record<string, unknown>;
  for (const field of CARD_FIELDS[cardKey]) {
    card[field] = parseLines(rawFields[field] ?? "");
  }
  card.status = "proposed";

  try {
    await updateProjectForAdmin(projectId, {
      knowledge: knowledge as unknown as Json,
    });
    revalidatePath(`/projects/${projectId}/knowledge`);
    return { ok: true, ready: isKnowledgeReady(knowledge) };
  } catch {
    return fail("Uložení změn se nezdařilo.");
  }
}

// Approve: marks a card "approved" and compiles it into the existing Project
// Brain columns (Product/Customer/Voice). Proof stays only in knowledge.
export async function approveKnowledgeCard(
  projectId: string,
  cardKey: string,
): Promise<KnowledgeActionResult> {
  if (!projectId) return fail("Chybí identifikátor projektu.");
  if (!isCardKey(cardKey)) return fail("Neplatná karta.");

  const knowledge = await loadKnowledge(projectId);
  if (!knowledge) return fail("Projekt nebyl nalezen.");

  knowledge.cards[cardKey].status = "approved";

  const update: ProjectUpdate = {
    ...compileCardToBrain(knowledge, cardKey),
    knowledge: knowledge as unknown as Json,
  };

  try {
    await updateProjectForAdmin(projectId, update);

    // Task 3 — onboarding is complete once the last card is approved. If the
    // Scenario Pool is still empty, generate the first set now. ensureScenarioPool
    // never throws and no-ops when the pool already has enough scenarios, so a
    // failed generation cannot break card approval.
    const ready = isKnowledgeReady(knowledge);
    if (ready) {
      await ensureScenarioPool(projectId);
    }

    revalidatePath(`/projects/${projectId}/knowledge`);
    return { ok: true, ready };
  } catch {
    return fail("Schválení se nezdařilo.");
  }
}

export async function updateProjectPresentationVoice(
  projectId: string,
  input: {
    voiceSelection: string;
    ttsInstructions: string;
    visualProfileSelection?: string;
  },
): Promise<KnowledgeActionResult> {
  if (!projectId) return fail("Chybí identifikátor projektu.");

  const validated = validatePresentationSave(input);
  if (!validated.ok) return fail(validated.error);

  const profileValidated = validateVisualProfileSave({
    visualProfileSelection: input.visualProfileSelection ?? "auto",
  });
  if (!profileValidated.ok) return fail(profileValidated.error);

  const project = await getProjectForAdmin(projectId);
  if (!project) return fail("Projekt nebyl nalezen.");

  let knowledge = mergePresentationIntoKnowledge(
    (project.knowledge ?? {}) as Json,
    validated.presentation,
  );
  knowledge = mergeVisualProfileIntoKnowledge(
    knowledge,
    profileValidated.choice,
  );

  try {
    await updateProjectForAdmin(projectId, { knowledge });
    revalidatePath(`/projects/${projectId}/knowledge`);
    const readyKnowledge = await loadKnowledge(projectId);
    return {
      ok: true,
      ready: readyKnowledge ? isKnowledgeReady(readyKnowledge) : false,
    };
  } catch {
    return fail("Uložení hlasu se nezdařilo.");
  }
}

export async function regenerateProjectKnowledge(
  projectId: string,
): Promise<RegenerateKnowledgeResult> {
  if (!projectId) return { ok: false, error: "Chybí identifikátor projektu." };

  try {
    const result = await runProjectKnowledgeExtraction(projectId);
    revalidatePath(`/projects/${projectId}/knowledge`);

    if (!result.extracted) {
      const reason = result.reason ?? "unknown";
      const detail = result.error?.trim();
      return {
        ok: false,
        reason,
        error: detail
          ? `Extrakce selhala (${reason}): ${detail}`
          : `Extrakce selhala (${reason}).`,
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
