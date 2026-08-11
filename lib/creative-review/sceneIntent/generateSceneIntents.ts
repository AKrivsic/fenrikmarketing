/**
 * AI Scene Creative Intent conversion.
 *
 * Converts technical visual-plan / prompt material into short human creative
 * descriptions (what happens / idea / purpose). Never returns camera/lens/
 * lighting/composition instructions as the primary intent.
 */

import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { TextProvider } from "@/lib/ai/types";
import { getCopywritingProvider } from "@/lib/ai/index";
import { generateValidatedJson } from "@/lib/ai/runWithRepair";
import {
  vArray,
  vNonEmptyString,
  vNumber,
  vObject,
  type Validator,
} from "@/lib/ai/validateAiOutput";
import { type WorkflowResult } from "@/lib/ai/workflows/shared";
import {
  collectSceneIntentConversionSourcesFromPackage,
  type SceneIntentConversionSource,
} from "@/lib/creative-review/sceneIntent/seedFromPackageScenes";
import type { CreativeReviewScene } from "@/lib/creative-review/types";

const sceneIntentBatchSchema = vObject({
  scenes: vArray(
    vObject({
      index: vNumber({ min: 0 }),
      intent: vNonEmptyString(),
    }),
  ),
}) as Validator<{ scenes: Array<{ index: number; intent: string }> }>;

const SCENE_INTENT_SYSTEM = `You convert technical video scene material into short Creative Intent for non-technical editors.

Rules:
- Describe what happens, the idea, and the purpose of the scene.
- Write 1–2 plain sentences. Be concise.
- Do NOT mention camera, lens, lighting, composition, framing, rendering, prompts, or style jargon.
- Do NOT invent product claims that are not implied by the source.
- Keep the same language as the source material when the source is already localized copy; otherwise write clear natural language matching the source language.
- Output JSON only: { "scenes": [ { "index": 0, "intent": "..." } ] }`;

export interface GenerateSceneCreativeIntentsDeps {
  textProvider?: TextProvider;
}

export interface GenerateSceneCreativeIntentsResult {
  scenes: CreativeReviewScene[];
}

function buildScenesFromIntents(
  sources: SceneIntentConversionSource[],
  byIndex: Map<number, string>,
): CreativeReviewScene[] {
  return sources.map((source) => {
    const intentText =
      byIndex.get(source.index)?.trim() ||
      "The scene advances the story for this beat.";
    return {
      id: source.id,
      index: source.index,
      intent: {
        original: intentText,
        localized_edit: intentText,
        english_preview: null,
        english_preview_outdated: true,
        presentation_type: source.presentation_type,
        visual_source: source.visual_source,
        asset_id: source.asset_id,
        used_as: source.used_as,
      },
      director_notes: "",
    };
  });
}

/**
 * Generate human Scene Creative Intent for every package scene via Claude.
 */
export async function generateSceneCreativeIntents(
  pkg: Pick<ContentPackageOutput, "visual_scenes" | "image_prompts" | "title" | "hook">,
  deps: GenerateSceneCreativeIntentsDeps = {},
): Promise<WorkflowResult<GenerateSceneCreativeIntentsResult>> {
  const sources = collectSceneIntentConversionSourcesFromPackage(pkg);
  if (sources.length === 0) {
    return { ok: true, data: { scenes: [] } };
  }

  const textProvider = deps.textProvider ?? getCopywritingProvider();
  const sceneBlocks = sources
    .map((source) =>
      [
        `SCENE ${source.index + 1}`,
        `id: ${source.id}`,
        `presentation_type: ${source.presentation_type ?? "unknown"}`,
        `visual_source: ${source.visual_source}`,
        "TECHNICAL SOURCE (do not copy as intent):",
        source.technical_source,
      ].join("\n"),
    )
    .join("\n\n");

  const generated = await generateValidatedJson({
    textProvider,
    system: SCENE_INTENT_SYSTEM,
    prompt: [
      "Convert each scene's technical source into a short Creative Intent.",
      "",
      `Package title: ${pkg.title?.trim() || "(untitled)"}`,
      `Package hook: ${pkg.hook?.trim() || "(none)"}`,
      "",
      "Return one intent per scene index.",
      "",
      sceneBlocks,
      "",
      'Return JSON: { "scenes": [ { "index": 0, "intent": "..." } ] }',
    ].join("\n"),
    validator: sceneIntentBatchSchema,
    telemetry: {
      stepName: "Creative Review Scene Intent Generation",
      inputSummary: `Generate human Scene Intent for ${sources.length} scenes`,
    },
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: "generation_failed",
      validationErrors: generated.validationErrors,
      attempts: generated.attempts,
    };
  }

  const byIndex = new Map<number, string>();
  for (const row of generated.value.scenes) {
    byIndex.set(row.index, row.intent.trim());
  }

  for (const source of sources) {
    if (!byIndex.get(source.index)?.trim()) {
      throw new Error(
        `Scene Intent missing for scene index ${source.index}`,
      );
    }
  }

  return {
    ok: true,
    data: { scenes: buildScenesFromIntents(sources, byIndex) },
  };
}
