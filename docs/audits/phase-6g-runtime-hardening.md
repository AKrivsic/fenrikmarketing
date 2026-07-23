# Phase 6G — Production Runtime Hardening Report

**Date:** 2026-07-23  
**Runtime version:** `production-runtime@6g`  
**Constraint:** No real AI / image / TTS / FFmpeg / paid provider calls during implementation or tests.

## Findings addressed

| ID | Finding | Resolution |
|----|---------|------------|
| P0.1 | Package claim renew unused | Heartbeat after claim; assert before CE/Presentation; lost → 503 `generation_claim_lost` |
| P0.2 | Recovery only opportunistic | `/api/internal/production-run-recovery` + recovery lease |
| P0.3 | Terminal runs with open items | Settlement RPC + triggers + historical backfill |
| P1.1 | Active render TOCTOU | `package_id` / `render_kind` + partial unique indexes |
| P1.2 | Processing without lease | CHECK + normalize legacy; variant dispatch uses lease RPC |
| P1.3 | Counter drift | `recompute_production_run_counters` on reconcile/settle |
| P1.4 | Translation package mismatch | Trigger enforces match |
| P1.5 | Unconditional package callback | CAS transition helper + conditional update |
| P1.6 | Variant/retry lease parity | `claimAndDispatchVariantVideoJob` uses `claimVideoJobForDispatch` |
| P2.1–P2.6 | Observability | Failure telemetry table, failed-item UI, structured logs, worker id, types |

## Files changed (high level)

- `lib/production-runtime/*` — heartbeat, settlement, recovery, logging, telemetry, callback CAS, worker id, constants `@6g`
- `lib/ai/workflows/generateContentPackage.ts` — claim heartbeat
- `lib/ai/workflows/dispatchVariantVideoJob.ts` — lease RPC
- `lib/ai/workflows/regenerateContentPackage.ts` — package_id insert + unique reuse
- `lib/api/production-run-admin.ts` — settle terminal, counters, failedItems view
- `lib/n8n/handlers.ts` — package callback CAS
- `lib/ai/apiResponse.ts` / `generationTerminal.ts` / `handleGenerateContentPackageRequest.ts`
- `app/api/internal/production-run-recovery/route.ts` — new
- `video-worker/jobRunner.ts` — worker instance id
- `components/projects/ContentProductionPanel/*` — failed items UI
- `lib/supabase/types.ts` — lease / package_id / telemetry fields
- `supabase/migrations/026_production_runtime_hardening.sql`
- `scripts/check-phase-6g-runtime-hardening.ts`, updated `check-production-runtime.ts`
- `docs/architecture/production-runtime.md`

## Migrations added

- `026_production_runtime_hardening.sql` (applied to remote in parts via MCP; source of truth is the file)

Objects: video_jobs denorm columns + unique active indexes + lease CHECK; settlement RPCs; terminal triggers; translation match trigger; recovery lease table/RPCs; failure telemetry table; variant insert RPC update.

## Live violation counts

| Probe | Before | After |
|-------|-------:|------:|
| Terminal run open items | **27** | **0** |
| Terminal runs with counter drift | **2** | **0** |
| Processing without lease | 0 | 0 |
| Translation package mismatch | 0 | 0 |
| Duplicate active primary renders | 0 | 0 |

## Runtime guarantees added

### Database guaranteed
- One active primary/variant/scene render (partial unique)
- Processing requires lease owner + expiry
- Terminal parent cannot retain open children (trigger)
- Open item cannot be created under terminal parent (trigger)
- Translation package_id matches source item package
- Settlement + counter recompute RPCs

### Runtime guaranteed
- Package claim heartbeat while generation active
- Scheduled recovery entry point (when invoked)
- Variant dispatch lease claim
- Package callback CAS outcomes
- Structured runtime logs + worker instance id

### Application-only residuals
- One active production run per project (gate still app-level)
- Mid-request Claude abort after Stop
- Recovery schedule is live in n8n (see Recovery scheduler deployment below)

