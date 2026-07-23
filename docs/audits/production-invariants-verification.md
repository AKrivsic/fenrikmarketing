# Production Runtime Invariants Verification — Phase 6A

**Date:** 2026-07-23  
**Source of truth:** `docs/architecture/production-runtime.md` (`production-runtime@5a`)  
**Scope:** Verification only — no code changes.  
**Method:** Cross-check each documented invariant against `lib/production-runtime/*`, migration `025_production_runtime.sql`, call-site wiring, DB constraints/triggers, and automated checks (`npm run check:production-runtime`, related stop/settlement scripts).

---

## Verdict

**PASS WITH LIMITATIONS**

All seven Runtime invariants have real enforcement in application and/or database layers. None are wholly missing. Residual gaps are: package-generation claim **renewal is never called** (long CE can outlive the lease), active-render guard is **check-then-act** (TOCTOU), settlement/watchdog require **reconcile invocations** (no dedicated background cron), tests are mostly **pure unit + static wiring** (no live DB/RPC concurrency tests), and documented residuals (in-flight CE after Stop; unconditional package callback) remain.

---

## Inventory of enforcement surfaces

| Layer | Location |
|-------|----------|
| Modules | `lib/production-runtime/{packageGenerationClaim,videoJobLease,uploadDurability,repairPolicy,activeRenderGuard,runWatchdog,cancelPropagation,constants}.ts` |
| Migration / RPCs | `supabase/migrations/025_production_runtime.sql` |
| Related DB | `013` `uniq_content_packages_strategy_item`; `017` `uq_translation_jobs_source_language`; `023` `trg_prevent_operator_cancel_video_job_revive`; `022` cancelled run status |
| Wired call sites | `generateContentPackage.ts`, `regenerateContentPackage.ts`, `generateLanguageVariants.ts`, `start-video-job/route.ts`, `video-worker/jobRunner.ts`, `production-run-cancel.ts`, `production-run-admin.ts`, `handleGenerateContentPackageRequest.ts`, `handlers.ts` (`handleVideoCallback`) |
| Tests | `scripts/check-production-runtime.ts` (24 checks, green); `check-production-run-stop.ts`; `check-production-run-settlement.ts` |

---

## Invariant 1 — Exactly one expensive package generation per strategy item

**Status: PARTIALLY IMPLEMENTED**

Claim before Creative Engine; concurrent owners get `generation_in_progress` (HTTP 503, not settled failed). Package uniqueness is DB-backed. Claim **renewal is unimplemented at call sites**, so a live generation longer than the lease can be reclaimed.

### How is it enforced?

1. `runGenerateContentPackageUnchecked` calls `claimPackageGeneration` **before** `runGenerateContentPackageAfterClaim` (paid CE / Presentation).
2. DB RPC `claim_package_generation`: advisory `pg_advisory_xact_lock(hashtext(strategy_item_id))`; returns `existing_package` / `claimed` / `busy`.
3. Busy → workflow error `generation_in_progress` → `workflowResponse` HTTP **503** `retryable: true`.
4. `handleGenerateContentPackageRequest` **does not** settle failed on `generation_in_progress`.
5. Backstop: partial unique index `uniq_content_packages_strategy_item` (`013_content_package_idempotence.sql`); insert CAS in persist path.
6. `release_package_generation_claim` in `finally` after generation attempt.

### What prevents bypassing it?

- All `runGenerateContentPackage` entry points share the claim (n8n handler, `/api/ai/generate-content-package`, fiverr promo helper).
- RPC is `service_role`-granted; table has RLS with no anon/auth policies.
- Unique index blocks two packages even if claim were skipped.

### Can concurrent execution violate it?

- **Within lease:** No — second caller gets `busy`.
- **After lease expiry without renew:** **Yes (cost duplication)** — `renewPackageGenerationClaim` exists but is **never called** from production code. Default lease = 900s; content-package worker timeout = 900s; nested CE can exceed that → second worker can `claimed` and run another full CE. Unique index still limits to one package; **paid work can duplicate**.

### Can operator actions violate it?

- Manual regenerate is a separate path (Invariant 6); does not use this claim.
- Direct SQL/service-role inserts could bypass app claim (not the normal operator UI).

### Can crashes violate it?

