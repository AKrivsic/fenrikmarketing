# Execution Flow Map

Evidence-traced production flows. Entry points and call chains only — not inferred from filenames.

---

## End-to-end (initial production run)

```
UI ContentProductionPanel
  → startProductionRun (app/projects/[id]/production/actions.ts:164)
  → createProductionRun (lib/api/production-run-admin.ts)  [runs+items queued]
  → prepareProductionStrategyInputs (actions.ts:90)
       ├─ AI: planContentStrategy(mode=production_run)
       └─ or legacy seedProductionStrategyInputs
  → sendN8nWebhook(generate_content_package) (lib/n8n/client.ts)
  → setProductionRunStatus(running)
  → n8n generate-content-package-bridge.json
       Loop (splitInBatches size=1) over strategy items stamped with production_run_id
         → POST content-package-worker|/api/n8n/generate-content-package
              → handleGenerateContentPackageRequest
              → runGenerateContentPackage → persistNewPackage
         → POST /api/n8n/start-video-job → video-worker
         → POST /api/n8n/video-callback → handleVideoCallback
              → reconcileProductionRunForContentItem
  → UI poll getProductionRunStatus → reconcileProductionRun
```

One package failure does **not** abort the n8n loop. Run becomes `completed` when open slots = 0 (successes + failures), or `failed` on trigger/stale/zero-success paths.

---

## 1. Initial package generation

| Stage | Detail |
|-------|--------|
| **Entry** | `handleGenerateContentPackageRequest` (`lib/n8n/handleGenerateContentPackageRequest.ts:38`) via worker or Vercel route |
| **Input** | `project_id`, `strategy_item_id`, optional `week_start`, `generationMode` |
| **DB reads** | Project, strategy item, assets, memory, series, run plan; existing package by strategy_item_id |
| **External** | Anthropic (Creative Engine + Presentation + optional fidelity/story repairs + hook); OpenAI (JSON repair); later video path separate |
| **DB writes** | On success: `content_packages` (draft), `content_items` (draft + `generation_metadata.production_run_id`), optional `video_jobs` (queued). On fail: settle run item → failed |
| **States** | Package → `draft`; video job → `queued`; run item settled later via reconcile |
| **Guards** | Cancel skip (`isProductionRunCancelledForStrategyItem`); package unique on `strategy_item_id`; schema + `makePackageGuardrails`; fidelity/story/PDI hard fails |
| **Retry** | `generateValidatedJson` maxAttempts=3; CE nested attempts; n8n HTTP maxTries=3; **no** same-item business retry in n8n loop |
| **Failure** | Terminal → `settleProductionRunItemOrThrow`; n8n continues next item |
| **Next** | n8n `start-video-job` if package has/needs video |

### Generation internals (ordered)

1. Idempotent pre-check `loadExistingPackageData` (`generateContentPackage.ts:243`)
2. Load context / run plan
3. Creative Engine v3 `planCreativeEngineV3ForPackage` (directions → eval → ideation → critic → DNA)
4. Presentation `generateValidatedJson` (Claude transport max 1)
5. Hook uniqueness `ensureUniqueHook`
6. Concept fidelity: ≤1 material LLM repair then hard fail (~859–1004)
7. Story integrity: ≤1 LLM repair then hard fail (~1081–1194)
8. Product demonstration integrity: **hard fail, no LLM repair wired** (~1211–1264) despite comment claiming force-inject
9. Soft progression / DNA warns
10. `persistNewPackage` (~1890)

---

## 2. Package repair (in-generation)

Not a separate job type. Repair is inline inside generation/regeneration:

| Repair | Cap | Paid? | On final fail |
|--------|-----|-------|---------------|
| JSON parse/schema | Inside each `generateValidatedJson` attempt; OpenAI repair provider | Yes (OpenAI) | Count toward maxAttempts=3 then `generation_failed` |
| Guardrail regenerate | Same loop (package path: `repairGuardrailFailures` not enabled → regenerate not shape-repair) | Yes (Claude) | Package fail |
| Concept fidelity | 1 material full-package LLM repair | Yes | Package fail / settle item |
| Story integrity | 1 LLM repair | Yes | Package fail |
| Product demo | **None wired** | N/A | Immediate package fail after CE+Presentation paid |

Regenerate entry: `runRegenerateContentPackage` (`lib/ai/workflows/regenerateContentPackage.ts`) — same fidelity/story/PDI pattern; updates package in place; **inserts new video_jobs row**.

---

## 3. Video generation

| Stage | Detail |
|-------|--------|
| **Entry** | `POST /api/n8n/start-video-job` (`app/api/n8n/start-video-job/route.ts:32`) |
| **Input** | `project_id`, `content_package_id` |
| **DB reads** | Package items, video job, production run cancel flag |
| **DB writes** | Claim `queued`→`processing` (or stale processing re-claim); release to `queued` on dispatch fail |
| **External** | `startVideoWorkerJob` → video-worker: TTS (OpenAI), images (OpenAI), Whisper, FFmpeg, storage upload, callback |
| **States** | `queued` → `processing` → `completed` \| `failed` |
| **Guards** | Terminal idempotent return; cancel fail+skip; claim WHERE status; callback WHERE status=processing |
| **Retry** | n8n maxTries on start; TTS tail ≤3; image moderation 1 safe retry; no automatic full re-render on fail |
| **Failure** | Job `failed`; package status unchanged (no `failed` package enum); reconcile marks run item failed |
| **Next** | `handleVideoCallback` → reconcile |

