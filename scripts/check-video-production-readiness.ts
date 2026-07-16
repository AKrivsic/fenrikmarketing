/**
 * Final production readiness — rollout, retry preservation, compatibility.
 *   npm run check:video-production-readiness
 */
import assert from "node:assert/strict";
import {
  checklistEnabledProjectIds,
  isChecklistAllowlistWildcard,
  isChecklistProductionEnabledForProject,
  isChecklistPromptPermittedForProject,
  isProjectAllowlistedForChecklist,
  resetChecklistProductionRolloutCacheForTests,
} from "@/lib/scene-types/checklistProductionRollout";
import { DEFAULT_SCENE_TYPE } from "@/lib/scene-types/sceneType";
import { evaluateSceneTypeHistoryDowngrade } from "@/lib/scene-types/presentation/sceneTypeHistoryGuardrail";
import { buildSceneTypeProjectHistory } from "@/lib/scene-types/presentation/sceneTypeProjectHistory";
import { ensureSceneRendererRegistry } from "@/video-worker/services/sceneRendererRegistry";
import { getRegisteredSceneRendererTypes } from "@/lib/scene-types/renderers/types";
import {
  applySemanticMotionPreservationFromSourceJob,
  extractSemanticMotionBeatsFromJobOutput,
  mergeStoredSemanticMotionFromSourceOutput,
  parseStoredSemanticMotionFromJobInput,
} from "@/lib/video-engine/semanticMotion/storedSemanticMotionJobInput";
import { buildStoryboard, SHORT_PROFILE } from "@/lib/video-engine/storyboard";
import { resolveVisualProfile } from "@/lib/visual-profile/resolveVisualProfile";

const PID_A = "11111111-1111-4111-8111-111111111111";
const PID_B = "22222222-2222-4222-8222-222222222222";

const ENV_KEYS = [
  "SCENE_TYPES_ENABLED",
  "CHECKLIST_GENERATION_MODE",
  "CHECKLIST_ENABLED_PROJECT_IDS",
];

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log("  ok ", name);
  } catch (err) {
    failed++;
    console.error(" FAIL", name, err);
  }
}

function saveEnv(): Record<string, string | undefined> {
  const snap: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) snap[k] = process.env[k];
  return snap;
}

