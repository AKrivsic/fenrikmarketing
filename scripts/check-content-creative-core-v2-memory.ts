/**
 * Offline Creative Core v2 memory + time-decay checks (no network).
 * Run: npm run check:content-creative-core-v2-memory
 */
import assert from "node:assert/strict";
import {
  assembleCreativeMemory,
  buildMemoryRecord,
  computeProtectionWeight,
  createStrategyCandidateWithOriginality,
  evaluateStrategyCandidateOriginality,
  isHardOriginalityIssue,
  CREATIVE_CORE_V2_MEMORY_CONFIG,
  STRATEGY_ORIGINALITY_EXHAUSTED_V2,
  computeCreativeFingerprint,
  type StrategyCandidateV2,
} from "../lib/content-creative-core-v2";

let passed = 0;
let failed = 0;

const NOW = "2026-08-22T00:00:00.000Z";

const CANDIDATE =
  "The job candidate who researched your company the night before their interview and found a feed that looked like the business had quietly closed";
const PRE_START =
  "The moment a new hire searches your company on social before their first day — and finds nothing posted in three months";
const DISTINCT =
  "A warehouse manager times how long it takes three people to shoot one product photo with a phone propped on a box";

const PAINS = [
  "Social accounts are inactive or inconsistent",
  "No time or in-house team to create content consistently",
  "Website exists but content is not converting visitors",
  "Brand looks smaller or less credible than the product really is",
];

