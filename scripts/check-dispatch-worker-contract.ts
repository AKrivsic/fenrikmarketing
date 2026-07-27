/**
 * Dispatch / worker video-lease contract safety check.
 *
 *   npm run check:dispatch-worker-contract
 *
 * Always runs static (repo) assertions.
 * When NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (or
 * REQUIRE_LIVE_CONTRACT_CHECK=1), also asserts live DB RPCs via
 * assert_video_lease_contract().
 *
 * Deployments MUST fail when live RPC drifts from Variant 1.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  DISPATCH_CONTRACT_FINGERPRINT,
  WORKER_CONTRACT_FINGERPRINT,
  VIDEO_LEASE_CONTRACT_VERSION,
  assertDispatchWorkerSqlContract,
  classifyDispatchRpcSource,
  classifyWorkerRpcSource,
  extractFunctionSourceFromSql,
} from "@/lib/production-runtime/videoLeaseContract";

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

async function checkAsync(
  name: string,
  fn: () => Promise<void>,
): Promise<void> {
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

console.log("\ndispatch-worker-contract");

// --- Pure regression: classifier detects old vs new contracts ---

check("classifier rejects old 025 dispatch (lease at enqueue)", () => {
  const oldDispatch = `
    declare
      lease_until timestamptz;
      can_claim boolean := false;
    begin
      lease_until := now() + make_interval(secs => p_lease_seconds);
      update video_jobs
      set
        status = 'processing',
        lease_owner = p_owner_token,
        lease_expires_at = lease_until
      where id = p_job_id;
    end;
  `;
  assert.equal(
    classifyDispatchRpcSource(oldDispatch),
    "dispatch_v0_processing_lease",
  );
  const violations = assertDispatchWorkerSqlContract({
    dispatchSrc: oldDispatch,
    workerSrc: `
      -- ${WORKER_CONTRACT_FINGERPRINT}
      lease_until := now() + make_interval(secs => 600);
      update video_jobs set status = 'processing', lease_expires_at = lease_until;
    `,
  });
  assert.ok(
    violations.some((v) => v.code === "dispatch_old_lease_at_enqueue"),
    `expected dispatch_old_lease_at_enqueue, got ${JSON.stringify(violations)}`,
  );
});

check("classifier accepts Variant 1 dispatch (queued, no lease)", () => {
  const v1 = `
    declare
      -- ${DISPATCH_CONTRACT_FINGERPRINT}
      can_dispatch boolean := false;
    begin
      update video_jobs
      set
        status = 'queued',
        lease_owner = null,
        lease_expires_at = null
      where id = p_job_id;
    end;
  `;
  assert.equal(classifyDispatchRpcSource(v1), "dispatch_v1_queued_no_lease");
});

check("classifier requires worker to start lease", () => {
  const worker = `
    -- ${WORKER_CONTRACT_FINGERPRINT}
    lease_until := now() + make_interval(secs => p_lease_seconds);
    update video_jobs set status = 'processing', lease_expires_at = lease_until;
  `;
  assert.equal(
    classifyWorkerRpcSource(worker),
    "worker_v1_processing_with_lease",
  );
  const noLease = `update video_jobs set status = 'queued';`;
  assert.equal(classifyWorkerRpcSource(noLease), "unknown");
});

check("old contract cannot silently pass assertDispatchWorkerSqlContract", () => {
  const old = `
    lease_until := now() + make_interval(secs => 600);
    update video_jobs set status = 'processing', lease_owner = p_owner_token, lease_expires_at = lease_until;
  `;
  const workerOk = `
    -- ${WORKER_CONTRACT_FINGERPRINT}
    lease_until := now() + make_interval(secs => 600);
    update video_jobs set status = 'processing';
  `;
  const v = assertDispatchWorkerSqlContract({
    dispatchSrc: old,
    workerSrc: workerOk,
  });
  assert.ok(v.length > 0);
  assert.ok(v.some((x) => x.code === "dispatch_old_lease_at_enqueue"));
});

// --- Repo SQL + app/worker wiring ---

await checkAsync("canonical migration 030 has both fingerprints", async () => {
  const sql = await readFile(
    path.join(
      root,
      "supabase/migrations/20260725210444_repair_video_lease_dispatch_contract.sql",
    ),
    "utf8",
  );
  assert.match(sql, new RegExp(DISPATCH_CONTRACT_FINGERPRINT));
  assert.match(sql, new RegExp(WORKER_CONTRACT_FINGERPRINT));
  assert.match(sql, /assert_video_lease_contract/);

  const dispatchSrc = extractFunctionSourceFromSql(
    sql,
    "claim_video_job_for_dispatch",
  );
  const workerSrc = extractFunctionSourceFromSql(
    sql,
    "claim_video_job_for_worker",
  );
  assert.ok(dispatchSrc, "dispatch function not found in migration 030");
  assert.ok(workerSrc, "worker function not found in migration 030");

  const violations = assertDispatchWorkerSqlContract({
    dispatchSrc,
    workerSrc,
  });
  assert.deepEqual(violations, [], JSON.stringify(violations, null, 2));
});

await checkAsync(
  "migration 030 dispatch never assigns lease_until",
  async () => {
    const sql = await readFile(
      path.join(
        root,
        "supabase/migrations/20260725210444_repair_video_lease_dispatch_contract.sql",
      ),
      "utf8",
    );
    const dispatchSrc = extractFunctionSourceFromSql(
      sql,
      "claim_video_job_for_dispatch",
    )!;
    assert.equal(
      /lease_until\s*:=\s*now\s*\(/.test(dispatchSrc),
      false,
      "dispatch must not start lease",
    );
    assert.match(dispatchSrc, /lease_owner\s*=\s*null/);
    assert.match(dispatchSrc, /status\s*=\s*'queued'/);
  },
);

await checkAsync("migration 030 worker always starts lease", async () => {
  const sql = await readFile(
    path.join(
      root,
      "supabase/migrations/20260725210444_repair_video_lease_dispatch_contract.sql",
    ),
    "utf8",
  );
  const workerSrc = extractFunctionSourceFromSql(
    sql,
    "claim_video_job_for_worker",
  )!;
  assert.match(workerSrc, /lease_until\s*:=\s*now\s*\(/);
  assert.match(workerSrc, /status\s*=\s*'processing'/);
});

await checkAsync("025 old dispatch is detected as v0", async () => {
  const sql = await readFile(
    path.join(root, "supabase/migrations/025_production_runtime.sql"),
    "utf8",
  );
  const dispatchSrc = extractFunctionSourceFromSql(
    sql,
    "claim_video_job_for_dispatch",
  );
  assert.ok(dispatchSrc);
  assert.equal(
    classifyDispatchRpcSource(dispatchSrc),
    "dispatch_v0_processing_lease",
  );
});

await checkAsync("start-video-job returns queued / no lease at dispatch", async () => {
  const src = await readFile(
    path.join(root, "app/api/n8n/start-video-job/route.ts"),
    "utf8",
  );
  assert.match(src, /claimVideoJobForDispatch/);
  assert.match(src, /status:\s*"queued"/);
  assert.match(src, /lease_owner:\s*null/);
  assert.doesNotMatch(
    src,
    /status:\s*"processing"/,
    "start-video-job must not advertise processing after dispatch",
  );
});

await checkAsync("video worker claims via claimVideoJobForWorker", async () => {
  const src = await readFile(
    path.join(root, "video-worker/jobRunner.ts"),
    "utf8",
  );
  assert.match(src, /claimVideoJobForWorker/);
  assert.match(src, /job_claim_skipped/);
  assert.match(src, /claim\.status !== "claimed"/);
});

await checkAsync("dispatchVariantVideoJob uses Variant 1 prepare", async () => {
  const src = await readFile(
    path.join(root, "lib/ai/workflows/dispatchVariantVideoJob.ts"),
    "utf8",
  );
  assert.match(src, /claimVideoJobForDispatch/);
  assert.match(src, /keeps queued, no lease/);
});

await checkAsync("watchdog never stale-fails queued jobs", async () => {
  const src = await readFile(
    path.join(root, "lib/production-runtime/runWatchdog.ts"),
    "utf8",
  );
  assert.match(src, /Only processing jobs can be stale-failed/);
  assert.match(src, /job\.status === "processing"/);
});

// --- Live DB gate ---

const requireLive =
  process.env.REQUIRE_LIVE_CONTRACT_CHECK === "1" ||
  process.env.REQUIRE_LIVE_CONTRACT_CHECK === "true";
const hasSupabaseCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

await checkAsync("live DB video lease contract", async () => {
  if (!hasSupabaseCreds) {
    if (requireLive) {
      throw new Error(
        "REQUIRE_LIVE_CONTRACT_CHECK=1 but NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing",
      );
    }
    console.log(
      "       (skipped live DB — no Supabase admin env; set REQUIRE_LIVE_CONTRACT_CHECK=1 to force)",
    );
    return;
  }

  const { createSupabaseAdminClient } = await import(
    "@/lib/supabase/admin"
  );
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("assert_video_lease_contract");
  if (error) {
    throw new Error(
      `assert_video_lease_contract RPC failed: ${error.message}. ` +
        `Apply migration 20260725210444_repair_video_lease_dispatch_contract.sql`,
    );
  }
  const row =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  assert.equal(row.ok, true, JSON.stringify(row, null, 2));
  assert.equal(row.contract, VIDEO_LEASE_CONTRACT_VERSION);
  const errors = row.errors;
  assert.ok(Array.isArray(errors));
  assert.equal((errors as unknown[]).length, 0);

  // Also pull live prosrc via a direct SQL-shaped check is not available through
  // PostgREST without a helper; assert_video_lease_contract is the gate.
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
