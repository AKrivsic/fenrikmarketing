# Release Readiness Audit — Pre-Production Verification

**Date:** 2026-07-19  
**Scope:** Release candidate after Sprint 5 – 5.3  
**Method:** Code verification only (not sprint reports)  
**Verdict:** **GO WITH KNOWN RISKS**

---

## 1. Executive summary

The release candidate implements the intended Sprint 5–5.3 behaviors on the **primary production path** (generate package → persist → video job → worker → callback → reconcile):

- Story Integrity hard gates + CTA soft (5.2) — verified in code and tests  
- Product Demonstration Integrity + no Fenrik fabricate (5.3) — verified  
- Render Fidelity fail-closed for canonical video — verified  
- Terminal settlement for generation throws / `!ok` — verified  
- Duplicate package / cancel / late-callback guards — verified  

No **P0 that will likely break Fenrik primary production** was found.

Known risks that prevent a clean **GO** are secondary paths and rare infrastructure edge cases (language-variant PRODUCT_DEMO→IMAGE, settle swallow on DB failure, post-job `recordAssetUsage` throw, failed-callback zombie until stale reclaim). Accept them for this release or fix first.

---

## 2. Verification of Sprint 5–5.3 implementation

| Feature | Verdict | Evidence |
| --- | --- | --- |
| **Story Integrity hard gates** | ✓ Correct | `lib/creative-candidates/storyIntegrity.ts`: hard codes set `passed=false`; workflow returns `generation_failed` after one repair (`generateContentPackage.ts` ~718–750) |
| **CTA soft (5.2)** | ✓ Correct | `STORY_INTEGRITY_SOFT_CODES = {"cta_mismatch"}`; warnings only; `check:story-integrity` Sprint 5.2 cases pass |
| **Product Demonstration Integrity** | ✓ Correct | Structured beat required; all PDI codes hard; force repair after soft ensure (`validateProductDemonstrationIntegrity`) |
| **No chat fabricate (5.3)** | ✓ Correct | `ensureStructuredProductDemo` returns `PRODUCT_DEMO_NOT_FABRICATED` when no existing beat; `buildProductDemoFromWinner` throws if called without existing |
| **Universal semantics (5.3)** | ✓ Correct (architecture) | Prompts/messages use input → value → outcome; chat field names retained as execution form |
| **Render Fidelity (canonical)** | ✓ Correct | `normalizeVisualScenePlan` throws on invalid PRODUCT_DEMO; `analyzePresentation` fail-closed; `assertRenderFidelity` in prepare + compile |
| **Product Demo Variation (5.1)** | ✓ Correct | `demoVariant.ts` + ensure assigns variant on existing beat; raster stays PRODUCT_DEMO |
| **Terminal settlement (5.3)** | ✓ Correct (primary) | `classifyGenerationThrow` + wrapper + n8n `settleSafely` on `!ok` and post-`generationBegan` catch; rollback on job-create fail |
| **Stale comment “inject PRODUCT_DEMO”** | ✗ Minor drift | Comment at `generateContentPackage.ts` ~613 still says inject; behavior no longer fabricates — docs only |

---

## 3. Terminal-state verification

### Primary generation paths

| Path | Terminal | Evidence |
| --- | --- | --- |
| Success | Package + `video_jobs.queued` → worker → callback → reconcile | `persistNewPackage` + start-video + `handleVideoCallback` |
| Soft content fail | `generation_failed` → item `failed` | SI/PDI/`generateValidatedJson` → `!ok` → `settleSafely` |
| Render PRODUCT_DEMO fail | `render_product_demo_failed` | `RenderProductDemoFailedError` → `classifyGenerationThrow` → settle |
| Other fidelity | `render_failed` | diagnostics `code === "render_fidelity_failed"` |
| Unexpected throw | `operational_failure` | wrapper + route catch after `generationBegan` |
| Cancelled (pre-gen) | skip success | `isProductionRunCancelledForStrategyItem` → no generation |
| Cancelled (in-flight video) | job `failed` cancel msg; late completed rejected | `handlers.ts` `rejectCompleted`; start-video cancel skip |

