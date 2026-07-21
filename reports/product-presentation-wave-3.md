# Wave 3 Report — Retarget validators to Product Presentation Decision

**Date:** 2026-07-21  
**Status:** Complete  
**Scope:** Architecture plan §9 step 3 only — PPD as presentation validation authority behind flag  
**Prior:** `reports/product-presentation-wave-1.md`, `reports/product-presentation-wave-2.md`

---

## Goal

Use Product Presentation Decision (appearance claim, value proof, forbidden forms) as the authority for product-presentation validation when the feature flag is on. Keep PRODUCT_DEMO emit/ensure/renderer and legacy SI/PDI chat gates as fallback when the flag is off.

---

## Changed files

| File | Change |
|---|---|
| `lib/product-presentation/valueProof.ts` | **New** — helpers: value proof without product appearance / authentic binding / skip PRODUCT_DEMO |
| `lib/product-presentation/validateProductPresentation.ts` | **New** — PPD package validator + persistence fields |
| `lib/product-presentation/config.ts` | Document Wave 3 dual-run behavior |
| `lib/product-presentation/index.ts` | Export validation / value-proof APIs |
| `lib/creative-candidates/storyIntegrity.ts` | Optional `productPresentation`; skip `product_demonstration_missing` when flag+PPD authorizes |
| `lib/creative-candidates/productDemonstrationIntegrity.ts` | Optional `productPresentation`; skip structured PRODUCT_DEMO hard requirements when flag+PPD authorizes |
| `lib/ai/workflows/generateContentPackage.ts` | Pass PPD plan into SI/PDI; hard-gate PPD validation; persist diagnostics |
| `lib/ai/workflows/regenerateContentPackage.ts` | Same dual-run wiring |
| `scripts/check-product-presentation-validation.ts` | **New** Wave 3 invariant tests |
| `package.json` | `check:product-presentation-validation` |

**Unchanged (confirmed present):** `ensureStructuredProductDemo`, PRODUCT_DEMO renderer / compose raster, SI/PDI modules (still run), creative spine, Weekly Strategy.

---

## Which validators were retargeted

| Validator | Flag off | Flag on + PPD plan |
|---|---|---|
| **Story Integrity** — world/actor/metaphor/CTA | Unchanged | Unchanged |
| **Story Integrity** — `product_demonstration_missing` | Legacy chat/product-demo detection | Skipped when PPD authorizes value proof without PRODUCT_DEMO (or authentic eligible binding) |
| **Product Demonstration Integrity** — structured beat / PRODUCT_DEMO scene / ask→answer→outcome | Legacy hard requirements | Skipped when PPD authorizes presentation without PRODUCT_DEMO |
| **PDI** — floating icon / conflicting identity bans | Still apply | Still apply |
| **`validateProductPresentationPackage`** | Inactive (pass-through) | **Hard gate**: AUTHENTIC binding, eligibility, logo ban, forbidden synthetic forms, unsatisfied value proof, reveal compatibility |

---

## What still uses PRODUCT_DEMO

- `ensureStructuredProductDemo` (still called before SI)
- PRODUCT_DEMO typed scene emit / force-repair path
- PRODUCT_DEMO renderer + `composeProductDemoRaster`
- Flag-off SI/PDI chat proof requirements
- Prompt lines that mention PRODUCT_DEMO ownership (not changed this wave)

---

## What already uses PPD

- Plan compute + persist (`product_presentation`) — Waves 1–2
- Asset authenticity metadata — Wave 2
- **Wave 3:** SI/PDI product-demo clauses defer to PPD when flag on
- **Wave 3:** `validateProductPresentationPackage` + `product_presentation_validation` on brief

---

## Dual-run

```bash
# legacy (default)
unset PRODUCT_PRESENTATION_DECISION_ENABLED
# → SI/PDI require PRODUCT_DEMO path; PPD validator inactive

PRODUCT_PRESENTATION_DECISION_ENABLED=true
# → PPD plan + validation authority; PRODUCT_DEMO may still be ensured but is not required when PPD value proof allows
```

---

## Verification results

| Check | Result |
|---|---|
| `npm run check:product-presentation-validation` | 8 passed |
| `npm run check:product-presentation-decision` | 15 passed |
| `npm run check:product-presentation-asset-metadata` | 12 passed |
| `npm run check:story-integrity` | 15 passed |
| `npm run check:product-demonstration-integrity` | 12 passed |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| PRODUCT_DEMO stack files present | Confirmed |

---

## Confirmation: renderer / PRODUCT_DEMO not removed

- `lib/scene-types/product-demo/ensureStructuredProductDemo.ts` — present  
- `lib/scene-types/renderers/productDemoSceneRenderer.ts` — present  
- `lib/scene-types/product-demo/composeProductDemoRaster.ts` — present  
- SI + PDI modules still exist and run on every video package path  

---

## Known risks

1. With flag on, ensure still injects PRODUCT_DEMO → dual philosophy (PPD may authorize non-product while demo still appears). Acceptable for Wave 3; Wave 4/5 stop requiring/emitting.
2. Synthetic-UI regex is conservative; some invented UI prose may not match until bakeoff feedback.
3. Flag-on packages without a PPD plan (e.g. text-only) keep inactive PPD validator; SI/PDI only apply where candidates/video exist as before.

---

## Recommendation for Wave 4

**Stop requiring PRODUCT_DEMO** in SI/PDI/prompt ceiling (plan §9 step 4):

- Remove remaining flag-off-only dependency as default path once bakeoff is ready, or make PPD the default and treat PRODUCT_DEMO requirements as legacy-only.
- Soften / rewrite prompt ownership lines that assign complete product demonstration to PRODUCT_DEMO.
- Keep ensure + renderer until Wave 5 (stop emit) for rollback.

Do **not** delete the chat renderer in Wave 4.
