/**
 * Video lease lifecycle contract (Variant 1).
 *
 * Canonical lifecycle:
 *   queued → (dispatch authorize, no lease) → worker claim → processing + lease
 *   → heartbeat → completed | failed
 *
 * Dispatch must NEVER start a processing lease.
 * Worker is the ONLY component allowed to start processing + lease.
 */

export const DISPATCH_CONTRACT_FINGERPRINT =
  "VIDEO_LEASE_CONTRACT=dispatch_v1_queued_no_lease";

export const WORKER_CONTRACT_FINGERPRINT =
  "VIDEO_LEASE_CONTRACT=worker_v1_processing_with_lease";

export const VIDEO_LEASE_CONTRACT_VERSION = "video_lease_v1";

/** Pure classification of a plpgsql function body. */
export type DispatchContractKind =
  | "dispatch_v1_queued_no_lease"
  | "dispatch_v0_processing_lease"
  | "unknown";

export type WorkerContractKind =
  | "worker_v1_processing_with_lease"
  | "unknown";

export function classifyDispatchRpcSource(src: string): DispatchContractKind {
  const hasFingerprint = src.includes(DISPATCH_CONTRACT_FINGERPRINT);
  const clearsLease = /lease_owner\s*=\s*null/.test(src);
  const assignsLeaseUntil = /lease_until\s*:=\s*now\s*\(/.test(src);
  const usesCanDispatch = src.includes("can_dispatch");
  const oldProcessingLease =
    assignsLeaseUntil &&
    /status\s*=\s*'processing'/.test(src) &&
    /lease_expires_at\s*=\s*lease_until/.test(src);

  if (oldProcessingLease && !clearsLease) {
    return "dispatch_v0_processing_lease";
  }
  if (
    (hasFingerprint || usesCanDispatch) &&
    clearsLease &&
    !assignsLeaseUntil
  ) {
    return "dispatch_v1_queued_no_lease";
  }
  return "unknown";
}

export function classifyWorkerRpcSource(src: string): WorkerContractKind {
  const assignsLeaseUntil = /lease_until\s*:=\s*now\s*\(/.test(src);
  const setsProcessing = /status\s*=\s*'processing'/.test(src);
  // Fingerprint preferred; body shape (lease_until + processing) is worker_v1.
  if (assignsLeaseUntil && setsProcessing) {
    return "worker_v1_processing_with_lease";
  }
  return "unknown";
}

export interface ContractViolation {
  code: string;
  message: string;
}

/**
 * Assert repo / live SQL bodies match Variant 1.
 * Returns violations (empty = ok).
 */
export function assertDispatchWorkerSqlContract(args: {
  dispatchSrc: string;
  workerSrc: string;
}): ContractViolation[] {
  const violations: ContractViolation[] = [];
  const dispatchKind = classifyDispatchRpcSource(args.dispatchSrc);
  const workerKind = classifyWorkerRpcSource(args.workerSrc);

  if (dispatchKind === "dispatch_v0_processing_lease") {
    violations.push({
      code: "dispatch_old_lease_at_enqueue",
      message:
        "claim_video_job_for_dispatch starts processing+lease (025 contract). " +
        "Dispatch must keep jobs queued with no lease.",
    });
  } else if (dispatchKind !== "dispatch_v1_queued_no_lease") {
    violations.push({
      code: "dispatch_unknown_contract",
      message: `claim_video_job_for_dispatch contract unrecognized (${dispatchKind})`,
    });
  }

  if (!args.dispatchSrc.includes(DISPATCH_CONTRACT_FINGERPRINT)) {
    violations.push({
      code: "dispatch_missing_fingerprint",
      message: `dispatch RPC missing ${DISPATCH_CONTRACT_FINGERPRINT}`,
    });
  }

  if (/lease_until\s*:=\s*now\s*\(/.test(args.dispatchSrc)) {
    violations.push({
      code: "dispatch_assigns_lease_until",
      message: "dispatch must not assign lease_until",
    });
  }

  if (workerKind !== "worker_v1_processing_with_lease") {
    violations.push({
      code: "worker_unknown_contract",
      message: `claim_video_job_for_worker contract unrecognized (${workerKind})`,
    });
  }

  if (!args.workerSrc.includes(WORKER_CONTRACT_FINGERPRINT)) {
    violations.push({
      code: "worker_missing_fingerprint",
      message: `worker RPC missing ${WORKER_CONTRACT_FINGERPRINT}`,
    });
  }

  if (!/lease_until\s*:=\s*now\s*\(/.test(args.workerSrc)) {
    violations.push({
      code: "worker_missing_lease_start",
      message: "worker must assign lease_until (start lease on claim)",
    });
  }

  return violations;
}

/** Extract create-or-replace body region for a named function from a migration SQL file. */
export function extractFunctionSourceFromSql(
  sql: string,
  functionName: string,
): string | null {
  const re = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+${functionName}\\s*\\([\\s\\S]*?\\$\\$[\\s\\S]*?\\$\\$`,
    "i",
  );
  const match = sql.match(re);
  return match ? match[0] : null;
}
