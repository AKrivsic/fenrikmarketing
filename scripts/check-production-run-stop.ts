// Dependency-free checks for production-run Stop / cancel plumbing.
//   npm run check:production-run-stop

import assert from "node:assert/strict";
import {
  PRODUCTION_RUN_CANCELLED_MESSAGE,
  filterContentItemIdsForProductionRun,
  isOperatorCancelMessage,
  isOperatorCancelledVideoJobRetryBlocked,
  productionRunStatusBlocksNewRun,
  readProductionRunIdFromMetadata,
  shouldRejectCompletedCallbackForOperatorCancel,
} from "@/lib/api/production-run-cancel";
import { describeVideoJobFailure } from "@/lib/api/content-shared";
import {
  clearJobAbort,
  isJobCancelRequested,
  registerJobAbort,
  requestJobCancel,
  assertJobNotCancelled,
  JobCancelledError,
} from "@/video-worker/cancellation";
import { cancelQueuedVideoJobs } from "@/video-worker/queue";

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

function section(title: string): void {
  console.log(`\n${title}`);
}

section("cancel message contract");
check("PRODUCTION_RUN_CANCELLED_MESSAGE is stable Czech string", () => {
  assert.equal(PRODUCTION_RUN_CANCELLED_MESSAGE, "Zastaveno operátorem.");
});
check("isOperatorCancelMessage matches only the operator message", () => {
  assert.equal(isOperatorCancelMessage(PRODUCTION_RUN_CANCELLED_MESSAGE), true);
  assert.equal(isOperatorCancelMessage("Renderování videa selhalo."), false);
  assert.equal(isOperatorCancelMessage(null), false);
  assert.equal(isOperatorCancelMessage(undefined), false);
});

section("in-memory cancel registry (idempotent Stop)");
check("requestJobCancel marks job cancelled and aborts controller", () => {
  const id = "job-abort-1";
  clearJobAbort(id);
  const ac = registerJobAbort(id);
  assert.equal(ac.signal.aborted, false);
  requestJobCancel(id);
  assert.equal(isJobCancelRequested(id), true);
  assert.equal(ac.signal.aborted, true);
  assert.throws(() => assertJobNotCancelled(id), JobCancelledError);
  // Idempotent second Stop.
  requestJobCancel(id);
  assert.equal(isJobCancelRequested(id), true);
  clearJobAbort(id);
  assert.equal(isJobCancelRequested(id), false);
});
check("registerJobAbort after cancel starts already aborted", () => {
  const id = "job-abort-2";
  clearJobAbort(id);
  requestJobCancel(id);
  const ac = registerJobAbort(id);
  assert.equal(ac.signal.aborted, true);
  clearJobAbort(id);
});
check("cancelQueuedVideoJobs signals all ids even when none pending", () => {
  const a = "queued-cancel-a";
  const b = "queued-cancel-b";
  clearJobAbort(a);
  clearJobAbort(b);
  const cancelled = cancelQueuedVideoJobs([a, b]);
  assert.deepEqual(new Set(cancelled), new Set([a, b]));
  assert.equal(isJobCancelRequested(a), true);
  assert.equal(isJobCancelRequested(b), true);
  // Idempotent.
  assert.deepEqual(new Set(cancelQueuedVideoJobs([a])), new Set([a]));
  clearJobAbort(a);
  clearJobAbort(b);
});

section("Stop only affects the selected production run");
check("filterContentItemIdsForProductionRun keeps only stamped run items", () => {
  const runA = "run-aaa";
  const runB = "run-bbb";
  const ids = filterContentItemIdsForProductionRun(
    [
      { id: "item-a1", generation_metadata: { production_run_id: runA } },
      { id: "item-b1", generation_metadata: { production_run_id: runB } },
      { id: "item-a2", generation_metadata: { production_run_id: runA } },
      { id: "item-none", generation_metadata: { other: true } },
      { id: "item-null", generation_metadata: null },
    ],
    runA,
  );
  assert.deepEqual(ids.sort(), ["item-a1", "item-a2"].sort());
  assert.equal(readProductionRunIdFromMetadata({ production_run_id: runB }), runB);
});

section("Cancelled jobs cannot become completed again");
check("shouldRejectCompletedCallbackForOperatorCancel covers app guard cases", () => {
  assert.equal(
    shouldRejectCompletedCallbackForOperatorCancel({
      callbackStatus: "completed",
      jobStatus: "failed",
      jobErrorMessage: PRODUCTION_RUN_CANCELLED_MESSAGE,
      productionRunIsCancelled: false,
    }),
    true,
  );
  assert.equal(
    shouldRejectCompletedCallbackForOperatorCancel({
      callbackStatus: "completed",
      jobStatus: "processing",
      jobErrorMessage: null,
      productionRunIsCancelled: true,
    }),
    true,
  );
  assert.equal(
    shouldRejectCompletedCallbackForOperatorCancel({
      callbackStatus: "completed",
      jobStatus: "processing",
      jobErrorMessage: null,
      productionRunIsCancelled: false,
    }),
    false,
  );
  assert.equal(
    shouldRejectCompletedCallbackForOperatorCancel({
      callbackStatus: "failed",
      jobStatus: "failed",
      jobErrorMessage: PRODUCTION_RUN_CANCELLED_MESSAGE,
      productionRunIsCancelled: true,
    }),
    false,
  );
});

section("Operator-cancelled jobs cannot be manually retried");
check("isOperatorCancelledVideoJobRetryBlocked gates retry", () => {
  assert.equal(
    isOperatorCancelledVideoJobRetryBlocked(PRODUCTION_RUN_CANCELLED_MESSAGE),
    true,
  );
  assert.equal(
    isOperatorCancelledVideoJobRetryBlocked("tts_tail_validation_failed:…"),
    false,
  );
  assert.equal(isOperatorCancelledVideoJobRetryBlocked(null), false);
});
check("describeVideoJobFailure surfaces operator Stop distinctly", () => {
  const desc = describeVideoJobFailure(PRODUCTION_RUN_CANCELLED_MESSAGE);
  assert.equal(desc.detail, PRODUCTION_RUN_CANCELLED_MESSAGE);
  assert.match(desc.headline ?? "", /zastaven/i);
});

section("A new production run can still be started after Stop");
check("cancelled status does not block a new run (active gate)", () => {
  assert.equal(productionRunStatusBlocksNewRun("queued"), true);
  assert.equal(productionRunStatusBlocksNewRun("running"), true);
  assert.equal(productionRunStatusBlocksNewRun("cancelled"), false);
  assert.equal(productionRunStatusBlocksNewRun("completed"), false);
  assert.equal(productionRunStatusBlocksNewRun("failed"), false);
});

section("callback / claim race contracts");
check("operator-cancel message is the gate for rejecting late completed callbacks", () => {
  // handleVideoCallback + start-video-job both key off this exact string / run status.
  assert.equal(isOperatorCancelMessage("Zastaveno operátorem."), true);
});
check("JobCancelledError carries the operator message for failed callbacks", () => {
  const err = new JobCancelledError("job-x");
  assert.equal(err.message, PRODUCTION_RUN_CANCELLED_MESSAGE);
  assert.equal(err.videoJobId, "job-x");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