## Tests added

- `npm run check:phase-6g-runtime-hardening`
- Extended `npm run check:production-runtime`

## Recovery scheduler deployment

**Status:** RECOVERY SCHEDULER ACTIVE (2026-07-23)

| Item | Value |
|------|--------|
| n8n workflow name | Production Run Recovery — Every 2 Minutes |
| Workflow ID | `0wgLd6QxLiT37iLR` |
| URL | https://n8n.fenrik.chat/workflow/0wgLd6QxLiT37iLR |
| Schedule | Every 2 minutes (`scheduleTrigger` minutesInterval=2) |
| Active | Yes (`activeVersionId` published) |
| Endpoint | `POST https://fenrikmarketing.vercel.app/api/internal/production-run-recovery` |
| Authentication | Header `x-n8n-secret` (same value as Vercel `N8N_CALLBACK_SECRET`; matches existing n8n↔app contract). n8n MCP cannot attach the shared `httpHeaderAuth` / “Header Auth account” credential to `httpRequest` nodes, so the header is configured on the node. Prefer migrating to the shared Header Auth credential in the n8n UI when convenient. |
| Request timeout | 55 000 ms |
| Retry behavior | `retryOnFail: true`, `maxTries: 2` (1 initial + 1 retry), `waitBetweenTries: 3000` ms. Non-2xx fail the node (`neverError: false`). Transient 5xx/network may retry once; 4xx config/auth errors fail without aggressive retry. |
| Failure visibility | HTTP Request `fullResponse: true` retains status + body on the execution; n8n execution id/timestamp retained by the platform. No new Slack/email integration. |
| Concurrency | App-side `claim_production_recovery_lease` returns `skipped_busy: true` when another recovery holds the lease (verified). Idle scans are fast enough that short overlapping HTTP calls may both complete after sequential claim/release. |

### Verification

| Check | Result |
|-------|--------|
| Manual n8n execution | Execution `164` — success, HTTP 200, `ok: true`, idle summary (0 scanned runs) |
| First scheduled executions | Executions `165`, `166` — mode `trigger`, status `success`, ~2 min apart |
| Idempotent second call | Consecutive POSTs both 200 with empty idle work |
| Recovery lease overlap | Held lease via RPC → endpoint returned `skipped_busy: true` (200) |
| No paid provider work | Vercel runtime logs for the path show only `run_recovery_*` events (start/busy/completed); no Claude/OpenAI/image/TTS/FFmpeg/video-worker starts |
| Production records | No unexpected non-terminal runs / terminal open items created by idle recovery |

### Prerequisite deploy

Endpoint was not on production until a prod deploy (`dpl_99EKa2b5X2Sa2D1C5Q7gsqgRoVHN`, aliased to `www.fenrik.studio` / `fenrikmarketing.vercel.app`). Local CLI deploy required `--archive=tgz` + `.vercelignore` because a plain upload exceeded the 100 MB file limit.

## Remaining limitations

- Prefer attaching n8n “Header Auth account” credential in the UI (MCP cannot assign `httpHeaderAuth` to HTTP Request)
- Scene/retry inserts depend on sync trigger for denorm fields
- Detached packages (`strategy_item_id` null) still allowed by product history
- No live DB concurrency integration harness in CI (unit/static checks only)
- Mid-request Claude abort after Stop still out of scope

## Rollback plan

1. Stop scheduling `/api/internal/production-run-recovery`.
2. Revert app to previous deploy (claim heartbeat / settle callers optional to leave).
3. DB rollback (destructive — prefer forward-fix):
   - `drop trigger trg_terminal_run_no_open_items;`
   - `drop trigger trg_no_open_item_under_terminal_run;`
   - `drop trigger trg_translation_package_matches_source;`
   - `alter table video_jobs drop constraint video_jobs_processing_requires_lease;`
   - `drop index uniq_active_primary_render_per_package;` (and variant/scene)
   - Keep columns/tables (additive) unless explicitly dropping
4. Do **not** re-open historically failed backfilled items.
