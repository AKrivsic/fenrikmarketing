// Phase 5 — controlled CHECKLIST generation (schema, prompt, guardrails).
//   npm run check:checklist-generation

import assert from "node:assert/strict";
import { buildContentPackageSchema } from "@/lib/ai/schemas/contentPackage";
import { buildPresentationGenerationBlock } from "@/lib/ai/prompts/presentationGeneration";
import { generatedVisualSceneEntryValidator } from "@/lib/content-package/generatedVisualScene";
import { normalizeVisualScenePlan } from "@/lib/content-package/visualScenePlan";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import { deriveProjectPresentationSignals } from "@/lib/scene-types/presentation/projectSignals";
import { applyChecklistFrequencyToPackage } from "@/lib/scene-types/presentation/checklistFrequencyGuardrail";
import { derivePromptPresentationTypes } from "@/lib/scene-types/presentation/promptPresentationTypes";
import {
  resolveChecklistGenerationMode,
  shouldRenderChecklistScenes,
} from "@/lib/scene-types/checklistGenerationMode";
import { resetChecklistProductionRolloutCacheForTests } from "@/lib/scene-types/checklistProductionRollout";
import { compileVisualScenesToWorkerScenes } from "@/lib/scene-types/compileScenePlan";
import type { ContentPackageOutput } from "@/lib/ai/schemas/contentPackage";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project } from "@/lib/supabase/types";
import { emptyKnowledge } from "@/lib/knowledge/types";

let passed = 0;
let failed = 0;

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

const mockProject = {
  goal_type: "leads",
  product_is: ["Restaurant dining"],
  product_strengths: ["Fresh local ingredients"],
  knowledge: emptyKnowledge("approved", "manual"),
} as unknown as Project;

const ROLLOUT_TEST_PROJECT_ID = "11111111-1111-4111-8111-111111111111";

const mockSupabase = {} as SupabaseClient;

function basePkg(
  visual_scenes: ContentPackageOutput["visual_scenes"],
): ContentPackageOutput {
  return {
    title: "Test",
    funnel_stage: "Awareness",
    hook: "Hook line",
    voiceover_text:
      "Welcome to our kitchen. We serve fresh meals every day with care.",
    subtitles: "Fresh meals daily",
    cta: { type: "book", text: "Book a table" },
    video: { concept: "c", script: "s", duration_seconds: "20" },
    platform_outputs: {
      tiktok: { caption: "c", cta: "Book", hashtags: [] },
      instagram: { caption: "c", cta: "Book", hashtags: [] },
      youtube: { caption: "c", cta: "Book", hashtags: [] },
      x: { caption: "c", cta: "Book", hashtags: [] },
      google_business: { caption: "c", cta: "Book" },
      linkedin: { caption: "c", cta: "Book", hashtags: [] },
      facebook: { caption: "c", cta: "Book", hashtags: [] },
    },
    visual_scenes,
  };
}

