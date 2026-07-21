# Wave 4 Report — PPD primary runtime (stop require + emit PRODUCT_DEMO)

**Date:** 2026-07-21  
**Status:** Complete  
**Scope:** Architecture plan §9 steps 4–5 (soft cutover) — PPD primary when flag on; PRODUCT_DEMO only as rollback  
**Prior:** `reports/product-presentation-wave-1.md` … `wave-3.md`

---

## Goal

Make Product Presentation Decision the primary presentation runtime when `PRODUCT_PRESENTATION_DECISION_ENABLED=true`: stop **requiring** and **emitting** PRODUCT_DEMO. Keep ensure/renderer/compose stack intact solely for flag-off rollback. Do not delete dead code.

---

## Changed files

| File | Change |
|---|---|
| `lib/product-presentation/config.ts` | `shouldEmitProductDemo()` / `shouldRequireProductDemo()` (inverse of PPD flag) |
| `lib/product-presentation/index.ts` | Export emit/require helpers |
| `lib/ai/workflows/generateContentPackage.ts` | Gate `ensureDemo` on `shouldEmitProductDemo()` |
| `lib/ai/workflows/regenerateContentPackage.ts` | Same emit gate |
| `lib/creative-candidates/storyIntegrity.ts` | Skip `product_demonstration_missing` when PPD primary; prompt copy branches |
| `lib/creative-candidates/productDemonstrationIntegrity.ts` | Skip structured PRODUCT_DEMO hard gates when PPD primary; prompt copy branches |
| `lib/creative-candidates/promptBlocks.ts` | Candidate hard-rule: PPD value proof vs PRODUCT_DEMO mandate |
| `lib/ai/prompts/generateContentPackage.ts` | IMAGE ownership lines no longer assign demo to PRODUCT_DEMO when PPD primary |
| `lib/scene-types/presentation/deriveAllowedSceneTypes.ts` | Omit PRODUCT_DEMO from allowed generation types when PPD primary |
| `scripts/check-product-presentation-wave4.ts` | **New** Wave 4 invariants |
| `package.json` | `check:product-presentation-wave4` |

---

## Runtime behavior

| Flag | Emit PRODUCT_DEMO (`ensureDemo`) | Require PRODUCT_DEMO (SI/PDI) | PPD plan + validation | Renderer code |
|---|---|---|---|---|
| **off** (default / rollback) | Yes | Yes | Inactive | Intact |
| **on** (PPD primary) | No | No | Active hard gate | Intact (unused for new packages) |

```bash
PRODUCT_PRESENTATION_DECISION_ENABLED=true   # PPD primary
unset PRODUCT_PRESENTATION_DECISION_ENABLED  # legacy PRODUCT_DEMO path
```

---

## What still uses PRODUCT_DEMO (rollback only)

- `ensureStructuredProductDemo` (still in tree; called only when flag off)
- PRODUCT_DEMO renderer / `composeProductDemoRaster` / worker prepare path
- Normalize/preserve PRODUCT_DEMO for **legacy** packages already containing the type
- Flag-off SI/PDI chat proof + prompt ownership

---

## What uses PPD (primary when flag on)

- Plan resolve + persist
- Asset authenticity metadata
- `validateProductPresentationPackage` hard gate
- SI/PDI no longer require chat demo
- Prompt ceiling / candidate blocks / package IMAGE rules

---

## Confirmation: renderer not removed

- `lib/scene-types/product-demo/ensureStructuredProductDemo.ts` — present  
- `lib/scene-types/renderers/productDemoSceneRenderer.ts` — present  
- `lib/scene-types/product-demo/composeProductDemoRaster.ts` — present  

---

## Verification results

| Check | Result |
|---|---|
| `npm run check:product-presentation-wave4` | 8 passed |
| `npm run check:product-presentation-validation` | 8 passed |
| `npm run check:product-presentation-decision` | 15 passed |
| `npm run check:story-integrity` | 15 passed |
| `npm run check:product-demonstration-integrity` | 12 passed |
| `npm run check:product-demo-visual-diversity-patch` | 14 passed (flag-off ownership still present) |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |

---

## Known risks

1. Default remains flag **off** until bakeoff / ops flip — production still emits PRODUCT_DEMO until enabled.
2. LLM may still invent PRODUCT_DEMO JSON when flag on; it is not required and not ensured — worker may still render if present (legacy path). Wave 5+ can strip unexpected PRODUCT_DEMO scenes if needed.
3. Commercial scoring still mentions product_demo heuristics (plan §9 step 7) — not touched.

---

## Recommendation for Wave 5

**Stop emitting** is done for flag-on path. Next hard-delete wave (plan §9 step 6) only after bakeoff default-on:

- Unregister PRODUCT_DEMO from worker dispatch for **new** jobs
- Optionally strip/ignore PRODUCT_DEMO if LLM still emits under PPD primary
- Then remove chat renderer stack + dead ensure code

Do **not** delete renderer until bakeoff passes with flag default-on.
