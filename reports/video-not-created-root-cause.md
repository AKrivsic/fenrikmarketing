# PRODUCTION FAILURE AUDIT — VIDEO NOT CREATED

**Mode:** Forensic root cause audit · no fix implemented  
**Date:** 2026-07-20  
**Failed run:** `146b3533-5865-4691-b4af-c147eb642cdd`

---

## 1. Executive summary

The package and 11 content items were persisted, but **no `video_jobs` row was ever created**. n8n then called `start-video-job`, which correctly returned `no_video_job` / `text_only` for a missing job. Hours later, reconcile marked the **video** run item `completed` because `jobs.length === 0` is treated as text-only success.

**First invalid state:** video-required package persisted without a `video_jobs` row.

**Why no final video exists:** the worker never ran — there was never a queued job to pick up, render, upload, or finalize.

**Verdict: INDEPENDENT PIPELINE BUG**

---

## 2. Timeline

| UTC | Event |
| --- | --- |
| `2026-07-19T22:51:36Z` | Deploy `ffe076b` (PRODUCT_DEMO / Visual Diversity) READY — `dpl_3c1Zet8JkK4DHHDodMatchu6GFS8` |
| `2026-07-19T23:24:10Z` | Deploy `a05e070` (Asset Guardrail Contract Fix) READY — `dpl_oSr6LMY5S6wGsoMWusDQJLgZ4Rr4` |
| `2026-07-19T23:27:52.016Z` | `production_runs` created (`146b3533-…`), status running |
| `2026-07-19T23:27:52.326Z` | `production_run_items` created (`d08d42e2-…`), tiktok/video |
| `2026-07-19T23:28:01.182Z` | Strategy item `f95e8636-…` seeded |
| `2026-07-19T23:28:01.464Z` | n8n execution **149** starts (workflow `NAKo5V3Ctlq5aW4i`) |
| `2026-07-19T23:28:01.950Z` | N3 Generate Content Package starts |
| `2026-07-19T23:32:59.804Z` | `content_packages` inserted (`b4bce30e-…`) — **T+298.34s** into N3 |
| `2026-07-19T23:33:00.137Z` | 11 `content_items` inserted — **T+298.67s** |
| ~`23:33:01Z` | Vercel `maxDuration = 300` ceiling for `/api/n8n/generate-content-package` |
| `2026-07-19T23:33:05.555Z` | N3 ends (~304s wall). Response: `ok:true`, `reused:true`, **`videoJobId:""`** |
| `2026-07-19T23:33:06–08Z` | N4 Start Video Job → `status:"no_video_job"`, `text_only:true` |
| `2026-07-19T23:33:08.018Z` | n8n execution 149 success |
| `2026-07-20T05:37:49Z` | Reconcile marks run + item **completed** (UI poll); still 0 video jobs |

**Remaining budget at package insert:** **~1.66s** before the 300s function kill.

---

## 3. Pipeline trace

| Stage | Result | Evidence |
| --- | --- | --- |
| Strategy | **PASS** | Strategy item `f95e8636-…` with `production_run_id` |
| Package generation (AI) | **PASS** | N3 ~304s; package brief has hook/video/visual_scenes/PRODUCT_DEMO |
| Package validation | **PASS** | Package persisted (guardrails did not reject) |
| Persist package | **PASS** | `content_packages` row `b4bce30e-…` status `draft` |
| Create content items | **PASS** | 11 items, all `draft`, tagged with run id |
| Create video job | **FAILED** | 0 rows in `video_jobs` for package items |
| Queue | **NOT REACHED** | No job to queue |
| Worker pickup | **NOT REACHED** | — |
| Storyboard / Images / Voice / Subtitles | **NOT REACHED** | — |
| Render / Upload / Finalize | **NOT REACHED** | — |
| Translation / language variants | **SKIPPED** | 0 `translation_jobs`; no language variants |
| start-video-job callback path | **SKIPPED (benign no-op)** | Returned `no_video_job` / `text_only` |
| Production settlement / reconcile | **FAILED (false success)** | Marked `completed` with `jobs.length === 0` |

**Exact transition where the pipeline stopped:**

```
persist content_packages + content_items
    ↓
[FIRST INVALID] video_jobs INSERT never committed
    ↓
idempotent N3 response: reused:true, videoJobId:""
    ↓
N4 start-video-job → no_video_job (treated as text-only)
    ↓
reconcileFromRealContent: jobs.length === 0 → package status completed
```

---

## 4. First invalid state