- Crash mid-CE: lease eventually expires → another worker may claim. If package already inserted → `existing_package` short-circuit. If not → retry may re-run CE (intended recovery; cost risk).
- Release in `finally` may fail (logged warn); stale `generating` row until lease expiry.

### Is there an automated test?

Yes (partial).

### Which test?

`scripts/check-production-runtime.ts`:
- `generation_in_progress` terminal code
- `workflowResponse` 503
- static wiring: `claimPackageGeneration` / `generation_in_progress` in `generateContentPackage.ts`
- migration RPC name present

**Missing:** live concurrent claim RPC test; **no test that renew is wired** (and it is not).

### Confidence

**Medium** — claim path and 503 settlement skip are clear; missing renew is a concrete hole for the “exactly one expensive” cost guarantee.

---

## Invariant 2 — Successful upload is durable

**Status: IMPLEMENTED** (edge residuals)

Artifacts written to `video_jobs.output` before completed callback; failed callback suppressed after persist; promote recovers lost callbacks.

### How is it enforced?

1. `jobRunner`: after upload, `persistVideoJobArtifacts` → then `sendVideoCallback(completed)`.
2. RPC `persist_video_job_artifacts` merges `output` while `status = processing` (does not complete).
3. `shouldSendFailedCallbackAfterUpload`: if `artifactsPersisted` → never send failed.
4. On catch after persist: `promoteVideoJobIfArtifactsReady`.
5. `claim_video_job_for_dispatch` returns `artifacts_ready` when processing + `mp4_url`; `start-video-job` and reconcile call `promote_video_job_if_artifacts_ready`.
6. Completed callback CAS: update only `WHERE status = 'processing'`.

### What prevents bypassing it?

- Worker code path is the only production renderer; durability helpers are mandatory in that path.
- Promote RPC requires non-empty `mp4_url` in `output`.
- Operator-cancel revive blocked by app reject + trigger `023`.

### Can concurrent execution violate it?

- Unlikely to lose durable artifacts: promote/claim serialize on row `FOR UPDATE` / status CAS.
- Two workers: live lease → `busy`; expired lease without artifacts → reclaim (Invariant 3). With artifacts → promote, not re-render.

### Can operator actions violate it?

- Stop fails job to `failed`; late completed rejected (`shouldRejectCompletedCallbackForOperatorCancel` + trigger 023). Promote requires `processing`, so cancelled jobs are not promoted.
- Residual (documented): `handleContentPackageCallback` is an **unconditional** package status update (not video durability, but related terminal weakness).

### Can crashes violate it?

- Crash **after** persist, **before** completed callback: artifacts in DB → start-video/reconcile promote. **OK.**
- Crash **after** upload, **before** persist: no DB durability; failed callback allowed. Storage may have orphan MP4. **Partial residual.**
- If `persistVideoJobArtifacts` returns `false` without throw, worker still sends completed; failed-callback guard sees `artifactsPersisted=false`. Unlikely when lease owner matches.

### Is there an automated test?

Yes (unit + static wiring).

### Which test?

`check-production-runtime.ts`: durability pure functions; operator-cancel reject; jobRunner static matches for `persistVideoJobArtifacts` / `shouldSendFailedCallbackAfterUpload`.  
`check-production-run-stop.ts`: late completed reject cases.

**Missing:** end-to-end “upload ok + completed callback throws → no failed + promote”.

### Confidence

**High** for the designed path; **medium** for silent persist-false / pre-persist crash orphans.

---

## Invariant 3 — Long-running workers prove liveness

**Status: IMPLEMENTED**

Lease + heartbeat; stale reclaim only when lease expired (legacy: `updated_at` age).

### How is it enforced?

1. Columns `video_jobs.lease_owner`, `lease_expires_at` (migration 025).
2. `claim_video_job_for_dispatch`: queued always claimable; processing only if `lease_expires_at < now()` or legacy null-lease + `updated_at` older than `p_legacy_stale_minutes` (default 30).
3. `jobRunner`: `setInterval` → `renewVideoJobLease` every `VIDEO_JOB_HEARTBEAT_INTERVAL_MS` (default 120s); owner token = `video_job_id`.
4. `renew_video_job_lease`: renews only if `processing` + matching `lease_owner`.
5. Watchdog: live lease → do not fail; expired without mp4 → fail.