function daysAgoIso(days: number): string {
  const ms = Date.parse(NOW) - days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

function candidateFrom(
  topic: string,
  pain: string,
  angle = topic,
): StrategyCandidateV2 {
  return {
    topic,
    angle,
    pain_point: pain,
    creative_fingerprint: computeCreativeFingerprint({
      pain_point: pain,
      topic,
      angle,
      conflict: angle,
    }),
  };
}

async function run(): Promise<void> {
  console.log("content-creative-core-v2 memory / originality\n");

  await checkAsync(
    "same story with different character is a repeat",
    async () => {
      const memory = assembleCreativeMemory(
        [
          {
            packageId: "p1",
            createdAt: daysAgoIso(1),
            centralTopic: CANDIDATE,
            angle: CANDIDATE,
            hook: CANDIDATE,
            painPoint: PAINS[0],
            conflict: "profile silence before a decision",
            props: "phone laptop feed",
            packageStatus: "ready",
          },
        ],
        { nowIso: NOW },
      );
      const result = evaluateStrategyCandidateOriginality({
        candidate: candidateFrom(PRE_START, PAINS[0], "new hire POV"),
        memory,
        projectPains: PAINS,
        packageCount: 1,
      });
      assert.equal(result.ok, false);
      assert.ok(
        result.issues.some(
          (i) =>
            i.reason === "same_situation_different_character" ||
            i.reason === "same_situation_paraphrase" ||
            i.reason === "fingerprint_hard_conflict",
        ),
      );
    },
  );

  await checkAsync("paraphrase of the same situation is a repeat", async () => {
    const memory = assembleCreativeMemory(
      [
        {
          packageId: "p1",
          createdAt: daysAgoIso(2),
          centralTopic: CANDIDATE,
          angle: CANDIDATE,
          hook: CANDIDATE,
          painPoint: PAINS[0],
          conflict: "silent company profile before a call",
          packageStatus: "published",
        },
      ],
      { nowIso: NOW },
    );
    const paraphrased =
      "Before the interview a candidate looked up your company and your last posts looked abandoned";
    const result = evaluateStrategyCandidateOriginality({
      candidate: candidateFrom(paraphrased, PAINS[0]),
      memory,
      projectPains: PAINS,
      packageCount: 1,
    });
    assert.equal(result.ok, false);
    assert.ok(
      result.issues.some(
        (i) =>
          i.reason === "same_situation_paraphrase" ||
          i.reason === "fingerprint_hard_conflict",
      ),
    );
  });

  await checkAsync(
    "clearly different pain / situation / motif passes",
    async () => {
      const memory = assembleCreativeMemory(
        [
          {
            packageId: "p1",
            createdAt: daysAgoIso(1),
            centralTopic: CANDIDATE,
            angle: CANDIDATE,
            hook: CANDIDATE,
            painPoint: PAINS[0],
            conflict: "silent profile",
            props: "phone feed",
            packageStatus: "ready",
          },
        ],
        { nowIso: NOW },
      );
      const result = evaluateStrategyCandidateOriginality({
        candidate: candidateFrom(DISTINCT, PAINS[1]),
        memory,
        projectPains: PAINS,
        packageCount: 1,
      });
      assert.equal(result.ok, true, JSON.stringify(result.issues));
    },
  );

  await checkAsync(
    "very old motif can pass after time decay with different execution",
    async () => {
      const memory = assembleCreativeMemory(
        [
          {
            packageId: "ancient",
            createdAt: daysAgoIso(120),
            centralTopic: "Someone checks a quiet social profile before deciding",
            angle: "quiet profile",
            hook: "They checked before deciding.",
            painPoint: PAINS[0],
            conflict: "quiet profile",
            reveal: "empty feed",
            payoff: "post regularly",
            props: "phone",
            packageStatus: "published",
          },
        ],
        { nowIso: NOW },
      );
      assert.ok(memory.records[0].protection_weight <= CREATIVE_CORE_V2_MEMORY_CONFIG.oldWeight);
      // Different POV + setting + props + conflict framing — not a hard weighted hit.
      const result = evaluateStrategyCandidateOriginality({
        candidate: candidateFrom(
          "A founder records one honest workshop tip on a chalkboard after closing the shop",
          PAINS[3],
          "workshop chalkboard proof",
        ),
        memory,
        projectPains: PAINS,
        packageCount: 1,
      });
      assert.equal(result.ok, true, JSON.stringify(result.issues));
    },
  );

  await checkAsync(
    "rejected recent proposal is strongly blocked",
    async () => {
      const memory = assembleCreativeMemory(
        [
          {
            packageId: "rej",
            createdAt: daysAgoIso(1),
            centralTopic: CANDIDATE,
            angle: CANDIDATE,
            hook: CANDIDATE,
            painPoint: PAINS[0],
            conflict: "silent profile before interview",
            explicitRejected: true,
            rejectionReason: "operator rejected concept",
            packageStatus: "draft",
          },
        ],
        { nowIso: NOW },
      );
      assert.ok(
        memory.records[0].protection_weight >
          CREATIVE_CORE_V2_MEMORY_CONFIG.veryRecentWeight,
      );
      const result = evaluateStrategyCandidateOriginality({
        candidate: candidateFrom(PRE_START, PAINS[0]),
        memory,
        projectPains: PAINS,
        packageCount: 1,
      });
      assert.equal(result.ok, false);
      assert.ok(
        result.issues.some(
          (i) =>
            i.reason === "rejected_recent_hard_conflict" ||
            i.reason === "same_situation_paraphrase" ||
            i.reason === "same_situation_different_character",
        ),
      );
    },
  );

  await checkAsync("max one strategy repair then exhausted", async () => {
    let calls = 0;
    const memory = assembleCreativeMemory(
      [
        {
          packageId: "p1",
          createdAt: daysAgoIso(1),
          centralTopic: CANDIDATE,
          angle: CANDIDATE,
          hook: CANDIDATE,
          painPoint: PAINS[0],
          conflict: "silent profile",
          packageStatus: "ready",
        },
      ],
      { nowIso: NOW },
    );
    const result = await createStrategyCandidateWithOriginality({
      memory,
      projectPains: PAINS,
      packageCount: 1,
      generate: ({ attempt, repairAppend }) => {
        calls += 1;
        if (attempt === 1) assert.equal(repairAppend, null);
        if (attempt === 2) assert.ok(repairAppend && repairAppend.includes("RETRY"));
        return candidateFrom(PRE_START, PAINS[0]);
      },
    });
    assert.equal(calls, CREATIVE_CORE_V2_MEMORY_CONFIG.maxStrategyAttempts);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, STRATEGY_ORIGINALITY_EXHAUSTED_V2);
      assert.equal(result.diagnostics.exhausted, true);
      assert.equal(result.diagnostics.attempts, 2);
    }
  });

  await checkAsync(
    "same pain + meaningfully different execution can pass",
    async () => {
      const memory = assembleCreativeMemory(
        [
          {
            packageId: "p1",
            createdAt: daysAgoIso(1),
            centralTopic: DISTINCT,
            angle: DISTINCT,
            hook: "Timing the photo shoot.",
            painPoint: PAINS[0],
            conflict: "slow photo process",
            setting: "warehouse aisle",
            visual: "phone on cardboard box",
            reveal: "clip-on stand",
            payoff: "twenty second shoot",
            packageStatus: "ready",
          },
        ],
        { nowIso: NOW },
      );
      const result = evaluateStrategyCandidateOriginality({
        candidate: {
          topic:
            "A cafe owner stacks printed menus while a freelancer waits for assets on a rainy terrace",
          angle:
            "Printed menus pile up while digital assets never arrive for the weekend rush",
          pain_point: PAINS[0],
          creative_fingerprint: computeCreativeFingerprint({
            pain_point: PAINS[0],
            topic:
              "A cafe owner stacks printed menus while a freelancer waits for assets on a rainy terrace",
            angle:
              "Printed menus pile up while digital assets never arrive for the weekend rush",
            setting: "rainy cafe terrace",
            visual: "printed menus stack",
            conflict: "freelancer delay before weekend",
            reveal: "blank Instagram grid on phone",
            payoff: "owner posts one story from the terrace",
            narrative: "waiting for assets cafe",
          }),
        },
        memory,
        projectPains: PAINS,
        packageCount: 1,
      });
      assert.equal(result.ok, true);
      assert.ok(!result.issues.some((i) => i.reason === "pain_not_rotated"));
    },
  );

  await checkAsync(
    "same pain + same recent situation/execution is blocked",
    async () => {
      const memory = assembleCreativeMemory(
        [
          {
            packageId: "p1",
            createdAt: daysAgoIso(1),
            centralTopic: DISTINCT,
            angle: DISTINCT,
            hook: "Timing the photo shoot.",
            painPoint: PAINS[0],
            conflict: "slow photo process",
            setting: "warehouse aisle",
            visual: "phone on cardboard box",
            reveal: "clip-on stand",
            payoff: "twenty second shoot",
            packageStatus: "ready",
          },
        ],
        { nowIso: NOW },
      );
      const result = evaluateStrategyCandidateOriginality({
        candidate: candidateFrom(DISTINCT, PAINS[0], DISTINCT),
        memory,
        projectPains: PAINS,
        packageCount: 1,
      });
      assert.equal(result.ok, false);
      assert.ok(
        result.issues.some(
          (i) =>
            i.reason === "pain_not_rotated" ||
            i.reason === "same_situation_paraphrase" ||
            i.reason === "fingerprint_hard_conflict",
        ),
      );
    },
  );

  await checkAsync(
    "technical cancelled is not creative rejection hard-block",
    async () => {
      const memory = assembleCreativeMemory(
        [
          {
            packageId: "cancelled-tech",
            createdAt: daysAgoIso(1),
            centralTopic: DISTINCT,
            angle: DISTINCT,
            hook: DISTINCT,
            painPoint: PAINS[0],
            conflict: "slow photo",
            runStatus: "cancelled",
            // no rejectionReason, no explicitRejected
          },
        ],
        { nowIso: NOW },
      );
      assert.equal(memory.records[0]?.source_status, "cancelled");
      assert.equal(memory.records[0]?.rejected, false);
      // A truly different concept on same pain should not get rejected_recent_hard_conflict
      const result = evaluateStrategyCandidateOriginality({
        candidate: {
          topic:
            "A cafe owner stacks printed menus while a freelancer waits for assets on a rainy terrace",
          angle: "Weekend rush without assets",
          pain_point: PAINS[1]!,
          creative_fingerprint: computeCreativeFingerprint({
            pain_point: PAINS[1],
            topic:
              "A cafe owner stacks printed menus while a freelancer waits for assets on a rainy terrace",
            angle: "Weekend rush without assets",
            setting: "rainy cafe terrace",
            visual: "printed menus",
            conflict: "freelancer delay",
            reveal: "blank grid",
            payoff: "one terrace story",
          }),
        },
        memory,
        projectPains: PAINS,
        packageCount: 1,
      });
      assert.ok(
        !result.issues.some((i) => i.reason === "rejected_recent_hard_conflict"),
      );
    },
  );

  await checkAsync(
    "explicit creative rejection is strongly protected",
    async () => {
      const memory = assembleCreativeMemory(
        [
          {
            packageId: "rej-1",
            createdAt: daysAgoIso(1),
            centralTopic: CANDIDATE,
            angle: CANDIDATE,
            hook: CANDIDATE,
            painPoint: PAINS[0],
            conflict: "profile silence",
            props: "phone laptop feed",
            explicitRejected: true,
            rejectionReason: "operator rejected creative concept",
          },
        ],
        { nowIso: NOW },
      );
      assert.equal(memory.records[0]?.rejected, true);
      const result = evaluateStrategyCandidateOriginality({
        candidate: candidateFrom(PRE_START, PAINS[0], "new hire POV"),
        memory,
        projectPains: PAINS,
        packageCount: 1,
      });
      assert.equal(result.ok, false);
      assert.ok(
        result.issues.some((i) => i.reason === "rejected_recent_hard_conflict") ||
          result.issues.length > 0,
      );
    },
  );

  await checkAsync("pain_not_rotated alone does not hard-fail gate", async () => {
    assert.equal(
      isHardOriginalityIssue({ reason: "pain_not_rotated", detail: "test" }),
      false,
    );
  });

  await checkAsync("protection weight decreases with age", async () => {
    const recent = computeProtectionWeight({
      createdAt: daysAgoIso(2),
      nowIso: NOW,
      indexFromNewest: 5,
      rejected: false,
    });
    const ancient = computeProtectionWeight({
      createdAt: daysAgoIso(120),
      nowIso: NOW,
      indexFromNewest: 5,
      rejected: false,
    });
    assert.ok(recent > ancient);
    assert.equal(ancient, CREATIVE_CORE_V2_MEMORY_CONFIG.ancientWeight);
  });

  await checkAsync("buildMemoryRecord fills required memory fields", async () => {
    const record = buildMemoryRecord(
      {
        packageId: "x",
        createdAt: daysAgoIso(3),
        centralTopic: DISTINCT,
        painPoint: PAINS[1],
        conflict: "too many people for one photo",
        reveal: "one person with a stand wins",
        payoff: "simple gear beats a crowd",
        emotion: "frustration to relief",
        setting: "warehouse aisle",
        props: "phone box stand",
        packageStatus: "approved",
      },
      { nowIso: NOW, indexFromNewest: 0 },
    );
    assert.equal(record.package_id, "x");
    assert.ok(record.fingerprint.scenario_key);
    assert.ok(record.protection_weight > 0);
    assert.equal(record.source_status, "approved");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

async function checkAsync(
  name: string,
  fn: () => void | Promise<void>,
): Promise<void> {
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

void run();