**State:** A production-run video package (`tiktok`/`instagram`/`youtube` video platforms in run config) exists with content items and a full video brief (`visual_scenes` length 5 including `PRODUCT_DEMO`), but **`video_jobs` count = 0**.

**Phase:** **job creation** (during/after persist, before queue).

Not generation. Not validation. Not worker. Not render. Not callback.

### Identifiers

| Entity | ID / value |
| --- | --- |
| production_run | `146b3533-5865-4691-b4af-c147eb642cdd` |
| status / error | `completed` / `null` |
| generated_total / failed_total | `1` / `0` |
| production_run_item | `d08d42e2-b1b0-44cb-92ce-c28950b27df6` |
| item status | `completed` |
| content_package_id | `b4bce30e-5fa4-47f8-bf91-9db6486db4b0` |
| content_item_id (on run item) | **null** (never written by reconcile) |
| video_job_id (on run item) | **null** |
| content_package | `b4bce30e-…` status `draft` |
| content_items | 11 rows (tiktok, instagram, youtube, facebook, linkedin×2, x×5) |
| video_jobs | **none** |
| translation_jobs | **none** |
| language variants | **none** |
| asset_usage | **none** |
| n8n execution | `149` / workflow `NAKo5V3Ctlq5aW4i` |
| deployment SHA | **`a05e0708874339833569d3eae4eb3590484f9aa5`** |
| deployment | `dpl_oSr6LMY5S6wGsoMWusDQJLgZ4Rr4` |

### Boolean checklist

| Question | Answer |
| --- | --- |
| package exists? | YES |
| content item exists? | YES (11) |
| video job exists? | **NO** |
| render started? | NO |
| render completed? | NO |
| translation started? | NO |
| worker callback received? | NO |

---

## 5. Database evidence

### production_runs

- `status=completed`, `error_message=null`, `generated_total=1`, `failed_total=0`
- `requested_config.config.platformContentTypes`: tiktok/instagram/youtube = `video`
- Created `23:27:52Z`, updated `05:37:49Z` (reconcile ~6h later)

### production_run_items

- Single item: platform `tiktok`, content_type `video`, status `completed`
- Linked package; **null** `content_item_id` / `video_job_id` (reconcile never sets these FKs — known)

### content_packages

- Full `package_brief` keys: cta, hook, video, hashtags, scenario, subtitles, asset_usage, image_prompts, visual_scenes, voiceover_text, platform_outputs, presentation_generation
- 5 visual scenes including structured `PRODUCT_DEMO` (`lead_capture`)
- This is **not** a text-only package by content

### content_items

- 11 primary-language rows (`language` null), all `draft`, all stamped `generation_metadata.production_run_id = 146b3533-…`

### video_jobs / translation_jobs / asset_usage

- **Empty** for this package’s items

### Orphan / stale / duplicate

| Check | Result |
| --- | --- |
| Missing video_jobs | **YES — primary defect** |
| Duplicate packages for strategy item | No (exactly 1) |
| Failed video_jobs | N/A |
| Processing forever | No |
| Completed without outputs | Run marked completed **without** any video output |
| Orphan package (video-required, no job) | **YES** |

---

## 6. Worker evidence

| Question | Answer |
| --- | --- |
| Was video job created? | **NO** |
| Was worker assigned? | NO |
| Did worker start? | NO |
| Did worker crash? | N/A |
| Did callback fail? | N/A — never invoked for a real job |
| Did upload fail? | N/A |
| Did settlement fail? | Settlement **succeeded incorrectly** (false completed) |

### n8n execution 149 (exact)

**N3 response:**

```json
{
  "ok": true,
  "data": {
    "packageId": "b4bce30e-5fa4-47f8-bf91-9db6486db4b0",
    "status": "draft",
    "contentItemIds": ["59110948-…", "…10 more…"],
    "videoJobId": "",
    "reused": true
  }
}
```

**N4 response:**

```json
{
  "ok": true,
  "status": "no_video_job",
  "text_only": true,
  "message": "no video job for content package (text-only package)"
}
```

N3 node config: `retryOnFail: true`, `maxTries: 3`, `waitBetweenTries: 2000`.  
Route `maxDuration = 300` (`app/api/n8n/generate-content-package/route.ts`).

Vercel runtime logs for the window were **unavailable** (`ExceedsBillingLimitError`). Worker process logs are empty for this run because no job was dispatched.

`reused: true` is set **only** by `loadExistingPackageData` (early idempotence or unique-violation recovery) in `generateContentPackage.ts`. Combined with T+298s package insert under a 300s ceiling, the evidenced sequence is:

