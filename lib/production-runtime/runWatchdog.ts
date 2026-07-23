import {
  PRODUCTION_RUN_STUCK_WITH_PACKAGES_MS,
  STUCK_VIDEO_JOB_MESSAGE,
} from "@/lib/production-runtime/constants";
import { outputHasDurableMp4 } from "@/lib/production-runtime/videoJobLease";

export interface RunWatchdogJobInput {
  id: string;
  status: string;
  leaseExpiresAt: string | null;
  updatedAt: string | null;
  output: unknown;
}

export interface RunWatchdogInput {
  runStatus: string;
  runUpdatedAt: string;
  packageCount: number;
  nowMs?: number;
  stuckWithPackagesMs?: number;
  jobs: RunWatchdogJobInput[];
}

export interface RunWatchdogDecision {
  /** Promote processing jobs that already have durable mp4. */
  promoteJobIds: string[];
  /** Fail lease-expired processing jobs without artifacts. */
  failStaleJobIds: string[];
  failMessage: string;
  /** True when the run has packages and every open video path is settled by this pass. */
  shouldForceReconcile: boolean;
}

/**
 * Pure watchdog rules for production runs that already have packages
 * (Invariant 5). Complements the zero-package 12-minute stale fail.
 */
export function evaluateRunWatchdog(
  input: RunWatchdogInput,
): RunWatchdogDecision {
  const now = input.nowMs ?? Date.now();
  const stuckMs =
    input.stuckWithPackagesMs ?? PRODUCTION_RUN_STUCK_WITH_PACKAGES_MS;
  const promoteJobIds: string[] = [];
  const failStaleJobIds: string[] = [];

  if (input.runStatus !== "running" && input.runStatus !== "queued") {
    return {
      promoteJobIds,
      failStaleJobIds,
      failMessage: STUCK_VIDEO_JOB_MESSAGE,
      shouldForceReconcile: false,
    };
  }

  const runAgeMs = now - new Date(input.runUpdatedAt).getTime();
  const runOldEnough = runAgeMs >= stuckMs;

  for (const job of input.jobs) {
    if (job.status !== "processing" && job.status !== "queued") continue;

    if (job.status === "processing" && outputHasDurableMp4(job.output)) {
      promoteJobIds.push(job.id);
      continue;
    }

    const leaseExpired =
      job.leaseExpiresAt != null &&
      new Date(job.leaseExpiresAt).getTime() < now;
    const legacyStale =
      !job.leaseExpiresAt &&
      job.updatedAt != null &&
      now - new Date(job.updatedAt).getTime() >= stuckMs;

    if (job.status === "processing" && (leaseExpired || legacyStale)) {
      failStaleJobIds.push(job.id);
      continue;
    }

    // Queued forever while run is old → fail so the slot can settle.
    if (
      job.status === "queued" &&
      runOldEnough &&
      input.packageCount > 0
    ) {
      failStaleJobIds.push(job.id);
    }
  }

  return {
    promoteJobIds,
    failStaleJobIds,
    failMessage: STUCK_VIDEO_JOB_MESSAGE,
    shouldForceReconcile:
      input.packageCount > 0 &&
      (promoteJobIds.length > 0 || failStaleJobIds.length > 0),
  };
}
