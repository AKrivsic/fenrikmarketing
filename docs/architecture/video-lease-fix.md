# Video Lease Fix — Variant 1

**Date:** 2026-07-25  
**Related incident:** production run `c6051f49-f957-4799-a646-47cdd0d741da`  
**Migration:** `029_video_lease_on_worker_start.sql`

---

## Co bylo změněno

| Oblast | Změna |
| --- | --- |
| `claim_video_job_for_dispatch` | Autorizuje enqueue, ale **nechává job `queued`** bez `lease_owner` / `lease_expires_at` |
| `claim_video_job_for_worker` (nové) | Až při startu renderu: `queued → processing` + lease (stejná sémantika jako starý dispatch claim) |
| `/api/n8n/start-video-job` | Po úspěšném prepare vrací `status: "queued"`; při chybě enqueue job zůstává queued |
| `dispatchVariantVideoJob` | Stejný Variant 1 prepare (bez lease při enqueue) |
| `video-worker/jobRunner.ts` | Před heartbeat / render volá `claimVideoJobForWorker` |
| `evaluateRunWatchdog` | **Nikdy** nefailuje `queued` joby; stale fail jen pro `processing` s expirovaným lease / legacy stale |
| Heartbeat / renew / persist / promote | Beze změny |

Soubory:

- `supabase/migrations/029_video_lease_on_worker_start.sql`
- `lib/production-runtime/videoJobLease.ts`
- `lib/production-runtime/runWatchdog.ts`
- `lib/production-runtime/index.ts`
- `lib/production-runtime/runtimeLog.ts`
- `app/api/n8n/start-video-job/route.ts`
- `lib/ai/workflows/dispatchVariantVideoJob.ts`
- `video-worker/jobRunner.ts`
- `scripts/check-production-runtime.ts`
- `scripts/check-phase-6g-runtime-hardening.ts`

---

## Proč

Run `c6051f49` vygeneroval 14/14 package, ale 11 video jobů selhalo se:

`Video job stale: worker lease expired without completion.`

Příčina: lease (default 600 s) startoval při **dispatch/claim**, zatímco worker má concurrency 1 a joby čekaly v in-memory FIFO. Fronta wait > 10 min ⇒ watchdog považoval zdravé čekající joby za mrtvý worker.

Variant 1 odděluje **frontu** od **aktivní práce**: lease měří jen dobu, kdy worker skutečně renderuje.

---

## Nový lifecycle jobu

```
insert video_jobs          → status=queued, lease=null
        ↓
start-video-job / variant  → claim_video_job_for_dispatch
        ↓
                    still queued, lease=null
        ↓
HTTP enqueue worker        → in-memory FIFO (queue wait, no lease clock)
        ↓
worker slot free           → runVideoJob starts
        ↓
claim_video_job_for_worker → status=processing, lease=now+600s
        ↓
heartbeat renew            → renew_video_job_lease (~120s)
        ↓
persist artifacts / callback / promote → completed | failed
```

### Stavová pravidla

| Status | Lease | Watchdog |
| --- | --- | --- |
| `queued` | vždy `null` | **nesmí failnout** |
| `processing` | povinný (`video_jobs_processing_requires_lease`) | failne při expired lease bez mp4; promote při durable mp4 |
| `completed` / `failed` | terminální | ignoruje |

---

## Edge cases

1. **Double enqueue** — druhý worker claim dostane `busy` (živý lease) a render přeskočí bez failed callback.
2. **Expired processing + re-dispatch** — `claim_video_job_for_dispatch` vrátí job do `queued` (clear lease) a dovolí znovu enqueue; worker pak claimne.
3. **Dispatch HTTP failure** — job zůstává / se vrátí do `queued` bez lease; retry možné.
4. **Worker claim skipped** (`busy` / `terminal` / `artifacts_ready` / `missing`) — early return, žádný heartbeat, žádný fake fail.
5. **Operator cancel** — beze změny: cancel failne `queued|processing`; `assertVideoJobStillActive` respektuje terminální stav.
6. **CHECK constraint** — `processing` stále vyžaduje lease; claim worker nastaví obojí atomicky.
7. **Recovery cron** — stále hlídá jen processing stale; queued joby ve frontě nechá běžet.
8. **Idempotent start-video** — live `processing` → `busy` (ne double-dispatch).

---

## Proč už nemůže nastat chyba z `c6051f49`

V tom runu:

1. Package loop ~každých 100 s zavolal start-video a claim **hned** nastavil `processing` + 10min lease.
2. Worker stíhal ~1 job / 5–10 min → od 4. jobu dál fronta wait > lease.
3. Recovery cron každých 2 min failnul expired processing bez mp4.

S Variant 1 na stejném scénáři (14 package, concurrency 1):

1. Dispatch nechá joby **`queued` bez lease** po celou dobu fronty.
2. Watchdog **queued nefailuje**.
3. Lease startuje až když worker skutečně bere job → heartbeat drží lease po dobu renderu (~5–10 min < 600 s + renew).
4. Stejný backlog už **negeneruje** `Video job stale: worker lease expired without completion` z důvodu fronty.

Zůstává platné: skutečně mrtvý worker (processing bez heartbeatu) watchdog stále failne — to je záměr.

---

## Testy

```bash
npm run check:production-runtime
npm run check:phase-6g-runtime-hardening
```

Pokrytí: watchdog nefailuje queued; start-video vrací queued; jobRunner volá `claimVideoJobForWorker`; migrace 029 obsahuje worker claim.

---

## Follow-up (2026-07-25) — contract drift repair

Incident `e6469382` showed live `claim_video_job_for_dispatch` had drifted back to 025 while app/worker stayed on Variant 1.

Permanent repair + deploy gate: `docs/architecture/dispatch-worker-contract-fix.md`  
Migration: `20260725210444_repair_video_lease_dispatch_contract.sql`  
Check: `npm run check:dispatch-worker-contract` (also `prebuild`).
