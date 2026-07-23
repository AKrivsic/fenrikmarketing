/**
 * Phase 6G — structured production-runtime logs (no secrets / prompts).
 */

export type RuntimeLogEvent =
  | "package_claim_acquired"
  | "package_claim_busy"
  | "package_claim_renewed"
  | "package_claim_renewal_failed"
  | "package_claim_released"
  | "package_claim_lost"
  | "package_generation_start"
  | "package_generation_end"
  | "package_generation_fail"
  | "run_reconcile_started"
  | "run_reconcile_completed"
  | "run_recovery_started"
  | "run_recovery_completed"
  | "run_recovery_busy"
  | "watchdog_promoted"
  | "watchdog_failed_stale"
  | "video_lease_claimed"
  | "video_lease_busy"
  | "video_lease_reclaimed"
  | "callback_accepted"
  | "callback_ignored"
  | "callback_rejected"
  | "production_run_status_transition";

export interface RuntimeLogFields {
  event: RuntimeLogEvent;
  production_run_id?: string | null;
  production_run_item_id?: string | null;
  project_id?: string | null;
  strategy_item_id?: string | null;
  package_id?: string | null;
  content_item_id?: string | null;
  video_job_id?: string | null;
  owner_token?: string | null;
  worker_instance_id?: string | null;
  phase?: string | null;
  outcome?: string | null;
  detail?: string | null;
  [key: string]: unknown;
}

const SECRET_KEY = /secret|password|token|authorization|api[_-]?key|prompt|credential/i;

function sanitize(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 500) return `${value.slice(0, 500)}…`;
    return value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitize);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = sanitize(v);
  }
  return out;
}

export function runtimeLog(
  level: "info" | "warn" | "error",
  fields: RuntimeLogFields,
): void {
  const payload = sanitize({
    scope: "production-runtime",
    ts: new Date().toISOString(),
    ...fields,
  });
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