### Gaps (not clean forever-terminal under all conditions)

| Gap | Live state risk | Severity |
| --- | --- | --- |
| `settleSafely` swallows mark errors | Item can remain `queued`/`running` while API returns 422 | P1 (requires settle DB failure) |
| Failed video callback also fails | Job can remain `processing` until stale reclaim (~30 min) | P1 (pre-existing) |
| Stale production run fail only if **zero** packages | Partial stuck slots with some packages already generated rely on per-item settle | P2 if settle works; P1 if settle failed |
| `recordAssetUsage` throw after video job insert | Package + job exist; throw → `operational_failure` + settle clears item `content_package_id` → orphan package/job | P1 rare |

**No uncaught throw on the n8n generate path after `generationBegan` that returns 500 without attempting settle** — dual catch (workflow wrapper + route) covers this.

Missing await / fire-and-forget: settle uses `await settleSafely`. Rollback uses `await`. Worker failed callback is awaited inside try.

---

## 4. Database consistency verification

| Concern | Status | Notes |
| --- | --- | --- |
| Duplicate packages | Protected | Unique `strategy_item_id` + idempotent load + 23505 → return existing |
| Duplicate video jobs on concurrent gen | Mitigated | Unique package race returns existing before second items/job |
| Orphan on job-create fail | Mitigated | `rollbackPersistedPackage` deletes package/items/jobs/asset_usage |
| Rollback best-effort | Risk | Rollback errors only logged → possible orphan if delete fails |
| Orphan after `recordAssetUsage` fail | Risk | See §3 |
| Idempotent settle | Yes | Skips `completed`; re-applies `failed`; `.neq("status","completed")` |
| Transaction boundaries | Soft | Not a single DB transaction; compensate via rollback + settle |
| Item ↔ package ↔ video | OK on happy path | Reconcile pairs by package order; video via content_item |
| Wrong-slot settle | Edge | Falls back to first queued/running if `package_index` missing — concurrency risk |

---

## 5. Render Fidelity verification (canonical video)

Confirmed chain for **primary** package video:

| Stage | Behavior |
| --- | --- |
| Plan / LLM | PRODUCT_DEMO typed scene + beat |
| Normalize | Preserves PRODUCT_DEMO; invalid payload → throw |
| Frequency / non-demo typed | May → IMAGE (not PRODUCT_DEMO) |
| Prepare / analyze | PRODUCT_DEMO ineligible → **throw**, not IMAGE |
| Cap | Drops IMAGE before PRODUCT_DEMO |
| Compile + assert | planned type === worker type |
| Worker raster | PRODUCT_DEMO → chat raster; invalid → throw → failed callback |

**Silent PRODUCT_DEMO → IMAGE on primary path:** not found.

**Exception — language variants:** `lib/scene-types/languageVariantScenes.ts` includes `PRODUCT_DEMO` in the set that is **downgraded to IMAGE** with a warning (payload not localized). This contradicts the absolute “never silently downgrade PRODUCT_DEMO” rule for localized renders. Primary Fenrik video is unaffected; multi-language is.

---

## 6. Product Demonstration verification

| Check | Result |
| --- | --- |
| Fenrik chat renderer unchanged | ✓ `composeProductDemoRaster` / worker prepare still chat SVG |
| Prompts still require structured demo | ✓ PDI + SI prompt blocks |
| Validators enforce product truth | ✓ structured beat + landing-page ban + floating icon ban |
| Repair never fabricates chat | ✓ no beat → `product_demonstration_not_fabricated` |
| Architecture not “demo = chat only” | ✓ universal wording; chat = current execution |
| Fenrik still works when LLM emits beat | ✓ complete existing beat + raster tests pass |

**Release implication:** packages that omit PRODUCT_DEMO now fail closed instead of getting a fabricated Fenrik booking chat. Expected; may raise `generation_failed` rate slightly until the model consistently emits the beat.

---

## 7. Story Integrity verification

| Check | Result |
| --- | --- |
| World / actor / continuity / product demo hard | ✓ Soft set is only `cta_mismatch` |
| CTA mismatch warning only | ✓ Sprint 5.2 tests pass |
| Regression from 5.3 wording | ✓ Codes unchanged; messages updated only |
| Hard fail still → `generation_failed` + settle | ✓ |

