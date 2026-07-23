# Production Runtime Audit — Phase 6D: Recovery Logic

**Scope:** Inspect-only verification of recovery implementation (`lib/production-runtime/*`, migration `025_production_runtime.sql`, wired call sites).  
**Not executed:** No recovery runs, no cron/watchdog invocations, no live reclaim.

**Runtime version:** `production-runtime@5a`

**Sources of truth:**
- `docs/architecture/production-runtime.md`
- `lib/production-runtime/` (claims, leases, durability, watchdog, cancel)
- `supabase/migrations/025_production_runtime.sql`
- Call sites: `generateContentPackage`, `start-video-job`, `jobRunner`, `production-run-admin` (`reconcileProductionRun`), `production-run-cancel`, `translationJobs`

---

## Timing defaults (env-overridable)

| Constant | Default | Env |
|----------|---------|-----|
| Package generation lease | **900s** (15 min) | `PACKAGE_GENERATION_LEASE_SECONDS` (≥60) |
| Video job lease | **600s** (10 min) | `VIDEO_JOB_LEASE_SECONDS` (≥60) |
| Video heartbeat interval | **120s** | `VIDEO_JOB_HEARTBEAT_INTERVAL_MS` (≥10s) |
| Legacy video stale (null lease) | **30 min** | `VIDEO_JOB_STALE_MINUTES` |
| Run stuck with packages (watchdog) | **45 min** | `PRODUCTION_RUN_STUCK_WITH_PACKAGES_MS` |
| Zero-package run stale fail | **12 min** | hardcoded `STALE_PRODUCTION_RUN_MS` |
| Translation processing stale | **15 min** | `TRANSLATION_JOB_STALE_MINUTES` |

**Important:** There is **no dedicated recovery daemon/cron**. Detection and repair are **opportunistic** — they run when something calls `claim_*`, `reconcileProductionRun`, or the translation drain. UI production-tab poll / video callback / start-video / Stop are the usual triggers.

---

## Path matrix

| Failure | Detects | Repairs | Max recovery delay (typical) | Automatic? | Manual? |
|---------|---------|---------|------------------------------|------------|---------|
| Unfinished package | Next `claim_package_generation` / existing package CAS | Reclaim after lease **or** short-circuit to existing package / heal video job | ≤ **900s** to reclaim; immediate if package row exists | Yes (on next generate) | Stop / re-run if open slots |
| Unfinished render | `claim_video_job_for_dispatch` lease expiry; `evaluateRunWatchdog` | Re-dispatch **or** fail job + reconcile | ≤ **600s** after last heartbeat (lease); legacy **30 min**; queued-stuck **45 min** | Yes (opportunistic) | Stop; manual retry (if not operator-cancelled) |
| Unfinished translation | `claimNextTranslationJob` stale sweep | Re-claim `processing` + re-run unit | **15 min** | Yes (on next drain) | Re-enqueue / Stop cancels open units |
| Unfinished upload | Worker persist + promote; claim `artifacts_ready` | `promote_video_job_if_artifacts_ready` | Until next start-video **or** reconcile | Yes if artifacts persisted | Else re-render after lease / Stop |
| Stale lease | Claim RPCs (`lease_expires_at < now()`) | New owner claim / reclaim | Until lease expiry | Yes | None required |
| Worker death | Heartbeat stops → lease expires | Same as unfinished render | ≤ lease after last renew (~**10 min**) | Yes | Stop if run hung |
| Callback loss | `mp4_url` in `output` while `processing` | Promote (start-video / reconcile / worker catch) | Until next promote trigger | Yes | Optional: open production tab (reconcile) |
| Run interruption | `failStaleProductionRunIfNeeded`; watchdog | Fail run (0 pkgs) or fail stuck jobs + settle | **12 min** (0 pkgs); **45 min** / lease (with pkgs) | Yes (opportunistic) | Stop |
| Cancel during processing | Operator Stop → `cancelProductionRun` | Fail jobs + translations + notify worker; late completed rejected | Immediate DB; worker cooperative at asserts | Yes (operator-initiated) | Operator presses Stop |

---

## 1. Unfinished package

### What “unfinished” means
Creative Engine / Presentation started under `claim_package_generation` but the process died, timed out, or returned before a `content_packages` row was durable — **or** the package exists but the video job was never inserted.

### Who detects it
1. **Next generate attempt** for the same `strategy_item_id` via `claim_package_generation` (`lib/production-runtime/packageGenerationClaim.ts` → RPC in `025`).
2. **Existing-package short-circuit** before claim: `loadExistingPackageData` / RPC returns `existing_package`.
3. **Run-level:** if **zero** packages ever appear, `failStaleProductionRunIfNeeded` after **12 minutes** (`lib/api/production-run-admin.ts`).