### What prevents bypassing it?

- Dispatch goes through claim RPC (`start-video-job`).
- Busy response short-circuits duplicate dispatch.
- Heartbeat failure logs warn; next renew miss → lease expires → reclaim/watchdog.

### Can concurrent execution violate it?

- Not while lease live.
- Clock skew / process pause longer than lease without renew → reclaim possible while first worker still running → duplicate render risk until CAS on terminal write. Mitigated by heartbeat interval ≪ lease (120s vs 600s).

### Can operator actions violate it?

- Cancel sets `failed` (not lease-based). Fine.
- Env knobs (`VIDEO_JOB_LEASE_SECONDS`, heartbeat, legacy stale minutes) can weaken/tighten; defaults are coherent.

### Can crashes violate it?

- Worker death: heartbeats stop → lease expires → reclaim or watchdog fail. **Intended.**
- Orphan `processing` with live lease until expiry: temporary stuck, then recoverable.

### Is there an automated test?

Yes (watchdog pure + static wiring).

### Which test?

`check-production-runtime.ts`: live lease not failed; expired fail; artifacts promote; jobRunner matches `renewVideoJobLease`.

**Missing:** live “heartbeat renew prevents reclaim” DB test.

### Confidence

**High.**

---

## Invariant 4 — Repairable validation does not discard CE

**Status: IMPLEMENTED**

Non-material fidelity soft-continues; heuristic story codes soft after one repair; PDI gets one RepairDelta pass then hard-fail only if still failing.

### How is it enforced?

1. `repairPolicy.ts`: `shouldHardFailFidelityAfterRepair` (material only via `classifyFidelityFailuresForRepair`); `shouldHardFailStoryIntegrityAfterRepair` / `STORY_INTEGRITY_SOFT_AFTER_REPAIR_CODES`.
2. `generateContentPackage.ts` + `regenerateContentPackage.ts` use those gates after ≤1 repair.
3. PDI: `buildProductDemonstrationRepairDelta` + `buildRepairDeltaPrompt` / `mergeRepairedPackage`; hard-fail only if still failing after repair attempt.

### What prevents bypassing it?

- Gates sit on the only CE→persist validation path for generate/regenerate.
- Soft-continue is intentional (documented quality tradeoff).

### Can concurrent execution violate it?

- N/A to policy semantics; concurrency does not flip hard/soft classification.

### Can operator actions violate it?

- No. Operators cannot force discard of CE via validation policy.
- Soft residues can ship lower-quality packages (documented residual).

### Can crashes violate it?

- Crash mid-repair: claim/lease recovery may retry; may re-spend CE. Does not discard a successfully persisted package.

### Is there an automated test?

Yes.

### Which test?

`check-production-runtime.ts` Invariant 4 block + generate/regenerate static wiring for PDI + hard-fail helpers.

### Confidence

**High** for wiring; soft-continue quality impact is product judgment, not an enforcement bug.

---

## Invariant 5 — Runs eventually settle

**Status: IMPLEMENTED** (invocation-dependent)

Watchdog promotes artifact-ready jobs, fails lease-expired/queued-stuck jobs when packages exist; zero-package 12-minute stale fail retained.

### How is it enforced?

1. `evaluateRunWatchdog` in `reconcileProductionRun`:
   - promote processing + durable `mp4_url`
   - fail processing with expired/legacy-stale lease and no artifacts
   - fail old `queued` jobs when `packageCount > 0` and run age ≥ `PRODUCTION_RUN_STUCK_WITH_PACKAGES_MS` (default 45m)
2. `failStaleProductionRunIfNeeded`: running/queued, **zero packages**, strategy items exist, age ≥ **12 minutes** → run `failed`.
3. Slot math via `syncRunItemsAndCounters` / settlement identity helpers.
4. Cancelled runs never return to `running` (`resolvedNext` forces `cancelled`).

### What prevents bypassing it?

- Reconcile is the settlement authority for counters/status.
- Watchdog mutations scoped to `queued|processing` ids.
- Video completion callbacks and start-video promote also trigger `reconcileProductionRunForContentItem`.

### Can concurrent execution violate it?

