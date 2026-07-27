# Dispatch / Worker Contract Fix

**Date:** 2026-07-25  
**Incident:** production run `e6469382-a897-42b7-88fe-2d650b778d42`  
**Related:** `docs/architecture/production-failure-e6469382.md`, `docs/architecture/video-lease-fix.md`

---

## Root cause

### What broke

Variant 1 **application + worker** expected:

```
queued → dispatch authorize (no lease) → worker claim → processing + lease → render
```

Live DB RPC `claim_video_job_for_dispatch` had drifted back to **025 semantics**:

```
dispatch → processing + lease(now+600s)
```

The Variant 1 worker then called `claim_video_job_for_worker`, saw a live lease, returned **`busy`**, skipped render (`worker_instance_id` null), and the watchdog stale-failed every video job after ~10 minutes.

### Why the old RPC remained live

| Fact | Evidence |
| --- | --- |
| Migration `video_lease_on_worker_start` (`20260725082555`) was recorded | `supabase_migrations.schema_migrations` stores Variant 1 SQL |
| `claim_video_job_for_worker` existed | Created by that migration (higher `pg_proc.oid`) |
| Live `claim_video_job_for_dispatch` matched **025** | Used `can_claim` + `lease_until := now()` + `status = 'processing'` — not Variant 1 `can_dispatch` / clear lease |

**Conclusion:** `schema_migrations` is an **append-only ledger of applied statements**, not a continuous proof that live objects still match the last definition. After 029 ran (worker RPC created + dispatch briefly replaced), **dispatch was overwritten again** with the old body (manual SQL / replay of 025 / similar) **without** a new migration row. Migration history still “succeeded.”

Exact actor of the overwrite: **unknown** (no DDL audit trail beyond migration ledger + live `pg_proc`).

### Why migration history reported success

Applying a migration records the SQL and runs it once. There is **no post-condition** that re-reads `pg_proc` on every deploy. A later silent `CREATE OR REPLACE` of the same signature leaves history green and production broken.

### Why deployment did not detect the mismatch

| Check layer | What it did | Gap |
| --- | --- | --- |
| `check:production-runtime` | Grepped **migration files** for strings | Never queried live DB |
| App / worker tests | Asserted TypeScript call sites | Assumed DB matched repo |
| Vercel build | Built Next app | No RPC contract gate |
| `schema_migrations` | Confirmed 029 applied once | No drift detection |

App could return `status: "queued"` while the DB had already set `processing` + lease.

### Similar drift risk elsewhere

Any `CREATE OR REPLACE FUNCTION` without a live fingerprint gate can drift the same way, including:

- `claim_package_generation` / renew / release  
- `renew_video_job_lease`, `persist_video_job_artifacts`, `promote_video_job_if_artifacts_ready`  
- `settle_production_run_terminal` / `recompute_production_run_counters`

This fix permanently gates the **video lease contract**. The same pattern (`assert_*_contract` + deploy check) should be reused for other critical RPCs.

---

## Canonical lifecycle (restored)

```
insert video_jobs                → queued, lease=null
        ↓
claim_video_job_for_dispatch     → still queued, lease=null  (NEVER processing lease)
        ↓
HTTP enqueue video-worker
        ↓
claim_video_job_for_worker       → processing + lease=now+600s
        ↓
heartbeat renew_video_job_lease
        ↓
completed | failed
```

**Dispatch must never create an active processing lease.**  
**Worker is the only component allowed to start processing.**

---

## Files changed

| File | Change |
| --- | --- |
| `supabase/migrations/20260725210444_repair_video_lease_dispatch_contract.sql` | Re-apply Variant 1 RPCs + fingerprints + `assert_video_lease_contract()` |
| `lib/production-runtime/videoLeaseContract.ts` | Pure classifiers + assert helpers |
| `lib/production-runtime/index.ts` | Export contract helpers |
| `scripts/check-dispatch-worker-contract.ts` | Static + live regression / deploy gate |
| `scripts/check-production-runtime.ts` | Assert migration 030 present |
| `package.json` | `check:dispatch-worker-contract` + `prebuild` hook |
| `docs/architecture/dispatch-worker-contract-fix.md` | This document |

---

## Migration changes

**Applied remotely:** `repair_video_lease_dispatch_contract`

Contents:

1. `claim_video_job_for_dispatch` — Variant 1 (`queued`, clear lease); fingerprint `VIDEO_LEASE_CONTRACT=dispatch_v1_queued_no_lease`
2. `claim_video_job_for_worker` — starts `processing` + lease; fingerprint `VIDEO_LEASE_CONTRACT=worker_v1_processing_with_lease`
3. `assert_video_lease_contract()` — returns `{ ok, contract, errors }` by inspecting live `pg_proc.prosrc`

Old 025 body cannot pass the assert (detects `lease_until := now()` on dispatch).

---

## Deployment changes

1. **`npm run prebuild`** → runs `check:dispatch-worker-contract` before every `next build`.
2. When `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are present (typical on Vercel), the check calls **`assert_video_lease_contract()`** against live DB and **fails the build** on drift.
3. Force live check locally: `REQUIRE_LIVE_CONTRACT_CHECK=1 npm run check:dispatch-worker-contract`.

Deploy fails if:

- live RPC differs from Variant 1 fingerprints  
- dispatch assigns `lease_until` (old contract)  
- worker missing / does not start lease  
- expected SQL definition not active  

---

## Verification steps

```bash
# Static + live (with env)
npm run check:dispatch-worker-contract

# Related runtime suite
npm run check:production-runtime
npm run check:phase-6g-runtime-hardening

# Live SQL smoke
# SELECT assert_video_lease_contract();
# Expected: {"ok": true, "contract": "video_lease_v1", "errors": []}
```

Post-apply live confirmation (2026-07-25):

| Function | Contract |
| --- | --- |
| `claim_video_job_for_dispatch` | fingerprint present, clears lease, **no** `lease_until` |
| `claim_video_job_for_worker` | fingerprint present, assigns `lease_until`, sets processing |
| `assert_video_lease_contract()` | `ok: true` |

---

## Regression tests

`scripts/check-dispatch-worker-contract.ts` proves:

| Test | Guarantees |
| --- | --- |
| Classifier rejects 025 dispatch | Old lease-at-enqueue cannot silently pass |
| Classifier accepts Variant 1 dispatch | queued + `lease_owner = null` |
| Worker must start lease | missing `lease_until` → fail |
| Migration 030 fingerprints | repo SQL matches contract |
| 025 file classified as v0 | historical old body still detected |
| `start-video-job` returns `queued` | app contract |
| `jobRunner` uses `claimVideoJobForWorker` | worker contract |
| Watchdog never fails queued | Variant 1 watchdog rule |
| Live `assert_video_lease_contract` | deployed SQL active |

---

## What this does *not* do

- Does not re-run or revive failed jobs from `e6469382` (separate ops retry).  
- Does not remove migration 025 from history (historical record).  
- Does not fingerprint every RPC in the project yet — only the video lease pair that caused the outage.
