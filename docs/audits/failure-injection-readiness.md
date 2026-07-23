# Failure Injection Readiness — Phase 6C

**Date:** 2026-07-23  
**Runtime version:** `production-runtime@5a`  
**Method:** Static inspection of production flows only.  
**Constraint:** No failure injection. No workers started. No provider calls.

## Verdict

**PARTIALLY READY** for failure injection.

Phase 5A gives the **primary** package → start-video → worker → callback → reconcile path explicit recovery for the failures that matter most (claim contention, dispatch-after-claim release, post-persist callback loss, cancel revive, lease expiry when reconcile runs). That subset is safe to inject against **with reconcile traffic present** (UI poll / callbacks).

It is **not READY** for unattended crash / SIGTERM / power-loss campaigns, or for treating “the system always heals” as an invariant, because:

1. Package-generation claims never renew (`renewPackageGenerationClaim` is exported and has an RPC, but is unused).
2. Watchdog runs only inside `reconcileProductionRun` — no cron/daemon.
3. Variant / retry / scene-rerender dispatch skips lease RPCs.
4. Workers have no SIGTERM / graceful drain.
5. In-flight package AI is not cooperatively abortable after Stop or process kill.
6. Upload success + DB persist failure can still terminal-fail and orphan storage.

Older `docs/audits/production-reliability/` notes (no heartbeat, no regen guard, upload→failed) are **stale relative to Phase 5A**. Prefer this doc + `docs/architecture/production-runtime.md` + current code.

---

## Scope inspected

| Area | Primary code |
|------|----------------|
| Package generation | `lib/ai/workflows/generateContentPackage.ts`, `handleGenerateContentPackageRequest.ts`, `generationTerminal.ts` |
| Regenerate | `lib/ai/workflows/regenerateContentPackage.ts`, `activeRenderGuard.ts` |
| Language variants / retry dispatch | `dispatchVariantVideoJob.ts`, `generateLanguageVariants.ts`, `retryVideoJob.ts` |
| Video start / lease | `app/api/n8n/start-video-job/route.ts`, `videoJobLease.ts`, `025_production_runtime.sql` |
| Worker render / upload / callback | `video-worker/jobRunner.ts`, `services/storage.ts`, `services/callback.ts` |
| Callbacks | `lib/n8n/handlers.ts` (`handleVideoCallback`, `handleContentPackageCallback`) |
| Cancel | `production-run-admin.ts`, `production-run-cancel.ts`, `cancelPropagation.ts` |
| Watchdog / settle | `runWatchdog.ts`, `reconcileProductionRun`, `settleProductionRunItem.ts` |
| Repair policy | `repairPolicy.ts` + RepairDelta wiring in generate/regenerate |
| Checks | `scripts/check-production-runtime.ts` (unit + static wiring; not live injection) |

---

## Legend

For each cell:

| Field | Meaning |
|-------|---------|
| **Recovery** | What recovers the entity / slot |
| **Data loss** | Durable product data at risk (not paid-token waste) |
| **Duplicate work** | Risk of paying again for the same logical unit |
| **Operator** | Human action required to unblock |
| **Auto** | System recovers without operator (when its trigger fires) |
| **Missing** | Gap vs a clean injection campaign |

---

## Stage matrices

### 1. Package generation

**Owners:** `claim_package_generation` → CE / Presentation / RepairDelta → persist → `release_package_generation_claim` in `finally`.  
**Terminals:** `generation_failed` / `render_*` / `operational_failure` settle failed; `generation_in_progress` → HTTP 503, **no** settle.