---

## 8. Operational robustness verification

| Scenario | Behavior |
| --- | --- |
| Late completed after cancel | Rejected; job stays failed |
| Duplicate video callback | Update only if `status=processing` → later no-op |
| Duplicate generation request | Idempotent existing package return |
| Retry after generation_failed | Item already failed; settle idempotent |
| Operator stop | Cancels open jobs; rejects late completed |
| Start video after gen fail | Bridge skips (`ok !== true`) |
| Cancelled run before gen | Skipped success; no settle needed |
| Double persistence | Unique index + race handler |

---

## 9. Test coverage verification

| Critical behavior | Coverage | Gap? |
| --- | --- | --- |
| Generation settlement + classify throw | `check:generation-failed-settlement` | No live DB integration test for settle failure |
| Render Fidelity | `check:render-fidelity` | Language-variant PRODUCT_DEMO not covered as fail-closed |
| Story Integrity + CTA soft | `check:story-integrity` | OK |
| Product Demonstration | `check:product-demonstration-integrity` | OK |
| Structured + no fabricate | `check:product-demo-structured` | OK |
| Variation | `check:product-demo-variation` | OK |
| Creative Candidates | `check:creative-candidates` | OK |
| Production stop / cancel | `check:production-run-stop` | OK |
| Rollback after job fail | Source assertion only | No integration test |
| Failed callback → reclaim | Not automated end-to-end | Known ops path |

**Critical uncovered:** language-variant PRODUCT_DEMO downgrade; settleSafely failure path; rollback failure path; `recordAssetUsage` post-job throw.

---

## 10. P0–P3 findings

### P0 — must fix before deploy

**None that will likely break Fenrik primary production.**

### P1 — should fix before deploy (or accept explicitly)

1. **Language variant silently downgrades PRODUCT_DEMO → IMAGE**  
   - File: `lib/scene-types/languageVariantScenes.ts`  
   - Impact: localized videos lose Product Demonstration fidelity  
   - Accept if multi-language is out of scope for this release  

2. **`settleSafely` swallows settlement errors**  
   - File: n8n generate route  
   - Impact: rare DB failure → item stays queued while client sees failure  

3. **`recordAssetUsage` failure after video job created**  
   - File: `generateContentPackage.ts`  
   - Impact: orphan package + job while item marked failed  

4. **Failed video callback failure leaves `processing` until stale reclaim**  
   - Pre-existing; ~30 min `VIDEO_JOB_STALE_MINUTES`  

### P2 — ship and observe

5. Higher `generation_failed` if LLM omits PRODUCT_DEMO (no fabricate safety net)  
6. Stale run kill only when zero packages  
7. `package_index` fallback to first open item under concurrency  
8. Stale comment about “inject PRODUCT_DEMO”  

### P3 — nice-to-have

9. Integration tests for rollback / settle failure  
10. Package status still has no `failed` value (video fail → draft + item failed)  

---

## 11. GO / GO WITH KNOWN RISKS / NO-GO

# GO WITH KNOWN RISKS

**Safe to deploy for Fenrik primary (canonical-language) production runs**, provided operators accept:

1. Multi-language / language-variant videos may still silently render PRODUCT_DEMO as IMAGE (known Render Fidelity hole outside the primary path).  
2. If production-run settlement itself fails (DB), an item may remain queued until manual Stop / reconcile / stale handling.  
3. Extremely rare: asset_usage insert failure after video job create can leave an orphan package/job.  
4. Video jobs whose failed callback never lands stay `processing` until ~30 minute reclaim.  
5. Slightly higher package `generation_failed` rate is possible now that chat demos are not fabricated when missing.

**Do not treat as a clean GO** while (1) remains if multi-language is in scope for this same release.

**Would become NO-GO if:** multi-language PRODUCT_DEMO fidelity is a release requirement, or settle-on-failure must be absolutely guaranteed under DB outages without operator intervention.

---

*Audit complete. No code changes made.*
