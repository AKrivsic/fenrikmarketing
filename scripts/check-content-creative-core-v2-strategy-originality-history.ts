/**
 * Strategy Originality v2 — rolling history + prompt/validator alignment regressions.
 * Run: npm run check:content-creative-core-v2-strategy-originality-history
 *
 * Fixture shape inspired by anonymized production run 0bd6344a-8bc4-4715-adde-ca8328b30542.
 */
import assert from "node:assert/strict";
import {
  STRATEGY_ORIGINALITY_HISTORY_LIMIT,
  CREATIVE_CORE_V2_MEMORY_CONFIG,
  buildStrategyOriginalityFailureBundle,
  buildStrategyOriginalityHistoryFromInputs,
  buildStrategyOriginalityHistoryPromptBlock,
  computeCreativeFingerprint,
  createStrategyCandidateWithOriginality,
  evaluateStrategyCandidateOriginality,
  formatStrategyOriginalityRetryAppend,
  isHardOriginalityIssue,
  isPackageEligibleForOriginalityHistory,
  resolveStrategyProviderRequestIdFromTelemetry,
} from "../lib/content-creative-core-v2";
import type { BuildMemoryRecordInput } from "../lib/content-creative-core-v2/memory";

let passed = 0;
let failed = 0;

const NOW = "2026-08-22T08:42:00.000Z";
const PROJECT_A = "163c1822-ad30-4cee-8826-dfacd9c188b9";
const PROJECT_B = "00000000-0000-4000-8000-000000000099";

const PAINS = [
  "Social accounts are inactive or inconsistent",
  "No time or in-house team to create content consistently",
  "Website exists but content is not converting visitors",
  "Brand looks smaller or less credible than the product really is",
];

const SILENT_SOCIAL =
  "The job candidate who researched your company the night before their interview and found a feed that looked like the business had quietly closed";
const PRE_START =
  "The moment a new hire searches your company on social before their first day — and finds nothing posted in three months";
const WAREHOUSE =
  "A warehouse manager times how long it takes three people to shoot one product photo with a phone propped on a box";

function daysAgoIso(days: number): string {
  return new Date(Date.parse(NOW) - days * 86400000).toISOString();
}

function pkg(
  id: string,
  projectId: string,
  daysAgo: number,
  topic: string,
  pain: string,
  extra: Partial<BuildMemoryRecordInput> = {},
): BuildMemoryRecordInput {
  return {
    packageId: id,
    projectId,
    createdAt: daysAgoIso(daysAgo),
    centralTopic: topic,
    angle: topic,
    hook: topic.slice(0, 80),
    painPoint: pain,
    conflict: "situation conflict",
    packageStatus: "draft",
    ...extra,
  };
}

function makeSixtyPackages(projectId: string): BuildMemoryRecordInput[] {
  const rows: BuildMemoryRecordInput[] = [];
  for (let i = 0; i < 60; i += 1) {
    rows.push(
      pkg(
        `${projectId}-pkg-${String(i).padStart(2, "0")}`,
        projectId,
        i,
        `Topic variant ${i} for rolling window test`,
        PAINS[i % PAINS.length]!,
      ),
    );
  }
  return rows;
}

async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(err);
  }
}

