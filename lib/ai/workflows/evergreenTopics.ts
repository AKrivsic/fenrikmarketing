import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { getEvergreenProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  buildEvergreenTopicGenerationPrompt,
  EVERGREEN_SYSTEM,
} from "@/lib/ai/prompts/evergreenTopicGeneration";
import {
  evergreenTopicsSchema,
  type EvergreenTopicItem,
} from "@/lib/ai/schemas/evergreenTopic";
import {
  loadProjectOrThrow,
  type WorkflowResult,
} from "@/lib/ai/workflows/shared";

export interface GenerateEvergreenTopicsInput {
  projectId: string;
  count?: number;
  pillar?: string | null;
}

export interface EvergreenTopicsData {
  topicIds: string[];
  topics: EvergreenTopicItem[];
}

const DEFAULT_COUNT = 5;
const MAX_COUNT = 20;

export async function runGenerateEvergreenTopics(
  input: GenerateEvergreenTopicsInput,
): Promise<WorkflowResult<EvergreenTopicsData>> {
  const { projectId } = input;
  const count = Math.min(Math.max(input.count ?? DEFAULT_COUNT, 1), MAX_COUNT);

  const supabase = await createSupabaseServerClient();
  const project = await loadProjectOrThrow(supabase, projectId);

  const { data: existing, error: exErr } = await supabase
    .from("evergreen_topics")
    .select("title")
    .eq("project_id", projectId);
  if (exErr) throw exErr;
  const existingTitles = (existing ?? []).map((t) => t.title as string);

  const generated = await generateValidatedJson({
    textProvider: getEvergreenProvider(),
    system: EVERGREEN_SYSTEM,
    prompt: buildEvergreenTopicGenerationPrompt({
      project,
      count,
      pillar: input.pillar ?? null,
      existingTitles,
    }),
    validator: evergreenTopicsSchema,
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
    };
  }

  const topics = generated.value.topics;
  const rows = topics.map((t) => ({
    project_id: projectId,
    title: t.title,
    angle: t.angle,
    pillar: t.pillar,
    keywords: t.keywords,
    audience_stage: t.audience_stage ?? null,
    metadata: {} as unknown as Json,
  }));

  const { data: inserted, error: insErr } = await supabase
    .from("evergreen_topics")
    .insert(rows)
    .select("id");
  if (insErr) throw insErr;

  return {
    ok: true,
    data: {
      topicIds: (inserted ?? []).map((r) => r.id as string),
      topics,
    },
  };
}
