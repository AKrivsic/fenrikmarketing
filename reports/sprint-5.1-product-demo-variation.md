# Sprint 5.1 — Product Demo Variation

## 1. Current repetition risk

**Before this sprint:** every PRODUCT_DEMO used one fixed composition — a centered mobile phone chat SVG (`buildProductDemoChatSvg` in `composeProductDemoRaster.ts`).

| Item | Finding |
|---|---|
| Renderer entry | `prepareProductDemoSceneRaster` → `composeProductDemoRaster` → `buildProductDemoChatSvg` |
| Payload | `ProductDemoBeat` (question / ai_answer / outcome_type / outcome_label / …) |
| Outcome types | `lead_captured`, `booking_confirmed`, `question_resolved`, `contact_captured` |
| Variation before | Outcome text changed; **layout did not** |
| Schema redesign needed? | No — optional `demo_variant` field is enough |

Repetition risk: high within a multi-package production run (identical phone chrome every time).

Sprint 5 render fidelity is unchanged: PRODUCT_DEMO never becomes IMAGE.

---

## 2. Files changed

| File | Role |
|---|---|
| `lib/scene-types/product-demo/demoVariant.ts` | **New** — variants, mapping, LRU select, brief extract |
| `lib/scene-types/product-demo/productDemoBeat.ts` | Optional `demo_variant`; unknown stripped → safe resolve |
| `lib/scene-types/product-demo/composeProductDemoRaster.ts` | 4 layout compositions |
| `lib/scene-types/product-demo/ensureStructuredProductDemo.ts` | Assign variant from outcome + narrative + recent |
| `lib/ai/workflows/generateContentPackage.ts` | Load run recent variants; pass narrative |
| `lib/ai/workflows/regenerateContentPackage.ts` | Pass narrative into ensure |
| `scripts/check-product-demo-variation.ts` | **New** tests |
| `package.json` | `check:product-demo-variation` |

---

## 3. Variant field and mapping

Field: `demo_variant` (optional on payload; always resolved before render).

| Value | Primary when |
|---|---|
| `conversation_answer` | `outcome_type = question_resolved` (also safe fallback) |
| `lead_capture` | `lead_captured` / `contact_captured` |
| `booking_confirmation` | `booking_confirmed` |
| `after_hours_response` | After-hours / weekend narrative when compatible |

No LLM. Deterministic from structured beat + hook/VO/concept text.

Unknown `demo_variant` → stripped → **safe PRODUCT_DEMO fallback** from outcome (never IMAGE).

---

## 4. Implemented visual variants

All four are fully renderable and keep Q → A → Outcome visible:

| Variant | Composition |
|---|---|
| `conversation_answer` | Mobile phone close-up chat + green resolved badge |
| `lead_capture` | Desktop-style website chat panel + “New lead captured” confirmation card |
| `booking_confirmation` | Booking-assistant widget + appointment confirmed panel |
| `after_hours_response` | Night chrome split: unanswered late → Fenrik answers + outcome |

---

## 5. Run-level rotation

Within a production run, sibling packages’ `package_brief.visual_scenes[].payload.demo_variant` are loaded (oldest → newest).

`selectDemoVariant` picks the **least recently used** compatible variant and avoids consecutive repeats when another compatible option exists.

If only one variant is compatible → use it.

---

## 6. Tests

```bash
npm run check:product-demo-variation   # 12 passed
npm run check:render-fidelity          # 9 passed (Sprint 5 green)
npm run check:product-demo-structured  # 9 passed
npm run check:product-demonstration-integrity  # 12 passed
```

Covered:

- each variant renders as PRODUCT_DEMO
- semantic payload survives normalize + compile
- unknown variant does not downgrade to IMAGE
- compatible variants rotate in a simulated multi-package run
- single compatible variant remains valid
- Render Fidelity stays green

---

## 7. Remaining limitations

- Layouts are still deterministic SVG UIs (not live Fenrik product screenshots)
- Rotation is run-scoped only (not cross-run / global)
- After-hours detection is keyword-based on narrative text
- Regenerated packages do not yet reload sibling run variants (empty recent list on regen)
- No designer/CMS template system — four hardcoded compositions by design