| Failure | What happens | Recovery | Data loss | Duplicate | Operator | Auto | Missing |
|---------|--------------|----------|-----------|-----------|----------|------|---------|
| **Claude timeout** | `GENERATE_CONTENT_PACKAGE_CLAUDE_TIMEOUT_MS=180s` on Presentation/repair; transport `HTTP_TIMEOUT_MS.ai=60s` × `HTTP_MAX_ATTEMPTS.ai=3`. Exhaustion → throw → `classifyGenerationThrow` → `operational_failure` → settle. Claim released in `finally`. | Settle item failed; release claim | No package | Low while claim held | Re-trigger item / re-run | Settlement yes | No mid-call abort; nested CE still burns cost |
| **OpenAI timeout** | Same transport retries on CE/JSON repair (`lib/ai/openai.ts` via `fetchWithRetry`). Same throw → settle path. | Same | Same | Same | Same | Same | Same |
| **Worker crash** (content-package-worker) | Process dies; `finally` may not run → claim stays `generating` until lease expiry (**900s** default). No package row → run item may stay open. | Lease expiry → re-claim; unique index if package inserted | Tokens only | Possible after expiry | Stop / wait lease / re-trigger | Re-claim after expiry | **No claim heartbeat**; hard kill skips settle |
| **Storage upload** | N/A (Postgres JSON persist) | — | — | — | — | — | — |
| **Callback failure** | Package settlement is inline, not via `handleContentPackageCallback`. That callback is unconditional status write (residual). | Weak | Can overwrite package status | Low | Manual status fix | No | **No package-callback CAS** |
| **Network failure** | AI retries; settle retries ×3. Claim RPC fail throws before paid work. | Bounded HTTP + settle retry | Open item if settle fails after gen fail | Low | If settlement exhausted | Partial | Settlement exhaustion leaves item ambiguous |
| **Vercel timeout** | Inline route `maxDuration=300`. Hard kill mid-AI; claim may stick; settle unreliable. Prefer `CONTENT_PACKAGE_WORKER_URL`. | Prefer DO worker; lease reclaim | Paid waste | After lease expiry | Re-trigger / Stop | Lease only | **Inline 300s unsafe** for long CE |
| **Supabase timeout** | Claim/insert/settle errors. Unique `23505` → return existing package. | CAS + settle retry | Partial multi-insert orphans possible | Cost if race before claim (mitigated by claim) | Heal / cleanup | Claim + unique | Persist not one transaction |
| **SIGTERM** | No handler on content-package-worker | Same as crash | Same | Same | Same | Lease only | **No graceful drain** |
| **Crash** | Same as worker crash | Lease + `existing_package` short-circuit | Tokens | After expiry | Yes | Partial | No mid-AI checkpoint |
| **Power loss** | Same as crash | Same | Same | Same | Same | Same | Same |

**Repair (same stage):** one RepairDelta pass each for fidelity / story / PDI. Soft residues continue; material hard → `generation_failed` + settle. Provider timeout during repair counts toward hard fail.

**Regenerate:** `assertNoActivePackageRender` before AI and before new `video_jobs` insert. **No** package-generation claim (updates existing package).

---

### 2. Video job start / claim / lease

**Owners:** `claim_video_job_for_dispatch` (`ownerToken = job.id`), promote if artifacts ready, release to `queued` on dispatch fail.

| Failure | What happens | Recovery | Data loss | Duplicate | Operator | Auto | Missing |
|---------|--------------|----------|-----------|-----------|----------|------|---------|
| Claude / OpenAI | N/A (dispatch only) | — | — | — | — | — | — |
| **Worker crash** after claim | `processing` + lease; heartbeat stops → lease expires → reclaim on next start **or** watchdog fail | Reclaim / watchdog | Render WIP lost | **Yes if reclaim while first still alive** | If reclaim races | Lease + promote if artifacts | Heartbeat DB outage → false stale |
| Storage | N/A | — | — | — | — | — | — |
| Callback | N/A | — | — | — | — | — | — |
| **Network** (dispatch fail) | Catch releases `queued` + clears lease | n8n / start retry | None | Safe retry | Usually none | Yes | — |
| **Vercel timeout** | Route is short (claim + HTTP start). Low risk | — | — | — | — | — | — |
| **Supabase** claim fail | Throws → error response; job may stay queued | Retry start | None | Low | Retry | — | — |
| Cancelled run | Fail job + skip | Terminal failed | None | Blocked | — | Yes | — |
| **artifacts_ready** | `promoteVideoJobIfArtifactsReady` + reconcile | Promote, no re-render | None | Idempotent | — | Yes | — |
| SIGTERM / crash / power on Vercel mid-dispatch | Release path may not run → stuck `processing` until lease/watchdog | Lease / watchdog | None | Possible reclaim | — | Partial | No local SIGTERM |

---

### 3. Active render guard

**Code:** `assertNoActivePackageRender` / `findActivePackageVideoJobIds` — used on regenerate only.

| Failure | Behavior |
|---------|----------|
| Infra modes | N/A — preflight only |
| Concurrent regen | Throws `invalid_input` if any package item has `queued`/`processing` video job |
| Recovery | Wait for terminal job or Stop |
| Missing | Does not cover first-time generate; TOCTOU between check and insert remains |

---

### 4. Upload durability (video worker)

