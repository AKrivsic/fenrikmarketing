# Generate Content — Complete Production Flow Audit

**Mode:** Full end-to-end forensic audit · no code changes  
**Date:** 2026-07-20  
**Sources:** UI/actions, `production-run-admin`, `generateContentPackage`, `runWithRepair`, n8n workflow `NAKo5V3Ctlq5aW4i`, video callback handlers, migrations, Fenrik.chat production rows

---

## 1. Executive summary

Clicking **GENERATE CONTENT** creates one `production_runs` row + N `production_run_items`, seeds N strategy items, fires **one** n8n webhook, then the UI polls reconcile every 3s.

n8n runs a **single execution** that loops strategy items **sequentially** (batchSize 1). Each item gets its **own** `POST /api/n8n/generate-content-package` (fresh 300s Vercel budget) and, if `ok` + `packageId`, `POST /api/n8n/start-video-job`.

**One package failure does not stop the batch** (`onError: continueRegularOutput` on N3/N4). It **does delay** later packages because the loop is sequential.

**Dangerous silent failure (proven in production `146b3533`):** video-required package + content items + **no `video_jobs` row** → start-video returns `no_video_job`/`text_only` → reconcile treats `jobs.length === 0` as **completed**.

---

## 2. UI entry point

| Field | Value |
| --- | --- |
| File | `components/projects/ContentProductionPanel/ContentProductionPanel.tsx` |
| Button label | `GENERATE CONTENT` (pending: `Spouštím…`; active: `Generování probíhá…`) |
| Handler | `handleGenerate` → server action `startProductionRun` |
| Server action | `app/projects/[id]/production/actions.ts` → `startProductionRun` |
| Payload | `{ ...config, generationMode: "production" }` with `packageCount`, `packagesWithAssetSupport`, `platforms`, `multipliers`, `platformContentTypes` from project content controls |
| Disable | `generateDisabled = isPending \|\| active \|\| !canGenerate \|\| promoBusy` |
| Active gate | Server: `getActiveProductionRun` rejects if queued/running already |
| After success | Sets `runIdRef`, calls `getProductionRunStatus` (reconcile), polls every **3000ms** while queued/running |
| Double-click | UI disables while `isPending`/`active`; server also blocks second active run. Race before first run reaches queued is theoretically possible but gated by DB insert + active check. |
| Refresh | Does not re-trigger n8n; resumes polling if `initialRun` still active |

Does **not** wait for package generation in the browser — only for run create + n8n webhook + strategy seed.

---

## 3. Batch orchestration

### Real flow (N packages)

```
UI GENERATE CONTENT
→ createProductionRun (queued + N items queued)
→ planContentStrategy / seedProductionStrategyInputs (N strategy items)
→ ONE n8n webhook { production_run_id, package_count }
→ setProductionRunStatus(running)
→ n8n execution (single)
   N2p: load all strategy items for run
   N2b: splitInBatches (notes: batchSize 1, sequential)
   for each strategy item:
      N3 POST /api/n8n/generate-content-package  (own 300s)
      N3b: if ok && packageId → N4 start-video-job
           else → next item (skip video)
      N4 → loop N2b
   done → optional action-run-status if action_run_id present
```

| Question | Answer (evidence) |
| --- | --- |
| Sequential or parallel? | **Sequential** (n8n notes + splitInBatches loop) |
| Simultaneous packages? | **1** generate at a time |
| Own API request per package? | **Yes** (N3 per strategy_item_id) |
| Own n8n execution per package? | **No** — one execution for the batch |
| Own video job per package? | **Yes** if video platforms and persist creates job |
| Own retry counter? | **Yes** — N3 `maxTries: 3` per HTTP node invocation; not shared across packages |

AI planner max default: `PRODUCTION_PLANNER_MAX` or **21** (`lib/production/strategyPlannerConfig.ts`). UI `PACKAGE_COUNT_MAX = 100`.

---

## 4. Complete package call graph

`POST /api/n8n/generate-content-package` → `runGenerateContentPackage`  
(`lib/ai/workflows/generateContentPackage.ts`)

