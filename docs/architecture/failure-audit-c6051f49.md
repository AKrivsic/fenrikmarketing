# Failure Audit — `c6051f49`

**Run ID:** `c6051f49-f957-4799-a646-47cdd0d741da`  
**Project:** Fenrik.chat (`aabab9ff-9db4-4012-a53c-135e3bfea6cd`)  
**Analyzed:** 2026-07-25  
**Scope:** Read-only. No code, prompt, or production changes.

**Evidence sources:** Supabase (`production_runs`, `production_run_items`, `content_packages`, `content_items`, `content_strategies`, `content_strategy_items`, `video_jobs`, `translation_jobs`, `content_package_generation_claims`), n8n executions (`O27ELb1s9Y2qisOr` #1449, recovery cron `0wgLd6QxLiT37iLR`), runtime code (`claim_video_job_for_dispatch`, `VIDEO_JOB_LEASE_SECONDS`, `video-worker/queue.ts`, `evaluateRunWatchdog`, `settleRunItemIdentity`).

Legend: **EVIDENCE** · **INFERENCE** · **UNKNOWN**

---

## Executive verdict

Run **technicky „dokončil“** (`status=completed`), ale **11/14 package selhalo**.  
Všech 14 package bylo úspěšně vygenerováno (AI + persist). Pipeline se rozpadla **až ve video worker frontě**: lease pro video job se startuje při **dispatch/claim** (10 min), worker běží s **concurrency=1**, a joby čekající v paměti **vyčerpají lease dřív, než se k nim dostanou**. Watchdog je pak označí jako stale.

**Jeden systémový bug** → 11 identických kaskádových selhání.  
Nejde o AI failure, provider outage, schema crash package generace, ani o render/FFmpeg chybu na failed jobech (output `{}`).

---

# 1. RUN OVERVIEW

| Field | Value |
| --- | --- |
| production_run_id | `c6051f49-f957-4799-a646-47cdd0d741da` |
| project | Fenrik.chat |
| status | **completed** |
| created_at | 2026-07-25 07:18:53 UTC |
| updated_at | 2026-07-25 07:57:58 UTC |
| wall clock | ~39 min |
| package_count / requested_total | **14 / 14** |
| generated_total | **3** |
| failed_total | **11** |
| cancelled | **0** |
| processing / running / waiting | **0** (vše terminální) |
| error_message (parent) | `null` (parent se považuje za settled completed s partial success) |

### requested_config (zkráceně)

- `packageCount`: 14  
- platforms: tiktok, instagram, facebook, youtube, linkedin, x  
- plan: 14 video packages × (3 video + text outputs) → `totalOutputs` 147

### production_run_items

| status | count |
| --- | ---: |
| completed | 3 |
| failed | 11 |
| cancelled | 0 |
| processing / running / queued / waiting | 0 |

---

# 2. TIMELINE

Všechna data UTC.

## 2.1 Strategy

| Time | Event |
| --- | --- |
| 07:18:53 | `production_runs` created, 14 run items queued |
| 07:18:55 → 07:19:48 | Content Strategy (`claude-sonnet-4-6`, ~53 s) |
| 07:19:34 → 07:19:48 | **JSON Repair** (`gpt-4o-mini`) — priority `> 5` na items 5–13 |
| 07:19:48 | 14 `content_strategy_items` persisted; strategy theme: *Your Website Is Losing You Business While You Sleep* |

## 2.2 Package loop (n8n)

| Field | Value |
| --- | --- |
| Workflow | `Generate Content Package — Bridge (package loop)` (`O27ELb1s9Y2qisOr`) |
| Execution | **#1449** |
| Mode | webhook |
| Started | 07:19:50 |
| Stopped | 07:42:49 |
| Status | **success** |
| N3 Generate Content Package | **14/14 ok** (~87–110 s each) |
| N4 Start Video Job | **14/14 ok** (`status=processing`) |

Package creation cadence (~every 100 s):

| idx | package created | title | video_job created |
| ---: | --- | --- | --- |
| 0 | 07:21:30 | The Sunday Night Visitor | 07:21:33 |
| 1 | 07:23:09 | The Storefront That Never Closes… | 07:23:11 |
| 2 | 07:24:52 | The Heatwave That Exposed the Website | 07:24:54 |
| 3 | 07:26:19 | The Consultant Who Prepared… | 07:26:21 |
| 4 | 07:28:02 | The Five Questions | 07:28:04 |
| 5 | 07:29:32 | The Appointment That Booked Itself… | 07:29:34 |
| 6 | 07:31:16 | The Chatbot Project That Never Shipped | 07:31:18 |
| 7 | 07:32:50 | The Chat Widget That Clocked Out… | 07:32:52 |
| 8 | 07:34:32 | The Question That Actually Got Answered | 07:34:34 |
| 9 | 07:36:08 | The Website That Already Knew Everything | 07:36:10 |
| 10 | 07:37:59 | The Leads That Showed Up While Nobody Did | 07:38:01 |
| 11 | 07:39:34 | The Firm That Answered at 11 PM | 07:39:36 |
| 12 | 07:41:08 | The Setup Checklist That Doesn't Exist | 07:41:09 |
| 13 | 07:42:46 | The Monday Morning Math | 07:42:48 |

## 2.3 Video jobs (single worker)

Worker instance: `2cbf0282658b-19-9eea0c9d`  
`MAX_CONCURRENT_VIDEO_JOBS` default = **1** (in-memory FIFO).  
Lease default: `VIDEO_JOB_LEASE_SECONDS` = **600** (10 min), clock starts at `claim_video_job_for_dispatch` inside `/api/n8n/start-video-job`.

| idx | job id | created (claim) | lease_expires | completed / failed | result |
| ---: | --- | --- | --- | --- | --- |
| 0 | `2a1abf5e-…` | 07:21:33 | 07:26:26 (at complete) | 07:26:26 | **completed** (~4.9 min work) |
| 1 | `7cce1550-…` | 07:23:11 | 07:40:29 (heartbeats) | 07:30:52 | **completed** (~7.7 min wall) |
| 2 | `f9fb81d9-…` | 07:24:54 | 07:44:54 (heartbeats) | 07:35:26 | **completed** (~10.5 min wall) |
| 3 | `8295a520-…` | 07:26:21 | **07:36:23** | 07:36:27 | **FIRST FAILURE** — stale lease, output `{}` |
| 4 | `66ebb3b8-…` | 07:28:04 | 07:38:05 | 07:38:07 | failed stale |
| 5 | `40e204b4-…` | 07:29:34 | 07:39:36 | 07:39:39 | failed stale |
| 6 | `4c7e823d-…` | 07:31:18 | 07:41:20 | 07:41:22 | failed stale |
| 7 | `eb016b52-…` | 07:32:52 | 07:42:53 | 07:43:38 | failed stale |
| 8 | `14082286-…` | 07:34:34 | 07:44:36 | 07:44:39 | failed stale |
| 9 | `c15b148e-…` | 07:36:10 | 07:46:12 | 07:46:48 | failed stale |
| 10 | `fd1858ac-…` | 07:38:01 | 07:48:03 | 07:48:48 | failed stale |
| 11 | `15eb7a04-…` | 07:39:36 | 07:49:38 | 07:50:48 | failed stale |
| 12 | `7c49223f-…` | 07:41:09 | 07:51:11 | 07:52:48 | failed stale |
| 13 | `ddecd0f7-…` | 07:42:48 | 07:52:49 | 07:55:21 | failed stale |

## 2.4 Recovery / watchdog

| Workflow | `Production Run Recovery — Every 2 Minutes` (`0wgLd6QxLiT37iLR`) |
| --- | --- |
| Cadence | every 2 min during the run (executions 1448–1469) |
| Action | calls `/api/internal/production-run-recovery` → `evaluateRunWatchdog` → fail lease-expired `processing` jobs without mp4 |

**EVIDENCE:** First stale fail for idx 3 at **07:36:27** (lease expired 07:36:23). Subsequent fails align with the 2-minute recovery ticks.

## 2.5 Translation / image / render / subtitle jobs

| Job type | Table / entity | Count for this run |
| --- | --- | ---: |
| translation_jobs | `translation_jobs` | **0** |
| image_jobs | *(no table)* | N/A — images běží uvnitř video-worker |
| render_jobs | *(no table)* | N/A — FFmpeg uvnitř video-worker |
| subtitle jobs | *(no table)* | N/A — Whisper uvnitř video-worker |

Completed videos (0–2): TTS + Whisper + render OK (`subtitle_source=whisper`, `match_ratio` 0.94–0.98, `mp4_url` present).  
Failed videos (3–13): `output={}` → **images / voice / subtitles / render nikdy neproběhly** (nebo nedokončily do artifact persist).

## 2.6 První místo rozpadu

**EVIDENCE:** Pipeline se nerozpadla v Concept/Package/n8n.  
**První skutečný rozpad:** video job idx **3** (`8295a520-…`) — lease expiroval po ~10 min čekání ve worker frontě, zatímco worker dokončoval job 2. Watchdog job failnul o ~4 s později.

---

# 3. FAILURE ROOT CAUSE

## 3.1 První skutečná chyba

```
Video job stale: worker lease expired without completion.
```

na `video_jobs.id = 8295a520-95f5-44b9-9af7-5a906ebe4cc0` (package index 3),  
`lease_expires_at = 2026-07-25 07:36:23`, failed `07:36:27`.

## 3.2 Následné chyby

Stejná zpráva na **10 dalších** video jobech (idx 4–13).  
Run items mají user-facing text `Renderování videa selhalo.` (maskování v `settleRunItemIdentity` / package outcome settlement) — **důsledek**, ne root.

## 3.3 ROOT CAUSE (jeden bug)

**Lease clock startuje při dispatch claim, ne při skutečném startu renderu, a neběží heartbeat, dokud job neopustí in-memory frontu.**

Mechanismy (**EVIDENCE**):

1. `/api/n8n/start-video-job` volá `claim_video_job_for_dispatch` → status `processing`, `lease_expires_at = now() + 600s`.
2. Hned volá video-worker `POST /render`, který job **enqueue**ne do in-process FIFO (`video-worker/queue.ts`).
3. Default `MAX_CONCURRENT_VIDEO_JOBS = 1` → další joby čekají v paměti.
4. Heartbeat (`renewVideoJobLease`) startuje až v `runVideoJobInner` — **až po opuštění fronty**.
5. Package loop generuje ~1 package / ~100 s a hned dispatchne video → fronta roste.
6. Video work trvá ~5–10 min / job. Od 4. jobe dál je fronta wait > 10 min.
7. Recovery cron každých 2 min: `evaluateRunWatchdog` failne `processing` + expired lease + no mp4.

**Proč se to projevilo teď:** `packageCount=14` (dříve audity často `1`). Při 1 package se bug nespustí. Při 14 package × single worker je inevitabilní.

**INFERENCE:** Job 3 mohl krátce začít po dokončení job 2 (~07:35:26), ale lease měl zbývat ~1 min a bez okamžitého renew (interval 120 s) / watchdog ho stejně zabil; joby 4+ už čekaly >> 10 min.

## 3.4 Co to NENÍ

| Hypotéza | Verdikt |
| --- | --- |
| AI package generation failure | **Ne** — 14/14 N3 ok |
| n8n bridge crash | **Ne** — exec 1449 success |
| Provider / rate limit na images/TTS u failed jobů | **Ne** — žádný artifact, žádný provider error v DB |
| JSON/schema error package | **Ne** (minor strategy repair only) |
| 11 nezávislých bugů | **Ne** — 1 root + 10 kopií |
| Translation path | **Ne** — 0 translation jobs |

## 3.5 Vedlejší (ne-fatal) issue

Strategy generation: 1× `json_or_schema_repair` — `priority` expected `<= 5` na 9 items. Opraveno, 14 items persisted. **Nesouvisí** s video faili.

---

# 4. FAILED ITEMS

Společné pro všechny failed:

| Field | Value |
| --- | --- |
| workflow | `O27ELb1s9Y2qisOr` / N4 → `/api/n8n/start-video-job` → video-worker queue |
| node (user-facing) | settlement: „Renderování videa selhalo.“ |
| underlying error | `Video job stale: worker lease expired without completion.` |
| stack | žádný stack v DB / failure_telemetry table prázdná pro tento run |
| telemetry (package) | generation steps **nepersistovány** v `package_brief` |
| failure_telemetry (run item) | `null` |
| `production_run_item_failure_telemetry` | **0 rows** |
| retry count (video) | **0** (watchdog failne, nerequeue) |
| repair count (video) | **0** |

### Per-package

| idx | package id | strategy_item_id | run_item_id | video_job_id | run error | video error |
| ---: | --- | --- | --- | --- | --- | --- |
| 3 | `c4deb821-7ef0-44c7-9f04-abbd00bd6d4e` | `83dd16d2-…` | `ebfabb23-…` | `8295a520-…` | Renderování videa selhalo. | Video job stale… |
| 4 | `c0b70ea0-25e8-4d22-b12f-0f0788b27834` | `f4ed0308-…` | `5aa266fc-…` | `66ebb3b8-…` | Renderování videa selhalo. | Video job stale… |
| 5 | `a84a5b48-bf5b-45a1-a169-9fa722214168` | `5f6628a9-…` | `4ce4db96-…` | `40e204b4-…` | Renderování videa selhalo. | Video job stale… |
| 6 | `fb57a914-975e-4683-8316-274ab9046700` | `e152c37f-…` | `07e416a4-…` | `4c7e823d-…` | Renderování videa selhalo. | Video job stale… |
| 7 | `fc64c2ed-20bb-49a7-8b3f-e6d9971be009` | `9552fb42-…` | `81219f57-…` | `eb016b52-…` | Renderování videa selhalo. | Video job stale… |
| 8 | `d8a38e21-ab6a-4b7b-81b1-541b9e1288c5` | `457eb186-…` | `52d8e4a7-…` | `14082286-…` | Renderování videa selhalo. | Video job stale… |
| 9 | `ee9ad2d3-7a10-49f0-ae9b-3528dc39568e` | `bf68a7d2-…` | `37350d9f-…` | `c15b148e-…` | Renderování videa selhalo. | Video job stale… |
| 10 | `53d3ac0e-9af9-4418-85c9-b9e637e1bab0` | `34468aba-…` | `39d39fc3-…` | `fd1858ac-…` | Renderování videa selhalo. | Video job stale… |
| 11 | `916a128a-2423-4f9b-be02-b86ded8cf86a` | `29e24fc3-…` | `6d1d15f5-…` | `15eb7a04-…` | Renderování videa selhalo. | Video job stale… |
| 12 | `263ebbb1-07de-4894-9309-9a6b8ce3091e` | `ace483e7-…` | `eae28369-…` | `7c49223f-…` | Renderování videa selhalo. | Video job stale… |
| 13 | `129dd1a5-11b0-47de-92df-e3409329af5f` | `cd20cb06-…` | `fd9dce51-…` | `ddecd0f7-…` | Renderování videa selhalo. | Video job stale… |

Titles (strategy / package):

| idx | title |
| ---: | --- |
| 3 | The Consultant Who Prepared for Everything Except the Question |
| 4 | The Five Questions |
| 5 | The Appointment That Booked Itself Somewhere Else |
| 6 | The Chatbot Project That Never Shipped |
| 7 | The Chat Widget That Clocked Out at Midnight |
| 8 | The Question That Actually Got Answered |
| 9 | The Website That Already Knew Everything |
| 10 | The Leads That Showed Up While Nobody Did |
| 11 | The Firm That Answered at 11 PM |
| 12 | The Setup Checklist That Doesn't Exist |
| 13 | The Monday Morning Math |

---

# 5. PIPELINE STATE

```
Strategy  →  Concept/Package  →  Images  →  Voice  →  Subtitles  →  Render
   14/14           14/14            3/14      3/14       3/14          3/14
```

| Stage | Passed | Stopped / failed | Notes |
| --- | ---: | ---: | --- |
| Strategy | 14 | 0 | 1 schema repair, then OK |
| Concept + Opening + Package (content-package-worker) | 14 | 0 | n8n N3 14/14 |
| Persist package + content_items | 14 | 0 | ~10–11 items / package, all `draft` |
| Start video job (claim+dispatch) | 14 | 0 | N4 14/14 |
| Images (in worker) | 3 | 11 | failed jobs empty output |
| Voice / TTS | 3 | 11 | |
| Subtitles / Whisper | 3 | 11 | |
| Render / mux | 3 | 11 | |
| Run item completed | 3 | 11 | |

**Závěr:** Všechny package „existují“ jako textové balíčky. Selhání je **post-package media stage**, ne generation stage.

---

# 6. DATABASE STATE

## 6.1 Counts

| Entity | Expected / observed |
| --- | --- |
| production_runs | 1 row, `completed`, gen=3 fail=11 |
| production_run_items | 14 (3 completed, 11 failed) |
| content_packages | 14 (all `status=draft`) |
| content_items | ~147 rows across packages (10–11 each), all `draft` |
| video_jobs | 14 (3 completed, 11 failed) |
| translation_jobs | **0** |
| image_jobs / render_jobs / subtitle_jobs | **tables do not exist** |
| content_package_generation_claims | 14, all `released` |
| production_run_item_failure_telemetry | **0** for this run |

## 6.2 Nekonzistence

| Issue | Detail |
| --- | --- |
| **Null FKs on run items** | Všech 14: `content_item_id=null`, `video_job_id=null` i u completed |
| **Package status** | I completed video packages zůstávají `draft` (expected for review flow?), failed packages také `draft` s prázdným videem |
| **Error masking** | Run item: české „Renderování…“; video_job: anglické stale lease — operátor nevidí root bez JOINu |
| **Missing failure_telemetry** | Žádný structured dump pokusu / queue wait / lease |
| **Worker_instance_id na failed** | Nastaveno i u stale jobů (**INFERENCE:** job někdy vstoupil do `runVideoJobInner` po expiraci / těsně před ní; output zůstal `{}`) |
| **Parent status completed** | Správně settled (open slots=0), ale 79 % package fail — „completed“ ≠ success |

---

# 7. RETRIES

| Category | Count | Notes |
| --- | ---: | --- |
| Package AI retry | 0 | N3 `maxTries=1` |
| Package AI repair | **UNKNOWN** per package (telemetry not in `package_brief`) |
| Strategy JSON repair | **1** | priority `<= 5` |
| Video retry after stale | **0** | watchdog fails permanently |
| Video repair | 0 | |
| Timeout (provider) | 0 observed | |
| Validation error (fatal) | 0 | strategy repaired |
| Provider error | 0 on failed video jobs | |
| Rate limit | 0 | |
| JSON error (fatal) | 0 | |
| Schema error (fatal) | 0 | 1 repaired |
| N4 Start Video Job retries | 0 needed | all first-try 202 |

---

# 8. STUCK ITEMS

| Status | Count |
| --- | ---: |
| processing | 0 |
| running | 0 |
| queued | 0 |
| pending / waiting | 0 |

**Žádné stuck items.** Watchdog + reconcile doběhly do terminálního stavu.  
Problém není „visí“, ale **příliš agresivní / špatně timed stale-fail bez requeue**.

---

# 9. ROOT FIX

**Neimplementováno** (audit only). Popis opravy:

## Skutečný problém

Lease video jobu měří **wall-clock od claim/dispatch**, ne **active render time**. Při `concurrency=1` a N≫1 package je fronta wait systematicky > `VIDEO_JOB_LEASE_SECONDS` (600 s). Watchdog správně detekuje „expired lease“, ale **špatně interpretuje čekající zdravou frontu jako mrtvý worker**.

## Kde vzniká

| Layer | Location |
| --- | --- |
| Claim + lease start | `app/api/n8n/start-video-job/route.ts` → `claimVideoJobForDispatch` |
| RPC | `claim_video_job_for_dispatch` (`025_production_runtime.sql`) |
| Queue wait without heartbeat | `video-worker/queue.ts` + heartbeat až v `jobRunner.ts` |
| Fatal settle | `evaluateRunWatchdog` + recovery cron `0wgLd6QxLiT37iLR` |

## Proč se projevilo

- `packageCount=14` + sequential package loop + immediate video dispatch  
- Single video worker instance, concurrency 1  
- ~5–10 min / render ⇒ safe depth fronty ≈ 1 job (10 min lease)  
- Jobs 0–2 stihly heartbeat; od job 3+ ne

## Co je potřeba opravit (návrh, bez implementace)

Priorita A — **správná sémantika lease**:

1. **Lease / heartbeat od skutečného startu práce**, ne od enqueue; NEBO  
2. **Queue-wait heartbeat** (renew lease i pro pending in-memory jobs); NEBO  
3. Claim až když worker slot uvolní (dispatch bez `processing` lease; `queued` dokud worker neclaimne).

Priorita B — **capacity vs demand**:

4. Backpressure: nespouštět `start-video-job` dřív, než fronta < threshold; NEBO  
5. Scale `MAX_CONCURRENT_VIDEO_JOBS` / více workerů; NEBO  
6. Prodloužit lease proporcionálně k `queue_depth × p95_render_ms` (horší než A, ale mitigace).

Priorita C — **recovery behavior**:

7. Stale bez artifactů → **requeue** (`queued`, clear lease) s limitem pokusů, ne okamžitý permanent fail, pokud worker instance stále hlásí progress / frontu.  
8. Rozlišit `worker_dead` vs `queue_backlog_timeout`.

Priorita D — **observability**:

9. Propagovat skutečný `video_jobs.error_message` do run item (ne maskovat).  
10. Persistovat `queue_wait_ms`, `lease_renew_count`, `worker_instance_id` do failure telemetry.  
11. Doplnit `production_run_items.video_job_id` / `content_item_id` při settle.

---

# 10. SUMMARY TABLE

| Question | Answer |
| --- | --- |
| Proč nedokončil všechny package? | Video lease vypršela ve frontě single workeru |
| Co selhalo jako první? | Video job idx 3 @ 07:36:27 (stale lease) |
| Co způsobilo další selhání? | Stejný backlog — kaskáda identických stale failů |
| Jeden bug nebo více? | **Jeden systémový bug**, 11 projevů |
| Jak zabránit? | Lease vázat na active work / heartbeat ve frontě + backpressure nebo vyšší concurrency + requeue místo blind fail |

---

*End of audit. No production changes were made.*
