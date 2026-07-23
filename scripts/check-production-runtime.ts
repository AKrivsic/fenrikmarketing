/**
 * Phase 5A — Production runtime reliability checks.
 *   npm run check:production-runtime
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildDurableArtifactOutput,
  shouldSendFailedCallbackAfterUpload,
  shouldHardFailFidelityAfterRepair,
  shouldHardFailStoryIntegrityAfterRepair,
  classifyStoryIntegrityForHardFail,
  STORY_INTEGRITY_SOFT_AFTER_REPAIR_CODES,
  evaluateRunWatchdog,
  mergeProductionRunIdIntoVariantMetadata,
  PRODUCTION_RUNTIME_VERSION,
  STUCK_VIDEO_JOB_MESSAGE,
} from "@/lib/production-runtime";
import { classifyFidelityFailuresForRepair } from "@/lib/creative-candidates/fidelityCheck";
import type { ConceptFidelityResult } from "@/lib/creative-candidates/types";
import type { StoryIntegrityResult } from "@/lib/creative-candidates/storyIntegrity";
import { STORY_INTEGRITY_VERSION } from "@/lib/creative-candidates/storyIntegrity";
import {
  PRODUCTION_RUN_CANCELLED_MESSAGE,
  shouldRejectCompletedCallbackForOperatorCancel,
} from "@/lib/api/production-run-cancel";
import { GENERATION_TERMINAL_ERRORS } from "@/lib/ai/workflows/generationTerminal";
import { workflowResponse } from "@/lib/ai/apiResponse";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

async function checkAsync(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${name}`);
    console.error(`       ${message.replace(/\n/g, "\n       ")}`);
  }
}

function fidelity(reasons: string[]): ConceptFidelityResult {
  return {
    passed: false,
    failureReasons: reasons,
    checks: {},
  } as ConceptFidelityResult;
}

function story(
  codes: Array<StoryIntegrityResult["violations"][number]["code"]>,
): StoryIntegrityResult {
  return {
    passed: codes.length === 0,
    version: STORY_INTEGRITY_VERSION,
    allowedWorldTokens: [],
    productDemonstration: {
      present: true,
      askPresent: true,
      answerPresent: true,
      resultPresent: true,
      landingPageOnly: false,
      evidence: [],
    },
    ctaMatch: {
      packageCta: "x",
      voiceoverContainsCta: true,
      ctaMismatch: false,
      evidence: null,
    },
    violations: codes.map((code) => ({ code, message: code })),
    warnings: [],
    summary: codes.join(",") || "ok",
  };
}

console.log("\nproduction-runtime");
check("version tag", () => {
  assert.equal(PRODUCTION_RUNTIME_VERSION, "production-runtime@6g");
});

console.log("\nInvariant 1 — exclusive package generation");
check("generation_in_progress terminal code exists", () => {
  assert.ok(
    (GENERATION_TERMINAL_ERRORS as readonly string[]).includes(
      "generation_in_progress",
    ),
  );
});
check("workflowResponse returns 503 retryable", () => {
  const res = workflowResponse({
    ok: false,
    error: "generation_in_progress",
    attempts: 0,
    validationErrors: [{ path: "strategy_item_id", message: "busy" }],
  });
  assert.equal(res.status, 503);
});

console.log("\nInvariant 2 — upload durability");
check("artifacts persisted → never failed callback", () => {
  assert.equal(
    shouldSendFailedCallbackAfterUpload({
      artifactsPersisted: true,
      completedCallbackSucceeded: false,
    }),
    false,
  );
});
check("no artifacts → failed callback allowed", () => {
  assert.equal(
    shouldSendFailedCallbackAfterUpload({
      artifactsPersisted: false,
      completedCallbackSucceeded: false,
    }),
    true,
  );
});
check("durable output includes mp4_url", () => {
  const out = buildDurableArtifactOutput({
    mp4_url: "https://example.com/a.mp4",
  });
  assert.equal(out.mp4_url, "https://example.com/a.mp4");
});
check("operator-cancel late completed still rejected", () => {
  assert.equal(
    shouldRejectCompletedCallbackForOperatorCancel({
      callbackStatus: "completed",
      jobStatus: "failed",
      jobErrorMessage: PRODUCTION_RUN_CANCELLED_MESSAGE,
      productionRunIsCancelled: false,
    }),
    true,
  );
});

console.log("\nInvariant 3 — lease / safe stale reclaim");
check("live lease is not reclaimed by watchdog", () => {
  const now = Date.now();
  const decision = evaluateRunWatchdog({
    runStatus: "running",
    runUpdatedAt: new Date(now - 60_000).toISOString(),
    packageCount: 2,
    nowMs: now,
    stuckWithPackagesMs: 45 * 60_000,
    jobs: [
      {
        id: "j1",
        status: "processing",
        leaseExpiresAt: new Date(now + 300_000).toISOString(),
        updatedAt: new Date(now).toISOString(),
        output: {},
      },
    ],
  });
  assert.deepEqual(decision.failStaleJobIds, []);
});
check("expired lease without mp4 → fail", () => {
  const now = Date.now();
  const decision = evaluateRunWatchdog({
    runStatus: "running",
    runUpdatedAt: new Date(now - 60_000).toISOString(),
    packageCount: 1,
    nowMs: now,
    jobs: [
      {
        id: "j2",
        status: "processing",
        leaseExpiresAt: new Date(now - 1_000).toISOString(),
        updatedAt: new Date(now - 600_000).toISOString(),
        output: {},
      },
    ],
  });
  assert.deepEqual(decision.failStaleJobIds, ["j2"]);
  assert.equal(decision.failMessage, STUCK_VIDEO_JOB_MESSAGE);
});
check("processing with durable mp4 → promote", () => {
  const now = Date.now();
  const decision = evaluateRunWatchdog({
    runStatus: "running",
    runUpdatedAt: new Date(now - 60_000).toISOString(),
    packageCount: 1,
    nowMs: now,
    jobs: [
      {
        id: "j3",
        status: "processing",
        leaseExpiresAt: new Date(now - 1_000).toISOString(),
        updatedAt: new Date(now - 600_000).toISOString(),
        output: { mp4_url: "https://cdn/x.mp4" },
      },
    ],
  });
  assert.deepEqual(decision.promoteJobIds, ["j3"]);
  assert.deepEqual(decision.failStaleJobIds, []);
});

console.log("\nInvariant 4 — repair policy");
check("non-material fidelity soft-continues", () => {
  const f = fidelity(["some_deterministic_residue"]);
  assert.equal(classifyFidelityFailuresForRepair(f).material, false);
  assert.equal(shouldHardFailFidelityAfterRepair(f), false);
});
check("material fidelity hard-fails", () => {
  assert.equal(
    shouldHardFailFidelityAfterRepair(fidelity(["core_idea_not_recognizable"])),
    true,
  );
});
check("primary_actor_changed soft after repair", () => {
  assert.ok(STORY_INTEGRITY_SOFT_AFTER_REPAIR_CODES.has("primary_actor_changed"));
  const s = story(["primary_actor_changed"]);
  assert.equal(shouldHardFailStoryIntegrityAfterRepair(s), false);
  assert.equal(
    classifyStoryIntegrityForHardFail(s, { afterRepairAttempt: true })
      .shouldHardFail,
    false,
  );
});
check("world_abandoned hard after repair", () => {
  assert.equal(
    shouldHardFailStoryIntegrityAfterRepair(story(["world_abandoned"])),
    true,
  );
});

console.log("\nInvariant 5 — run watchdog");
check("old queued job with packages → fail for settlement", () => {
  const now = Date.now();
  const decision = evaluateRunWatchdog({
    runStatus: "running",
    runUpdatedAt: new Date(now - 50 * 60_000).toISOString(),
    packageCount: 3,
    nowMs: now,
    stuckWithPackagesMs: 45 * 60_000,
    jobs: [
      {
        id: "q1",
        status: "queued",
        leaseExpiresAt: null,
        updatedAt: new Date(now - 50 * 60_000).toISOString(),
        output: {},
      },
    ],
  });
  assert.deepEqual(decision.failStaleJobIds, ["q1"]);
  assert.equal(decision.shouldForceReconcile, true);
});

console.log("\nInvariant 7 — stop / variant stamp");
check("variant metadata inherits production_run_id", () => {
  const merged = mergeProductionRunIdIntoVariantMetadata(
    { production_run_id: "run-abc" },
    { source: "language_variant" },
  );
  assert.equal(merged.production_run_id, "run-abc");
});

console.log("\nWiring (integration-style static)");
await checkAsync("generate claim + heartbeat + PDI repair", async () => {
  const src = await readFile(
    new URL("../lib/ai/workflows/generateContentPackage.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /claimPackageGeneration/);
  assert.match(src, /startPackageGenerationHeartbeat/);
  assert.match(src, /generation_in_progress/);
  assert.match(src, /buildProductDemonstrationRepairDelta/);
  assert.match(src, /shouldHardFailFidelityAfterRepair/);
  assert.match(src, /shouldHardFailStoryIntegrityAfterRepair/);
});
await checkAsync("regenerate active-render + PDI", async () => {
  const src = await readFile(
    new URL("../lib/ai/workflows/regenerateContentPackage.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /assertNoActivePackageRender/);
  assert.match(src, /buildProductDemonstrationRepairDelta/);
});
await checkAsync("start-video lease claim", async () => {
  const src = await readFile(
    new URL("../app/api/n8n/start-video-job/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /claimVideoJobForDispatch/);
  assert.match(src, /promoteVideoJobIfArtifactsReady/);
  assert.match(src, /artifacts_ready/);
});
await checkAsync("jobRunner durability + heartbeat", async () => {
  const src = await readFile(
    new URL("../video-worker/jobRunner.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /persistVideoJobArtifacts/);
  assert.match(src, /shouldSendFailedCallbackAfterUpload/);
  assert.match(src, /renewVideoJobLease/);
});
await checkAsync("cancel propagation", async () => {
  const src = await readFile(
    new URL("../lib/api/production-run-cancel.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /collectContentItemIdsForRunCancel/);
  assert.match(src, /cancelTranslationJobsForPackages/);
});
await checkAsync("reconcile watchdog", async () => {
  const src = await readFile(
    new URL("../lib/api/production-run-admin.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /evaluateRunWatchdog/);
  assert.match(src, /STUCK_VIDEO_JOB_MESSAGE/);
});
await checkAsync("language variant run stamp", async () => {
  const src = await readFile(
    new URL("../lib/ai/workflows/generateLanguageVariants.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /mergeProductionRunIdIntoVariantMetadata/);
});
await checkAsync("migration 025 RPCs", async () => {
  const src = await readFile(
    new URL("../supabase/migrations/025_production_runtime.sql", import.meta.url),
    "utf8",
  );
  assert.match(src, /claim_package_generation/);
  assert.match(src, /claim_video_job_for_dispatch/);
  assert.match(src, /persist_video_job_artifacts/);
  assert.match(src, /promote_video_job_if_artifacts_ready/);
  assert.match(src, /lease_expires_at/);
});
await checkAsync("migration 026 hardening", async () => {
  const src = await readFile(
    new URL(
      "../supabase/migrations/026_production_runtime_hardening.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(src, /settle_production_run_terminal/);
  assert.match(src, /uniq_active_primary_render_per_package/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