1. `loadExistingPackageData` — idempotent reuse (`reused:true`)
2. `loadProjectOrThrow` / `loadStrategyItemContext` / assets / memory / scene history / series / demo variants / run plan
3. CPU planners: directives, visual profile, **creative candidates (no LLM)**, narrative beats, identity, visual narrative/medium, product reveal, attention
4. `buildGenerateContentPackagePrompt`
5. ★ `generateValidatedJson` #1 — Claude primary (≤3 attempts; optional OpenAI JSON repair on parse/schema)
6. `ensureUniqueHook` — Claude only if duplicate hook
7. `alignHookWithFirstSpoken` (CPU)
8. If candidates + video: `checkConceptFidelity` → optional ★ `generateValidatedJson` #2 fidelity repair (once)
9. `ensureStructuredProductDemo(false)` (CPU)
10. `validateStoryIntegrity` → optional ★ `generateValidatedJson` #3 story repair (once)
11. `validateProductDemonstrationIntegrity` → optional `ensureDemo(true)` (CPU, no LLM)
12. Progression/duration diagnostics (CPU, warn only)
13. `normalizeVisualScenePlan` / image prompts
14. `persistNewPackage`: package INSERT → items INSERT → `buildVideoJobInput` → video_jobs INSERT → asset_usage
15. Return `{ packageId, contentItemIds, videoJobId, reused? }`

Then n8n N4: `start-video-job` → claim queued → `startVideoWorkerJob`.

---

## 5. LLM call inventory

| Call | Provider | Trigger | Full package? | Max per package |
| --- | --- | --- | ---: |
| Primary generate | Claude | Always | Yes | 1 invoke × ≤3 attempts |
| Fidelity repair | Claude | `!checkConceptFidelity.passed` | Yes (full regenerate) | **1** (not looped) |
| Story repair | Claude | `!validateStoryIntegrity.passed` | Yes | **1** |
| Hook dedup | Claude | Duplicate hook vs memory | Hook only | ≤1 path × ≤3 attempts |
| JSON/schema repair | OpenAI | Parse/schema fail inside attempt | Repair only | Up to 1 per failed attempt |
| Guardrail OpenAI repair | OpenAI | Only if `repairGuardrailFailures:true` | — | **Not enabled** on package generate |
| PDI / ensureDemo | — | Fail PDI | Deterministic | 0 LLM |
| Candidates / beats / DNA planners | — | Always | — | 0 LLM |

| Metric | Value |
| --- | --- |
| **Minimum** successful video package | **1** Claude (primary; fidelity passes; no hook dedup) |
| **Common current path** (Fenrik evidence) | **2** Claude (primary + fidelity repair) |
| **Maximum structural** | Primary ≤3 attempts + fidelity ≤3 + story ≤3 + hook ≤3 + OpenAI repairs interleaved ≈ **up to ~12 Claude attempts + OpenAI repairs** in pathological validation failure (not 12 full “happy” regenerations — fidelity/story each fire **once** as separate `generateValidatedJson` calls) |
| Practical “full regenerations” max | **3** (primary + fidelity + story), each with up to 3 internal attempts |

**20 packages:** min **20** Claude; common ~**40** if fidelity repair rate stays high; sequential wall-clock ≈ sum of per-package N3 times.

---

## 6. Fidelity repair behavior

| Question | Answer |
| --- | --- |
| Compared | Selected candidate (`openingSituation`, `hookLine`, `coreIdea`, `productConnection`) vs hook/VO/scene1/visuals |
| Failure | Any reason in `failureReasons` → `passed=false` |
| Reasons | `opening_situation_missing_from_scene1:*`, `hook_not_preserved_in_first_spoken`, `core_idea_not_recognizable`, `product_or_topic_not_implied`, `storyboard_collapsed_to_generic_office`, `voiceover_essay_or_generic_opener`, plus nested opening reasons |
| Warnings trigger repair? | No separate warnings — only `passed` |
| What regenerates | **Full package** via new `generateValidatedJson` + `fidelityRepairAppendix` (failure reasons + winner fields) |
| First output discarded? | Replaced in memory if repair `ok`; not separately archived |
| Second call gets first output? | **No** — gets augmented prompt, not prior JSON |
| Candidate changed? | **No** |
| Re-checked after repair? | Yes |
| Third fidelity regen? | **No** — single repair branch |
| Continue if still `passed=false`? | **Yes** — proceeds to story/PDI (proven: `b4bce30e` finalScriptFidelity.passed=false) |

---

## 7. Story / PDI / visual repair

| Mechanism | Type | LLM? |
| --- | --- | --- |
| Story Integrity | Validate → one full Claude repair → hard fail if still bad | Yes if fail |
| PDI | Validate → deterministic `ensureDemo(true)` → hard fail if still bad | No |
| Visual/story/info progression | Warn only | No |
| Visual Diversity | Prompt text only | No |
| Asset guardrails | In schema/guardrails of generateValidatedJson | Fail → regenerate attempt (not OpenAI guardrail repair) |
| Hook align | Deterministic string align | No |

**Possible chain:** primary → fidelity repair → story repair → (within each) JSON OpenAI repair + up to 3 attempts → hook dedup.  
PDI does not add Claude.

---

## 8–9. Persistence timeline & transaction boundaries