**Invariant 2:** persist artifacts while `processing`, then completed callback; never send `failed` after persist.

| Failure | What happens | Recovery | Data loss | Duplicate | Operator | Auto | Missing |
|---------|--------------|----------|-----------|-----------|----------|------|---------|
| **Storage upload failure** | Bounded retry (default 3) for transient/5xx/429/400; `upsert: true`. Exhaustion → failed callback if not persisted | Retry then fail job | Local render wasted; no DB mp4 | Manual retry redo | Retry video | Partial | Permanent 401/403/404 not retried |
| Upload OK, **persist fails** | `artifactsPersisted=false` → may send **failed**; object may exist in bucket | Orphan storage | False failed | High on retry | Manual reconcile / retry | No promote | Persist-before-callback gap |
| Upload+persist OK, **completed callback fails** | Catch: `promoteVideoJobIfArtifactsReady`; **no** failed callback (`shouldSendFailedCallbackAfterUpload` → false) | Promote / start-video promote / watchdog promote | Low | Low | If reconcile never polled | Yes if reconcile runs | Watchdog not continuous |
| Network mid-upload | Treated retryable | Retry | — | — | — | Yes | — |
| Crash after upload before persist | Processing + orphan object; lease expire → fail or reclaim | Lease / watchdog | Orphan bytes | Yes | — | Partial | No upload↔DB atomicity |
| Power loss / SIGTERM | Same as crash (no drain handler) | Same | Same | Same | Same | Same | **No drain** |

---

### 5. Callbacks (n8n / workers)

| Failure | Video (`handleVideoCallback`) | Package (`handleContentPackageCallback`) |
|---------|-------------------------------|------------------------------------------|
| Timeout / network | Worker `fetchWithRetry` then durability/promote path | Caller-dependent |
| Late completed after cancel | App reject + CAS `status=processing` + trigger `023` | Unconditional update — **can overwrite** |
| Duplicate completed | Second update no-ops (CAS) | Overwrites again |
| Failed after persist | Suppressed by durability rule | N/A |
| Supabase fail mid-update | Throw; worker may promote / retry | Throw |
| Crash | Job may stay processing with artifacts → promote paths | Status may be stale |

---

### 6. Cancel propagation

**Stop:** fail open jobs (stamped items + all items on run packages), fail translation pending/processing, mark items failed, run `cancelled`, notify worker.

| Failure | Behavior |
|---------|----------|
| Worker notify fail | Best-effort log; DB already failed — late completed rejected |
| Mid-render cancel | Checkpoints → `JobCancelledError` → failed callback (unless artifacts persisted → promote preferred) |
| In-flight **package** Claude after Stop | **Continues until request ends** (documented residual). Cancel check at handler entry only |
| Network to worker | Jobs still failed in DB |
| SIGTERM during cancel | Partial mop-up; re-stop is idempotent |

---

### 7. Run watchdog

**Code:** `evaluateRunWatchdog` applied inside `reconcileProductionRun`. Complements zero-package 12‑minute stale fail.

| Condition | Action |
|-----------|--------|
| Processing + durable `mp4_url` | Promote |
| Processing + expired lease / legacy stale, no mp4 | Fail with `STUCK_VIDEO_JOB_MESSAGE` |
| Queued + run older than 45m default + packages exist | Fail queued job |
| Live lease | **Not** failed |
| Zero packages + 12 min | Run → failed |
| **Gap** | Only runs when something calls `reconcileProductionRun` (UI poll, video callback, cancel, start-video promote). **No always-on watchdog.** Power loss + no UI → stuck until poll |

---

### 8. Repair policy / loops

| Failure | Behavior |
|---------|----------|
| Provider timeout during repair | Attempt failure → hard fail / settle after policy |
| Material fidelity / hard story / PDI after one repair | `generation_failed` + settle |
| Soft residues | Continue with package (quality risk, intentional) |
| Crash mid-repair | Claim release if `finally` runs; else lease wait |
| Infinite repair | **No** — one RepairDelta pass per gate |

---

### 9. Generation terminal states

| Code | Meaning | Settle failed? |
|------|---------|----------------|
| `generation_failed` | Content/validation hard fail | Yes |
| `render_*` | Render fidelity | Yes |
| `operational_failure` | Unexpected / settle/DB | Yes (or settle already failed) |
| `generation_in_progress` | Claim busy → HTTP 503 retryable | **No** |

Hard process kill **before** catch: no terminal code written.

---