1. First attempt: AI burns ~298s → inserts package + items → enters `buildVideoJobInput` (visual-scene prepare/compile) with **~1.7s left** → function killed at `maxDuration` **before** `video_jobs` insert → no rollback (process dead).
2. n8n retries N3 → finds existing package → returns `reused:true`, `videoJobId:""`.
3. N4 treats empty job as text-only success.
4. Later reconcile: `jobs.length === 0` ⇒ `completed`.

Code cites:

- Video job only if `videoPlatformSet.size > 0` — `persistNewPackage` (`generateContentPackage.ts` ~1460–1518)
- Idempotent reuse returns existing job id or `""` — `loadExistingPackageData` / `loadLatestVideoJobId`
- start-video-job benign no-op when no job — `app/api/n8n/start-video-job/route.ts` ~65–78
- Reconcile false complete — `reconcileFromRealContent` ~634–647: `jobs.length === 0 || all completed` ⇒ `completed`

---

## 7. Patch correlation

| Patch | SHA / deploy | Relation to this failure |
| --- | --- | --- |
| PRODUCT_DEMO / Visual Diversity | `ffe076b` @ 22:51Z | **Neither cause nor direct trigger.** Package contains valid IMAGE + PRODUCT_DEMO scenes; generation/validation passed. |
| Asset Guardrail Contract Fix | `a05e070` @ 23:24Z (live for this run) | **Neither.** Guardrail fix unblocks typed IMAGE AI scenes; this run successfully persisted a package. Failure is post-persist job creation / timeout / false settlement. |

**Classification: C — Independent production bug**

Evidence:

- Failure locus is `maxDuration` + incomplete persist + idempotent reuse without healing missing `video_jobs` + reconcile text-only assumption.
- Neither patch touches `persistNewPackage` video insert, `maxDuration`, n8n N4 text-only handling, or `reconcileFromRealContent` empty-jobs ⇒ completed logic.
- Prior successful video on same project after Visual Diversity (`35b8e7ba-…` on run `3c58a5f3-…`) proves video path still worked under that patch.

Not A (direct regression). Not B (patches did not expose this). Not D-only (infra timeout is involved, but product logic then **masks** it). Not E (data is consistent with orphan persist).

---

## 8. Root cause

**Root cause (one sentence):** The generate-content-package function hit the 300s `maxDuration` after committing the package and content items but before inserting `video_jobs`; the idempotent retry returned that package with an empty `videoJobId`, start-video-job no-op’d as text-only, and reconcile marked the video slot completed because zero jobs are treated as success.

**Why no final downloadable video exists:** No `video_jobs` row ⇒ worker never queued ⇒ no render ⇒ no upload ⇒ no MP4/storage object.

Downstream consequences (not the first failure): false `completed` status, null run-item FKs, N4 `text_only` response.

---

## 9. Minimal fix (no implementation)

1. **Persist atomicity / timeout:** Do not leave video-required packages without a job — either create `video_jobs` in the same DB transaction as items, or roll back package+items on kill/failure; move long AI work off the 300s Vercel budget (already noted in route comments).
2. **Idempotent reuse heal:** When `loadExistingPackageData` finds a package whose run/config requires video but `videoJobId === ""`, create the missing queued job (or fail closed) — never return success that looks like text-only.
3. **Reconcile:** For run items with `content_type=video` (or run plan video platforms), `jobs.length === 0` must be `running` or `failed`, never `completed`.
4. **n8n N4 / start-video-job:** When the production run item is video-typed, `no_video_job` should be an error, not `text_only: true`.

---

## 10. Retry recommendation

| Option | Safe? | Notes |
| --- | --- | --- |
| Safe retry (new production run) | **YES** | Prefer after fix #3 at least, or accept risk of same timeout if generation stays ~300s |
| Rerender existing job | **NO** | No job exists |
| Regenerate package | **YES** | Delete/orphaned package `b4bce30e-…` (or use regenerate path that creates a new video job) then re-run |
| Repair in place | **YES (manual)** | Create `video_jobs` from existing `package_brief` + primary video content item, then `start-video-job` |
| Rollback patches | **NO** | Not causal |
| Worker stuck | **NO** | Never started |
| Manual intervention | **YES** | Required to get a video from this package without a full new run |

**Recommended containment:** Do not trust this run’s `completed` status. Either manually enqueue a video job for `b4bce30e-…` or regenerate; do not ship this package as a finished video output.

---

## 11. Final verdict

**INDEPENDENT PIPELINE BUG**

---

_End of report._
