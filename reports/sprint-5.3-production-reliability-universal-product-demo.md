# Sprint 5.3 — Production Reliability & Universal Product Demonstration (P0 only)

**Date:** 2026-07-19  
**Scope:** P0 only — terminal settlement + universal PRODUCT_DEMO architecture  
**Non-goals:** P1–P3 audit items; new renderers; weakening SI / Render Fidelity / Product Demo fidelity

---

## 1. Files changed

| File | Change |
| --- | --- |
| `lib/ai/workflows/generationTerminal.ts` | **New** — classify throws → terminal error codes |
| `lib/ai/workflows/shared.ts` | `WorkflowResult.error` widened to terminal codes |
| `lib/ai/workflows/generateContentPackage.ts` | Catch throws → terminal failure; rollback package if video job create fails |
| `lib/ai/workflows/regenerateContentPackage.ts` | Same throw → terminal failure wrapper |
| `app/api/n8n/generate-content-package/route.ts` | Settle on `!ok` and on post-start throws; never 500 with live item |
| `lib/api/production-run-admin.ts` | Idempotent settle; never overwrite `completed` |
| `lib/scene-types/product-demo/ensureStructuredProductDemo.ts` | No Fenrik/chat fabricate; complete existing beats only |
| `lib/scene-types/product-demo/productDemoBeat.ts` | Universal semantic comments |
| `lib/creative-candidates/storyIntegrity.ts` | Demo wording → input → value → outcome (checks unchanged) |
| `lib/creative-candidates/productDemonstrationIntegrity.ts` | Universal contract in prompts/repair text |
| `scripts/check-generation-failed-settlement.ts` | Sprint 5.3 settlement + architecture regression |
| `scripts/check-product-demo-structured.ts` | No-fabricate / complete-existing tests |
| `scripts/check-product-demo-variation.ts` | Variant assign on existing beat |

---

## 2. Terminal-state guarantees added

Every generation attempt after preconditions ends as exactly one of:

| Outcome | `error` code | Item status |
| --- | --- | --- |
| Success | — | completed (via normal reconcile) |
| Soft content failure | `generation_failed` | failed |
| Render / PRODUCT_DEMO fidelity | `render_product_demo_failed` | failed |
| Other render fidelity | `render_failed` | failed |
| Unexpected / DB / runtime | `operational_failure` | failed |

HTTP for settleable failures: **422** with `{ ok: false, error, validation_errors, attempts }` — not 500 with a live item.

---

## 3. Throw paths now settled

| Path | Before | After |
| --- | --- | --- |
| `normalizeVisualScenePlan` / `RenderProductDemoFailedError` | 500, item may stay queued | Classified → settle → 422 |
| `assertRenderFidelity` / `analyzePresentation` | Same | Same fix |
| `buildVideoJobInput` after package insert | Orphan package + unsettle | **Rollback** package/items/jobs → throw → settle |
| Unexpected runtime in generate/regenerate | 500 unsettle | `operational_failure` + settle |
| Soft SI/PDI / guardrail `generation_failed` | Already settled | Unchanged |

Wrapper: `runGenerateContentPackage` / `runRegenerateContentPackage` catch non-`WorkflowError` throws via `classifyGenerationThrow`.  
Route belt-and-suspenders: if anything still throws after `generationBegan`, settle then `workflowResponse(failure)`.

---

## 4. State-transition changes

```
generation began
  → ok:true  → package + video_job queued (unchanged)
  → ok:false → markProductionRunItemGenerationFailed (idempotent)
              → production_run_item.status = failed
              → content_package_id = null
              → settleProductionRunAfterItemFailure (run completed|running)

persist package+items → job input/create fails
  → rollbackPersistedPackage (delete package, items, any jobs)
  → operational_failure | render_* via classify
  → item failed, run settles
  → no orphan package
```

Completed items are never overwritten. Failed items may re-settle (idempotent).

---

## 5. PRODUCT_DEMO architectural changes

- **Semantic contract:** input → product/service creates value → visible outcome (prompts, SI/PDI messages, comments).
- **`ensureStructuredProductDemo`:** completes/places an **existing** beat only; returns `product_demonstration_not_fabricated` when none exists.
- **Force repair** no longer invents Fenrik.chat booking Q&A for unknown products.
- Schema field names (`visitor_question`, `ai_answer`, …) retained as the **chat execution** of the universal contract (no new renderer).

---

## 6. Compatibility with existing chat renderer

- `composeProductDemoRaster` / chat SVG / worker prepare path unchanged.
- `buildDefaultProductDemoBeat` unchanged for Fenrik fixtures and LLM-authored beats.
- Packages that already include a valid PRODUCT_DEMO beat render identically.
- Render Fidelity still fail-closes PRODUCT_DEMO → IMAGE.

---

## 7. Regression tests

```bash
npm run check:generation-failed-settlement
npm run check:product-demo-structured
npm run check:product-demo-variation
npm run check:render-fidelity
npm run check:story-integrity
npm run check:product-demonstration-integrity
```

All passed in this sprint.

Covered:

- Thrown `RenderProductDemoFailedError` → terminal code + settle wiring  
- Unexpected runtime → `operational_failure`  
- Persist + job-create failure → rollback (source + behavior contract)  
- No chatbot fabricate without existing beat  
- Fenrik chat raster / compile / fidelity still pass  
- SI hard rules still hard-fail missing demo / broken world; CTA still soft  

---

## 8. Confirmation

| Guarantee | Status |
| --- | --- |
| Story Integrity hard gates | **Unchanged** (wording only for demo semantics) |
| Render Fidelity | **Unchanged** |
| Fenrik.chat chat PRODUCT_DEMO rendering | **Unchanged** when beat is authored |
| No silent PRODUCT_DEMO → IMAGE | **Unchanged** |
| No Fenrik fabricate for unrelated products | **Enforced** |
| No zombie queued item on generation throws | **Enforced** |

---

*End of Sprint 5.3 report.*
