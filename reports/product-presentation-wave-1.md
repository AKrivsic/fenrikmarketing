# Wave 1 Report — Product Presentation Decision (infrastructure)

**Date:** 2026-07-21  
**Status:** Complete  
**Scope:** Implementation plan §9 step 1 only — PPD behind flag; compute + persist; **no gate changes**

---

## Goal

Add Product Presentation Decision (PPD) as a dual-run, feature-flagged decision layer after Product Reveal. Persist diagnostics on `presentation_generation.product_presentation` when enabled. Leave PRODUCT_DEMO / PDI / Story Integrity / creative spine untouched.

---

## Changed files

| File | Change |
|---|---|
| `lib/product-presentation/config.ts` | Flag `PRODUCT_PRESENTATION_DECISION_ENABLED=true` |
| `lib/product-presentation/types.ts` | Classes, claims, value proof, forbidden forms |
| `lib/product-presentation/capabilities.ts` | Logical capability catalog (no synthetic UI) |
| `lib/product-presentation/resolveProductPresentation.ts` | Decision resolver under Reveal ceiling |
| `lib/product-presentation/planForPackage.ts` | Package wrapper (no-op when flag off) |
| `lib/product-presentation/persistence.ts` | Persist / read helpers |
| `lib/product-presentation/index.ts` | Public exports |
| `lib/ai/workflows/generateContentPackage.ts` | Wire after Reveal; merge persistence fields |
| `lib/ai/workflows/regenerateContentPackage.ts` | Same wire |
| `scripts/check-product-presentation-decision.ts` | Unit checks |
| `package.json` | `check:product-presentation-decision` script |

---

## Why

Infrastructure-first migration: record authentic vs non-product presentation decisions without changing render/validation behavior. Enables later waves to retarget validators and retire PRODUCT_DEMO safely.

---

## Possible impacts

| Area | Impact |
|---|---|
| Default runtime (`flag` off) | **None** — empty persistence, no behavior change |
| Flag on | Extra JSON on `package_brief.presentation_generation.product_presentation` only |
| Creative spine | **Unchanged** (Weekly Strategy, Candidates, Beats, Hook, VO, DNA, tempo) |
| PRODUCT_DEMO / PDI / SI | **Unchanged** |
| Weekly Strategy | **Unchanged** (no asset inventory) |

---

## Verification results

| Check | Result |
|---|---|
| `npm run check:product-presentation-decision` | 12 passed, 0 failed |
| `npm run check:visual-medium-product-reveal` | 26 passed, 0 failed |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass (exit 0) |

---

## How to enable dual-run

```bash
PRODUCT_PRESENTATION_DECISION_ENABLED=true
```

When on, packages get `presentation_generation.product_presentation` alongside existing `product_reveal`. Gates still require PRODUCT_DEMO until later waves.

---

## Remaining work (later waves — not started)

2. Extend asset metadata (provenance / authenticity)  
3. Retarget validators to PPD  
4. Stop requiring PRODUCT_DEMO  
5. Stop emitting PRODUCT_DEMO  
6. Remove chat renderer stack  
7. Commercial score cleanup  
8. Quality bakeoff (after full implementation only)

**Next recommended wave:** asset metadata authenticity fields (plan §9 step 2), still without deleting PRODUCT_DEMO.
