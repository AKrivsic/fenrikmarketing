// Phase 6 — production CHECKLIST rollout (allowlist + kill switch).
//   npm run check:checklist-production-rollout

import assert from "node:assert/strict";
import { analyzePresentation } from "@/lib/scene-types/presentation/analyzePresentation";
import { buildProofIndex } from "@/lib/scene-types/presentation/proofIndex";
import { deriveProjectPresentationSignals } from "@/lib/scene-types/presentation/projectSignals";
import { deriveAllowedSceneTypes } from "@/lib/scene-types/presentation/deriveAllowedSceneTypes";
import { derivePromptPresentationTypes } from "@/lib/scene-types/presentation/promptPresentationTypes";
import { buildPresentationGenerationLog } from "@/lib/scene-types/presentation/presentationGenerationLog";
import { readVideoJobPresentationHints } from "@/lib/scene-types/presentation/videoJobPresentationMeta";
import { assertSceneRenderable } from "@/lib/scene-types/renderers/types";
import { ensureSceneRendererRegistry } from "@/video-worker/services/sceneRendererRegistry";
import {
  checklistEnabledProjectIds,
  isChecklistProductionEnabledForProject,
  isChecklistPromptPermittedForProject,
  resetChecklistProductionRolloutCacheForTests,
} from "@/lib/scene-types/checklistProductionRollout";
import { shouldRenderChecklistScenes } from "@/lib/scene-types/checklistGenerationMode";
import { groupProjectVideoJobs } from "@/lib/video-scene-editor/videoJobGrouping";
import type { ProjectVideoEntry } from "@/lib/api/project-content-admin";
import { emptyKnowledge } from "@/lib/knowledge/types";
import type { Project } from "@/lib/supabase/types";

const ROLLOUT_A = "11111111-1111-4111-8111-111111111111";
const ROLLOUT_B = "22222222-2222-4222-8222-222222222222";

let passed = 0;
let failed = 0;

async function check(
  name: string,
  fn: () => void | Promise<void>,
): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(` FAIL ${name}`, err);
  }
}

function saveEnv(keys: string[]): Record<string, string | undefined> {
  const snap: Record<string, string | undefined> = {};
  for (const k of keys) snap[k] = process.env[k];
  return snap;
}