### Who repairs it
| Outcome | Repair |
|---------|--------|
| No package row; claim lease still live + foreign owner | Caller gets `busy` / `generation_in_progress` (HTTP 503 path) — **not** settled failed. Wait for lease. |
| No package row; lease expired or released | New owner **claims** and re-runs paid generation. |
| Package row exists | Claim returns `existing_package`; workflow loads data, may **`healMissingVideoJobIfRequired`** (insert queued video job, no Claude). |
| Process exits cleanly | `finally` → `releasePackageGenerationClaim` (`released`) so the next call can claim immediately. |

### Maximum recovery delay
- **Lease reclaim:** default **900s** from last claim write.  
  **Note:** `renewPackageGenerationClaim` exists in the module/RPC but is **not wired** into `generateContentPackage` — long generations rely on the initial 15‑minute lease only.
- **Zero-package run fail:** **12 minutes** after `production_runs.updated_at` (only when packages.length === 0 and strategy items exist).
- **With packages but open slots:** no package-specific watchdog; relies on n8n retry / Stop / new run after cancel.

### Automatic recovery
Yes, on the next generate/claim for that strategy item (and heal path for missing video job).

### Manual intervention
- Operator **Stop** if the run is stuck with open items.
- Start a **new run** after cancel (cancelled runs do not auto-resume).
- If generate hard-killed mid-flight with no package: wait for lease expiry or Stop; re-trigger pipeline.

---

## 2. Unfinished render

### What “unfinished” means
`video_jobs.status` is `queued` or `processing` without a terminal `completed`/`failed`, and without durable `output.mp4_url` (or with artifacts — see upload/callback paths).

### Who detects it
1. **`claim_video_job_for_dispatch`** on `POST /api/n8n/start-video-job`:
   - `queued` → claim
   - `processing` + expired lease (or legacy `updated_at` age) → reclaim
   - live lease → `busy` (no re-dispatch)
2. **`evaluateRunWatchdog`** inside `reconcileProductionRun`:
   - `processing` + durable mp4 → promote list
   - `processing` + lease expired / legacy stale → fail list
   - `queued` forever while run age ≥ **45 min** and packages exist → fail list

### Who repairs it
| Detector path | Repair |
|---------------|--------|
| Claim succeeds after stale | Re-dispatch to video worker (`startVideoWorkerJob`) |
| Claim `artifacts_ready` | `promoteVideoJobIfArtifactsReady` + package → `draft` + reconcile |
| Dispatch fails after claim | Release back to `queued` (lease cleared) |
| Watchdog fail | Mark job `failed` with `STUCK_VIDEO_JOB_MESSAGE`, then re-reconcile slots |
| Worker alive | Heartbeat `renewVideoJobLease` every ~**120s** keeps lease from expiring |

### Maximum recovery delay
- **Live worker:** lease renewed → effectively unlimited until complete/cancel (heartbeat every 120s, lease 600s).
- **Dead worker / hung without renew:** reclaim possible after **lease expiry** (≤ **~10 min** after last heartbeat).
- **Legacy rows (null `lease_expires_at`):** reclaim after **30 min** `updated_at` age; watchdog may fail after **45 min** run age.
- **Queued never started:** fail via watchdog when run age ≥ **45 min** and `packageCount > 0`.
- Delay until detection also depends on **when** start-video or reconcile is next invoked.

### Automatic recovery
Yes — reclaim/redispatch or watchdog fail — when start-video or reconcile runs.

### Manual intervention
- Operator **Stop**.
- Manual video retry (blocked if error is operator-cancel message).
- Opening production UI (reconcile poll) accelerates watchdog.

---

## 3. Unfinished translation

### What “unfinished” means
`translation_jobs` stuck in `processing` (drain killed / timeout) or `pending` units left undrained.

### Who detects it
- **`claimNextTranslationJob`**: after pending claim races, selects oldest `processing` with `updated_at` older than **15 minutes**, then CAS re-claim.
- **Stop:** `cancelTranslationJobsForPackages` marks pending/processing → `failed` with operator message.

### Who repairs it
- Stale reclaim → same processor re-runs localization for that unit (`attempts` incremented).
- In-process **drain** reduces reliance on self-retrigger; remaining pending handed to a fresh invocation when budget hits.
- Pending-only stranding: requires another drain kick (enqueue / review action / retrigger) — stale sweep does **not** claim untouched `pending` rows.