### 10. Other production stages

| Stage | Key code | Readiness notes |
|-------|----------|-----------------|
| **Variant / retry / scene-rerender dispatch** | `claimAndDispatchVariantVideoJob` | `queued→processing` **without** `lease_owner` / `lease_expires_at`. Heartbeat renew cannot match owner. Relies on legacy `updated_at` stale (~30m). **Weaker than start-video path.** |
| **Translation jobs** | translation processor + `cancelTranslationJobsForPackages` | Cancelled on Stop. Crash → stale reclaim may re-pay |
| **TTS / images in worker** | `jobRunner.ts` | TTS max 3; image moderation → local fallback; cancel checkpoints. OpenAI timeouts retry then fail job |
| **FFmpeg** | `video-worker/services/ffmpeg.ts` | Cancel can abort child; process has no OS SIGTERM handler |
| **Strategy / n8n trigger** | production-run start | Webhook fail → run failed; out of core video loop |

---

## Safe injection points (explicit handling)

Inject only against these on the **primary** start-video + package-claim path, with reconcile polling enabled:

| Injection | Expected handling | Citations |
|-----------|-------------------|-----------|
| Concurrent generate same `strategy_item_id` | Second gets `generation_in_progress` / 503; no settle fail | `claimPackageGeneration`, `workflowResponse`, handler skip-settle |
| Generate when package exists | `existing_package` / pre-check return | `claim_package_generation`, `loadExistingPackageData` |
| Unique insert race | 23505 → return winner | `generateContentPackage.ts` persist CAS |
| start-video while busy | `busy` idempotent 202 | `claimVideoJobForDispatch` |
| start-video when terminal | `terminal` idempotent 202 | same |
| start-video when `mp4_url` in output | promote, no re-render | `artifacts_ready` + `promoteVideoJobIfArtifactsReady` |
| Dispatch HTTP fail after claim | release to `queued` | `start-video-job/route.ts` catch |
| Completed callback fail after persist | promote; **no** failed callback | `jobRunner.ts` catch + `shouldSendFailedCallbackAfterUpload` |
| Operator cancel + late completed | reject + trigger 023 | `handleVideoCallback`, `023_*.sql` |
| Regenerate while job active | hard reject | `assertNoActivePackageRender` |
| Transient storage upload errors | retry + upsert | `uploadVideoArtifact` / `isRetryableUploadError` |
| Claude/OpenAI transport timeout (caught path) | retry then terminal settle | `fetchWithRetry`, `classifyGenerationThrow`, settle |
| Expired lease, no artifacts (when reconcile runs) | fail job | `evaluateRunWatchdog` |
| Cancelled run at generate entry / start-video | skip / fail job | handlers + start-video |
| Stop translations | mark failed | `cancelTranslationJobsForPackages` |

---

## Injection blockers (missing recovery)

Treat these as **not ready** for crash-style injection without babysitting:

1. **No SIGTERM / graceful shutdown** on `video-worker` or `content-package-worker` — crash/power/SIGTERM ≡ abrupt death; recovery is lease/watchdog only.
2. **`renewPackageGenerationClaim` never called** — static 900s lease; long CE can expire under a live owner → duplicate CE risk.
3. **Watchdog is not continuous** — “system always heals stuck runs” will hang without UI/reconcile traffic.
4. **Variant/retry path skips lease RPC** — crash injection on variant renders is not covered by the primary heartbeat model.
5. **In-flight package AI not abortable** — Stop / Vercel kill / process kill mid-CE are not cleanly injectable as “cancelled without spend”.
6. **Upload success + DB persist failure** still allows failed terminal + orphan storage + costly retry.
7. **`handleContentPackageCallback` non-CAS** — unsafe to inject arbitrary package status callbacks.
8. **Lease-expiry while worker still rendering** (heartbeat DB outage) can still double-dispatch.
9. **No durable mid-pipeline checkpoint** for package or video (power loss redoes paid work except post-`persist_video_job_artifacts`).
10. **Opportunistic reconcile only** — stale zero-package 12m and stuck-with-packages 45m rules do not fire without reconcile callers.

---

## Coverage summary

