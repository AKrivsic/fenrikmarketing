# Production Failure Audit — `e6469382`

**Run ID:** `e6469382-a897-42b7-88fe-2d650b778d42`  
**Project:** fenrik Studio (`163c1822-ad30-4cee-8826-dfacd9c188b9`)  
**Analyzed:** 2026-07-25  
**Scope:** Read-only. No code, prompt, migration, or production changes.

**Evidence sources:** Supabase (`production_runs`, `production_run_items`, `content_strategies`, `content_packages`, `content_items`, `video_jobs`, `production_run_item_failure_telemetry`, `supabase_migrations.schema_migrations`, live `pg_proc` for `claim_video_job_for_*`), n8n (`O27ELb1s9Y2qisOr` #1539, recovery cron `0wgLd6QxLiT37iLR` #1540–#1561), runtime code (`start-video-job`, `claimVideoJobForWorker`, `evaluateRunWatchdog`, `settleRunItemIdentity`), migration `029_video_lease_on_worker_start.sql`.

Legend: **EVIDENCE** · **INFERENCE** · **UNKNOWN**

---

## Executive verdict

Run **technically settled** (`status=completed`) with **21/21 packages failed** and **`generated_total=0`**.

**Primary root cause (20/21 packages):** Variant 1 app/worker was live, but live DB RPC `claim_video_job_for_dispatch` still used **old 025 semantics** — it set `processing` + a 600s lease at enqueue. The Variant 1 worker then called `claim_video_job_for_worker`, saw a live lease, returned **`busy`**, and **skipped render** (`worker_instance_id` stayed `null`, `output={}`). After ~10 minutes the recovery watchdog stale-failed every job with:

`Video job stale: worker lease expired without completion.`

**Secondary independent failure (1/21):** package index **16** failed during Content Package generation (LinkedIn caption validation), never created a package/video job.

This is **not** the same failure mode as `c6051f49` (healthy queue wait exceeding lease). Here the worker **never started any render** for this run.

**Confidence: High** on the primary mechanism and cascade. **Medium** on the exact operator/process that left `claim_video_job_for_dispatch` drifted vs migration history.

---

# 1. RUN OVERVIEW

| Field | Value |
| --- | --- |
| production_run_id | `e6469382-a897-42b7-88fe-2d650b778d42` |
| project | fenrik Studio |
| status | **completed** |
| created_at | 2026-07-25 10:16:44 UTC |
| updated_at | 2026-07-25 11:16:01 UTC |
| wall clock | ~59 min |
| package_count / requested_total | **21 / 21** |
| generated_total | **0** |
| failed_total | **21** |
| error_message (parent) | `null` |

### requested_config (summary)

- `packageCount`: 21  
- platforms: tiktok, instagram, youtube, linkedin  
- plan: 21 video packages → `totalOutputs` 77 (63 video + 14 text)

### production_run_items

| status | count |
| --- | ---: |
| failed | 21 |
| completed | 0 |
| cancelled / processing / running / queued | 0 |

### Failure classes

| Class | Count | idxs |
| --- | ---: | --- |
| Video stale lease (primary cascade) | **20** | 0–15, 17–20 |
| Package generation validation | **1** | 16 |

---

# 2. COMPLETE EXECUTION TIMELINE

All times UTC.

## 2.1 Strategy — success

| Time | Event |
| --- | --- |
| 10:16:44 | `production_runs` + 21 run items created |
| 10:16:46 → 10:17:41 | Content Strategy (`claude-sonnet-4-6`, 54.7 s) — **success**, no repair |
| 10:17:41 | Strategy Items persisted — **21/21** |
| Strategy | theme **Invisible Work, Visible Cost** (`58097570-0c23-489a-9490-d96b0357f4f3`) |
| Funnel | Awareness 6, Problem Aware 10, Solution Aware 4, Conversion 1 |

**EVIDENCE:** Strategy telemetry `success=true`, `repair=false`, 21 items.

## 2.2 Package loop (n8n) — overall success with 1 generation failure

| Field | Value |
| --- | --- |
| Workflow | `Generate Content Package — Bridge (package loop)` (`O27ELb1s9Y2qisOr`) |
| Execution | **#1539** |
| Mode | webhook |
| Started | 10:17:45 |
| Stopped | 10:49:14 |
| Status | **success** |
| Loop | 21 iterations (`currentRunIndex=21`) |

### N3 Generate Content Package

| Result | Count |
| --- | ---: |
| Package persisted + video job started | **20** |
| Generation failed (422) | **1** (idx 16) |

### N4 Start Video Job — responses (EVIDENCE from n8n processedItems)

All 20 video dispatches returned:

```json
{ "ok": true, "video_job_id": "<uuid>", "status": "queued" }
```

That response shape is **Variant 1 API** (`/api/n8n/start-video-job` after successful worker HTTP enqueue).

Package cadence (~80–100 s):

| idx | package created | title | video_job created | lease_expires | stale-failed |
| ---: | --- | --- | --- | --- | --- |
| 0 | 10:19:08 | The Tuesday Caption | 10:19:09 | 10:29:11 | 10:29:14 |
| 1 | 10:20:44 | The Ideas Were Never the Problem | 10:20:46 | 10:30:47 | 10:30:48 |
| 2 | 10:22:03 | Nine Weeks Ago | 10:22:05 | 10:32:06 | 10:32:09 |
| 3 | 10:23:30 | The Notes App Graveyard | 10:23:32 | 10:33:33 | 10:33:36 |
| 4 | 10:24:46 | The Freelancer Fix That Became a Second Job | 10:24:47 | 10:34:48 | 10:34:52 |
| 5 | 10:26:15 | The Calendar Slot That Has Never Actually Been Used | 10:26:16 | 10:36:18 | 10:36:22 |
| 6 | 10:27:49 | The Four-Platform Tax Nobody Warned You About | 10:27:50 | 10:37:52 | 10:38:48 |
| 7 | 10:29:16 | The Myth of the Missing Brief | 10:29:17 | 10:39:18 | 10:40:48 |
| 8 | 10:30:39 | The Launch That Nobody Saw | 10:30:41 | 10:40:43 | 10:40:48 |
| 9 | 10:32:05 | The Priority That Has No Deadline | 10:32:07 | 10:42:08 | 10:42:48 |
| 10 | 10:33:25 | Six Months of Retainer, Still No Posts | 10:33:26 | 10:43:28 | 10:44:49 |
| 11 | 10:35:06 | The Week You Would Have Spent Building This | 10:35:08 | 10:45:09 | 10:46:48 |
| 12 | 10:36:38 | The 40-Minute Video That Ate My Thursday | 10:36:40 | 10:46:42 | 10:46:48 |
| 13 | 10:38:06 | The Loyalty Test Nobody Saw Coming | 10:38:07 | 10:48:08 | 10:48:48 |
| 14 | 10:39:29 | The In-House Plan That Never Starts | 10:39:31 | 10:49:32 | 10:50:49 |
| 15 | 10:40:52 | The Decision That Never Gets Made | 10:40:53 | 10:50:55 | 10:52:48 |
| 16 | — | *(no package)* | — | — | 10:43:30 generation fail |
| 17 | 10:44:59 | The Content Week That Cost 40 Hours… | 10:45:00 | 10:55:01 | 10:56:49 |
| 18 | 10:46:28 | What Actually Leaves the List | 10:46:29 | 10:56:31 | 10:56:49 |
| 19 | 10:47:55 | The Sunday Clarity Trap | 10:47:57 | 10:57:58 | 10:58:48 |
| 20 | 10:49:11 | The Only Thing fenrik Studio Needs From You | 10:49:12 | 10:59:14 | 11:00:49 |

**EVIDENCE:** For job 0, `lease_expires_at - created_at = 601.2 s` — lease started at dispatch, not after render work.

## 2.3 Video worker — zero renders

| Observation | Evidence |
| --- | --- |
| Concurrent other video jobs in window 10:19–11:00 | **None** (only this run’s 20 jobs) |
| Prior worker activity | Last prior job `a8694662-…` completed **10:04:22** on instance `2cbf0282658b-19-9eea0c9d` |
| Gap before first e646 job | ~15 min idle worker capacity |
| `worker_instance_id` on all 20 e646 jobs | **`null`** |
| `output` | `{}` (empty) |
| `mp4_url` | none |
| TTS / Whisper / images / FFmpeg | **never ran** (no artifacts) |

**Contrast with `c6051f49` stale jobs:** those carried `worker_instance_id=2cbf0282658b-19-9eea0c9d` (accepted into worker). Here instance id never set → worker never entered the post-claim render path.

## 2.4 Recovery / watchdog

| Workflow | `Production Run Recovery — Every 2 Minutes` (`0wgLd6QxLiT37iLR`) |
| --- | --- |
| Action | `/api/internal/production-run-recovery` → `evaluateRunWatchdog` |

| Exec | Time | `failed_stale_jobs` |
| ---: | --- | ---: |
| 1545 | 10:28:47 | **0** (job 0 lease still valid until 10:29:11) |
| 1546 | 10:30:47 | **1** |
| later ticks | 10:32–11:00 | continue failing remaining expired processing jobs |

Watchdog rule (**EVIDENCE** `runWatchdog.ts`): only `processing` + expired lease / legacy stale without durable mp4 → fail. Message: `Video job stale: worker lease expired without completion.`

**First cascade fail:** job 0 (`cebda8b2-…`) at **10:29:14** (~3 s after lease expiry 10:29:11).

## 2.5 Package idx 16 — separate generation failure

| Field | Value |
| --- | --- |
| run_item | `06bb186f-c263-4261-a2b6-118a103b03c9` |
| strategy_item | `f4c0ffa0-e380-4501-b1ef-093c3a957ad0` |
| failed_at | 10:43:30 |
| phase | `package_generation_failed` |
| attempts | 2 |
| terminal | `generation_failed` |

Telemetry steps:

1. Video Concept — success (`claude-sonnet-4-6`)  
2. Opening Impact — success (`gpt-4o-mini`)  
3. Visual Identity — success (deterministic)  
4. Content Package — **fail** after retry (`retry_count=1`)  
5. JSON Repair ×2 (`gpt-4o-mini`) — still left LinkedIn caption invalid  

Exact validation error:

```text
$.platform_outputs.linkedin.caption: caption duplicates the voiceover opening — rewrite as platform-native copy
```

Voiceover opening / LinkedIn caption both start with:

> The founders spending the most time on content are usually the ones posting the least.

**EVIDENCE:** row in `production_run_item_failure_telemetry` + n8n Axios 422 on N3 for iteration 16. No `content_package`, no `video_job`.

## 2.6 Other subsystems reviewed

| Subsystem | Finding |
| --- | --- |
| `translation_jobs` | **0** for this project/window |
| `image_jobs` / `ai_jobs` tables | **N/A** (images/TTS inside video-worker; never reached) |
| OpenAI / Claude (package path) | 20 packages generated successfully; idx 16 failed validation only |
| FFmpeg | never reached |
| Cancellation / operator cancel | not present (`Renderování videa selhalo.` is settlement mask, not cancel) |
| Content items | **94** rows for the 20 packages (platform outputs persisted) |
| Vercel runtime logs | **UNKNOWN** — API returned `ExceedsBillingLimitError` |

---

# 3. FIRST REAL ROOT CAUSE

## 3.1 First failure that caused the cascade

**First fatal event of the mass failure:** video job idx **0** (`cebda8b2-925f-44dd-9585-9e341f738b38`) marked failed at **10:29:14** with:

```text
Video job stale: worker lease expired without completion.
```

That was not a random first crash — by then the job had already been **non-executable** for 10 minutes because the worker refused the claim.

## 3.2 Primary cause (system)

**Split-brain between Variant 1 application/worker and live `claim_video_job_for_dispatch` RPC.**

### What the app believed (EVIDENCE)

- `start-video-job` comments + return path: dispatch keeps job **queued**, no lease; worker takes lease.  
- n8n #1539 received `status: "queued"` for all 20 starts.  
- Worker code calls `claimVideoJobForWorker` before render; on non-`claimed` → `job_claim_skipped` and **return** (no `worker_instance_id`, no heartbeat, no FFmpeg).

### What the DB actually did during this run (EVIDENCE)

Live function body (queried at audit time; matches run row shape):

```sql
update video_jobs
set
  status = 'processing',
  lease_owner = p_owner_token,
  lease_expires_at = lease_until,  -- now() + 600s
  ...
```

For job 0: lease set ~601 s after `created_at`, `lease_owner = job.id`, `worker_instance_id = null`.

### Migration drift (EVIDENCE)

| Source | `claim_video_job_for_dispatch` behavior |
| --- | --- |
| `supabase_migrations` version `20260725082555` (`video_lease_on_worker_start`) stored statements | Variant 1: stay **`queued`**, clear lease |
| File `029_video_lease_on_worker_start.sql` | same Variant 1 |
| Live `pg_proc` body **now** | **Old 025**: set **`processing` + lease** |
| Live `claim_video_job_for_worker` | exists (Variant 1 worker claim) |

So: migration history says 029 applied; **live dispatch function does not match 029**. Worker claim function exists. App returns `queued`. That combination produces exactly the observed busy-skip → stale-fail pattern.

### Causal chain (EVIDENCE + tight INFERENCE)

```
N4 start-video-job
  → claim_video_job_for_dispatch  [OLD live RPC]
       sets status=processing, lease=now+600s
  → HTTP POST video-worker        [succeeds → n8n sees ok/queued]
  → worker dequeues job
  → claim_video_job_for_worker
       sees processing + live lease → status=busy
  → job_claim_skipped; no render; worker_instance_id stays null
  → ~600s later lease expires
  → evaluateRunWatchdog / recovery cron fails job
  → settleRunItemIdentity masks as "Renderování videa selhalo."
```

Repeat for all 20 video packages. No concurrency backlog required — **even job 0 alone fails** because nothing ever renders.

## 3.3 Why this is different from `c6051f49`

| | `c6051f49` | `e6469382` |
| --- | --- | --- |
| Packages generated | 14/14 | 20/21 (+1 gen fail) |
| Videos completed | 3 | **0** |
| `worker_instance_id` on failed jobs | set | **null** |
| Mechanism | queue wait > lease while worker busy | worker **skips** claim as busy |
| First fail index | 3 | **0** |

## 3.4 Secondary cause (not the cascade)

Idx 16 LinkedIn caption validation failure is real and independent. It did not cause the other 20 failures (those already had packages + video jobs earlier/later).

## 3.5 Downstream consequences (not root)

| Symptom | Role |
| --- | --- |
| `Renderování videa selhalo.` on run items | Settlement user-facing mask (`settleRunItemIdentity`) |
| `production_run_items.video_job_id` null for all | Identity not linked on items; jobs still exist via `video_jobs.package_id` |
| Parent `error_message` null + `status=completed` | Partial-failure settle treats run terminal |
| `generated_total=0` | No video completed / no successful package outcome counted |
| Empty `output={}` | No TTS/images/render artifacts |
| Watchdog stale message | Detection of expired processing lease — correct given bad state, not the originating bug |

## 3.6 Ruled out

| Hypothesis | Verdict |
| --- | --- |
| Strategy failure | **No** — 21/21 items |
| n8n bridge crash | **No** — exec 1539 success |
| Video worker unreachable | **No** — all 20 start-video returned `ok:true` (HTTP enqueue succeeded) |
| Worker busy with other projects | **No** — no other jobs in window; prior job done at 10:04 |
| Provider outage (OpenAI/Claude/TTS/image) | **No** for the 20 — never reached video media steps |
| FFmpeg bug | **No** — never reached |
| Classic `c6051f49` queue-lease race alone | **No** — job 0 failed with null instance id; no successful renders ahead of it |
| Operator cancel | **No** |
| 21 independent bugs | **No** — 20 identical video fails + 1 separate gen fail |

---

# 4. PER-PACKAGE FAILURE TABLE

Shared for video failures (idxs ≠ 16):

| Field | Value |
| --- | --- |
| Last successful step | Package persist + N4 start-video HTTP enqueue |
| First failed step | Worker claim (`claim_video_job_for_worker` → busy / skip) — **inferred from code + null instance id**; terminal DB error written later by watchdog |
| Exact terminal error (video_jobs) | `Video job stale: worker lease expired without completion.` |
| Run item error | `Renderování videa selhalo.` |
| Same cause? | **Yes** (20/20 video packages) |

| idx | package_id | video_job_id | last success | first fail | exact error |
| ---: | --- | --- | --- | --- | --- |
| 0 | `c269284d-…` | `cebda8b2-…` | package + enqueue | worker skip → stale @10:29:14 | Video job stale… |
| 1 | `9b396778-…` | `eddf15b9-…` | package + enqueue | same | same |
| 2 | `b4cb33df-…` | `1a9b3ed0-…` | package + enqueue | same | same |
| 3 | `bdd15103-…` | `1e10b115-…` | package + enqueue | same | same |
| 4 | `37f6ce97-…` | `f5501c3d-…` | package + enqueue | same | same |
| 5 | `94f5bd03-…` | `10c1359d-…` | package + enqueue | same | same |
| 6 | `c92ad59a-…` | `87216141-…` | package + enqueue | same | same |
| 7 | `971e7aa2-…` | `5431736e-…` | package + enqueue | same | same |
| 8 | `8a26acbf-…` | `10b07731-…` | package + enqueue | same | same |
| 9 | `d66799fb-…` | `08077c07-…` | package + enqueue | same | same |
| 10 | `52f5f262-…` | `86efabce-…` | package + enqueue | same | same |
| 11 | `174d2530-…` | `c52501e3-…` | package + enqueue | same | same |
| 12 | `bec6476e-…` | `96818f84-…` | package + enqueue | same | same |
| 13 | `1847bed2-…` | `29a57889-…` | package + enqueue | same | same |
| 14 | `0ba65f24-…` | `a2a58e84-…` | package + enqueue | same | same |
| 15 | `6f25ff2d-…` | `eeb3349b-…` | package + enqueue | same | same |
| 16 | — | — | Opening Impact / Visual Identity | Content Package validation | LinkedIn caption duplicates VO opening |
| 17 | `0c082332-…` | `fb6b1d28-…` | package + enqueue | worker skip → stale | Video job stale… |
| 18 | `fec62148-…` | `899ef0dc-…` | package + enqueue | same | same |
| 19 | `afbfba74-…` | `553bc06a-…` | package + enqueue | same | same |
| 20 | `4f1a226c-…` | `92506e54-…` | package + enqueue | same | same |

---

# 5. WHY 21/21 FAILED

1. **20 packages** successfully generated creative/platform content and created `video_jobs`.  
2. Every dispatch used **old lease-at-dispatch RPC** while the **Variant 1 worker refused busy jobs** → **0 renders**.  
3. Watchdog correctly (given state) stale-failed all 20 after lease expiry.  
4. **1 package** (idx 16) never left generation due to LinkedIn caption validation after 2 attempts + JSON repair.  
5. Settlement counted **0 generated**, **21 failed**, parent run `completed`.

No single AI outage, n8n crash, or FFmpeg error explains the full set. The shared killer for the run’s output is the **dispatch/worker lease contract mismatch**.

---

# 6. AFFECTED JOBS

### Video jobs (20) — all failed stale

`cebda8b2`, `eddf15b9`, `1a9b3ed0`, `1e10b115`, `f5501c3d`, `10c1359d`, `87216141`, `5431736e`, `10b07731`, `08077c07`, `86efabce`, `c52501e3`, `96818f84`, `29a57889`, `a2a58e84`, `eeb3349b`, `fb6b1d28`, `899ef0dc`, `553bc06a`, `92506e54`

(all suffixes truncated in prose; full UUIDs in §2.2 table / DB)

### Failure telemetry rows

| Table | Rows for this run |
| --- | ---: |
| `production_run_item_failure_telemetry` | **1** (idx 16 only) |
| run_item `failure_telemetry` JSON | set only on idx 16 |

Video stale failures left **no** structured failure_telemetry rows (watchdog path).

### n8n

| Execution | Role |
| --- | --- |
| #1539 `O27ELb1s9Y2qisOr` | package loop |
| #1540–#1561 `0wgLd6QxLiT37iLR` | recovery ticks during/after fail wave |

---

# 7. LOGS & EVIDENCE SNIPPETS

### n8n Start Video Job (representative)

```json
{ "ok": true, "video_job_id": "cebda8b2-925f-44dd-9585-9e341f738b38", "status": "queued" }
```

### video_jobs row shape (job 0)

```text
status=failed
lease_owner=cebda8b2-925f-44dd-9585-9e341f738b38
lease_expires_at=2026-07-25 10:29:11.109997+00
created_at=2026-07-25 10:19:09.886196+00
worker_instance_id=null
output={}
error_message=Video job stale: worker lease expired without completion.
```

### Recovery cron #1546 body

```json
{
  "ok": true,
  "summary": {
    "scanned_runs": 1,
    "reconciled_runs": 1,
    "promoted_video_jobs": 0,
    "failed_stale_jobs": 1,
    "settled_runs": 0
  }
}
```

### Live RPC update block (audit-time `pg_get_functiondef`)

```sql
update video_jobs
set
  status = 'processing',
  lease_owner = p_owner_token,
  lease_expires_at = lease_until,
  error_message = null
where id = p_job_id
  and project_id = p_project_id;
```

### Worker skip path (code)

```387:405:video-worker/jobRunner.ts
  const claim = await claimVideoJobForWorker(leaseSupabase, {
    jobId: payload.video_job_id,
    projectId: payload.project_id,
    ownerToken: leaseOwner,
  });
  if (claim.status !== "claimed") {
    console.info(
      JSON.stringify({
        scope: "video-worker",
        event: "job_claim_skipped",
        ...
        claim_status: claim.status,
      }),
    );
    clearJobAbort(payload.video_job_id);
    return;
  }
```

Worker container logs for `job_claim_skipped` during this window: **UNKNOWN** (not in DB; Vercel log API unavailable).

---

# 8. CONFIDENCE

| Claim | Confidence |
| --- | --- |
| 20/21 failed due to video stale lease after zero renders | **High** |
| Lease started at dispatch (~+600s from create) | **High** |
| Worker never set `worker_instance_id` / never produced artifacts | **High** |
| n8n enqueue HTTP succeeded (`status: queued`) | **High** |
| Mechanism = OLD dispatch RPC + Variant 1 worker busy-skip | **High** |
| Live dispatch RPC currently matches 025, not 029 statements | **High** |
| Exact process that re-introduced/left old dispatch body | **Medium / Unknown** |
| Idx 16 LinkedIn validation as independent secondary fail | **High** |
| Not classic c6051f49 queue-wait alone | **High** |

---

# 9. OPEN UNKNOWNS (explicit)

1. **Who/what restored old `claim_video_job_for_dispatch`** after migration `20260725082555` recorded Variant 1 SQL — no DB audit trail consulted beyond `schema_migrations` + live `pg_proc`.  
2. **Worker stdout** for `job_claim_skipped` during 10:19–11:00 (host logs not retrieved).  
3. **Vercel serverless logs** for `/api/n8n/start-video-job` (billing limit on log API).  
4. Whether any in-process worker queue still held payloads after skip (irrelevant to DB outcome; jobs still expired).

---

# 10. SUMMARY ONE-LINER

**First real root cause:** live `claim_video_job_for_dispatch` still started a processing lease at enqueue while the Variant 1 video worker required a free queued job to claim — every job was skipped as `busy`, then watchdog stale-failed all 20 videos; idx 16 failed separately on LinkedIn caption validation.
