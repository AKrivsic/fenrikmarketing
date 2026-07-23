# State Machines

Status-bearing entities in production. Writers are application code unless noted.

---

## 1. `production_runs`

**Allowed statuses** (migrations `015`, `022`): `queued | running | completed | failed | cancelled`

| Field | Role |
|-------|------|
| Initial | `queued` on `createProductionRun` |
| Counters | `requested_total`, `generated_total`, `failed_total`, `package_count` |

### Legal transitions (application)

| From | To | Writer | Conditional? |
|------|----|--------|--------------|
| — | queued | `createProductionRun` | insert |
| queued | running | `setProductionRunStatus` after n8n trigger; reconcile when work starts | yes |
| queued/running | failed | trigger/plan error; `failStaleProductionRunIfNeeded` (12 min, zero packages) | yes |
| queued/running | cancelled | `cancelProductionRun` | status must be queued/running/cancelled |
| queued/running | completed | reconcile/settle when `open_slots <= 0` | yes (slot math) |
| cancelled | cancelled | re-stop mop-up | idempotent |
| failed/completed | * | generally terminal for cancel (`cancel` throws if not active) | — |

### Flags

- **Atomic?** Status updates are single-row PostgREST updates, not multi-entity transactions with items/jobs.
- **Late overwrite of terminal?** Reconcile refuses to return cancelled → running (`production-run-admin.ts:499–515`). Failed trigger status returned as-is.
- **Terminal truly terminal?** `cancelled` and `completed`/`failed` are treated as closed for GENERATE gating. Counters on cancelled runs still sync.

### Illegal / unexpected

- Application expects items to close before run completes; DB check constraint does not encode transition graph.
- Run can reach `completed` with `failed_total > 0` (by design).

---

## 2. `production_run_items`

**Statuses:** `queued | running | completed | failed` (no `cancelled` — Stop uses `failed` + operator message)

| Transition | Writer |
|------------|--------|
| → queued | create |
| → running | reconcile when package/video in flight |
| → completed | reconcile when package+video terminal success |
| → failed | `markProductionRunItemGenerationFailed`; video fail reconcile; `cancelProductionRun` open items |

**Identity:** `strategy_item_id` + unique `(production_run_id, package_index)` / partial unique strategy (`024`).

**Atomic?** Item update and run counter update are separate statements (`settleProductionRunItem` / reconcile).

**Late overwrite:** Fail settle uses guards (e.g. not overwriting completed — see settle code). Cancel sets failed on queued/running only.

---

## 3. `content_packages`

**Enum `package_status`:** `draft | ready | approved | published | archived`  
**No `failed` / `processing` / `cancelled`.**

| Transition | Writer |
|------------|--------|
| insert draft | `persistNewPackage` |
| → draft | video callback on completed (promotion/refresh) |
| status/brief update | `handleContentPackageCallback` (**unconditional**) |
| in-place content | regenerate workflow |

**Flags**

- Failed video does **not** change package status (`handlers.ts:324–326`).
- Late package callback can overwrite non-draft statuses (**Likely** if callback still invoked).
- Terminal package statuses are **not** protected by compare-and-set.

---

## 4. `content_items`

Typically `draft` on create; language variants get separate rows with `language` set.  
`generation_metadata` may include `production_run_id`, `package_index`, or `source: language_variant`.

No dedicated processing state machine for generation — generation is request-scoped until persist.

---

## 5. `video_jobs`

**Enum `job_status`:** `queued | processing | completed | failed`  
Operator cancel = `failed` + `error_message = 'Zastaveno operátorem.'` (no cancelled enum).

| Transition | Writer | Conditional |
|------------|--------|-------------|
| → queued | persist / regen / retry / variant RPC / dispatch release | insert or update |
| → processing | start-video-job claim | WHERE queued OR (stale processing) |
| → completed/failed | `handleVideoCallback` | WHERE status=processing |
| → failed (cancel) | `cancelOpenVideoJobsForProductionRun`; start-video cancel branch | WHERE queued/processing |

### Terminal protection

| Layer | Behavior |
|-------|----------|
| App callback | Reject completed if run cancelled or already operator-failed; update only if processing |
| DB trigger `023` | BEFORE UPDATE: operator-failed + NEW completed → keep OLD terminal fields |
| Trigger gap | Does **not** block failed→processing/queued; does not encode run cancelled alone |

**Multiple owners of same transition:** start-video-job, cancel helpers, video-callback, retryVideoJob, variant dispatch, healMissingVideoJob — all write status. Coordination is via status predicates, not a single state machine module.

**Unique constraint:** none on `(content_item_id)` — multiple jobs per item are allowed (retry/regen by design).

---

## 6. `translation_jobs`

**Statuses (app):** `pending | processing | completed | failed` (see `017_translation_jobs.sql` + `translationJobs.ts`)

| Transition | Writer |
|------------|--------|
| enqueue | upsert unique source×language |
| claim | pending→processing (or stale processing reclaim) |
| complete/fail | processor |

**Cancel:** none. Stop production run does not touch translation rows.

---

## 7. Language / video variants

- Variant content items: not run-stamped → outside cancelOpenVideoJobs filter.
- Variant video jobs: slot RPC prevents duplicate **active** (queued/processing/completed) jobs per package+language; **failed** frees the slot → new job allowed after operator-failed primary (**Likely**).

---

## Cross-cutting findings

| Issue | Status | Notes |
|-------|--------|-------|
| App allows transitions DB does not forbid | Confirmed | No DB transition graph; only revive trigger for one case |
| Unconditional status update | Confirmed | `handleContentPackageCallback` |
| Terminal overwrite prevented (video completed after cancel) | Confirmed | App + 023 |
| Missing CAS on package status | Confirmed | |
| Multiple modules own video status | Confirmed | Claim/cancel/callback/retry/heal |
| Run item cancel ≠ cancelled status | Confirmed | Uses failed + message |

---

## Who writes what (ownership map)

| Entity.status | Primary writers |
|---------------|-----------------|
| production_runs | `production-run-admin` (create, setStatus, reconcile, cancel, stale fail) |
| production_run_items | create, markGenerationFailed, cancel, reconcile sync |
| content_packages | generate/regenerate persist, video callback, package callback |
| video_jobs | persist, start-video-job, cancel, callback, retry, variant RPC, heal |
| translation_jobs | enqueue, claim, drain processor |
