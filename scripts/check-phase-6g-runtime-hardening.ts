/**
 * Phase 6G — production runtime hardening checks.
 *   npm run check:phase-6g-runtime-hardening
 *
 * No paid provider calls. Unit + static wiring only.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PRODUCTION_RUNTIME_VERSION,
  PACKAGE_GENERATION_LEASE_SECONDS,
  PACKAGE_GENERATION_HEARTBEAT_INTERVAL_MS,
  assertPackageClaimHeartbeatConfig,
  PackageGenerationClaimLostError,
  decidePackageCallbackTransition,
  computeCountersFromItems,
  evaluateRunWatchdog,
  STUCK_VIDEO_JOB_MESSAGE,
  getWorkerInstanceId,
  runtimeLog,
} from "@/lib/production-runtime";
import { workflowResponse } from "@/lib/ai/apiResponse";
import { GENERATION_TERMINAL_ERRORS } from "@/lib/ai/workflows/generationTerminal";

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

console.log("\nphase-6g-runtime-hardening");

check("runtime version 6g", () => {
  assert.equal(PRODUCTION_RUNTIME_VERSION, "production-runtime@6g");
});

check("heartbeat interval shorter than lease", () => {
  assertPackageClaimHeartbeatConfig(
    PACKAGE_GENERATION_LEASE_SECONDS,
    PACKAGE_GENERATION_HEARTBEAT_INTERVAL_MS,
  );
  assert.ok(
    PACKAGE_GENERATION_HEARTBEAT_INTERVAL_MS <
      PACKAGE_GENERATION_LEASE_SECONDS * 1000,
  );
});

check("heartbeat config rejects interval >= lease", () => {
  assert.throws(() => assertPackageClaimHeartbeatConfig(900, 900_000));
});

check("generation_claim_lost is retryable 503", () => {
  assert.ok(
    (GENERATION_TERMINAL_ERRORS as readonly string[]).includes(
      "generation_claim_lost",
    ),
  );
  const res = workflowResponse({
    ok: false,
    error: "generation_claim_lost",
    attempts: 0,
    validationErrors: [{ path: "strategy_item_id", message: "lost" }],
  });
  assert.equal(res.status, 503);
});

check("PackageGenerationClaimLostError code", () => {
  const err = new PackageGenerationClaimLostError();
  assert.equal(err.code, "generation_claim_lost");
  assert.equal(err.retryable, true);
});

check("package callback CAS: duplicate idempotent", () => {
  const d = decidePackageCallbackTransition("ready", "ready");
  assert.equal(d.outcome, "idempotent");
  assert.equal(d.applyStatus, false);
});

check("package callback CAS: stale backward ignored", () => {
  const d = decidePackageCallbackTransition("approved", "draft");
  assert.equal(d.outcome, "ignored");
});

check("package callback CAS: archived revive rejected", () => {
  const d = decidePackageCallbackTransition("archived", "ready");
  assert.equal(d.outcome, "rejected");
});

check("package callback CAS: forward accepted", () => {
  const d = decidePackageCallbackTransition("draft", "ready");
  assert.equal(d.outcome, "accepted");
  assert.equal(d.applyStatus, true);
});

check("counters from items", () => {
  const c = computeCountersFromItems([
    { status: "completed" },
    { status: "failed" },
    { status: "queued" },
  ]);
  assert.deepEqual(c, {
    requested_total: 3,
    generated_total: 1,
    failed_total: 1,
  });
});

check("watchdog still fails stale expired lease", () => {
  const now = Date.now();
  const past = new Date(now - 60_000).toISOString();
  const decision = evaluateRunWatchdog({
    runStatus: "running",
    runUpdatedAt: past,
    packageCount: 1,
    nowMs: now,
    jobs: [
      {
        id: "j1",
        status: "processing",
        leaseExpiresAt: past,
        updatedAt: past,
        output: {},
      },
    ],
  });
  assert.deepEqual(decision.failStaleJobIds, ["j1"]);
  assert.equal(STUCK_VIDEO_JOB_MESSAGE.includes("lease"), true);
});

check("worker instance id stable in process", () => {
  const a = getWorkerInstanceId();
  const b = getWorkerInstanceId();
  assert.equal(a, b);
  assert.ok(a.length > 0);
});

check("runtimeLog redacts secret-like keys", () => {
  const original = console.info;
  let captured = "";
  console.info = (msg?: unknown) => {
    captured = String(msg);
  };
  try {
    runtimeLog("info", {
      event: "package_claim_acquired",
      api_key: "should-not-appear",
      outcome: "ok",
    });
  } finally {
    console.info = original;
  }
  assert.match(captured, /\[redacted\]/);
  assert.doesNotMatch(captured, /should-not-appear/);
});

console.log("\nWiring");
await checkAsync("claim heartbeat wired in generate", async () => {
  const src = await readFile(
    new URL("../lib/ai/workflows/generateContentPackage.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /startPackageGenerationHeartbeat/);
  assert.match(src, /renewPackageGenerationClaim|assertOwned\(\"creative_engine\"\)/);
  assert.match(src, /assertOwned\(\"presentation\"\)/);
  assert.match(src, /generation_claim_lost/);
});

await checkAsync("variant dispatch uses lease RPC", async () => {
  const src = await readFile(
    new URL("../lib/ai/workflows/dispatchVariantVideoJob.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /claimVideoJobForDispatch/);
  assert.doesNotMatch(src, /\.update\(\{\s*status:\s*[\"']processing[\"']/);
});

await checkAsync("recovery endpoint exists", async () => {
  const src = await readFile(
    new URL(
      "../app/api/internal/production-run-recovery/route.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(src, /verifyN8nSecret/);
  assert.match(src, /runScheduledProductionRecovery/);
  assert.match(src, /reconcileProductionRunForRecovery/);
});

await checkAsync("terminal settle wired", async () => {
  const src = await readFile(
    new URL("../lib/api/production-run-admin.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /settleProductionRunTerminal/);
  assert.match(src, /recomputeProductionRunCounters/);
  assert.match(src, /failedItems/);
});

await checkAsync("package callback CAS wired", async () => {
  const src = await readFile(
    new URL("../lib/n8n/handlers.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /decidePackageCallbackTransition/);
  assert.match(src, /callback_accepted|callback_ignored|callback_rejected/);
});

await checkAsync("migration 026 hardening objects", async () => {
  const src = await readFile(
    new URL(
      "../supabase/migrations/026_production_runtime_hardening.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(src, /settle_production_run_terminal/);
  assert.match(src, /uniq_active_primary_render_per_package/);
  assert.match(src, /video_jobs_processing_requires_lease/);
  assert.match(src, /enforce_translation_package_matches_source/);
  assert.match(src, /claim_production_recovery_lease/);
  assert.match(src, /production_run_item_failure_telemetry/);
});

await checkAsync("UI surfaces failed items", async () => {
  const src = await readFile(
    new URL(
      "../components/projects/ContentProductionPanel/ContentProductionPanel.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(src, /failedItems/);
  assert.match(src, /Selhané položky/);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
