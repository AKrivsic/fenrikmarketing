# Concurrency, Idempotency & Transaction Boundaries

---

## 1. Unique constraints & locks

| Resource | Protection | Evidence |
|----------|------------|----------|
| content_packages × strategy_item | Partial unique | `013_content_package_idempotence.sql` |
| production_run_items × (run, package_index) | Unique | `024` |
| production_run_items × (run, strategy_item_id) | Partial unique | `024` |
| translation_jobs × (source, language) | Unique | `017` |
| video_jobs × content_item | **None** | Multiple jobs intentional |
| variant video slot | `pg_advisory_xact_lock` RPC | `021` |

---

## 2. Race catalog (T1 / T2 / Result)

### R1 — Concurrent package generation (Confirmed)

- **T1:** Passes `loadExistingPackageData` empty; runs full AI.  
- **T2:** Same; runs full AI.  
- **Result:** First insert wins; second hits unique violation → returns existing. **Double AI cost.**  
- Files: `generateContentPackage.ts:243–260`, `:1934–1948`; n8n `maxTries: 3`.

### R2 — Video claim double-start (Confirmed protected)

- **T1:** Claims queued→processing; starts worker.  
- **T2:** Claim returns 0 rows → idempotent 202.  
- File: `start-video-job/route.ts:148–190`.

### R3 — Stale reclaim vs live worker (Likely)

- **T1:** Worker rendering >30m without DB updates.  
- **T2:** Re-claims processing + re-dispatches.  
- **Result:** Two workers; first callback to set terminal wins; second no-op; **duplicate paid render**.  
- Files: `start-video-job/route.ts:156–175`; no heartbeat in `jobRunner.ts`.

### R4 — Cancel vs complete (Confirmed both orders)

- Cancel first: job failed; late completed → app reject + trigger 023.  
- Complete first: job completed; cancel does not target completed; package kept.  
- Files: `production-run-cancel.ts`; `handlers.ts:286–319`; `023_*.sql`.

### R5 — Upload OK, completed callback fails (Confirmed)

- **T1:** Uploads mp4/thumb/srt.  
- **T2:** `sendVideoCallback(completed)` throws → catch sends failed.  
- **Result:** Job `failed` despite durable artifacts; or stuck processing if failed callback also fails.  
- File: `video-worker/jobRunner.ts:682–780`.

### R6 — Regenerate double-click (Likely)

- **T1/T2:** Both regenerate; two AI runs; two `video_jobs` inserts; last writer on package text.  
- File: `regenerateContentPackage.ts:1110–1121` (no active-job assert).

### R7 — Scene regen TOCTOU (Likely)

- Both pass `assertNoActiveRender`; both generate; last `persistDraft` wins; orphan images.  
- File: `videoSceneEditor.ts`.

### R8 — Heal missing video job (Likely)

- Two heals insert two jobs; no unique; unique-violation branch ineffective for video_jobs.  
- File: `healMissingVideoJobIfRequired`.

### R9 — Package callback late overwrite (Possible/Likely if used)

- Unconditional update of package status/brief.  
- File: `handlers.ts:171–216`.

### R10 — Settlement non-atomic (Likely)

- Item marked failed; crash before run counters → parent may stay running until next reconcile.  
- File: `production-run-admin.ts` settle/reconcile paths.

### R11 — Variant after operator-failed primary (Likely)

- Slot treats failed as free → new variant job can start; not covered by Stop stamp filter.  
- Files: `021_variant_video_slot.sql`; `generateLanguageVariants.ts` metadata.

---

## 3. Idempotency of entry points

| Entry | Classification | Notes |
|-------|----------------|-------|
| Generate package (n8n/worker) | Effectively idempotent **after** persist; **Not idempotent** for AI cost before insert | Unique + pre-check |
| Regenerate package | **Not idempotent** | New AI + new video job |
| Start video | **Effectively idempotent** | Status claim / terminal 202 |
| Video callback | **Effectively idempotent** | WHERE processing |
| Package callback | **Not idempotent** | Blind update |
| Start production run | Protected by active-run app check | Race: two clicks before insert — **Possible** dual runs if check-then-insert (app-level only) |
| Stop production run | **Idempotent** mop-up | Re-stop allowed on cancelled |
| Translation enqueue | **Protected by unique constraint** | |
| Process translation | Optimistic claim | Stale reclaim may re-run work |
| Scene regenerate | **Not idempotent** | |
| Variant video insert | **Protected by RPC lock** | |

Automatic retry surfaces: n8n maxTries, HTTP clients, Vercel proxy, browser double-click (regen/start), worker callback retries.

---

## 4. Transaction boundaries

| Multi-step | Transaction? | On step N fail | Partial worker trigger? |
|------------|--------------|----------------|-------------------------|
| persistNewPackage (pkg→items→job→usage) | **No** | rollback helper (also multi-step) | Job may exist without usage; heal path |
| cancel (jobs→items→run→notify) | **No** | Jobs may be failed before run cancelled (intentional) | Worker notify best-effort |
| settle item + run counters | **No** | Item terminal, counters stale until reconcile | |
| video upload + completed callback | **No** | Failed status / stuck | |
| regenerate snapshot + update + new job | **No** | Partial versions / jobs | |
| variant content + video slot | Content then RPC | Slot may fail after content exists | |

Recovery generally cannot distinguish “complete” vs “partial” except via presence of rows (healMissingVideoJob, reconcile).

---

## 5. Working safeguards (do not remove casually)

| Safeguard | Prevents | Does not cover |
|-----------|----------|----------------|
| Unique package × strategy_item | Duplicate packages | Pre-insert AI duplication |
| Video claim WHERE status | Double dispatch of fresh jobs | Stale dual render without heartbeat |
| Callback WHERE processing | Late revive / double terminal | Package callback; upload-without-DB |
| Cancel jobs before run cancelled | Processing window for completed revive | In-flight Claude; unstamped variants |
| Trigger 023 | Operator-fail → completed | Other illegal transitions |
| Variant advisory RPC | Duplicate active variant jobs | Primary jobs; failed slot reuse |
| Translation unique + claim | Duplicate queue units | Cancel; crash until stale |
| Active run gate | Overlapping GENERATE UX | Strict race of two starts |
| settle retries (3) | Transient DB on fail settle | Hard process kill |
| Identity settlement by strategy_item_id | Ordinal mismatch orphans | Non-atomic writes |
| retryVideoJob cancel block | Restarting operator-cancelled jobs | Regen path |
| Image moderation local fallback | Infinite moderation retries | First paid retry |
| TTS/attempt caps | Unbounded voice spend | Nested with full job retry |

---

## 6. Vercel / worker timing

| Knob | Value | Implication |
|------|-------|-------------|
| Route maxDuration | 300s (`generate-content-package/route.ts`) | Inline path hard-kill mid-AI |
| Worker / n8n timeout | ~900s | Preferred path for long gen |
| Claude presentation transport | 180s × 1 | Avoids transport retry storms on package |

Hard kill mid-generate: settlement only if exception handlers run — **Likely** open run slots until stale-run (only if zero packages) or manual Stop.