Worker checkpoints: `assertVideoJobStillActive` in `video-worker/jobRunner.ts` (cancel / DB status).

---

## 4. Scene regeneration

| Path | Entry | Notes |
|------|-------|-------|
| Single scene image | `regenerateSceneImageInEditor` (`videoSceneEditor.ts`) → worker HTTP | Sync; **not** a `video_jobs` row; `assertNoActiveRender` check-then-act |
| Full re-render from editor | `sceneEditorRerender` / `rerenderVideoFromSceneEditor` | New `video_jobs` queued + claim/dispatch |
| Failed-job editor | `failedVideoJobEditor.ts` | Blocks operator-cancelled jobs |

No operator Stop scoped to a single scene regen.

---

## 5. Language / translation variant

| Stage | Detail |
|-------|--------|
| **Enqueue** | `enqueuePackageTranslations` (`lib/ai/workflows/translationJobs.ts`) — unique `(source_content_item_id, language)` |
| **Process** | `POST /api/ai/process-translation-jobs` → `drainTranslationJobs` |
| **Claim** | Optimistic `pending`→`processing`; stale reclaim default 15 min |
| **Variant content** | `generateLanguageVariants.ts` — metadata `source: language_variant`; **does not stamp `production_run_id`** (~393) |
| **Variant video** | RPC `insert_variant_video_job_if_slot_available` (`021_variant_video_slot.sql`) + `claimAndDispatchVariantVideoJob` |
| **Cancel** | **Not** covered by `cancelOpenVideoJobsForProductionRun` (lookup requires `generation_metadata->>production_run_id`) |

---

## 6. Operator Stop / cancellation

| Stage | Detail |
|-------|--------|
| **Entry** | UI → `stopProductionRun` (`actions.ts:261`) |
| **Actions** | `cancelProductionRun` then `cancelAllActiveProductionRuns` |
| **Sequence** (`production-run-admin.ts:413`) | Reconcile → fail open video jobs (`queued`/`processing`) with `"Zastaveno operátorem."` → fail open run items → set run `cancelled` → notify worker `/cancel` → reconcile |
| **Prevents** | New package gen for cancelled strategy items; new video claim/dispatch; late completed callback revive (app + trigger 023); manual retry of cancelled jobs |
| **Does not prevent** | In-flight Claude package generation already past cancel check; completed jobs/packages; translation queue; unstamped language-variant video jobs; mid-checkpoint TTS/image spend before next assert |

---

## 7. Retry / resume / recovery

| Mechanism | Trigger | Behavior |
|-----------|---------|----------|
| n8n HTTP retry | 5xx/network | maxTries 3 (generate) / 5 (some nodes); package pre-check + unique index |
| Video start idempotent | Duplicate delivery | Terminal/processing non-stale → 202 no-op |
| Stale video reclaim | `processing` older than `VIDEO_JOB_STALE_MINUTES` (default 30) | Re-claim + re-dispatch |
| Stale production run | Running/queued, **zero packages**, age ≥12 min, strategy items exist | Run → `failed` |
| Translation stale | processing older than 15 min | Reclaim |
| Manual video retry | `retryVideoJob` | Blocked if operator-cancelled; active-job guard |
| Package regenerate | User action | New AI + new video job row; no active-job guard |
| Heal missing video job | Existing package, no job | Insert queued job without Claude |

**No** automatic resume of a cancelled run. New run allowed after cancel (`productionRunStatusBlocksNewRun` only blocks queued/running).

---

## 8. Worker callback completion

### Video (`handleVideoCallback`, `lib/n8n/handlers.ts:223`)

1. Validate payload / resolve job
2. If completed + (run cancelled OR job already operator-failed) → force effective status `failed`
3. UPDATE only if `status = processing`
4. On accepted completed → package `draft`
5. `reconcileProductionRunForContentItem`

### Package (`handleContentPackageCallback`, `handlers.ts:171`)

Unconditional status/brief update — **no** terminal or cancel guard. Main generate path persists inline; callback is secondary confirmation path.

---

## Key file index

| Role | Path |
|------|------|
| Start/stop UI actions | `app/projects/[id]/production/actions.ts` |
| Run admin / reconcile / cancel | `lib/api/production-run-admin.ts` |
| Cancel helpers | `lib/api/production-run-cancel.ts` |
| Package handler | `lib/n8n/handleGenerateContentPackageRequest.ts` |
| Generate workflow | `lib/ai/workflows/generateContentPackage.ts` |
| Regenerate | `lib/ai/workflows/regenerateContentPackage.ts` |
| Repair loop | `lib/ai/runWithRepair.ts` |
| Callbacks | `lib/n8n/handlers.ts` |
| Start video | `app/api/n8n/start-video-job/route.ts` |
| Video worker | `video-worker/jobRunner.ts`, `cancellation.ts`, `queue.ts` |
| n8n bridge | `n8n/generate-content-package-bridge.json` |
| Cancel revive trigger | `supabase/migrations/023_prevent_cancelled_video_job_revive.sql` |
| Variant slot | `supabase/migrations/021_variant_video_slot.sql` |
| Package unique | `supabase/migrations/013_content_package_idempotence.sql` |