- Concurrent reconciles are mostly idempotent; racing fail/promote on same job is status-CAS safe enough.
- Watchdog job load uses primary items only (`language IS NULL` + run stamp) — **variant-only** stuck jobs are outside this watchdog (usually do not block primary package slot settlement).

### Can operator actions violate it?

- Stop cancels and reconciles — settles faster.
- If nobody polls / no callbacks fire, watchdog does not run — **settlement is not a standalone daemon**. UI `getProductionRunStatus` / page load / video paths invoke reconcile.

### Can crashes violate it?

- Crash mid-reconcile: next reconcile repairs counters.
- Hung videos with live leases: wait until lease expiry then fail/promote on next reconcile.

### Is there an automated test?

Yes (partial).

### Which test?

`check-production-runtime.ts`: watchdog pure cases + reconcile static wiring.  
`check-production-run-settlement.ts`: slot identity / orphan-open-slot math (not watchdog timers).

**Missing:** automated 12-minute zero-package fail; no timer integration test.

### Confidence

**Medium-high** — logic correct; “eventually” assumes reconcile traffic.

---

## Invariant 6 — One active render per package

**Status: PARTIALLY IMPLEMENTED**

Regenerate calls `assertNoActivePackageRender` before AI and before inserting a new `video_jobs` row. No DB uniqueness constraint on “one active job per package”.

### How is it enforced?

1. `assertNoActivePackageRender` / `findActivePackageVideoJobIds`: any `queued|processing` job on package content items → `WorkflowError invalid_input`.
2. Called at start of regenerate **and** again immediately before video job insert.
3. Dispatch exclusivity for a **single** job is separate (Invariant 3 claim).

### What prevents bypassing it?

- App-level only on regenerate path.
- Generate’s `healMissingVideoJobIfRequired` and initial insert do not use this assert (first job / heal). Concurrent heals can still insert two jobs (`isUniqueViolation` handled but no unique index on active jobs — prior residual PR-014).

### Can concurrent execution violate it?

- **Yes (TOCTOU):** two regenerates can both pass assert, both insert → two active renders. No partial unique index on `(content_item_id) WHERE status IN ('queued','processing')`.

### Can operator actions violate it?

- Double-click regenerate / overlapping API calls can race the TOCTOU window.
- Service-role/SQL insert of a second job bypasses the guard.

### Can crashes violate it?

- Crash after insert leaves an active job; next regenerate correctly blocked until that job terminals or is cancelled.

### Is there an automated test?

Yes (static wiring only).

### Which test?

`check-production-runtime.ts`: `assertNoActivePackageRender` present in `regenerateContentPackage.ts`.

**Missing:** concurrent regenerate race test; no behavioral unit test of `findActivePackageVideoJobIds`.

### Confidence

**Medium** — guard exists and is dual-called; not concurrency-safe at DB level.

---

## Invariant 7 — Stop covers descendants

**Status: IMPLEMENTED** (documented in-flight CE residual)

Cancel collects stamped items **and** all items on run packages; cancels pending/processing `translation_jobs`; blocks future dispatch via cancel checks.

### How is it enforced?

1. `collectContentItemIdsForRunCancel`: (a) items with `generation_metadata.production_run_id`, (b) all `content_items` on packages linked from `production_run_items`.
2. `cancelOpenVideoJobsForProductionRun` fails those jobs’ open video rows; then `cancelTranslationJobsForPackages`.
3. `cancelProductionRun`: fail open jobs **before** marking run cancelled; fail open run items; notify worker; reconcile.
4. Future dispatch: `isProductionRunCancelledForContentItem` in `start-video-job`; generate handler skips if strategy item’s run cancelled.
5. Late completed: app reject + trigger `023`.
6. Language variants: `mergeProductionRunIdIntoVariantMetadata` stamps `production_run_id` (also covered by package-descendant collect even if stamp missing).

### What prevents bypassing it?

- Cancel path always uses collector + translation cancel.
- start-video cancel branch fails open jobs when run cancelled.
- Trigger prevents operator-cancel → completed revive even if app bug.

### Can concurrent execution violate it?

- Race: generate already past cancel check (`generationBegan`) continues CE until request ends — **documented residual**; later invokes skip. Does not revive cancelled video jobs.
- Variant created after cancel without package link yet: narrow race; stamp + package collect cover normal paths.