async function run(): Promise<void> {
  console.log("strategy originality history regressions\n");

  await check("prompt and validator share exact same 50 package IDs", () => {
    const inputs = makeSixtyPackages(PROJECT_A);
    const snapshot = buildStrategyOriginalityHistoryFromInputs(inputs, {
      nowIso: NOW,
    });
    assert.equal(snapshot.packageIds.length, STRATEGY_ORIGINALITY_HISTORY_LIMIT);
    assert.deepEqual(
      snapshot.packageIds,
      snapshot.memory.records.map((r) => r.package_id),
    );
    for (const id of snapshot.packageIds) {
      assert.ok(snapshot.promptBlock.includes(id.slice(0, 8)));
    }
  });

  await check("60 available → newest 50 only", () => {
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      makeSixtyPackages(PROJECT_A),
      { nowIso: NOW },
    );
    assert.equal(snapshot.packageIds.length, 50);
    assert.equal(snapshot.packageIds[0], `${PROJECT_A}-pkg-00`);
    assert.ok(!snapshot.packageIds.includes(`${PROJECT_A}-pkg-59`));
  });

  await check("package outside rolling 50 does not block", () => {
    const inputs = makeSixtyPackages(PROJECT_A);
    const snapshot = buildStrategyOriginalityHistoryFromInputs(inputs, {
      nowIso: NOW,
    });
    const oldTopic =
      "Legacy silent profile story from package 59 — only outside window";
    const outsideOnly = inputs.find((r) => r.packageId.endsWith("-59"))!;
    const candidate = {
      topic: oldTopic,
      angle: oldTopic,
      pain_point: PAINS[0]!,
      creative_fingerprint: computeCreativeFingerprint({
        topic: oldTopic,
        angle: oldTopic,
        pain_point: PAINS[0],
      }),
    };
    const result = evaluateStrategyCandidateOriginality({
      candidate,
      memory: snapshot.memory,
      projectPains: PAINS,
      packageCount: 1,
    });
    assert.equal(result.ok, true, JSON.stringify(result.issues));
  });

  await check("other projects excluded from history build", () => {
    const mixed = [
      ...makeSixtyPackages(PROJECT_A).slice(0, 10),
      ...makeSixtyPackages(PROJECT_B).slice(0, 10),
    ];
    const snapshot = buildStrategyOriginalityHistoryFromInputs(mixed, {
      nowIso: NOW,
      projectId: PROJECT_A,
    });
    assert.ok(snapshot.packageIds.every((id) => id.startsWith(PROJECT_A)));
  });

  await check("duplicate package IDs deduped", () => {
    const base = pkg("dup-1", PROJECT_A, 1, "Topic A", PAINS[0]!);
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      [base, { ...base, centralTopic: "Topic B" }],
      { nowIso: NOW },
    );
    assert.equal(snapshot.packageIds.filter((id) => id === "dup-1").length, 1);
  });

  await check("lifecycle: incomplete package without Core excluded", () => {
    assert.equal(
      isPackageEligibleForOriginalityHistory(
        pkg("inc", PROJECT_A, 1, "short", "x", {
          centralTopic: "tiny",
          painPoint: "y",
          conflict: "z",
        }),
      ),
      false,
    );
  });

  await check("lifecycle: explicit creative rejected stays in history window", () => {
    const rejected = pkg("rej-1", PROJECT_A, 1, SILENT_SOCIAL, PAINS[0]!, {
      explicitRejected: true,
      rejectionReason: "operator rejected",
      conflict: "silent feed before interview",
    });
    assert.equal(isPackageEligibleForOriginalityHistory(rejected), true);
    const snapshot = buildStrategyOriginalityHistoryFromInputs([rejected], {
      nowIso: NOW,
    });
    assert.equal(snapshot.packageIds.length, 1);
    assert.equal(snapshot.memory.records[0]!.rejected, true);
  });

  await check("lifecycle: recent creative reject blocks close repeat", () => {
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      [
        pkg("rej-recent", PROJECT_A, 1, SILENT_SOCIAL, PAINS[0]!, {
          explicitRejected: true,
          rejectionReason: "too similar",
          conflict: "silent feed before interview",
          packageStatus: "draft",
        }),
      ],
      { nowIso: NOW },
    );
    const result = evaluateStrategyCandidateOriginality({
      candidate: {
        topic: PRE_START,
        angle: PRE_START,
        pain_point: PAINS[0]!,
        creative_fingerprint: computeCreativeFingerprint({
          topic: PRE_START,
          angle: PRE_START,
          pain_point: PAINS[0],
        }),
      },
      memory: snapshot.memory,
      projectPains: PAINS,
      packageCount: 1,
    });
    assert.equal(result.ok, false);
    assert.ok(result.hardIssues.length > 0);
  });

  await check("lifecycle: technical cancelled is not auto creative hard block", () => {
    const cancelled = pkg("can-1", PROJECT_A, 1, WAREHOUSE, PAINS[2]!, {
      runStatus: "cancelled",
      setting: "warehouse aisle",
      conflict: "slow group photo",
      visual: "phone box",
    });
    assert.equal(isPackageEligibleForOriginalityHistory(cancelled), true);
    const record = buildStrategyOriginalityHistoryFromInputs([cancelled], {
      nowIso: NOW,
    }).memory.records[0]!;
    assert.equal(record.source_status, "cancelled");
    assert.equal(record.rejected, false);
    const hardRejectOnly = evaluateStrategyCandidateOriginality({
      candidate: {
        topic: "Different aisle staging test with new props",
        angle: "New SKU photo delay elsewhere",
        pain_point: PAINS[3]!,
        creative_fingerprint: computeCreativeFingerprint({
          topic: "Different aisle staging test with new props",
          angle: "New SKU photo delay elsewhere",
          pain_point: PAINS[3],
          setting: "loading dock",
          conflict: "missing light",
        }),
      },
      memory: buildStrategyOriginalityHistoryFromInputs([cancelled], {
        nowIso: NOW,
      }).memory,
      projectPains: PAINS,
      packageCount: 1,
    });
    assert.ok(
      !hardRejectOnly.issues.some((i) => i.reason === "rejected_recent_hard_conflict"),
    );
  });

  await check("lifecycle: failed run with valid Core brief remains eligible", () => {
    const topic = "Valid core after downstream video failure";
    const brief = {
      content_creative_core_v2: {
        core_idea: topic,
        voiceover: `${"word ".repeat(45)}`,
        hook: topic.slice(0, 80),
        scenes: [
          {
            scene_id: "s1",
            voiceover_excerpt: "hello world scene",
            visual_event: "desk",
          },
        ],
      },
    };
    const input: BuildMemoryRecordInput = {
      packageId: "failed-core",
      projectId: PROJECT_A,
      createdAt: daysAgoIso(2),
      packageStatus: "draft",
      runStatus: "failed",
      centralTopic: topic,
      painPoint: PAINS[0]!,
      conflict: "conflict",
      sourceBrief: brief,
    };
    assert.equal(isPackageEligibleForOriginalityHistory(input), true);
  });

  await check("lifecycle: old rejected motif can pass after time decay", () => {
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      [
        pkg("old-rej", PROJECT_A, 120, SILENT_SOCIAL, PAINS[0]!, {
          explicitRejected: true,
          rejectionReason: "operator",
          conflict: "silent feed",
          packageStatus: "archived",
        }),
      ],
      { nowIso: NOW },
    );
    const w = snapshot.memory.records[0]!.protection_weight;
    assert.ok(w <= CREATIVE_CORE_V2_MEMORY_CONFIG.ancientWeight + 0.01);
    const result = evaluateStrategyCandidateOriginality({
      candidate: {
        topic: WAREHOUSE,
        angle: WAREHOUSE,
        pain_point: PAINS[0]!,
        creative_fingerprint: computeCreativeFingerprint({
          topic: WAREHOUSE,
          angle: WAREHOUSE,
          pain_point: PAINS[0],
          setting: "warehouse aisle",
          conflict: "slow group photo",
        }),
      },
      memory: snapshot.memory,
      projectPains: PAINS,
      packageCount: 1,
    });
    assert.equal(result.ok, true, JSON.stringify(result.issues));
  });

  await check("archived without usable signal excluded", () => {
    assert.equal(
      isPackageEligibleForOriginalityHistory(
        pkg("a", PROJECT_A, 1, "x", "y", {
          packageStatus: "archived",
          centralTopic: "x",
          painPoint: "y",
          conflict: "",
        }),
      ),
      false,
    );
  });

  await check("recent paraphrase is rejected", () => {
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      [
        pkg("recent-1", PROJECT_A, 1, SILENT_SOCIAL, PAINS[0]!, {
          conflict: "silent feed before interview",
          packageStatus: "ready",
        }),
      ],
      { nowIso: NOW },
    );
    const result = evaluateStrategyCandidateOriginality({
      candidate: {
        topic: PRE_START,
        angle: PRE_START,
        pain_point: PAINS[0]!,
        creative_fingerprint: computeCreativeFingerprint({
          topic: PRE_START,
          angle: PRE_START,
          pain_point: PAINS[0],
        }),
      },
      memory: snapshot.memory,
      projectPains: PAINS,
      packageCount: 1,
    });
    assert.equal(result.ok, false);
    assert.ok(result.hardIssues.length > 0);
  });

  await check("same pain with new situation and angle passes", () => {
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      [
        pkg("recent-1", PROJECT_A, 1, SILENT_SOCIAL, PAINS[0]!, {
          conflict: "silent feed",
          packageStatus: "ready",
        }),
      ],
      { nowIso: NOW },
    );
    const result = evaluateStrategyCandidateOriginality({
      candidate: {
        topic: WAREHOUSE,
        angle: WAREHOUSE,
        pain_point: PAINS[0]!,
        creative_fingerprint: computeCreativeFingerprint({
          topic: WAREHOUSE,
          angle: WAREHOUSE,
          pain_point: PAINS[0],
          setting: "warehouse aisle",
          conflict: "slow group photo",
          reveal: "clip stand",
          payoff: "twenty second shoot",
        }),
      },
      memory: snapshot.memory,
      projectPains: PAINS,
      packageCount: 1,
    });
    assert.equal(result.ok, true, JSON.stringify(result.issues));
  });

  await check("pain_not_rotated is soft-only in gate result", () => {
    assert.equal(isHardOriginalityIssue({ reason: "pain_not_rotated", detail: "x" }), false);
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      [
        pkg("recent-1", PROJECT_A, 1, WAREHOUSE, PAINS[0]!, {
          setting: "warehouse aisle",
          conflict: "slow photo",
          visual: "phone box",
          packageStatus: "ready",
        }),
      ],
      { nowIso: NOW },
    );
    const result = evaluateStrategyCandidateOriginality({
      candidate: {
        topic:
          "Two warehouse pickers compare phone timers while staging another SKU photo",
        angle: "Another SKU photo delay at the same aisle",
        pain_point: PAINS[0]!,
        creative_fingerprint: computeCreativeFingerprint({
          topic:
            "Two warehouse pickers compare phone timers while staging another SKU photo",
          angle: "Another SKU photo delay at the same aisle",
          pain_point: PAINS[0],
          setting: "warehouse aisle",
          visual: "phone box",
          conflict: "slow photo",
          reveal: "clip stand",
          payoff: "quick shot",
        }),
      },
      memory: snapshot.memory,
      projectPains: PAINS,
      packageCount: 1,
    });
    for (const issue of result.issues) {
      if (issue.reason === "pain_not_rotated") {
        assert.equal(isHardOriginalityIssue(issue), false);
      }
    }
    assert.equal(
      result.ok,
      result.hardIssues.length === 0,
      JSON.stringify({ hard: result.hardIssues, soft: result.softWarnings }),
    );
  });

  await check("repair append includes conflict package summary", () => {
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      [
        pkg("recent-1", PROJECT_A, 1, SILENT_SOCIAL, PAINS[0]!, {
          conflict: "silent feed",
        }),
      ],
      { nowIso: NOW },
    );
    const append = formatStrategyOriginalityRetryAppend(
      [
        {
          reason: "same_situation_paraphrase",
          detail: "Paraphrase",
          against_package_id: "recent-1",
          match_score: 0.9,
          protection_weight: 0.85,
        },
      ],
      { memory: snapshot.memory },
    );
    assert.ok(append.includes("Conflicting history"));
    assert.ok(append.includes("recent-1".slice(0, 8)));
    assert.ok(append.includes("threshold"));
    assert.ok(!append.includes("STRATEGY ORIGINALITY HISTORY"));
  });

  await check("immutable history snapshot across two attempts", async () => {
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      [
        pkg("recent-1", PROJECT_A, 1, SILENT_SOCIAL, PAINS[0]!, {
          conflict: "silent feed",
        }),
      ],
      { nowIso: NOW },
    );
    const idsBefore = [...snapshot.packageIds];
    await createStrategyCandidateWithOriginality({
      memory: snapshot.memory,
      projectPains: PAINS,
      packageCount: 1,
      generate: () => ({
        topic: PRE_START,
        angle: PRE_START,
        pain_point: PAINS[0]!,
        creative_fingerprint: computeCreativeFingerprint({
          topic: PRE_START,
          pain_point: PAINS[0],
        }),
      }),
    });
    assert.deepEqual(idsBefore, snapshot.packageIds);
  });

  await check("exhausted failure bundle holds both attempts", () => {
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      [pkg("recent-1", PROJECT_A, 1, SILENT_SOCIAL, PAINS[0]!)],
      { nowIso: NOW },
    );
    const bundle = buildStrategyOriginalityFailureBundle({
      history: snapshot,
      attempts: [
        {
          attempt: 1,
          candidate_summaries: [{ topic: "a", angle: "a", pain_point: PAINS[0]! }],
          issues: [{ reason: "same_situation_paraphrase", detail: "d" }],
          history_record_count: 1,
          history_package_ids: snapshot.packageIds,
          hard_block_threshold: 0.7,
        },
        {
          attempt: 2,
          candidate_summaries: [{ topic: "b", angle: "b", pain_point: PAINS[0]! }],
          issues: [{ reason: "same_situation_paraphrase", detail: "d2" }],
          repair_feedback: "retry",
          history_record_count: 1,
          history_package_ids: snapshot.packageIds,
          hard_block_threshold: 0.7,
        },
      ],
    });
    assert.equal(bundle.attempts.length, 2);
    assert.ok(bundle.attempts[0]!.candidate_summaries[0]!.topic);
    assert.ok(bundle.attempts[1]!.issues.length > 0);
    const issue = bundle.attempts[1]!.issues.find(
      (i) => i.match_score != null && i.protection_weight != null,
    );
    if (issue) {
      assert.equal(
        issue.weighted_score,
        (issue.match_score ?? 0) * (issue.protection_weight ?? 0),
      );
    }
  });

  await check("failure bundle provider_request_id from telemetry or null", () => {
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      [pkg("recent-1", PROJECT_A, 1, SILENT_SOCIAL, PAINS[0]!)],
      { nowIso: NOW },
    );
    const withId = buildStrategyOriginalityFailureBundle({
      history: snapshot,
      attempts: [],
      providerRequestId: "req_abc",
    });
    assert.equal(withId.provider_request_id, "req_abc");
    const fromSteps = buildStrategyOriginalityFailureBundle({
      history: snapshot,
      attempts: [],
      providerRequestId: resolveStrategyProviderRequestIdFromTelemetry([
        {
          step_name: "Content Strategy",
          provider_request_id: "req_from_telemetry",
          provider: "claude",
          model: "claude-sonnet-4-6",
          started_at: NOW,
          finished_at: NOW,
          duration_ms: 1,
          success: true,
          retry_count: 0,
          repair: false,
          input_size_bytes: null,
          output_size_bytes: null,
          prompt_characters: null,
          completion_characters: null,
          prompt_tokens: null,
          completion_tokens: null,
          cached_tokens: null,
          estimated_cost: null,
        },
      ]),
    });
    assert.equal(fromSteps.provider_request_id, "req_from_telemetry");
  });

  await check("failure telemetry document shape without DB write", () => {
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      [pkg("recent-1", PROJECT_A, 1, SILENT_SOCIAL, PAINS[0]!)],
      { nowIso: NOW },
    );
    const bundle = buildStrategyOriginalityFailureBundle({
      history: snapshot,
      attempts: [
        {
          attempt: 1,
          candidate_summaries: [{ topic: "t", angle: "a", pain_point: "p" }],
          issues: [
            {
              reason: "same_situation_paraphrase",
              detail: "d",
              match_score: 0.9,
              protection_weight: 0.8,
              weighted_score: 0.72,
            },
          ],
          history_record_count: 1,
          history_package_ids: snapshot.packageIds,
          hard_block_threshold: 0.7,
        },
      ],
    });
    const failure_telemetry = {
      phase: "strategy_originality_v2",
      strategy_originality_failure: bundle,
    };
    const json = JSON.stringify(failure_telemetry);
    assert.ok(json.includes("weighted_score"));
    assert.ok(json.includes("provider_request_id"));
    assert.ok(!json.includes(SILENT_SOCIAL));
  });

  await check("telemetry bundle excludes prompt/product brain blobs", () => {
    const snapshot = buildStrategyOriginalityHistoryFromInputs(
      [pkg("recent-1", PROJECT_A, 1, SILENT_SOCIAL, PAINS[0]!)],
      { nowIso: NOW },
    );
    const json = JSON.stringify(
      buildStrategyOriginalityFailureBundle({
        history: snapshot,
        attempts: [
          {
            attempt: 1,
            candidate_summaries: [{ topic: "t", angle: "a", pain_point: "p" }],
            issues: [],
            history_record_count: 1,
            history_package_ids: snapshot.packageIds,
            hard_block_threshold: 0.7,
          },
        ],
      }),
    );
    assert.ok(!json.includes("Product Brain"));
    assert.ok(json.length < 50_000);
  });

  await check("50-record prompt block stays within token budget", () => {
    const inputs: BuildMemoryRecordInput[] = [];
    for (let i = 0; i < 50; i += 1) {
      inputs.push(
        pkg(`p-${i}`, PROJECT_A, i, `${SILENT_SOCIAL} variant ${i}`, PAINS[i % 4]!, {
          conflict: `conflict detail ${i}`.repeat(3),
        }),
      );
    }
    const { block, blockChars } = buildStrategyOriginalityHistoryPromptBlock({
      summaries: buildStrategyOriginalityHistoryFromInputs(inputs, {
        nowIso: NOW,
      }).memory.records.map((r) => ({
        package_id: r.package_id,
        topic: r.central_topic,
        angle: r.conflict,
        pain_point: r.pain_point ?? "",
        situation_conflict: r.conflict,
      })),
      limit: STRATEGY_ORIGINALITY_HISTORY_LIMIT,
    });
    assert.ok(blockChars <= 14_000);
    assert.ok(block.length <= 14_000);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void run();
