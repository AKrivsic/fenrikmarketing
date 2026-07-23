# Production Runtime (Phase 6G)

Version: `production-runtime@6g`

This document describes the **production runtime reliability model** for unattended AI Content Manager execution. It is not a feature redesign — it encodes ownership, leases, durable state transitions, settlement rules, and bounded recovery.

## Runtime ownership

| Concern | Owner | Mechanism |
|---------|-------|-----------|
| Package generation (paid CE + Presentation) | `claim_package_generation` RPC + **heartbeat renew** | Advisory lock + claim row; renew every ~150s while generation runs |
| Package identity | `content_packages.strategy_item_id` unique | Insert CAS / unique violation → return existing |
| Video dispatch | `claim_video_job_for_dispatch` RPC | FOR UPDATE + lease; owner token = `video_jobs.id` (all production dispatch paths) |
| Video worker liveness | Worker heartbeat + `worker_instance_id` | `renew_video_job_lease` every ~120s; process identity stored separately |
| Durable render artifacts | Worker before callback | `persist_video_job_artifacts` while `processing` |
| Video terminal complete | Callback **or** promote path | `handleVideoCallback` (CAS `processing`) / `promote_video_job_if_artifacts_ready` |
| Active render uniqueness | Partial unique indexes on `video_jobs` | One active primary per `package_id`; one active variant per package×language |
| Repair (fidelity / story / PDI) | Generate/regenerate workflows | One RepairDelta LLM pass; hard-fail only unrecoverable residues |
| Run settlement | `settle_production_run_terminal` + `reconcileProductionRun` | Terminal parent only after open children settled; counters from items |
| Scheduled recovery | `/api/internal/production-run-recovery` | Bounded batch reconcile; overlap lease; no paid AI |
| Operator Stop | `cancelProductionRun` | Fail open jobs + translations; settle terminal via RPC |

## Runtime invariants

1. **Exactly one expensive package generation per strategy item** — claim before CE; heartbeat renews lease; concurrent callers get `generation_in_progress` / lost claim → `generation_claim_lost` (HTTP 503, not content-quality settle).
2. **Successful upload is durable** — artifacts in `video_jobs.output` before completed callback; promote recovers lost callbacks.
3. **Long-running workers prove liveness** — lease + heartbeat; processing requires non-empty `lease_owner` + `lease_expires_at` (DB CHECK).
4. **Repairable validation does not discard CE** — soft-continue policy unchanged from 5A.
5. **Runs eventually settle** — scheduled recovery + opportunistic reconcile; watchdog promote/fail; zero-package stale fail retained.
6. **One active render per logical package slot** — DB partial unique indexes + app assert; completed history allowed.
7. **Stop covers descendants** — cancel stamped items + package descendants + translation units.
8. **Terminal runs have no open items** — settlement RPC + BEFORE UPDATE triggers.
9. **Translation package matches source item package** — trigger guard.
10. **Package callbacks are CAS** — no backward/revive overwrites of newer status.

## Package claim heartbeat

- Lease default: **900s** (`PACKAGE_GENERATION_LEASE_SECONDS`)
- Heartbeat default: **150s** (`PACKAGE_GENERATION_HEARTBEAT_INTERVAL_MS`) — must be **< lease**
- Max consecutive renew failures: **3** then `generation_claim_lost` before next paid phase
- Heartbeat stops on every exit path (success / fail / throw / finally release)

## Scheduled recovery / watchdog

- Endpoint: `POST|GET /api/internal/production-run-recovery` (`x-n8n-secret`)
- Scans only `queued|running` runs; batch size / max duration env-bounded
- Overlap prevented via `claim_production_recovery_lease`
- Calls existing `reconcileProductionRun` (promote artifacts, fail stale, recompute counters)
- Does **not** generate packages, start AI, or blindly retry failed jobs

## Terminal run settlement

- Prefer `settle_production_run_terminal(run_id, status, …)` for failed/cancelled
- Locks run → fails open children → recomputes counters → writes parent last
- DB triggers reject terminal parent with open children and open children under terminal parent

## Active render DB invariant

Columns on `video_jobs`: `package_id`, `render_language`, `render_kind` (`package|variant|scene`)

Partial uniques (active = queued|processing only):

- primary: `(package_id)` where `render_kind=package` and language null
- variant: `(package_id, render_language)` where `render_kind=variant`
- scene: `(content_item_id)` where `render_kind=scene`

## Unified video lease dispatch

All production paths that start a worker must use `claim_video_job_for_dispatch` (primary start-video, language-variant dispatch). Direct `queued→processing` updates are not used on production paths.

## Package callback CAS

Legal forward transitions among `draft → ready → approved → published → archived`. Duplicate same status → idempotent. Backward → ignored. Archived revive → rejected. Result exposes `outcome` + `reason`.

## Failure telemetry

Table `production_run_item_failure_telemetry` (+ optional `production_run_items.failure_telemetry` jsonb). Bounded fields only — no prompts/responses. Persisted on claim-loss and generation fail paths when available.

## Worker identity

`getWorkerInstanceId()` — env `VIDEO_WORKER_INSTANCE_ID` or `hostname-pid-suffix`. Stored on `video_jobs.worker_instance_id` without replacing lease `owner_token` (still job id).

## Key modules

- `lib/production-runtime/` — claims, heartbeat, leases, settlement, recovery, logging, telemetry, callback CAS
- `supabase/migrations/025_production_runtime.sql`
- `supabase/migrations/026_production_runtime_hardening.sql`
- `app/api/internal/production-run-recovery/route.ts`

## Tests

```bash
npm run check:production-runtime
npm run check:phase-6g-runtime-hardening
npm run check:production-run-stop
npm run check:production-run-settlement
```

## Remaining known risks

- In-flight Claude after Stop still spends until the current request ends (no mid-request abort).
- Soft-continuing heuristic story/fidelity residues can persist lower-quality packages — intentional cost/safety tradeoff.
- Exact monetary spend still depends on operator package count and CE attempt nesting caps.
- Scene-editor / retry insert paths rely on sync trigger for `package_id`; concurrent scene+package active jobs are separated by `render_kind`.
- Recovery scheduler is live in n8n: workflow **Production Run Recovery — Every 2 Minutes** (`0wgLd6QxLiT37iLR`), every 2 minutes → `POST /api/internal/production-run-recovery`. See `docs/audits/phase-6g-runtime-hardening.md` § Recovery scheduler deployment.
- Orphan-package product semantics remain undefined (detached strategy_item_id still allowed).