### Can operator actions violate it?

- Stop is the enforcement. Re-stop on already cancelled still mops jobs.
- Cannot “un-cancel” run back to running via reconcile.

### Can crashes violate it?

- Crash mid-cancel: re-stop / re-reconcile is idempotent for job fail + cancelled status.
- Worker notify is best-effort; DB fail + trigger still protect terminal state.

### Is there an automated test?

Yes (partial).

### Which test?

`check-production-runtime.ts`: variant stamp; cancel static wiring.  
`check-production-run-stop.ts`: cancel message contract, late-completed reject, retry block, worker abort registry.  
Manual/e2e scripts: `controlled-stop-*.ts` (not part of the named npm invariant suite).

**Missing:** unit test asserting package-descendant IDs are merged; translation cancel row update.

### Confidence

**High** for video/translation Stop coverage; **medium** for in-flight package AI (known gap).

---

## State ownership cross-check (doc table)

| Entity | Documented prevention | Verification |
|--------|----------------------|--------------|
| `content_package_generation_claims` | claim/renew/release RPCs; busy while lease live | **Partial** — renew unused |
| `content_packages` | unique strategy_item; package callback weaker | **Confirmed** unique; **callback residual** still unconditional |
| `video_jobs` → completed | callback CAS; promote; trigger 023 | **Confirmed** |
| `video_jobs` → failed | cancel, callback, watchdog, start-video cancel | **Confirmed** |
| `production_run_items` | settle/reconcile/cancel; identity by strategy_item | **Confirmed** (+ settlement checks) |
| `production_runs` | cancelled never → running | **Confirmed** in `syncRunItemsAndCounters` |
| `translation_jobs` | processor / cancel on Stop; unique source×language | **Confirmed** (`017` + cancel helper) |

---

## Remaining bypasses / residuals (still true after Phase 5A)

| Residual | Severity for invariants | Notes |
|----------|-------------------------|-------|
| `renewPackageGenerationClaim` never called | Inv 1 | Lease can expire under long CE |
| Active-render assert TOCTOU; no unique active-job index | Inv 6 | Concurrent regenerates / heals |
| In-flight CE after Stop | Inv 7 (cost) | Cooperative abort not between CE phases |
| `handleContentPackageCallback` unconditional update | State ownership | Documented Phase 5A non-scope |
| Settlement requires reconcile invocation | Inv 5 | No dedicated watchdog cron |
| Tests mostly pure/static | All | No live RPC concurrency suite |
| Soft-continue quality residues | Inv 4 | Intentional tradeoff |

---

## Test matrix summary

| Invariant | Automated? | Primary suite | Depth |
|-----------|------------|---------------|-------|
| 1 Exclusive generation | Partial | `check:production-runtime` | codes + static wiring; no renew/concurrency |
| 2 Upload durability | Partial | `check:production-runtime` (+ stop) | pure rules + wiring |
| 3 Lease liveness | Partial | `check:production-runtime` | watchdog pure + heartbeat wiring |
| 4 Repair policy | Yes | `check:production-runtime` | policy unit + wiring |
| 5 Run settle | Partial | `check:production-runtime` + `check:production-run-settlement` | watchdog pure; slot math; no timer e2e |
| 6 One active render | Weak | `check:production-runtime` | static string match only |
| 7 Stop descendants | Partial | `check:production-runtime` + `check:production-run-stop` | contracts + wiring; limited collector coverage |

`npm run check:production-runtime` — **24 passed, 0 failed** (verified this audit).

---

## Per-invariant scorecard

| # | Invariant | Status |
|---|-----------|--------|
| 1 | Exactly one expensive package generation per strategy item | **Partially implemented** |
| 2 | Successful upload is durable | **Implemented** |
| 3 | Long-running workers prove liveness | **Implemented** |
| 4 | Repairable validation does not discard CE | **Implemented** |
| 5 | Runs eventually settle | **Implemented** (reconcile-triggered) |
| 6 | One active render per package | **Partially implemented** |
| 7 | Stop covers descendants | **Implemented** (in-flight CE residual) |

---

## Final verdict

**PASS WITH LIMITATIONS**
