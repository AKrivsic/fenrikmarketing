# Asset Guardrail Contract Fix

**Status:** COMPLETE  
**Root cause report:** `reports/asset-undefined-production-failure-root-cause.md`  
**Classification addressed:** PATCH EXPOSED LATENT BUG

---

## 1. Files changed

| File | Change |
| --- | --- |
| `lib/content-package/visualScenePlan.ts` | Canonical `resolveImageOrLegacySceneSource`; rewrite `validateVisualScenePlanGuardrails` |
| `lib/ai/workflows/packageShared.ts` | Reject empty `asset_usage[].asset_id` before lookup (no `undefined` interpolation) |
| `lib/api/production-run-admin.ts` | `shouldClearSupersededProductionRunError` + clear stale `error_message` on successful complete |
| `scripts/check-visual-scene-plan.ts` | Regression tests for typed/legacy IMAGE + asset cases |
| `scripts/check-production-run.ts` | Stale-error hygiene unit checks |

**Untouched:** Prompt Builder, PRODUCT_DEMO, renderer, render fidelity, Story Integrity, DNA, Identity, PDI validators.

---

## 2. Exact contract change

**Before:** Guardrail skipped only `scene.source === "ai"` (root). Typed `{ type: "IMAGE", payload: { source: "ai", … } }` fell through to `classById.get(scene.asset_id)` → `` `asset ${undefined} not found in project` ``.

**After:**

1. `resolveImageOrLegacySceneSource(scene)` reads **root `source` OR `payload.source`** (and asset fields the same way).
2. Asset lookup runs **only** when `effectiveSource === "asset"`.
3. If `effectiveSource === "asset"` and `asset_id` is missing/blank → explicit  
   `asset scene requires a non-empty asset_id` (never interpolates undefined).
4. If `asset_id` present but unknown → `` `asset ${assetId} not found in project` `` (real id).

Legacy `{ source: "ai", image_prompt }` and typed IMAGE+payload AI scenes behave identically: **no asset lookup**.

---

## 3. Why this preserves optional Asset Library

- Empty `classById` + AI-only scenes → pass.
- Empty `asset_usage` → unchanged (still valid).
- No requirement to have assets to generate IMAGE / PRODUCT_DEMO packages.
- Asset library remains optional; only **explicit** `source: "asset"` scenes are project-scoped.

---

## 4. Tests added

In `check:visual-scene-plan`:

- typed IMAGE + nested AI payload → PASS (empty `classById`)
- legacy flat AI → PASS
- typed IMAGE root `source: "ai"` → PASS
- explicit asset + valid id → PASS
- asset missing id → FAIL without `asset undefined`
- unknown asset id → FAIL with id in message
- `resolveImageOrLegacySceneSource` unit checks

In `check:production-run`:

- clear superseded error when completed + generated>0 + failed=0
- keep error when failed>0 or still running

---

## 5. Existing tests run

| Command | Result |
| --- | --- |
| `npm run check:visual-scene-plan` | PASS 20/20 |
| `npm run check:production-run` | PASS 32/32 |
| `npm run check:product-demo-structured` | PASS 11/11 |
| `npm run check:product-demonstration-integrity` | PASS 12/12 |
| `npm run check:render-fidelity` | PASS 9/9 |
| `npm run check:language-variant-fidelity` | PASS 24/24 |
| `npx tsc --noEmit` | PASS |
| `npx eslint` (touched files) | PASS (pre-existing unused-import warnings only) |

Local reproduction of the former failing shape now returns `[]`.

---

## 6. Remaining risks

- Models may still emit other exotic scene shapes; unrecognized non-asset sources skip lookup (fail-open for assets) after structural validation.
- Historical run `3c58a5f3-…` still has stale `error_message` in DB until next reconcile after this deploy (or manual clear).
- Mirror helpers in some check scripts still use the old asset_usage loop pattern for *their own* simulations; production path is fixed in `packageShared.ts`.

---

## 7. Safe retry confirmation

**YES — safe to retry production runs.**

Rollback of the visual-diversity prompt patch is **not** required. After this deploy, typed IMAGE+payload AI scenes must not fail generation with `asset undefined not found in project`.

---

_End of report._
