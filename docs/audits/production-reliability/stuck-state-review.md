# Stuck-State Review

States that can remain non-terminal without further progress, and what recovers them.

---

## Matrix

| Entity | Stuck status | How entered | Timeout / recovery | Operator-visible? | Finding |
|--------|--------------|-------------|--------------------|-------------------|---------|
| production_runs | `running` | Trigger OK; work slow/stuck | Stale fail **only if zero packages** after 12 min; else relies on reconcile + Stop | Yes (UI poll) | Packages exist + stuck videos → run can stay running indefinitely until Stop or jobs finish |
| production_run_items | `queued` | Never picked by n8n | No per-item timeout; run may complete others; cancel fails open items | Yes | Item orphan if n8n skips |
| production_run_items | `running` | Package exists; video not terminal | Until video completes/fails/cancel | Yes | Tied to video stuck |
| video_jobs | `queued` | Persist; start-video never called | No watchdog; needs n8n/manual start | Yes if UI shows jobs | Pipeline skip / cancel should fail on Stop |
| video_jobs | `processing` | Claimed; worker dead or callback lost | Stale reclaim on **next** start-video after 30 min default | Partial | No heartbeat; reclaim may duplicate live work |
| video_jobs | `processing` | Upload OK; both callbacks fail | Same stale reclaim | Job appears running | Artifacts may exist in storage |
| translation_jobs | `processing` | Drain killed mid-unit | Stale reclaim 15 min | If UI shows queue | May re-pay localization |
| content_packages | `draft` forever | Video failed; no package failed status | Manual regen/retry | Package looks OK; run item failed | Confusing UX, not a process stuck |
| Package gen (no row) | N/A | AI in flight; process killed | No package; settle may miss on hard kill; stale run if zero packages | Run running | Open slots |
| Scene editor draft | metadata only | Crash mid-regen | Manual | Local | Orphan images |

---

## Paths with no equivalent terminal-state enforcement

Compared to video cancel+callback CAS:

| Async path | Terminal protection? |
|------------|----------------------|
| Primary video jobs | App cancel + callback CAS + trigger 023 |
| In-flight package Claude | Cancel check only at start — **no** cooperative abort |
| content-package-callback | **No** terminal guard |
| Translation jobs | **No** operator cancel |
| Language-variant video jobs | Often **not** in cancelOpenVideoJobs filter |
| Scene image HTTP regen | **No** video_jobs status machine |
| Regenerated video jobs overlapping | **No** active-job guard on regen insert |

---

## Crash / timeout scenarios

### A. Exception after setting processing, before failure record

- Video: claim then dispatch fail → released to `queued` (`start-video-job:206–214`) — **good**.  
- Video: worker crash after claim → stuck processing until stale reclaim.  
- Translation: stuck processing until 15 min reclaim.  
- Package: no processing status; if `generationBegan` and catch runs → settle; hard kill → no settle.

### B. Vercel timeout interrupting workflow

- Inline 300s kill mid-AI: paid work wasted; settlement unreliable.  
- Worker path preferred (900s).

### C. Worker response lost

- Job stays processing; stale reclaim may restart.  
- If completed callback lost after upload: failed callback may mark failed or leave processing.

### D. Upload succeeds, DB update fails

- Completed callback is the DB update path; failure → failed callback or stuck processing.  
- Storage retains objects under `{project}/video/{video_job_id}/…`.

### E. DB update succeeds, next job never queued

- Package without video job: heal on next generate idempotent path.  
- Run item without n8n start-video: remains running until cancel/reconcile failure paths.

---

## Heartbeat / watchdog summary

| Mechanism | Exists? |
|-----------|---------|
| Video worker heartbeat updating `updated_at` | **No** |
| Dedicated watchdog daemon/cron for video/runs | **No** |
| Opportunistic stale reclaim on dispatch | **Yes** (video, translation) |
| Stale production run fail | **Yes** but narrow (zero packages, 12 min) |
| Manual Stop | **Yes** (run scope) |
| Manual video retry | **Yes** (not for operator-cancelled) |

---

## Highest stuck risks

1. **Run `running` with packages present and video jobs stuck** — no automatic run-level timeout.  
2. **`video_jobs.processing` after lost callbacks** — 30 min then possible duplicate spend.  
3. **Hard-killed package generation** — open run items until Stop or (if no packages at all) stale fail.  
4. **Translation `processing`** — 15 min reclaim; no Stop integration.
