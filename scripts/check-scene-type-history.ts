import assert from "node:assert/strict";
import { buildSceneTypeProjectHistory } from "@/lib/scene-types/presentation/sceneTypeProjectHistory";
import {
  applySceneTypeHistoryGuardrail,
  evaluateSceneTypeHistoryDowngrade,
} from "@/lib/scene-types/presentation/sceneTypeHistoryGuardrail";
import { buildSceneTypeHistoryRestraintBlock } from "@/lib/scene-types/presentation/sceneTypeHistoryPrompt";
import { buildPresentationGenerationBlock } from "@/lib/ai/prompts/presentationGeneration";
import { DEFAULT_SCENE_TYPE } from "@/lib/scene-types/sceneType";

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

check("history builder reads final_worker_scene_types", () => {
  const history = buildSceneTypeProjectHistory({
    rows: [
      {
        id: "pkg-1",
        created_at: "2026-01-02T00:00:00Z",
        weekly_strategy_id: "ws-1",
        strategy_item_id: "si-1",
        package_brief: {
          presentation_generation: {
            final_worker_scene_types: ["IMAGE", "CTA"],
          },
        },
      },
    ],
    currentWeeklyStrategyId: "ws-1",
  });
  assert.deepEqual(history.lastPackageSpecialTypes, ["CTA"]);
  assert.equal(history.ctaUsedInRecentWindow, true);
});

check("consecutive CHECKLIST downgrades after analyzer allowed", () => {
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

  const analyzed = {
    scenes: [
      {
        id: "scene-1",
        type: "CHECKLIST" as const,
        payload: {
          items: ["One concrete step", "Another step", "Third step"],
        },
      },
    ],
    decisions: [
      {
        scene_id: "scene-1",
        requested_type: "CHECKLIST" as const,
        final_type: "CHECKLIST" as const,
        rule: "allowed" as const,
        reason: "test fixture",
      },
    ],
    warnings: [] as string[],
  };

  const after = applySceneTypeHistoryGuardrail({
    analyzed,
    history,
    voiceoverText:
      "First do one concrete step, then another step, then a third step.",
  });

  assert.equal(after.scenes[0]?.type, DEFAULT_SCENE_TYPE);
  assert.equal(after.historyDecisions[0]?.rule, "checklist_recently_used");
});

check("weekly sibling QUOTE downgrades", () => {
  const history = buildSceneTypeProjectHistory({
    rows: [
      {
        id: "sibling",
        created_at: "2026-01-03T00:00:00Z",
        weekly_strategy_id: "ws-1",
        strategy_item_id: "si-2",
        package_brief: {
          presentation_generation: {
            final_worker_scene_types: ["IMAGE", "QUOTE"],
          },
        },
      },
    ],
    currentWeeklyStrategyId: "ws-1",
  });

  const verdict = evaluateSceneTypeHistoryDowngrade({
    type: "QUOTE",
    history,
  });
  assert.ok(verdict?.downgrade);
  assert.equal(verdict?.rule, "quote_recently_used");
});

check("history never upgrades IMAGE", () => {
  const analyzed = {
    scenes: [
      {
        id: "scene-1",
        type: DEFAULT_SCENE_TYPE,
        payload: { media: { source: "ai", image_prompt: "A calm workspace." } },
      },
    ],
    decisions: [
      {
        scene_id: "scene-1",
        requested_type: DEFAULT_SCENE_TYPE,
        final_type: DEFAULT_SCENE_TYPE,
        rule: "allowed" as const,
        reason: "image",
      },
    ],
    warnings: [] as string[],
  };

  const after = applySceneTypeHistoryGuardrail({
    analyzed,
    history: buildSceneTypeProjectHistory({ rows: [] }),
    voiceoverText: "Simple narration.",
  });

  assert.equal(after.scenes[0]?.type, DEFAULT_SCENE_TYPE);
  assert.equal(after.historyDecisions.length, 0);
});

check("prompt block mentions restraint and recent patterns", () => {
  const block = buildSceneTypeHistoryRestraintBlock(
    buildSceneTypeProjectHistory({
      rows: [
        {
          id: "p1",
          created_at: "2026-01-01T00:00:00Z",
          weekly_strategy_id: "ws-1",
          strategy_item_id: "si-1",
          package_brief: {
            presentation_generation: {
              final_worker_scene_types: ["IMAGE", "PHONE"],
            },
          },
        },
      ],
      currentWeeklyStrategyId: "ws-1",
    }),
  );
  assert.match(block, /SCENE TYPE RESTRAINT/);
  assert.match(block, /PHONE/);
});

check("presentation block includes calendar restraint lines", () => {
  const block = buildPresentationGenerationBlock({ allowedTypes: ["IMAGE"] });
  assert.match(block, /content calendar/);
  assert.match(block, /not recurring templates/);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