async function main(): Promise<void> {
  await check("1 restaurant IMAGE-only package validates", () => {
    const pkg = basePkg([
      { source: "ai", image_prompt: "Cozy dining room" },
      { source: "ai", image_prompt: "Chef plating" },
    ]);
    const schema = buildContentPackageSchema(["tiktok"], { requireVideo: true });
    assert.equal(schema(pkg, "$").length, 0);
  });

  await check("3 cleaning tasks CHECKLIST validates", () => {
    const issues = generatedVisualSceneEntryValidator({
      type: "CHECKLIST",
      payload: {
        title: "Included",
        items: ["Deep clean floors", "Sanitize surfaces", "Fresh linens"],
      },
    });
    assert.equal(issues.length, 0);
  });

  await check("5 CTA rejected without headline", () => {
    const issues = generatedVisualSceneEntryValidator({
      type: "CTA",
      payload: { button_label: "Go" },
    });
    assert.ok(issues.length > 0);
  });

  await check("5b CTA accepted with headline", () => {
    const issues = generatedVisualSceneEntryValidator({
      type: "CTA",
      payload: { headline: "Book a demo" },
    });
    assert.equal(issues.length, 0);
  });

  await check("5c STATISTIC requires proof_id at generation", () => {
    const issues = generatedVisualSceneEntryValidator({
      type: "STATISTIC",
      payload: { value: "42", unit: "%", label: "growth" },
    });
    assert.ok(issues.length > 0);
  });

  await check("6 two CHECKLIST — second frequency downgrade", () => {
    const pkg = basePkg([
      { source: "ai", image_prompt: "Intro" },
      {
        type: "CHECKLIST",
        payload: { items: ["Step one", "Step two"] },
      },
      {
        type: "CHECKLIST",
        payload: { items: ["A", "B"] },
      },
    ] as ContentPackageOutput["visual_scenes"]);
    const decisions = applyChecklistFrequencyToPackage(pkg);
    assert.equal(decisions.length, 1);
    assert.equal(decisions[0]?.rule, "checklist_video_limit_exceeded");
  });

  await check("7 flag off — prompt IMAGE only", () => {
    const prevMode = process.env.CHECKLIST_GENERATION_MODE;
    const prevScene = process.env.SCENE_TYPES_ENABLED;
    const prevAllow = process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    process.env.CHECKLIST_GENERATION_MODE = "off";
    process.env.SCENE_TYPES_ENABLED = "false";
    delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    resetChecklistProductionRolloutCacheForTests();
    try {
      const types = derivePromptPresentationTypes({
        projectId: ROLLOUT_TEST_PROJECT_ID,
        project: mockProject,
      });
      assert.deepEqual(types, ["IMAGE"]);
      const block = buildPresentationGenerationBlock({ allowedTypes: types });
      assert.match(block, /may use IMAGE scenes only/);
    } finally {
      if (prevMode === undefined) delete process.env.CHECKLIST_GENERATION_MODE;
      else process.env.CHECKLIST_GENERATION_MODE = prevMode;
      if (prevScene === undefined) delete process.env.SCENE_TYPES_ENABLED;
      else process.env.SCENE_TYPES_ENABLED = prevScene;
      if (prevAllow === undefined) delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
      else process.env.CHECKLIST_ENABLED_PROJECT_IDS = prevAllow;
      resetChecklistProductionRolloutCacheForTests();
    }
  });

  await check("8 shadow — CHECKLIST becomes IMAGE", () => {
    const prevMode = process.env.CHECKLIST_GENERATION_MODE;
    const prevScene = process.env.SCENE_TYPES_ENABLED;
    const prevAllow = process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    process.env.CHECKLIST_GENERATION_MODE = "shadow";
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = ROLLOUT_TEST_PROJECT_ID;
    resetChecklistProductionRolloutCacheForTests();
    try {
      assert.equal(shouldRenderChecklistScenes(ROLLOUT_TEST_PROJECT_ID), false);
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "CHECKLIST",
            payload: { items: ["late booking", "wrong size", "missing deposit"] },
          },
        ],
        allowedSceneTypes: ["IMAGE", "CHECKLIST", "CTA"],
        voiceoverText:
          "Three mistakes: late booking, wrong size, missing deposit.",
        proof: buildProofIndex(null),
        projectSignals: deriveProjectPresentationSignals({
          project: { product_is: [], product_strengths: [] },
          assets: [],
        }),
        projectId: ROLLOUT_TEST_PROJECT_ID,
      });
      assert.equal(r.scenes[0]?.type, "IMAGE");
      assert.equal(r.decisions[0]?.rule, "checklist_shadow_mode");
    } finally {
      if (prevMode === undefined) delete process.env.CHECKLIST_GENERATION_MODE;
      else process.env.CHECKLIST_GENERATION_MODE = prevMode;
      if (prevScene === undefined) delete process.env.SCENE_TYPES_ENABLED;
      else process.env.SCENE_TYPES_ENABLED = prevScene;
      if (prevAllow === undefined) delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
      else process.env.CHECKLIST_ENABLED_PROJECT_IDS = prevAllow;
      resetChecklistProductionRolloutCacheForTests();
    }
  });

  await check("9 enabled — CHECKLIST compiles", async () => {
    const prevMode = process.env.CHECKLIST_GENERATION_MODE;
    const prevScene = process.env.SCENE_TYPES_ENABLED;
    const prevAllow = process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = ROLLOUT_TEST_PROJECT_ID;
    resetChecklistProductionRolloutCacheForTests();
    try {
      assert.equal(shouldRenderChecklistScenes(ROLLOUT_TEST_PROJECT_ID), true);
      const compiled = await compileVisualScenesToWorkerScenes(mockSupabase, ROLLOUT_TEST_PROJECT_ID, [
        {
          id: "scene-1",
          type: "CHECKLIST",
          payload: { items: ["One", "Two"] },
        },
      ]);
      assert.equal(compiled[0]?.type, "CHECKLIST");
    } finally {
      if (prevMode === undefined) delete process.env.CHECKLIST_GENERATION_MODE;
      else process.env.CHECKLIST_GENERATION_MODE = prevMode;
      if (prevScene === undefined) delete process.env.SCENE_TYPES_ENABLED;
      else process.env.SCENE_TYPES_ENABLED = prevScene;
      if (prevAllow === undefined) delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
      else process.env.CHECKLIST_ENABLED_PROJECT_IDS = prevAllow;
      resetChecklistProductionRolloutCacheForTests();
    }
  });

  await check("10 prompt rubric and restraint present", () => {
    const block = buildPresentationGenerationBlock({
      allowedTypes: ["IMAGE", "CHECKLIST"],
    });
    assert.match(block, /IMAGE is the safe default/);
    assert.match(block, /Decision rubric/);
    assert.match(block, /At most ONE CHECKLIST scene/);
    assert.match(block, /Do not use typed scenes merely for decoration/);
    assert.match(block, /Order of work/);
    assert.match(block, /forbidden: PHONE, QUOTE, STATISTIC, CTA/);
  });

  await check("12 legacy IMAGE normalize unchanged", () => {
    const pkg = basePkg([{ source: "ai", image_prompt: "Scene A" }]);
    normalizeVisualScenePlan(pkg);
    assert.equal(pkg.visual_scenes?.length, 1);
  });

  await check("mode defaults off without env", () => {
    const prevMode = process.env.CHECKLIST_GENERATION_MODE;
    const prevScene = process.env.SCENE_TYPES_ENABLED;
    delete process.env.CHECKLIST_GENERATION_MODE;
    process.env.SCENE_TYPES_ENABLED = "false";
    try {
      assert.equal(resolveChecklistGenerationMode(), "off");
    } finally {
      if (prevMode === undefined) delete process.env.CHECKLIST_GENERATION_MODE;
      else process.env.CHECKLIST_GENERATION_MODE = prevMode;
      if (prevScene === undefined) delete process.env.SCENE_TYPES_ENABLED;
      else process.env.SCENE_TYPES_ENABLED = prevScene;
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

await main();