### Maximum recovery delay
- Stuck **`processing`:** **15 minutes** until reclaim on next drain.
- Stuck **`pending`:** no time-based auto-fail; waits for next processor kick (or Stop).

### Automatic recovery
Yes for stale `processing`. Partial for `pending` (needs kick).

### Manual intervention
- Re-click translate / review kick.
- Production run **Stop** fails open translation jobs for run packages.

---

## 4. Unfinished upload

### What “unfinished” means
Render finished locally and storage upload may have succeeded, but the job is not yet `completed` in DB — typically:
- A) Upload OK, **`persist_video_job_artifacts` succeeded**, completed callback failed/lost  
- B) Upload OK, **persist failed**, worker may still try failed callback  
- C) Persist OK, completed callback OK but client never saw it (benign)

### Who detects it
- Worker: after persist, if later path fails with `artifactsPersisted === true`, skips failed callback (`shouldSendFailedCallbackAfterUpload`) and tries **promote**.
- `claim_video_job_for_dispatch`: `processing` + `output.mp4_url` → **`artifacts_ready`** (does not re-render).
- Watchdog: same durable-mp4 → **promote** list.

### Who repairs it
- `promote_video_job_if_artifacts_ready` (`processing` → `completed` when `mp4_url` present).
- Callers: worker catch path; `start-video-job` artifacts_ready branch; `reconcileProductionRun` watchdog.
- Then `reconcileProductionRunForContentItem` / package `draft` update on promote paths that include it.

### Maximum recovery delay
- If artifacts **persisted:** until next start-video **or** reconcile (often seconds–minutes via UI poll / n8n).
- If artifacts **not** persisted: treated as failed render → lease/watchdog reclaim may **re-render** (storage objects may orphan under `{project}/video/{job_id}/…`).

### Automatic recovery
Yes when persist succeeded (Invariant 2). No automatic storage→DB backfill if persist never wrote `mp4_url`.

### Manual intervention
- Reconcile / re-call start-video after persist.
- If no persist: wait for stale reclaim or Stop; may pay for a second render.

---

## 5. Stale lease

### What “stale” means
Ownership token is no longer considered live: `lease_expires_at < now()` (or legacy video age rule).

### Who detects it
- Package: `claim_package_generation` (busy only if `status = generating` **and** lease live **and** foreign owner).
- Video: `claim_video_job_for_dispatch` / `evaluateRunWatchdog`.

### Who repairs it
- New claim overwrites `owner_token` / `lease_owner` and extends lease.
- Video reclaim sets `status = processing` again and clears prior error on claim.
- Watchdog may **fail** stale processing jobs without artifacts instead of reclaiming (settlement path).

### Maximum recovery delay
Equals the configured lease (package **900s**, video **600s** after last renew) or legacy **30 min** / watchdog **45 min**.

### Automatic recovery
Yes on next claim/reconcile.

### Manual intervention
None required for the lease itself; operator may Stop a hung run.

---

## 6. Worker death

### What “worker death” means
Video worker process exits mid-job without terminal callback; heartbeats stop.

### Who detects it
- Lease stops renewing → `lease_expires_at` ages out.
- Next `start-video-job` claim or reconcile watchdog.

### Who repairs it
Same as unfinished render:
1. Prefer reclaim + re-dispatch if no durable artifacts.
2. Prefer promote if `mp4_url` already in `output`.
3. Else watchdog may fail the job so the run can settle.

### Maximum recovery delay
Approximately **one video lease period** after the last successful heartbeat (default ≤ **~10 minutes**), plus wait for the next claim/reconcile trigger. Legacy/null-lease: up to **30–45 minutes**.

### Automatic recovery
Yes (opportunistic).

### Manual intervention
Stop if the run must settle sooner; otherwise wait for reclaim/watchdog.

---

## 7. Callback loss

### What “callback loss” means
Worker finished (and ideally persisted artifacts) but `handleVideoCallback` never applied a terminal update — network/n8n/app error after upload.

### Who detects it
- Durable `output.mp4_url` while status still `processing` (claim / watchdog).
- Worker itself if completed callback throws after persist (promote in `catch`).

### Who repairs it
1. Worker promote attempt (best-effort).
2. `start-video-job` → `artifacts_ready` → promote + package draft + reconcile.
3. `reconcileProductionRun` watchdog promote list.
4. Late **completed** callback still works if job remains `processing` (CAS); rejected if operator already cancelled/failed the job (app + trigger 023).

### Maximum recovery delay
Until the next promote trigger. No fixed timer dedicated only to callbacks.

### Automatic recovery
Yes when artifacts were persisted. If callback lost **and** persist never ran, falls through to unfinished-render reclaim.