Order in `persistNewPackage` (separate PostgREST commits — **not** one SQL transaction):

1. INSERT `content_packages` (or unique violation → return existing)
2. INSERT `content_items`
3. If video platforms: `buildVideoJobInput` then INSERT `video_jobs`
4. `recordAssetUsage`
5. On video/asset failure: `rollbackPersistedPackage` (delete jobs/usage/items/package)

| Failure point | Committed | Missing | Retry / reuse |
| --- | --- | --- | --- |
| Kill before any insert | nothing | all | Safe retry |
| After package, before items | package orphan | items/job | Unique on strategy_item; retry may unique-violate → reuse incomplete |
| After items, before video job | package+items | **video job** | **reuse returns videoJobId:""** → N4 text_only |
| After video job | full | — | N4 can start |
| Process kill during rollback | undefined partial | — | Manual |

Unique: `uniq_content_packages_strategy_item` (one package per strategy item).

---

## 10. Idempotency and reuse

- Detect: oldest `content_packages` by `strategy_item_id`
- `reused:true` from `loadExistingPackageData`
- Loads content item ids; `videoJobId` = latest job or `""`
- **Does not** verify video-required ⇒ job exists
- **Does not** heal missing jobs
- Dangerous: video-required + `reused:true` + empty `videoJobId` → false text-only success (production `146b3533`)

---

## 11. n8n workflow (`NAKo5V3Ctlq5aW4i`)

| Node | Role | Retry | Continue on fail |
| --- | --- | --- | --- |
| N1 Webhook | Start | — | — |
| N1b | production_run_id? | — | — |
| N2p | Load strategy items for run | — | — |
| N2b | Loop packages sequentially | — | — |
| N3 Generate | Per-item API | **maxTries 3**, 2s | **continueRegularOutput** |
| N3b | `ok && data.packageId` | — | false → skip N4, next item |
| N4 Start Video | start-video-job | maxTries 3 | continue |
| Error Trigger | workflow crash → error-callback | — | — |

N3 retry = **current package only**, not whole batch.  
Completed packages earlier in the loop are **not** re-executed.  
`no_video_job` / `text_only` is **2xx success** — workflow continues.

---

## 12. Video job lifecycle

- One shared job per package, linked to primary **video** platform content item (`persistNewPackage`)
- Insert status `queued` → N4 claims `processing` → worker → callback `completed`/`failed`
- No job → N4 returns 202 text_only
- Cancel: open jobs failed + worker notify; late completed rejected if cancelled (`lib/n8n/handlers.ts`)

---

## 13. Worker lifecycle (summary)

Pickup → storyboard/images/PRODUCT_DEMO/voice/subs/FFmpeg/upload → callback.  
Failures → job `failed` + reconcile item failed (“Renderování videa selhalo.”).  
Cancel guard prevents revive. Scene-level partial restart is editor/retry paths, not the main production loop.

---

## 14. Settlement logic

`reconcileFromRealContent` (`production-run-admin.ts`):

- Package status from video jobs on its items: any failed → failed; **else if jobs.length === 0 OR all completed → completed**; else running
- **Text-only assumption for zero jobs applies even to video run items**
- Run `completed` when `open <= 0` (all slots terminal), **even if some failed**
- `generated_total` = packages with status completed (includes false video completes)
- UI polls reconcile every 3s

---

## 15. Error matrix (condensed)

| Class | Example | Blocks other packages? | Retry | False completed? | Extra Claude cost? |
| --- | --- | --- | --- | --- | --- |
| UI double-click | Second start | N/A | Rejected if active | No | No |
| Active run exists | Start blocked | — | — | No | No |
| generation_failed | Story/PDI hard fail | **No** (n8n continues) | N3 ≤3; settlement marks item failed | No | Possible on retries |
| Fidelity fail | Repair once, may continue failed | No | 1 full regen | No | **Yes +1** |
| 300s kill after items | Orphan package no job | Delays next only | Reuse empty job | **Yes** | Duplicate gen if retry regenerates then unique-hits |
| Unique reuse incomplete | reused no job | No | N4 no-op | **Yes** | Wasted first attempt |
| Worker render fail | Job failed | No | Manual/retry job | Item failed | No (gen already paid) |
| Operator cancel | Run cancelled | Stops new work | — | Guarded | In-flight may finish unpaid work until cancel lands |
| Stale run no packages | 12min fail message | — | New run | No | — |

---

## 16. Twenty-package simulation (current code)

Assumptions: sequential N2b; N3 continue on fail; reconcile as implemented.