function restoreEnv(
  snap: Record<string, string | undefined>,
  keys: string[],
): void {
  for (const k of keys) {
    const v = snap[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  resetChecklistProductionRolloutCacheForTests();
}

const mockProject = {
  product_is: ["Local service"],
  product_strengths: ["Quality"],
  knowledge: emptyKnowledge("approved", "manual"),
} as Pick<Project, "product_is" | "product_strengths" | "knowledge">;

const ENV_KEYS = [
  "SCENE_TYPES_ENABLED",
  "CHECKLIST_GENERATION_MODE",
  "CHECKLIST_ENABLED_PROJECT_IDS",
];

async function main(): Promise<void> {
  await check("1 empty allowlist — no project enabled", () => {
    const snap = saveEnv(ENV_KEYS);
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    resetChecklistProductionRolloutCacheForTests();
    try {
      assert.equal(checklistEnabledProjectIds().size, 0);
      assert.equal(isChecklistProductionEnabledForProject(ROLLOUT_A), false);
      assert.equal(shouldRenderChecklistScenes(ROLLOUT_A), false);
    } finally {
      restoreEnv(snap, ENV_KEYS);
    }
  });

  await check("2 allowlisted project + flags enables CHECKLIST", () => {
    const snap = saveEnv(ENV_KEYS);
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = ROLLOUT_A;
    resetChecklistProductionRolloutCacheForTests();
    try {
      assert.equal(isChecklistProductionEnabledForProject(ROLLOUT_A), true);
      assert.equal(shouldRenderChecklistScenes(ROLLOUT_A), true);
      assert.deepEqual(
        derivePromptPresentationTypes({ projectId: ROLLOUT_A, project: mockProject }),
        ["IMAGE", "CHECKLIST"],
      );
    } finally {
      restoreEnv(snap, ENV_KEYS);
    }
  });

  await check("3 non-allowlisted project stays IMAGE-only in prompt", () => {
    const snap = saveEnv(ENV_KEYS);
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = ROLLOUT_A;
    resetChecklistProductionRolloutCacheForTests();
    try {
      assert.deepEqual(
        derivePromptPresentationTypes({ projectId: ROLLOUT_B, project: mockProject }),
        ["IMAGE"],
      );
      const vo =
        "Avoid three booking mistakes: late arrivals, wrong party size, and missing deposits.";
      const r = analyzePresentation({
        scenes: [
          {
            id: "scene-1",
            type: "CHECKLIST",
            payload: {
              items: ["late arrivals", "wrong party size", "missing deposits"],
            },
          },
        ],
        allowedSceneTypes: ["IMAGE", "CHECKLIST"],
        voiceoverText: vo,
        proof: buildProofIndex(null),
        projectSignals: deriveProjectPresentationSignals({
          project: { product_is: [], product_strengths: [] },
          assets: [],
        }),
        projectId: ROLLOUT_B,
      });
      assert.equal(r.scenes[0]?.type, "IMAGE");
      assert.equal(r.decisions[0]?.rule, "checklist_project_not_allowlisted");
    } finally {
      restoreEnv(snap, ENV_KEYS);
    }
  });

  await check("4 global kill switch overrides allowlist", () => {
    const snap = saveEnv(ENV_KEYS);
    process.env.SCENE_TYPES_ENABLED = "false";
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = ROLLOUT_A;
    resetChecklistProductionRolloutCacheForTests();
    try {
      assert.equal(isChecklistProductionEnabledForProject(ROLLOUT_A), false);
      assert.deepEqual(
        derivePromptPresentationTypes({ projectId: ROLLOUT_A, project: mockProject }),
        ["IMAGE"],
      );
    } finally {
      restoreEnv(snap, ENV_KEYS);
    }
  });

  await check("5 prompt permitted when allowlisted (enabled mode)", () => {
    const snap = saveEnv(ENV_KEYS);
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = ROLLOUT_A;
    resetChecklistProductionRolloutCacheForTests();
    try {
      assert.equal(isChecklistPromptPermittedForProject(ROLLOUT_A), true);
      assert.equal(isChecklistProductionEnabledForProject(ROLLOUT_A), true);
    } finally {
      restoreEnv(snap, ENV_KEYS);
    }
  });

  await check("6 presentation metadata fields preserved", () => {
    const snap = saveEnv(ENV_KEYS);
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = ROLLOUT_A;
    resetChecklistProductionRolloutCacheForTests();
    try {
      const log = buildPresentationGenerationLog({
        projectId: ROLLOUT_A,
        packageId: "33333333-3333-4333-8333-333333333333",
        requestedChecklistCount: 1,
        requestedPhoneCount: 0,
        requestedQuoteCount: 0,
        requestedStatisticCount: 0,
        requestedCtaCount: 0,
        frequencyDecisions: [],
        analyzerDecisions: [
          {
            scene_id: "scene-1",
            requested_type: "CHECKLIST",
            final_type: "CHECKLIST",
            rule: "allowed",
            reason: "ok",
          },
        ],
        finalWorkerSceneTypes: ["IMAGE", "CHECKLIST"],
      });
      assert.equal(log.project_id, ROLLOUT_A);
      assert.equal(log.checklist_allowlist_status, "allowlisted");
      assert.equal(log.accepted_checklist_count, 1);
      assert.equal(log.checklist_renderer_version, "checklist@1");
    } finally {
      restoreEnv(snap, ENV_KEYS);
    }
  });

  await check("7 IMAGE-only project unchanged in analyzer", () => {
    const r = analyzePresentation({
      scenes: [
        {
          id: "scene-1",
          type: "IMAGE",
          payload: { media: { source: "ai", image_prompt: "Cafe interior" } },
        },
      ],
      allowedSceneTypes: deriveAllowedSceneTypes(
        {
          knowledge: {},
          proof: buildProofIndex(null),
          projectSignals: deriveProjectPresentationSignals({
            project: { product_is: ["Cafe"], product_strengths: [] },
            assets: [],
          }),
        },
        { sceneTypesEnabled: false },
      ),
      voiceoverText: "Welcome.",
      proof: buildProofIndex(null),
      projectSignals: deriveProjectPresentationSignals({
        project: { product_is: ["Cafe"], product_strengths: [] },
        assets: [],
      }),
      projectId: ROLLOUT_B,
    });
    assert.equal(r.scenes[0]?.type, "IMAGE");
  });

  await check("8 worker downgrades stale CHECKLIST when rollout disabled", () => {
    const snap = saveEnv(ENV_KEYS);
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    resetChecklistProductionRolloutCacheForTests();
    ensureSceneRendererRegistry();
    try {
      const type = assertSceneRenderable(
        {
          id: "scene-1",
          type: "CHECKLIST",
          image_prompt: "placeholder",
          duration_seconds: 4,
          payload_snapshot: { items: ["a", "b"] },
        },
        { projectId: ROLLOUT_A, videoJobId: "job-1" },
      );
      assert.equal(type, "IMAGE");
    } finally {
      restoreEnv(snap, ENV_KEYS);
    }
  });

  await check("9 badge metadata identifies CHECKLIST video", () => {
    const input = {
      scenes: [{ id: "s1", type: "CHECKLIST", image_prompt: "x", duration_seconds: 4 }],
      presentation_analyzer: {
        presentation_generation: {
          final_worker_scene_types: ["IMAGE", "CHECKLIST"],
          requested_checklist_count: 1,
          accepted_checklist_count: 1,
        },
        warnings: ["scene-2: warn"],
      },
    };
    const hints = readVideoJobPresentationHints(input as never);
    assert.equal(hints.hasChecklistInFinalScenes, true);
    assert.equal(hints.presentationAnalyzerWarningCount, 1);

    const group = groupProjectVideoJobs([
      {
        id: "job-1",
        status: "completed",
        provider: "video_engine",
        model: null,
        errorMessage: null,
        errorDetail: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        completedAt: "2026-01-01T00:00:00.000Z",
        contentItemId: "item-1",
        itemTitle: "T",
        platform: "tiktok",
        format: "reel",
        videoUrl: null,
        thumbnailUrl: null,
        subtitleUrl: null,
        hasMp4: false,
        hasSubtitle: false,
        hasThumbnail: false,
        canEditScenes: false,
        isEditorRerender: false,
        hasChecklistScene: true,
        presentationAnalyzerWarningCount: 0,
      } satisfies ProjectVideoEntry,
    ]);
    assert.equal(group[0]?.displayHasChecklistScene, true);
  });

  await check("10 invalid allowlist entries ignored safely", () => {
    const snap = saveEnv(ENV_KEYS);
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = `not-a-uuid, ${ROLLOUT_A}, ,bad`;
    resetChecklistProductionRolloutCacheForTests();
    try {
      assert.equal(checklistEnabledProjectIds().size, 1);
      assert.ok(checklistEnabledProjectIds().has(ROLLOUT_A));
    } finally {
      restoreEnv(snap, ENV_KEYS);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

await main();