| Mechanism | Covered? | Notes |
|-----------|----------|-------|
| Package gen claim + advisory lock | **Yes** | `claim_package_generation` |
| Package claim renew/heartbeat | **API yes, wiring no** | unused TS wrapper |
| Package claim release | **Yes** | `finally` in generate |
| Package identity unique | **Yes** | `strategy_item_id` + 23505 |
| Video dispatch claim + lease | **Yes** (primary path) | `claim_video_job_for_dispatch` |
| Video heartbeat | **Yes** (primary) | every `VIDEO_JOB_HEARTBEAT_INTERVAL_MS` (default 120s) |
| Variant video lease | **No** | Simple status flip only |
| Artifact persist while processing | **Yes** | `persist_video_job_artifacts` |
| Promote without re-render | **Yes** | RPC + start-video + watchdog + worker catch |
| Callback CAS | **Yes** (video) | `status=processing` update |
| Cancel revive block | **Yes** | App + trigger 023 |
| Active render guard | **Yes** (regen) | |
| Run cancel descendants | **Yes** | stamped + package items + translations |
| Watchdog promote/fail | **Yes, opportunistic** | |
| Zero-package stale run | **Yes, narrow** | 12 minutes |
| Worker SIGTERM drain | **No** | |
| Dedicated reaper cron | **No** | |

**Tests (`npm run check:production-runtime`):** upload durability rule, operator-cancel reject, watchdog live/expired/promote/queued-stale, repair soft/hard, variant metadata stamp, static wiring greps. **Does not** exercise live workers, SIGTERM, dual-worker race, or claim renew.

---

## Failure-mode × stage rollup

| Failure mode | Package gen | Video start | Worker render/upload | Callback | Cancel | Watchdog |
|--------------|-------------|-------------|----------------------|----------|--------|----------|
| Claude timeout | Settled fail (caught) | N/A | N/A | N/A | In-flight continues | N/A |
| OpenAI timeout | Settled fail (caught) | N/A | TTS/image retry→fail | Retry then promote path | Checkpoints | N/A |
| Worker crash | Lease wait; no settle | Lease/watchdog | Lease/watchdog; orphan possible | Promote if persisted | DB fail wins | Needs poll |
| Storage upload fail | N/A | N/A | Retry→fail job | N/A | — | — |
| Callback failure | Residual package CAS gap | N/A | Promote if persisted | CAS / reject | Late completed blocked | Promote |
| Network failure | HTTP + settle retry | Release to queued | Upload/callback retry | Transport retry | Notify best-effort | Needs caller |
| Vercel timeout | Unsafe inline 300s | Low risk | N/A (DO worker) | Possible | Partial | Needs poll |
| Supabase timeout | Claim/settle fail paths | Claim throw | Persist/heartbeat fail | Update throw | Mop-up retry | Fail if called |
| SIGTERM | = crash | Rare | = crash | = crash | Idempotent re-stop | Needs poll |
| Crash | = worker crash | Lease/watchdog | Lease/watchdog | Promote if artifacts | — | Needs poll |
| Power loss | = crash | = crash | = crash | = crash | — | Needs poll |

---

## Readiness gate for Phase 6D (actual injection)

| Gate | Status | Required before crash-injection |
|------|--------|----------------------------------|
| Primary path claim / lease / promote / cancel CAS | Pass | — |
| Reconcile polling during tests | Required | Always poll or call reconcile in harness |
| Package claim renew wired | Fail | Wire before long CE kill tests |
| Continuous watchdog / reaper | Fail | Cron or harness-driven reconcile loop |
| Variant path on lease RPC | Fail | Or exclude variants from Phase 6D |
| Worker SIGTERM drain | Fail | Or only inject soft timeouts, not kill -9 |
| Package callback CAS | Fail | Do not inject package-status callbacks |
| Upload→persist atomicity | Fail | Soft-inject callback loss only (post-persist) |

**Practical Phase 6D scope (allowed now):** soft timeouts (Claude/OpenAI caught paths), concurrent claim contention, dispatch-after-claim network fail, completed-callback drop **after** `persist_video_job_artifacts`, operator cancel vs late completed, regenerate-while-active, transient storage 5xx.

**Defer:** kill -9 / SIGTERM / power loss, mid-CE abort, variant crash reclaim, package-callback injection, unattended overnight heal without reconcile traffic.

---

## Related docs

- `docs/architecture/production-runtime.md` — ownership model (source of truth for Phase 5A intent)
- `docs/audits/production-reliability/` — earlier reliability audit (partially superseded on heartbeat / upload-fail / regen guard / cancel descendants)
- `supabase/migrations/025_production_runtime.sql` — claim / lease / persist / promote RPCs
- `scripts/check-production-runtime.ts` — invariant unit + wiring checks