function restoreEnv(snap: Record<string, string | undefined>): void {
  for (const k of ENV_KEYS) {
    const v = snap[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  resetChecklistProductionRolloutCacheForTests();
}

function main(): void {
check("1 wildcard enables CHECKLIST for all project ids", () => {
  const snap = saveEnv();
  try {
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = "*";
    resetChecklistProductionRolloutCacheForTests();
    assert.equal(isChecklistAllowlistWildcard(), true);
    assert.equal(isProjectAllowlistedForChecklist(PID_A), true);
    assert.equal(isProjectAllowlistedForChecklist(PID_B), true);
    assert.equal(isChecklistProductionEnabledForProject(PID_B), true);
    assert.equal(isChecklistPromptPermittedForProject(PID_A), true);
  } finally {
    restoreEnv(snap);
  }
});

check("2 empty allowlist enables none", () => {
  const snap = saveEnv();
  try {
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    resetChecklistProductionRolloutCacheForTests();
    assert.equal(checklistEnabledProjectIds().size, 0);
    assert.equal(isChecklistProductionEnabledForProject(PID_A), false);
  } finally {
    restoreEnv(snap);
  }
});

check("3 explicit UUID allowlist still works", () => {
  const snap = saveEnv();
  try {
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = PID_A;
    resetChecklistProductionRolloutCacheForTests();
    assert.equal(isChecklistProductionEnabledForProject(PID_A), true);
    assert.equal(isChecklistProductionEnabledForProject(PID_B), false);
  } finally {
    restoreEnv(snap);
  }
});

check("4 SCENE_TYPES_ENABLED=false overrides wildcard", () => {
  const snap = saveEnv();
  try {
    process.env.SCENE_TYPES_ENABLED = "false";
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = "*";
    resetChecklistProductionRolloutCacheForTests();
    assert.equal(isChecklistProductionEnabledForProject(PID_A), false);
  } finally {
    restoreEnv(snap);
  }
});

check("5 CHECKLIST_GENERATION_MODE=off overrides wildcard", () => {
  const snap = saveEnv();
  try {
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_GENERATION_MODE = "off";
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = "*";
    resetChecklistProductionRolloutCacheForTests();
    assert.equal(isChecklistProductionEnabledForProject(PID_A), false);
  } finally {
    restoreEnv(snap);
  }
});

check("6 IMAGE remains default scene type", () => {
  assert.equal(DEFAULT_SCENE_TYPE, "IMAGE");
});

check("7 prompt and analyzer share CHECKLIST allowlist gate", () => {
  const snap = saveEnv();
  try {
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    delete process.env.CHECKLIST_ENABLED_PROJECT_IDS;
    resetChecklistProductionRolloutCacheForTests();
    assert.equal(isChecklistPromptPermittedForProject(PID_B), false);
    assert.equal(isChecklistProductionEnabledForProject(PID_B), false);
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = "*";
    resetChecklistProductionRolloutCacheForTests();
    assert.equal(isChecklistPromptPermittedForProject(PID_B), true);
    assert.equal(isChecklistProductionEnabledForProject(PID_B), true);
  } finally {
    restoreEnv(snap);
  }
});

check("8 scene type history is soft memory only (no hard downgrade)", () => {
  const history = buildSceneTypeProjectHistory({
    rows: [
      {
        id: "prev",
        created_at: "2026-01-01T00:00:00Z",
        weekly_strategy_id: "ws-1",
        strategy_item_id: "si-0",
        package_brief: {
          presentation_generation: {
            final_worker_scene_types: ["IMAGE", "CHECKLIST"],
          },
        },
      },
    ],
    currentWeeklyStrategyId: "ws-1",
  });
  const verdict = evaluateSceneTypeHistoryDowngrade({
    type: "CHECKLIST",
    history,
  });
  // Scene Types v2: series memory is soft prompt signal only — no hard downgrade.
  assert.equal(verdict, null);
});

check("9 visual profile snapshot survives job input spread", () => {
  const source = {
    visual_profile: "EDITORIAL",
    visual_profile_version: "visual-profile@1",
    voiceover_text: "test",
  };
  const next = { ...source, retry_of_video_job_id: "job-1" };
  assert.equal(next.visual_profile, "EDITORIAL");
});

check("10 semantic motion snapshot survives retry merge", () => {
  const output = {
    render_spec: {
      version: 1,
      scenes: [],
      metadata: {
        semantic_motion: {
          version: "semantic-motion@1",
          beats: [
            {
              beat_id: "beat-1",
              scene_id: "s1",
              motion_intent: "HOLD",
              motion_primitive: "static",
              motion_intensity: "LOW",
              motion_version: "semantic-motion@1",
            },
          ],
        },
      },
    },
  };
  const merged = mergeStoredSemanticMotionFromSourceOutput({
    jobInput: { voiceover_text: "x" },
    sourceJobOutput: output,
  });
  const beats = parseStoredSemanticMotionFromJobInput(merged);
  assert.equal(beats?.[0]?.motion_primitive, "static");
  assert.equal(beats?.[0]?.motion_intent, "HOLD");
});

check("11 invalid stored motion falls back safely", () => {
  const merged = applySemanticMotionPreservationFromSourceJob({
    jobInput: { voiceover_text: "x" },
    sourceJobOutput: {
      render_spec: {
        metadata: {
          semantic_motion: { beats: [{ beat_id: "b", motion_primitive: "zoom_explode" }] },
        },
      },
    },
  });
  const beats = parseStoredSemanticMotionFromJobInput(merged);
  assert.equal(beats?.[0]?.motion_primitive, "static");
});

check("12 old jobs without profile or motion metadata still parse", () => {
  assert.equal(extractSemanticMotionBeatsFromJobOutput({}), null);
  const profile = resolveVisualProfile({ projectId: PID_A, knowledge: null });
  assert.ok(profile.profile);
  const beats = buildStoryboard({
    voiceoverText: "Legacy job without motion metadata.",
    sceneIds: ["a"],
    audioDurationSeconds: 18,
    semanticMotion: false,
  });
  assert.ok(beats.length >= 3);
});

check("13 language variant merge copies motion when present", () => {
  const output = {
    render_spec: {
      metadata: {
        semantic_motion: {
          beats: [
            {
              beat_id: "beat-1",
              motion_intent: "CLOSE",
              motion_primitive: "static",
              motion_intensity: "LOW",
              motion_version: "semantic-motion@1",
            },
          ],
        },
      },
    },
  };
  const merged = applySemanticMotionPreservationFromSourceJob({
    jobInput: { language: "de", voiceover_text: "Hallo" },
    sourceJobOutput: output,
  });
  assert.ok(parseStoredSemanticMotionFromJobInput(merged)?.length === 1);
});

check("14 all renderer registrations exist", () => {
  ensureSceneRendererRegistry();
  const types = getRegisteredSceneRendererTypes().sort();
  assert.deepEqual(types, [
    "CHECKLIST",
    "CTA",
    "IMAGE",
    "PHONE",
    "QUOTE",
    "STATISTIC",
  ]);
});

check("15 beat count mismatch ignores stored motion plan", () => {
  const base = {
    voiceoverText: "One two three four five six seven eight nine ten.",
    sceneIds: ["a"],
    audioDurationSeconds: 24,
  };
  const resolved = buildStoryboard(base);
  const withPartialStore = buildStoryboard({
    ...base,
    storedSemanticMotion: [
      {
        beat_id: "beat-1",
        motion_primitive: "pan_left",
        motion_intent: "EXPLAIN",
        motion_intensity: "LOW",
        motion_version: "semantic-motion@1",
      },
    ],
  });
  assert.ok(resolved.length > 1);
  assert.deepEqual(
    resolved.map((b) => b.motion),
    withPartialStore.map((b) => b.motion),
  );
});

check("16 mixed wildcard syntax treats * as global", () => {
  const snap = saveEnv();
  try {
    process.env.SCENE_TYPES_ENABLED = "true";
    process.env.CHECKLIST_GENERATION_MODE = "enabled";
    process.env.CHECKLIST_ENABLED_PROJECT_IDS = `${PID_A}, *`;
    resetChecklistProductionRolloutCacheForTests();
    assert.equal(isChecklistAllowlistWildcard(), true);
    assert.equal(isProjectAllowlistedForChecklist(PID_B), true);
  } finally {
    restoreEnv(snap);
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
}

main();
