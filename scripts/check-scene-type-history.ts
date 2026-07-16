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

check("consecutive CHECKLIST remains allowed — history is soft signal only (v2)", () => {
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

  assert.equal(after.scenes[0]?.type, "CHECKLIST");
  assert.equal(after.historyDecisions.length, 0);
});

check("weekly sibling QUOTE is not hard-downgraded (v2 soft memory)", () => {
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
  assert.equal(verdict, null);
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

check("prompt block mentions soft memory and recent patterns", () => {
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
  assert.match(block, /SCENE TYPE MEMORY/);
  assert.match(block, /soft (signal|tie-breaker|negative)/i);
  assert.match(block, /PHONE/);
  assert.match(block, /no minimum or maximum count/i);
});

check("recent CHECKLIST is soft tie-breaker, not a hard ban", () => {
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

  const block = buildSceneTypeHistoryRestraintBlock(history);
  assert.match(block, /CHECKLIST appeared recently/);
  assert.match(block, /Soft negative signal/);
  assert.match(block, /similarly strong/);
  assert.match(block, /Keep CHECKLIST when simultaneous scanning/);

  // Guardrail still does not hard-downgrade a clearly superior checklist.
  assert.equal(
    evaluateSceneTypeHistoryDowngrade({ type: "CHECKLIST", history }),
    null,
  );
  const after = applySceneTypeHistoryGuardrail({
    analyzed: {
      scenes: [
        {
          id: "scene-1",
          type: "CHECKLIST" as const,
          payload: {
            items: ["Check the hook", "Confirm the CTA", "Review the visual"],
          },
        },
      ],
      decisions: [
        {
          scene_id: "scene-1",
          requested_type: "CHECKLIST" as const,
          final_type: "CHECKLIST" as const,
          rule: "allowed" as const,
          reason: "eligible checklist",
        },
      ],
      warnings: [],
    },
    history,
    voiceoverText:
      "Before publishing, check the hook, confirm the CTA, and review the visual.",
  });
  assert.equal(after.scenes[0]?.type, "CHECKLIST");
  assert.equal(after.historyDecisions.length, 0);
});

check("presentation block includes strongest-expression rubric", () => {
  const block = buildPresentationGenerationBlock({ allowedTypes: ["IMAGE"] });
  assert.match(block, /strongest way to communicate/i);
  assert.match(block, /equal tools/i);
  assert.match(block, /soft tie-breaker/i);
});

check("CHECKLIST restraint wording present when checklist allowed", () => {
  const block = buildPresentationGenerationBlock({
    allowedTypes: ["IMAGE", "CHECKLIST"],
  });
  assert.match(
    block,
    /list-like script does not automatically require a CHECKLIST/,
  );
  assert.match(
    block,
    /simultaneous visual scanning of the concrete items is the main value/,
  );
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