| Package | Event | Effect on others |
| --- | --- | --- |
| 1–5 | Success + video | Next starts after each finishes |
| 6 | Fidelity repair (+~second Claude) | **Delays** 7–20 start; does not cancel them |
| 7 | Provider/timeout fail, no package | Item failed via settlement if generation_failed; loop **continues** to 8 |
| 8 | Success | Continues |
| 9 | Package+items, **no video job** | N4 `no_video_job`; later reconcile may mark **completed** falsely |
| 10–20 | Still pending until loop reaches them | Start after prior items finish |

- Whole n8n execution: **succeeds** if webhook path completes (continue-on-fail).
- Run status: can become **`completed`** with mix of real videos + false completes + failed slots (`failed_total` > 0 still allowed with `status=completed` when open=0).
- User sees progress via poll; refresh reloads reconcile.
- Independent repair: regenerate/retry **per strategy item**; completed packages not re-looped in same execution. New run creates new strategy items (new packages). Accidental regen of old package only if same strategy_item_id reused.

**Claude count:** min 20; if ~most hit fidelity (recent Fenrik pattern) ~35–40; worst case with story repairs much higher but still sequential.

---

## 17. Real production examples (Fenrik.chat)

| Run | Pattern | First invalid / note | Others |
| --- | --- | --- | --- |
| `2f896bec-…` | Success + fidelity repair | Normal video complete | Single-package run |
| `146b3533-…` | Missing video job | Package+items, no job; run **completed** | Single-package |
| `3c58a5f3-…` | Asset guardrail then success | Stale error cleared later; video completed | Single |
| `c0a4cda3` pkg / run `73841d6b` | Story repair in regenReason | N3 very long | Single |
| `bb80c606-…` | Operator cancel 14 pkgs | `cancelled`, failed_total 14 | Batch stop |
| `328a9a04-…` | Cancel mid-batch | generated 11, failed 3, cancelled | Partial keep |
| `67beba94-…` | Stale / no packages | failed, Czech pipeline message | — |
| `9e697a2f-…` (other project) | 21 packages completed | Multi-package sequential evidence | Batch works |

---

## 18. Invariants

| Invariant | Status |
| --- | --- |
| Video-required package must have video job | **NOT ENFORCED** (reuse/timeout) |
| Completed video item ⇒ completed video output | **NOT ENFORCED** (`jobs.length===0` ⇒ completed) |
| Cancelled job never becomes completed | **ENFORCED** (callback guard) |
| Retry must not duplicate package for same strategy item | **ENFORCED** (unique index) |
| One failed package must not invalidate unrelated completed packages | **ENFORCED** (continue loop; completed not overwritten by generation_failed) |
| Run completed ⇒ all requested videos exist | **NOT ENFORCED** |
| `reused` path must heal missing video job | **NOT ENFORCED** |

---

## 19. Silent failure risks

1. **Video-required + no job + reconcile completed** (proven)
2. **N4 `text_only` inferred from missing job**, not from config
3. **Fidelity `passed=false` after repair** still persists package
4. **Run `completed` with `failed_total > 0`** (partial) looks “Hotovo”
5. **Package stays `draft`** even when video failed (by design — no package failed status)

---

## 20. Final answers

1. **Package isolation:** Partially — failure/settlement is per item; **time is not isolated** (sequential).
2. **One failure stop others?** Does **not stop**; **does delay** remaining.
3. **Retry regenerate successes?** Same n8n execution: no. New run: new strategy items. Same strategy_item retry: reuses package (may skip work).
4. **Multiple full Claude calls?** Yes — commonly 2; up to 3 full regenerations (+ internal attempts).
5. **Real maximum full gens:** 3 labeled regenerations (primary/fidelity/story), each ≤3 attempts.
6. **Completed without video?** **Yes** (proven).
7. **Run completed with missing outputs?** **Yes**.
8. **Safely recoverable:** generation_failed with no package; cancelled; worker failed with job row (retry job).
9. **Manual intervention:** orphan package without job; false completed video slots; stuck if n8n dies mid-loop without stale handler firing.
10. **Extra cost:** fidelity/story repairs; N3 HTTP retries after partial persist; duplicate Claude when timeout after AI before unique reuse.

---

## 21. Confidence & missing evidence

| Area | Confidence |
| --- | --- |
| UI → run → n8n sequential loop | **HIGH** |
| LLM call structure / fidelity once | **HIGH** |
| False complete without video | **HIGH** (DB+n8n) |
| Exact splitInBatches numeric batchSize in live n8n | **HIGH via notes**; options `{}` defaults to 1 in n8n v3 |
| Per-Claude ms/tokens | **NONE** (no telemetry) |
| Worker internal scene retries | **MEDIUM** (not fully expanded here; main path is full job fail) |

---

_End of report._