### Manual intervention
Trigger reconcile (production poll) or re-invoke start-video; avoid manual “completed” DB edits.

---

## 8. Run interruption

### What “run interruption” means
Pipeline / Vercel / n8n stops while `production_runs` is still `queued`/`running` — packages and/or videos may be partial.

### Who detects it
1. **`failStaleProductionRunIfNeeded`:** running/queued, **zero packages**, age ≥ **12 min**, strategy items for the run exist → mark run `failed`.
2. **`evaluateRunWatchdog`:** packages exist; promote/fail stuck video jobs; `shouldForceReconcile` then re-sync counters.
3. Operator **Stop** (see §9).

### Who repairs it
- Zero-package path: run → `failed` with stale message (operator can retry a new run).
- With-packages path: fail/promote video jobs → `syncRunItemsAndCounters` settles slots; run may become completed/failed based on slot math.
- Cancelled runs: reconcile counters but **never** return to `running`.

### Maximum recovery delay
- **12 minutes** for total pipeline no-package failure.
- **Lease / 45 minutes** for stuck video settlement when packages exist.
- No automatic fail of a run that has packages and still-live leased renders.

### Automatic recovery
Yes on reconcile (UI poll, callbacks, cancel, content-item reconcile). **Not** a background cron.

### Manual intervention
Stop; start a new run after cancel/fail. No automatic resume of a cancelled run.

---

## 9. Cancel during processing

### What it means
Operator Stop while package AI, video render, and/or translation drain are in flight.

### Who detects it
- **`cancelProductionRun`** (UI / admin): loads run, optionally reconciles, then cancels.
- **Worker:** `requestJobCancel` / `assertVideoJobStillActive` (in-memory abort + DB status ≠ `processing`).
- **Dispatch:** `isProductionRunCancelledForContentItem` before claim in start-video.
- **Callback:** reject late `completed` when run cancelled or job already operator-failed.

### Who repairs it (settles to terminal cancelled)
1. `cancelOpenVideoJobsForProductionRun` → fail queued/processing jobs (stamped items **and** all items on run packages).
2. `cancelTranslationJobsForPackages` → fail pending/processing translation units.
3. Fail open `production_run_items`.
4. `setProductionRunStatus(..., "cancelled")`.
5. `notifyWorkerOfCancelledJobs` (best-effort HTTP to worker).
6. Final `reconcileProductionRun`.

### Maximum recovery delay
- **DB terminal writes:** immediate on Stop.
- **Worker abort:** at next cooperative checkpoint (`assertVideoJobStillActive` / abort signal); mid-phase Claude/TTS/image may still spend until the current phase ends (documented residual).
- Late completed callbacks: rejected immediately by app CAS + DB trigger 023.

### Automatic recovery
Cancel is **operator-initiated**, then automatic propagation. No auto-resume.

### Manual intervention
Required to initiate Stop. After cancel, start a **new** generate run if more work is needed. Manual retry of operator-cancelled video jobs is blocked.

---

## Cross-cutting: who invokes recovery

```
UI production poll / getLatestProductionRunView
        │
        ▼
reconcileProductionRun ──► evaluateRunWatchdog ──► promote / fail jobs
        │
n8n start-video-job ──► claim_video_job_for_dispatch ──► reclaim | promote | busy
        │
video worker ──► heartbeat renew | persist artifacts | promote on callback loss
        │
generate package ──► claim_package_generation ──► busy | claim | existing_package
        │
translation drain ──► claimNextTranslationJob ──► pending | stale processing reclaim
        │
Operator Stop ──► cancelProductionRun ──► fail jobs + translations + notify worker
```

---

## Residuals (inspect findings, not fixed in 6D)

1. **Package claim has no heartbeat** — `renewPackageGenerationClaim` unused; generations >15 min can be double-claimed after lease expiry.
2. **No dedicated watchdog cron** — hung runs with packages wait for UI poll / callback / start-video.
3. **Upload without persist** — no promote; recovery is re-render after stale lease.
4. **Pending translation** — not time-reclaimed; needs another drain kick (Stop can fail them).
5. **In-flight package Claude after Stop** — cancel checks are not a full cooperative abort across all CE phases (architecture residual).
6. **Watchdog job set** — `loadRunVideoJobsForWatchdog` selects primary-language items stamped with `production_run_id`; variant-only jobs rely more on cancel collection + start-video idempotency.

---

## Verification note

This audit did **not** execute reclaim, promote, cancel, or reconcile against a live project. Conclusions follow from code + migration + existing architecture docs. Suggested static checks:

```bash
npm run check:production-runtime
npm run check:production-run-stop
npm run check:production-run-settlement
```
